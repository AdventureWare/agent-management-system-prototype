import { describe, expect, it } from 'vitest';
import {
	collectControlPlaneIntegrityIssues,
	createApproval,
	createProvider,
	createProject,
	createReview,
	createRun,
	createTask,
	deleteGoal,
	deleteProject,
	deleteTask,
	getProjectScopeProjectIds,
	projectMatchesPath,
	resolveThreadSandbox,
	syncGovernanceQueues,
	summarizeControlPlane,
	taskHasUnmetDependencies,
	wouldCreateProjectCycle
} from './control-plane';
import type { ControlPlaneData } from '$lib/types/control-plane';

function buildFixture(): ControlPlaneData {
	return {
		providers: [],
		roles: [],
		projects: [],
		goals: [],
		executionSurfaces: [],
		tasks: [
			{
				id: 'task_done',
				title: 'Done task',
				summary: 'finished dependency',
				projectId: 'project_1',
				area: 'product',
				goalId: 'goal_1',
				priority: 'medium',
				status: 'done',
				riskLevel: 'low',
				approvalMode: 'none',
				requiresReview: false,
				desiredRoleId: 'role_app_worker',
				assigneeExecutionSurfaceId: null,
				agentThreadId: 'session_1',
				blockedReason: '',
				dependencyTaskIds: [],
				runCount: 1,
				latestRunId: 'run_done',
				artifactPath: '/tmp/done',
				attachments: [],
				createdAt: '2026-03-26T00:00:00.000Z',
				updatedAt: '2026-03-26T00:00:00.000Z'
			},
			{
				id: 'task_review',
				title: 'Review task',
				summary: 'needs review',
				projectId: 'project_1',
				area: 'product',
				goalId: 'goal_1',
				priority: 'high',
				status: 'review',
				riskLevel: 'high',
				approvalMode: 'before_complete',
				requiresReview: true,
				desiredRoleId: 'role_app_worker',
				assigneeExecutionSurfaceId: null,
				agentThreadId: null,
				blockedReason: '',
				dependencyTaskIds: ['task_done'],
				runCount: 0,
				latestRunId: null,
				artifactPath: '/tmp/review',
				attachments: [],
				createdAt: '2026-03-26T00:00:00.000Z',
				updatedAt: '2026-03-26T00:00:00.000Z'
			},
			{
				id: 'task_waiting',
				title: 'Waiting task',
				summary: 'dependency is not done',
				projectId: 'project_2',
				area: 'growth',
				goalId: 'goal_2',
				priority: 'urgent',
				status: 'ready',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: true,
				desiredRoleId: 'role_researcher',
				assigneeExecutionSurfaceId: null,
				agentThreadId: null,
				blockedReason: '',
				dependencyTaskIds: ['task_review'],
				runCount: 0,
				latestRunId: null,
				artifactPath: '/tmp/waiting',
				attachments: [],
				createdAt: '2026-03-26T00:00:00.000Z',
				updatedAt: '2026-03-26T00:00:00.000Z'
			}
		],
		runs: [
			{
				id: 'run_done',
				taskId: 'task_done',
				executionSurfaceId: 'worker_one',
				providerId: 'provider_local_codex',
				status: 'completed',
				createdAt: '2026-03-26T00:00:00.000Z',
				updatedAt: '2026-03-26T00:10:00.000Z',
				startedAt: '2026-03-26T00:00:00.000Z',
				endedAt: '2026-03-26T00:10:00.000Z',
				threadId: 'thread_1',
				agentThreadId: 'session_1',
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
				requestedByExecutionSurfaceId: null,
				reviewerExecutionSurfaceId: null,
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
				requestedByExecutionSurfaceId: null,
				approverExecutionSurfaceId: null,
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
			area: 'ops',
			goalId: 'goal_1',
			parentTaskId: 'task_parent',
			delegationPacket: {
				objective: 'Own the specialized packet work.',
				inputContext: 'Parent task summary.',
				expectedDeliverable: 'Schema and UI updates.',
				doneCondition: 'The parent can integrate without guessing.',
				integrationNotes: 'Report risks back to the parent.'
			},
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
		expect(task.parentTaskId).toBe('task_parent');
		expect(task.delegationPacket).toEqual({
			objective: 'Own the specialized packet work.',
			inputContext: 'Parent task summary.',
			expectedDeliverable: 'Schema and UI updates.',
			doneCondition: 'The parent can integrate without guessing.',
			integrationNotes: 'Report risks back to the parent.'
		});
		expect(task.dependencyTaskIds).toEqual(['task_alpha']);
		expect(task.blockedReason).toBe('');
		expect(task.runCount).toBe(0);
		expect(task.latestRunId).toBeNull();
		expect(task.agentThreadId).toBeNull();
		expect(task.estimateHours).toBeNull();
		expect(task.targetDate).toBeNull();
		expect(task.attachments).toEqual([]);
	});

	it('creates runs as first-class execution records', () => {
		const run = createRun({
			taskId: 'task_1',
			executionSurfaceId: 'worker_1',
			providerId: 'provider_1',
			status: 'running',
			agentThreadId: 'session_1',
			summary: 'Executing task.'
		});

		expect(run.id).toMatch(/^run_/);
		expect(run.taskId).toBe('task_1');
		expect(run.executionSurfaceId).toBe('worker_1');
		expect(run.status).toBe('running');
		expect(run.agentThreadId).toBe('session_1');
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

	it('creates providers with a default thread sandbox', () => {
		const provider = createProvider({
			name: 'Local Codex',
			service: 'OpenAI',
			kind: 'local',
			description: 'Local CLI provider',
			enabled: true,
			setupStatus: 'connected',
			authMode: 'local_cli'
		});

		expect(provider.defaultThreadSandbox).toBe('workspace-write');
	});

	it('detects unmet dependencies', () => {
		const data = buildFixture();

		expect(taskHasUnmetDependencies(data, data.tasks[1]!)).toBe(false);
		expect(taskHasUnmetDependencies(data, data.tasks[2]!)).toBe(true);
	});

	it('deletes a task and cleans up related execution state', () => {
		const data = buildFixture();
		data.tasks[2] = {
			...data.tasks[2]!,
			parentTaskId: 'task_review'
		};
		data.runs.push({
			id: 'run_review',
			taskId: 'task_review',
			executionSurfaceId: 'worker_two',
			providerId: 'provider_local_codex',
			status: 'running',
			createdAt: '2026-03-26T00:20:00.000Z',
			updatedAt: '2026-03-26T00:25:00.000Z',
			startedAt: '2026-03-26T00:20:00.000Z',
			endedAt: null,
			threadId: 'thread_2',
			agentThreadId: 'session_2',
			promptDigest: 'def456',
			artifactPaths: ['/tmp/review'],
			summary: 'Still executing.',
			lastHeartbeatAt: '2026-03-26T00:24:00.000Z',
			errorSummary: ''
		});
		data.tasks[1] = {
			...data.tasks[1]!,
			latestRunId: 'run_review',
			runCount: 1
		};
		data.reviews[0] = {
			...data.reviews[0]!,
			runId: 'run_review'
		};
		data.approvals[0] = {
			...data.approvals[0]!,
			runId: 'run_review'
		};

		const next = deleteTask(data, 'task_review');
		const waitingTask = next.tasks.find((task) => task.id === 'task_waiting');

		expect(next.tasks.map((task) => task.id)).toEqual(['task_done', 'task_waiting']);
		expect(waitingTask?.dependencyTaskIds).toEqual([]);
		expect(waitingTask?.parentTaskId).toBeNull();
		expect(next.runs.map((run) => run.id)).toEqual(['run_done']);
		expect(next.reviews).toEqual([]);
		expect(next.approvals).toEqual([]);
	});

	it('deletes a goal, detaches linked tasks, and promotes child goals', () => {
		const data = buildFixture();
		data.goals = [
			{
				id: 'goal_parent',
				name: 'Parent goal',
				area: 'product',
				status: 'running',
				summary: 'Parent summary',
				artifactPath: '/tmp/project',
				parentGoalId: null,
				projectIds: ['project_1'],
				taskIds: [],
				targetDate: null,
				planningPriority: 0,
				confidence: 'medium'
			},
			{
				id: 'goal_1',
				name: 'Deleted goal',
				area: 'product',
				status: 'ready',
				summary: 'Delete me',
				artifactPath: '/tmp/project/goal',
				parentGoalId: 'goal_parent',
				projectIds: ['project_1'],
				taskIds: ['task_review'],
				targetDate: null,
				planningPriority: 0,
				confidence: 'medium'
			},
			{
				id: 'goal_child',
				name: 'Child goal',
				area: 'product',
				status: 'ready',
				summary: 'Child summary',
				artifactPath: '/tmp/project/goal/child',
				parentGoalId: 'goal_1',
				projectIds: ['project_1'],
				taskIds: [],
				targetDate: null,
				planningPriority: 0,
				confidence: 'medium'
			}
		];
		data.planningSessions = [
			{
				id: 'planning_1',
				windowStart: '2026-03-01',
				windowEnd: '2026-03-07',
				projectId: 'project_1',
				goalId: 'goal_1',
				executionSurfaceId: null,
				includeUnscheduled: true,
				goalIds: ['goal_parent', 'goal_1', 'goal_child'],
				taskIds: ['task_review'],
				decisionIds: ['decision_1'],
				summary: 'Planning summary',
				createdAt: '2026-03-01T00:00:00.000Z'
			}
		];
		data.decisions = [
			{
				id: 'decision_1',
				taskId: null,
				goalId: 'goal_1',
				runId: null,
				reviewId: null,
				approvalId: null,
				planningSessionId: 'planning_1',
				decisionType: 'goal_plan_updated',
				summary: 'Goal updated',
				createdAt: '2026-03-01T00:00:00.000Z',
				decidedByExecutionSurfaceId: null
			}
		];

		const next = deleteGoal(data, 'goal_1');

		expect(next.goals.map((goal) => goal.id)).toEqual(['goal_parent', 'goal_child']);
		expect(next.goals.find((goal) => goal.id === 'goal_child')?.parentGoalId).toBe('goal_parent');
		expect(next.tasks.find((task) => task.id === 'task_done')?.goalId).toBe('');
		expect(next.tasks.find((task) => task.id === 'task_review')?.goalId).toBe('');
		expect(next.planningSessions?.[0]).toMatchObject({
			goalId: null,
			goalIds: ['goal_parent', 'goal_child']
		});
		expect(next.decisions?.[0]?.goalId).toBeNull();
	});

	it('reports dangling task and goal references', () => {
		const data = buildFixture();
		data.goals = [
			{
				id: 'goal_1',
				name: 'Primary goal',
				area: 'product',
				status: 'running',
				summary: 'Primary goal summary',
				artifactPath: '/tmp/project',
				parentGoalId: null,
				projectIds: ['project_1'],
				taskIds: ['task_done', 'task_review'],
				targetDate: null,
				planningPriority: 0,
				confidence: 'medium'
			},
			{
				id: 'goal_orphan_child',
				name: 'Orphan child',
				area: 'product',
				status: 'ready',
				summary: 'Child goal with a missing parent',
				artifactPath: '/tmp/project/orphan',
				parentGoalId: 'goal_missing',
				projectIds: [],
				taskIds: [],
				targetDate: null,
				planningPriority: 0,
				confidence: 'medium'
			}
		];
		data.tasks = data.tasks.filter((task) => task.id !== 'task_review');

		expect(collectControlPlaneIntegrityIssues(data)).toEqual(
			expect.arrayContaining([
				'Goal goal_1 references missing task task_review.',
				'Goal goal_orphan_child references missing parent goal goal_missing.',
				'Task task_waiting references missing goal goal_2.',
				'Review review_open references missing task task_review.',
				'Approval approval_pending references missing task task_review.'
			])
		);
	});

	it('deletes a project and removes explicit goal and planning links', () => {
		const data = buildFixture();
		data.projects = [
			{
				id: 'project_1',
				name: 'Primary project',
				summary: 'Project summary',
				parentProjectId: null,
				projectRootFolder: '/tmp/project',
				defaultArtifactRoot: '/tmp/project/agent_output',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: ''
			},
			{
				id: 'project_2',
				name: 'Secondary project',
				summary: 'Other summary',
				parentProjectId: 'project_1',
				projectRootFolder: '/tmp/project-2',
				defaultArtifactRoot: '/tmp/project-2/agent_output',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: ''
			}
		];
		data.goals = [
			{
				id: 'goal_1',
				name: 'Goal one',
				area: 'product',
				status: 'ready',
				summary: 'Goal summary',
				artifactPath: '/tmp/project/goal',
				parentGoalId: null,
				projectIds: ['project_1', 'project_2'],
				taskIds: [],
				targetDate: null,
				planningPriority: 0,
				confidence: 'medium'
			}
		];
		data.planningSessions = [
			{
				id: 'planning_1',
				windowStart: '2026-03-01',
				windowEnd: '2026-03-07',
				projectId: 'project_1',
				goalId: null,
				executionSurfaceId: null,
				includeUnscheduled: true,
				goalIds: [],
				taskIds: [],
				decisionIds: [],
				summary: 'Planning summary',
				createdAt: '2026-03-01T00:00:00.000Z'
			}
		];

		const next = deleteProject(data, 'project_1');

		expect(next.projects.map((project) => project.id)).toEqual(['project_2']);
		expect(next.projects[0]?.parentProjectId).toBeNull();
		expect(next.goals[0]?.projectIds).toEqual(['project_2']);
		expect(next.planningSessions?.[0]?.projectId).toBeNull();
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
			summary: 'holds reusable paths and repo defaults'
		});

		expect(project.id).toMatch(/^project_/);
		expect(project.projectRootFolder).toBe('');
		expect(project.defaultArtifactRoot).toBe('');
		expect(project.defaultRepoPath).toBe('');
		expect(project.defaultRepoUrl).toBe('');
		expect(project.defaultBranch).toBe('');
		expect(project.additionalWritableRoots).toEqual([]);
		expect(project.defaultThreadSandbox).toBeNull();
	});

	it('creates projects with an optional parent project link', () => {
		const project = createProject({
			name: 'Kwipoo website',
			summary: 'Marketing site',
			parentProjectId: 'project_kwipoo'
		});

		expect(project.parentProjectId).toBe('project_kwipoo');
	});

	it('strips shell-style wrapping quotes from project paths', () => {
		const project = createProject({
			name: 'Quoted project',
			summary: 'holds reusable paths and repo defaults',
			projectRootFolder: "'/tmp/prototype'",
			defaultArtifactRoot: '"/tmp/prototype/agent_output"',
			defaultRepoPath: "'/tmp/checkouts/prototype'",
			additionalWritableRoots: ["'/tmp/iCloud/Documents'", '"/tmp/dropbox/shared"']
		});

		expect(project.projectRootFolder).toBe('/tmp/prototype');
		expect(project.defaultArtifactRoot).toBe('/tmp/prototype/agent_output');
		expect(project.defaultRepoPath).toBe('/tmp/checkouts/prototype');
		expect(project.additionalWritableRoots).toEqual([
			'/tmp/iCloud/Documents',
			'/tmp/dropbox/shared'
		]);
	});

	it('matches project paths against configured roots with path boundaries', () => {
		const project = createProject({
			name: 'Prototype',
			summary: 'holds reusable paths and repo defaults',
			projectRootFolder: '/tmp/prototype',
			defaultArtifactRoot: '/tmp/prototype/agent_output',
			defaultRepoPath: '/tmp/checkouts/prototype',
			additionalWritableRoots: ['/tmp/iCloud/shared']
		});

		expect(projectMatchesPath(project, '/tmp/prototype')).toBe(true);
		expect(projectMatchesPath(project, '/tmp/prototype/docs/brief.md')).toBe(true);
		expect(projectMatchesPath(project, '/tmp/prototype-app')).toBe(false);
		expect(projectMatchesPath(project, '/tmp/checkouts/prototype/src')).toBe(true);
		expect(projectMatchesPath(project, '/tmp/iCloud/shared/client/brief.md')).toBe(true);
		expect(projectMatchesPath(project, '/tmp/unrelated/output')).toBe(false);
	});

	it('collects a project scope across descendant subprojects', () => {
		const projects = [
			{
				id: 'project_kwipoo',
				name: 'Kwipoo',
				summary: '',
				parentProjectId: null,
				projectRootFolder: '/tmp/kwipoo',
				defaultArtifactRoot: '',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: ''
			},
			{
				id: 'project_app',
				name: 'Kwipoo app',
				summary: '',
				parentProjectId: 'project_kwipoo',
				projectRootFolder: '/tmp/kwipoo/app',
				defaultArtifactRoot: '',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: ''
			},
			{
				id: 'project_ios',
				name: 'Kwipoo iOS wrapper',
				summary: '',
				parentProjectId: 'project_app',
				projectRootFolder: '/tmp/kwipoo/ios',
				defaultArtifactRoot: '',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: ''
			}
		];

		expect(getProjectScopeProjectIds(projects, 'project_kwipoo')).toEqual([
			'project_kwipoo',
			'project_app',
			'project_ios'
		]);
	});

	it('detects project parent cycles before saving them', () => {
		const projects = [
			{
				id: 'project_kwipoo',
				name: 'Kwipoo',
				summary: '',
				parentProjectId: null,
				projectRootFolder: '/tmp/kwipoo',
				defaultArtifactRoot: '',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: ''
			},
			{
				id: 'project_app',
				name: 'Kwipoo app',
				summary: '',
				parentProjectId: 'project_kwipoo',
				projectRootFolder: '/tmp/kwipoo/app',
				defaultArtifactRoot: '',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: ''
			}
		];

		expect(wouldCreateProjectCycle(projects, 'project_kwipoo', 'project_app')).toBe(true);
		expect(wouldCreateProjectCycle(projects, 'project_app', 'project_kwipoo')).toBe(false);
	});

	it('prefers the project default sandbox before the provider default', () => {
		expect(
			resolveThreadSandbox({
				project: { defaultThreadSandbox: 'danger-full-access' },
				provider: { defaultThreadSandbox: 'workspace-write' }
			})
		).toBe('danger-full-access');
	});

	it('prefers the task sandbox requirement before execution surface, project, and provider defaults', () => {
		expect(
			resolveThreadSandbox({
				task: { requiredThreadSandbox: 'read-only' },
				executionSurface: { threadSandboxOverride: 'danger-full-access' },
				project: { defaultThreadSandbox: 'workspace-write' },
				provider: { defaultThreadSandbox: 'danger-full-access' }
			})
		).toBe('read-only');
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
