import { describe, expect, it } from 'vitest';
import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { buildAgentGoalLoopResponse } from '$lib/server/agent-goal-loop';
import type { ControlPlaneData, Goal, Project, Review, Task } from '$lib/types/control-plane';

function createProject(overrides: Partial<Project> = {}): Project {
	return {
		id: overrides.id ?? 'project_1',
		name: overrides.name ?? 'Agent Project',
		summary: overrides.summary ?? 'Project summary.',
		currentStateMemo: overrides.currentStateMemo ?? 'Current state.',
		agentInstructionsPath: overrides.agentInstructionsPath ?? 'AGENTS.md',
		validationCommands: overrides.validationCommands ?? ['npm test'],
		constraints: overrides.constraints ?? 'Use existing systems.',
		nonGoals: overrides.nonGoals ?? 'No duplicate systems.',
		projectRootFolder: overrides.projectRootFolder ?? '/tmp/project',
		defaultArtifactRoot: overrides.defaultArtifactRoot ?? '/tmp/project/agent_output',
		defaultRepoPath: overrides.defaultRepoPath ?? '',
		defaultRepoUrl: overrides.defaultRepoUrl ?? '',
		defaultBranch: overrides.defaultBranch ?? '',
		defaultRigorProfile: overrides.defaultRigorProfile ?? 'INTERNAL'
	};
}

function createGoal(overrides: Partial<Goal> = {}): Goal {
	return {
		id: overrides.id ?? 'goal_1',
		name: overrides.name ?? 'Agent-facing AMS',
		area: overrides.area ?? 'product',
		status: overrides.status ?? 'running',
		summary: overrides.summary ?? 'Make AMS usable by agents.',
		successSignal: overrides.successSignal ?? 'Agents can find and update work through tools.',
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
		title: overrides.title ?? 'Implement task',
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

function createReview(overrides: Partial<Review> = {}): Review {
	return {
		id: overrides.id ?? 'review_1',
		taskId: overrides.taskId ?? 'task_review',
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

function createControlPlane(tasks: Task[], reviews: Review[] = []): ControlPlaneData {
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
		approvals: [],
		decisions: []
	};
}

describe('buildAgentGoalLoopResponse', () => {
	it('lists active goals with linked work counts', () => {
		const data = createControlPlane([createTask({ id: 'task_ready' })]);
		const result = buildAgentGoalLoopResponse(data, {
			command: 'list_active_goals',
			projectId: 'project_1'
		});

		expect(result).toEqual(
			expect.objectContaining({
				command: 'list_active_goals',
				goals: [
					expect.objectContaining({
						id: 'goal_1',
						taskCount: 1,
						openTaskCount: 1
					})
				]
			})
		);
	});

	it('returns actionable work and next recommended action from goal-loop classification', () => {
		const data = createControlPlane([
			createTask({ id: 'task_ready', title: 'Ready task' }),
			createTask({
				id: 'task_blocked',
				title: 'Blocked task',
				status: 'blocked',
				blockedReason: 'Waiting for access'
			})
		]);
		const actionable = buildAgentGoalLoopResponse(data, {
			command: 'get_actionable_work',
			goalId: 'goal_1'
		});
		const next = buildAgentGoalLoopResponse(data, {
			command: 'get_next_recommended_action',
			goalId: 'goal_1'
		});

		expect(actionable).toEqual(
			expect.objectContaining({
				command: 'get_actionable_work',
				actionable: [expect.objectContaining({ id: 'task_ready', actionable: true })]
			})
		);
		expect(next).toEqual(
			expect.objectContaining({
				recommendation: expect.objectContaining({
					kind: 'execute_task',
					taskIds: ['task_ready']
				})
			})
		);
	});

	it('explains blocked task eligibility', () => {
		const data = createControlPlane([
			createTask({
				id: 'task_blocked',
				status: 'blocked',
				blockedReason: 'Waiting for access'
			})
		]);
		const result = buildAgentGoalLoopResponse(data, {
			command: 'explain_task_eligibility',
			goalId: 'goal_1',
			taskId: 'task_blocked'
		});

		expect(result).toEqual(
			expect.objectContaining({
				eligibility: expect.objectContaining({
					id: 'task_blocked',
					classification: 'needs_clarification',
					reasons: expect.arrayContaining([
						expect.objectContaining({
							code: 'blocked',
							message: 'Waiting for access'
						})
					])
				})
			})
		);
	});

	it('returns awaiting review work with review records', () => {
		const data = createControlPlane(
			[createTask({ id: 'task_review', status: 'review' })],
			[createReview({ taskId: 'task_review' })]
		);
		const result = buildAgentGoalLoopResponse(data, {
			command: 'get_awaiting_review',
			goalId: 'goal_1'
		});

		expect(result).toEqual(
			expect.objectContaining({
				awaiting: [
					expect.objectContaining({ id: 'task_review', classification: 'awaiting_review' })
				],
				openReviews: [expect.objectContaining({ id: 'review_1', taskId: 'task_review' })]
			})
		);
	});

	it('throws structured guidance for unknown commands and missing task ids', () => {
		const data = createControlPlane([createTask()]);

		expect(() =>
			buildAgentGoalLoopResponse(data, {
				command: 'missing_command'
			})
		).toThrow(AgentControlPlaneApiError);
		expect(() =>
			buildAgentGoalLoopResponse(data, {
				command: 'explain_task_eligibility',
				goalId: 'goal_1'
			})
		).toThrow(AgentControlPlaneApiError);
	});
});
