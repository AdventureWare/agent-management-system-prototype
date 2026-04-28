import { formatAgentSandboxLabel, type AgentSandbox } from '$lib/types/agent-thread';
import {
	formatPriorityLabel,
	formatTaskApprovalModeLabel,
	formatTaskRiskLevelLabel,
	formatTaskStatusLabel,
	normalizeTaskBlockedReasonForStatus,
	type ControlPlaneData,
	type Goal,
	type Priority,
	type Project,
	type Task,
	type TaskApprovalMode,
	type TaskRiskLevel,
	type ExecutionSurface
} from '$lib/types/control-plane';
import type { TaskDetailFormInput } from './task-form';

type TaskPlanDecisionSummaryInput = {
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
	nextAssignedExecutionSurface: ExecutionSurface | null;
	nextPriority: Priority;
	nextRiskLevel: TaskRiskLevel;
	nextApprovalMode: TaskApprovalMode;
	nextRequiredThreadSandbox: AgentSandbox | null;
	nextRequiresReview: boolean;
	nextDesiredRoleId: string;
	nextDesiredRoleName: string | null;
	currentDesiredRoleName: string | null;
	nextRequiredPromptSkillNames: string[];
	nextRequiredCapabilityNames: string[];
	nextRequiredToolNames: string[];
	nextBlockedReason: string;
	nextDependencyTaskIds: string[];
	nextDependencyTaskTitles: string[];
	currentDependencyTaskTitles: string[];
	nextTargetDate: string | null;
};

export type ResolvedTaskPlanUpdate = {
	nextTitle: string;
	nextInstructions: string;
	nextSuccessCriteria: string;
	nextReadyCondition: string;
	nextExpectedOutcome: string;
	nextDelegationPacket: Task['delegationPacket'] | null;
	nextGoalId: string;
	nextStatus: Task['status'];
	nextAssignedExecutionSurface: ExecutionSurface | null;
	nextPriority: Priority;
	nextRiskLevel: TaskRiskLevel;
	nextApprovalMode: TaskApprovalMode;
	nextRequiredThreadSandbox: AgentSandbox | null;
	nextRequiresReview: boolean;
	nextDesiredRoleId: string;
	nextRequiredPromptSkillNames: string[];
	nextRequiredCapabilityNames: string[];
	nextRequiredToolNames: string[];
	nextBlockedReason: string;
	nextDependencyTaskIds: string[];
	nextTargetDate: string | null;
	decisionSummary: string | null;
};

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

function buildTaskPlanDecisionSummary(input: TaskPlanDecisionSummaryInput) {
	const changes: string[] = [];
	const currentCapabilityNames = [...(input.task.requiredCapabilityNames ?? [])].sort();
	const nextCapabilityNames = [...input.nextRequiredCapabilityNames].sort();
	const currentToolNames = [...(input.task.requiredToolNames ?? [])].sort();
	const nextToolNames = [...input.nextRequiredToolNames].sort();
	const currentPromptSkillNames = [...(input.task.requiredPromptSkillNames ?? [])].sort();
	const nextPromptSkillNames = [...input.nextRequiredPromptSkillNames].sort();
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

	if (
		(input.nextAssignedExecutionSurface?.id ?? null) !==
		(input.task.assigneeExecutionSurfaceId ?? null)
	) {
		changes.push(
			input.nextAssignedExecutionSurface
				? `assigned the task to ${input.nextAssignedExecutionSurface.name}`
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

	if (currentPromptSkillNames.join('|') !== nextPromptSkillNames.join('|')) {
		changes.push(
			nextPromptSkillNames.length > 0
				? `set requested prompt skills to ${nextPromptSkillNames.join(', ')}`
				: 'cleared requested prompt skills'
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

export function resolveTaskPlanUpdate(input: {
	current: ControlPlaneData;
	task: Task;
	status: Task['status'];
	form: TaskDetailFormInput;
	project: Project;
	goal: Goal | null;
	assignedExecutionSurface: ExecutionSurface | null;
}): ResolvedTaskPlanUpdate {
	const { current, task, status, form, project, goal, assignedExecutionSurface } = input;
	const nextTitle = form.name;
	const nextInstructions = form.instructions;
	const nextSuccessCriteria = form.successCriteria;
	const nextReadyCondition = form.readyCondition;
	const nextExpectedOutcome = form.expectedOutcome;
	const nextDelegationPacket =
		task.parentTaskId && form.hasDelegationPacketFields
			? {
					objective: form.delegationObjective,
					inputContext: form.delegationInputContext,
					expectedDeliverable: form.delegationExpectedDeliverable,
					doneCondition: form.delegationDoneCondition,
					integrationNotes: form.delegationIntegrationNotes
				}
			: (task.delegationPacket ?? null);
	const nextGoalId = form.hasGoalId ? (goal?.id ?? '') : task.goalId;
	const nextStatus = status;
	const nextAssignedExecutionSurface = form.hasAssigneeExecutionSurfaceId
		? assignedExecutionSurface
		: task.assigneeExecutionSurfaceId
			? (current.executionSurfaces.find(
					(candidate) => candidate.id === task.assigneeExecutionSurfaceId
				) ?? null)
			: null;
	const nextPriority = form.hasPriority ? form.priority : task.priority;
	const nextRiskLevel = form.hasRiskLevel ? form.riskLevel : task.riskLevel;
	const nextApprovalMode = form.hasApprovalMode ? form.approvalMode : task.approvalMode;
	const nextRequiredThreadSandbox = form.hasRequiredThreadSandbox
		? form.requiredThreadSandbox
		: (task.requiredThreadSandbox ?? null);
	const nextRequiresReview = form.hasRequiresReview ? form.requiresReview : task.requiresReview;
	const nextDesiredRoleId = form.hasDesiredRoleId ? form.desiredRoleId : task.desiredRoleId;
	const nextRequiredPromptSkillNames = form.hasRequiredPromptSkillNames
		? form.requiredPromptSkillNames
		: (task.requiredPromptSkillNames ?? []);
	const nextRequiredCapabilityNames = form.hasRequiredCapabilityNames
		? form.requiredCapabilityNames
		: (task.requiredCapabilityNames ?? []);
	const nextRequiredToolNames = form.hasRequiredToolNames
		? form.requiredToolNames
		: (task.requiredToolNames ?? []);
	const nextBlockedReason = normalizeTaskBlockedReasonForStatus(
		nextStatus,
		form.hasBlockedReason ? form.blockedReason : task.blockedReason
	);
	const nextDependencyTaskIds = form.hasDependencyTaskSelection
		? form.dependencyTaskIds
		: task.dependencyTaskIds;
	const nextTargetDate = form.hasTargetDate ? form.targetDate || null : (task.targetDate ?? null);
	const dependencyTaskNameMap = new Map(
		current.tasks.map((candidate) => [candidate.id, candidate.title])
	);
	const decisionSummary = buildTaskPlanDecisionSummary({
		task,
		nextTitle,
		nextSummary: nextInstructions,
		nextSuccessCriteria,
		nextReadyCondition,
		nextExpectedOutcome,
		nextDelegationPacket,
		nextProject: project,
		nextGoalId,
		nextGoalName: goal?.name ?? null,
		currentGoalName: task.goalId
			? (current.goals.find((candidate) => candidate.id === task.goalId)?.name ?? null)
			: null,
		nextStatus,
		nextAssignedExecutionSurface,
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
		currentDesiredRoleName: task.desiredRoleId
			? (current.roles.find((candidate) => candidate.id === task.desiredRoleId)?.name ??
				task.desiredRoleId)
			: null,
		nextRequiredPromptSkillNames,
		nextRequiredCapabilityNames,
		nextRequiredToolNames,
		nextBlockedReason,
		nextDependencyTaskIds,
		nextDependencyTaskTitles: normalizeIdList(nextDependencyTaskIds).map(
			(dependencyTaskId) => dependencyTaskNameMap.get(dependencyTaskId) ?? dependencyTaskId
		),
		currentDependencyTaskTitles: normalizeIdList(task.dependencyTaskIds ?? []).map(
			(dependencyTaskId) => dependencyTaskNameMap.get(dependencyTaskId) ?? dependencyTaskId
		),
		nextTargetDate
	});

	return {
		nextTitle,
		nextInstructions,
		nextSuccessCriteria,
		nextReadyCondition,
		nextExpectedOutcome,
		nextDelegationPacket,
		nextGoalId,
		nextStatus,
		nextAssignedExecutionSurface,
		nextPriority,
		nextRiskLevel,
		nextApprovalMode,
		nextRequiredThreadSandbox,
		nextRequiresReview,
		nextDesiredRoleId,
		nextRequiredPromptSkillNames,
		nextRequiredCapabilityNames,
		nextRequiredToolNames,
		nextBlockedReason,
		nextDependencyTaskIds,
		nextTargetDate,
		decisionSummary
	};
}
