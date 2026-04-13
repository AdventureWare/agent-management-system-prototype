import type { ControlPlaneCollection } from '$lib/server/db/control-plane-store';
import { updateControlPlaneCollections } from '$lib/server/control-plane';
import {
	applyGoalRelationships,
	getGoalLinkedProjectIds,
	getGoalLinkedTaskIds
} from '$lib/server/goal-relationships';
import type { ControlPlaneData, Decision, Run, Task } from '$lib/types/control-plane';

const TASK_DELETE_COLLECTIONS = [
	'tasks',
	'goals',
	'runs',
	'reviews',
	'approvals',
	'decisions',
	'planningSessions'
] as const satisfies readonly ControlPlaneCollection[];

function uniqueCollections(
	collections: Array<ControlPlaneCollection | null | undefined>
): ControlPlaneCollection[] {
	return [
		...new Set(collections.filter((value): value is ControlPlaneCollection => Boolean(value)))
	];
}

function prependRecords<T>(records: readonly T[] | undefined, existing: readonly T[]) {
	return records && records.length > 0 ? [...records, ...existing] : [...existing];
}

function deleteTasksFromData(data: ControlPlaneData, deletedTaskIds: readonly string[]) {
	const deletedTaskIdSet = new Set(deletedTaskIds);
	const relatedRunIds = new Set(
		data.runs
			.filter((candidate) => deletedTaskIdSet.has(candidate.taskId))
			.map((candidate) => candidate.id)
	);
	const nextDecisions = (data.decisions ?? []).filter(
		(decision) =>
			!deletedTaskIdSet.has(decision.taskId ?? '') &&
			!(decision.runId && relatedRunIds.has(decision.runId))
	);
	const survivingDecisionIds = new Set(nextDecisions.map((decision) => decision.id));
	const now = new Date().toISOString();

	return {
		...data,
		tasks: data.tasks
			.filter((task) => !deletedTaskIdSet.has(task.id))
			.map((task) => {
				let nextTask = task;
				const nextDependencyTaskIds = task.dependencyTaskIds.filter(
					(dependencyTaskId) => !deletedTaskIdSet.has(dependencyTaskId)
				);

				if (nextDependencyTaskIds.length !== task.dependencyTaskIds.length) {
					nextTask = {
						...nextTask,
						dependencyTaskIds: nextDependencyTaskIds,
						updatedAt: now
					};
				}

				if (nextTask.parentTaskId && deletedTaskIdSet.has(nextTask.parentTaskId)) {
					nextTask = {
						...nextTask,
						parentTaskId: null,
						updatedAt: now
					};
				}

				return nextTask;
			}),
		goals: data.goals.map((goal) => {
			const nextTaskIds = (goal.taskIds ?? []).filter((taskId) => !deletedTaskIdSet.has(taskId));

			return nextTaskIds.length === (goal.taskIds ?? []).length
				? goal
				: { ...goal, taskIds: nextTaskIds };
		}),
		runs: data.runs.filter((run) => !deletedTaskIdSet.has(run.taskId)),
		reviews: data.reviews.filter(
			(review) =>
				!deletedTaskIdSet.has(review.taskId) && !(review.runId && relatedRunIds.has(review.runId))
		),
		approvals: data.approvals.filter(
			(approval) =>
				!deletedTaskIdSet.has(approval.taskId) &&
				!(approval.runId && relatedRunIds.has(approval.runId))
		),
		decisions: nextDecisions,
		planningSessions: (data.planningSessions ?? []).map((session) => ({
			...session,
			taskIds: session.taskIds.filter((taskId) => !deletedTaskIdSet.has(taskId)),
			decisionIds: session.decisionIds.filter((decisionId) => survivingDecisionIds.has(decisionId))
		}))
	};
}

export async function createTaskRecord(input: {
	task: Task;
	goalId?: string | null;
	prependRuns?: Run[];
	prependDecisions?: Decision[];
}) {
	await updateControlPlaneCollections((data) => {
		let nextData: ControlPlaneData = {
			...data,
			tasks: [input.task, ...data.tasks]
		};
		const changedCollections: Array<ControlPlaneCollection | null> = ['tasks'];
		const goalId = input.goalId?.trim() ?? '';

		if (goalId) {
			const goal = nextData.goals.find((candidate) => candidate.id === goalId);

			if (goal) {
				nextData = applyGoalRelationships({
					data: nextData,
					goalId: goal.id,
					parentGoalId: goal.parentGoalId ?? null,
					projectIds: getGoalLinkedProjectIds(nextData, goal),
					taskIds: getGoalLinkedTaskIds(nextData, goal)
				});
				changedCollections.push('goals');
			}
		}

		if (input.prependRuns && input.prependRuns.length > 0) {
			nextData = {
				...nextData,
				runs: [...input.prependRuns, ...nextData.runs]
			};
			changedCollections.push('runs');
		}

		if (input.prependDecisions && input.prependDecisions.length > 0) {
			nextData = {
				...nextData,
				decisions: [...input.prependDecisions, ...(nextData.decisions ?? [])]
			};
			changedCollections.push('decisions');
		}

		return {
			data: nextData,
			changedCollections: uniqueCollections(changedCollections)
		};
	});
}

export async function updateTaskRecord(input: {
	taskId: string;
	update: (task: Task, data: ControlPlaneData) => Task;
	prependRuns?: Run[];
	prependDecisions?: Decision[];
}) {
	let updatedTask: Task | null = null;

	await updateControlPlaneCollections((data) => {
		const existingTask = data.tasks.find((candidate) => candidate.id === input.taskId) ?? null;

		if (!existingTask) {
			return {
				data,
				changedCollections: []
			};
		}

		const nextTask = input.update(existingTask, data);
		updatedTask = nextTask;
		let nextData: ControlPlaneData = {
			...data,
			tasks: data.tasks.map((candidate) => (candidate.id === input.taskId ? nextTask : candidate))
		};
		const changedCollections: Array<ControlPlaneCollection | null> = ['tasks'];

		if (input.prependRuns && input.prependRuns.length > 0) {
			nextData = {
				...nextData,
				runs: prependRecords(input.prependRuns, nextData.runs)
			};
			changedCollections.push('runs');
		}

		if (input.prependDecisions && input.prependDecisions.length > 0) {
			nextData = {
				...nextData,
				decisions: prependRecords(input.prependDecisions, nextData.decisions ?? [])
			};
			changedCollections.push('decisions');
		}

		return {
			data: nextData,
			changedCollections: uniqueCollections(changedCollections)
		};
	});

	return updatedTask;
}

export async function mutateTaskCollections(input: {
	taskId: string;
	mutate: (
		task: Task,
		data: ControlPlaneData
	) => {
		data: ControlPlaneData;
		changedCollections: Iterable<ControlPlaneCollection>;
	};
}) {
	let updatedTask: Task | null = null;

	await updateControlPlaneCollections((data) => {
		const existingTask = data.tasks.find((candidate) => candidate.id === input.taskId) ?? null;

		if (!existingTask) {
			return {
				data,
				changedCollections: []
			};
		}

		const plan = input.mutate(existingTask, data);
		updatedTask = plan.data.tasks.find((candidate) => candidate.id === input.taskId) ?? null;

		return {
			data: plan.data,
			changedCollections: uniqueCollections([...plan.changedCollections])
		};
	});

	return updatedTask;
}

export async function deleteTaskRecords(taskIds: readonly string[]) {
	let deletedTaskIds: string[] = [];

	await updateControlPlaneCollections((data) => {
		const existingTaskIds = new Set(data.tasks.map((task) => task.id));
		deletedTaskIds = [...new Set(taskIds.filter((taskId) => existingTaskIds.has(taskId)))];

		if (deletedTaskIds.length === 0) {
			return {
				data,
				changedCollections: []
			};
		}

		return {
			data: deleteTasksFromData(data, deletedTaskIds),
			changedCollections: [...TASK_DELETE_COLLECTIONS]
		};
	});

	return deletedTaskIds;
}
