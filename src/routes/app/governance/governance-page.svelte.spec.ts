import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

function createGovernanceQueueItem(overrides: Record<string, unknown> = {}) {
	return {
		id: 'task_default',
		title: 'Default governance task',
		summary: 'Default summary',
		successCriteria: '',
		readyCondition: '',
		expectedOutcome: '',
		projectId: 'project_1',
		projectName: 'Agent Management System Prototype',
		area: 'product',
		goalId: 'goal_1',
		goalName: 'Reduce task intake friction',
		priority: 'medium',
		status: 'ready',
		riskLevel: 'medium',
		approvalMode: 'none',
		requiresReview: true,
		desiredRoleId: 'role_1',
		desiredRoleName: 'Reviewer',
		assigneeExecutionSurfaceId: null,
		assigneeName: 'Unassigned',
		agentThreadId: null,
		requiredCapabilityNames: [],
		requiredToolNames: [],
		blockedReason: '',
		dependencyTaskIds: [],
		dependencyTaskNames: [],
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
		hasUnmetDependencies: false,
		openReview: null,
		pendingApproval: null,
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
		},
		escalationReasons: [],
		queueKinds: ['review'],
		primaryQueueKind: 'review',
		queueSummary: 'Waiting on reviewer decision.',
		...overrides
	};
}

function renderPage(queueItems: ReturnType<typeof createGovernanceQueueItem>[]) {
	render(Page, {
		data: {
			reviewItems: queueItems.filter((item) => item.openReview),
			approvalItems: queueItems.filter((item) => item.pendingApproval),
			escalationItems: queueItems.filter((item) => item.queueKinds.includes('escalation')),
			queueItems,
			summary: {
				queueCount: queueItems.length,
				reviewCount: queueItems.filter((item) => item.openReview).length,
				reviewFollowUpCount: queueItems.filter((item) => item.queueKinds.includes('review')).length,
				approvalCount: queueItems.filter((item) => item.queueKinds.includes('approval')).length,
				blockedCount: queueItems.filter((item) => item.status === 'blocked').length,
				dependencyCount: queueItems.filter((item) => item.hasUnmetDependencies).length,
				staleCount: queueItems.filter((item) => item.freshness.isStale).length,
				escalationCount: queueItems.filter((item) => item.queueKinds.includes('escalation')).length
			}
		} as never
	});
}

describe('/app/governance/+page.svelte', () => {
	it('renders a single inbox queue with mixed intervention types', async () => {
		renderPage([
			createGovernanceQueueItem({
				id: 'task_review',
				title: 'Review release checklist',
				status: 'review',
				openReview: {
					id: 'review_1',
					taskId: 'task_review',
					runId: null,
					status: 'open',
					summary: 'Review the final release notes.',
					createdAt: '2026-04-01T10:00:00.000Z',
					updatedAt: '2026-04-01T10:00:00.000Z'
				},
				queueKinds: ['review'],
				primaryQueueKind: 'review',
				queueSummary: 'Review the final release notes.'
			}),
			createGovernanceQueueItem({
				id: 'task_approval',
				title: 'Approve production deploy',
				status: 'review',
				approvalMode: 'before_apply',
				requiresReview: false,
				pendingApproval: {
					id: 'approval_1',
					taskId: 'task_approval',
					runId: null,
					mode: 'before_apply',
					status: 'pending',
					summary: 'Waiting on before-apply approval.',
					createdAt: '2026-04-01T10:05:00.000Z',
					updatedAt: '2026-04-01T10:05:00.000Z'
				},
				queueKinds: ['approval'],
				primaryQueueKind: 'approval',
				queueSummary: 'Waiting on before-apply approval.'
			}),
			createGovernanceQueueItem({
				id: 'task_escalation',
				title: 'Unblock failing migration',
				status: 'blocked',
				blockedReason: 'Waiting on operator input.',
				hasUnmetDependencies: true,
				dependencyTaskNames: ['Review release checklist'],
				queueKinds: ['escalation'],
				primaryQueueKind: 'escalation',
				queueSummary: 'Waiting on operator input.',
				escalationReasons: [
					'Waiting on operator input.',
					'Waiting on dependencies: Review release checklist.'
				]
			})
		]);

		expect(
			document.querySelector('[data-testid="governance-queue-card-task_review"]')
		).not.toBeNull();
		expect(
			document.querySelector('[data-testid="governance-queue-card-task_approval"]')
		).not.toBeNull();
		expect(
			document.querySelector('[data-testid="governance-queue-card-task_escalation"]')
		).not.toBeNull();
		expect(
			document.querySelector('[data-testid="governance-queue-card-task_review"]')?.textContent
		).toContain('Review follow-up');
		expect(
			document.querySelector('[data-testid="governance-queue-card-task_approval"]')?.textContent
		).toContain('Approval gate');
		expect(
			document.querySelector('[data-testid="governance-queue-card-task_escalation"]')?.textContent
		).toContain('Escalation');
		await expect.element(page.getByText('Approve review')).toBeInTheDocument();
		await expect.element(page.getByText('Approve gate')).toBeInTheDocument();
		expect(
			document.querySelector('[data-testid="governance-queue-card-task_escalation"]')?.textContent
		).toContain('Waiting on operator input.');
	});

	it('filters the inbox down to approval gates with local tabs', async () => {
		renderPage([
			createGovernanceQueueItem({
				id: 'task_review',
				title: 'Review release checklist',
				status: 'review',
				openReview: {
					id: 'review_1',
					taskId: 'task_review',
					runId: null,
					status: 'open',
					summary: 'Review the final release notes.',
					createdAt: '2026-04-01T10:00:00.000Z',
					updatedAt: '2026-04-01T10:00:00.000Z'
				},
				queueKinds: ['review'],
				primaryQueueKind: 'review',
				queueSummary: 'Review the final release notes.'
			}),
			createGovernanceQueueItem({
				id: 'task_manual_review',
				title: 'Manual review follow-up',
				status: 'review',
				queueKinds: ['review', 'escalation'],
				primaryQueueKind: 'review',
				queueSummary: 'Task is in review and needs operator follow-up.',
				escalationReasons: ['Task is in review and needs operator follow-up.']
			}),
			createGovernanceQueueItem({
				id: 'task_approval',
				title: 'Approve production deploy',
				status: 'review',
				approvalMode: 'before_apply',
				requiresReview: false,
				pendingApproval: {
					id: 'approval_1',
					taskId: 'task_approval',
					runId: null,
					mode: 'before_apply',
					status: 'pending',
					summary: 'Waiting on before-apply approval.',
					createdAt: '2026-04-01T10:05:00.000Z',
					updatedAt: '2026-04-01T10:05:00.000Z'
				},
				queueKinds: ['approval'],
				primaryQueueKind: 'approval',
				queueSummary: 'Waiting on before-apply approval.'
			})
		]);

		expect(
			document.querySelector('[data-testid="governance-queue-card-task_review"]')
		).not.toBeNull();
		expect(
			document.querySelector('[data-testid="governance-queue-card-task_approval"]')
		).not.toBeNull();

		await page.getByRole('tab', { name: /Approval gates 1/i }).click();

		expect(
			document.querySelector('[data-testid="governance-queue-card-task_approval"]')
		).not.toBeNull();
		expect(document.querySelector('[data-testid="governance-queue-card-task_review"]')).toBeNull();
		expect(
			document.querySelector('[data-testid="governance-queue-card-task_manual_review"]')
		).toBeNull();
	});
});
