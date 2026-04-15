import {
	createDecision,
	loadControlPlane,
	updateControlPlaneCollections
} from '$lib/server/control-plane';
import { getAgentThread, recoverAgentThread } from '$lib/server/agent-threads';
import { readTaskDetailForm } from '$lib/server/task-form';
import { buildStalledRecoveryState } from '$lib/server/task-detail-runtime-context';
import {
	TaskLaunchPlanError,
	buildTaskLaunchPlan,
	launchTaskFromPlan
} from '$lib/server/task-launch-planning';
import type { Run, Task } from '$lib/types/control-plane';

const ACTIVE_TASK_RUN_STATUSES = new Set<Run['status']>(['queued', 'starting', 'running']);

export class TaskSessionActionError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'TaskSessionActionError';
	}
}

function getActionErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function getActiveTaskRun(data: { runs: Run[] }, taskId: string) {
	return (
		data.runs.find((run) => run.taskId === taskId && ACTIVE_TASK_RUN_STATUSES.has(run.status)) ??
		null
	);
}

function toTaskSessionActionError(error: unknown, fallback: string) {
	if (error instanceof TaskLaunchPlanError) {
		return new TaskSessionActionError(error.status, error.message);
	}

	return new TaskSessionActionError(400, getActionErrorMessage(error, fallback));
}

function assertTaskRecoverableStatus(task: { status: Run['status'] | Task['status'] }) {
	if (task.status !== 'in_progress') {
		throw new TaskSessionActionError(
			409,
			'Only tasks that are still In Progress can be recovered automatically.'
		);
	}
}

export async function launchTaskSession(taskId: string, form: FormData) {
	const taskInput = readTaskDetailForm(form);
	const current = await loadControlPlane();
	const task = current.tasks.find((candidate) => candidate.id === taskId);

	if (!task) {
		throw new TaskSessionActionError(404, 'Task not found.');
	}

	if (task.status !== 'ready') {
		throw new TaskSessionActionError(
			409,
			'Only tasks in the Ready state can be run. Set the task status to Ready first.'
		);
	}

	if (getActiveTaskRun(current, task.id)) {
		throw new TaskSessionActionError(
			409,
			'This task already has an active run. Open the current work thread or wait for it to finish before starting another run.'
		);
	}

	let launchPlan: Awaited<ReturnType<typeof buildTaskLaunchPlan>>;

	try {
		launchPlan = await buildTaskLaunchPlan(current, task, taskInput);
	} catch (error) {
		throw toTaskSessionActionError(error, 'Could not prepare a work thread for this task.');
	}

	try {
		const launchResult = await launchTaskFromPlan(taskId, launchPlan);

		return {
			ok: true,
			successAction: 'launchTaskSession' as const,
			taskId,
			threadId: launchResult.threadId
		};
	} catch (error) {
		throw toTaskSessionActionError(error, 'Could not start a work thread for this task.');
	}
}

export async function recoverTaskSession(taskId: string, form: FormData) {
	const taskInput = readTaskDetailForm(form);
	const current = await loadControlPlane();
	const task = current.tasks.find((candidate) => candidate.id === taskId);

	if (!task) {
		throw new TaskSessionActionError(404, 'Task not found.');
	}

	assertTaskRecoverableStatus(task);

	const activeTaskRun = getActiveTaskRun(current, task.id);
	const activeRunThread = activeTaskRun?.agentThreadId
		? await getAgentThread(activeTaskRun.agentThreadId)
		: null;
	const stalledRecovery = buildStalledRecoveryState({
		task,
		activeRun: activeTaskRun,
		activeRunThread
	});

	if (!activeTaskRun) {
		throw new TaskSessionActionError(409, 'This task does not have an active run to recover.');
	}

	if (!stalledRecovery?.eligible) {
		throw new TaskSessionActionError(
			409,
			'This task does not currently look stalled enough to recover automatically.'
		);
	}

	if (!activeTaskRun.agentThreadId) {
		throw new TaskSessionActionError(
			409,
			'The active run is not linked to a recoverable work thread.'
		);
	}

	try {
		await recoverAgentThread(activeTaskRun.agentThreadId);
	} catch (error) {
		throw toTaskSessionActionError(error, 'Could not recover the stalled work thread.');
	}

	const refreshedControlPlane = await loadControlPlane();
	const refreshedTask =
		refreshedControlPlane.tasks.find((candidate) => candidate.id === taskId) ?? null;

	if (!refreshedTask) {
		throw new TaskSessionActionError(404, 'Task not found after recovery.');
	}

	assertTaskRecoverableStatus(refreshedTask);

	let launchPlan: Awaited<ReturnType<typeof buildTaskLaunchPlan>>;

	try {
		launchPlan = await buildTaskLaunchPlan(refreshedControlPlane, refreshedTask, taskInput);
	} catch (error) {
		throw toTaskSessionActionError(error, 'Could not prepare fresh work after recovery.');
	}

	let launchedSessionId: string | null = null;

	try {
		const launchResult = await launchTaskFromPlan(taskId, launchPlan);
		launchedSessionId = launchResult.threadId;
	} catch (error) {
		throw toTaskSessionActionError(
			error,
			'Recovered the stalled run but could not relaunch the task.'
		);
	}

	const recoveryDecisionAt = new Date().toISOString();

	await updateControlPlaneCollections((data) => ({
		data: {
			...data,
			decisions: [
				createDecision({
					taskId,
					runId: activeTaskRun.id,
					decisionType: 'task_recovered',
					summary: `Recovered stalled work by retiring run ${activeTaskRun.id} and re-queuing the task${launchedSessionId ? ` in thread ${launchedSessionId}` : ''}.`,
					createdAt: recoveryDecisionAt
				}),
				...(data.decisions ?? [])
			]
		},
		changedCollections: ['decisions']
	}));

	return {
		ok: true,
		successAction: 'recoverTaskSession' as const,
		taskId,
		threadId: launchedSessionId
	};
}
