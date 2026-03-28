import { createHash } from 'node:crypto';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { TASK_STATUS_OPTIONS, type Run } from '$lib/types/control-plane';
import {
	createRun,
	formatRelativeTime,
	getOpenReviewForTask,
	getPendingApprovalForTask,
	loadControlPlane,
	parseTaskStatus,
	updateControlPlane
} from '$lib/server/control-plane';
import { startAgentSession } from '$lib/server/agent-sessions';

function readTaskForm(form: FormData) {
	return {
		name: form.get('name')?.toString().trim() ?? '',
		instructions: form.get('instructions')?.toString().trim() ?? '',
		projectId: form.get('projectId')?.toString().trim() ?? '',
		assigneeWorkerId: form.get('assigneeWorkerId')?.toString().trim() ?? ''
	};
}

function buildTaskSessionPrompt(input: {
	taskName: string;
	taskInstructions: string;
	projectName: string;
	projectRootFolder: string;
	defaultArtifactRoot: string;
}) {
	const contextLines = [
		`Task: ${input.taskName}`,
		`Project: ${input.projectName}`,
		`Project root: ${input.projectRootFolder}`
	];

	if (input.defaultArtifactRoot) {
		contextLines.push(`Default artifact root: ${input.defaultArtifactRoot}`);
	}

	return [
		'You are executing a queued task from the agent management system.',
		'',
		...contextLines,
		'',
		'Instructions:',
		input.taskInstructions,
		'',
		'Work from the project root, make the requested changes, and report progress and outcomes clearly.'
	].join('\n');
}

function buildPromptDigest(prompt: string) {
	return createHash('sha256').update(prompt).digest('hex').slice(0, 16);
}

function updateLatestRunForTask(
	runId: string | null,
	taskStatus: 'done' | 'blocked',
	summary: string,
	blockedReason = ''
) {
	const now = new Date().toISOString();

	return (run: Run): Run =>
		runId && run.id === runId
			? {
					...run,
					status: taskStatus === 'done' ? 'completed' : 'blocked',
					summary,
					updatedAt: now,
					endedAt: run.endedAt ?? now,
					errorSummary: taskStatus === 'blocked' ? blockedReason || run.errorSummary : ''
				}
			: run;
}

export const load: PageServerLoad = async ({ params }) => {
	const data = await loadControlPlane();
	const task = data.tasks.find((candidate) => candidate.id === params.taskId);

	if (!task) {
		throw error(404, 'Task not found.');
	}

	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const workerMap = new Map(data.workers.map((worker) => [worker.id, worker]));
	const providerMap = new Map(data.providers.map((provider) => [provider.id, provider]));
	const dependencyTaskIds = new Set(task.dependencyTaskIds);
	const relatedRuns = data.runs
		.filter((run) => run.taskId === task.id)
		.map((run) => ({
			...run,
			workerName: run.workerId ? (workerMap.get(run.workerId)?.name ?? 'Unknown worker') : 'Unassigned',
			providerName: run.providerId
				? (providerMap.get(run.providerId)?.name ?? 'Unknown provider')
				: 'No provider',
			updatedAtLabel: formatRelativeTime(run.updatedAt)
		}))
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	const dependencyTasks = data.tasks
		.filter((candidate) => dependencyTaskIds.has(candidate.id))
		.map((dependency) => ({
			id: dependency.id,
			title: dependency.title,
			status: dependency.status
		}))
		.sort((a, b) => a.title.localeCompare(b.title));
	const openReview = getOpenReviewForTask(data, task.id);
	const pendingApproval = getPendingApprovalForTask(data, task.id);

	return {
		task: {
			...task,
			projectName: projectMap.get(task.projectId)?.name ?? 'No project',
			assigneeName: task.assigneeWorkerId
				? (workerMap.get(task.assigneeWorkerId)?.name ?? 'Unknown worker')
				: 'Unassigned',
			latestRun: task.latestRunId ? (relatedRuns.find((run) => run.id === task.latestRunId) ?? null) : null,
			updatedAtLabel: formatRelativeTime(task.updatedAt),
			openReview,
			pendingApproval
		},
		project: projectMap.get(task.projectId) ?? null,
		projects: [...data.projects].sort((a, b) => a.name.localeCompare(b.name)),
		workers: [...data.workers].sort((a, b) => a.name.localeCompare(b.name)),
		statusOptions: TASK_STATUS_OPTIONS,
		relatedRuns,
		dependencyTasks
	};
};

export const actions: Actions = {
	updateTask: async ({ params, request }) => {
		const form = await request.formData();
		const status = parseTaskStatus(form.get('status')?.toString() ?? '', 'ready');
		const { name, instructions, projectId, assigneeWorkerId } = readTaskForm(form);

		if (!name || !instructions || !projectId) {
			return fail(400, {
				message: 'Name, instructions, and project are required.'
			});
		}

		const current = await loadControlPlane();
		const project = current.projects.find((candidate) => candidate.id === projectId);
		const assigneeWorker = assigneeWorkerId
			? current.workers.find((candidate) => candidate.id === assigneeWorkerId)
			: null;

		if (!project) {
			return fail(400, { message: 'Project not found.' });
		}

		if (assigneeWorkerId && !assigneeWorker) {
			return fail(400, { message: 'Worker not found.' });
		}

		let taskUpdated = false;

		await updateControlPlane((data) => ({
			...data,
			tasks: data.tasks.map((task) => {
				if (task.id !== params.taskId) {
					return task;
				}

				taskUpdated = true;

				return {
					...task,
					title: name,
					summary: instructions,
					projectId: project.id,
					lane: project.lane,
					status,
					assigneeWorkerId: assigneeWorker?.id ?? null,
					desiredRoleId: assigneeWorker?.roleId ?? task.desiredRoleId,
					artifactPath:
						task.artifactPath || project.defaultArtifactRoot || project.projectRootFolder || '',
					updatedAt: new Date().toISOString()
				};
			})
		}));

		if (!taskUpdated) {
			return fail(404, { message: 'Task not found.' });
		}

		return {
			ok: true,
			successAction: 'updateTask',
			taskId: params.taskId
		};
	},

	launchTaskSession: async ({ params, request }) => {
		const form = await request.formData();
		const { name, instructions, projectId, assigneeWorkerId } = readTaskForm(form);
		const current = await loadControlPlane();
		const task = current.tasks.find((candidate) => candidate.id === params.taskId);

		if (!task) {
			return fail(404, { message: 'Task not found.' });
		}

		const effectiveName = name || task.title;
		const effectiveInstructions = instructions || task.summary;
		const effectiveProjectId = projectId || task.projectId;
		const assigneeWorker = assigneeWorkerId
			? current.workers.find((candidate) => candidate.id === assigneeWorkerId)
			: null;
		const project = current.projects.find((candidate) => candidate.id === effectiveProjectId);

		if (!project) {
			return fail(400, { message: 'Task project not found.' });
		}

		if (assigneeWorkerId && !assigneeWorker) {
			return fail(400, { message: 'Worker not found.' });
		}

		if (!project.projectRootFolder) {
			return fail(400, {
				message: 'This task cannot launch a session until its project has a root folder.'
			});
		}

		if (getPendingApprovalForTask(current, task.id)?.mode === 'before_run') {
			return fail(409, {
				message: 'This task is waiting on before-run approval before a session can start.'
			});
		}

		const prompt = buildTaskSessionPrompt({
			taskName: effectiveName,
			taskInstructions: effectiveInstructions,
			projectName: project.name,
			projectRootFolder: project.projectRootFolder,
			defaultArtifactRoot: project.defaultArtifactRoot
		});
		const session = await startAgentSession({
			name: `Task: ${effectiveName}`,
			cwd: project.projectRootFolder,
			prompt,
			sandbox: 'workspace-write',
			model: null
		});
		const providerId =
			assigneeWorker?.providerId ??
			current.providers.find((provider) => provider.kind === 'local' && provider.enabled)?.id ??
			current.providers[0]?.id ??
			null;
		const run = createRun({
			taskId: params.taskId,
			workerId: assigneeWorker?.id ?? task.assigneeWorkerId ?? null,
			providerId,
			status: 'running',
			startedAt: new Date().toISOString(),
			sessionId: session.sessionId,
			promptDigest: buildPromptDigest(prompt),
			artifactPaths:
				project.defaultArtifactRoot || project.projectRootFolder
					? [project.defaultArtifactRoot || project.projectRootFolder]
					: [],
			summary: 'Launched from the task detail page into a resumable Codex session.',
			lastHeartbeatAt: new Date().toISOString()
		});

		await updateControlPlane((data) => ({
			...data,
			runs: [run, ...data.runs],
			tasks: data.tasks.map((candidate) =>
				candidate.id === params.taskId
					? {
							...candidate,
							title: effectiveName,
							summary: effectiveInstructions,
							projectId: project.id,
							lane: project.lane,
							assigneeWorkerId: assigneeWorker?.id ?? candidate.assigneeWorkerId,
							desiredRoleId: assigneeWorker?.roleId ?? candidate.desiredRoleId,
							artifactPath:
								candidate.artifactPath ||
								project.defaultArtifactRoot ||
								project.projectRootFolder ||
								'',
							runCount: candidate.runCount + 1,
							latestRunId: run.id,
							status: 'running',
							updatedAt: new Date().toISOString()
						}
					: candidate
			)
		}));

		return {
			ok: true,
			successAction: 'launchTaskSession',
			taskId: params.taskId,
			sessionId: session.sessionId
		};
	},

	approveReview: async ({ params }) => {
		const current = await loadControlPlane();
		const openReview = getOpenReviewForTask(current, params.taskId);
		const task = current.tasks.find((candidate) => candidate.id === params.taskId);

		if (!openReview || !task) {
			return fail(404, { message: 'No open review found for this task.' });
		}

		const pendingApproval = getPendingApprovalForTask(current, params.taskId);
		const shouldCloseTask = !pendingApproval;
		const now = new Date().toISOString();

		await updateControlPlane((data) => ({
			...data,
			reviews: data.reviews.map((review) =>
				review.id === openReview.id
					? {
							...review,
							status: 'approved',
							updatedAt: now,
							resolvedAt: now,
							summary: 'Review approved from the task detail page.'
						}
					: review
			),
			runs: shouldCloseTask
				? data.runs.map(
						updateLatestRunForTask(
							task.latestRunId,
							'done',
							'Task closed after review approval.'
						)
					)
				: data.runs,
			tasks: data.tasks.map((task) =>
				task.id === params.taskId
					? {
							...task,
							status: shouldCloseTask ? 'done' : task.status,
							blockedReason: '',
							updatedAt: now
						}
					: task
			)
		}));

		return {
			ok: true,
			successAction: 'approveReview',
			taskId: params.taskId
		};
	},

	requestChanges: async ({ params }) => {
		const current = await loadControlPlane();
		const openReview = getOpenReviewForTask(current, params.taskId);
		const task = current.tasks.find((candidate) => candidate.id === params.taskId);

		if (!openReview || !task) {
			return fail(404, { message: 'No open review found for this task.' });
		}

		const now = new Date().toISOString();
		const blockedReason = 'Changes requested during review.';

		await updateControlPlane((data) => ({
			...data,
			reviews: data.reviews.map((review) =>
				review.id === openReview.id
					? {
							...review,
							status: 'changes_requested',
							updatedAt: now,
							resolvedAt: now,
							summary: blockedReason
						}
					: review
			),
			runs: data.runs.map(
				updateLatestRunForTask(task.latestRunId, 'blocked', blockedReason, blockedReason)
			),
			tasks: data.tasks.map((task) =>
				task.id === params.taskId
					? {
							...task,
							status: 'blocked',
							blockedReason,
							updatedAt: now
						}
					: task
			)
		}));

		return {
			ok: true,
			successAction: 'requestChanges',
			taskId: params.taskId
		};
	},

	approveApproval: async ({ params }) => {
		const current = await loadControlPlane();
		const pendingApproval = getPendingApprovalForTask(current, params.taskId);
		const task = current.tasks.find((candidate) => candidate.id === params.taskId);

		if (!pendingApproval || !task) {
			return fail(404, { message: 'No pending approval found for this task.' });
		}

		const now = new Date().toISOString();
		const openReview = getOpenReviewForTask(current, params.taskId);
		const shouldCloseTask = pendingApproval.mode === 'before_complete' && !openReview;

		await updateControlPlane((data) => ({
			...data,
			approvals: data.approvals.map((approval) =>
				approval.id === pendingApproval.id
					? {
							...approval,
							status: 'approved',
							updatedAt: now,
							resolvedAt: now,
							summary: `Approved ${approval.mode} gate from the task detail page.`
						}
					: approval
			),
			runs: shouldCloseTask
				? data.runs.map(
						updateLatestRunForTask(
							task.latestRunId,
							'done',
							'Task closed after approval.'
						)
					)
				: data.runs,
			tasks: data.tasks.map((task) =>
				task.id === params.taskId
					? {
							...task,
							status: shouldCloseTask ? 'done' : task.status,
							blockedReason: '',
							updatedAt: now
						}
					: task
			)
		}));

		return {
			ok: true,
			successAction: 'approveApproval',
			taskId: params.taskId
		};
	},

	rejectApproval: async ({ params }) => {
		const current = await loadControlPlane();
		const pendingApproval = getPendingApprovalForTask(current, params.taskId);
		const task = current.tasks.find((candidate) => candidate.id === params.taskId);

		if (!pendingApproval || !task) {
			return fail(404, { message: 'No pending approval found for this task.' });
		}

		const now = new Date().toISOString();
		const blockedReason = `${pendingApproval.mode} approval rejected.`;

		await updateControlPlane((data) => ({
			...data,
			approvals: data.approvals.map((approval) =>
				approval.id === pendingApproval.id
					? {
							...approval,
							status: 'rejected',
							updatedAt: now,
							resolvedAt: now,
							summary: blockedReason
						}
					: approval
			),
			runs: data.runs.map(
				updateLatestRunForTask(task.latestRunId, 'blocked', blockedReason, blockedReason)
			),
			tasks: data.tasks.map((task) =>
				task.id === params.taskId
					? {
							...task,
							status: 'blocked',
							blockedReason,
							updatedAt: now
						}
					: task
			)
		}));

		return {
			ok: true,
			successAction: 'rejectApproval',
			taskId: params.taskId
		};
	}
};
