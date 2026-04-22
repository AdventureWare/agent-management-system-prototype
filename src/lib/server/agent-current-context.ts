import { getAgentThread } from '$lib/server/agent-threads';
import {
	getOpenReviewForTask,
	getPendingApprovalForTask,
	loadControlPlane
} from '$lib/server/control-plane';
import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';

type AgentCurrentContextInput = {
	threadId?: string | null;
	taskId?: string | null;
	runId?: string | null;
};

type RecommendedAction = {
	resource: 'context' | 'intent' | 'task' | 'thread' | 'goal' | 'project';
	command: string;
	reason: string;
};

type LoadedControlPlane = Awaited<ReturnType<typeof loadControlPlane>>;
type LoadedTask = LoadedControlPlane['tasks'][number];
type LoadedRun = LoadedControlPlane['runs'][number];
type LoadedReview = LoadedControlPlane['reviews'][number];
type LoadedApproval = LoadedControlPlane['approvals'][number];

function readOptionalId(value: string | null | undefined) {
	const normalized = value?.trim() ?? '';
	return normalized.length > 0 ? normalized : null;
}

function uniqueRecommendedActions(actions: RecommendedAction[]) {
	const seen = new Set<string>();

	return actions.filter((action) => {
		const key = `${action.resource}:${action.command}`;

		if (seen.has(key)) {
			return false;
		}

		seen.add(key);
		return true;
	});
}

function inferTaskFromThread(data: LoadedControlPlane, threadId: string) {
	const directTask = data.tasks.find((task) => task.agentThreadId === threadId) ?? null;

	if (directTask) {
		return directTask;
	}

	const matchingRun =
		[...data.runs]
			.filter((run) => run.threadId === threadId || run.agentThreadId === threadId)
			.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;

	return matchingRun ? (data.tasks.find((task) => task.id === matchingRun.taskId) ?? null) : null;
}

function buildRecommendedActions(args: {
	task: LoadedTask | null;
	threadId: string | null;
	openReview: LoadedReview | null;
	pendingApproval: LoadedApproval | null;
}) {
	const actions: RecommendedAction[] = [];
	const { task, threadId, openReview, pendingApproval } = args;

	actions.push({
		resource: 'context',
		command: 'current',
		reason: 'Refresh canonical task, run, and thread state before acting on stale assumptions.'
	});

	if (!task) {
		actions.push({
			resource: 'task',
			command: 'list',
			reason:
				'No task could be resolved from the current ids. List available tasks to recover context.'
		});

		if (threadId) {
			actions.push({
				resource: 'thread',
				command: 'panel',
				reason: 'Inspect the current thread directly when no task mapping is available.'
			});
		}

		return uniqueRecommendedActions(actions);
	}

	actions.push({
		resource: 'task',
		command: 'get',
		reason: 'Read the latest task state before running follow-up mutations.'
	});

	if (pendingApproval) {
		actions.push({
			resource: 'task',
			command: 'approve-approval',
			reason: 'There is a pending approval gate on this task.'
		});
		actions.push({
			resource: 'task',
			command: 'reject-approval',
			reason: 'Reject the approval if the task output should not proceed.'
		});
		return uniqueRecommendedActions(actions);
	}

	if (openReview) {
		actions.push({
			resource: 'task',
			command: 'approve-review',
			reason: 'There is an open review gate on this task.'
		});
		actions.push({
			resource: 'task',
			command: 'request-review-changes',
			reason: 'Request follow-up changes if the review should not pass yet.'
		});
		return uniqueRecommendedActions(actions);
	}

	if (task.parentTaskId && task.status === 'done' && !task.delegationAcceptance) {
		actions.push({
			resource: 'intent',
			command: 'accept_child_handoff',
			reason: 'This delegated child task is done and waiting for parent acceptance.'
		});
		actions.push({
			resource: 'intent',
			command: 'request_child_handoff_changes',
			reason: 'Ask for follow-up work if the child handoff is incomplete.'
		});
		return uniqueRecommendedActions(actions);
	}

	if (task.status === 'blocked') {
		actions.push({
			resource: 'task',
			command: 'update',
			reason: 'The task is blocked. Clear or revise the blocked state before continuing.'
		});
		return uniqueRecommendedActions(actions);
	}

	if (task.status === 'in_draft') {
		actions.push({
			resource: 'task',
			command: 'update',
			reason: 'The task is still in draft and likely needs planning fields filled in.'
		});
		return uniqueRecommendedActions(actions);
	}

	if (task.status === 'ready') {
		actions.push({
			resource: 'task',
			command: 'launch-session',
			reason: 'The task is ready to start execution.'
		});
		if (!task.agentThreadId) {
			actions.push({
				resource: 'thread',
				command: 'best-target',
				reason: 'No agent thread is linked yet. Resolve the best thread target before routing work.'
			});
		}
		return uniqueRecommendedActions(actions);
	}

	if (task.status === 'in_progress' && threadId) {
		actions.push({
			resource: 'thread',
			command: 'panel',
			reason: 'Inspect the active thread while the task is in progress.'
		});
		return uniqueRecommendedActions(actions);
	}

	if (task.status === 'done' && task.requiresReview) {
		actions.push({
			resource: 'intent',
			command: 'prepare_task_for_review',
			reason: 'The task is done and requires review before it can be considered complete.'
		});
	}

	if (task.status === 'done' && task.approvalMode !== 'none') {
		actions.push({
			resource: 'intent',
			command: 'prepare_task_for_approval',
			reason: 'The task is done and still requires an approval gate.'
		});
	}

	return uniqueRecommendedActions(actions);
}

function buildContextSummary(args: {
	task: LoadedTask | null;
	run: LoadedRun | null;
	openReview: LoadedReview | null;
	pendingApproval: LoadedApproval | null;
}) {
	const blockers: string[] = [];
	const openGates: string[] = [];
	const { task, run, openReview, pendingApproval } = args;

	if (task?.blockedReason) {
		blockers.push(task.blockedReason);
	}

	if (run?.status === 'failed' && run.errorSummary) {
		blockers.push(run.errorSummary);
	}

	if (openReview) {
		openGates.push(`Open review: ${openReview.summary}`);
	}

	if (pendingApproval) {
		openGates.push(`Pending approval: ${pendingApproval.summary}`);
	}

	if (task?.parentTaskId && task.status === 'done' && !task.delegationAcceptance) {
		openGates.push('Child handoff is waiting for parent acceptance.');
	}

	let currentState = 'No control-plane task or run context could be resolved.';

	if (task && run) {
		currentState = `Task "${task.title}" is ${task.status} with run ${run.status}.`;
	} else if (task) {
		currentState = `Task "${task.title}" is ${task.status}.`;
	} else if (run) {
		currentState = `Run ${run.id} is ${run.status}.`;
	}

	return {
		currentState,
		blockers,
		openGates
	};
}

export async function loadAgentCurrentContext(input: AgentCurrentContextInput = {}) {
	const requestedThreadId = readOptionalId(input.threadId);
	const requestedTaskId = readOptionalId(input.taskId);
	const requestedRunId = readOptionalId(input.runId);
	const data = await loadControlPlane();

	const requestedRun = requestedRunId
		? (data.runs.find((run) => run.id === requestedRunId) ?? null)
		: null;

	if (requestedRunId && !requestedRun) {
		throw new AgentControlPlaneApiError(404, 'Run not found.', {
			code: 'run_not_found',
			suggestedNextCommands: ['task:get', 'context:current'],
			details: { runId: requestedRunId }
		});
	}

	const requestedTask = requestedTaskId
		? (data.tasks.find((task) => task.id === requestedTaskId) ?? null)
		: null;

	if (requestedTaskId && !requestedTask) {
		throw new AgentControlPlaneApiError(404, 'Task not found.', {
			code: 'task_not_found',
			suggestedNextCommands: ['task:list', 'context:current'],
			details: { taskId: requestedTaskId }
		});
	}

	let resolvedTask =
		requestedTask ??
		(requestedRun ? (data.tasks.find((task) => task.id === requestedRun.taskId) ?? null) : null);

	if (!resolvedTask && requestedThreadId) {
		resolvedTask = inferTaskFromThread(data, requestedThreadId);
	}

	let resolvedRun =
		requestedRun ??
		(resolvedTask?.latestRunId
			? (data.runs.find((run) => run.id === resolvedTask.latestRunId) ?? null)
			: null);

	if (!resolvedRun && requestedThreadId) {
		resolvedRun =
			[...data.runs]
				.filter(
					(run) => run.threadId === requestedThreadId || run.agentThreadId === requestedThreadId
				)
				.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
	}

	const resolvedThreadId =
		requestedThreadId ??
		resolvedRun?.agentThreadId ??
		resolvedRun?.threadId ??
		resolvedTask?.agentThreadId ??
		null;
	const thread = resolvedThreadId
		? await getAgentThread(resolvedThreadId, { controlPlane: data })
		: null;

	if (requestedThreadId && !thread) {
		throw new AgentControlPlaneApiError(404, 'Thread not found.', {
			code: 'thread_not_found',
			suggestedNextCommands: ['thread:list', 'context:current'],
			details: { threadId: requestedThreadId }
		});
	}

	const project = resolvedTask
		? (data.projects.find((candidate) => candidate.id === resolvedTask.projectId) ?? null)
		: null;
	const goal = resolvedTask?.goalId
		? (data.goals.find((candidate) => candidate.id === resolvedTask.goalId) ?? null)
		: null;
	const openReview = resolvedTask ? getOpenReviewForTask(data, resolvedTask.id) : null;
	const pendingApproval = resolvedTask ? getPendingApprovalForTask(data, resolvedTask.id) : null;

	return {
		requested: {
			threadId: requestedThreadId,
			taskId: requestedTaskId,
			runId: requestedRunId
		},
		resolved: {
			threadId: thread?.id ?? resolvedThreadId,
			taskId: resolvedTask?.id ?? null,
			runId: resolvedRun?.id ?? null,
			projectId: project?.id ?? null,
			goalId: goal?.id ?? null
		},
		thread: thread && {
			id: thread.id,
			name: thread.name,
			handle: thread.handle ?? null,
			contactLabel: thread.contactLabel ?? null,
			threadState: thread.threadState,
			latestRunStatus: thread.latestRunStatus,
			hasActiveRun: thread.hasActiveRun,
			canResume: thread.canResume,
			lastActivityAt: thread.lastActivityAt
		},
		task: resolvedTask && {
			id: resolvedTask.id,
			title: resolvedTask.title,
			summary: resolvedTask.summary,
			status: resolvedTask.status,
			blockedReason: resolvedTask.blockedReason,
			requiresReview: resolvedTask.requiresReview,
			approvalMode: resolvedTask.approvalMode,
			projectId: resolvedTask.projectId,
			goalId: resolvedTask.goalId,
			parentTaskId: resolvedTask.parentTaskId ?? null,
			agentThreadId: resolvedTask.agentThreadId,
			latestRunId: resolvedTask.latestRunId
		},
		run: resolvedRun && {
			id: resolvedRun.id,
			taskId: resolvedRun.taskId,
			status: resolvedRun.status,
			summary: resolvedRun.summary,
			errorSummary: resolvedRun.errorSummary,
			threadId: resolvedRun.threadId,
			agentThreadId: resolvedRun.agentThreadId,
			updatedAt: resolvedRun.updatedAt
		},
		project: project && {
			id: project.id,
			name: project.name,
			summary: project.summary
		},
		goal: goal && {
			id: goal.id,
			name: goal.name,
			summary: goal.summary,
			status: goal.status
		},
		governance: {
			openReview: openReview && {
				id: openReview.id,
				status: openReview.status,
				summary: openReview.summary
			},
			pendingApproval: pendingApproval && {
				id: pendingApproval.id,
				status: pendingApproval.status,
				summary: pendingApproval.summary,
				mode: pendingApproval.mode
			}
		},
		summary: {
			...buildContextSummary({
				task: resolvedTask,
				run: resolvedRun,
				openReview,
				pendingApproval
			}),
			recommendedNextActions: buildRecommendedActions({
				task: resolvedTask,
				threadId: thread?.id ?? resolvedThreadId,
				openReview,
				pendingApproval
			})
		}
	};
}
