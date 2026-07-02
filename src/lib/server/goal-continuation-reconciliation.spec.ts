import { describe, expect, it } from 'vitest';
import { createTask } from '$lib/server/control-plane';
import type { ControlPlaneData, Goal, Project, Task } from '$lib/types/control-plane';
import {
	CONTINUATION_PLANNING_TASK_TITLE,
	reconcileGoalContinuationInData
} from './goal-continuation-reconciliation';

function createProject(overrides: Partial<Project> = {}): Project {
	return {
		id: overrides.id ?? 'project_1',
		name: overrides.name ?? 'AMS',
		summary: overrides.summary ?? 'Agent management system.',
		projectRootFolder: overrides.projectRootFolder ?? '/tmp/ams',
		defaultArtifactRoot: overrides.defaultArtifactRoot ?? '/tmp/ams/agent_output',
		defaultRepoPath: overrides.defaultRepoPath ?? '',
		defaultRepoUrl: overrides.defaultRepoUrl ?? '',
		defaultBranch: overrides.defaultBranch ?? ''
	};
}

function createGoal(overrides: Partial<Goal> = {}): Goal {
	return {
		id: overrides.id ?? 'goal_1',
		name: overrides.name ?? 'Autonomous loop',
		area: overrides.area ?? 'product',
		status: overrides.status ?? 'running',
		summary: overrides.summary ?? 'Keep the goal moving.',
		artifactPath: overrides.artifactPath ?? '/tmp/ams/agent_output',
		successSignal: overrides.successSignal ?? 'The goal has an explicit next action.',
		parentGoalId: overrides.parentGoalId ?? null,
		projectIds: overrides.projectIds ?? ['project_1'],
		taskIds: overrides.taskIds ?? [],
		targetDate: overrides.targetDate ?? null,
		planningPriority: overrides.planningPriority ?? 0,
		confidence: overrides.confidence ?? 'medium'
	};
}

function createLinkedTask(overrides: Partial<Task> = {}): Task {
	return createTask({
		id: overrides.id ?? 'task_1',
		title: overrides.title ?? 'Existing work',
		summary: overrides.summary ?? 'Do existing work.',
		projectId: overrides.projectId ?? 'project_1',
		goalId: overrides.goalId ?? 'goal_1',
		priority: overrides.priority ?? 'medium',
		status: overrides.status ?? 'ready',
		riskLevel: overrides.riskLevel ?? 'low',
		approvalMode: overrides.approvalMode ?? 'none',
		requiresReview: overrides.requiresReview ?? true,
		desiredRoleId: overrides.desiredRoleId ?? '',
		artifactPath: overrides.artifactPath ?? '/tmp/ams/agent_output',
		blockedReason: overrides.blockedReason ?? '',
		createdAt: overrides.createdAt ?? '2026-06-01T12:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-01T12:00:00.000Z'
	});
}

function createData(input: {
	goal?: Goal;
	tasks?: Task[];
	projects?: Project[];
	goals?: Goal[];
}): ControlPlaneData {
	const goal = input.goal ?? createGoal({ taskIds: input.tasks?.map((task) => task.id) ?? [] });

	return {
		providers: [],
		roles: [],
		projects: input.projects ?? [createProject()],
		goals: input.goals ?? [goal],
		workflows: [],
		workflowSteps: [],
		taskTemplates: [],
		executionSurfaces: [],
		tasks: input.tasks ?? [],
		runs: [],
		reviews: [],
		approvals: [],
		planningSessions: [],
		decisions: []
	};
}

function continuationTasks(data: ControlPlaneData) {
	return data.tasks.filter((task) => task.title === CONTINUATION_PLANNING_TASK_TITLE);
}

describe('goal continuation reconciliation', () => {
	it('creates one continuation-planning task when the last open goal task is completed', () => {
		const completedTask = createLinkedTask({ id: 'task_done', status: 'done' });
		const data = createData({
			goal: createGoal({ taskIds: [completedTask.id] }),
			tasks: [completedTask]
		});

		const result = reconcileGoalContinuationInData(data, 'goal_1');

		expect(result.createdTaskIds).toHaveLength(1);
		expect(continuationTasks(result.data)).toHaveLength(1);
		expect(continuationTasks(result.data)[0]).toEqual(
			expect.objectContaining({
				goalId: 'goal_1',
				projectId: 'project_1',
				status: 'ready',
				readinessLevel: 'R3_EXECUTABLE',
				autonomyLevel: 'A2_AGENT_MAY_DRAFT_ARTIFACTS'
			})
		);
		expect(result.data.decisions?.[0]).toEqual(
			expect.objectContaining({
				goalId: 'goal_1',
				taskId: result.createdTaskIds[0],
				decisionType: 'goal_plan_updated'
			})
		);
	});

	it('is idempotent when reconciliation runs repeatedly', () => {
		const completedTask = createLinkedTask({ id: 'task_done', status: 'done' });
		const data = createData({
			goal: createGoal({ taskIds: [completedTask.id] }),
			tasks: [completedTask]
		});

		const first = reconcileGoalContinuationInData(data, 'goal_1');
		const second = reconcileGoalContinuationInData(first.data, 'goal_1');

		expect(first.createdTaskIds).toHaveLength(1);
		expect(second.createdTaskIds).toHaveLength(0);
		expect(continuationTasks(second.data)).toHaveLength(1);
		expect(second.results[0]).toEqual(
			expect.objectContaining({
				existingTaskId: first.createdTaskIds[0]
			})
		);
	});

	it('does not create continuation work while other open goal work exists', () => {
		const completedTask = createLinkedTask({ id: 'task_done', status: 'done' });
		const openTask = createLinkedTask({ id: 'task_ready', status: 'ready' });
		const data = createData({
			goal: createGoal({ taskIds: [completedTask.id, openTask.id] }),
			tasks: [completedTask, openTask]
		});

		const result = reconcileGoalContinuationInData(data, 'goal_1');

		expect(result.createdTaskIds).toEqual([]);
		expect(continuationTasks(result.data)).toHaveLength(0);
	});

	it('ignores ineligible goal statuses', () => {
		for (const status of ['review', 'blocked', 'done'] as const) {
			const completedTask = createLinkedTask({ id: `task_${status}`, status: 'done' });
			const data = createData({
				goal: createGoal({ status, taskIds: [completedTask.id] }),
				tasks: [completedTask]
			});

			const result = reconcileGoalContinuationInData(data, 'goal_1');

			expect(result.createdTaskIds).toEqual([]);
			expect(continuationTasks(result.data)).toHaveLength(0);
		}
	});

	it('does not duplicate an existing open continuation-planning task', () => {
		const completedTask = createLinkedTask({ id: 'task_done', status: 'done' });
		const continuation = createLinkedTask({
			id: 'task_continue',
			title: CONTINUATION_PLANNING_TASK_TITLE,
			status: 'ready'
		});
		const data = createData({
			goal: createGoal({ taskIds: [completedTask.id, continuation.id] }),
			tasks: [completedTask, continuation]
		});

		const result = reconcileGoalContinuationInData(data, 'goal_1');

		expect(result.createdTaskIds).toEqual([]);
		expect(continuationTasks(result.data)).toHaveLength(1);
		expect(result.results[0]?.existingTaskId).toBe('task_continue');
	});

	it('does not recreate a completed continuation-planning task when no newer goal work exists', () => {
		const completedTask = createLinkedTask({
			id: 'task_done',
			status: 'done',
			updatedAt: '2026-06-01T12:00:00.000Z'
		});
		const completedContinuation = createLinkedTask({
			id: 'task_continue_done',
			title: CONTINUATION_PLANNING_TASK_TITLE,
			status: 'done',
			createdAt: '2026-06-02T12:00:00.000Z',
			updatedAt: '2026-06-02T12:30:00.000Z'
		});
		const data = createData({
			goal: createGoal({ taskIds: [completedTask.id, completedContinuation.id] }),
			tasks: [completedTask, completedContinuation]
		});

		const result = reconcileGoalContinuationInData(data, 'goal_1');

		expect(result.createdTaskIds).toEqual([]);
		expect(continuationTasks(result.data)).toHaveLength(1);
		expect(result.results[0]).toEqual(
			expect.objectContaining({
				existingTaskId: 'task_continue_done',
				reason:
					'Continuation-planning task already reached a terminal state and no newer scoped work changed the goal.'
			})
		);
	});

	it('does not recreate a canceled continuation-planning task', () => {
		const canceledContinuation = createLinkedTask({
			id: 'task_continue_canceled',
			title: CONTINUATION_PLANNING_TASK_TITLE,
			status: 'canceled'
		});
		const data = createData({
			goal: createGoal({ taskIds: [canceledContinuation.id] }),
			tasks: [canceledContinuation]
		});

		const result = reconcileGoalContinuationInData(data, 'goal_1');

		expect(result.createdTaskIds).toEqual([]);
		expect(continuationTasks(result.data)).toHaveLength(1);
		expect(result.results[0]?.existingTaskId).toBe('task_continue_canceled');
	});

	it('allows a new continuation-planning task after newer real goal work completes', () => {
		const completedContinuation = createLinkedTask({
			id: 'task_continue_done',
			title: CONTINUATION_PLANNING_TASK_TITLE,
			status: 'done',
			createdAt: '2026-06-01T12:00:00.000Z',
			updatedAt: '2026-06-01T12:30:00.000Z'
		});
		const newerCompletedTask = createLinkedTask({
			id: 'task_new_done',
			status: 'done',
			createdAt: '2026-06-02T12:00:00.000Z',
			updatedAt: '2026-06-02T12:30:00.000Z'
		});
		const data = createData({
			goal: createGoal({ taskIds: [completedContinuation.id, newerCompletedTask.id] }),
			tasks: [completedContinuation, newerCompletedTask]
		});

		const result = reconcileGoalContinuationInData(data, 'goal_1');

		expect(result.createdTaskIds).toHaveLength(1);
		expect(continuationTasks(result.data)).toHaveLength(2);
	});

	it('respects blocked work as open work instead of creating duplicate planning', () => {
		const blockedTask = createLinkedTask({
			id: 'task_blocked',
			status: 'blocked',
			blockedReason: 'Waiting for operator decision.'
		});
		const data = createData({
			goal: createGoal({ taskIds: [blockedTask.id] }),
			tasks: [blockedTask]
		});

		const result = reconcileGoalContinuationInData(data, 'goal_1');

		expect(result.createdTaskIds).toEqual([]);
		expect(continuationTasks(result.data)).toHaveLength(0);
	});
});
