import { canonicalizeExecutionRequirementNames } from '$lib/execution-requirements';
import { listInstalledCodexSkills } from '$lib/server/codex-skills';
import { createDecision, loadControlPlane, parseTaskStatus } from '$lib/server/control-plane';
import { updateTaskRecord } from '$lib/server/control-plane-repository';
import { buildExecutionRequirementInventory } from '$lib/server/execution-requirement-inventory';
import { describeExecutionSurfaceTaskFit } from '$lib/server/execution-surface-api';
import { isValidTaskDate, readTaskDetailForm } from '$lib/server/task-form';
import { resolveTaskPlanUpdate } from '$lib/server/task-plan-updates';

export class TaskUpdateActionError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'TaskUpdateActionError';
	}
}

export async function updateTaskFromDetailForm(taskId: string, form: FormData) {
	const taskInput = readTaskDetailForm(form);
	const status = parseTaskStatus(form.get('status')?.toString() ?? '', 'ready');
	const {
		name,
		instructions,
		delegationObjective,
		delegationDoneCondition,
		hasDelegationPacketFields,
		projectId,
		goalId,
		assigneeExecutionSurfaceId,
		desiredRoleId,
		hasDesiredRoleId,
		dependencyTaskIds,
		targetDate
	} = taskInput;

	if (!name || !instructions || !projectId) {
		throw new TaskUpdateActionError(400, 'Name, instructions, and project are required.');
	}

	if (targetDate && !isValidTaskDate(targetDate)) {
		throw new TaskUpdateActionError(400, 'Target date must use YYYY-MM-DD format.');
	}

	const current = await loadControlPlane();
	const project = current.projects.find((candidate) => candidate.id === projectId);
	const goal = goalId ? (current.goals.find((candidate) => candidate.id === goalId) ?? null) : null;
	const assignedExecutionSurface = assigneeExecutionSurfaceId
		? (current.executionSurfaces.find((candidate) => candidate.id === assigneeExecutionSurfaceId) ??
			null)
		: null;
	const desiredRole = desiredRoleId
		? (current.roles.find((candidate) => candidate.id === desiredRoleId) ?? null)
		: null;

	if (!project) {
		throw new TaskUpdateActionError(400, 'Project not found.');
	}

	if (goalId && !goal) {
		throw new TaskUpdateActionError(400, 'Goal not found.');
	}

	if (assigneeExecutionSurfaceId && !assignedExecutionSurface) {
		throw new TaskUpdateActionError(400, 'Execution surface not found.');
	}

	const existingTask = current.tasks.find((candidate) => candidate.id === taskId);

	if (!existingTask) {
		throw new TaskUpdateActionError(404, 'Task not found.');
	}

	if (
		hasDesiredRoleId &&
		desiredRoleId &&
		!desiredRole &&
		desiredRoleId !== existingTask.desiredRoleId
	) {
		throw new TaskUpdateActionError(400, 'Desired role not found.');
	}

	const invalidDependencyTaskIds = dependencyTaskIds.filter(
		(dependencyTaskId) =>
			dependencyTaskId === taskId ||
			!current.tasks.some((candidate) => candidate.id === dependencyTaskId)
	);

	if (invalidDependencyTaskIds.length > 0) {
		throw new TaskUpdateActionError(
			400,
			'One or more selected dependencies are no longer available.'
		);
	}

	if (existingTask.parentTaskId && hasDelegationPacketFields && !delegationObjective) {
		throw new TaskUpdateActionError(
			400,
			'Delegated child tasks need a clear delegation objective.'
		);
	}

	if (existingTask.parentTaskId && hasDelegationPacketFields && !delegationDoneCondition) {
		throw new TaskUpdateActionError(
			400,
			'Delegated child tasks need a done condition for handoff.'
		);
	}

	const executionRequirementInventory = buildExecutionRequirementInventory(current);
	const installedPromptSkills = listInstalledCodexSkills(project.projectRootFolder);
	const normalizedTaskInput = {
		...taskInput,
		requiredPromptSkillNames: canonicalizeExecutionRequirementNames(
			taskInput.requiredPromptSkillNames,
			installedPromptSkills.map((skill) => skill.id)
		),
		requiredCapabilityNames: canonicalizeExecutionRequirementNames(
			taskInput.requiredCapabilityNames,
			executionRequirementInventory.capabilityNames
		),
		requiredToolNames: canonicalizeExecutionRequirementNames(
			taskInput.requiredToolNames,
			executionRequirementInventory.toolNames
		)
	};

	const {
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
	} = resolveTaskPlanUpdate({
		current,
		task: existingTask,
		status,
		form: normalizedTaskInput,
		project,
		goal,
		assignedExecutionSurface
	});

	if (nextAssignedExecutionSurface) {
		const candidateTask = {
			...existingTask,
			projectId: project.id,
			status: nextStatus,
			assigneeExecutionSurfaceId: nextAssignedExecutionSurface.id,
			desiredRoleId: nextDesiredRoleId,
			requiredCapabilityNames: nextRequiredCapabilityNames,
			requiredToolNames: nextRequiredToolNames
		};
		const fit = describeExecutionSurfaceTaskFit(
			{
				...current,
				tasks: current.tasks.map((candidate) =>
					candidate.id === taskId ? candidateTask : candidate
				)
			},
			nextAssignedExecutionSurface,
			candidateTask
		);

		if (!fit.withinAssignmentLimit) {
			throw new TaskUpdateActionError(
				409,
				`${nextAssignedExecutionSurface.name} is already at its task capacity.`
			);
		}
	}

	const now = new Date().toISOString();
	const updatedTask = await updateTaskRecord({
		taskId,
		update: (task) => ({
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
			assigneeExecutionSurfaceId: nextAssignedExecutionSurface?.id ?? null,
			priority: nextPriority,
			riskLevel: nextRiskLevel,
			approvalMode: nextApprovalMode,
			requiredThreadSandbox: nextRequiredThreadSandbox,
			requiresReview: nextRequiresReview,
			desiredRoleId: nextDesiredRoleId,
			requiredPromptSkillNames: nextRequiredPromptSkillNames,
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
		}),
		prependDecisions: decisionSummary
			? [
					createDecision({
						taskId,
						decisionType: 'task_plan_updated',
						summary: decisionSummary,
						createdAt: now
					})
				]
			: undefined
	});

	if (!updatedTask) {
		throw new TaskUpdateActionError(404, 'Task not found.');
	}

	return {
		ok: true,
		successAction: 'updateTask' as const,
		taskId
	};
}
