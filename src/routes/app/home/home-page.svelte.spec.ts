import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

vi.mock('$lib/client/agent-data', () => ({
	createTaskFromSelfImprovementOpportunity: vi.fn(),
	fetchHomeDashboard: vi.fn(async () => {
		throw new Error('not used in this test');
	}),
	updateSelfImprovementOpportunityStatus: vi.fn()
}));

vi.mock('$lib/client/refresh', () => ({
	shouldPauseRefresh: vi.fn(() => false)
}));

function createDashboardTask() {
	return {
		id: 'task_attention',
		title: 'Blocked release task',
		summary: 'Hold the release until approvals and dependencies are resolved.',
		projectId: 'project_1',
		projectName: 'Agent Management System Prototype',
		goalId: 'goal_1',
		goalName: 'Reduce task intake friction',
		area: 'product',
		priority: 'urgent',
		status: 'blocked',
		riskLevel: 'high',
		approvalMode: 'before_apply',
		requiresReview: false,
		desiredRoleId: 'role_reviewer',
		desiredRoleName: 'Reviewer',
		assigneeExecutionSurfaceId: null,
		assigneeName: 'Unassigned',
		agentThreadId: null,
		requiredCapabilityNames: [],
		requiredToolNames: [],
		blockedReason: 'Waiting on a production sign-off.',
		dependencyTaskIds: ['task_dependency'],
		dependencyTaskNames: ['Existing dependency task'],
		estimateHours: null,
		targetDate: null,
		runCount: 0,
		latestRunId: null,
		artifactPath: '/tmp/project/out',
		attachments: [],
		createdAt: '2026-04-01T09:00:00.000Z',
		updatedAt: '2026-04-01T10:00:00.000Z',
		latestRun: null,
		assignedThread: null,
		latestRunThread: null,
		statusThread: null,
		linkThread: null,
		linkThreadKind: null,
		updatedAtLabel: '1h ago',
		hasUnmetDependencies: true,
		openReview: null,
		pendingApproval: {
			id: 'approval_1',
			taskId: 'task_attention',
			runId: null,
			mode: 'before_apply',
			status: 'pending',
			summary: 'Waiting on before-apply approval.',
			createdAt: '2026-04-01T10:00:00.000Z',
			updatedAt: '2026-04-01T10:00:00.000Z'
		},
		freshness: {
			isStale: false,
			staleSignals: [],
			staleInProgress: false,
			noRecentRunActivity: false,
			activeThreadNoRecentOutput: false,
			taskAgeMs: 60 * 60 * 1000,
			taskAgeLabel: '1h ago',
			runActivityAgeMs: null,
			runActivityAgeLabel: 'No activity yet',
			threadActivityAgeMs: null,
			threadActivityAgeLabel: 'No activity yet'
		}
	};
}

describe('/app/home/+page.svelte', () => {
	it('shows routing metadata in task attention cards', async () => {
		render(Page, {
			data: {
				threads: [],
				threadSummary: {
					totalCount: 0,
					activeCount: 0,
					readyCount: 0,
					unavailableCount: 0,
					attentionCount: 0
				},
				controlSummary: {
					taskCount: 1,
					runCount: 0,
					activeRunCount: 0,
					blockedRunCount: 0,
					openReviewCount: 0,
					pendingApprovalCount: 1,
					runningTaskCount: 0,
					blockedTaskCount: 1,
					readyTaskCount: 0,
					reviewTaskCount: 0,
					reviewRequiredTaskCount: 0,
					dependencyBlockedTaskCount: 1,
					highRiskTaskCount: 1,
					projectCount: 1,
					goalCount: 1,
					executionSurfaceCount: 0,
					onlineExecutionSurfaceCount: 0,
					busyExecutionSurfaceCount: 0
				},
				taskAttention: [createDashboardTask()],
				staleTaskSummary: {
					totalCount: 0,
					staleInProgressCount: 0,
					noRecentRunActivityCount: 0,
					activeThreadNoRecentOutputCount: 0
				},
				staleTasks: [],
				runUsageCost: {
					spendLast24hUsd: 12.34,
					spendLast7dUsd: 45.67,
					failedOrCanceledSpendLast7dRatio: 0.25,
					highCostRuns: [],
					rollups: {
						byProvider: [],
						byActor: [],
						byProject: [],
						byGoal: []
					}
				},
				improvementSummary: {
					totalOpenOpportunities: 0,
					totalAcceptedOpportunities: 0,
					totalRejectedOpportunities: 0,
					totalIgnoredOpportunities: 0,
					totalKnowledgeItems: 0,
					totalTasksCreated: 0,
					totalSuggestionsGenerated: 0,
					lastSuggestionAt: null
				},
				improvementOpportunities: []
			} as never
		});

		await expect.element(page.getByText('Urgent')).toBeInTheDocument();
		expect(document.body.textContent).toContain('High risk');
		await expect.element(page.getByText('$12.34')).toBeInTheDocument();
		await expect.element(page.getByText('review optional')).toBeInTheDocument();
		expect(document.body.textContent).toContain('Reviewer');
		await expect.element(page.getByText('Waiting on a production sign-off.')).toBeInTheDocument();
		await expect
			.element(page.getByText('Depends on: Existing dependency task'))
			.toBeInTheDocument();
	});
});
