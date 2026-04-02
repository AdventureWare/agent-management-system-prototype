import type { ControlPlaneData, Goal, Project, Task } from '$lib/types/control-plane';

function uniqueIds(ids: Iterable<string>) {
	return [...new Set([...ids].filter((id) => id.trim().length > 0))];
}

export function getGoalLinkedTaskIds(data: ControlPlaneData, goal: Goal) {
	return uniqueIds([
		...(goal.taskIds ?? []),
		...data.tasks.filter((task) => task.goalId === goal.id).map((task) => task.id)
	]);
}

export function getGoalLinkedTasks(data: ControlPlaneData, goal: Goal) {
	const linkedTaskIds = new Set(getGoalLinkedTaskIds(data, goal));

	return data.tasks.filter((task) => linkedTaskIds.has(task.id));
}

export function getGoalLinkedProjectIds(data: ControlPlaneData, goal: Goal) {
	return uniqueIds([
		...(goal.projectIds ?? []),
		...getGoalLinkedTasks(data, goal)
			.map((task) => task.projectId)
			.filter((projectId) => projectId.length > 0)
	]);
}

export function getGoalLinkedProjects(data: ControlPlaneData, goal: Goal) {
	const linkedProjectIds = new Set(getGoalLinkedProjectIds(data, goal));

	return data.projects.filter((project) => linkedProjectIds.has(project.id));
}

export function getGoalChildGoals(data: ControlPlaneData, goalId: string) {
	return data.goals.filter((goal) => goal.parentGoalId === goalId);
}

export function getGoalDescendantGoalIds(data: ControlPlaneData, goalId: string) {
	const descendantGoalIds: string[] = [];
	const queue = getGoalChildGoals(data, goalId).map((goal) => goal.id);
	const visitedGoalIds = new Set<string>();

	while (queue.length > 0) {
		const nextGoalId = queue.shift();

		if (!nextGoalId || visitedGoalIds.has(nextGoalId)) {
			continue;
		}

		visitedGoalIds.add(nextGoalId);
		descendantGoalIds.push(nextGoalId);

		for (const childGoal of getGoalChildGoals(data, nextGoalId)) {
			queue.push(childGoal.id);
		}
	}

	return descendantGoalIds;
}

function getGoalScopeGoals(data: ControlPlaneData, goalId: string) {
	const scopedGoalIds = [goalId, ...getGoalDescendantGoalIds(data, goalId)];
	const scopedGoalIdSet = new Set(scopedGoalIds);

	return data.goals.filter((goal) => scopedGoalIdSet.has(goal.id));
}

export function getGoalScopeTaskIds(data: ControlPlaneData, goalId: string) {
	return uniqueIds(
		getGoalScopeGoals(data, goalId).flatMap((goal) => getGoalLinkedTaskIds(data, goal))
	);
}

export function getGoalScopeProjectIds(data: ControlPlaneData, goalId: string) {
	return uniqueIds(
		getGoalScopeGoals(data, goalId).flatMap((goal) => getGoalLinkedProjectIds(data, goal))
	);
}

export function wouldCreateGoalCycle(
	data: ControlPlaneData,
	goalId: string,
	parentGoalId: string | null
) {
	if (!parentGoalId || parentGoalId === goalId) {
		return parentGoalId === goalId;
	}

	let currentParentId: string | null = parentGoalId;

	while (currentParentId) {
		if (currentParentId === goalId) {
			return true;
		}

		currentParentId =
			data.goals.find((candidate) => candidate.id === currentParentId)?.parentGoalId ?? null;
	}

	return false;
}

export function suggestGoalArtifactPath(args: {
	data: ControlPlaneData;
	parentGoalId: string | null;
	projectIds: string[];
	taskIds: string[];
}) {
	const selectedTaskProjectIds = args.taskIds
		.map((taskId) => args.data.tasks.find((task) => task.id === taskId)?.projectId ?? '')
		.filter((projectId) => projectId.length > 0);
	const candidateProjectIds = uniqueIds([...args.projectIds, ...selectedTaskProjectIds]);

	for (const projectId of candidateProjectIds) {
		const project = args.data.projects.find((candidate) => candidate.id === projectId);

		if (!project) {
			continue;
		}

		if (project.defaultArtifactRoot) {
			return project.defaultArtifactRoot;
		}

		if (project.projectRootFolder) {
			return project.projectRootFolder;
		}
	}

	if (args.parentGoalId) {
		return args.data.goals.find((goal) => goal.id === args.parentGoalId)?.artifactPath.trim() ?? '';
	}

	return '';
}

export function applyGoalRelationships(args: {
	data: ControlPlaneData;
	goalId: string;
	parentGoalId: string | null;
	projectIds: string[];
	taskIds: string[];
}) {
	const taskIds = uniqueIds(args.taskIds);
	const taskIdSet = new Set(taskIds);
	const selectedTasks = args.data.tasks.filter((task) => taskIdSet.has(task.id));
	const linkedProjectIds = uniqueIds([
		...args.projectIds,
		...selectedTasks.map((task) => task.projectId).filter((projectId) => projectId.length > 0)
	]);
	const linkedTaskIdSet = new Set(taskIds);
	const now = new Date().toISOString();

	return {
		...args.data,
		goals: args.data.goals.map((goal) => {
			if (goal.id === args.goalId) {
				return {
					...goal,
					parentGoalId: args.parentGoalId,
					projectIds: linkedProjectIds,
					taskIds
				};
			}

			if (!(goal.taskIds ?? []).some((taskId) => linkedTaskIdSet.has(taskId))) {
				return goal;
			}

			return {
				...goal,
				taskIds: (goal.taskIds ?? []).filter((taskId) => !linkedTaskIdSet.has(taskId))
			};
		}),
		tasks: args.data.tasks.map((task) => {
			if (taskIdSet.has(task.id) && task.goalId !== args.goalId) {
				return {
					...task,
					goalId: args.goalId,
					updatedAt: now
				};
			}

			if (!taskIdSet.has(task.id) && task.goalId === args.goalId) {
				return {
					...task,
					goalId: '',
					updatedAt: now
				};
			}

			return task;
		})
	};
}

export function sortProjectsByName(projects: Project[]) {
	return [...projects].sort((left, right) => left.name.localeCompare(right.name));
}

export function sortGoalsByName(goals: Goal[]) {
	return [...goals].sort((left, right) => left.name.localeCompare(right.name));
}

export function sortTasksByTitle(tasks: Task[]) {
	return [...tasks].sort((left, right) => left.title.localeCompare(right.title));
}
