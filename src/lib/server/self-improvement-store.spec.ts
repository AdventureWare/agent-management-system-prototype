import { describe, expect, it } from 'vitest';
import {
	filterSelfImprovementSnapshot,
	mergeSelfImprovementSnapshot,
	resolveSelfImprovementOpportunityTaskContext
} from './self-improvement-store';
import type { ControlPlaneData } from '$lib/types/control-plane';
import type {
	SelfImprovementAnalysis,
	SelfImprovementKnowledgeItem,
	TrackedSelfImprovementFeedbackSignal,
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
				thread_reuse_gap: 0,
				planning_gaps: 0,
				captured_suggestions: 0
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
				},
				suggestedKnowledgeItem: {
					title: 'Failure recovery pattern',
					summary: 'Capture the failure pattern.',
					triggerPattern: 'Repeated failures for the same task.',
					recommendedResponse: 'Add a guard and document the recovery path.',
					applicabilityScope: ['Project One']
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
				suggestedTask: null,
				suggestedKnowledgeItem: {
					title: 'Review checklist',
					summary: 'Capture review lessons.',
					triggerPattern: 'Changes requested during review.',
					recommendedResponse: 'Create a checklist.',
					applicabilityScope: ['Project Two']
				}
			}
		]
	};
}

function createControlPlaneData(): ControlPlaneData {
	return {
		providers: [],
		roles: [],
		projects: [
			{
				id: 'project_1',
				name: 'Project One',
				summary: 'Primary project',
				projectRootFolder: '/tmp/project-one',
				defaultArtifactRoot: '/tmp/project-one/agent_output',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: ''
			},
			{
				id: 'project_2',
				name: 'Project Two',
				summary: 'Secondary project',
				projectRootFolder: '/tmp/project-two',
				defaultArtifactRoot: '/tmp/project-two/agent_output',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: ''
			}
		],
		goals: [
			{
				id: 'goal_parent',
				name: 'Parent goal',
				lane: 'product',
				status: 'running',
				summary: 'Parent summary',
				artifactPath: '/tmp/goals/parent',
				successSignal: '',
				parentGoalId: null,
				projectIds: ['project_1'],
				taskIds: ['task_1']
			},
			{
				id: 'goal_child',
				name: 'Child goal',
				lane: 'product',
				status: 'ready',
				summary: 'Child summary',
				artifactPath: '/tmp/goals/child',
				successSignal: '',
				parentGoalId: 'goal_parent',
				projectIds: ['project_2'],
				taskIds: ['task_2']
			}
		],
		workers: [],
		tasks: [
			{
				id: 'task_1',
				title: 'Primary task',
				summary: 'Primary task summary',
				projectId: 'project_1',
				lane: 'product',
				goalId: 'goal_parent',
				priority: 'medium',
				status: 'ready',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: true,
				desiredRoleId: 'role_coordinator',
				assigneeWorkerId: null,
				threadSessionId: null,
				blockedReason: '',
				dependencyTaskIds: [],
				runCount: 0,
				latestRunId: null,
				artifactPath: '/tmp/project-one/agent_output',
				attachments: [],
				createdAt: '2026-03-31T00:00:00.000Z',
				updatedAt: '2026-03-31T00:00:00.000Z'
			},
			{
				id: 'task_2',
				title: 'Child task',
				summary: 'Child task summary',
				projectId: 'project_2',
				lane: 'product',
				goalId: 'goal_child',
				priority: 'medium',
				status: 'ready',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: true,
				desiredRoleId: 'role_coordinator',
				assigneeWorkerId: null,
				threadSessionId: null,
				blockedReason: '',
				dependencyTaskIds: [],
				runCount: 0,
				latestRunId: null,
				artifactPath: '/tmp/project-two/agent_output',
				attachments: [],
				createdAt: '2026-03-31T00:00:00.000Z',
				updatedAt: '2026-03-31T00:00:00.000Z'
			}
		],
		runs: [],
		reviews: [],
		approvals: []
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
				createdTaskTitle: 'Stabilize execution',
				createdKnowledgeItemId: 'knowledge_1',
				createdKnowledgeItemTitle: 'Failure recovery pattern'
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
				createdTaskTitle: null,
				createdKnowledgeItemId: null,
				createdKnowledgeItemTitle: null
			}
		];
		const signals: TrackedSelfImprovementFeedbackSignal[] = [
			{
				id: 'run_failure:run_1',
				signalType: 'run_failure',
				opportunityId: 'failed_runs:task_1',
				category: 'reliability',
				severity: 'high',
				confidence: 'high',
				projectId: 'project_1',
				projectName: 'Project One',
				taskId: 'task_1',
				runId: 'run_1',
				reviewId: null,
				sessionId: 'session_1',
				title: 'Run failure for task',
				summary: 'Run failed.',
				firstSeenAt: '2026-03-30T10:00:00.000Z',
				lastSeenAt: '2026-03-31T12:00:00.000Z'
			}
		];
		const knowledgeItems: SelfImprovementKnowledgeItem[] = [
			{
				id: 'knowledge_1',
				status: 'published',
				title: 'Failure recovery pattern',
				summary: 'Capture the repeated failure path.',
				category: 'reliability',
				projectId: 'project_1',
				projectName: 'Project One',
				sourceOpportunityId: 'failed_runs:task_1',
				sourceTaskIds: ['task_1'],
				sourceRunIds: ['run_1'],
				sourceSessionIds: ['session_1'],
				sourceSignalIds: ['run_failure:run_1'],
				triggerPattern: 'Repeated failures for the same task.',
				recommendedResponse: 'Add a guard and document the recovery path.',
				applicabilityScope: ['Project One'],
				createdAt: '2026-03-30T10:00:00.000Z',
				updatedAt: '2026-03-31T12:00:00.000Z',
				publishedAt: '2026-03-31T11:00:00.000Z',
				archivedAt: null
			}
		];

		const snapshot = mergeSelfImprovementSnapshot(
			createAnalysis(),
			records,
			signals,
			knowledgeItems
		);

		expect(snapshot.summary.totalCount).toBe(2);
		expect(snapshot.summary.openCount).toBe(1);
		expect(snapshot.summary.acceptedCount).toBe(1);
		expect(snapshot.summary.dismissedCount).toBe(0);
		expect(snapshot.signalSummary.totalCount).toBe(1);
		expect(snapshot.signalSummary.byType.run_failure).toBe(1);
		expect(snapshot.knowledgeSummary.totalCount).toBe(1);
		expect(snapshot.knowledgeSummary.publishedCount).toBe(1);
		expect(snapshot.opportunities).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'failed_runs:task_1',
					status: 'accepted',
					createdTaskId: 'task_fix',
					createdKnowledgeItemId: 'knowledge_1'
				}),
				expect.objectContaining({
					id: 'review_feedback:task_2',
					status: 'open'
				})
			])
		);
		expect(snapshot.knowledgeItems[0]?.id).toBe('knowledge_1');
	});

	it('can scope a snapshot to a single project without mutating durable records', () => {
		const snapshot = mergeSelfImprovementSnapshot(
			createAnalysis(),
			[
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
					createdTaskTitle: 'Stabilize execution',
					createdKnowledgeItemId: 'knowledge_1',
					createdKnowledgeItemTitle: 'Failure recovery pattern'
				}
			],
			[
				{
					id: 'run_failure:run_1',
					signalType: 'run_failure',
					opportunityId: 'failed_runs:task_1',
					category: 'reliability',
					severity: 'high',
					confidence: 'high',
					projectId: 'project_1',
					projectName: 'Project One',
					taskId: 'task_1',
					runId: 'run_1',
					reviewId: null,
					sessionId: 'session_1',
					title: 'Run failure for task',
					summary: 'Run failed.',
					firstSeenAt: '2026-03-30T10:00:00.000Z',
					lastSeenAt: '2026-03-31T12:00:00.000Z'
				}
			],
			[
				{
					id: 'knowledge_1',
					status: 'published',
					title: 'Failure recovery pattern',
					summary: 'Capture the repeated failure path.',
					category: 'reliability',
					projectId: 'project_1',
					projectName: 'Project One',
					sourceOpportunityId: 'failed_runs:task_1',
					sourceTaskIds: ['task_1'],
					sourceRunIds: ['run_1'],
					sourceSessionIds: ['session_1'],
					sourceSignalIds: ['run_failure:run_1'],
					triggerPattern: 'Repeated failures for the same task.',
					recommendedResponse: 'Add a guard and document the recovery path.',
					applicabilityScope: ['Project One'],
					createdAt: '2026-03-30T10:00:00.000Z',
					updatedAt: '2026-03-31T12:00:00.000Z',
					publishedAt: '2026-03-31T11:00:00.000Z',
					archivedAt: null
				}
			]
		);

		const filtered = filterSelfImprovementSnapshot(snapshot, {
			projectId: 'project_1'
		});

		expect(filtered.summary.totalCount).toBe(1);
		expect(filtered.signalSummary.totalCount).toBe(1);
		expect(filtered.knowledgeSummary.totalCount).toBe(1);
		expect(filtered.opportunities[0]?.projectId).toBe('project_1');
	});

	it('can scope a snapshot to a goal subtree and intersect that with project scope', () => {
		const snapshot = mergeSelfImprovementSnapshot(
			createAnalysis(),
			[],
			[
				{
					id: 'run_failure:run_1',
					signalType: 'run_failure',
					opportunityId: 'failed_runs:task_1',
					category: 'reliability',
					severity: 'high',
					confidence: 'high',
					projectId: 'project_1',
					projectName: 'Project One',
					taskId: 'task_1',
					runId: 'run_1',
					reviewId: null,
					sessionId: 'session_1',
					title: 'Run failure for task',
					summary: 'Run failed.',
					firstSeenAt: '2026-03-30T10:00:00.000Z',
					lastSeenAt: '2026-03-31T12:00:00.000Z'
				},
				{
					id: 'review_feedback:task_2',
					signalType: 'review_feedback',
					opportunityId: 'review_feedback:task_2',
					category: 'quality',
					severity: 'medium',
					confidence: 'medium',
					projectId: 'project_2',
					projectName: 'Project Two',
					taskId: 'task_2',
					runId: null,
					reviewId: 'review_1',
					sessionId: null,
					title: 'Review feedback for task',
					summary: 'Changes requested.',
					firstSeenAt: '2026-03-30T11:00:00.000Z',
					lastSeenAt: '2026-03-31T12:00:00.000Z'
				}
			],
			[
				{
					id: 'knowledge_1',
					status: 'published',
					title: 'Failure recovery pattern',
					summary: 'Capture the repeated failure path.',
					category: 'reliability',
					projectId: 'project_1',
					projectName: 'Project One',
					sourceOpportunityId: 'failed_runs:task_1',
					sourceTaskIds: ['task_1'],
					sourceRunIds: ['run_1'],
					sourceSessionIds: ['session_1'],
					sourceSignalIds: ['run_failure:run_1'],
					triggerPattern: 'Repeated failures for the same task.',
					recommendedResponse: 'Add a guard and document the recovery path.',
					applicabilityScope: ['Project One'],
					createdAt: '2026-03-30T10:00:00.000Z',
					updatedAt: '2026-03-31T12:00:00.000Z',
					publishedAt: '2026-03-31T11:00:00.000Z',
					archivedAt: null
				},
				{
					id: 'knowledge_2',
					status: 'draft',
					title: 'Review checklist',
					summary: 'Capture review lessons.',
					category: 'quality',
					projectId: 'project_2',
					projectName: 'Project Two',
					sourceOpportunityId: 'review_feedback:task_2',
					sourceTaskIds: ['task_2'],
					sourceRunIds: [],
					sourceSessionIds: [],
					sourceSignalIds: ['review_feedback:task_2'],
					triggerPattern: 'Changes requested during review.',
					recommendedResponse: 'Create a checklist.',
					applicabilityScope: ['Project Two'],
					createdAt: '2026-03-30T11:00:00.000Z',
					updatedAt: '2026-03-31T12:00:00.000Z',
					publishedAt: null,
					archivedAt: null
				}
			]
		);

		const goalScoped = filterSelfImprovementSnapshot(snapshot, {
			goalId: 'goal_parent',
			data: createControlPlaneData()
		});
		const goalAndProjectScoped = filterSelfImprovementSnapshot(snapshot, {
			projectId: 'project_1',
			goalId: 'goal_parent',
			data: createControlPlaneData()
		});

		expect(goalScoped.summary.totalCount).toBe(2);
		expect(goalScoped.signalSummary.totalCount).toBe(2);
		expect(goalScoped.knowledgeSummary.totalCount).toBe(2);
		expect(goalAndProjectScoped.summary.totalCount).toBe(1);
		expect(goalAndProjectScoped.signalSummary.totalCount).toBe(1);
		expect(goalAndProjectScoped.knowledgeSummary.totalCount).toBe(1);
		expect(goalAndProjectScoped.opportunities[0]?.projectId).toBe('project_1');
	});
});

describe('resolveSelfImprovementOpportunityTaskContext', () => {
	it('infers project and goal context from related tasks when the opportunity is missing direct project context', () => {
		const context = resolveSelfImprovementOpportunityTaskContext({
			data: createControlPlaneData(),
			opportunity: {
				projectId: null,
				relatedTaskIds: ['task_1']
			}
		});

		expect(context).toEqual({
			projectId: 'project_1',
			goalId: 'goal_parent'
		});
	});

	it('prefers explicit scoped context when the operator has narrowed generation to a single project and goal', () => {
		const context = resolveSelfImprovementOpportunityTaskContext({
			data: createControlPlaneData(),
			opportunity: {
				projectId: null,
				relatedTaskIds: []
			},
			projectId: 'project_2',
			goalId: 'goal_child'
		});

		expect(context).toEqual({
			projectId: 'project_2',
			goalId: 'goal_child'
		});
	});
});
