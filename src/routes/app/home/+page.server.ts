import { listAgentSessions, summarizeAgentSessions } from '$lib/server/agent-sessions';
import { loadControlPlane, summarizeControlPlane, taskHasUnmetDependencies } from '$lib/server/control-plane';

export const load = async () => {
	const sessions = await listAgentSessions();
	const controlPlane = await loadControlPlane();
	const taskMap = new Map(controlPlane.tasks.map((task) => [task.id, task]));

	const taskAttention = [...controlPlane.tasks]
		.map((task) => ({
			...task,
			goalName: controlPlane.goals.find((goal) => goal.id === task.goalId)?.name ?? 'Unknown goal',
			assigneeName: task.assigneeWorkerId
				? (controlPlane.workers.find((worker) => worker.id === task.assigneeWorkerId)?.name ??
					'Unknown worker')
				: 'Unassigned',
			hasUnmetDependencies: taskHasUnmetDependencies(controlPlane, task),
			dependencyTaskNames: task.dependencyTaskIds.map(
				(dependencyTaskId) => taskMap.get(dependencyTaskId)?.title ?? dependencyTaskId
			)
		}))
		.filter(
			(task) =>
				task.status === 'blocked' ||
				(task.status === 'review' && task.requiresReview) ||
				task.hasUnmetDependencies
		)
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
		.slice(0, 6);

	return {
		sessions,
		sessionSummary: summarizeAgentSessions(sessions),
		controlSummary: summarizeControlPlane(controlPlane),
		taskAttention
	};
};
