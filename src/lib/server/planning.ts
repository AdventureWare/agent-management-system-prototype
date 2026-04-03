import type { ControlPlaneData, Goal, Task, Worker } from '$lib/types/control-plane';
import { getWorkerAssignmentSuggestions } from '$lib/server/worker-api';

const FALLBACK_CAPACITY_HOURS_PER_SLOT = 20;

type PlanningPageFilters = {
	startDate: string;
	endDate: string;
	projectId?: string | null;
	goalId?: string | null;
	workerId?: string | null;
	includeUnscheduled?: boolean;
};

type PlanningGoalSummary = {
	id: string;
	name: string;
	status: Goal['status'];
	summary: string;
	area: Goal['area'];
	confidence: NonNullable<Goal['confidence']>;
	planningPriority: number;
	targetDate: string | null;
	linkedProjectNames: string[];
	taskCount: number;
	scheduledTaskCount: number;
	unscheduledTaskCount: number;
	plannedHours: number;
	unestimatedTaskCount: number;
};

type PlanningTaskSummary = {
	id: string;
	title: string;
	status: Task['status'];
	projectName: string;
	goalId: string;
	goalName: string;
	assigneeName: string;
	estimateHours: number | null;
	targetDate: string | null;
	blockedReason: string;
	requiredCapabilityNames: string[];
	requiredToolNames: string[];
	eligibleWorkerCount: number;
	suggestedWorkerNames: string[];
	assignedWorkerEligible: boolean | null;
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

function getWorkerCapacityHours(worker: Worker) {
	return (
		(worker.weeklyCapacityHours ?? worker.capacity * FALLBACK_CAPACITY_HOURS_PER_SLOT) *
		(worker.focusFactor ?? 1)
	);
}

function isDateInWindow(date: string | null | undefined, startDate: string, endDate: string) {
	if (!date) {
		return false;
	}

	return date >= startDate && date <= endDate;
}

function sortTasks(tasks: Task[]) {
	return [...tasks].sort((left, right) => {
		const leftDate = left.targetDate ?? '9999-12-31';
		const rightDate = right.targetDate ?? '9999-12-31';

		if (leftDate !== rightDate) {
			return leftDate.localeCompare(rightDate);
		}

		return left.title.localeCompare(right.title);
	});
}

function goalMatchesProject(goal: Goal, data: ControlPlaneData, projectId: string) {
	if ((goal.projectIds ?? []).includes(projectId)) {
		return true;
	}

	return data.tasks.some((task) => task.goalId === goal.id && task.projectId === projectId);
}

function goalMatchesFilters(goal: Goal, data: ControlPlaneData, filters: PlanningPageFilters) {
	if (filters.goalId && goal.id !== filters.goalId) {
		return false;
	}

	if (filters.projectId && !goalMatchesProject(goal, data, filters.projectId)) {
		return false;
	}

	if (filters.workerId) {
		return data.tasks.some(
			(task) => task.goalId === goal.id && task.assigneeWorkerId === filters.workerId
		);
	}

	return true;
}

function taskMatchesFilters(task: Task, filters: PlanningPageFilters) {
	if (filters.goalId && task.goalId !== filters.goalId) {
		return false;
	}

	if (filters.projectId && task.projectId !== filters.projectId) {
		return false;
	}

	if (filters.workerId && task.assigneeWorkerId !== filters.workerId) {
		return false;
	}

	return true;
}

function uniqueTasks(tasks: Task[]) {
	const seen = new Set<string>();

	return tasks.filter((task) => {
		if (seen.has(task.id)) {
			return false;
		}

		seen.add(task.id);
		return true;
	});
}

export function buildPlanningPageData(data: ControlPlaneData, filters: PlanningPageFilters) {
	const goalMap = new Map(data.goals.map((goal) => [goal.id, goal]));
	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const workerMap = new Map(data.workers.map((worker) => [worker.id, worker]));
	const includeUnscheduled = filters.includeUnscheduled ?? true;
	const matchingGoals = data.goals.filter((goal) => goalMatchesFilters(goal, data, filters));
	const matchingGoalIds = new Set(matchingGoals.map((goal) => goal.id));
	const scheduledTasks = sortTasks(
		data.tasks.filter(
			(task) =>
				taskMatchesFilters(task, filters) &&
				isDateInWindow(task.targetDate, filters.startDate, filters.endDate)
		)
	);
	const scheduledGoalIds = new Set(scheduledTasks.map((task) => task.goalId).filter(Boolean));
	const unscheduledTasks = includeUnscheduled
		? sortTasks(
				uniqueTasks(
					data.tasks.filter((task) => {
						if (!taskMatchesFilters(task, filters) || task.targetDate || task.status === 'done') {
							return false;
						}

						if (!task.goalId || !matchingGoalIds.has(task.goalId)) {
							return Boolean(filters.projectId || filters.workerId);
						}

						if (filters.goalId || filters.projectId || filters.workerId) {
							return true;
						}

						return isDateInWindow(
							goalMap.get(task.goalId)?.targetDate,
							filters.startDate,
							filters.endDate
						);
					})
				)
			)
		: [];
	const scheduledOpenTasks = scheduledTasks.filter((task) => task.status !== 'done');
	const inScopeTasks = uniqueTasks([...scheduledTasks, ...unscheduledTasks]);
	const inScopeGoalIds = new Set(
		[
			...scheduledGoalIds,
			...unscheduledTasks.map((task) => task.goalId).filter(Boolean),
			...matchingGoals
				.filter((goal) => isDateInWindow(goal.targetDate, filters.startDate, filters.endDate))
				.map((goal) => goal.id)
		].filter(Boolean)
	);
	const goalsInScope = [...matchingGoals]
		.filter((goal) => inScopeGoalIds.has(goal.id))
		.sort((left, right) => {
			if ((right.planningPriority ?? 0) !== (left.planningPriority ?? 0)) {
				return (right.planningPriority ?? 0) - (left.planningPriority ?? 0);
			}

			const leftDate = left.targetDate ?? '9999-12-31';
			const rightDate = right.targetDate ?? '9999-12-31';

			if (leftDate !== rightDate) {
				return leftDate.localeCompare(rightDate);
			}

			return left.name.localeCompare(right.name);
		});
	const goalTaskMap = new Map(
		goalsInScope.map((goal) => [goal.id, inScopeTasks.filter((task) => task.goalId === goal.id)])
	);
	const workerLoads = data.workers
		.map((worker) => {
			const plannedHours = scheduledOpenTasks.reduce((total, task) => {
				if (task.assigneeWorkerId !== worker.id) {
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
		})
		.sort((left, right) => left.name.localeCompare(right.name));
	const totalCapacityHours = workerLoads.reduce((total, worker) => total + worker.capacityHours, 0);
	const plannedHours = scheduledOpenTasks.reduce(
		(total, task) => total + (task.estimateHours ?? 0),
		0
	);

	return {
		filters: {
			startDate: filters.startDate,
			endDate: filters.endDate,
			projectId: filters.projectId ?? '',
			goalId: filters.goalId ?? '',
			workerId: filters.workerId ?? '',
			includeUnscheduled
		},
		metrics: {
			goalCount: goalsInScope.length,
			taskCount: inScopeTasks.length,
			scheduledTaskCount: scheduledTasks.length,
			plannedHours,
			totalCapacityHours,
			remainingCapacityHours: totalCapacityHours - plannedHours,
			overAllocatedWorkerCount: workerLoads.filter((worker) => worker.overAllocated).length,
			unestimatedTaskCount: inScopeTasks.filter(
				(task) => task.status !== 'done' && task.estimateHours === null
			).length,
			unscheduledTaskCount: unscheduledTasks.length
		},
		goalsInScope: goalsInScope.map((goal): PlanningGoalSummary => {
			const goalTasks = goalTaskMap.get(goal.id) ?? [];
			const scheduledGoalTasks = goalTasks.filter((task) => Boolean(task.targetDate));
			const unscheduledGoalTasks = goalTasks.filter((task) => !task.targetDate);

			return {
				id: goal.id,
				name: goal.name,
				status: goal.status,
				summary: goal.summary,
				area: goal.area,
				confidence: goal.confidence ?? 'medium',
				planningPriority: goal.planningPriority ?? 0,
				targetDate: goal.targetDate ?? null,
				linkedProjectNames: (goal.projectIds ?? [])
					.map((projectId) => projectMap.get(projectId)?.name)
					.filter((name): name is string => Boolean(name)),
				taskCount: goalTasks.length,
				scheduledTaskCount: scheduledGoalTasks.length,
				unscheduledTaskCount: unscheduledGoalTasks.length,
				plannedHours: scheduledGoalTasks
					.filter((task) => task.status !== 'done')
					.reduce((total, task) => total + (task.estimateHours ?? 0), 0),
				unestimatedTaskCount: goalTasks.filter(
					(task) => task.status !== 'done' && task.estimateHours === null
				).length
			};
		}),
		scheduledTasks: scheduledTasks.map((task): PlanningTaskSummary => {
			const workerSuggestions = getWorkerAssignmentSuggestions(data, task);
			const eligibleSuggestions = workerSuggestions.filter((suggestion) => suggestion.eligible);
			const assignedWorkerSuggestion = task.assigneeWorkerId
				? (workerSuggestions.find((suggestion) => suggestion.workerId === task.assigneeWorkerId) ??
					null)
				: null;

			return {
				id: task.id,
				title: task.title,
				status: task.status,
				projectName: projectMap.get(task.projectId)?.name ?? 'Unknown project',
				goalId: task.goalId,
				goalName: task.goalId ? (goalMap.get(task.goalId)?.name ?? 'Unknown goal') : 'No goal',
				assigneeName: task.assigneeWorkerId
					? (workerMap.get(task.assigneeWorkerId)?.name ?? 'Unknown worker')
					: 'Unassigned',
				estimateHours: task.estimateHours ?? null,
				targetDate: task.targetDate ?? null,
				blockedReason: task.blockedReason,
				requiredCapabilityNames: task.requiredCapabilityNames ?? [],
				requiredToolNames: task.requiredToolNames ?? [],
				eligibleWorkerCount: eligibleSuggestions.length,
				suggestedWorkerNames: eligibleSuggestions
					.slice(0, 3)
					.map((suggestion) => suggestion.workerName),
				assignedWorkerEligible: assignedWorkerSuggestion ? assignedWorkerSuggestion.eligible : null
			};
		}),
		unscheduledTasks: unscheduledTasks.map((task): PlanningTaskSummary => {
			const workerSuggestions = getWorkerAssignmentSuggestions(data, task);
			const eligibleSuggestions = workerSuggestions.filter((suggestion) => suggestion.eligible);
			const assignedWorkerSuggestion = task.assigneeWorkerId
				? (workerSuggestions.find((suggestion) => suggestion.workerId === task.assigneeWorkerId) ??
					null)
				: null;

			return {
				id: task.id,
				title: task.title,
				status: task.status,
				projectName: projectMap.get(task.projectId)?.name ?? 'Unknown project',
				goalId: task.goalId,
				goalName: task.goalId ? (goalMap.get(task.goalId)?.name ?? 'Unknown goal') : 'No goal',
				assigneeName: task.assigneeWorkerId
					? (workerMap.get(task.assigneeWorkerId)?.name ?? 'Unknown worker')
					: 'Unassigned',
				estimateHours: task.estimateHours ?? null,
				targetDate: null,
				blockedReason: task.blockedReason,
				requiredCapabilityNames: task.requiredCapabilityNames ?? [],
				requiredToolNames: task.requiredToolNames ?? [],
				eligibleWorkerCount: eligibleSuggestions.length,
				suggestedWorkerNames: eligibleSuggestions
					.slice(0, 3)
					.map((suggestion) => suggestion.workerName),
				assignedWorkerEligible: assignedWorkerSuggestion ? assignedWorkerSuggestion.eligible : null
			};
		}),
		workerLoads,
		projectOptions: [...data.projects]
			.sort((left, right) => left.name.localeCompare(right.name))
			.map((project) => ({
				id: project.id,
				name: project.name
			})),
		goalOptions: [...data.goals]
			.sort((left, right) => left.name.localeCompare(right.name))
			.map((goal) => ({
				id: goal.id,
				name: goal.name
			})),
		workerOptions: [...data.workers]
			.sort((left, right) => left.name.localeCompare(right.name))
			.map((worker) => ({
				id: worker.id,
				name: worker.name
			}))
	};
}
