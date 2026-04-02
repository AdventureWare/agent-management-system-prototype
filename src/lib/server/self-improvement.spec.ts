import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentSessionDetail } from '$lib/types/agent-session';
import type { ControlPlaneData } from '$lib/types/control-plane';
import {
	applySelfImprovementGoalContext,
	buildSelfImprovementAnalysis,
	buildSelfImprovementFeedbackSignals
} from './self-improvement';

function createSession(
	id: string,
	overrides: Partial<AgentSessionDetail> = {}
): AgentSessionDetail {
	return {
		id,
		name: `Session ${id}`,
		cwd: '/tmp/project',
		sandbox: 'workspace-write',
		model: null,
		threadId: `thread_${id}`,
		archivedAt: null,
		createdAt: '2026-03-31T09:00:00.000Z',
		updatedAt: '2026-03-31T11:00:00.000Z',
		origin: 'managed',
		topicLabels: [],
		sessionState: 'ready',
		latestRunStatus: 'idle',
		hasActiveRun: false,
		canResume: true,
		runCount: 1,
		lastActivityAt: '2026-03-31T11:45:00.000Z',
		lastActivityLabel: '15m ago',
		sessionSummary: 'Reusable session context',
		lastExitCode: null,
		runTimeline: [],
		relatedTasks: [],
		latestRun: null,
		runs: [],
		...overrides
	};
}

function createFixture(): ControlPlaneData {
	return {
		providers: [
			{
				id: 'provider_local',
				name: 'Local Codex',
				service: 'codex',
				kind: 'local',
				description: 'Local provider',
				enabled: true,
				setupStatus: 'connected',
				authMode: 'local_cli',
				defaultModel: '',
				baseUrl: '',
				launcher: '',
				envVars: [],
				capabilities: [],
				defaultThreadSandbox: 'workspace-write',
				notes: ''
			}
		],
		roles: [
			{
				id: 'role_builder',
				name: 'Builder',
				lane: 'product',
				description: 'Builds product work'
			}
		],
		projects: [
			{
				id: 'project_1',
				name: 'Agent Management System Prototype',
				summary: 'Primary project',
				projectRootFolder: '/tmp/project',
				defaultArtifactRoot: '/tmp/project/agent_output',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: ''
			},
			{
				id: 'project_2',
				name: 'Other Project',
				summary: 'Secondary project',
				projectRootFolder: '/tmp/other-project',
				defaultArtifactRoot: '/tmp/other-project/agent_output',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: ''
			}
		],
		goals: [
			{
				id: 'goal_product',
				name: 'Improve system reliability',
				lane: 'product',
				status: 'running',
				summary: 'Reduce repeated failures and unblock delivery.',
				artifactPath: '/tmp/project/goals/reliability',
				successSignal: 'Repeated execution failures fall below one per task.',
				parentGoalId: null,
				projectIds: ['project_2'],
				taskIds: ['task_failure', 'task_blocked']
			},
			{
				id: 'goal_quality',
				name: 'Tighten review quality',
				lane: 'product',
				status: 'running',
				summary: 'Reduce repeated review churn.',
				artifactPath: '/tmp/project/goals/quality',
				successSignal: 'Changes-requested reviews become uncommon.',
				parentGoalId: 'goal_product',
				projectIds: ['project_2'],
				taskIds: ['task_review']
			},
			{
				id: 'goal_inbox',
				name: 'Grow project planning backlog',
				lane: 'product',
				status: 'running',
				summary: 'Keep the project stocked with concrete next-step tasks.',
				artifactPath: '/tmp/project/goals/planning',
				successSignal: 'There is always a ready next-step task for the project.',
				parentGoalId: null,
				projectIds: ['project_1'],
				taskIds: []
			}
		],
		workers: [
			{
				id: 'worker_1',
				name: 'Worker',
				providerId: 'provider_local',
				roleId: 'role_builder',
				location: 'local',
				status: 'busy',
				capacity: 1,
				registeredAt: '2026-03-31T09:00:00.000Z',
				lastSeenAt: '2026-03-31T11:59:00.000Z',
				note: '',
				tags: [],
				threadSandboxOverride: null,
				authTokenHash: ''
			}
		],
		tasks: [
			{
				id: 'task_failure',
				title: 'Repair flaky execution',
				summary: 'Investigate why repeated runs fail.',
				projectId: 'project_2',
				lane: 'product',
				goalId: 'goal_product',
				priority: 'high',
				status: 'in_progress',
				riskLevel: 'high',
				approvalMode: 'none',
				requiresReview: true,
				desiredRoleId: 'role_builder',
				assigneeWorkerId: 'worker_1',
				threadSessionId: 'session_busy',
				blockedReason: '',
				dependencyTaskIds: [],
				runCount: 3,
				latestRunId: 'run_failure_latest',
				artifactPath: '/tmp/project/agent_output',
				attachments: [],
				createdAt: '2026-03-31T09:00:00.000Z',
				updatedAt: '2026-03-31T11:40:00.000Z'
			},
			{
				id: 'task_blocked',
				title: 'Resolve dependency blocker',
				summary: 'Waiting on prerequisite work.',
				projectId: 'project_2',
				lane: 'product',
				goalId: 'goal_product',
				priority: 'urgent',
				status: 'blocked',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: true,
				desiredRoleId: 'role_builder',
				assigneeWorkerId: null,
				threadSessionId: null,
				blockedReason: 'Need the schema migration task to finish first.',
				dependencyTaskIds: ['task_dependency'],
				runCount: 0,
				latestRunId: null,
				artifactPath: '/tmp/project/agent_output',
				attachments: [],
				createdAt: '2026-03-31T09:00:00.000Z',
				updatedAt: '2026-03-31T11:40:00.000Z'
			},
			{
				id: 'task_dependency',
				title: 'Ship schema migration',
				summary: 'Required prerequisite task.',
				projectId: 'project_2',
				lane: 'product',
				goalId: '',
				priority: 'medium',
				status: 'in_progress',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: true,
				desiredRoleId: 'role_builder',
				assigneeWorkerId: 'worker_1',
				threadSessionId: null,
				blockedReason: '',
				dependencyTaskIds: [],
				runCount: 1,
				latestRunId: 'run_dependency',
				artifactPath: '/tmp/project/agent_output',
				attachments: [],
				createdAt: '2026-03-31T09:00:00.000Z',
				updatedAt: '2026-03-31T03:00:00.000Z'
			},
			{
				id: 'task_review',
				title: 'Address review feedback',
				summary: 'Incorporate requested changes from review.',
				projectId: 'project_2',
				lane: 'product',
				goalId: 'goal_quality',
				priority: 'medium',
				status: 'review',
				riskLevel: 'medium',
				approvalMode: 'before_complete',
				requiresReview: true,
				desiredRoleId: 'role_builder',
				assigneeWorkerId: 'worker_1',
				threadSessionId: 'session_review',
				blockedReason: '',
				dependencyTaskIds: [],
				runCount: 2,
				latestRunId: 'run_review',
				artifactPath: '/tmp/project/agent_output',
				attachments: [],
				createdAt: '2026-03-31T09:00:00.000Z',
				updatedAt: '2026-03-31T11:30:00.000Z'
			},
			{
				id: 'task_reuse',
				title: 'Continue task thread suggestion flow',
				summary: 'Pick the most relevant reusable thread.',
				projectId: 'project_1',
				lane: 'product',
				goalId: '',
				priority: 'medium',
				status: 'ready',
				riskLevel: 'low',
				approvalMode: 'none',
				requiresReview: false,
				desiredRoleId: 'role_builder',
				assigneeWorkerId: null,
				threadSessionId: null,
				blockedReason: '',
				dependencyTaskIds: [],
				runCount: 0,
				latestRunId: null,
				artifactPath: '/tmp/project/agent_output',
				attachments: [],
				createdAt: '2026-03-31T09:00:00.000Z',
				updatedAt: '2026-03-31T11:50:00.000Z'
			}
		],
		runs: [
			{
				id: 'run_failure_old',
				taskId: 'task_failure',
				workerId: 'worker_1',
				providerId: 'provider_local',
				status: 'failed',
				createdAt: '2026-03-31T09:10:00.000Z',
				updatedAt: '2026-03-31T09:20:00.000Z',
				startedAt: '2026-03-31T09:10:00.000Z',
				endedAt: '2026-03-31T09:20:00.000Z',
				threadId: 'thread_busy',
				sessionId: 'session_busy',
				promptDigest: '',
				artifactPaths: [],
				summary: 'Command failed.',
				lastHeartbeatAt: '2026-03-31T09:15:00.000Z',
				errorSummary: 'Tests timed out.'
			},
			{
				id: 'run_failure_latest',
				taskId: 'task_failure',
				workerId: 'worker_1',
				providerId: 'provider_local',
				status: 'failed',
				createdAt: '2026-03-31T11:20:00.000Z',
				updatedAt: '2026-03-31T11:25:00.000Z',
				startedAt: '2026-03-31T11:20:00.000Z',
				endedAt: '2026-03-31T11:25:00.000Z',
				threadId: 'thread_busy',
				sessionId: 'session_busy',
				promptDigest: '',
				artifactPaths: [],
				summary: 'Retry failed.',
				lastHeartbeatAt: '2026-03-31T11:22:00.000Z',
				errorSummary: 'Still timing out in the same path.'
			},
			{
				id: 'run_dependency',
				taskId: 'task_dependency',
				workerId: 'worker_1',
				providerId: 'provider_local',
				status: 'running',
				createdAt: '2026-03-31T02:00:00.000Z',
				updatedAt: '2026-03-31T02:10:00.000Z',
				startedAt: '2026-03-31T02:00:00.000Z',
				endedAt: null,
				threadId: 'thread_dependency',
				sessionId: 'session_dependency',
				promptDigest: '',
				artifactPaths: [],
				summary: '',
				lastHeartbeatAt: '2026-03-31T02:10:00.000Z',
				errorSummary: ''
			},
			{
				id: 'run_review',
				taskId: 'task_review',
				workerId: 'worker_1',
				providerId: 'provider_local',
				status: 'completed',
				createdAt: '2026-03-31T10:00:00.000Z',
				updatedAt: '2026-03-31T10:30:00.000Z',
				startedAt: '2026-03-31T10:00:00.000Z',
				endedAt: '2026-03-31T10:30:00.000Z',
				threadId: 'thread_review',
				sessionId: 'session_review',
				promptDigest: '',
				artifactPaths: [],
				summary: 'Ready for review.',
				lastHeartbeatAt: '2026-03-31T10:15:00.000Z',
				errorSummary: ''
			}
		],
		reviews: [
			{
				id: 'review_1',
				taskId: 'task_review',
				runId: 'run_review',
				status: 'changes_requested',
				createdAt: '2026-03-31T10:40:00.000Z',
				updatedAt: '2026-03-31T10:45:00.000Z',
				resolvedAt: null,
				requestedByWorkerId: null,
				reviewerWorkerId: null,
				summary: 'Needs stronger edge-case handling.'
			}
		],
		approvals: []
	};
}

describe('buildSelfImprovementAnalysis', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-31T12:00:00.000Z'));
	});

	it('turns operational signals into concrete improvement opportunities', () => {
		const report = buildSelfImprovementAnalysis({
			data: createFixture(),
			sessions: [
				createSession('session_busy', {
					name: 'Busy failure thread',
					cwd: '/tmp/other-project',
					sessionState: 'working',
					hasActiveRun: true,
					canResume: false,
					sessionSummary: 'Currently stuck retrying the failure path.'
				}),
				createSession('session_dependency', {
					name: 'Long running dependency thread',
					cwd: '/tmp/other-project',
					sessionState: 'working',
					hasActiveRun: true,
					canResume: false,
					lastActivityAt: '2026-03-31T02:10:00.000Z',
					lastActivityLabel: '10h ago',
					sessionSummary: 'Still looks active but has gone quiet.'
				}),
				createSession('session_review', {
					cwd: '/tmp/other-project',
					canResume: false,
					name: 'Review handoff thread',
					sessionSummary: 'Contains the latest review-ready work.'
				}),
				createSession('session_reuse_candidate', {
					name: 'Task thread suggestion follow-up',
					sessionSummary: 'Continue the assignment suggestion flow',
					topicLabels: ['Product', 'Coordination', 'Suggestion']
				})
			]
		});

		expect(report.summary.totalCount).toBe(6);
		expect(report.summary.highSeverityCount).toBeGreaterThanOrEqual(2);
		expect(report.summary.bySource.failed_runs).toBe(1);
		expect(report.summary.bySource.blocked_tasks).toBe(1);
		expect(report.summary.bySource.planning_gaps).toBe(1);
		expect(report.summary.bySource.stale_tasks).toBe(1);
		expect(report.summary.bySource.review_feedback).toBe(1);
		expect(report.summary.bySource.thread_reuse_gap).toBe(1);
		expect(report.opportunities[0]?.severity).toBe('high');
		expect(report.opportunities).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					source: 'failed_runs',
					category: 'reliability',
					relatedTaskIds: ['task_failure'],
					suggestedKnowledgeItem: expect.objectContaining({
						title: expect.stringContaining('Failure recovery pattern')
					})
				}),
				expect.objectContaining({
					source: 'thread_reuse_gap',
					category: 'knowledge',
					relatedSessionIds: expect.arrayContaining(['session_reuse_candidate']),
					suggestedKnowledgeItem: expect.objectContaining({
						triggerPattern: expect.stringContaining('Suggested thread')
					})
				}),
				expect.objectContaining({
					source: 'planning_gaps',
					category: 'coordination',
					suggestedTask: expect.objectContaining({
						title: expect.stringContaining('Plan next step for Grow project planning backlog')
					})
				})
			])
		);
	});

	it('can enrich scoped opportunities with explicit goal context', () => {
		const fixture = createFixture();
		const report = buildSelfImprovementAnalysis({
			data: fixture,
			sessions: [
				createSession('session_busy', {
					name: 'Busy failure thread',
					cwd: '/tmp/other-project',
					sessionState: 'working',
					hasActiveRun: true,
					canResume: false
				}),
				createSession('session_dependency', {
					name: 'Long running dependency thread',
					cwd: '/tmp/other-project',
					sessionState: 'working',
					hasActiveRun: true,
					canResume: false,
					lastActivityAt: '2026-03-31T02:10:00.000Z',
					lastActivityLabel: '10h ago'
				}),
				createSession('session_review', {
					cwd: '/tmp/other-project',
					canResume: false,
					name: 'Review handoff thread'
				}),
				createSession('session_reuse_candidate', {
					name: 'Task thread suggestion follow-up',
					sessionSummary: 'Continue the assignment suggestion flow',
					topicLabels: ['Product', 'Coordination', 'Suggestion']
				})
			]
		});
		const goalAwareReport = applySelfImprovementGoalContext(report, {
			data: fixture,
			goalId: 'goal_product'
		});
		const failureOpportunity = goalAwareReport.opportunities.find(
			(opportunity) => opportunity.id === 'failed_runs:task_failure'
		);
		const reviewOpportunity = goalAwareReport.opportunities.find(
			(opportunity) => opportunity.id === 'review_feedback:task_review'
		);

		expect(failureOpportunity?.summary).toContain('Goal focus: Improve system reliability.');
		expect(failureOpportunity?.recommendedActions[0]).toContain('Improve system reliability');
		expect(failureOpportunity?.suggestedTask?.title).toContain(
			'Advance Improve system reliability:'
		);
		expect(failureOpportunity?.suggestedKnowledgeItem?.applicabilityScope).toContain(
			'Goal: Improve system reliability'
		);
		expect(reviewOpportunity?.summary).toContain(
			'Matched goal context in this subtree: Tighten review quality.'
		);
	});

	it('emits structured feedback signals from the same operational context', () => {
		const signals = buildSelfImprovementFeedbackSignals({
			data: createFixture(),
			sessions: [
				createSession('session_busy', {
					name: 'Busy failure thread',
					cwd: '/tmp/other-project',
					sessionState: 'working',
					hasActiveRun: true,
					canResume: false
				}),
				createSession('session_dependency', {
					name: 'Long running dependency thread',
					cwd: '/tmp/other-project',
					sessionState: 'working',
					hasActiveRun: true,
					canResume: false,
					lastActivityAt: '2026-03-31T02:10:00.000Z',
					lastActivityLabel: '10h ago'
				}),
				createSession('session_review', {
					cwd: '/tmp/other-project',
					canResume: false,
					name: 'Review handoff thread'
				}),
				createSession('session_reuse_candidate', {
					name: 'Task thread suggestion follow-up',
					sessionSummary: 'Continue the assignment suggestion flow',
					topicLabels: ['Product', 'Coordination', 'Suggestion']
				})
			]
		});

		expect(signals).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					signalType: 'run_failure',
					taskId: 'task_failure'
				}),
				expect.objectContaining({
					signalType: 'task_blocked',
					taskId: 'task_blocked'
				}),
				expect.objectContaining({
					signalType: 'review_feedback',
					reviewId: 'review_1'
				}),
				expect.objectContaining({
					signalType: 'thread_reuse_gap',
					taskId: 'task_reuse'
				})
			])
		);
	});
});
