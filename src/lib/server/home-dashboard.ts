import { listAgentSessions, summarizeAgentSessions } from '$lib/server/agent-sessions';
import {
	getOpenReviewForTask,
	getPendingApprovalForTask,
	loadControlPlane,
	summarizeControlPlane,
	taskHasUnmetDependencies
} from '$lib/server/control-plane';
import type { HomeDashboardData } from '$lib/types/home-dashboard';

export async function loadHomeDashboardData(): Promise<HomeDashboardData> {
	const sessions = await listAgentSessions();
	const controlPlane = await loadControlPlane();
	const taskMap = new Map(controlPlane.tasks.map((task) => [task.id, task]));
	const projectMap = new Map(controlPlane.projects.map((project) => [project.id, project]));

	const taskAttention = [...controlPlane.tasks]
		.map((task) => ({
			...task,
			goalName: controlPlane.goals.find((goal) => goal.id === task.goalId)?.name ?? 'Unknown goal',
			projectName: projectMap.get(task.projectId)?.name ?? 'No project',
			assigneeName: task.assigneeWorkerId
				? (controlPlane.workers.find((worker) => worker.id === task.assigneeWorkerId)?.name ??
					'Unknown worker')
				: 'Unassigned',
			openReview: getOpenReviewForTask(controlPlane, task.id) ?? null,
			pendingApproval: getPendingApprovalForTask(controlPlane, task.id) ?? null,
			hasUnmetDependencies: taskHasUnmetDependencies(controlPlane, task),
			dependencyTaskNames: task.dependencyTaskIds.map(
				(dependencyTaskId) => taskMap.get(dependencyTaskId)?.title ?? dependencyTaskId
			)
		}))
		.filter(
			(task) =>
				task.status === 'blocked' ||
				Boolean(task.openReview) ||
				Boolean(task.pendingApproval) ||
				task.hasUnmetDependencies
		)
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
		.slice(0, 6);

	return {
		sessions,
		sessionSummary: summarizeAgentSessions(sessions),
		controlSummary: summarizeControlPlane(controlPlane),
		taskAttention
	};
}
