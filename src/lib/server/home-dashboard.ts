import { listAgentThreads, summarizeAgentThreads } from '$lib/server/agent-threads';
import { loadControlPlane, summarizeControlPlane } from '$lib/server/control-plane';
import { loadSelfImprovementSnapshot } from '$lib/server/self-improvement-store';
import {
	buildTaskWorkItems,
	selectStaleTaskWorkItems,
	summarizeTaskFreshness
} from '$lib/server/task-work-items';
import type { HomeDashboardData } from '$lib/types/home-dashboard';

export async function loadHomeDashboardData(): Promise<HomeDashboardData> {
	const controlPlanePromise = loadControlPlane();
	const [controlPlane, threads] = await Promise.all([
		controlPlanePromise,
		listAgentThreads({ controlPlane: controlPlanePromise, includeCategorization: false })
	]);
	const selfImprovement = await loadSelfImprovementSnapshot({
		data: controlPlane,
		threads: threads
	});
	const taskWorkItems = buildTaskWorkItems(controlPlane, threads);
	const dashboardTasks = taskWorkItems.map((task) => ({
		...task,
		goalName: controlPlane.goals.find((goal) => goal.id === task.goalId)?.name ?? 'Unknown goal'
	}));
	const taskAttention = dashboardTasks
		.filter(
			(task) =>
				task.status === 'blocked' ||
				Boolean(task.openReview) ||
				Boolean(task.pendingApproval) ||
				task.hasUnmetDependencies ||
				task.freshness.isStale
		)
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
		.slice(0, 8);

	return {
		threads,
		threadSummary: summarizeAgentThreads(threads),
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
