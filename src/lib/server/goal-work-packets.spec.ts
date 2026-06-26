import { describe, expect, it } from 'vitest';
import { buildGoalLoopWorkPacket } from './goal-work-packets';
import type { ControlPlaneData, Goal, Project, Review, Run, Task } from '$lib/types/control-plane';

function createProject(overrides: Partial<Project> = {}): Project {
	return {
		id: overrides.id ?? 'project_1',
		name: overrides.name ?? 'AMS',
		summary: overrides.summary ?? 'Agent management prototype.',
		projectBrief: overrides.projectBrief ?? 'Coordinate human-reviewed agent work.',
		currentStateMemo: overrides.currentStateMemo ?? 'Goal loop helpers are landing.',
		decisionLog: overrides.decisionLog ?? 'Reuse existing prompt builders.',
		agentInstructionsPath: overrides.agentInstructionsPath ?? 'AGENTS.md',
		setupNotes: overrides.setupNotes ?? '',
		validationCommands: overrides.validationCommands ?? ['npm run check'],
		codingConventions: overrides.codingConventions ?? 'Follow existing patterns.',
		approvalRequirements: overrides.approvalRequirements ?? '',
		defaultAllowedActions: overrides.defaultAllowedActions ?? [],
		defaultDisallowedActions: overrides.defaultDisallowedActions ?? [],
		defaultAutonomyLevel: overrides.defaultAutonomyLevel ?? 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE',
		defaultRiskThreshold: overrides.defaultRiskThreshold ?? 'medium',
		defaultReviewRequirement: overrides.defaultReviewRequirement ?? 'SUMMARY_REVIEW',
		defaultRigorProfile: overrides.defaultRigorProfile ?? 'INTERNAL',
		defaultValidationExpectations: overrides.defaultValidationExpectations ?? 'Run focused checks.',
		importantLinks: overrides.importantLinks ?? [],
		constraints: overrides.constraints ?? '',
		nonGoals: overrides.nonGoals ?? '',
		projectRootFolder: overrides.projectRootFolder ?? '/repo',
		defaultArtifactRoot: overrides.defaultArtifactRoot ?? '/repo/agent_output',
		defaultRepoPath: overrides.defaultRepoPath ?? '/repo',
		defaultRepoUrl: overrides.defaultRepoUrl ?? '',
		defaultBranch: overrides.defaultBranch ?? 'main'
	};
}

function createGoal(overrides: Partial<Goal> = {}): Goal {
	return {
		id: overrides.id ?? 'goal_1',
		name: overrides.name ?? 'Autonomous Goal-Directed Work Loop v0',
		area: overrides.area ?? 'product',
		status: overrides.status ?? 'running',
		summary: overrides.summary ?? 'Keep making progress toward active goals.',
		successSignal: overrides.successSignal ?? 'Bounded packets can be prepared for selected work.',
		artifactPath: overrides.artifactPath ?? '',
		projectIds: overrides.projectIds ?? ['project_1'],
		taskIds: overrides.taskIds ?? []
	};
}

function createTask(overrides: Partial<Task> = {}): Task {
	return {
		id: overrides.id ?? 'task_1',
		title: overrides.title ?? `${overrides.id ?? 'task_1'} title`,
		summary: overrides.summary ?? 'Implement a bounded change.',
		successCriteria: overrides.successCriteria ?? 'Acceptance criteria are met.',
		readyCondition: overrides.readyCondition ?? 'Ready.',
		expectedOutcome: overrides.expectedOutcome ?? 'A reviewable result exists.',
		scope: overrides.scope ?? 'Single helper only.',
		nonGoals: overrides.nonGoals ?? 'No launch or mutation.',
		validationSteps: overrides.validationSteps ?? 'Run focused tests.',
		rigorProfile: overrides.rigorProfile ?? null,
		readinessLevel: overrides.readinessLevel ?? 'R3_EXECUTABLE',
		autonomyLevel: overrides.autonomyLevel ?? 'A3_AGENT_MAY_EDIT_IN_ISOLATED_BRANCH_OR_WORKTREE',
		allowedActionNames: overrides.allowedActionNames ?? ['read files', 'edit workspace files'],
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
		riskLevel: overrides.riskLevel ?? 'low',
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
		createdAt: overrides.createdAt ?? '2026-06-25T12:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-25T12:00:00.000Z'
	};
}

function createRun(overrides: Partial<Run> = {}): Run {
	return {
		id: overrides.id ?? 'run_1',
		taskId: overrides.taskId ?? 'task_1',
		executionSurfaceId: overrides.executionSurfaceId ?? null,
		providerId: overrides.providerId ?? null,
		status: overrides.status ?? 'completed',
		createdAt: overrides.createdAt ?? '2026-06-25T12:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-25T12:30:00.000Z',
		startedAt: overrides.startedAt ?? '2026-06-25T12:00:00.000Z',
		endedAt: overrides.endedAt ?? '2026-06-25T12:30:00.000Z',
		threadId: overrides.threadId ?? 'thread_1',
		agentThreadId: overrides.agentThreadId ?? 'thread_1',
		promptDigest: overrides.promptDigest ?? 'digest',
		artifactPaths: overrides.artifactPaths ?? ['/repo/agent_output/result.md'],
		summary: overrides.summary ?? 'Implemented work.',
		lastHeartbeatAt: overrides.lastHeartbeatAt ?? null,
		errorSummary: overrides.errorSummary ?? ''
	};
}

function createReview(overrides: Partial<Review> = {}): Review {
	return {
		id: overrides.id ?? 'review_1',
		taskId: overrides.taskId ?? 'task_review',
		runId: overrides.runId ?? 'run_review',
		status: overrides.status ?? 'open',
		createdAt: overrides.createdAt ?? '2026-06-25T12:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-25T12:00:00.000Z',
		resolvedAt: overrides.resolvedAt ?? null,
		requestedByExecutionSurfaceId: overrides.requestedByExecutionSurfaceId ?? null,
		reviewerExecutionSurfaceId: overrides.reviewerExecutionSurfaceId ?? null,
		summary: overrides.summary ?? 'Ready for review.'
	};
}

function createControlPlane(input: {
	tasks: Task[];
	runs?: Run[];
	reviews?: Review[];
}): ControlPlaneData {
	const goal = createGoal({ taskIds: input.tasks.map((task) => task.id) });
	return {
		providers: [],
		roles: [],
		projects: [createProject()],
		goals: [goal],
		workflows: [],
		workflowSteps: [],
		taskTemplates: [],
		executionSurfaces: [],
		tasks: input.tasks,
		runs: input.runs ?? [],
		reviews: input.reviews ?? [],
		approvals: [],
		planningSessions: [],
		decisions: []
	};
}

describe('buildGoalLoopWorkPacket', () => {
	it('prepares an executor packet for the recommended actionable task without unrelated task context', () => {
		const selected = createTask({ id: 'task_alpha', title: 'Alpha selected task' });
		const unrelated = createTask({ id: 'task_zulu', title: 'Zulu unrelated task' });
		const packet = buildGoalLoopWorkPacket(createControlPlane({ tasks: [unrelated, selected] }), {
			projectId: 'project_1',
			goalId: 'goal_1'
		});

		expect(packet).toEqual(
			expect.objectContaining({
				mode: 'executor',
				recommendationKind: 'execute_task',
				taskId: 'task_alpha'
			})
		);
		expect(packet?.prompt).toContain('Goal Loop Selected Work Packet');
		expect(packet?.prompt).toContain('Selection reason: Execute the first actionable task');
		expect(packet?.prompt).toContain('Autonomous Goal-Directed Work Loop v0');
		expect(packet?.prompt).toContain('Expected Result Shape');
		expect(packet?.prompt).toContain('What changed');
		expect(packet?.prompt).not.toContain('Zulu unrelated task');
	});

	it('prepares a reviewer packet for review-gated work with run and review evidence', () => {
		const task = createTask({ id: 'task_review', title: 'Review this result', status: 'review' });
		const run = createRun({ id: 'run_review', taskId: task.id });
		const review = createReview({ taskId: task.id, runId: run.id });
		const packet = buildGoalLoopWorkPacket(
			createControlPlane({ tasks: [task], runs: [run], reviews: [review] }),
			{ projectId: 'project_1', goalId: 'goal_1' }
		);

		expect(packet?.mode).toBe('reviewer');
		expect(packet?.recommendationKind).toBe('review_result');
		expect(packet?.prompt).toContain('# Reviewer Mode Work Packet');
		expect(packet?.prompt).toContain('Run: run_review');
		expect(packet?.prompt).toContain('Decision: accept, reject, or needs revision');
	});

	it('prepares a research packet for research blockers', () => {
		const task = createTask({
			id: 'task_research',
			title: 'Research uncertain behavior',
			status: 'blocked',
			blockedReason: 'Research unknown API behavior before execution.'
		});
		const packet = buildGoalLoopWorkPacket(createControlPlane({ tasks: [task] }), {
			projectId: 'project_1',
			goalId: 'goal_1'
		});

		expect(packet?.mode).toBe('research');
		expect(packet?.recommendationKind).toBe('research_task');
		expect(packet?.prompt).toContain('# Research Mode Work Packet');
		expect(packet?.prompt).toContain('Findings');
		expect(packet?.stoppingConditions).toContain(
			'Do not mutate task, run, review, approval, project, or goal state from this packet.'
		);
	});

	it('prepares a planner packet for underspecified work', () => {
		const task = createTask({
			id: 'task_plan',
			title: 'Plan underspecified work',
			readinessLevel: 'R1_FRAMED',
			successCriteria: '',
			expectedOutcome: '',
			validationSteps: ''
		});
		const packet = buildGoalLoopWorkPacket(createControlPlane({ tasks: [task] }), {
			projectId: 'project_1',
			goalId: 'goal_1'
		});

		expect(packet?.mode).toBe('planner');
		expect(packet?.recommendationKind).toBe('plan_task');
		expect(packet?.prompt).toContain('# Planner Mode Work Packet');
		expect(packet?.expectedResultShape).toContain('Recommended task contract updates');
		expect(packet?.validationExpectations[0]).toContain('smallest checks');
	});
});
