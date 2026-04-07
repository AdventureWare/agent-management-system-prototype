import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	AGENT_SANDBOX_OPTIONS,
	formatAgentSandboxLabel,
	type AgentSandbox
} from '$lib/types/agent-thread';
import {
	PRIORITY_OPTIONS,
	TASK_APPROVAL_MODE_OPTIONS,
	TASK_RISK_LEVEL_OPTIONS,
	TASK_STATUS_OPTIONS,
	formatPriorityLabel,
	formatTaskApprovalModeLabel,
	formatTaskRiskLevelLabel,
	formatTaskStatusLabel,
	type Goal,
	type Priority,
	type Project,
	type Run,
	type Task,
	type TaskApprovalMode,
	type TaskRiskLevel
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
	cancelAgentThread,
	getAgentThread,
	listAgentThreads,
	recoverAgentThread,
	sendAgentThreadMessage,
	startAgentThread
} from '$lib/server/agent-threads';
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
	approveTaskApproval,
	approveTaskReview,
	rejectTaskApproval,
	requestTaskReviewChanges,
	TaskGovernanceActionError
} from '$lib/server/task-governance';
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
	const parseOption = <T extends readonly string[]>(
		options: T,
		value: FormDataEntryValue | null,
		fallback: T[number]
	): T[number] => {
		const normalized = value?.toString().trim() ?? '';
		return options.includes(normalized as T[number]) ? (normalized as T[number]) : fallback;
	};
	const parseBoolean = (value: FormDataEntryValue | null, fallback: boolean) => {
		const normalized = value?.toString().trim().toLowerCase() ?? '';

		if (normalized === 'true') {
			return true;
		}

		if (normalized === 'false') {
			return false;
		}

		return fallback;
	};
	const parseNameList = (value: FormDataEntryValue | null) => [
		...new Set(
			(value?.toString() ?? '')
				.split(',')
				.map((entry) => entry.trim())
				.filter(Boolean)
		)
	];
	const parseIdList = (values: FormDataEntryValue[]) => [
		...new Set(values.map((value) => value.toString().trim()).filter(Boolean))
	];
	const parseOptionalSandbox = (value: FormDataEntryValue | null): AgentSandbox | null => {
		const normalized = value?.toString().trim() ?? '';
		return AGENT_SANDBOX_OPTIONS.includes(normalized as AgentSandbox)
			? (normalized as AgentSandbox)
			: null;
	};

	return {
		name: form.get('name')?.toString().trim() ?? '',
		instructions: form.get('instructions')?.toString().trim() ?? '',
		successCriteria: form.get('successCriteria')?.toString().trim() ?? '',
		readyCondition: form.get('readyCondition')?.toString().trim() ?? '',
		expectedOutcome: form.get('expectedOutcome')?.toString().trim() ?? '',
		delegationObjective: form.get('delegationObjective')?.toString().trim() ?? '',
		delegationInputContext: form.get('delegationInputContext')?.toString().trim() ?? '',
		delegationExpectedDeliverable:
			form.get('delegationExpectedDeliverable')?.toString().trim() ?? '',
		delegationDoneCondition: form.get('delegationDoneCondition')?.toString().trim() ?? '',
		delegationIntegrationNotes: form.get('delegationIntegrationNotes')?.toString().trim() ?? '',
		hasDelegationPacketFields:
			form.has('delegationObjective') ||
			form.has('delegationInputContext') ||
			form.has('delegationExpectedDeliverable') ||
			form.has('delegationDoneCondition') ||
			form.has('delegationIntegrationNotes'),
		projectId: form.get('projectId')?.toString().trim() ?? '',
		goalId: form.get('goalId')?.toString().trim() ?? '',
		hasGoalId: form.has('goalId'),
		assigneeWorkerId: form.get('assigneeWorkerId')?.toString().trim() ?? '',
		hasAssigneeWorkerId: form.has('assigneeWorkerId'),
		priority: parseOption(PRIORITY_OPTIONS, form.get('priority'), 'medium'),
		hasPriority: form.has('priority'),
		riskLevel: parseOption(TASK_RISK_LEVEL_OPTIONS, form.get('riskLevel'), 'medium'),
		hasRiskLevel: form.has('riskLevel'),
		approvalMode: parseOption(TASK_APPROVAL_MODE_OPTIONS, form.get('approvalMode'), 'none'),
		hasApprovalMode: form.has('approvalMode'),
		requiredThreadSandbox: parseOptionalSandbox(form.get('requiredThreadSandbox')),
		hasRequiredThreadSandbox: form.has('requiredThreadSandbox'),
		requiresReview: parseBoolean(form.get('requiresReview'), true),
		hasRequiresReview: form.has('requiresReview'),
		desiredRoleId: form.get('desiredRoleId')?.toString().trim() ?? '',
		hasDesiredRoleId: form.has('desiredRoleId'),
		requiredCapabilityNames: parseNameList(form.get('requiredCapabilityNames')),
		hasRequiredCapabilityNames: form.has('requiredCapabilityNames'),
		requiredToolNames: parseNameList(form.get('requiredToolNames')),
		hasRequiredToolNames: form.has('requiredToolNames'),
		blockedReason: form.get('blockedReason')?.toString().trim() ?? '',
		hasBlockedReason: form.has('blockedReason'),
		dependencyTaskIds: parseIdList(form.getAll('dependencyTaskIds')),
		hasDependencyTaskSelection: form.has('dependencyTaskSelection'),
		targetDate: form.get('targetDate')?.toString().trim() ?? '',
		hasTargetDate: form.has('targetDate')
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

function joinQuotedLabels(labels: string[]) {
	return labels.map((label) => `"${label}"`).join(', ');
}

function normalizeIdList(values: string[]) {
	return [...new Set(values.filter(Boolean))].sort();
}

function hasDelegationPacketContent(packet: Task['delegationPacket'] | null | undefined) {
	return Boolean(
		packet?.objective ||
		packet?.inputContext ||
		packet?.expectedDeliverable ||
		packet?.doneCondition ||
		packet?.integrationNotes
	);
}

function buildTaskPlanDecisionSummary(input: {
	task: Task;
	nextTitle: string;
	nextSummary: string;
	nextSuccessCriteria: string;
	nextReadyCondition: string;
	nextExpectedOutcome: string;
	nextDelegationPacket: Task['delegationPacket'] | null;
	nextProject: Project;
	nextGoalId: string;
	nextGoalName: string | null;
	currentGoalName: string | null;
	nextStatus: Task['status'];
	nextAssigneeWorker: { id: string; name: string } | null;
	nextPriority: Priority;
	nextRiskLevel: TaskRiskLevel;
	nextApprovalMode: TaskApprovalMode;
	nextRequiredThreadSandbox: AgentSandbox | null;
	nextRequiresReview: boolean;
	nextDesiredRoleId: string;
	nextDesiredRoleName: string | null;
	currentDesiredRoleName: string | null;
	nextRequiredCapabilityNames: string[];
	nextRequiredToolNames: string[];
	nextBlockedReason: string;
	nextDependencyTaskIds: string[];
	nextDependencyTaskTitles: string[];
	currentDependencyTaskTitles: string[];
	nextTargetDate: string | null;
}) {
	const changes: string[] = [];
	const currentCapabilityNames = [...(input.task.requiredCapabilityNames ?? [])].sort();
	const nextCapabilityNames = [...input.nextRequiredCapabilityNames].sort();
	const currentToolNames = [...(input.task.requiredToolNames ?? [])].sort();
	const nextToolNames = [...input.nextRequiredToolNames].sort();
	const currentDependencyIds = normalizeIdList(input.task.dependencyTaskIds ?? []);
	const nextDependencyIds = normalizeIdList(input.nextDependencyTaskIds);

	if (input.nextTitle !== input.task.title) {
		changes.push(`renamed the task to "${input.nextTitle}"`);
	}

	if (input.nextSummary !== input.task.summary) {
		changes.push('updated the task brief');
	}

	if (input.nextSuccessCriteria !== (input.task.successCriteria ?? '')) {
		changes.push(
			input.nextSuccessCriteria ? 'updated success criteria' : 'cleared success criteria'
		);
	}

	if (input.nextReadyCondition !== (input.task.readyCondition ?? '')) {
		changes.push(input.nextReadyCondition ? 'updated ready condition' : 'cleared ready condition');
	}

	if (input.nextExpectedOutcome !== (input.task.expectedOutcome ?? '')) {
		changes.push(
			input.nextExpectedOutcome ? 'updated expected outcome' : 'cleared expected outcome'
		);
	}

	const currentDelegationPacket = input.task.delegationPacket ?? null;
	const nextDelegationPacket = input.nextDelegationPacket ?? null;

	if (JSON.stringify(currentDelegationPacket) !== JSON.stringify(nextDelegationPacket)) {
		changes.push(
			hasDelegationPacketContent(nextDelegationPacket)
				? hasDelegationPacketContent(currentDelegationPacket)
					? 'updated delegation packet'
					: 'added delegation packet'
				: 'cleared delegation packet'
		);
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

	if (input.nextPriority !== input.task.priority) {
		changes.push(`set priority to ${formatPriorityLabel(input.nextPriority)}`);
	}

	if (input.nextRiskLevel !== input.task.riskLevel) {
		changes.push(`set risk level to ${formatTaskRiskLevelLabel(input.nextRiskLevel)}`);
	}

	if (input.nextApprovalMode !== input.task.approvalMode) {
		changes.push(`set approval mode to ${formatTaskApprovalModeLabel(input.nextApprovalMode)}`);
	}

	if ((input.nextRequiredThreadSandbox ?? null) !== (input.task.requiredThreadSandbox ?? null)) {
		changes.push(
			input.nextRequiredThreadSandbox
				? `required the ${formatAgentSandboxLabel(input.nextRequiredThreadSandbox)} sandbox`
				: 'cleared the task sandbox requirement'
		);
	}

	if (input.nextRequiresReview !== input.task.requiresReview) {
		changes.push(
			input.nextRequiresReview ? 'required review before completion' : 'made review optional'
		);
	}

	if (input.nextDesiredRoleId !== input.task.desiredRoleId) {
		changes.push(
			input.nextDesiredRoleId
				? `set desired role to ${input.nextDesiredRoleName ?? input.nextDesiredRoleId}`
				: input.task.desiredRoleId
					? `cleared the desired role from ${input.currentDesiredRoleName ?? input.task.desiredRoleId}`
					: 'cleared the desired role'
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

	if (input.nextBlockedReason !== input.task.blockedReason) {
		changes.push(
			input.nextBlockedReason
				? `updated the blocked reason to "${input.nextBlockedReason}"`
				: 'cleared the blocked reason'
		);
	}

	if (currentDependencyIds.join('|') !== nextDependencyIds.join('|')) {
		changes.push(
			nextDependencyIds.length > 0
				? `set dependencies to ${joinQuotedLabels(input.nextDependencyTaskTitles)}`
				: input.task.dependencyTaskIds.length > 0
					? `cleared dependencies from ${joinQuotedLabels(input.currentDependencyTaskTitles)}`
					: 'cleared dependencies'
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
		area: Goal['area'];
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
				area: goal.area
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
			area: goal.area
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
	statusThread: Awaited<ReturnType<typeof getAgentThread>> | null;
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

function selectTaskThreadForSandbox(
	thread: Awaited<ReturnType<typeof getAgentThread>> | null,
	requiredSandbox: AgentSandbox | null
) {
	if (!thread) {
		return null;
	}

	if (requiredSandbox && thread.sandbox !== requiredSandbox) {
		return null;
	}

	return thread;
}

async function buildTaskLaunchPlan(
	current: Awaited<ReturnType<typeof loadControlPlane>>,
	task: Task,
	input: ReturnType<typeof readTaskForm>
) {
	const effectiveName = input.name || task.title;
	const effectiveInstructions = input.instructions || task.summary;
	const effectiveSuccessCriteria = input.successCriteria;
	const effectiveReadyCondition = input.readyCondition;
	const effectiveExpectedOutcome = input.expectedOutcome;
	const effectiveDelegationPacket =
		task.parentTaskId && input.hasDelegationPacketFields
			? {
					objective: input.delegationObjective,
					inputContext: input.delegationInputContext,
					expectedDeliverable: input.delegationExpectedDeliverable,
					doneCondition: input.delegationDoneCondition,
					integrationNotes: input.delegationIntegrationNotes
				}
			: (task.delegationPacket ?? null);
	const effectiveProjectId = input.projectId || task.projectId;
	const effectivePriority = input.hasPriority ? input.priority : task.priority;
	const effectiveRiskLevel = input.hasRiskLevel ? input.riskLevel : task.riskLevel;
	const effectiveApprovalMode = input.hasApprovalMode ? input.approvalMode : task.approvalMode;
	const effectiveRequiredThreadSandbox = input.hasRequiredThreadSandbox
		? input.requiredThreadSandbox
		: (task.requiredThreadSandbox ?? null);
	const effectiveRequiresReview = input.hasRequiresReview
		? input.requiresReview
		: task.requiresReview;
	const selectedGoal = input.goalId
		? (current.goals.find((candidate) => candidate.id === input.goalId) ?? null)
		: null;
	const effectiveGoalId = input.hasGoalId ? (selectedGoal?.id ?? '') : task.goalId;
	const selectedDesiredRole = input.desiredRoleId
		? (current.roles.find((candidate) => candidate.id === input.desiredRoleId) ?? null)
		: null;
	const effectiveDesiredRoleId =
		input.hasDesiredRoleId && (input.desiredRoleId === '' || selectedDesiredRole)
			? input.desiredRoleId
			: task.desiredRoleId;
	const assigneeWorker = input.assigneeWorkerId
		? current.workers.find((candidate) => candidate.id === input.assigneeWorkerId)
		: null;
	const effectiveWorker =
		(input.hasAssigneeWorkerId ? assigneeWorker : null) ??
		(task.assigneeWorkerId
			? (current.workers.find((candidate) => candidate.id === task.assigneeWorkerId) ?? null)
			: null);
	const effectiveRequiredCapabilityNames = input.hasRequiredCapabilityNames
		? input.requiredCapabilityNames
		: (task.requiredCapabilityNames ?? []);
	const effectiveRequiredToolNames = input.hasRequiredToolNames
		? input.requiredToolNames
		: (task.requiredToolNames ?? []);
	const effectiveDependencyTaskIds = input.hasDependencyTaskSelection
		? input.dependencyTaskIds
		: task.dependencyTaskIds;
	const effectiveTargetDate = input.hasTargetDate
		? input.targetDate || null
		: (task.targetDate ?? null);
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

	if (input.hasDesiredRoleId && input.desiredRoleId && !selectedDesiredRole) {
		throw new TaskActionError(400, 'Desired role not found.');
	}

	const invalidDependencyIds = effectiveDependencyTaskIds.filter(
		(dependencyTaskId) =>
			dependencyTaskId === task.id ||
			!current.tasks.some((candidate) => candidate.id === dependencyTaskId)
	);

	if (invalidDependencyIds.length > 0) {
		throw new TaskActionError(400, 'One or more selected dependencies are no longer available.');
	}

	if (effectiveTargetDate && !isValidDate(effectiveTargetDate)) {
		throw new TaskActionError(400, 'Target date must use YYYY-MM-DD format.');
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
		successCriteria: effectiveSuccessCriteria,
		readyCondition: effectiveReadyCondition,
		expectedOutcome: effectiveExpectedOutcome,
		delegationPacket: effectiveDelegationPacket,
		projectName: project.name,
		projectRootFolder: project.projectRootFolder,
		defaultArtifactRoot: project.defaultArtifactRoot,
		additionalWritableRoots: project.additionalWritableRoots ?? [],
		availableSkillNames: listInstalledCodexSkills(project.projectRootFolder)
			.slice(0, 12)
			.map((skill) => skill.id),
		relevantKnowledgeItems: taskKnowledge
	});
	const provider = selectExecutionProvider(current, effectiveWorker);
	const sandbox = resolveThreadSandbox({
		task: { requiredThreadSandbox: effectiveRequiredThreadSandbox },
		worker: effectiveWorker,
		project,
		provider
	});
	const assignedThread = task.agentThreadId ? await getAgentThread(task.agentThreadId) : null;
	const latestRun = task.latestRunId
		? (current.runs.find((run) => run.id === task.latestRunId) ?? null)
		: null;
	const latestRunThread =
		latestRun?.agentThreadId && latestRun.agentThreadId !== task.agentThreadId
			? await getAgentThread(latestRun.agentThreadId)
			: null;
	const threadContext = selectProjectTaskThreadContext(project, {
		assignedThread: selectTaskThreadForSandbox(assignedThread, effectiveRequiredThreadSandbox),
		latestRunThread: selectTaskThreadForSandbox(latestRunThread, effectiveRequiredThreadSandbox)
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
		additionalWritableRoots: project.additionalWritableRoots ?? [],
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
		effectiveSuccessCriteria,
		effectiveReadyCondition,
		effectiveExpectedOutcome,
		effectiveDelegationPacket,
		effectivePriority,
		effectiveRiskLevel,
		effectiveApprovalMode,
		effectiveRequiredThreadSandbox,
		effectiveRequiresReview,
		effectiveDesiredRoleId,
		assigneeWorker,
		effectiveWorker,
		effectiveRequiredCapabilityNames,
		effectiveRequiredToolNames,
		effectiveDependencyTaskIds,
		effectiveTargetDate,
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
	let agentThreadId =
		plan.compatibleAssignedThread?.id ?? plan.compatibleLatestRunThread?.id ?? null;
	let codexThreadId =
		(plan.compatibleAssignedThread ?? plan.compatibleLatestRunThread)?.threadId ?? null;
	let reusedThreadMode: 'assigned' | 'latest' | null = null;

	if (plan.compatibleAssignedThread?.canResume) {
		await sendAgentThreadMessage(plan.compatibleAssignedThread.id, plan.prompt);
		agentThreadId = plan.compatibleAssignedThread.id;
		codexThreadId = plan.compatibleAssignedThread.threadId;
		reusedThreadMode = 'assigned';
	} else if (!plan.compatibleAssignedThread && plan.compatibleLatestRunThread?.canResume) {
		await sendAgentThreadMessage(plan.compatibleLatestRunThread.id, plan.prompt);
		agentThreadId = plan.compatibleLatestRunThread.id;
		codexThreadId = plan.compatibleLatestRunThread.threadId;
		reusedThreadMode = 'latest';
	} else {
		const session = await startAgentThread({
			name: buildTaskThreadName({
				projectName: plan.project.name,
				taskName: plan.effectiveName,
				taskId: plan.task.id
			}),
			cwd: plan.project.projectRootFolder,
			additionalWritableRoots: plan.project.additionalWritableRoots ?? [],
			prompt: plan.prompt,
			sandbox: resolveThreadSandbox({
				task: { requiredThreadSandbox: plan.effectiveRequiredThreadSandbox },
				worker: plan.effectiveWorker,
				project: plan.project,
				provider: plan.provider
			}),
			model: null
		});

		agentThreadId = session.agentThreadId;
		codexThreadId = null;
	}

	const now = new Date().toISOString();
	const providerId = plan.provider?.id ?? null;
	const run = createRun({
		taskId,
		workerId: plan.effectiveWorker?.id ?? null,
		providerId,
		status: 'running',
		startedAt: now,
		threadId: codexThreadId,
		agentThreadId,
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
						successCriteria: plan.effectiveSuccessCriteria,
						readyCondition: plan.effectiveReadyCondition,
						expectedOutcome: plan.effectiveExpectedOutcome,
						projectId: plan.project.id,
						goalId: plan.effectiveGoalId,
						assigneeWorkerId: plan.assigneeWorker?.id ?? candidate.assigneeWorkerId,
						priority: plan.effectivePriority,
						riskLevel: plan.effectiveRiskLevel,
						approvalMode: plan.effectiveApprovalMode,
						requiredThreadSandbox: plan.effectiveRequiredThreadSandbox,
						requiresReview: plan.effectiveRequiresReview,
						desiredRoleId: plan.effectiveDesiredRoleId,
						requiredCapabilityNames: plan.effectiveRequiredCapabilityNames,
						requiredToolNames: plan.effectiveRequiredToolNames,
						blockedReason: '',
						dependencyTaskIds: plan.effectiveDependencyTaskIds,
						targetDate: plan.effectiveTargetDate,
						agentThreadId,
						delegationAcceptance: null,
						artifactPath:
							candidate.artifactPath ||
							plan.project.defaultArtifactRoot ||
							plan.project.projectRootFolder ||
							'',
						status: 'in_progress',
						updatedAt: now
					}
				: candidate
		)
	}));

	return {
		threadId: agentThreadId
	};
}

export const load: PageServerLoad = async ({ params }) => {
	const controlPlanePromise = loadControlPlane();
	const [data, sessions] = await Promise.all([
		controlPlanePromise,
		listAgentThreads({ includeArchived: true, controlPlane: controlPlanePromise })
	]);
	const task = data.tasks.find((candidate) => candidate.id === params.taskId);

	if (!task) {
		throw error(404, 'Task not found.');
	}

	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const workerMap = new Map(data.workers.map((worker) => [worker.id, worker]));
	const providerMap = new Map(data.providers.map((provider) => [provider.id, provider]));
	const goalMap = new Map(data.goals.map((goal) => [goal.id, goal]));
	const roleMap = new Map(data.roles.map((role) => [role.id, role]));
	const dependencyTaskIds = new Set(task.dependencyTaskIds);
	const parentTask = task.parentTaskId
		? (data.tasks.find((candidate) => candidate.id === task.parentTaskId) ?? null)
		: null;
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
			status: dependency.status,
			projectId: dependency.projectId,
			projectName: projectMap.get(dependency.projectId)?.name ?? 'No project'
		}))
		.sort((a, b) => a.title.localeCompare(b.title));
	const childTasks = data.tasks
		.filter((candidate) => candidate.parentTaskId === task.id)
		.map((childTask) => {
			const integrationStatus = childTask.delegationAcceptance
				? 'accepted'
				: childTask.status === 'done'
					? 'pending'
					: 'not_ready';

			return {
				id: childTask.id,
				title: childTask.title,
				status: childTask.status,
				projectId: childTask.projectId,
				projectName: projectMap.get(childTask.projectId)?.name ?? 'No project',
				updatedAtLabel: formatRelativeTime(childTask.updatedAt),
				delegationPacket: childTask.delegationPacket ?? null,
				delegationAcceptance: childTask.delegationAcceptance
					? {
							...childTask.delegationAcceptance,
							acceptedAtLabel: formatRelativeTime(childTask.delegationAcceptance.acceptedAt)
						}
					: null,
				integrationStatus
			};
		})
		.sort((left, right) => left.title.localeCompare(right.title));
	const childTaskStatusCounts = childTasks.reduce(
		(counts, childTask) => {
			counts[childTask.status] += 1;
			return counts;
		},
		{
			in_draft: 0,
			ready: 0,
			in_progress: 0,
			review: 0,
			blocked: 0,
			done: 0
		}
	);
	const childTaskRollup =
		childTasks.length > 0
			? (() => {
					const total = childTasks.length;
					const blockedCount = childTaskStatusCounts.blocked;
					const reviewCount = childTaskStatusCounts.review;
					const doneCount = childTaskStatusCounts.done;
					const inProgressCount = childTaskStatusCounts.in_progress;
					const readyCount = childTaskStatusCounts.ready;
					const acceptedCount = childTasks.filter(
						(childTask) => childTask.integrationStatus === 'accepted'
					).length;
					const pendingIntegrationCount = childTasks.filter(
						(childTask) => childTask.integrationStatus === 'pending'
					).length;
					const rollupStatus =
						blockedCount > 0
							? 'blocked'
							: reviewCount > 0
								? 'review'
								: pendingIntegrationCount > 0
									? 'review'
									: acceptedCount === total
										? 'done'
										: inProgressCount > 0
											? 'in_progress'
											: 'ready';
					const summary =
						rollupStatus === 'blocked'
							? `${blockedCount} delegated ${blockedCount === 1 ? 'task is' : 'tasks are'} blocked, so parent integration is blocked.`
							: rollupStatus === 'review'
								? pendingIntegrationCount > 0
									? `${pendingIntegrationCount} completed child ${pendingIntegrationCount === 1 ? 'handoff is' : 'handoffs are'} waiting on parent acceptance.`
									: `${reviewCount} delegated ${reviewCount === 1 ? 'task is' : 'tasks are'} waiting on review before integration can finish.`
								: rollupStatus === 'done'
									? 'All delegated subtasks have been accepted by the parent task.'
									: rollupStatus === 'in_progress'
										? `${inProgressCount} delegated ${inProgressCount === 1 ? 'task is' : 'tasks are'} actively moving.`
										: `${readyCount} delegated ${readyCount === 1 ? 'task is' : 'tasks are'} queued but not started.`;

					return {
						status: rollupStatus,
						total,
						doneCount,
						blockedCount,
						reviewCount,
						inProgressCount,
						readyCount,
						acceptedCount,
						pendingIntegrationCount,
						summary
					};
				})()
			: null;
	const availableDependencyTasks = data.tasks
		.filter((candidate) => candidate.id !== task.id)
		.map((candidate) => ({
			id: candidate.id,
			title: candidate.title,
			status: candidate.status,
			projectId: candidate.projectId,
			projectName: projectMap.get(candidate.projectId)?.name ?? 'No project',
			isSelected: dependencyTaskIds.has(candidate.id)
		}))
		.sort((left, right) => {
			if (left.isSelected !== right.isSelected) {
				return left.isSelected ? -1 : 1;
			}

			const projectComparison = left.projectName.localeCompare(right.projectName);

			return projectComparison !== 0 ? projectComparison : left.title.localeCompare(right.title);
		});
	const openReview = getOpenReviewForTask(data, task.id);
	const pendingApproval = getPendingApprovalForTask(data, task.id);
	const project = projectMap.get(task.projectId) ?? null;
	const artifactRoot = getTaskAttachmentRoot(task, project);
	const sessionMap = new Map(sessions.map((session) => [session.id, session]));
	const assignedThread = task.agentThreadId
		? (sessions.find((session) => session.id === task.agentThreadId) ?? null)
		: null;
	const latestRun = task.latestRunId
		? (relatedRuns.find((run) => run.id === task.latestRunId) ?? null)
		: null;
	const activeRun = relatedRuns.find((run) => ACTIVE_TASK_RUN_STATUSES.has(run.status)) ?? null;
	const latestRunThread = latestRun?.agentThreadId
		? (sessionMap.get(latestRun.agentThreadId) ?? null)
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
		threads: threadScopedSessions
	});
	const availableSkills = listInstalledCodexSkills(project?.projectRootFolder ?? '');
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
	const [retrievedKnowledgeItems, artifactBrowser] = await Promise.all([
		loadTaskRetrievedKnowledge(task, project),
		buildArtifactBrowser({
			rootPath: artifactRoot,
			knownOutputs: task.attachments.map((attachment) => ({
				label: attachment.name,
				path: attachment.path,
				href: `/api/tasks/${task.id}/attachments/${attachment.id}`,
				description: `Attached task file${attachment.contentType ? ` · ${attachment.contentType}` : ''}`
			}))
		})
	]);

	return {
		task: {
			...task,
			delegationAcceptance: task.delegationAcceptance
				? {
						...task.delegationAcceptance,
						acceptedAtLabel: formatRelativeTime(task.delegationAcceptance.acceptedAt)
					}
				: null,
			projectName: projectMap.get(task.projectId)?.name ?? 'No project',
			goalName: task.goalId ? (goalMap.get(task.goalId)?.name ?? 'Unknown goal') : '',
			desiredRoleName: task.desiredRoleId
				? (roleMap.get(task.desiredRoleId)?.name ?? task.desiredRoleId)
				: '',
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
		parentTask: parentTask
			? {
					id: parentTask.id,
					title: parentTask.title,
					status: parentTask.status,
					projectId: parentTask.projectId,
					projectName: projectMap.get(parentTask.projectId)?.name ?? 'No project'
				}
			: null,
		childTasks,
		childTaskRollup,
		stalledRecovery,
		attachmentRoot: artifactRoot,
		availableSkills: {
			totalCount: availableSkills.length,
			globalCount: availableSkills.filter((skill) => skill.global).length,
			projectCount: availableSkills.filter((skill) => skill.project).length,
			previewSkills: availableSkills.slice(0, 8)
		},
		artifactBrowser,
		project,
		retrievedKnowledgeItems,
		projects: [...data.projects].sort((a, b) => a.name.localeCompare(b.name)),
		goals: buildTaskGoalOptions(data.goals),
		roles: [...data.roles].sort((a, b) => a.name.localeCompare(b.name)),
		workers: [...data.workers].sort((a, b) => a.name.localeCompare(b.name)),
		assignmentSuggestions,
		recentDecisions,
		statusOptions: TASK_STATUS_OPTIONS,
		relatedRuns,
		dependencyTasks,
		availableDependencyTasks,
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
			successCriteria,
			readyCondition,
			expectedOutcome,
			delegationObjective,
			delegationInputContext,
			delegationExpectedDeliverable,
			delegationDoneCondition,
			delegationIntegrationNotes,
			hasDelegationPacketFields,
			projectId,
			goalId,
			hasGoalId,
			assigneeWorkerId,
			hasAssigneeWorkerId,
			priority,
			hasPriority,
			riskLevel,
			hasRiskLevel,
			approvalMode,
			hasApprovalMode,
			requiredThreadSandbox,
			hasRequiredThreadSandbox,
			requiresReview,
			hasRequiresReview,
			desiredRoleId,
			hasDesiredRoleId,
			requiredCapabilityNames,
			hasRequiredCapabilityNames,
			requiredToolNames,
			hasRequiredToolNames,
			blockedReason,
			hasBlockedReason,
			dependencyTaskIds,
			hasDependencyTaskSelection,
			targetDate,
			hasTargetDate
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
		const desiredRole = desiredRoleId
			? (current.roles.find((candidate) => candidate.id === desiredRoleId) ?? null)
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

		if (
			hasDesiredRoleId &&
			desiredRoleId &&
			!desiredRole &&
			desiredRoleId !== existingTask.desiredRoleId
		) {
			return fail(400, { message: 'Desired role not found.' });
		}

		const invalidDependencyTaskIds = dependencyTaskIds.filter(
			(dependencyTaskId) =>
				dependencyTaskId === params.taskId ||
				!current.tasks.some((candidate) => candidate.id === dependencyTaskId)
		);

		if (invalidDependencyTaskIds.length > 0) {
			return fail(400, { message: 'One or more selected dependencies are no longer available.' });
		}

		if (existingTask.parentTaskId && hasDelegationPacketFields && !delegationObjective) {
			return fail(400, { message: 'Delegated child tasks need a clear delegation objective.' });
		}

		if (existingTask.parentTaskId && hasDelegationPacketFields && !delegationDoneCondition) {
			return fail(400, { message: 'Delegated child tasks need a done condition for handoff.' });
		}

		const nextTitle = name;
		const nextInstructions = instructions;
		const nextSuccessCriteria = successCriteria;
		const nextReadyCondition = readyCondition;
		const nextExpectedOutcome = expectedOutcome;
		const nextDelegationPacket =
			existingTask.parentTaskId && hasDelegationPacketFields
				? {
						objective: delegationObjective,
						inputContext: delegationInputContext,
						expectedDeliverable: delegationExpectedDeliverable,
						doneCondition: delegationDoneCondition,
						integrationNotes: delegationIntegrationNotes
					}
				: (existingTask.delegationPacket ?? null);
		const nextGoalId = hasGoalId ? (goal?.id ?? '') : existingTask.goalId;
		const nextStatus = status;
		const nextAssigneeWorker = hasAssigneeWorkerId
			? (assigneeWorker ?? null)
			: existingTask.assigneeWorkerId
				? (current.workers.find((candidate) => candidate.id === existingTask.assigneeWorkerId) ??
					null)
				: null;
		const nextPriority = hasPriority ? priority : existingTask.priority;
		const nextRiskLevel = hasRiskLevel ? riskLevel : existingTask.riskLevel;
		const nextApprovalMode = hasApprovalMode ? approvalMode : existingTask.approvalMode;
		const nextRequiredThreadSandbox = hasRequiredThreadSandbox
			? requiredThreadSandbox
			: (existingTask.requiredThreadSandbox ?? null);
		const nextRequiresReview = hasRequiresReview ? requiresReview : existingTask.requiresReview;
		const nextDesiredRoleId = hasDesiredRoleId ? desiredRoleId : existingTask.desiredRoleId;
		const nextRequiredCapabilityNames = hasRequiredCapabilityNames
			? requiredCapabilityNames
			: (existingTask.requiredCapabilityNames ?? []);
		const nextRequiredToolNames = hasRequiredToolNames
			? requiredToolNames
			: (existingTask.requiredToolNames ?? []);
		const nextBlockedReason = hasBlockedReason ? blockedReason : existingTask.blockedReason;
		const nextDependencyTaskIds = hasDependencyTaskSelection
			? dependencyTaskIds
			: existingTask.dependencyTaskIds;
		const nextTargetDate = hasTargetDate ? targetDate || null : (existingTask.targetDate ?? null);
		const dependencyTaskNameMap = new Map(current.tasks.map((task) => [task.id, task.title]));
		const decisionSummary = buildTaskPlanDecisionSummary({
			task: existingTask,
			nextTitle,
			nextSummary: nextInstructions,
			nextSuccessCriteria,
			nextReadyCondition,
			nextExpectedOutcome,
			nextDelegationPacket,
			nextProject: project,
			nextGoalId,
			nextGoalName: goal?.name ?? null,
			currentGoalName: existingTask.goalId
				? (current.goals.find((candidate) => candidate.id === existingTask.goalId)?.name ?? null)
				: null,
			nextStatus,
			nextAssigneeWorker,
			nextPriority,
			nextRiskLevel,
			nextApprovalMode,
			nextRequiredThreadSandbox,
			nextRequiresReview,
			nextDesiredRoleId,
			nextDesiredRoleName: nextDesiredRoleId
				? (current.roles.find((candidate) => candidate.id === nextDesiredRoleId)?.name ??
					nextDesiredRoleId)
				: null,
			currentDesiredRoleName: existingTask.desiredRoleId
				? (current.roles.find((candidate) => candidate.id === existingTask.desiredRoleId)?.name ??
					existingTask.desiredRoleId)
				: null,
			nextRequiredCapabilityNames,
			nextRequiredToolNames,
			nextBlockedReason,
			nextDependencyTaskIds,
			nextDependencyTaskTitles: normalizeIdList(nextDependencyTaskIds).map(
				(dependencyTaskId) => dependencyTaskNameMap.get(dependencyTaskId) ?? dependencyTaskId
			),
			currentDependencyTaskTitles: normalizeIdList(existingTask.dependencyTaskIds ?? []).map(
				(dependencyTaskId) => dependencyTaskNameMap.get(dependencyTaskId) ?? dependencyTaskId
			),
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
					successCriteria: nextSuccessCriteria,
					readyCondition: nextReadyCondition,
					expectedOutcome: nextExpectedOutcome,
					delegationPacket: nextDelegationPacket,
					projectId: project.id,
					goalId: nextGoalId,
					status: nextStatus,
					assigneeWorkerId: nextAssigneeWorker?.id ?? null,
					priority: nextPriority,
					riskLevel: nextRiskLevel,
					approvalMode: nextApprovalMode,
					requiredThreadSandbox: nextRequiredThreadSandbox,
					requiresReview: nextRequiresReview,
					desiredRoleId: nextDesiredRoleId,
					requiredCapabilityNames: nextRequiredCapabilityNames,
					requiredToolNames: nextRequiredToolNames,
					blockedReason: nextBlockedReason,
					dependencyTaskIds: nextDependencyTaskIds,
					targetDate: nextTargetDate,
					delegationAcceptance:
						task.parentTaskId && decisionSummary ? null : (task.delegationAcceptance ?? null),
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
		const agentThreadId = form.get('agentThreadId')?.toString().trim() ?? '';
		const current = await loadControlPlane();
		const task = current.tasks.find((candidate) => candidate.id === params.taskId);

		if (!task) {
			return fail(404, { message: 'Task not found.' });
		}

		if (agentThreadId) {
			const session = await getAgentThread(agentThreadId);

			if (!session) {
				return fail(400, { message: 'Selected work thread was not found.' });
			}
		}

		const now = new Date().toISOString();
		const decisionSummary =
			(agentThreadId || null) === task.agentThreadId
				? null
				: agentThreadId
					? `Updated task thread assignment to ${agentThreadId}.`
					: 'Cleared the task thread assignment.';

		await updateControlPlane((data) => ({
			...data,
			tasks: data.tasks.map((candidate) =>
				candidate.id === params.taskId
					? {
							...candidate,
							agentThreadId: agentThreadId || null,
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

	acceptChildHandoff: async ({ params, request }) => {
		const form = await request.formData();
		const childTaskId = form.get('childTaskId')?.toString().trim() ?? '';
		const current = await loadControlPlane();
		const parentTask = current.tasks.find((candidate) => candidate.id === params.taskId);
		const childTask = current.tasks.find((candidate) => candidate.id === childTaskId);

		if (!parentTask) {
			return fail(404, { message: 'Parent task not found.' });
		}

		if (!childTask || childTask.parentTaskId !== parentTask.id) {
			return fail(404, { message: 'Delegated child task not found.' });
		}

		if (childTask.status !== 'done') {
			return fail(409, { message: 'Only completed child tasks can be accepted into the parent.' });
		}

		const now = new Date().toISOString();
		const summary =
			form.get('summary')?.toString().trim() ||
			`Accepted child handoff into parent task "${parentTask.title}".`;

		await updateControlPlane((data) => ({
			...data,
			tasks: data.tasks.map((candidate) =>
				candidate.id === childTask.id
					? {
							...candidate,
							delegationAcceptance: {
								summary,
								acceptedAt: now
							},
							updatedAt: now
						}
					: candidate
			),
			decisions: [
				createDecision({
					taskId: childTask.id,
					decisionType: 'delegation_handoff_accepted',
					summary,
					createdAt: now
				}),
				...(data.decisions ?? [])
			]
		}));

		return {
			ok: true,
			successAction: 'acceptChildHandoff',
			taskId: params.taskId,
			childTaskId
		};
	},

	requestChildHandoffChanges: async ({ params, request }) => {
		const form = await request.formData();
		const childTaskId = form.get('childTaskId')?.toString().trim() ?? '';
		const current = await loadControlPlane();
		const parentTask = current.tasks.find((candidate) => candidate.id === params.taskId);
		const childTask = current.tasks.find((candidate) => candidate.id === childTaskId);

		if (!parentTask) {
			return fail(404, { message: 'Parent task not found.' });
		}

		if (!childTask || childTask.parentTaskId !== parentTask.id) {
			return fail(404, { message: 'Delegated child task not found.' });
		}

		const now = new Date().toISOString();
		const blockedReason =
			form.get('summary')?.toString().trim() ||
			'Parent task requested follow-up before accepting this child handoff.';

		await updateControlPlane((data) => ({
			...data,
			tasks: data.tasks.map((candidate) =>
				candidate.id === childTask.id
					? {
							...candidate,
							status: 'blocked',
							blockedReason,
							delegationAcceptance: null,
							updatedAt: now
						}
					: candidate
			),
			decisions: [
				createDecision({
					taskId: childTask.id,
					decisionType: 'delegation_handoff_changes_requested',
					summary: blockedReason,
					createdAt: now
				}),
				...(data.decisions ?? [])
			]
		}));

		return {
			ok: true,
			successAction: 'requestChildHandoffChanges',
			taskId: params.taskId,
			childTaskId
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
			launchedSessionId = launchResult.threadId;
		} catch (error) {
			return fail(400, {
				message: getActionErrorMessage(error, 'Could not start a work thread for this task.')
			});
		}

		return {
			ok: true,
			successAction: 'launchTaskSession',
			taskId: params.taskId,
			threadId: launchedSessionId
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
		const assignedThread = task.agentThreadId ? await getAgentThread(task.agentThreadId) : null;
		const activeRunThread = activeTaskRun?.agentThreadId
			? await getAgentThread(activeTaskRun.agentThreadId)
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

		if (!activeTaskRun.agentThreadId) {
			return fail(409, {
				message: 'The active run is not linked to a recoverable work thread.'
			});
		}

		try {
			await recoverAgentThread(activeTaskRun.agentThreadId);
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
			launchedSessionId = launchResult.threadId;
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
			threadId: launchedSessionId
		};
	},

	approveReview: async ({ params }) => {
		try {
			return await approveTaskReview(params.taskId, 'task detail page');
		} catch (caughtError) {
			if (caughtError instanceof TaskGovernanceActionError) {
				return fail(caughtError.status, { message: caughtError.message });
			}

			throw caughtError;
		}
	},

	requestChanges: async ({ params }) => {
		try {
			return await requestTaskReviewChanges(params.taskId, 'task detail page');
		} catch (caughtError) {
			if (caughtError instanceof TaskGovernanceActionError) {
				return fail(caughtError.status, { message: caughtError.message });
			}

			throw caughtError;
		}
	},

	approveApproval: async ({ params }) => {
		try {
			return await approveTaskApproval(params.taskId, 'task detail page');
		} catch (caughtError) {
			if (caughtError instanceof TaskGovernanceActionError) {
				return fail(caughtError.status, { message: caughtError.message });
			}

			throw caughtError;
		}
	},

	rejectApproval: async ({ params }) => {
		try {
			return await rejectTaskApproval(params.taskId);
		} catch (caughtError) {
			if (caughtError instanceof TaskGovernanceActionError) {
				return fail(caughtError.status, { message: caughtError.message });
			}

			throw caughtError;
		}
	},

	deleteTask: async ({ params }) => {
		const current = await loadControlPlane();
		const task = current.tasks.find((candidate) => candidate.id === params.taskId);

		if (!task) {
			return fail(404, { message: 'Task not found.' });
		}

		const relatedThreadIds = [
			...new Set(
				current.runs
					.filter((run) => run.taskId === params.taskId)
					.map((run) => run.agentThreadId)
					.filter((threadId): threadId is string => Boolean(threadId))
			)
		];

		await Promise.all(relatedThreadIds.map((threadId) => cancelAgentThread(threadId)));
		await updateControlPlane((data) => removeTaskFromControlPlane(data, params.taskId));

		throw redirect(303, '/app/tasks?deleted=1');
	}
};
