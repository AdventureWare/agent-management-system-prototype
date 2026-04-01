import { describe, expect, it } from 'vitest';
import { mergeSelfImprovementSnapshot } from './self-improvement-store';
import type {
	SelfImprovementAnalysis,
	SelfImprovementOpportunityRecord
} from '$lib/types/self-improvement';

function createAnalysis(): SelfImprovementAnalysis {
	return {
		generatedAt: '2026-03-31T12:00:00.000Z',
		summary: {
			totalCount: 2,
			highSeverityCount: 1,
			byCategory: {
				reliability: 1,
				coordination: 0,
				quality: 1,
				knowledge: 0,
				automation: 0
			},
			bySource: {
				failed_runs: 1,
				blocked_tasks: 0,
				stale_tasks: 0,
				review_feedback: 1,
				thread_reuse_gap: 0
			}
		},
		opportunities: [
			{
				id: 'failed_runs:task_1',
				title: 'Stabilize execution',
				summary: 'Repeated failure path.',
				category: 'reliability',
				source: 'failed_runs',
				severity: 'high',
				confidence: 'high',
				projectId: 'project_1',
				projectName: 'Project One',
				signals: ['2 failures'],
				recommendedActions: ['Add a safeguard'],
				relatedTaskIds: ['task_1'],
				relatedRunIds: ['run_1'],
				relatedSessionIds: ['session_1'],
				suggestedTask: {
					title: 'Stabilize execution',
					summary: 'Fix the failure path.',
					priority: 'high'
				}
			},
			{
				id: 'review_feedback:task_2',
				title: 'Capture review lesson',
				summary: 'Review feedback is recurring.',
				category: 'quality',
				source: 'review_feedback',
				severity: 'medium',
				confidence: 'medium',
				projectId: 'project_2',
				projectName: 'Project Two',
				signals: ['changes requested'],
				recommendedActions: ['Codify the review note'],
				relatedTaskIds: ['task_2'],
				relatedRunIds: [],
				relatedSessionIds: [],
				suggestedTask: null
			}
		]
	};
}

describe('mergeSelfImprovementSnapshot', () => {
	it('preserves durable opportunity status while exposing live analysis', () => {
		const records: SelfImprovementOpportunityRecord[] = [
			{
				id: 'failed_runs:task_1',
				status: 'accepted',
				firstSeenAt: '2026-03-30T10:00:00.000Z',
				lastSeenAt: '2026-03-31T12:00:00.000Z',
				updatedAt: '2026-03-31T11:00:00.000Z',
				acceptedAt: '2026-03-31T11:00:00.000Z',
				dismissedAt: null,
				decisionSummary: 'Already accepted.',
				createdTaskId: 'task_fix',
				createdTaskTitle: 'Stabilize execution'
			},
			{
				id: 'stale_tasks:task_3',
				status: 'dismissed',
				firstSeenAt: '2026-03-29T10:00:00.000Z',
				lastSeenAt: '2026-03-30T10:00:00.000Z',
				updatedAt: '2026-03-30T10:00:00.000Z',
				acceptedAt: null,
				dismissedAt: '2026-03-30T10:00:00.000Z',
				decisionSummary: 'Outdated.',
				createdTaskId: null,
				createdTaskTitle: null
			}
		];

		const snapshot = mergeSelfImprovementSnapshot(createAnalysis(), records);

		expect(snapshot.summary.totalCount).toBe(2);
		expect(snapshot.summary.openCount).toBe(1);
		expect(snapshot.summary.acceptedCount).toBe(1);
		expect(snapshot.summary.dismissedCount).toBe(0);
		expect(snapshot.opportunities).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'failed_runs:task_1',
					status: 'accepted',
					createdTaskId: 'task_fix'
				}),
				expect.objectContaining({
					id: 'review_feedback:task_2',
					status: 'open'
				})
			])
		);
	});
});
