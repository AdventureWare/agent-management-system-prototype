import { describe, expect, it } from 'vitest';
import { getRelevantPriorRuns } from '$lib/server/agent-prior-runs';
import type { ControlPlaneData, Goal, Project, Run, Task } from '$lib/types/control-plane';

function createProject(overrides: Partial<Project> = {}): Project {
	return {
		id: overrides.id ?? 'project_1',
		name: overrides.name ?? 'AMS',
		summary: overrides.summary ?? 'Agent management prototype.',
		projectBrief: overrides.projectBrief ?? '',
		currentStateMemo: overrides.currentStateMemo ?? '',
		decisionLog: overrides.decisionLog ?? '',
		agentInstructionsPath: overrides.agentInstructionsPath ?? '',
		setupNotes: overrides.setupNotes ?? '',
		validationCommands: overrides.validationCommands ?? [],
		codingConventions: overrides.codingConventions ?? '',
		approvalRequirements: overrides.approvalRequirements ?? '',
		defaultAllowedActions: overrides.defaultAllowedActions ?? [],
		defaultDisallowedActions: overrides.defaultDisallowedActions ?? [],
		defaultAutonomyLevel: overrides.defaultAutonomyLevel ?? 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE',
		defaultRiskThreshold: overrides.defaultRiskThreshold ?? 'medium',
		defaultReviewRequirement: overrides.defaultReviewRequirement ?? 'SUMMARY_REVIEW',
		defaultRigorProfile: overrides.defaultRigorProfile ?? 'INTERNAL',
		defaultValidationExpectations: overrides.defaultValidationExpectations ?? '',
		importantLinks: overrides.importantLinks ?? [],
		constraints: overrides.constraints ?? '',
		nonGoals: overrides.nonGoals ?? '',
		projectRootFolder: overrides.projectRootFolder ?? '',
		defaultArtifactRoot: overrides.defaultArtifactRoot ?? '',
		defaultRepoPath: overrides.defaultRepoPath ?? '',
		defaultRepoUrl: overrides.defaultRepoUrl ?? '',
		defaultBranch: overrides.defaultBranch ?? ''
	};
}

function createGoal(overrides: Partial<Goal> = {}): Goal {
	return {
		id: overrides.id ?? 'goal_1',
		name: overrides.name ?? 'Agent-facing AMS',
		area: overrides.area ?? 'product',
		status: overrides.status ?? 'running',
		summary: overrides.summary ?? 'Make AMS usable by agents.',
		successSignal: overrides.successSignal ?? '',
		artifactPath: overrides.artifactPath ?? '',
		projectIds: overrides.projectIds ?? ['project_1'],
		taskIds: overrides.taskIds ?? []
	};
}

function createTask(overrides: Partial<Task> = {}): Task {
	return {
		id: overrides.id ?? 'task_1',
		title: overrides.title ?? 'Build context tool',
		summary: overrides.summary ?? '',
		successCriteria: overrides.successCriteria ?? '',
		readyCondition: overrides.readyCondition ?? '',
		expectedOutcome: overrides.expectedOutcome ?? '',
		scope: overrides.scope ?? '',
		nonGoals: overrides.nonGoals ?? '',
		validationSteps: overrides.validationSteps ?? '',
		rigorProfile: overrides.rigorProfile ?? null,
		readinessLevel: overrides.readinessLevel ?? 'R2_SPECIFIED',
		autonomyLevel: overrides.autonomyLevel ?? 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE',
		allowedActionNames: overrides.allowedActionNames ?? [],
		reviewRequirement: overrides.reviewRequirement ?? 'SUMMARY_REVIEW',
		projectId: overrides.projectId ?? 'project_1',
		area: overrides.area ?? 'product',
		goalId: overrides.goalId ?? 'goal_1',
		taskTemplateId: overrides.taskTemplateId ?? null,
		workflowId: overrides.workflowId ?? null,
		parentTaskId: overrides.parentTaskId ?? null,
		delegationPacket: overrides.delegationPacket ?? null,
		delegationAcceptance: overrides.delegationAcceptance ?? null,
		priority: overrides.priority ?? 'medium',
		status: overrides.status ?? 'ready',
		riskLevel: overrides.riskLevel ?? 'medium',
		approvalMode: overrides.approvalMode ?? 'none',
		requiredThreadSandbox: overrides.requiredThreadSandbox ?? null,
		requiresReview: overrides.requiresReview ?? true,
		desiredRoleId: overrides.desiredRoleId ?? '',
		assigneeExecutionSurfaceId: overrides.assigneeExecutionSurfaceId ?? null,
		agentThreadId: overrides.agentThreadId ?? null,
		requiredPromptSkillNames: overrides.requiredPromptSkillNames ?? [],
		requiredCapabilityNames: overrides.requiredCapabilityNames ?? [],
		requiredToolNames: overrides.requiredToolNames ?? [],
		blockedReason: overrides.blockedReason ?? '',
		dependencyTaskIds: overrides.dependencyTaskIds ?? [],
		estimateHours: overrides.estimateHours ?? null,
		targetDate: overrides.targetDate ?? null,
		runCount: overrides.runCount ?? 0,
		latestRunId: overrides.latestRunId ?? null,
		closeoutState: overrides.closeoutState ?? null,
		closeoutSummary: overrides.closeoutSummary ?? '',
		closeoutChanged: overrides.closeoutChanged ?? '',
		closeoutValidation: overrides.closeoutValidation ?? '',
		closeoutRemainingIssues: overrides.closeoutRemainingIssues ?? '',
		closeoutFollowUps: overrides.closeoutFollowUps ?? [],
		closeoutShouldUpdateMemory: overrides.closeoutShouldUpdateMemory ?? false,
		closeoutRecordedAt: overrides.closeoutRecordedAt ?? null,
		artifactPath: overrides.artifactPath ?? '',
		attachments: overrides.attachments ?? [],
		createdAt: overrides.createdAt ?? '2026-06-01T12:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-01T12:00:00.000Z'
	};
}

function createRun(overrides: Partial<Run> = {}): Run {
	return {
		id: overrides.id ?? 'run_1',
		taskId: overrides.taskId ?? 'task_1',
		executionSurfaceId: overrides.executionSurfaceId ?? null,
		providerId: overrides.providerId ?? null,
		status: overrides.status ?? 'completed',
		createdAt: overrides.createdAt ?? '2026-06-01T12:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-01T12:05:00.000Z',
		startedAt: overrides.startedAt ?? '2026-06-01T12:00:00.000Z',
		endedAt: overrides.endedAt ?? '2026-06-01T12:05:00.000Z',
		threadId: overrides.threadId ?? null,
		agentThreadId: overrides.agentThreadId ?? null,
		promptDigest: overrides.promptDigest ?? '',
		artifactPaths: overrides.artifactPaths ?? ['agent_output/run.md'],
		summary: overrides.summary ?? 'Completed implementation.',
		lastHeartbeatAt: overrides.lastHeartbeatAt ?? null,
		errorSummary: overrides.errorSummary ?? '',
		resultSummary: overrides.resultSummary ?? 'Implemented the helper.',
		validationSummary: overrides.validationSummary ?? 'Tests passed.'
	};
}

function createData(overrides: Partial<ControlPlaneData> = {}): ControlPlaneData {
	const tasks = overrides.tasks ?? [createTask()];
	return {
		providers: [],
		roles: [],
		projects: [createProject(), createProject({ id: 'project_2', name: 'Other' })],
		goals: [createGoal({ taskIds: tasks.map((task) => task.id) })],
		workflows: [],
		workflowSteps: [],
		taskTemplates: [],
		executionSurfaces: [],
		tasks,
		runs: [],
		reviews: [],
		planningSessions: [],
		approvals: [],
		decisions: [],
		...overrides
	};
}

describe('getRelevantPriorRuns', () => {
	it('returns task-scoped runs before other project runs with concise metadata', () => {
		const data = createData({
			tasks: [
				createTask({ id: 'task_1', title: 'Primary task' }),
				createTask({ id: 'task_2', title: 'Related task' })
			],
			runs: [
				createRun({
					id: 'run_related',
					taskId: 'task_2',
					updatedAt: '2026-06-01T12:20:00.000Z'
				}),
				createRun({
					id: 'run_primary',
					taskId: 'task_1',
					updatedAt: '2026-06-01T12:10:00.000Z',
					artifactPaths: ['agent_output/primary.md']
				})
			]
		});

		const result = getRelevantPriorRuns(data, { taskId: 'task_1', limit: 5 });

		expect(result.safety.readOnly).toBe(true);
		expect(result.runs).toEqual([
			expect.objectContaining({
				id: 'run_primary',
				taskId: 'task_1',
				taskTitle: 'Primary task',
				status: 'completed',
				resultSummary: 'Implemented the helper.',
				validationSummary: 'Tests passed.',
				artifactPaths: ['agent_output/primary.md'],
				updatedAt: '2026-06-01T12:10:00.000Z',
				inclusionReason: expect.stringContaining('same_task')
			}),
			expect.objectContaining({
				id: 'run_related',
				inclusionReason: expect.stringContaining('same_goal')
			})
		]);
	});

	it('returns goal-scoped runs ranked ahead of project-only runs', () => {
		const data = createData({
			tasks: [
				createTask({ id: 'task_goal', goalId: 'goal_1' }),
				createTask({ id: 'task_project', goalId: 'goal_other' })
			],
			goals: [createGoal({ taskIds: ['task_goal'] })],
			runs: [
				createRun({ id: 'run_project', taskId: 'task_project' }),
				createRun({ id: 'run_goal', taskId: 'task_goal' })
			]
		});

		const result = getRelevantPriorRuns(data, { goalId: 'goal_1' });

		expect(result.runs.map((run) => run.id)).toEqual(['run_goal', 'run_project']);
		expect(result.runs[0].inclusionReason).toContain('same_goal');
		expect(result.runs[1].inclusionReason).toContain('same_project');
	});

	it('returns project-scoped runs and honors status filtering', () => {
		const data = createData({
			tasks: [
				createTask({ id: 'task_completed', projectId: 'project_1' }),
				createTask({ id: 'task_failed', projectId: 'project_1' }),
				createTask({ id: 'task_other', projectId: 'project_2', goalId: 'goal_other' })
			],
			runs: [
				createRun({ id: 'run_completed', taskId: 'task_completed', status: 'completed' }),
				createRun({ id: 'run_failed', taskId: 'task_failed', status: 'failed' }),
				createRun({ id: 'run_other', taskId: 'task_other', status: 'completed' })
			]
		});

		const result = getRelevantPriorRuns(data, { projectId: 'project_1', status: 'completed' });

		expect(result.status).toBe('completed');
		expect(result.runs.map((run) => run.id)).toEqual(['run_completed']);
		expect(result.runs[0].inclusionReason).toContain('same_project');
	});

	it('bounds results by limit', () => {
		const data = createData({
			runs: [
				createRun({ id: 'run_1', updatedAt: '2026-06-01T12:01:00.000Z' }),
				createRun({ id: 'run_2', updatedAt: '2026-06-01T12:02:00.000Z' }),
				createRun({ id: 'run_3', updatedAt: '2026-06-01T12:03:00.000Z' })
			]
		});

		const result = getRelevantPriorRuns(data, { projectId: 'project_1', limit: 2 });

		expect(result.limit).toBe(2);
		expect(result.runs).toHaveLength(2);
		expect(result.runs.map((run) => run.id)).toEqual(['run_3', 'run_2']);
	});

	it('returns an empty list when no scoped runs exist', () => {
		const result = getRelevantPriorRuns(createData({ runs: [] }), { projectId: 'project_1' });

		expect(result.runs).toEqual([]);
	});

	it('does not mutate control-plane data while ranking runs', () => {
		const data = createData({
			runs: [createRun({ id: 'run_readonly' })]
		});
		const before = structuredClone(data);

		getRelevantPriorRuns(data, { projectId: 'project_1' });

		expect(data).toEqual(before);
	});
});
