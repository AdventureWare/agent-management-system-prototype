import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { TASK_STATUS_OPTIONS, type Project, type Run, type Task } from '$lib/types/control-plane';
import {
	createRun,
	deleteTask as removeTaskFromControlPlane,
	formatRelativeTime,
	getOpenReviewForTask,
	getPendingApprovalForTask,
	loadControlPlane,
	parseTaskStatus,
	resolveThreadSandbox,
	selectExecutionProvider,
	updateControlPlane
} from '$lib/server/control-plane';
import {
	cancelAgentSession,
	getAgentSession,
	listAgentSessions,
	sendAgentSessionMessage,
	startAgentSession
} from '$lib/server/agent-sessions';
import {
	buildPromptDigest,
	buildTaskThreadName,
	buildTaskThreadPrompt
} from '$lib/server/task-threads';
import { buildTaskThreadSuggestions } from '$lib/server/task-thread-suggestions';
import { getTaskAttachmentRoot, persistTaskAttachments } from '$lib/server/task-attachments';
import { buildArtifactBrowser } from '$lib/server/artifact-browser';
import {
	isTaskThreadCompatibleWithProject,
	selectProjectTaskThreadContext
} from '$lib/server/task-thread-compatibility';

const ACTIVE_TASK_RUN_STATUSES = new Set<Run['status']>(['queued', 'starting', 'running']);

function readTaskForm(form: FormData) {
	return {
		name: form.get('name')?.toString().trim() ?? '',
		instructions: form.get('instructions')?.toString().trim() ?? '',
		projectId: form.get('projectId')?.toString().trim() ?? '',
		assigneeWorkerId: form.get('assigneeWorkerId')?.toString().trim() ?? ''
	};
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
	const sessions = await listAgentSessions({ includeArchived: true });
	const data = await loadControlPlane();
	const task = data.tasks.find((candidate) => candidate.id === params.taskId);

	if (!task) {
		throw error(404, 'Task not found.');
	}

	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const workerMap = new Map(data.workers.map((worker) => [worker.id, worker]));
	const providerMap = new Map(data.providers.map((provider) => [provider.id, provider]));
	const goalMap = new Map(data.goals.map((goal) => [goal.id, goal]));
	const dependencyTaskIds = new Set(task.dependencyTaskIds);
	const relatedRuns = data.runs
		.filter((run) => run.taskId === task.id)
		.map((run) => ({
			...run,
			workerName: run.workerId
				? (workerMap.get(run.workerId)?.name ?? 'Unknown worker')
				: 'Unassigned',
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
	const project = projectMap.get(task.projectId) ?? null;
	const artifactRoot = getTaskAttachmentRoot(task, project);
	const sessionMap = new Map(sessions.map((session) => [session.id, session]));
	const assignedThread = task.threadSessionId
		? (sessions.find((session) => session.id === task.threadSessionId) ?? null)
		: null;
	const latestRun = task.latestRunId
		? (relatedRuns.find((run) => run.id === task.latestRunId) ?? null)
		: null;
	const activeRun =
		relatedRuns.find((run) => ACTIVE_TASK_RUN_STATUSES.has(run.status)) ?? null;
	const latestRunThread = latestRun?.sessionId
		? (sessionMap.get(latestRun.sessionId) ?? null)
		: null;
	const threadScopedSessions = sessions.filter((session) => {
		if (!project) {
			return false;
		}

		return isTaskThreadCompatibleWithProject(project, session);
	});
	const { candidateThreads, suggestedThread } = buildTaskThreadSuggestions({
		task,
		assignedThreadId: assignedThread?.id ?? null,
		sessions: threadScopedSessions
	});

	return {
		task: {
			...task,
			projectName: projectMap.get(task.projectId)?.name ?? 'No project',
			goalName: task.goalId ? (goalMap.get(task.goalId)?.name ?? 'Unknown goal') : '',
			assigneeName: task.assigneeWorkerId
				? (workerMap.get(task.assigneeWorkerId)?.name ?? 'Unknown worker')
				: 'Unassigned',
			latestRun,
			activeRun,
			hasActiveRun: Boolean(activeRun),
			...selectProjectTaskThreadContext(project, {
				assignedThread,
				latestRunThread
			}),
			updatedAtLabel: formatRelativeTime(task.updatedAt),
			openReview,
			pendingApproval
		},
		attachmentRoot: artifactRoot,
		artifactBrowser: await buildArtifactBrowser({
			rootPath: artifactRoot,
			knownOutputs: task.attachments.map((attachment) => ({
				label: attachment.name,
				path: attachment.path,
				href: `/api/tasks/${task.id}/attachments/${attachment.id}`,
				description: `Attached task file${attachment.contentType ? ` · ${attachment.contentType}` : ''}`
			}))
		}),
		project,
		projects: [...data.projects].sort((a, b) => a.name.localeCompare(b.name)),
		workers: [...data.workers].sort((a, b) => a.name.localeCompare(b.name)),
		statusOptions: TASK_STATUS_OPTIONS,
		relatedRuns,
		dependencyTasks,
		candidateThreads,
		suggestedThread
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

	attachTaskFile: async ({ params, request }) => {
		const form = await request.formData();
		const upload = form.get('attachment');
		const current = await loadControlPlane();
		const task = current.tasks.find((candidate) => candidate.id === params.taskId);

		if (!task) {
			return fail(404, { message: 'Task not found.' });
		}

		if (!(upload instanceof File) || upload.size === 0) {
			return fail(400, { message: 'Choose a file to attach.' });
		}

		const project = current.projects.find((candidate) => candidate.id === task.projectId) ?? null;
		const attachmentRoot = getTaskAttachmentRoot(task, project);

		if (!attachmentRoot) {
			return fail(400, {
				message: 'This task needs an artifact root before files can be attached.'
			});
		}

		const [nextAttachment] = await persistTaskAttachments({
			taskId: task.id,
			attachmentRoot,
			uploads: [upload]
		});
		const now = new Date().toISOString();

		await updateControlPlane((data) => ({
			...data,
			tasks: data.tasks.map((candidate) =>
				candidate.id === params.taskId
					? {
							...candidate,
							attachments: [nextAttachment, ...candidate.attachments],
							updatedAt: now
						}
					: candidate
			)
		}));

		return {
			ok: true,
			successAction: 'attachTaskFile',
			taskId: params.taskId,
			attachmentId: nextAttachment.id
		};
	},

	removeTaskAttachment: async ({ params, request }) => {
		const form = await request.formData();
		const attachmentId = form.get('attachmentId')?.toString().trim() ?? '';
		const current = await loadControlPlane();
		const task = current.tasks.find((candidate) => candidate.id === params.taskId);

		if (!task) {
			return fail(404, { message: 'Task not found.' });
		}

		if (!attachmentId) {
			return fail(400, { message: 'Attachment ID is required.' });
		}

		if (!task.attachments.some((attachment) => attachment.id === attachmentId)) {
			return fail(404, { message: 'Attachment not found.' });
		}

		const now = new Date().toISOString();

		await updateControlPlane((data) => ({
			...data,
			tasks: data.tasks.map((candidate) =>
				candidate.id === params.taskId
					? {
							...candidate,
							attachments: candidate.attachments.filter(
								(attachment) => attachment.id !== attachmentId
							),
							updatedAt: now
						}
					: candidate
			)
		}));

		return {
			ok: true,
			successAction: 'removeTaskAttachment',
			taskId: params.taskId,
			attachmentId
		};
	},

	updateTaskThread: async ({ params, request }) => {
		const form = await request.formData();
		const threadSessionId = form.get('threadSessionId')?.toString().trim() ?? '';
		const current = await loadControlPlane();
		const task = current.tasks.find((candidate) => candidate.id === params.taskId);

		if (!task) {
			return fail(404, { message: 'Task not found.' });
		}

		if (threadSessionId) {
			const session = await getAgentSession(threadSessionId);

			if (!session) {
				return fail(400, { message: 'Selected work thread was not found.' });
			}
		}

		await updateControlPlane((data) => ({
			...data,
			tasks: data.tasks.map((candidate) =>
				candidate.id === params.taskId
					? {
							...candidate,
							threadSessionId: threadSessionId || null,
							updatedAt: new Date().toISOString()
						}
					: candidate
			)
		}));

		return {
			ok: true,
			successAction: 'updateTaskThread',
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

		if (task.status !== 'ready') {
			return fail(409, {
				message: 'Only tasks in the Ready state can be run. Set the task status to Ready first.'
			});
		}

		const activeTaskRun =
			current.runs.find(
				(run) => run.taskId === task.id && ACTIVE_TASK_RUN_STATUSES.has(run.status)
			) ?? null;

		if (activeTaskRun) {
			return fail(409, {
				message:
					'This task already has an active run. Open the current work thread or wait for it to finish before starting another run.'
			});
		}

		const effectiveName = name || task.title;
		const effectiveInstructions = instructions || task.summary;
		const effectiveProjectId = projectId || task.projectId;
		const assigneeWorker = assigneeWorkerId
			? current.workers.find((candidate) => candidate.id === assigneeWorkerId)
			: null;
		const effectiveWorker =
			assigneeWorker ??
			(task.assigneeWorkerId
				? (current.workers.find((candidate) => candidate.id === task.assigneeWorkerId) ?? null)
				: null);
		const project = current.projects.find((candidate) => candidate.id === effectiveProjectId);

		if (!project) {
			return fail(400, { message: 'Task project not found.' });
		}

		if (assigneeWorkerId && !assigneeWorker) {
			return fail(400, { message: 'Worker not found.' });
		}

		if (!project.projectRootFolder) {
			return fail(400, {
				message: 'This task cannot launch a work thread until its project has a root folder.'
			});
		}

		if (getPendingApprovalForTask(current, task.id)?.mode === 'before_run') {
			return fail(409, {
				message: 'This task is waiting on before-run approval before a work thread can start.'
			});
		}

		const prompt = buildTaskThreadPrompt({
			taskName: effectiveName,
			taskInstructions: effectiveInstructions,
			projectName: project.name,
			projectRootFolder: project.projectRootFolder,
			defaultArtifactRoot: project.defaultArtifactRoot
		});
		const provider = selectExecutionProvider(current, effectiveWorker);
		const sandbox = resolveThreadSandbox({
			worker: effectiveWorker,
			provider
		});
		const assignedThread = task.threadSessionId
			? await getAgentSession(task.threadSessionId)
			: null;
		const compatibleAssignedThread = isTaskThreadCompatibleWithProject(project, assignedThread)
			? assignedThread
			: null;
		let sessionId = task.threadSessionId;
		let threadId = compatibleAssignedThread?.threadId ?? null;
		let reusedAssignedThread = false;

		if (compatibleAssignedThread?.hasActiveRun) {
			return fail(409, {
				message:
					'This task is assigned to a busy work thread. Wait for that run to finish or change the thread assignment first.'
			});
		}

		if (compatibleAssignedThread?.canResume) {
			await sendAgentSessionMessage(compatibleAssignedThread.id, prompt);
			sessionId = compatibleAssignedThread.id;
			threadId = compatibleAssignedThread.threadId;
			reusedAssignedThread = true;
		} else {
			const session = await startAgentSession({
				name: buildTaskThreadName({
					projectName: project.name,
					taskName: effectiveName,
					taskId: task.id
				}),
				cwd: project.projectRootFolder,
				prompt,
				sandbox,
				model: null
			});
			sessionId = session.sessionId;
			threadId = null;
		}
		const providerId = provider?.id ?? null;
		const run = createRun({
			taskId: params.taskId,
			workerId: effectiveWorker?.id ?? null,
			providerId,
			status: 'running',
			startedAt: new Date().toISOString(),
			threadId,
			sessionId,
			promptDigest: buildPromptDigest(prompt),
			artifactPaths:
				project.defaultArtifactRoot || project.projectRootFolder
					? [project.defaultArtifactRoot || project.projectRootFolder]
					: [],
			summary: reusedAssignedThread
				? 'Queued in the task’s assigned work thread.'
				: 'Started a new work thread from the task detail page.',
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
							assigneeWorkerId: assigneeWorker?.id ?? candidate.assigneeWorkerId,
							desiredRoleId: assigneeWorker?.roleId ?? candidate.desiredRoleId,
							threadSessionId: sessionId,
							artifactPath:
								candidate.artifactPath ||
								project.defaultArtifactRoot ||
								project.projectRootFolder ||
								'',
							runCount: candidate.runCount + 1,
							latestRunId: run.id,
							status: 'in_progress',
							updatedAt: new Date().toISOString()
						}
					: candidate
			)
		}));

		return {
			ok: true,
			successAction: 'launchTaskSession',
			taskId: params.taskId,
			sessionId
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
						updateLatestRunForTask(task.latestRunId, 'done', 'Task closed after review approval.')
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
						updateLatestRunForTask(task.latestRunId, 'done', 'Task closed after approval.')
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
	},

	deleteTask: async ({ params }) => {
		const current = await loadControlPlane();
		const task = current.tasks.find((candidate) => candidate.id === params.taskId);

		if (!task) {
			return fail(404, { message: 'Task not found.' });
		}

		const relatedSessionIds = [
			...new Set(
				current.runs
					.filter((run) => run.taskId === params.taskId)
					.map((run) => run.sessionId)
					.filter((sessionId): sessionId is string => Boolean(sessionId))
			)
		];

		await Promise.all(relatedSessionIds.map((sessionId) => cancelAgentSession(sessionId)));
		await updateControlPlane((data) => removeTaskFromControlPlane(data, params.taskId));

		throw redirect(303, '/app/tasks?deleted=1');
	}
};
