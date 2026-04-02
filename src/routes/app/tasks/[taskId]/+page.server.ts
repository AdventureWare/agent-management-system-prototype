import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	TASK_STATUS_OPTIONS,
	formatTaskStatusLabel,
	type Goal,
	type Project,
	type Run,
	type Task
} from '$lib/types/control-plane';
import {
	createDecision,
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
import { loadRelevantSelfImprovementKnowledgeItems } from '$lib/server/self-improvement-knowledge';
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
import { getWorkerAssignmentSuggestions } from '$lib/server/worker-api';

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
		goalId: form.get('goalId')?.toString().trim() ?? '',
		hasGoalId: form.has('goalId'),
		assigneeWorkerId: form.get('assigneeWorkerId')?.toString().trim() ?? '',
		requiredCapabilityNames:
			form
				.get('requiredCapabilityNames')
				?.toString()
				.split(',')
				.map((value) => value.trim())
				.filter(Boolean) ?? [],
		requiredToolNames:
			form
				.get('requiredToolNames')
				?.toString()
				.split(',')
				.map((value) => value.trim())
				.filter(Boolean) ?? [],
		targetDate: form.get('targetDate')?.toString().trim() ?? ''
	};
}

function isValidDate(value: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getActionErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function formatDecisionDate(value: string | null) {
	return value ? value : 'clear the target date';
}

function buildTaskPlanDecisionSummary(input: {
	task: Task;
	nextTitle: string;
	nextSummary: string;
	nextProject: Project;
	nextGoalId: string;
	nextGoalName: string | null;
	currentGoalName: string | null;
	nextStatus: Task['status'];
	nextAssigneeWorker: { id: string; name: string } | null;
	nextRequiredCapabilityNames: string[];
	nextRequiredToolNames: string[];
	nextTargetDate: string | null;
}) {
	const changes: string[] = [];
	const currentCapabilityNames = [...(input.task.requiredCapabilityNames ?? [])].sort();
	const nextCapabilityNames = [...input.nextRequiredCapabilityNames].sort();
	const currentToolNames = [...(input.task.requiredToolNames ?? [])].sort();
	const nextToolNames = [...input.nextRequiredToolNames].sort();

	if (input.nextTitle !== input.task.title) {
		changes.push(`renamed the task to "${input.nextTitle}"`);
	}

	if (input.nextSummary !== input.task.summary) {
		changes.push('updated the task brief');
	}

	if (input.nextProject.id !== input.task.projectId) {
		changes.push(`moved the task to ${input.nextProject.name}`);
	}

	if (input.nextGoalId !== input.task.goalId) {
		changes.push(
			input.nextGoalId
				? `linked the task to goal "${input.nextGoalName ?? input.nextGoalId}"`
				: input.task.goalId
					? `cleared the goal link from "${input.currentGoalName ?? input.task.goalId}"`
					: 'cleared the goal link'
		);
	}

	if (input.nextStatus !== input.task.status) {
		changes.push(`set status to ${formatTaskStatusLabel(input.nextStatus)}`);
	}

	if (input.nextAssigneeWorker?.id !== input.task.assigneeWorkerId) {
		changes.push(
			input.nextAssigneeWorker
				? `assigned the task to ${input.nextAssigneeWorker.name}`
				: 'cleared the task assignee'
		);
	}

	if (currentCapabilityNames.join('|') !== nextCapabilityNames.join('|')) {
		changes.push(
			nextCapabilityNames.length > 0
				? `set required capabilities to ${nextCapabilityNames.join(', ')}`
				: 'cleared required capabilities'
		);
	}

	if (currentToolNames.join('|') !== nextToolNames.join('|')) {
		changes.push(
			nextToolNames.length > 0
				? `set required tools to ${nextToolNames.join(', ')}`
				: 'cleared required tools'
		);
	}

	if ((input.nextTargetDate ?? null) !== (input.task.targetDate ?? null)) {
		changes.push(
			input.nextTargetDate
				? `set the target date to ${formatDecisionDate(input.nextTargetDate)}`
				: 'cleared the target date'
		);
	}

	return changes.length > 0 ? `Updated task plan: ${changes.join('; ')}.` : null;
}

const ROOT_GOAL_PARENT_KEY = '__root__';

function buildTaskGoalOptions(goals: Goal[]) {
	const goalIds = new Set(goals.map((goal) => goal.id));
	const childrenByParent = new Map<string, Goal[]>();

	for (const goal of goals) {
		const parentKey =
			goal.parentGoalId && goalIds.has(goal.parentGoalId)
				? goal.parentGoalId
				: ROOT_GOAL_PARENT_KEY;
		const siblings = childrenByParent.get(parentKey) ?? [];
		siblings.push(goal);
		childrenByParent.set(parentKey, siblings);
	}

	for (const siblings of childrenByParent.values()) {
		siblings.sort((left, right) => left.name.localeCompare(right.name));
	}

	const orderedGoals: Array<{
		id: string;
		name: string;
		label: string;
		depth: number;
		parentGoalId: string | null;
		status: Goal['status'];
		lane: Goal['lane'];
	}> = [];
	const visitedGoalIds = new Set<string>();

	function visitChildren(parentKey: string, depth: number) {
		for (const goal of childrenByParent.get(parentKey) ?? []) {
			if (visitedGoalIds.has(goal.id)) {
				continue;
			}

			visitedGoalIds.add(goal.id);
			orderedGoals.push({
				id: goal.id,
				name: goal.name,
				label: `${depth > 0 ? `${'  '.repeat(depth)}- ` : ''}${goal.name}`,
				depth,
				parentGoalId: goal.parentGoalId ?? null,
				status: goal.status,
				lane: goal.lane
			});
			visitChildren(goal.id, depth + 1);
		}
	}

	visitChildren(ROOT_GOAL_PARENT_KEY, 0);

	for (const goal of [...goals].sort((left, right) => left.name.localeCompare(right.name))) {
		if (visitedGoalIds.has(goal.id)) {
			continue;
		}

		orderedGoals.push({
			id: goal.id,
			name: goal.name,
			label: goal.name,
			depth: 0,
			parentGoalId: goal.parentGoalId ?? null,
			status: goal.status,
			lane: goal.lane
		});
		visitChildren(goal.id, 1);
	}

	return orderedGoals;
}

async function loadTaskRetrievedKnowledge(task: Task, project: Project | null) {
	return loadRelevantSelfImprovementKnowledgeItems({
		task,
		project,
		limit: 3
	});
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
	return (
		data.runs.find((run) => run.taskId === taskId && ACTIVE_TASK_RUN_STATUSES.has(run.status)) ??
		null
	);
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
	const selectedGoal = input.goalId
		? (current.goals.find((candidate) => candidate.id === input.goalId) ?? null)
		: null;
	const effectiveGoalId = input.hasGoalId ? (selectedGoal?.id ?? '') : task.goalId;
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

	if (input.goalId && !selectedGoal) {
		throw new TaskActionError(400, 'Goal not found.');
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

	const taskKnowledge = await loadTaskRetrievedKnowledge(
		{
			...task,
			title: effectiveName,
			summary: effectiveInstructions,
			projectId: effectiveProjectId
		},
		project
	);

	const prompt = buildTaskThreadPrompt({
		taskName: effectiveName,
		taskInstructions: effectiveInstructions,
		projectName: project.name,
		projectRootFolder: project.projectRootFolder,
		defaultArtifactRoot: project.defaultArtifactRoot,
		availableSkillNames: listInstalledCodexSkills(project.projectRootFolder)
			.slice(0, 12)
			.map((skill) => skill.id),
		relevantKnowledgeItems: taskKnowledge
	});
	const provider = selectExecutionProvider(current, effectiveWorker);
	const sandbox = resolveThreadSandbox({
		worker: effectiveWorker,
		project,
		provider
	});
	const assignedThread = task.threadSessionId ? await getAgentSession(task.threadSessionId) : null;
	const latestRun = task.latestRunId
		? (current.runs.find((run) => run.id === task.latestRunId) ?? null)
		: null;
	const latestRunThread =
		latestRun?.sessionId && latestRun.sessionId !== task.threadSessionId
			? await getAgentSession(latestRun.sessionId)
			: null;
	const threadContext = selectProjectTaskThreadContext(project, {
		assignedThread,
		latestRunThread
	});
	const compatibleAssignedThread = threadContext.assignedThread;

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
		effectiveGoalId,
		effectiveName,
		effectiveInstructions,
		assigneeWorker,
		effectiveWorker,
		provider,
		prompt,
		retrievedKnowledgeItems: taskKnowledge,
		compatibleAssignedThread,
		compatibleLatestRunThread: threadContext.latestRunThread
	};
}

async function launchTaskFromPlan(
	taskId: string,
	plan: Awaited<ReturnType<typeof buildTaskLaunchPlan>>
) {
	let sessionId = plan.compatibleAssignedThread?.id ?? plan.compatibleLatestRunThread?.id ?? null;
	let threadId =
		(plan.compatibleAssignedThread ?? plan.compatibleLatestRunThread)?.threadId ?? null;
	let reusedThreadMode: 'assigned' | 'latest' | null = null;

	if (plan.compatibleAssignedThread?.canResume) {
		await sendAgentSessionMessage(plan.compatibleAssignedThread.id, plan.prompt);
		sessionId = plan.compatibleAssignedThread.id;
		threadId = plan.compatibleAssignedThread.threadId;
		reusedThreadMode = 'assigned';
	} else if (!plan.compatibleAssignedThread && plan.compatibleLatestRunThread?.canResume) {
		await sendAgentSessionMessage(plan.compatibleLatestRunThread.id, plan.prompt);
		sessionId = plan.compatibleLatestRunThread.id;
		threadId = plan.compatibleLatestRunThread.threadId;
		reusedThreadMode = 'latest';
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
		summary:
			reusedThreadMode === 'assigned'
				? 'Queued in the task’s assigned work thread.'
				: reusedThreadMode === 'latest'
					? 'Queued in the task’s latest compatible work thread.'
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
						goalId: plan.effectiveGoalId,
						assigneeWorkerId: plan.assigneeWorker?.id ?? candidate.assigneeWorkerId,
						desiredRoleId: plan.assigneeWorker?.roleId ?? candidate.desiredRoleId,
						threadSessionId: sessionId,
						artifactPath:
							candidate.artifactPath ||
							plan.project.defaultArtifactRoot ||
							plan.project.projectRootFolder ||
							'',
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
	const retrievedKnowledgeItems = await loadTaskRetrievedKnowledge(task, project);
	const stalledRecovery = buildStalledRecoveryState({
		task,
		activeRun,
		statusThread: threadContext.statusThread
	});
	const recentDecisions = [...(data.decisions ?? [])]
		.filter((decision) => decision.taskId === task.id)
		.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
		.slice(0, 8)
		.map((decision) => ({
			...decision,
			createdAtLabel: formatRelativeTime(decision.createdAt)
		}));
	const assignmentSuggestions = getWorkerAssignmentSuggestions(data, task).map((suggestion) => ({
		...suggestion,
		roleName: data.roles.find((role) => role.id === suggestion.roleId)?.name ?? suggestion.roleId,
		providerName:
			data.providers.find((provider) => provider.id === suggestion.providerId)?.name ??
			suggestion.providerId,
		isCurrentAssignee: suggestion.workerId === task.assigneeWorkerId
	}));

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
		retrievedKnowledgeItems,
		projects: [...data.projects].sort((a, b) => a.name.localeCompare(b.name)),
		goals: buildTaskGoalOptions(data.goals),
		workers: [...data.workers].sort((a, b) => a.name.localeCompare(b.name)),
		assignmentSuggestions,
		recentDecisions,
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
		const {
			name,
			instructions,
			projectId,
			goalId,
			assigneeWorkerId,
			requiredCapabilityNames,
			requiredToolNames,
			targetDate
		} = readTaskForm(form);

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
		const goal = goalId
			? (current.goals.find((candidate) => candidate.id === goalId) ?? null)
			: null;
		const assigneeWorker = assigneeWorkerId
			? current.workers.find((candidate) => candidate.id === assigneeWorkerId)
			: null;

		if (!project) {
			return fail(400, { message: 'Project not found.' });
		}

		if (goalId && !goal) {
			return fail(400, { message: 'Goal not found.' });
		}

		if (assigneeWorkerId && !assigneeWorker) {
			return fail(400, { message: 'Worker not found.' });
		}

		const existingTask = current.tasks.find((candidate) => candidate.id === params.taskId);

		if (!existingTask) {
			return fail(404, { message: 'Task not found.' });
		}

		const nextTitle = name;
		const nextInstructions = instructions;
		const nextGoalId = goal?.id ?? '';
		const nextStatus = status;
		const nextAssigneeWorker = assigneeWorker ?? null;
		const nextRequiredCapabilityNames = requiredCapabilityNames;
		const nextRequiredToolNames = requiredToolNames;
		const nextTargetDate = targetDate || null;
		const decisionSummary = buildTaskPlanDecisionSummary({
			task: existingTask,
			nextTitle,
			nextSummary: nextInstructions,
			nextProject: project,
			nextGoalId,
			nextGoalName: goal?.name ?? null,
			currentGoalName: existingTask.goalId
				? (current.goals.find((candidate) => candidate.id === existingTask.goalId)?.name ?? null)
				: null,
			nextStatus,
			nextAssigneeWorker,
			nextRequiredCapabilityNames,
			nextRequiredToolNames,
			nextTargetDate
		});
		const now = new Date().toISOString();
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
					title: nextTitle,
					summary: nextInstructions,
					projectId: project.id,
					goalId: nextGoalId,
					status: nextStatus,
					assigneeWorkerId: nextAssigneeWorker?.id ?? null,
					desiredRoleId: nextAssigneeWorker?.roleId ?? task.desiredRoleId,
					requiredCapabilityNames: nextRequiredCapabilityNames,
					requiredToolNames: nextRequiredToolNames,
					targetDate: nextTargetDate,
					artifactPath:
						task.artifactPath || project.defaultArtifactRoot || project.projectRootFolder || '',
					updatedAt: now
				};
			}),
			decisions: decisionSummary
				? [
						createDecision({
							taskId: params.taskId,
							decisionType: 'task_plan_updated',
							summary: decisionSummary,
							createdAt: now
						}),
						...(data.decisions ?? [])
					]
				: (data.decisions ?? [])
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

		const now = new Date().toISOString();
		const decisionSummary =
			(threadSessionId || null) === task.threadSessionId
				? null
				: threadSessionId
					? `Updated task thread assignment to ${threadSessionId}.`
					: 'Cleared the task thread assignment.';

		await updateControlPlane((data) => ({
			...data,
			tasks: data.tasks.map((candidate) =>
				candidate.id === params.taskId
					? {
							...candidate,
							threadSessionId: threadSessionId || null,
							updatedAt: now
						}
					: candidate
			),
			decisions: decisionSummary
				? [
						createDecision({
							taskId: params.taskId,
							decisionType: 'task_thread_updated',
							summary: decisionSummary,
							createdAt: now
						}),
						...(data.decisions ?? [])
					]
				: (data.decisions ?? [])
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
		const assignedThread = task.threadSessionId
			? await getAgentSession(task.threadSessionId)
			: null;
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
				message: getActionErrorMessage(
					error,
					'Recovered the stalled run but could not relaunch the task.'
				)
			});
		}

		const recoveryDecisionAt = new Date().toISOString();

		await updateControlPlane((data) => ({
			...data,
			decisions: [
				createDecision({
					taskId: params.taskId,
					runId: activeTaskRun.id,
					decisionType: 'task_recovered',
					summary: `Recovered stalled work by retiring run ${activeTaskRun.id} and re-queuing the task${launchedSessionId ? ` in thread ${launchedSessionId}` : ''}.`,
					createdAt: recoveryDecisionAt
				}),
				...(data.decisions ?? [])
			]
		}));

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
			),
			decisions: [
				createDecision({
					taskId: params.taskId,
					runId: task.latestRunId,
					reviewId: openReview.id,
					decisionType: 'review_approved',
					summary: shouldCloseTask
						? 'Approved the open review and closed the task.'
						: 'Approved the open review.',
					createdAt: now
				}),
				...(data.decisions ?? [])
			]
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
			),
			decisions: [
				createDecision({
					taskId: params.taskId,
					runId: task.latestRunId,
					reviewId: openReview.id,
					decisionType: 'review_changes_requested',
					summary: blockedReason,
					createdAt: now
				}),
				...(data.decisions ?? [])
			]
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
			),
			decisions: [
				createDecision({
					taskId: params.taskId,
					runId: task.latestRunId,
					approvalId: pendingApproval.id,
					decisionType: 'approval_approved',
					summary: shouldCloseTask
						? `Approved the ${pendingApproval.mode} gate and closed the task.`
						: `Approved the ${pendingApproval.mode} gate.`,
					createdAt: now
				}),
				...(data.decisions ?? [])
			]
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
			),
			decisions: [
				createDecision({
					taskId: params.taskId,
					runId: task.latestRunId,
					approvalId: pendingApproval.id,
					decisionType: 'approval_rejected',
					summary: blockedReason,
					createdAt: now
				}),
				...(data.decisions ?? [])
			]
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
