import {
	createRun,
	getPendingApprovalForTask,
	resolveThreadSandbox,
	selectExecutionProvider
} from '$lib/server/control-plane';
import { canonicalizeExecutionRequirementNames } from '$lib/execution-requirements';
import { updateTaskRecord } from '$lib/server/control-plane-repository';
import {
	getAgentThread,
	sendAgentThreadMessage,
	startAgentThread
} from '$lib/server/agent-threads';
import { listInstalledCodexSkills } from '$lib/server/codex-skills';
import { buildExecutionRequirementInventory } from '$lib/server/execution-requirement-inventory';
import { loadRelevantSelfImprovementKnowledgeItems } from '$lib/server/self-improvement-knowledge';
import {
	resolveTaskRolePromptContext,
	type TaskRolePromptContext
} from '$lib/server/task-role-context';
import { selectProjectTaskThreadContext } from '$lib/server/task-thread-compatibility';
import {
	buildTaskThreadName,
	buildTaskThreadPrompt,
	buildPromptDigest
} from '$lib/server/task-threads';
import {
	buildTaskExecutionContractStatus,
	getTaskLaunchContractBlockerMessage
} from '$lib/task-execution-contract';
import { getWorkspaceExecutionIssue } from '$lib/server/task-execution-workspace';
import {
	describeExecutionSurfaceTaskFit,
	getExecutionSurfaceAssignmentSuggestions
} from '$lib/server/execution-surface-api';
import { isValidTaskDate, type TaskDetailFormInput } from '$lib/server/task-form';
import type { ControlPlaneData, Project, Task, ExecutionSurface } from '$lib/types/control-plane';
import type { AgentSandbox } from '$lib/types/agent-thread';

export class TaskLaunchPlanError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

export type TaskLaunchPlan = {
	task: Task;
	project: Project;
	effectiveGoalId: string;
	effectiveName: string;
	effectiveInstructions: string;
	effectiveSuccessCriteria: string;
	effectiveReadyCondition: string;
	effectiveExpectedOutcome: string;
	effectiveDelegationPacket: Task['delegationPacket'] | null;
	effectivePriority: Task['priority'];
	effectiveRiskLevel: Task['riskLevel'];
	effectiveApprovalMode: Task['approvalMode'];
	effectiveRequiredThreadSandbox: AgentSandbox | null;
	effectiveRequiresReview: boolean;
	effectiveDesiredRoleId: string;
	effectiveRole: TaskRolePromptContext;
	assignedExecutionSurface: ExecutionSurface | null;
	effectiveExecutionSurface: ExecutionSurface | null;
	effectiveRequiredPromptSkillNames: string[];
	effectiveRequiredCapabilityNames: string[];
	effectiveRequiredToolNames: string[];
	effectiveDependencyTaskIds: string[];
	effectiveTargetDate: string | null;
	provider: ControlPlaneData['providers'][number] | null;
	prompt: string;
	retrievedKnowledgeItems: Awaited<ReturnType<typeof loadRelevantSelfImprovementKnowledgeItems>>;
	compatibleAssignedThread: Awaited<ReturnType<typeof getAgentThread>> | null;
	compatibleLatestRunThread: Awaited<ReturnType<typeof getAgentThread>> | null;
};

async function loadTaskRetrievedKnowledge(task: Task, project: Project | null) {
	return loadRelevantSelfImprovementKnowledgeItems({
		task,
		project,
		limit: 3
	});
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

export async function buildTaskLaunchPlan(
	current: ControlPlaneData,
	task: Task,
	input: TaskDetailFormInput
): Promise<TaskLaunchPlan> {
	const effectiveName = input.name || task.title;
	const effectiveInstructions = input.instructions || task.summary;
	const effectiveSuccessCriteria = input.hasSuccessCriteria
		? input.successCriteria
		: (task.successCriteria ?? '');
	const effectiveReadyCondition = input.hasReadyCondition
		? input.readyCondition
		: (task.readyCondition ?? '');
	const effectiveExpectedOutcome = input.hasExpectedOutcome
		? input.expectedOutcome
		: (task.expectedOutcome ?? '');
	const formDelegationPacket =
		task.parentTaskId && input.hasDelegationPacketFields
			? {
					objective: input.delegationObjective,
					inputContext: input.delegationInputContext,
					expectedDeliverable: input.delegationExpectedDeliverable,
					doneCondition: input.delegationDoneCondition,
					integrationNotes: input.delegationIntegrationNotes
				}
			: null;
	const effectiveDelegationPacket = hasDelegationPacketContent(formDelegationPacket)
		? formDelegationPacket
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
	const assignedExecutionSurface = input.assigneeExecutionSurfaceId
		? (current.executionSurfaces.find(
				(candidate) => candidate.id === input.assigneeExecutionSurfaceId
			) ?? null)
		: null;
	const directlyAssignedExecutionSurface =
		(input.hasAssigneeExecutionSurfaceId ? assignedExecutionSurface : null) ??
		(task.assigneeExecutionSurfaceId
			? (current.executionSurfaces.find(
					(candidate) => candidate.id === task.assigneeExecutionSurfaceId
				) ?? null)
			: null);
	const effectiveRequiredCapabilityNames = input.hasRequiredCapabilityNames
		? input.requiredCapabilityNames
		: (task.requiredCapabilityNames ?? []);
	const effectiveRequiredToolNames = input.hasRequiredToolNames
		? input.requiredToolNames
		: (task.requiredToolNames ?? []);
	const effectiveRequiredPromptSkillNames = input.hasRequiredPromptSkillNames
		? input.requiredPromptSkillNames
		: (task.requiredPromptSkillNames ?? []);
	const executionRequirementInventory = buildExecutionRequirementInventory(current);
	const projectForSkillInventory =
		current.projects.find((candidate) => candidate.id === effectiveProjectId) ?? null;
	const { role: effectiveRole, effectivePromptSkillNames: normalizedRequiredPromptSkillNames } =
		resolveTaskRolePromptContext({
			roles: current.roles,
			desiredRoleId: effectiveDesiredRoleId,
			projectRootFolder: projectForSkillInventory?.projectRootFolder ?? '',
			taskPromptSkillNames: effectiveRequiredPromptSkillNames
		});
	const normalizedRequiredCapabilityNames = canonicalizeExecutionRequirementNames(
		effectiveRequiredCapabilityNames,
		executionRequirementInventory.capabilityNames
	);
	const normalizedRequiredToolNames = canonicalizeExecutionRequirementNames(
		effectiveRequiredToolNames,
		executionRequirementInventory.toolNames
	);
	const taskForRouting = {
		...task,
		requiredPromptSkillNames: normalizedRequiredPromptSkillNames,
		desiredRoleId: effectiveDesiredRoleId,
		requiredCapabilityNames: normalizedRequiredCapabilityNames,
		requiredToolNames: normalizedRequiredToolNames,
		assigneeExecutionSurfaceId:
			directlyAssignedExecutionSurface?.id ?? task.assigneeExecutionSurfaceId ?? null
	};
	const assignmentSuggestions = getExecutionSurfaceAssignmentSuggestions(current, taskForRouting);
	const bestEligibleSuggestion = assignmentSuggestions.find((suggestion) => suggestion.eligible);
	const autoSelectedExecutionSurface =
		directlyAssignedExecutionSurface ||
		(normalizedRequiredCapabilityNames.length === 0 && normalizedRequiredToolNames.length === 0)
			? null
			: (current.executionSurfaces.find(
					(candidate) => candidate.id === bestEligibleSuggestion?.executionSurfaceId
				) ?? null);
	const effectiveExecutionSurface =
		directlyAssignedExecutionSurface ?? autoSelectedExecutionSurface;
	const effectiveDependencyTaskIds = input.hasDependencyTaskSelection
		? input.dependencyTaskIds
		: task.dependencyTaskIds;
	const effectiveTargetDate = input.hasTargetDate
		? input.targetDate || null
		: (task.targetDate ?? null);
	const project = current.projects.find((candidate) => candidate.id === effectiveProjectId) ?? null;

	if (!project) {
		throw new TaskLaunchPlanError(400, 'Task project not found.');
	}

	if (input.goalId && !selectedGoal) {
		throw new TaskLaunchPlanError(400, 'Goal not found.');
	}

	if (input.assigneeExecutionSurfaceId && !assignedExecutionSurface) {
		throw new TaskLaunchPlanError(400, 'Execution surface not found.');
	}

	if (input.hasDesiredRoleId && input.desiredRoleId && !selectedDesiredRole) {
		throw new TaskLaunchPlanError(400, 'Desired role not found.');
	}

	const invalidDependencyIds = effectiveDependencyTaskIds.filter(
		(dependencyTaskId) =>
			dependencyTaskId === task.id ||
			!current.tasks.some((candidate) => candidate.id === dependencyTaskId)
	);

	if (invalidDependencyIds.length > 0) {
		throw new TaskLaunchPlanError(
			400,
			'One or more selected dependencies are no longer available.'
		);
	}

	if (effectiveTargetDate && !isValidTaskDate(effectiveTargetDate)) {
		throw new TaskLaunchPlanError(400, 'Target date must use YYYY-MM-DD format.');
	}

	if (
		(normalizedRequiredCapabilityNames.length > 0 || normalizedRequiredToolNames.length > 0) &&
		!effectiveExecutionSurface
	) {
		const matchingSuggestions = assignmentSuggestions.filter(
			(suggestion) => suggestion.matchingRequirements
		);

		if (matchingSuggestions.length > 0) {
			const blockers: string[] = [];

			if (matchingSuggestions.some((suggestion) => !suggestion.withinAssignmentLimit)) {
				blockers.push('task capacity');
			}

			if (matchingSuggestions.some((suggestion) => !suggestion.withinConcurrencyLimit)) {
				blockers.push('concurrency limit');
			}

			if (matchingSuggestions.some((suggestion) => suggestion.status === 'offline')) {
				blockers.push('offline availability');
			}

			const blockerSummary = blockers.length > 0 ? ` (${[...new Set(blockers)].join(', ')})` : '';

			throw new TaskLaunchPlanError(
				409,
				`No matching execution surface can take this task right now${blockerSummary}.`
			);
		}

		throw new TaskLaunchPlanError(
			409,
			'No current execution surface covers this task’s declared capability and tool requirements.'
		);
	}

	const effectiveExecutionSurfaceFit = effectiveExecutionSurface
		? describeExecutionSurfaceTaskFit(
				current,
				effectiveExecutionSurface,
				effectiveExecutionSurface.id === taskForRouting.assigneeExecutionSurfaceId
					? taskForRouting
					: { ...taskForRouting, assigneeExecutionSurfaceId: effectiveExecutionSurface.id }
			)
		: null;

	if (effectiveExecutionSurfaceFit && !effectiveExecutionSurfaceFit.withinAssignmentLimit) {
		throw new TaskLaunchPlanError(
			409,
			`${effectiveExecutionSurfaceFit.executionSurfaceName} is already at its task capacity.`
		);
	}

	if (effectiveExecutionSurfaceFit && !effectiveExecutionSurfaceFit.withinConcurrencyLimit) {
		throw new TaskLaunchPlanError(
			409,
			`${effectiveExecutionSurfaceFit.executionSurfaceName} is already at its concurrency limit.`
		);
	}

	if (
		effectiveExecutionSurfaceFit &&
		(effectiveExecutionSurfaceFit.missingCapabilityNames.length > 0 ||
			effectiveExecutionSurfaceFit.missingToolNames.length > 0)
	) {
		const gaps = [
			effectiveExecutionSurfaceFit.missingCapabilityNames.length > 0
				? `capabilities: ${effectiveExecutionSurfaceFit.missingCapabilityNames.join(', ')}`
				: '',
			effectiveExecutionSurfaceFit.missingToolNames.length > 0
				? `tools: ${effectiveExecutionSurfaceFit.missingToolNames.join(', ')}`
				: ''
		].filter(Boolean);

		throw new TaskLaunchPlanError(
			409,
			`${effectiveExecutionSurfaceFit.executionSurfaceName} does not cover this task’s declared ${gaps.join(' · ')}.`
		);
	}

	if (!project.projectRootFolder) {
		throw new TaskLaunchPlanError(
			400,
			'This task cannot launch a work thread until its project has a root folder.'
		);
	}

	if (getPendingApprovalForTask(current, task.id)?.mode === 'before_run') {
		throw new TaskLaunchPlanError(
			409,
			'This task is waiting on before-run approval before a work thread can start.'
		);
	}

	const executionContract = buildTaskExecutionContractStatus({
		successCriteria: effectiveSuccessCriteria,
		readyCondition: effectiveReadyCondition,
		expectedOutcome: effectiveExpectedOutcome
	});
	const launchContractBlocker = getTaskLaunchContractBlockerMessage(executionContract);

	if (launchContractBlocker) {
		throw new TaskLaunchPlanError(409, launchContractBlocker);
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
		requiredPromptSkillNames: normalizedRequiredPromptSkillNames,
		preferredRole: effectiveRole,
		relevantKnowledgeItems: taskKnowledge
	});
	const provider = selectExecutionProvider(current, effectiveExecutionSurface);
	const sandbox = resolveThreadSandbox({
		task: { requiredThreadSandbox: effectiveRequiredThreadSandbox },
		executionSurface: effectiveExecutionSurface,
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
		throw new TaskLaunchPlanError(
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
		throw new TaskLaunchPlanError(400, workspaceIssue);
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
		effectiveRole,
		assignedExecutionSurface,
		effectiveExecutionSurface,
		effectiveRequiredPromptSkillNames: normalizedRequiredPromptSkillNames,
		effectiveRequiredCapabilityNames: normalizedRequiredCapabilityNames,
		effectiveRequiredToolNames: normalizedRequiredToolNames,
		effectiveDependencyTaskIds,
		effectiveTargetDate,
		provider,
		prompt,
		retrievedKnowledgeItems: taskKnowledge,
		compatibleAssignedThread,
		compatibleLatestRunThread: threadContext.latestRunThread
	};
}

export async function launchTaskFromPlan(
	taskId: string,
	plan: TaskLaunchPlan
): Promise<{ threadId: string | null }> {
	let agentThreadId =
		plan.compatibleAssignedThread?.id ?? plan.compatibleLatestRunThread?.id ?? null;
	let agentThreadRunId: string | null = null;
	let codexThreadId!: string | null;
	let reusedThreadMode: 'assigned' | 'latest' | null = null;

	if (plan.compatibleAssignedThread?.canResume) {
		const sendResult = await sendAgentThreadMessage(plan.compatibleAssignedThread.id, plan.prompt);
		agentThreadId = plan.compatibleAssignedThread.id;
		agentThreadRunId = sendResult.runId;
		codexThreadId = plan.compatibleAssignedThread.threadId;
		reusedThreadMode = 'assigned';
	} else if (!plan.compatibleAssignedThread && plan.compatibleLatestRunThread?.canResume) {
		const sendResult = await sendAgentThreadMessage(plan.compatibleLatestRunThread.id, plan.prompt);
		agentThreadId = plan.compatibleLatestRunThread.id;
		agentThreadRunId = sendResult.runId;
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
				executionSurface: plan.effectiveExecutionSurface,
				project: plan.project,
				provider: plan.provider
			}),
			model: null
		});

		agentThreadId = session.agentThreadId;
		agentThreadRunId = session.runId;
		codexThreadId = null;
	}

	const now = new Date().toISOString();
	const providerId = plan.provider?.id ?? null;
	const run = createRun({
		taskId,
		executionSurfaceId: plan.effectiveExecutionSurface?.id ?? null,
		assumedRoleId: plan.effectiveDesiredRoleId || null,
		providerId,
		agentThreadRunId,
		status: 'running',
		startedAt: now,
		threadId: codexThreadId,
		agentThreadId,
		modelUsed: plan.provider?.defaultModel?.trim() || null,
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

	const launchedTask = await updateTaskRecord({
		taskId,
		update: (candidate) => ({
			...candidate,
			title: plan.effectiveName,
			summary: plan.effectiveInstructions,
			successCriteria: plan.effectiveSuccessCriteria,
			readyCondition: plan.effectiveReadyCondition,
			expectedOutcome: plan.effectiveExpectedOutcome,
			projectId: plan.project.id,
			goalId: plan.effectiveGoalId,
			assigneeExecutionSurfaceId:
				plan.effectiveExecutionSurface?.id ?? candidate.assigneeExecutionSurfaceId,
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
		}),
		prependRuns: [run]
	});

	if (!launchedTask) {
		throw new TaskLaunchPlanError(404, 'Task not found.');
	}

	return {
		threadId: agentThreadId
	};
}
