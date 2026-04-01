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
	recoverAgentSession,
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
import { listInstalledCodexSkills } from '$lib/server/codex-skills';
import {
	isTaskThreadCompatibleWithProject,
	selectProjectTaskThreadContext
} from '$lib/server/task-thread-compatibility';
import { buildTaskFreshness } from '$lib/server/task-work-items';
import { getWorkspaceExecutionIssue } from '$lib/server/task-execution-workspace';

const ACTIVE_TASK_RUN_STATUSES = new Set<Run['status']>(['queued', 'starting', 'running']);

class TaskActionError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

function readTaskForm(form: FormData) {
	return {
		name: form.get('name')?.toString().trim() ?? '',
		instructions: form.get('instructions')?.toString().trim() ?? '',
		projectId: form.get('projectId')?.toString().trim() ?? '',
		assigneeWorkerId: form.get('assigneeWorkerId')?.toString().trim() ?? '',
		targetDate: form.get('targetDate')?.toString().trim() ?? ''
	};
}

function isValidDate(value: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getActionErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error && error.message.trim() ? error.message : fallback;
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

function getActiveTaskRun(data: { runs: Run[] }, taskId: string) {
	return data.runs.find((run) => run.taskId === taskId && ACTIVE_TASK_RUN_STATUSES.has(run.status)) ?? null;
}

function buildStalledRecoveryState(input: {
	task: Task;
	activeRun: Run | null;
	statusThread: Awaited<ReturnType<typeof getAgentSession>> | null;
}) {
	if (!input.activeRun) {
		return null;
	}

	const freshness = buildTaskFreshness({
		task: input.task,
		latestRun: input.activeRun,
		statusThread: input.statusThread
	});
	const staleDetails: string[] = [];

	if (freshness.noRecentRunActivity) {
		staleDetails.push(`No run heartbeat for ${freshness.runActivityAgeLabel}.`);
	}

	if (freshness.activeThreadNoRecentOutput) {
		staleDetails.push(`No thread output for ${freshness.threadActivityAgeLabel}.`);
	}

	if (staleDetails.length === 0) {
		return null;
	}

	return {
		eligible: true,
		headline: 'This task appears stalled.',
		detail: `${staleDetails.join(' ')} Recovering will retire the current run and queue fresh work.`
	};
}

async function buildTaskLaunchPlan(
	current: Awaited<ReturnType<typeof loadControlPlane>>,
	task: Task,
	input: ReturnType<typeof readTaskForm>
) {
	const effectiveName = input.name || task.title;
	const effectiveInstructions = input.instructions || task.summary;
	const effectiveProjectId = input.projectId || task.projectId;
	const assigneeWorker = input.assigneeWorkerId
		? current.workers.find((candidate) => candidate.id === input.assigneeWorkerId)
		: null;
	const effectiveWorker =
		assigneeWorker ??
		(task.assigneeWorkerId
			? (current.workers.find((candidate) => candidate.id === task.assigneeWorkerId) ?? null)
			: null);
	const project = current.projects.find((candidate) => candidate.id === effectiveProjectId);

	if (!project) {
		throw new TaskActionError(400, 'Task project not found.');
	}

	if (input.assigneeWorkerId && !assigneeWorker) {
		throw new TaskActionError(400, 'Worker not found.');
	}

	if (!project.projectRootFolder) {
		throw new TaskActionError(
			400,
			'This task cannot launch a work thread until its project has a root folder.'
		);
	}

	if (getPendingApprovalForTask(current, task.id)?.mode === 'before_run') {
		throw new TaskActionError(
			409,
			'This task is waiting on before-run approval before a work thread can start.'
		);
	}

	const prompt = buildTaskThreadPrompt({
		taskName: effectiveName,
		taskInstructions: effectiveInstructions,
		projectName: project.name,
		projectRootFolder: project.projectRootFolder,
		defaultArtifactRoot: project.defaultArtifactRoot,
		availableSkillNames: listInstalledCodexSkills(project.projectRootFolder)
			.slice(0, 12)
			.map((skill) => skill.id)
	});
	const provider = selectExecutionProvider(current, effectiveWorker);
	const sandbox = resolveThreadSandbox({
		worker: effectiveWorker,
		project,
		provider
	});
	const assignedThread = task.threadSessionId ? await getAgentSession(task.threadSessionId) : null;
	const compatibleAssignedThread = isTaskThreadCompatibleWithProject(project, assignedThread)
		? assignedThread
		: null;

	if (compatibleAssignedThread?.hasActiveRun) {
		throw new TaskActionError(
			409,
			'This task is assigned to a busy work thread. Wait for that run to finish or change the thread assignment first.'
		);
	}

	const workspaceIssue = getWorkspaceExecutionIssue({
		cwd: project.projectRootFolder,
		sandbox,
		scopeLabel: 'Project root'
	});

	if (workspaceIssue) {
		throw new TaskActionError(400, workspaceIssue);
	}

	return {
		task,
		project,
		effectiveName,
		effectiveInstructions,
		assigneeWorker,
		effectiveWorker,
		provider,
		prompt,
		compatibleAssignedThread
	};
}

async function launchTaskFromPlan(
	taskId: string,
	plan: Awaited<ReturnType<typeof buildTaskLaunchPlan>>
) {
	let sessionId = plan.task.threadSessionId;
	let threadId = plan.compatibleAssignedThread?.threadId ?? null;
	let reusedAssignedThread = false;

	if (plan.compatibleAssignedThread?.canResume) {
		await sendAgentSessionMessage(plan.compatibleAssignedThread.id, plan.prompt);
		sessionId = plan.compatibleAssignedThread.id;
		threadId = plan.compatibleAssignedThread.threadId;
		reusedAssignedThread = true;
	} else {
		const session = await startAgentSession({
			name: buildTaskThreadName({
				projectName: plan.project.name,
				taskName: plan.effectiveName,
				taskId: plan.task.id
			}),
			cwd: plan.project.projectRootFolder,
			prompt: plan.prompt,
			sandbox: resolveThreadSandbox({
				worker: plan.effectiveWorker,
				project: plan.project,
				provider: plan.provider
			}),
			model: null
		});

		sessionId = session.sessionId;
		threadId = null;
	}

	const now = new Date().toISOString();
	const providerId = plan.provider?.id ?? null;
	const run = createRun({
		taskId,
		workerId: plan.effectiveWorker?.id ?? null,
		providerId,
		status: 'running',
		startedAt: now,
		threadId,
		sessionId,
		promptDigest: buildPromptDigest(plan.prompt),
		artifactPaths:
			plan.project.defaultArtifactRoot || plan.project.projectRootFolder
				? [plan.project.defaultArtifactRoot || plan.project.projectRootFolder]
				: [],
		summary: reusedAssignedThread
			? 'Queued in the task’s assigned work thread.'
			: 'Started a new work thread from the task detail page.',
		lastHeartbeatAt: now
	});

	await updateControlPlane((data) => ({
		...data,
		runs: [run, ...data.runs],
		tasks: data.tasks.map((candidate) =>
			candidate.id === taskId
				? {
						...candidate,
						title: plan.effectiveName,
						summary: plan.effectiveInstructions,
						projectId: plan.project.id,
						assigneeWorkerId: plan.assigneeWorker?.id ?? candidate.assigneeWorkerId,
						desiredRoleId: plan.assigneeWorker?.roleId ?? candidate.desiredRoleId,
						threadSessionId: sessionId,
						artifactPath:
							candidate.artifactPath ||
							plan.project.defaultArtifactRoot ||
							plan.project.projectRootFolder ||
							'',
						runCount: candidate.runCount + 1,
						latestRunId: run.id,
						status: 'in_progress',
						blockedReason: '',
						updatedAt: now
					}
				: candidate
		)
	}));

	return {
		sessionId
	};
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
	const activeRun = relatedRuns.find((run) => ACTIVE_TASK_RUN_STATUSES.has(run.status)) ?? null;
	const latestRunThread = latestRun?.sessionId
		? (sessionMap.get(latestRun.sessionId) ?? null)
		: null;
	const threadContext = selectProjectTaskThreadContext(project, {
		assignedThread,
		latestRunThread
	});
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
	const availableSkills = listInstalledCodexSkills(project?.projectRootFolder ?? '');
	const stalledRecovery = buildStalledRecoveryState({
		task,
		activeRun,
		statusThread: threadContext.statusThread
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
			...threadContext,
			updatedAtLabel: formatRelativeTime(task.updatedAt),
			openReview,
			pendingApproval
		},
		stalledRecovery,
		attachmentRoot: artifactRoot,
		availableSkills: {
			totalCount: availableSkills.length,
			globalCount: availableSkills.filter((skill) => skill.global).length,
			projectCount: availableSkills.filter((skill) => skill.project).length,
			previewSkills: availableSkills.slice(0, 8)
		},
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
		const { name, instructions, projectId, assigneeWorkerId, targetDate } = readTaskForm(form);

		if (!name || !instructions || !projectId) {
			return fail(400, {
				message: 'Name, instructions, and project are required.'
			});
		}

		if (targetDate && !isValidDate(targetDate)) {
			return fail(400, { message: 'Target date must use YYYY-MM-DD format.' });
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
					targetDate: targetDate || null,
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
		const taskInput = readTaskForm(form);
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

		const activeTaskRun = getActiveTaskRun(current, task.id);

		if (activeTaskRun) {
			return fail(409, {
				message:
					'This task already has an active run. Open the current work thread or wait for it to finish before starting another run.'
			});
		}

		let launchPlan: Awaited<ReturnType<typeof buildTaskLaunchPlan>>;

		try {
			launchPlan = await buildTaskLaunchPlan(current, task, taskInput);
		} catch (error) {
			if (error instanceof TaskActionError) {
				return fail(error.status, { message: error.message });
			}

			return fail(400, {
				message: getActionErrorMessage(error, 'Could not prepare a work thread for this task.')
			});
		}

		let launchedSessionId: string | null = null;

		try {
			const launchResult = await launchTaskFromPlan(params.taskId, launchPlan);
			launchedSessionId = launchResult.sessionId;
		} catch (error) {
			return fail(400, {
				message: getActionErrorMessage(error, 'Could not start a work thread for this task.')
			});
		}

		return {
			ok: true,
			successAction: 'launchTaskSession',
			taskId: params.taskId,
			sessionId: launchedSessionId
		};
	},

	recoverTaskSession: async ({ params, request }) => {
		const form = await request.formData();
		const taskInput = readTaskForm(form);
		const current = await loadControlPlane();
		const task = current.tasks.find((candidate) => candidate.id === params.taskId);

		if (!task) {
			return fail(404, { message: 'Task not found.' });
		}

		const project = current.projects.find((candidate) => candidate.id === task.projectId) ?? null;
		const activeTaskRun = getActiveTaskRun(current, task.id);
		const assignedThread = task.threadSessionId ? await getAgentSession(task.threadSessionId) : null;
		const activeRunThread = activeTaskRun?.sessionId
			? await getAgentSession(activeTaskRun.sessionId)
			: null;
		const threadContext = selectProjectTaskThreadContext(project, {
			assignedThread,
			latestRunThread: activeRunThread
		});
		const stalledRecovery = buildStalledRecoveryState({
			task,
			activeRun: activeTaskRun,
			statusThread: threadContext.statusThread
		});

		if (!activeTaskRun) {
			return fail(409, {
				message: 'This task does not have an active run to recover.'
			});
		}

		if (!stalledRecovery?.eligible) {
			return fail(409, {
				message: 'This task does not currently look stalled enough to recover automatically.'
			});
		}

		if (!activeTaskRun.sessionId) {
			return fail(409, {
				message: 'The active run is not linked to a recoverable work thread.'
			});
		}

		try {
			await recoverAgentSession(activeTaskRun.sessionId);
		} catch (error) {
			if (error instanceof TaskActionError) {
				return fail(error.status, { message: error.message });
			}

			return fail(400, {
				message: getActionErrorMessage(error, 'Could not recover the stalled work thread.')
			});
		}

		const refreshedControlPlane = await loadControlPlane();
		const refreshedTask =
			refreshedControlPlane.tasks.find((candidate) => candidate.id === params.taskId) ?? null;

		if (!refreshedTask) {
			return fail(404, { message: 'Task not found after recovery.' });
		}

		let launchPlan: Awaited<ReturnType<typeof buildTaskLaunchPlan>>;

		try {
			launchPlan = await buildTaskLaunchPlan(refreshedControlPlane, refreshedTask, taskInput);
		} catch (error) {
			if (error instanceof TaskActionError) {
				return fail(error.status, { message: error.message });
			}

			return fail(400, {
				message: getActionErrorMessage(error, 'Could not prepare fresh work after recovery.')
			});
		}

		let launchedSessionId: string | null = null;

		try {
			const launchResult = await launchTaskFromPlan(params.taskId, launchPlan);
			launchedSessionId = launchResult.sessionId;
		} catch (error) {
			return fail(400, {
				message: getActionErrorMessage(error, 'Recovered the stalled run but could not relaunch the task.')
			});
		}

		return {
			ok: true,
			successAction: 'recoverTaskSession',
			taskId: params.taskId,
			sessionId: launchedSessionId
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
