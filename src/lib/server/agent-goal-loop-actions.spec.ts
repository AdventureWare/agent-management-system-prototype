import { describe, expect, it } from 'vitest';
import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { applyGoalLoopActionToData } from '$lib/server/agent-goal-loop-actions';
import type { ControlPlaneData, Goal, Project, Task } from '$lib/types/control-plane';

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
		name: overrides.name ?? 'Agent-facing AMS',
		area: overrides.area ?? 'product',
		status: overrides.status ?? 'running',
		summary: overrides.summary ?? 'Make AMS usable by agents.',
		successSignal: overrides.successSignal ?? 'Agents can continue from durable state.',
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
		title: overrides.title ?? 'Clarify vague work',
		summary: overrides.summary ?? 'Task summary.',
		successCriteria: overrides.successCriteria ?? '',
		readyCondition: overrides.readyCondition ?? '',
		expectedOutcome: overrides.expectedOutcome ?? '',
		scope: overrides.scope ?? '',
		nonGoals: overrides.nonGoals ?? '',
		validationSteps: overrides.validationSteps ?? '',
		rigorProfile: overrides.rigorProfile ?? null,
		readinessLevel: overrides.readinessLevel ?? 'R0_IDEA',
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
		createdAt: overrides.createdAt ?? '2026-07-06T12:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-07-06T12:00:00.000Z'
	};
}

function createControlPlane(tasks: Task[]): ControlPlaneData {
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
		reviews: [],
		planningSessions: [],
		approvals: [],
		decisions: []
	};
}

describe('applyGoalLoopActionToData', () => {
	it('materializes a current planning fallback draft into a durable draft task', () => {
		const sourceTask = createTask({
			id: 'task_needs_plan',
			title: 'Define the local retrieval slice'
		});
		const data = createControlPlane([sourceTask]);

		const result = applyGoalLoopActionToData(data, {
			command: 'materialize_suggested_task',
			goalId: 'goal_1'
		});

		expect(result.response).toEqual(
			expect.objectContaining({
				command: 'materialize_suggested_task',
				createdTask: true,
				wouldCreateTask: true,
				validationOnly: false,
				suggestedNextCommands: expect.arrayContaining([
					'goal-loop:get_task_loop_report',
					'goal-loop:get_next_recommended_action'
				])
			})
		);
		expect(result.response.task).toEqual(
			expect.objectContaining({
				title: 'Plan: Define the local retrieval slice',
				status: 'in_draft',
				projectId: 'project_1',
				goalId: 'goal_1',
				dependencyTaskIds: ['task_needs_plan']
			})
		);
		expect(result.data.tasks[0]?.id).toBe(result.response.task.id);
		expect(result.data.goals[0]?.taskIds).toContain(result.response.task.id);
	});

	it('previews materialization without mutating data', () => {
		const sourceTask = createTask({ id: 'task_needs_plan' });
		const data = createControlPlane([sourceTask]);

		const result = applyGoalLoopActionToData(data, {
			command: 'materialize_suggested_task',
			goalId: 'goal_1',
			validateOnly: true
		});

		expect(result.response.validationOnly).toBe(true);
		expect(result.response.createdTask).toBe(false);
		expect(result.response.wouldCreateTask).toBe(true);
		expect(result.data.tasks).toEqual(data.tasks);
	});

	it('dedupes against an open task with the same normalized title in the same goal', () => {
		const sourceTask = createTask({
			id: 'task_needs_plan',
			title: 'Define the local retrieval slice'
		});
		const existingDraft = createTask({
			id: 'task_existing',
			title: 'Plan:   Define the local retrieval slice',
			status: 'ready',
			readinessLevel: 'R2_SPECIFIED'
		});
		const data = createControlPlane([sourceTask, existingDraft]);

		const result = applyGoalLoopActionToData(data, {
			command: 'materialize_suggested_task',
			goalId: 'goal_1'
		});

		expect(result.response.task.id).toBe('task_existing');
		expect(result.response.createdTask).toBe(false);
		expect(result.response.dedupedExistingTask).toBe(true);
		expect(result.data.tasks).toHaveLength(2);
	});

	it('refuses to materialize when the current recommendation has no suggested draft', () => {
		const data = {
			...createControlPlane([
				createTask({
					id: 'task_done',
					title: 'Completed slice',
					status: 'done',
					closeoutState: 'accepted'
				})
			]),
			goals: [createGoal({ status: 'done', taskIds: ['task_done'] })]
		};

		expect(() =>
			applyGoalLoopActionToData(data, {
				command: 'materialize_suggested_task',
				goalId: 'goal_1'
			})
		).toThrow(AgentControlPlaneApiError);
	});
});
