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

export type WorkflowStepDisplay = WorkflowStep & {
	desiredRoleName: string;
	dependsOnStepTitles: string[];
	dependsOnStepPositions: number[];
	canRunInParallel: boolean;
};

export type WorkflowTaskPreview = {
	id: string;
	title: string;
	status: Task['status'];
	projectName: string;
	updatedAt: string;
};

export type WorkflowDisplayRecord = Workflow & {
	projectName: string;
	rollup: WorkflowRollup;
	steps: WorkflowStepDisplay[];
	taskPreview: WorkflowTaskPreview[];
	parallelizableStepCount: number;
	defaultRoleCount: number;
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

export function buildWorkflowDisplayRecords(data: ControlPlaneData): WorkflowDisplayRecord[] {
	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const roleMap = new Map(data.roles.map((role) => [role.id, role]));

	return sortWorkflowsByName(data.workflows ?? []).map((workflow) => {
		const workflowTasks = getWorkflowTasks(data, workflow.id)
			.map((task) => ({
				id: task.id,
				title: task.title,
				status: task.status,
				projectName: projectMap.get(task.projectId)?.name ?? 'Unknown project',
				updatedAt: task.updatedAt
			}))
			.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
		const orderedWorkflowSteps = getWorkflowSteps(data, workflow.id);
		const workflowStepMap = new Map(orderedWorkflowSteps.map((step) => [step.id, step]));
		const workflowSteps = orderedWorkflowSteps.map((step) => {
			const dependsOnStepPositions = (step.dependsOnStepIds ?? [])
				.map((dependencyStepId) => workflowStepMap.get(dependencyStepId)?.position ?? 0)
				.filter((position) => position > 0);

			return {
				...step,
				desiredRoleName: step.desiredRoleId
					? (roleMap.get(step.desiredRoleId)?.name ?? step.desiredRoleId)
					: '',
				dependsOnStepTitles: (step.dependsOnStepIds ?? [])
					.map((dependencyStepId) => {
						const dependencyStep = workflowStepMap.get(dependencyStepId);

						return dependencyStep
							? `Step ${dependencyStep.position} · ${dependencyStep.title}`
							: '';
					})
					.filter(Boolean),
				dependsOnStepPositions,
				canRunInParallel: step.position > 1 && dependsOnStepPositions.length === 0
			} satisfies WorkflowStepDisplay;
		});

		return {
			...workflow,
			projectName: projectMap.get(workflow.projectId)?.name ?? 'Unknown project',
			rollup: getWorkflowRollup(data, workflow),
			steps: workflowSteps,
			taskPreview: workflowTasks.slice(0, 5),
			parallelizableStepCount: workflowSteps.filter((step) => step.canRunInParallel).length,
			defaultRoleCount: workflowSteps.filter((step) => Boolean(step.desiredRoleId)).length
		} satisfies WorkflowDisplayRecord;
	});
}

export function getWorkflowDisplayRecord(
	data: ControlPlaneData,
	workflowId: string
): WorkflowDisplayRecord | null {
	return buildWorkflowDisplayRecords(data).find((workflow) => workflow.id === workflowId) ?? null;
}
