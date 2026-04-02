import { listAgentSessions, summarizeAgentSessions } from '$lib/server/agent-sessions';
import { loadControlPlane, summarizeControlPlane } from '$lib/server/control-plane';
import { loadSelfImprovementSnapshot } from '$lib/server/self-improvement-store';
import {
	buildTaskWorkItems,
	selectStaleTaskWorkItems,
	summarizeTaskFreshness
} from '$lib/server/task-work-items';
import type { HomeDashboardData } from '$lib/types/home-dashboard';

export async function loadHomeDashboardData(): Promise<HomeDashboardData> {
	const sessions = await listAgentSessions();
	const controlPlane = await loadControlPlane();
	const selfImprovement = await loadSelfImprovementSnapshot({
		data: controlPlane,
		sessions
	});
	const taskMap = new Map(controlPlane.tasks.map((task) => [task.id, task]));
	const taskWorkItems = buildTaskWorkItems(controlPlane, sessions);
	const dashboardTasks = taskWorkItems.map((task) => ({
		...task,
		goalName: controlPlane.goals.find((goal) => goal.id === task.goalId)?.name ?? 'Unknown goal',
		dependencyTaskNames: task.dependencyTaskIds.map(
			(dependencyTaskId) => taskMap.get(dependencyTaskId)?.title ?? dependencyTaskId
		)
	}));
	const taskAttention = dashboardTasks
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
		taskAttention,
		staleTaskSummary: summarizeTaskFreshness(taskWorkItems),
		staleTasks: selectStaleTaskWorkItems(dashboardTasks),
		improvementSummary: selfImprovement.summary,
		improvementOpportunities: selfImprovement.opportunities
			.filter((opportunity) => opportunity.status === 'open')
			.slice(0, 5)
	};
}
