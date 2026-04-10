import type { ControlPlaneData, Goal, Task, ExecutionSurface } from '$lib/types/control-plane';
import { getExecutionSurfaceAssignmentSuggestions } from '$lib/server/execution-surface-api';
import { getProjectChildProjects, getProjectScopeProjectIds } from '$lib/server/control-plane';

const FALLBACK_CAPACITY_HOURS_PER_SLOT = 20;

type PlanningPageFilters = {
	startDate: string;
	endDate: string;
	projectId?: string | null;
	goalId?: string | null;
	executionSurfaceId?: string | null;
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
	priority: Task['priority'];
	riskLevel: Task['riskLevel'];
	projectName: string;
	goalId: string;
	goalName: string;
	assigneeName: string;
	estimateHours: number | null;
	targetDate: string | null;
	blockedReason: string;
	requiredCapabilityNames: string[];
	requiredToolNames: string[];
	eligibleExecutionSurfaceCount: number;
	suggestedExecutionSurfaceNames: string[];
	assignedExecutionSurfaceEligible: boolean | null;
};

type PlanningBacklogBucketId = 'now' | 'next' | 'later';

type PlanningBacklogItem = PlanningTaskSummary & {
	bucket: PlanningBacklogBucketId;
	score: number;
	priorityReasons: string[];
};

type PlanningBacklogBucket = {
	id: PlanningBacklogBucketId;
	label: string;
	description: string;
	items: PlanningBacklogItem[];
};

const PRIORITY_WEIGHTS: Record<Task['priority'], number> = {
	low: 0,
	medium: 2,
	high: 5,
	urgent: 8
};

const STATUS_WEIGHTS: Record<Task['status'], number> = {
	in_draft: 0,
	ready: 4,
	in_progress: 7,
	review: 6,
	blocked: -8,
	done: -20
};

function getExecutionSurfaceCapacityHours(executionSurface: ExecutionSurface) {
	return (
		(executionSurface.weeklyCapacityHours ??
			executionSurface.capacity * FALLBACK_CAPACITY_HOURS_PER_SLOT) *
		(executionSurface.focusFactor ?? 1)
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

function addDays(date: string, days: number) {
	const next = new Date(`${date}T12:00:00`);
	next.setDate(next.getDate() + days);
	return next.toISOString().slice(0, 10);
}

function compareTaskSummaries(left: PlanningTaskSummary, right: PlanningTaskSummary) {
	const leftDate = left.targetDate ?? '9999-12-31';
	const rightDate = right.targetDate ?? '9999-12-31';

	if (leftDate !== rightDate) {
		return leftDate.localeCompare(rightDate);
	}

	return left.title.localeCompare(right.title);
}

function mapPlanningTaskSummary(
	task: Task,
	data: ControlPlaneData,
	goalMap: ReadonlyMap<string, Goal>,
	projectMap: ReadonlyMap<string, { name: string }>,
	executionSurfaceMap: ReadonlyMap<string, ExecutionSurface>
): PlanningTaskSummary {
	const executionSurfaceSuggestions = getExecutionSurfaceAssignmentSuggestions(data, task);
	const eligibleSuggestions = executionSurfaceSuggestions.filter(
		(suggestion) => suggestion.eligible
	);
	const assignedExecutionSurfaceSuggestion = task.assigneeExecutionSurfaceId
		? (executionSurfaceSuggestions.find(
				(suggestion) => suggestion.executionSurfaceId === task.assigneeExecutionSurfaceId
			) ?? null)
		: null;

	return {
		id: task.id,
		title: task.title,
		status: task.status,
		priority: task.priority,
		riskLevel: task.riskLevel,
		projectName: projectMap.get(task.projectId)?.name ?? 'Unknown project',
		goalId: task.goalId,
		goalName: task.goalId ? (goalMap.get(task.goalId)?.name ?? 'Unknown goal') : 'No goal',
		assigneeName: task.assigneeExecutionSurfaceId
			? (executionSurfaceMap.get(task.assigneeExecutionSurfaceId)?.name ??
				'Unknown execution surface')
			: 'Unassigned',
		estimateHours: task.estimateHours ?? null,
		targetDate: task.targetDate ?? null,
		blockedReason: task.blockedReason,
		requiredCapabilityNames: task.requiredCapabilityNames ?? [],
		requiredToolNames: task.requiredToolNames ?? [],
		eligibleExecutionSurfaceCount: eligibleSuggestions.length,
		suggestedExecutionSurfaceNames: eligibleSuggestions
			.slice(0, 3)
			.map((suggestion) => suggestion.executionSurfaceName),
		assignedExecutionSurfaceEligible: assignedExecutionSurfaceSuggestion
			? assignedExecutionSurfaceSuggestion.eligible
			: null
	};
}

function summarizeTaskNames(tasks: Task[]) {
	if (tasks.length === 0) {
		return '';
	}

	if (tasks.length === 1) {
		return tasks[0]?.title ?? '';
	}

	if (tasks.length === 2) {
		return `${tasks[0]?.title ?? ''} and ${tasks[1]?.title ?? ''}`;
	}

	return `${tasks[0]?.title ?? ''}, ${tasks[1]?.title ?? ''}, and ${tasks.length - 2} more`;
}

function buildBacklogItem(input: {
	task: Task;
	taskSummary: PlanningTaskSummary;
	goal: Goal | null;
	referenceDate: string;
	taskMap: ReadonlyMap<string, Task>;
	dependentTaskCount: number;
}) {
	const { task, taskSummary, goal, referenceDate, taskMap, dependentTaskCount } = input;
	const openDependencies = task.dependencyTaskIds
		.map((dependencyTaskId) => taskMap.get(dependencyTaskId) ?? null)
		.filter((dependencyTask): dependencyTask is Task => Boolean(dependencyTask))
		.filter((dependencyTask) => dependencyTask.status !== 'done');
	const reasons: string[] = [];
	let score =
		(PRIORITY_WEIGHTS[task.priority] ?? 0) +
		(STATUS_WEIGHTS[task.status] ?? 0) +
		(goal?.planningPriority ?? 0) * 2;
	const targetDate = task.targetDate ?? null;
	const goalTargetDate = goal?.targetDate ?? null;
	const dueSoonCutoff = addDays(referenceDate, 2);
	const goalDueSoonCutoff = addDays(referenceDate, 7);
	const lacksExecutableSurface = taskSummary.eligibleExecutionSurfaceCount === 0;
	const isBlocked =
		task.status === 'blocked' ||
		task.blockedReason.trim().length > 0 ||
		openDependencies.length > 0;

	if (task.status === 'in_progress') {
		reasons.push('Urgency: already in progress, so finishing it first avoids churn.');
	}

	if (task.status === 'review') {
		reasons.push('Urgency: already waiting on review, so it is close to done.');
	}

	if (targetDate) {
		if (targetDate <= referenceDate) {
			score += 8;
			reasons.push(`Urgency: due ${targetDate}.`);
		} else if (targetDate <= dueSoonCutoff) {
			score += 6;
			reasons.push(`Urgency: due soon on ${targetDate}.`);
		} else {
			score += 3;
		}
	} else {
		score -= 1;
	}

	if (!targetDate && goalTargetDate && goalTargetDate <= goalDueSoonCutoff) {
		score += 4;
		reasons.push(`Urgency: supports goal due ${goalTargetDate}.`);
	}

	if (dependentTaskCount > 0) {
		score += Math.min(6, dependentTaskCount * 2);
		reasons.push(
			`Leverage: unblocks ${dependentTaskCount} dependent task${dependentTaskCount === 1 ? '' : 's'}.`
		);
	}

	if (task.riskLevel === 'high') {
		score += 3;
		reasons.push('Risk: high-risk work needs slack for iteration.');
	} else if (task.riskLevel === 'medium') {
		score += 1;
	}

	if (goal && (goal.planningPriority ?? 0) >= 3) {
		reasons.push(
			`Leverage: supports planning priority ${goal.planningPriority} goal ${goal.name}.`
		);
	}

	if (task.blockedReason.trim()) {
		score -= 10;
		reasons.push(`Deferral: ${task.blockedReason.trim()}.`);
	}

	if (openDependencies.length > 0) {
		score -= 8;
		reasons.push(`Dependency order: waits on ${summarizeTaskNames(openDependencies)}.`);
	}

	if (lacksExecutableSurface) {
		score -= 6;
		reasons.push('Risk: no matching execution surface can run this yet.');
	}

	let bucket: PlanningBacklogBucketId = 'later';

	if (isBlocked || lacksExecutableSurface) {
		bucket = 'later';
	} else if (
		task.status === 'in_progress' ||
		task.status === 'review' ||
		(targetDate !== null && targetDate <= dueSoonCutoff) ||
		score >= 15
	) {
		bucket = 'now';
	} else if (
		score >= 7 ||
		targetDate !== null ||
		task.priority !== 'low' ||
		dependentTaskCount > 0
	) {
		bucket = 'next';
	} else {
		bucket = 'later';
	}

	if (bucket === 'next' && reasons.every((reason) => !reason.startsWith('Deferral:'))) {
		reasons.push('Deferral: important, but it follows the current now commitments.');
	}

	if (
		bucket === 'later' &&
		reasons.every((reason) => !reason.startsWith('Deferral:')) &&
		!targetDate
	) {
		reasons.push('Deferral: no target date or active pull signal yet.');
	}

	return {
		...taskSummary,
		bucket,
		score,
		priorityReasons: reasons.slice(0, 3)
	} satisfies PlanningBacklogItem;
}

function goalMatchesProject(
	goal: Goal,
	data: ControlPlaneData,
	projectScopeIds: ReadonlySet<string>
) {
	if ((goal.projectIds ?? []).some((projectId) => projectScopeIds.has(projectId))) {
		return true;
	}

	return data.tasks.some((task) => task.goalId === goal.id && projectScopeIds.has(task.projectId));
}

function goalMatchesFilters(
	goal: Goal,
	data: ControlPlaneData,
	filters: PlanningPageFilters,
	projectScopeIds: ReadonlySet<string> | null
) {
	if (filters.goalId && goal.id !== filters.goalId) {
		return false;
	}

	if (projectScopeIds && !goalMatchesProject(goal, data, projectScopeIds)) {
		return false;
	}

	if (filters.executionSurfaceId) {
		return data.tasks.some(
			(task) =>
				task.goalId === goal.id && task.assigneeExecutionSurfaceId === filters.executionSurfaceId
		);
	}

	return true;
}

function taskMatchesFilters(
	task: Task,
	filters: PlanningPageFilters,
	projectScopeIds: ReadonlySet<string> | null
) {
	if (filters.goalId && task.goalId !== filters.goalId) {
		return false;
	}

	if (projectScopeIds && !projectScopeIds.has(task.projectId)) {
		return false;
	}

	if (
		filters.executionSurfaceId &&
		task.assigneeExecutionSurfaceId !== filters.executionSurfaceId
	) {
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
	const projectScopeIds = filters.projectId
		? new Set(getProjectScopeProjectIds(data.projects, filters.projectId))
		: null;
	const goalMap = new Map(data.goals.map((goal) => [goal.id, goal]));
	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const executionSurfaceMap = new Map(
		data.executionSurfaces.map((executionSurface) => [executionSurface.id, executionSurface])
	);
	const includeUnscheduled = filters.includeUnscheduled ?? true;
	const matchingGoals = data.goals.filter((goal) =>
		goalMatchesFilters(goal, data, filters, projectScopeIds)
	);
	const matchingGoalIds = new Set(matchingGoals.map((goal) => goal.id));
	const scheduledTasks = sortTasks(
		data.tasks.filter(
			(task) =>
				taskMatchesFilters(task, filters, projectScopeIds) &&
				isDateInWindow(task.targetDate, filters.startDate, filters.endDate)
		)
	);
	const scheduledGoalIds = new Set(scheduledTasks.map((task) => task.goalId).filter(Boolean));
	const unscheduledTasks = includeUnscheduled
		? sortTasks(
				uniqueTasks(
					data.tasks.filter((task) => {
						if (
							!taskMatchesFilters(task, filters, projectScopeIds) ||
							task.targetDate ||
							task.status === 'done'
						) {
							return false;
						}

						if (!task.goalId || !matchingGoalIds.has(task.goalId)) {
							return Boolean(filters.projectId || filters.executionSurfaceId);
						}

						if (filters.goalId || filters.projectId || filters.executionSurfaceId) {
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
	const openInScopeTasks = inScopeTasks.filter((task) => task.status !== 'done');
	const taskMap = new Map(data.tasks.map((task) => [task.id, task]));
	const dependentTaskCounts = new Map<string, number>();
	for (const candidate of data.tasks) {
		for (const dependencyTaskId of candidate.dependencyTaskIds) {
			dependentTaskCounts.set(
				dependencyTaskId,
				(dependentTaskCounts.get(dependencyTaskId) ?? 0) + (candidate.status === 'done' ? 0 : 1)
			);
		}
	}
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
	const scheduledTaskSummaries = scheduledTasks
		.map((task) => mapPlanningTaskSummary(task, data, goalMap, projectMap, executionSurfaceMap))
		.sort(compareTaskSummaries);
	const unscheduledTaskSummaries = unscheduledTasks
		.map((task) => mapPlanningTaskSummary(task, data, goalMap, projectMap, executionSurfaceMap))
		.sort(compareTaskSummaries);
	const taskSummaryMap = new Map(
		[...scheduledTaskSummaries, ...unscheduledTaskSummaries].map((task) => [task.id, task])
	);
	const backlogItems = openInScopeTasks
		.map((task) =>
			buildBacklogItem({
				task,
				taskSummary:
					taskSummaryMap.get(task.id) ??
					mapPlanningTaskSummary(task, data, goalMap, projectMap, executionSurfaceMap),
				goal: task.goalId ? (goalMap.get(task.goalId) ?? null) : null,
				referenceDate: filters.startDate,
				taskMap,
				dependentTaskCount: dependentTaskCounts.get(task.id) ?? 0
			})
		)
		.sort((left, right) => {
			if (right.score !== left.score) {
				return right.score - left.score;
			}

			return compareTaskSummaries(left, right);
		});
	const backlogBuckets: PlanningBacklogBucket[] = [
		{
			id: 'now',
			label: 'Now',
			description:
				'Active or near-due work that should be protected before pulling new commitments.',
			items: backlogItems.filter((item) => item.bucket === 'now')
		},
		{
			id: 'next',
			label: 'Next',
			description: 'Ready follow-on work that should move after the current now set clears.',
			items: backlogItems.filter((item) => item.bucket === 'next')
		},
		{
			id: 'later',
			label: 'Later',
			description: 'Deferred, blocked, or lower-pull work that still belongs in view.',
			items: backlogItems.filter((item) => item.bucket === 'later')
		}
	];
	const executionSurfaceLoads = data.executionSurfaces
		.map((executionSurface) => {
			const plannedHours = scheduledOpenTasks.reduce((total, task) => {
				if (task.assigneeExecutionSurfaceId !== executionSurface.id) {
					return total;
				}

				return total + (task.estimateHours ?? 0);
			}, 0);
			const capacityHours = getExecutionSurfaceCapacityHours(executionSurface);

			return {
				id: executionSurface.id,
				name: executionSurface.name,
				status: executionSurface.status,
				capacityHours,
				plannedHours,
				remainingHours: capacityHours - plannedHours,
				overAllocated: plannedHours > capacityHours
			};
		})
		.sort((left, right) => left.name.localeCompare(right.name));
	const totalCapacityHours = executionSurfaceLoads.reduce(
		(total, executionSurface) => total + executionSurface.capacityHours,
		0
	);
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
			executionSurfaceId: filters.executionSurfaceId ?? '',
			includeUnscheduled
		},
		metrics: {
			goalCount: goalsInScope.length,
			taskCount: inScopeTasks.length,
			scheduledTaskCount: scheduledTasks.length,
			plannedHours,
			totalCapacityHours,
			remainingCapacityHours: totalCapacityHours - plannedHours,
			overAllocatedExecutionSurfaceCount: executionSurfaceLoads.filter(
				(executionSurface) => executionSurface.overAllocated
			).length,
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
		backlogBuckets,
		scheduledTasks: scheduledTaskSummaries,
		unscheduledTasks: unscheduledTaskSummaries,
		executionSurfaceLoads,
		projectOptions: [...data.projects]
			.sort((left, right) => left.name.localeCompare(right.name))
			.map((project) => ({
				id: project.id,
				name:
					getProjectChildProjects(data.projects, project.id).length > 0
						? `${project.name} (includes subprojects)`
						: project.name
			})),
		goalOptions: [...data.goals]
			.sort((left, right) => left.name.localeCompare(right.name))
			.map((goal) => ({
				id: goal.id,
				name: goal.name
			})),
		executionSurfaceOptions: [...data.executionSurfaces]
			.sort((left, right) => left.name.localeCompare(right.name))
			.map((executionSurface) => ({
				id: executionSurface.id,
				name: executionSurface.name
			}))
	};
}
