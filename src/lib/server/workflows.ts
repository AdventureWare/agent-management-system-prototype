import {
	getOpenReviewForTask,
	getPendingApprovalForTask,
	taskHasUnmetDependencies
} from '$lib/server/control-plane';
import type { ControlPlaneData, Task, Workflow, WorkflowStep } from '$lib/types/control-plane';

export type WorkflowRollup = {
	taskCount: number;
	inDraftCount: number;
	readyCount: number;
	inProgressCount: number;
	reviewCount: number;
	blockedCount: number;
	doneCount: number;
	waitingOnDependenciesCount: number;
	pendingAcceptanceCount: number;
	runnableTaskCount: number;
	derivedStatus: Workflow['status'];
};

export function sortWorkflowsByName<T extends { name: string }>(workflows: T[]) {
	return [...workflows].sort((left, right) => left.name.localeCompare(right.name));
}

export function getWorkflowTasks(data: Pick<ControlPlaneData, 'tasks'>, workflowId: string) {
	return data.tasks.filter((task) => task.workflowId === workflowId);
}

export function getWorkflowSteps(
	data: Pick<ControlPlaneData, 'workflowSteps'>,
	workflowId: string
): WorkflowStep[] {
	return [...(data.workflowSteps ?? [])]
		.filter((step) => step.workflowId === workflowId)
		.sort((left, right) => {
			if (left.position !== right.position) {
				return left.position - right.position;
			}

			return left.title.localeCompare(right.title);
		});
}

function taskHasPendingAcceptance(task: Task) {
	return Boolean(task.parentTaskId && task.status === 'done' && !task.delegationAcceptance);
}

function isRunnableTask(data: ControlPlaneData, task: Task) {
	if (task.status === 'in_progress') {
		return true;
	}

	if (task.status !== 'ready') {
		return false;
	}

	if (taskHasUnmetDependencies(data, task)) {
		return false;
	}

	return !getPendingApprovalForTask(data, task.id);
}

export function getWorkflowRollup(
	data: ControlPlaneData,
	workflow: Pick<Workflow, 'id' | 'status'>
): WorkflowRollup {
	const tasks = getWorkflowTasks(data, workflow.id);
	const inDraftCount = tasks.filter((task) => task.status === 'in_draft').length;
	const readyCount = tasks.filter((task) => task.status === 'ready').length;
	const inProgressCount = tasks.filter((task) => task.status === 'in_progress').length;
	const reviewCount = tasks.filter((task) => task.status === 'review').length;
	const blockedCount = tasks.filter((task) => task.status === 'blocked').length;
	const doneCount = tasks.filter((task) => task.status === 'done').length;
	const waitingOnDependenciesCount = tasks.filter((task) =>
		taskHasUnmetDependencies(data, task)
	).length;
	const pendingAcceptanceCount = tasks.filter(taskHasPendingAcceptance).length;
	const runnableTaskCount = tasks.filter((task) => isRunnableTask(data, task)).length;
	const hasReviewGate =
		reviewCount > 0 ||
		pendingAcceptanceCount > 0 ||
		tasks.some((task) =>
			Boolean(getOpenReviewForTask(data, task.id) || getPendingApprovalForTask(data, task.id))
		);
	let derivedStatus: Workflow['status'];

	if (workflow.status === 'canceled') {
		derivedStatus = 'canceled';
	} else if (tasks.length === 0) {
		derivedStatus = workflow.status === 'done' ? 'draft' : workflow.status;
	} else if (doneCount === tasks.length && pendingAcceptanceCount === 0) {
		derivedStatus = 'done';
	} else if (inProgressCount > 0 || runnableTaskCount > 0) {
		derivedStatus = 'active';
	} else if (hasReviewGate) {
		derivedStatus = 'review';
	} else if (blockedCount > 0 || waitingOnDependenciesCount > 0) {
		derivedStatus = 'blocked';
	} else if (inDraftCount === tasks.length) {
		derivedStatus = 'draft';
	} else {
		derivedStatus = workflow.status;
	}

	return {
		taskCount: tasks.length,
		inDraftCount,
		readyCount,
		inProgressCount,
		reviewCount,
		blockedCount,
		doneCount,
		waitingOnDependenciesCount,
		pendingAcceptanceCount,
		runnableTaskCount,
		derivedStatus
	};
}
