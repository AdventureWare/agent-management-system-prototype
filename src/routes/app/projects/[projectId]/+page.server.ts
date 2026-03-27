import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	formatRelativeTime,
	loadControlPlane,
	projectMatchesPath,
	taskHasUnmetDependencies
} from '$lib/server/control-plane';

export const load: PageServerLoad = async ({ params }) => {
	const data = await loadControlPlane();
	const project = data.projects.find((candidate) => candidate.id === params.projectId);

	if (!project) {
		throw error(404, 'Project not found.');
	}

	const workerMap = new Map(data.workers.map((worker) => [worker.id, worker]));
	const goalMap = new Map(data.goals.map((goal) => [goal.id, goal]));
	const relatedTasks = data.tasks
		.filter((task) => task.projectId === project.id)
		.map((task) => ({
			...task,
			goalName: task.goalId ? (goalMap.get(task.goalId)?.name ?? 'Unknown goal') : 'No goal',
			assigneeName: task.assigneeWorkerId
				? (workerMap.get(task.assigneeWorkerId)?.name ?? 'Unknown worker')
				: 'Unassigned',
			hasUnmetDependencies: taskHasUnmetDependencies(data, task),
			updatedAtLabel: formatRelativeTime(task.updatedAt)
		}))
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	const relatedGoalIds = new Set(
		relatedTasks.map((task) => task.goalId).filter((goalId) => goalId.length > 0)
	);
	const relatedGoals = data.goals
		.filter((goal) => relatedGoalIds.has(goal.id) || projectMatchesPath(project, goal.artifactPath))
		.map((goal) => ({
			...goal,
			taskCount: relatedTasks.filter((task) => task.goalId === goal.id).length
		}))
		.sort((a, b) => a.name.localeCompare(b.name));

	return {
		project,
		relatedGoals,
		relatedTasks,
		metrics: {
			totalTasks: relatedTasks.length,
			activeTasks: relatedTasks.filter((task) =>
				['ready', 'running', 'review', 'blocked'].includes(task.status)
			).length,
			reviewTasks: relatedTasks.filter((task) => task.status === 'review').length,
			blockedTasks: relatedTasks.filter(
				(task) => task.status === 'blocked' || task.hasUnmetDependencies
			).length,
			goalCount: relatedGoals.length
		}
	};
};
