import { describe, expect, it } from 'vitest';
import { applyManagedContinuationRunnerToData } from '$lib/server/managed-continuation-runner';
import type { Approval, ControlPlaneData, Goal, Project, Review, Task } from '$lib/types/control-plane';

const now = '2026-07-06T12:00:00.000Z';

function createProject(overrides: Partial<Project> = {}): Project {
	return {
		id: overrides.id ?? 'project_1',
		name: overrides.name ?? 'Agent Project',
		summary: overrides.summary ?? 'Project summary.',
		currentStateMemo: overrides.currentStateMemo ?? '',
		agentInstructionsPath: overrides.agentInstructionsPath ?? 'AGENTS.md',
		validationCommands: overrides.validationCommands ?? [],
		constraints: overrides.constraints ?? 'Use existing systems.',
		nonGoals: overrides.nonGoals ?? 'No duplicate systems.',
		projectRootFolder: overrides.projectRootFolder ?? '/tmp/project',
		defaultArtifactRoot: overrides.defaultArtifactRoot ?? '/tmp/project/artifacts',
		defaultRepoPath: overrides.defaultRepoPath ?? '',
		defaultRepoUrl: overrides.defaultRepoUrl ?? '',
		defaultBranch: overrides.defaultBranch ?? '',
		defaultRigorProfile: overrides.defaultRigorProfile ?? 'INTERNAL'
	};
}

function createGoal(overrides: Partial<Goal> = {}): Goal {
	return {
		id: overrides.id ?? 'goal_1',
		name: overrides.name ?? 'Autonomous loop',
		area: overrides.area ?? 'product',
		status: overrides.status ?? 'running',
		summary: overrides.summary ?? 'Keep goal-directed work moving.',
		successSignal: overrides.successSignal ?? 'AMS can continue from durable state.',
		artifactPath: overrides.artifactPath ?? '',
		parentGoalId: overrides.parentGoalId ?? null,
		projectIds: overrides.projectIds ?? ['project_1'],
		taskIds: overrides.taskIds ?? [],
		targetDate: overrides.targetDate ?? null,
		planningPriority: overrides.planningPriority ?? 5,
		confidence: overrides.confidence ?? 'medium'
	};
}

function createTask(overrides: Partial<Task> = {}): Task {
	return {
		id: overrides.id ?? 'task_1',
		title: overrides.title ?? 'Implement bounded proof',
		summary: overrides.summary ?? 'Implement the bounded proof.',
		successCriteria: overrides.successCriteria ?? 'Acceptance criteria are met.',
		readyCondition: overrides.readyCondition ?? 'Ready.',
		expectedOutcome: overrides.expectedOutcome ?? 'A reviewed result exists.',
		scope: overrides.scope ?? 'Bounded scope.',
		nonGoals: overrides.nonGoals ?? '',
		validationSteps: overrides.validationSteps ?? 'Run checks.',
		rigorProfile: overrides.rigorProfile ?? null,
		readinessLevel: overrides.readinessLevel ?? 'R3_EXECUTABLE',
		autonomyLevel: overrides.autonomyLevel ?? 'A2_AGENT_MAY_DRAFT_ARTIFACTS',
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
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now
	};
}

function createReview(overrides: Partial<Review> = {}): Review {
	return {
		id: overrides.id ?? 'review_1',
		taskId: overrides.taskId ?? 'task_1',
		runId: overrides.runId ?? null,
		status: overrides.status ?? 'open',
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
		resolvedAt: overrides.resolvedAt ?? null,
		requestedByExecutionSurfaceId: overrides.requestedByExecutionSurfaceId ?? null,
		reviewerExecutionSurfaceId: overrides.reviewerExecutionSurfaceId ?? null,
		summary: overrides.summary ?? 'Review the result.'
	};
}

function createApproval(overrides: Partial<Approval> = {}): Approval {
	return {
		id: overrides.id ?? 'approval_1',
		taskId: overrides.taskId ?? 'task_1',
		runId: overrides.runId ?? null,
		mode: overrides.mode ?? 'before_run',
		status: overrides.status ?? 'pending',
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
		resolvedAt: overrides.resolvedAt ?? null,
		requestedByExecutionSurfaceId: overrides.requestedByExecutionSurfaceId ?? null,
		approverExecutionSurfaceId: overrides.approverExecutionSurfaceId ?? null,
		summary: overrides.summary ?? 'Approve before running.'
	};
}

function createControlPlane(
	tasks: Task[],
	reviews: Review[] = [],
	approvals: Approval[] = []
): ControlPlaneData {
	return {
		providers: [],
		roles: [],
		projects: [createProject()],
		goals: [createGoal({ taskIds: tasks.map((task) => task.id) })],
		workflows: [],
		workflowSteps: [],
		taskTemplates: [],
		executionSurfaces: [],
		tasks,
		runs: [],
		reviews,
		planningSessions: [],
		approvals,
		decisions: []
	};
}

describe('applyManagedContinuationRunnerToData', () => {
	it('previews materializable fallback work without mutating data', () => {
		const data = createControlPlane([]);

		const result = applyManagedContinuationRunnerToData(data, {
			goalId: 'goal_1',
			mode: 'preview'
		});

		expect(result.data.tasks).toEqual(data.tasks);
		expect(result.response.materializationPreview).toEqual(
			expect.objectContaining({
				validationOnly: true,
				wouldCreateTask: true,
				createdTask: false
			})
		);
		expect(result.response.safety).toEqual(
			expect.objectContaining({
				taskStateChanged: false,
				autoLaunch: false,
				autoApprove: false
			})
		);
	});

	it('materializes at most one fallback task and reads it back', () => {
		const data = createControlPlane([]);

		const result = applyManagedContinuationRunnerToData(data, {
			goalId: 'goal_1',
			mode: 'materialize_one'
		});

		expect(result.data.tasks).toHaveLength(1);
		expect(result.response.materialization).toEqual(
			expect.objectContaining({
				createdTask: true,
				validationOnly: false
			})
		);
		expect(result.response.readbacks.taskLoopReport?.task.id).toBe(
			result.response.materialization?.resolved.taskId
		);
		expect(result.response.stop.mustStop).toBe(true);
		expect(result.response.safety.autoLaunch).toBe(false);
	});

	it('stops at review gates without mutation', () => {
		const task = createTask({
			id: 'task_review',
			title: 'Review me',
			status: 'review'
		});
		const data = createControlPlane([task], [createReview({ taskId: task.id })]);

		const result = applyManagedContinuationRunnerToData(data, {
			goalId: 'goal_1',
			mode: 'materialize_one'
		});

		expect(result.data.tasks).toEqual(data.tasks);
		expect(result.response.stop.reason).toBe('review_gate');
		expect(result.response.materialization).toBeNull();
		expect(result.response.safety.taskStateChanged).toBe(false);
	});

	it('stops at approval gates without mutation or auto-approval', () => {
		const task = createTask({
			id: 'task_approval',
			title: 'Approval-gated task',
			approvalMode: 'before_run'
		});
		const data = createControlPlane(
			[task],
			[],
			[createApproval({ taskId: task.id, summary: 'Approve before launch.' })]
		);

		const result = applyManagedContinuationRunnerToData(data, {
			goalId: 'goal_1',
			mode: 'materialize_one'
		});

		expect(result.data.tasks).toEqual(data.tasks);
		expect(result.response.stop.reason).toBe('approval_gate');
		expect(result.response.operatorPath).toMatchObject({
			kind: 'approval',
			surface: 'governance',
			taskId: task.id
		});
		expect(result.response.materialization).toBeNull();
		expect(result.response.safety).toEqual(
			expect.objectContaining({
				taskStateChanged: false,
				approvalStateChanged: false,
				autoLaunch: false,
				autoApprove: false
			})
		);
	});

	it('prepares a work packet for actionable tasks and stops before launch', () => {
		const task = createTask({ id: 'task_ready', title: 'Ready execution task' });
		const data = createControlPlane([task]);

		const result = applyManagedContinuationRunnerToData(data, {
			taskId: task.id,
			mode: 'read_only'
		});

		expect(result.response.stop.reason).toBe('actionable_task_ready');
		expect(result.response.actions).toEqual([
			'goal-loop:get_operator_console',
			'work-packet:get_agent_work_packet'
		]);
		expect(result.response.readbacks.workPacket).toEqual(
			expect.objectContaining({
				mode: 'executor',
				taskId: task.id
			})
		);
		expect(result.response.materialization).toBeNull();
		expect(result.response.safety.autoLaunch).toBe(false);
		expect(result.response.safety.autoApprove).toBe(false);
	});
});
