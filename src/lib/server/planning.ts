import type {
	ControlPlaneData,
	Goal,
	PlanningHorizon,
	Task,
	Worker
} from '$lib/types/control-plane';

const FALLBACK_CAPACITY_HOURS_PER_SLOT = 20;

type PlanningGoalSummary = {
	id: string;
	name: string;
	status: Goal['status'];
	summary: string;
	lane: Goal['lane'];
	confidence: NonNullable<Goal['confidence']>;
	planningPriority: number;
	targetDate: string | null;
	linkedProjectNames: string[];
	taskCount: number;
	estimatedHours: number;
	unestimatedTaskCount: number;
};

type PlanningTaskSummary = {
	id: string;
	title: string;
	status: Task['status'];
	projectName: string;
	goalName: string;
	assigneeName: string;
	estimateHours: number | null;
	targetDate: string | null;
};

type PlanningWorkerLoad = {
	id: string;
	name: string;
	status: Worker['status'];
	capacityHours: number;
	plannedHours: number;
	remainingHours: number;
	overAllocated: boolean;
};

function sortHorizons(horizons: PlanningHorizon[]) {
	return [...horizons].sort((left, right) => {
		const statusWeight = (value: PlanningHorizon['status']) => {
			switch (value) {
				case 'active':
					return 0;
				case 'draft':
					return 1;
				case 'closed':
				default:
					return 2;
			}
		};

		const statusDelta = statusWeight(left.status) - statusWeight(right.status);

		if (statusDelta !== 0) {
			return statusDelta;
		}

		return right.startDate.localeCompare(left.startDate);
	});
}

function getTaskPlanningHorizonId(task: Task, goalMap: Map<string, Goal>) {
	return task.planningHorizonId ?? goalMap.get(task.goalId)?.planningHorizonId ?? null;
}

function getWorkerCapacityHours(worker: Worker) {
	return (
		worker.weeklyCapacityHours ?? worker.capacity * FALLBACK_CAPACITY_HOURS_PER_SLOT
	) * (worker.focusFactor ?? 1);
}

export function selectPlanningHorizon(data: ControlPlaneData, requestedHorizonId?: string | null) {
	const horizons = sortHorizons(data.planningHorizons ?? []);

	if (requestedHorizonId) {
		const requested = horizons.find((horizon) => horizon.id === requestedHorizonId);

		if (requested) {
			return requested;
		}
	}

	return horizons[0] ?? null;
}

export function buildPlanningPageData(data: ControlPlaneData, requestedHorizonId?: string | null) {
	const goalMap = new Map(data.goals.map((goal) => [goal.id, goal]));
	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const workerMap = new Map(data.workers.map((worker) => [worker.id, worker]));
	const selectedHorizon = selectPlanningHorizon(data, requestedHorizonId);
	const horizonGoals = selectedHorizon
		? data.goals.filter((goal) => goal.planningHorizonId === selectedHorizon.id)
		: [];
	const horizonGoalIds = new Set(horizonGoals.map((goal) => goal.id));
	const horizonTasks = selectedHorizon
		? data.tasks.filter(
				(task) => getTaskPlanningHorizonId(task, goalMap) === selectedHorizon.id
			)
		: [];
	const workerLoads = data.workers.map((worker) => {
		const plannedHours = horizonTasks.reduce((total, task) => {
			if (task.assigneeWorkerId !== worker.id || task.status === 'done') {
				return total;
			}

			return total + (task.estimateHours ?? 0);
		}, 0);
		const capacityHours = getWorkerCapacityHours(worker);

		return {
			id: worker.id,
			name: worker.name,
			status: worker.status,
			capacityHours,
			plannedHours,
			remainingHours: capacityHours - plannedHours,
			overAllocated: plannedHours > capacityHours
		};
	});
	const goalTaskMap = new Map(
		horizonGoals.map((goal) => [
			goal.id,
			horizonTasks.filter((task) => task.goalId === goal.id)
		])
	);
	const plannedHours = horizonTasks.reduce((total, task) => total + (task.estimateHours ?? 0), 0);
	const totalCapacityHours = workerLoads.reduce((total, worker) => total + worker.capacityHours, 0);

	return {
		horizons: sortHorizons(data.planningHorizons ?? []).map((horizon) => {
			const goals = data.goals.filter((goal) => goal.planningHorizonId === horizon.id);
			const goalIds = new Set(goals.map((goal) => goal.id));
			const tasks = data.tasks.filter(
				(task) => getTaskPlanningHorizonId(task, goalMap) === horizon.id || goalIds.has(task.goalId)
			);

			return {
				...horizon,
				goalCount: goals.length,
				taskCount: tasks.length,
				estimatedHours: tasks.reduce((total, task) => total + (task.estimateHours ?? 0), 0)
			};
		}),
		selectedHorizon,
		metrics: {
			horizonCount: (data.planningHorizons ?? []).length,
			goalCount: horizonGoals.length,
			taskCount: horizonTasks.length,
			totalCapacityHours,
			plannedHours,
			remainingCapacityHours: totalCapacityHours - plannedHours,
			overAllocatedWorkerCount: workerLoads.filter((worker) => worker.overAllocated).length,
			unestimatedTaskCount: horizonTasks.filter(
				(task) => task.status !== 'done' && task.estimateHours === null
			).length
		},
		horizonGoals: [...horizonGoals]
			.sort((left, right) => {
				if ((right.planningPriority ?? 0) !== (left.planningPriority ?? 0)) {
					return (right.planningPriority ?? 0) - (left.planningPriority ?? 0);
				}

				return left.name.localeCompare(right.name);
			})
			.map((goal): PlanningGoalSummary => {
				const goalTasks = goalTaskMap.get(goal.id) ?? [];

				return {
					id: goal.id,
					name: goal.name,
					status: goal.status,
					summary: goal.summary,
					lane: goal.lane,
					confidence: goal.confidence ?? 'medium',
					planningPriority: goal.planningPriority ?? 0,
					targetDate: goal.targetDate ?? null,
					linkedProjectNames: (goal.projectIds ?? [])
						.map((projectId) => projectMap.get(projectId)?.name)
						.filter((name): name is string => Boolean(name)),
					taskCount: goalTasks.length,
					estimatedHours: goalTasks.reduce((total, task) => total + (task.estimateHours ?? 0), 0),
					unestimatedTaskCount: goalTasks.filter(
						(task) => task.status !== 'done' && task.estimateHours === null
					).length
				};
			}),
		availableGoals: data.goals
			.filter((goal) => !goal.planningHorizonId)
			.sort((left, right) => left.name.localeCompare(right.name))
			.map((goal) => ({
				id: goal.id,
				name: goal.name,
				status: goal.status,
				summary: goal.summary,
				lane: goal.lane,
				linkedProjectNames: (goal.projectIds ?? [])
					.map((projectId) => projectMap.get(projectId)?.name)
					.filter((name): name is string => Boolean(name)),
				existingTaskCount: data.tasks.filter((task) => task.goalId === goal.id).length
			})),
		horizonTasks: [...horizonTasks]
			.sort((left, right) => {
				if (left.planningOrder !== right.planningOrder) {
					return (left.planningOrder ?? 0) - (right.planningOrder ?? 0);
				}

				return left.title.localeCompare(right.title);
			})
			.map(
				(task): PlanningTaskSummary => ({
					id: task.id,
					title: task.title,
					status: task.status,
					projectName: projectMap.get(task.projectId)?.name ?? 'Unknown project',
					goalName: task.goalId ? (goalMap.get(task.goalId)?.name ?? 'Unknown goal') : 'No goal',
					assigneeName: task.assigneeWorkerId
						? (workerMap.get(task.assigneeWorkerId)?.name ?? 'Unknown worker')
						: 'Unassigned',
					estimateHours: task.estimateHours ?? null,
					targetDate: task.targetDate ?? null
				})
			),
		workerLoads: workerLoads.sort((left, right) => left.name.localeCompare(right.name)),
		unassignedTaskCount: horizonTasks.filter(
			(task) =>
				task.status !== 'done' &&
				!task.assigneeWorkerId &&
				(task.goalId === '' || horizonGoalIds.has(task.goalId))
		).length
	};
}
