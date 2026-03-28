import { describe, expect, it } from 'vitest';
import {
	createApproval,
	createProvider,
	createProject,
	createReview,
	createRun,
	createTask,
	projectMatchesPath,
	syncGovernanceQueues,
	summarizeControlPlane,
	taskHasUnmetDependencies
} from './control-plane';
import type { ControlPlaneData } from '$lib/types/control-plane';

function buildFixture(): ControlPlaneData {
	return {
		providers: [],
		roles: [],
		projects: [],
		goals: [],
		workers: [],
		tasks: [
			{
				id: 'task_done',
				title: 'Done task',
				summary: 'finished dependency',
				projectId: 'project_1',
				lane: 'product',
				goalId: 'goal_1',
				priority: 'medium',
				status: 'done',
				riskLevel: 'low',
				approvalMode: 'none',
				requiresReview: false,
				desiredRoleId: 'role_app_worker',
				assigneeWorkerId: null,
				blockedReason: '',
				dependencyTaskIds: [],
				runCount: 1,
				latestRunId: 'run_done',
				artifactPath: '/tmp/done',
				createdAt: '2026-03-26T00:00:00.000Z',
				updatedAt: '2026-03-26T00:00:00.000Z'
			},
			{
				id: 'task_review',
				title: 'Review task',
				summary: 'needs review',
				projectId: 'project_1',
				lane: 'product',
				goalId: 'goal_1',
				priority: 'high',
				status: 'review',
				riskLevel: 'high',
				approvalMode: 'before_complete',
				requiresReview: true,
				desiredRoleId: 'role_app_worker',
				assigneeWorkerId: null,
				blockedReason: '',
				dependencyTaskIds: ['task_done'],
				runCount: 0,
				latestRunId: null,
				artifactPath: '/tmp/review',
				createdAt: '2026-03-26T00:00:00.000Z',
				updatedAt: '2026-03-26T00:00:00.000Z'
			},
			{
				id: 'task_waiting',
				title: 'Waiting task',
				summary: 'dependency is not done',
				projectId: 'project_2',
				lane: 'growth',
				goalId: 'goal_2',
				priority: 'urgent',
				status: 'ready',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: true,
				desiredRoleId: 'role_researcher',
				assigneeWorkerId: null,
				blockedReason: '',
				dependencyTaskIds: ['task_review'],
				runCount: 0,
				latestRunId: null,
				artifactPath: '/tmp/waiting',
				createdAt: '2026-03-26T00:00:00.000Z',
				updatedAt: '2026-03-26T00:00:00.000Z'
			}
		],
		runs: [
			{
				id: 'run_done',
				taskId: 'task_done',
				workerId: 'worker_one',
				providerId: 'provider_local_codex',
				status: 'completed',
				createdAt: '2026-03-26T00:00:00.000Z',
				updatedAt: '2026-03-26T00:10:00.000Z',
				startedAt: '2026-03-26T00:00:00.000Z',
				endedAt: '2026-03-26T00:10:00.000Z',
				threadId: 'thread_1',
				sessionId: 'session_1',
				promptDigest: 'abc123',
				artifactPaths: ['/tmp/done'],
				summary: 'Completed work.',
				lastHeartbeatAt: '2026-03-26T00:05:00.000Z',
				errorSummary: ''
			}
		],
		reviews: [
			{
				id: 'review_open',
				taskId: 'task_review',
				runId: null,
				status: 'open',
				createdAt: '2026-03-26T00:00:00.000Z',
				updatedAt: '2026-03-26T00:00:00.000Z',
				resolvedAt: null,
				requestedByWorkerId: null,
				reviewerWorkerId: null,
				summary: 'Waiting for review.'
			}
		],
		approvals: [
			{
				id: 'approval_pending',
				taskId: 'task_review',
				runId: null,
				mode: 'before_complete',
				status: 'pending',
				createdAt: '2026-03-26T00:00:00.000Z',
				updatedAt: '2026-03-26T00:00:00.000Z',
				resolvedAt: null,
				requestedByWorkerId: null,
				approverWorkerId: null,
				summary: 'Waiting for final approval.'
			}
		]
	};
}

describe('control-plane helpers', () => {
	it('creates tasks with explicit governance fields', () => {
		const task = createTask({
			title: 'Governed task',
			summary: 'has review and approval settings',
			projectId: 'project_1',
			lane: 'ops',
			goalId: 'goal_1',
			priority: 'high',
			riskLevel: 'high',
			approvalMode: 'before_apply',
			requiresReview: true,
			desiredRoleId: 'role_reviewer',
			artifactPath: '/tmp/output',
			dependencyTaskIds: ['task_alpha']
		});

		expect(task.riskLevel).toBe('high');
		expect(task.approvalMode).toBe('before_apply');
		expect(task.requiresReview).toBe(true);
		expect(task.dependencyTaskIds).toEqual(['task_alpha']);
		expect(task.blockedReason).toBe('');
		expect(task.runCount).toBe(0);
		expect(task.latestRunId).toBeNull();
	});

	it('creates runs as first-class execution records', () => {
		const run = createRun({
			taskId: 'task_1',
			workerId: 'worker_1',
			providerId: 'provider_1',
			status: 'running',
			sessionId: 'session_1',
			summary: 'Executing task.'
		});

		expect(run.id).toMatch(/^run_/);
		expect(run.taskId).toBe('task_1');
		expect(run.workerId).toBe('worker_1');
		expect(run.status).toBe('running');
		expect(run.sessionId).toBe('session_1');
	});

	it('creates review and approval records for governance queues', () => {
		const review = createReview({
			taskId: 'task_1',
			runId: 'run_1',
			summary: 'Waiting on review.'
		});
		const approval = createApproval({
			taskId: 'task_1',
			runId: 'run_1',
			mode: 'before_complete',
			summary: 'Waiting on final approval.'
		});

		expect(review.id).toMatch(/^review_/);
		expect(review.status).toBe('open');
		expect(approval.id).toMatch(/^approval_/);
		expect(approval.status).toBe('pending');
	});

	it('detects unmet dependencies', () => {
		const data = buildFixture();

		expect(taskHasUnmetDependencies(data, data.tasks[1]!)).toBe(false);
		expect(taskHasUnmetDependencies(data, data.tasks[2]!)).toBe(true);
	});

	it('summarizes review, dependency, and risk counts', () => {
		const summary = summarizeControlPlane(buildFixture());

		expect(summary.taskCount).toBe(3);
		expect(summary.runCount).toBe(1);
		expect(summary.activeRunCount).toBe(0);
		expect(summary.openReviewCount).toBe(1);
		expect(summary.pendingApprovalCount).toBe(1);
		expect(summary.projectCount).toBe(0);
		expect(summary.readyTaskCount).toBe(1);
		expect(summary.reviewTaskCount).toBe(1);
		expect(summary.reviewRequiredTaskCount).toBe(1);
		expect(summary.dependencyBlockedTaskCount).toBe(1);
		expect(summary.highRiskTaskCount).toBe(1);
	});

	it('synthesizes missing governance queue records from task state', () => {
		const fixture = buildFixture();
		fixture.reviews = [];
		fixture.approvals = [];

		const next = syncGovernanceQueues(fixture);

		expect(next.reviews).toEqual([
			expect.objectContaining({
				taskId: 'task_review',
				status: 'open'
			})
		]);
		expect(next.approvals).toEqual([
			expect.objectContaining({
				taskId: 'task_review',
				mode: 'before_complete',
				status: 'pending'
			})
		]);
	});

	it('creates projects with blank config defaults when omitted', () => {
		const project = createProject({
			name: 'Prototype',
			summary: 'holds reusable paths and repo defaults',
			lane: 'product'
		});

		expect(project.id).toMatch(/^project_/);
		expect(project.projectRootFolder).toBe('');
		expect(project.defaultArtifactRoot).toBe('');
		expect(project.defaultRepoPath).toBe('');
		expect(project.defaultRepoUrl).toBe('');
		expect(project.defaultBranch).toBe('');
	});

	it('matches project paths against configured roots with path boundaries', () => {
		const project = createProject({
			name: 'Prototype',
			summary: 'holds reusable paths and repo defaults',
			lane: 'product',
			projectRootFolder: '/tmp/prototype',
			defaultArtifactRoot: '/tmp/prototype/agent_output',
			defaultRepoPath: '/tmp/checkouts/prototype'
		});

		expect(projectMatchesPath(project, '/tmp/prototype')).toBe(true);
		expect(projectMatchesPath(project, '/tmp/prototype/docs/brief.md')).toBe(true);
		expect(projectMatchesPath(project, '/tmp/prototype-app')).toBe(false);
		expect(projectMatchesPath(project, '/tmp/checkouts/prototype/src')).toBe(true);
		expect(projectMatchesPath(project, '/tmp/unrelated/output')).toBe(false);
	});

	it('creates providers with configurable setup defaults', () => {
		const provider = createProvider({
			name: 'OpenAI Codex CLI',
			service: 'OpenAI',
			kind: 'local',
			description: 'Local repo-aware coding surface',
			enabled: true,
			setupStatus: 'connected',
			authMode: 'local_cli',
			defaultModel: 'gpt-5.4',
			launcher: 'codex',
			envVars: ['OPENAI_API_KEY'],
			capabilities: ['repo edits', 'terminal'],
			notes: 'Primary local coding path'
		});

		expect(provider.id).toMatch(/^provider_/);
		expect(provider.enabled).toBe(true);
		expect(provider.authMode).toBe('local_cli');
		expect(provider.envVars).toEqual(['OPENAI_API_KEY']);
		expect(provider.capabilities).toEqual(['repo edits', 'terminal']);
	});
});
