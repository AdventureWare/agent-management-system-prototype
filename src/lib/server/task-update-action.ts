import {
	createDecision,
	loadControlPlane,
	parseTaskStatus,
	updateControlPlane
} from '$lib/server/control-plane';
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
		assigneeWorkerId,
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
	const assigneeWorker = assigneeWorkerId
		? (current.workers.find((candidate) => candidate.id === assigneeWorkerId) ?? null)
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

	if (assigneeWorkerId && !assigneeWorker) {
		throw new TaskUpdateActionError(400, 'Worker not found.');
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

	const {
		nextTitle,
		nextInstructions,
		nextSuccessCriteria,
		nextReadyCondition,
		nextExpectedOutcome,
		nextDelegationPacket,
		nextGoalId,
		nextStatus,
		nextAssigneeWorker,
		nextPriority,
		nextRiskLevel,
		nextApprovalMode,
		nextRequiredThreadSandbox,
		nextRequiresReview,
		nextDesiredRoleId,
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
		form: taskInput,
		project,
		goal,
		assigneeWorker
	});
	const now = new Date().toISOString();
	let taskUpdated = false;

	await updateControlPlane((data) => ({
		...data,
		tasks: data.tasks.map((task) => {
			if (task.id !== taskId) {
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
						taskId,
						decisionType: 'task_plan_updated',
						summary: decisionSummary,
						createdAt: now
					}),
					...(data.decisions ?? [])
				]
			: (data.decisions ?? [])
	}));

	if (!taskUpdated) {
		throw new TaskUpdateActionError(404, 'Task not found.');
	}

	return {
		ok: true,
		successAction: 'updateTask' as const,
		taskId
	};
}
