import { describe, expect, it } from 'vitest';
import { buildGoalWorkLoopClassification } from './goal-work-loop';
import type {
	Approval,
	ControlPlaneData,
	Project,
	Review,
	Run,
	Task,
	TaskTemplate
} from '$lib/types/control-plane';

function createProject(overrides: Partial<Project> = {}): Project {
	return {
		id: overrides.id ?? 'project_1',
		name: overrides.name ?? 'Agent Management System Prototype',
		summary: overrides.summary ?? 'Prototype the control loop.',
		defaultRigorProfile: overrides.defaultRigorProfile ?? 'INTERNAL',
		projectRootFolder: overrides.projectRootFolder ?? '/tmp/project',
		defaultArtifactRoot: overrides.defaultArtifactRoot ?? '/tmp/project/agent_output',
		defaultRepoPath: overrides.defaultRepoPath ?? '',
		defaultRepoUrl: overrides.defaultRepoUrl ?? '',
		defaultBranch: overrides.defaultBranch ?? ''
	};
}

function createTask(overrides: Partial<Task> = {}): Task {
	return {
		id: overrides.id ?? 'task_1',
		title: overrides.title ?? `${overrides.id ?? 'task_1'} title`,
		summary: overrides.summary ?? 'Implement the bounded change.',
		successCriteria: overrides.successCriteria ?? 'Acceptance criteria are met.',
		readyCondition: overrides.readyCondition ?? 'Ready.',
		expectedOutcome: overrides.expectedOutcome ?? 'A reviewed result exists.',
		scope: overrides.scope ?? 'Bounded scope.',
		nonGoals: overrides.nonGoals ?? '',
		validationSteps: overrides.validationSteps ?? 'Run checks.',
		rigorProfile: overrides.rigorProfile ?? null,
		readinessLevel: overrides.readinessLevel ?? 'R3_EXECUTABLE',
		autonomyLevel: overrides.autonomyLevel ?? 'A3_AGENT_MAY_EDIT_IN_ISOLATED_BRANCH_OR_WORKTREE',
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
		updatedAt: overrides.updatedAt ?? '2026-06-01T12:30:00.000Z',
		startedAt: overrides.startedAt ?? '2026-06-01T12:00:00.000Z',
		endedAt: overrides.endedAt ?? '2026-06-01T12:30:00.000Z',
		threadId: overrides.threadId ?? null,
		agentThreadId: overrides.agentThreadId ?? null,
		promptDigest: overrides.promptDigest ?? '',
		artifactPaths: overrides.artifactPaths ?? [],
		summary: overrides.summary ?? 'Completed implementation.',
		validationSummary: overrides.validationSummary ?? 'Checks passed.',
		resultSummary: overrides.resultSummary ?? 'Feature is ready.',
		lastHeartbeatAt: overrides.lastHeartbeatAt ?? null,
		errorSummary: overrides.errorSummary ?? ''
	};
}

function createReview(overrides: Partial<Review> = {}): Review {
	return {
		id: overrides.id ?? 'review_1',
		taskId: overrides.taskId ?? 'task_1',
		runId: overrides.runId ?? null,
		status: overrides.status ?? 'open',
		createdAt: overrides.createdAt ?? '2026-06-01T12:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-01T12:00:00.000Z',
		resolvedAt: overrides.resolvedAt ?? null,
		requestedByExecutionSurfaceId: overrides.requestedByExecutionSurfaceId ?? null,
		reviewerExecutionSurfaceId: overrides.reviewerExecutionSurfaceId ?? null,
		summary: overrides.summary ?? 'Ready for review.'
	};
}

function createApproval(overrides: Partial<Approval> = {}): Approval {
	return {
		id: overrides.id ?? 'approval_1',
		taskId: overrides.taskId ?? 'task_1',
		runId: overrides.runId ?? null,
		mode: overrides.mode ?? 'before_complete',
		status: overrides.status ?? 'pending',
		createdAt: overrides.createdAt ?? '2026-06-01T12:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-01T12:00:00.000Z',
		resolvedAt: overrides.resolvedAt ?? null,
		requestedByExecutionSurfaceId: overrides.requestedByExecutionSurfaceId ?? null,
		approverExecutionSurfaceId: overrides.approverExecutionSurfaceId ?? null,
		summary: overrides.summary ?? 'Needs approval.'
	};
}

function createTemplate(overrides: Partial<TaskTemplate> = {}): TaskTemplate {
	return {
		id: overrides.id ?? 'template_1',
		name: overrides.name ?? 'Template',
		summary: overrides.summary ?? 'Reusable task shape.',
		projectId: overrides.projectId ?? 'project_1',
		lifecycleStatus: overrides.lifecycleStatus ?? 'active',
		sourceTaskTemplateId: overrides.sourceTaskTemplateId ?? null,
		forkReason: overrides.forkReason ?? '',
		supersededByTaskTemplateId: overrides.supersededByTaskTemplateId ?? null,
		goalId: overrides.goalId ?? 'goal_1',
		workflowId: overrides.workflowId ?? null,
		taskTitle: overrides.taskTitle ?? 'Template task',
		taskSummary: overrides.taskSummary ?? 'Do work.',
		successCriteria: overrides.successCriteria ?? 'Done.',
		readyCondition: overrides.readyCondition ?? 'Ready.',
		expectedOutcome: overrides.expectedOutcome ?? 'Outcome.',
		scope: overrides.scope ?? '',
		nonGoals: overrides.nonGoals ?? '',
		validationSteps: overrides.validationSteps ?? 'Check.',
		rigorProfile: overrides.rigorProfile ?? null,
		readinessLevel: overrides.readinessLevel ?? 'R3_EXECUTABLE',
		autonomyLevel: overrides.autonomyLevel ?? 'A3_AGENT_MAY_EDIT_IN_ISOLATED_BRANCH_OR_WORKTREE',
		allowedActionNames: overrides.allowedActionNames ?? [],
		reviewRequirement: overrides.reviewRequirement ?? 'SUMMARY_REVIEW',
		area: overrides.area ?? 'product',
		priority: overrides.priority ?? 'medium',
		riskLevel: overrides.riskLevel ?? 'low',
		approvalMode: overrides.approvalMode ?? 'none',
		requiredThreadSandbox: overrides.requiredThreadSandbox ?? null,
		requiresReview: overrides.requiresReview ?? true,
		desiredRoleId: overrides.desiredRoleId ?? '',
		assigneeExecutionSurfaceId: overrides.assigneeExecutionSurfaceId ?? null,
		requiredPromptSkillNames: overrides.requiredPromptSkillNames ?? [],
		requiredCapabilityNames: overrides.requiredCapabilityNames ?? [],
		requiredToolNames: overrides.requiredToolNames ?? [],
		createdAt: overrides.createdAt ?? '2026-06-01T12:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-01T12:00:00.000Z'
	};
}

function createControlPlane(input: {
	tasks: Task[];
	runs?: Run[];
	reviews?: Review[];
	approvals?: Approval[];
	templates?: TaskTemplate[];
}): ControlPlaneData {
	return {
		providers: [
			{
				id: 'provider_codex',
				name: 'Codex',
				service: 'codex',
				kind: 'local',
				description: '',
				enabled: true,
				setupStatus: 'connected',
				authMode: 'local_cli',
				defaultModel: '',
				baseUrl: '',
				launcher: 'codex',
				envVars: [],
				capabilities: ['implementation'],
				defaultThreadSandbox: 'workspace-write',
				notes: ''
			}
		],
		roles: [],
		projects: [createProject()],
		goals: [
			{
				id: 'goal_1',
				name: 'Autonomous Goal-Directed Work Loop v0',
				area: 'product',
				status: 'running',
				summary: 'Keep making progress toward active goals.',
				artifactPath: '',
				projectIds: ['project_1'],
				taskIds: input.tasks.map((task) => task.id),
				planningPriority: 5
			}
		],
		workflows: [],
		workflowSteps: [],
		taskTemplates: input.templates ?? [],
		executionSurfaces: [],
		tasks: input.tasks,
		runs: input.runs ?? [],
		reviews: input.reviews ?? [],
		approvals: input.approvals ?? [],
		planningSessions: [],
		decisions: []
	};
}

function classify(input: Parameters<typeof createControlPlane>[0]) {
	return buildGoalWorkLoopClassification(createControlPlane(input), {
		projectId: 'project_1',
		goalId: 'goal_1'
	});
}

describe('buildGoalWorkLoopClassification', () => {
	it('classifies ready, in-scope, validated work as actionable now', () => {
		const task = createTask({ id: 'task_ready' });
		const result = classify({ tasks: [task] });

		expect(result.actionableTasks.map((item) => item.id)).toEqual(['task_ready']);
		expect(result.byClassification.actionable_now[0]?.reasons).toContainEqual(
			expect.objectContaining({ code: 'actionable' })
		);
	});

	it('excludes project tasks that are explicitly linked to another goal', () => {
		const activeGoalTask = createTask({ id: 'task_active_goal', goalId: 'goal_1' });
		const otherGoalTask = createTask({ id: 'task_other_goal', goalId: 'goal_other' });
		const data = createControlPlane({ tasks: [activeGoalTask, otherGoalTask] });
		data.goals[0]!.taskIds = ['task_active_goal'];
		data.goals.push({
			id: 'goal_other',
			name: 'Other goal',
			area: 'product',
			status: 'running',
			summary: 'Separate work.',
			artifactPath: '',
			projectIds: ['project_1'],
			taskIds: ['task_other_goal'],
			planningPriority: 1
		});

		const result = buildGoalWorkLoopClassification(data, {
			projectId: 'project_1',
			goalId: 'goal_1'
		});

		expect(result.tasks.map((task) => task.id)).toEqual(['task_active_goal']);
		expect(result.recommendation).toEqual(
			expect.objectContaining({
				kind: 'execute_task',
				taskIds: ['task_active_goal']
			})
		);
	});

	it('does not pull ungoaled project tasks into a goal with explicit task ids', () => {
		const activeGoalTask = createTask({ id: 'task_active_goal', goalId: 'goal_1' });
		const ungoaledProjectTask = createTask({ id: 'task_project_backlog', goalId: '' });
		const data = createControlPlane({ tasks: [activeGoalTask, ungoaledProjectTask] });
		data.goals[0]!.taskIds = ['task_active_goal'];

		const result = buildGoalWorkLoopClassification(data, {
			projectId: 'project_1',
			goalId: 'goal_1'
		});

		expect(result.tasks.map((task) => task.id)).toEqual(['task_active_goal']);
		expect(result.recommendation.taskIds).toEqual(['task_active_goal']);
	});

	it('does not let done out-of-scope project tasks drive a goal recommendation', () => {
		const activeGoalTask = createTask({ id: 'task_active_goal', goalId: 'goal_1' });
		const doneProjectTask = createTask({
			id: 'task_done_project_backlog',
			goalId: '',
			status: 'done'
		});
		const data = createControlPlane({ tasks: [activeGoalTask, doneProjectTask] });
		data.goals[0]!.taskIds = ['task_active_goal'];

		const result = buildGoalWorkLoopClassification(data, {
			projectId: 'project_1',
			goalId: 'goal_1'
		});

		expect(result.tasks.map((task) => task.id)).toEqual(['task_active_goal']);
		expect(result.recommendation.taskIds).toEqual(['task_active_goal']);
	});

	it('excludes accepted and done work from actionable tasks', () => {
		const result = classify({
			tasks: [
				createTask({
					id: 'task_done',
					status: 'done',
					closeoutState: 'accepted'
				})
			]
		});

		expect(result.byClassification.accepted_done.map((task) => task.id)).toEqual(['task_done']);
		expect(result.actionableTasks).toHaveLength(0);
	});

	it('classifies canceled work as terminal and non-actionable', () => {
		const result = classify({
			tasks: [
				createTask({
					id: 'task_canceled',
					status: 'canceled'
				})
			]
		});

		expect(result.byClassification.duplicate_superseded.map((task) => task.id)).toEqual([
			'task_canceled'
		]);
		expect(result.byClassification.duplicate_superseded[0]?.reasons).toContainEqual(
			expect.objectContaining({
				code: 'duplicate_or_superseded',
				message: 'Task status is canceled.'
			})
		);
		expect(result.actionableTasks).toHaveLength(0);
	});

	it('classifies in-progress work separately from new action candidates', () => {
		const result = classify({
			tasks: [createTask({ id: 'task_progress', status: 'in_progress', latestRunId: 'run_1' })],
			runs: [createRun({ id: 'run_1', taskId: 'task_progress', status: 'running' })]
		});

		expect(result.byClassification.in_progress.map((task) => task.id)).toEqual(['task_progress']);
	});

	it('explains unmet dependencies as blocked work', () => {
		const dependency = createTask({ id: 'task_dependency', status: 'in_progress' });
		const task = createTask({
			id: 'task_waiting',
			dependencyTaskIds: ['task_dependency']
		});
		const result = classify({ tasks: [dependency, task] });
		const classified = result.byClassification.blocked.find((item) => item.id === 'task_waiting');

		expect(classified?.openDependencyTaskIds).toEqual(['task_dependency']);
		expect(classified?.reasons).toContainEqual(
			expect.objectContaining({ code: 'dependency_not_complete' })
		);
	});

	it('routes open review and pending approval gates before execution', () => {
		const reviewTask = createTask({ id: 'task_review', status: 'review' });
		const approvalTask = createTask({ id: 'task_approval' });
		const result = classify({
			tasks: [reviewTask, approvalTask],
			reviews: [createReview({ taskId: 'task_review' })],
			approvals: [createApproval({ taskId: 'task_approval' })]
		});

		expect(result.byClassification.awaiting_review.map((task) => task.id)).toEqual(['task_review']);
		expect(result.byClassification.approval_required.map((task) => task.id)).toEqual([
			'task_approval'
		]);
	});

	it('uses readiness to distinguish clarification, research, and planning gaps', () => {
		const clarification = createTask({
			id: 'task_clarify',
			status: 'blocked',
			blockedReason: 'Need to clarify the user preference.'
		});
		const research = createTask({
			id: 'task_research',
			status: 'blocked',
			blockedReason: 'Research unknown API behavior.'
		});
		const planning = createTask({
			id: 'task_plan',
			readinessLevel: 'R1_FRAMED',
			successCriteria: '',
			expectedOutcome: '',
			validationSteps: ''
		});
		const result = classify({ tasks: [clarification, research, planning] });

		expect(result.byClassification.needs_clarification.map((task) => task.id)).toEqual([
			'task_clarify'
		]);
		expect(result.byClassification.needs_research.map((task) => task.id)).toEqual([
			'task_research'
		]);
		expect(result.byClassification.needs_planning.map((task) => task.id)).toEqual(['task_plan']);
		expect(result.byClassification.needs_planning[0]?.reasons).toContainEqual(
			expect.objectContaining({ code: 'insufficient_validation' })
		);
	});

	it('excludes high-risk, high-stakes, A0, and A5 work from autonomous action', () => {
		const result = classify({
			tasks: [
				createTask({ id: 'task_high', riskLevel: 'high' }),
				createTask({ id: 'task_stakes', rigorProfile: 'HIGH_STAKES' }),
				createTask({ id: 'task_a0', autonomyLevel: 'A0_HUMAN_ONLY' }),
				createTask({
					id: 'task_a5',
					autonomyLevel: 'A5_AGENT_MAY_MERGE_DEPLOY_OR_CHANGE_EXTERNAL_STATE'
				})
			]
		});

		expect(result.byClassification.unsafe_out_of_scope.map((task) => task.id)).toEqual([
			'task_high',
			'task_stakes',
			'task_a0',
			'task_a5'
		]);
		expect(result.actionableTasks).toHaveLength(0);
	});

	it('detects likely duplicate and superseded task-template work', () => {
		const duplicateA = createTask({ id: 'task_duplicate_a', title: 'Same title' });
		const duplicateB = createTask({ id: 'task_duplicate_b', title: 'Same title' });
		const superseded = createTask({
			id: 'task_superseded',
			title: 'Superseded template task',
			taskTemplateId: 'template_old'
		});
		const result = classify({
			tasks: [duplicateA, duplicateB, superseded],
			templates: [
				createTemplate({
					id: 'template_old',
					lifecycleStatus: 'superseded',
					supersededByTaskTemplateId: 'template_new'
				})
			]
		});

		expect(result.byClassification.duplicate_superseded.map((task) => task.id)).toEqual([
			'task_duplicate_a',
			'task_duplicate_b',
			'task_superseded'
		]);
	});

	it('recommends revision, approval, and review gates before new execution', () => {
		const ready = createTask({ id: 'task_ready' });
		const revision = createTask({
			id: 'task_revision',
			closeoutState: 'needs_revision',
			closeoutRemainingIssues: 'Tighten the validation evidence.'
		});
		const approval = createTask({ id: 'task_approval' });
		const review = createTask({ id: 'task_review', status: 'review' });
		const revisionResult = classify({
			tasks: [ready, approval, review, revision],
			reviews: [createReview({ taskId: 'task_review' })]
		});
		const approvalResult = classify({
			tasks: [ready, approval, review],
			reviews: [createReview({ taskId: 'task_review' })],
			approvals: [createApproval({ taskId: 'task_approval' })]
		});
		const reviewResult = classify({
			tasks: [ready, review],
			reviews: [createReview({ taskId: 'task_review' })]
		});

		expect(revisionResult.recommendation).toEqual(
			expect.objectContaining({
				kind: 'plan_revision',
				taskIds: ['task_revision']
			})
		);
		expect(approvalResult.recommendation).toEqual(
			expect.objectContaining({
				kind: 'resolve_approval',
				taskIds: ['task_approval']
			})
		);
		expect(reviewResult.recommendation).toEqual(
			expect.objectContaining({
				kind: 'review_result',
				taskIds: ['task_review']
			})
		);
	});

	it('recommends one actionable task and independent parallel candidates', () => {
		const alpha = createTask({ id: 'task_alpha', title: 'Alpha' });
		const beta = createTask({ id: 'task_beta', title: 'Beta' });
		const gamma = createTask({
			id: 'task_gamma',
			title: 'Gamma',
			dependencyTaskIds: ['task_alpha']
		});
		const result = classify({ tasks: [gamma, beta, alpha] });

		expect(result.recommendation).toEqual(
			expect.objectContaining({
				kind: 'execute_task',
				taskIds: ['task_alpha'],
				parallelTaskIds: ['task_beta']
			})
		);
	});

	it('falls back to planning when no execution task is actionable', () => {
		const planning = createTask({
			id: 'task_planning',
			readinessLevel: 'R1_FRAMED',
			successCriteria: '',
			expectedOutcome: '',
			validationSteps: ''
		});
		const result = classify({ tasks: [planning] });

		expect(result.recommendation).toEqual(
			expect.objectContaining({
				kind: 'plan_task',
				taskIds: ['task_planning']
			})
		);
		expect(result.recommendation.suggestedTaskDraft).toEqual(
			expect.objectContaining({
				title: 'Plan: task_planning title',
				projectId: 'project_1',
				goalId: 'goal_1',
				autonomyLevel: 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE',
				readinessLevel: 'R2_SPECIFIED'
			})
		);
		expect(result.recommendation.suggestedTaskDraft?.nonGoals).toContain(
			'Do not implement the task while planning it.'
		);
	});
});
