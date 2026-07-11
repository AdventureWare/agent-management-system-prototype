import { describe, expect, it } from 'vitest';
import { buildOperatorGoalLoopConsole } from './operator-goal-loop-console';
import type { Approval, ControlPlaneData, Goal, Project, Review, Run, Task } from '$lib/types/control-plane';

const now = '2026-07-06T12:00:00.000Z';

function createProject(overrides: Partial<Project> = {}): Project {
	return {
		id: overrides.id ?? 'project_1',
		name: overrides.name ?? 'Agent Management System',
		summary: overrides.summary ?? 'Owned-agent control loop.',
		projectRootFolder: overrides.projectRootFolder ?? '/tmp/ams',
		defaultArtifactRoot: overrides.defaultArtifactRoot ?? '/tmp/ams/agent_output',
		defaultRepoPath: overrides.defaultRepoPath ?? '',
		defaultRepoUrl: overrides.defaultRepoUrl ?? '',
		defaultBranch: overrides.defaultBranch ?? '',
		defaultRigorProfile: overrides.defaultRigorProfile ?? 'INTERNAL'
	};
}

function createGoal(overrides: Partial<Goal> = {}): Goal {
	return {
		id: overrides.id ?? 'goal_1',
		name: overrides.name ?? 'Autonomous Work Loop v0.5',
		area: overrides.area ?? 'product',
		status: overrides.status ?? 'running',
		summary: overrides.summary ?? 'Make the control loop coherent.',
		artifactPath: overrides.artifactPath ?? '',
		successSignal: overrides.successSignal ?? 'AMS can select and continue the next task.',
		projectIds: overrides.projectIds ?? ['project_1'],
		taskIds: overrides.taskIds ?? ['task_1'],
		planningPriority: overrides.planningPriority ?? 5
	};
}

function createTask(overrides: Partial<Task> = {}): Task {
	return {
		id: overrides.id ?? 'task_1',
		title: overrides.title ?? 'Implement operator read model',
		summary: overrides.summary ?? 'Create a shared operator control-loop projection.',
		successCriteria: overrides.successCriteria ?? 'Surfaces agree on the next path.',
		readyCondition: overrides.readyCondition ?? 'The task has a clear contract.',
		expectedOutcome: overrides.expectedOutcome ?? 'A read-only helper exists.',
		scope: overrides.scope ?? 'Read model only.',
		nonGoals: overrides.nonGoals ?? 'No scheduler or schema changes.',
		validationSteps: overrides.validationSteps ?? 'Run focused unit tests.',
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
		priority: overrides.priority ?? 'high',
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

function createRun(overrides: Partial<Run> = {}): Run {
	return {
		id: overrides.id ?? 'run_1',
		taskId: overrides.taskId ?? 'task_1',
		executionSurfaceId: overrides.executionSurfaceId ?? null,
		providerId: overrides.providerId ?? null,
		status: overrides.status ?? 'completed',
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
		startedAt: overrides.startedAt ?? now,
		endedAt: overrides.endedAt ?? now,
		threadId: overrides.threadId ?? null,
		agentThreadId: overrides.agentThreadId ?? null,
		promptDigest: overrides.promptDigest ?? 'digest',
		contextSummary: overrides.contextSummary ?? '',
		artifactPaths: overrides.artifactPaths ?? [],
		summary: overrides.summary ?? 'Run complete.',
		actionsTaken: overrides.actionsTaken ?? 'Implemented.',
		validationSummary: overrides.validationSummary ?? 'Tests passed.',
		resultSummary: overrides.resultSummary ?? 'Ready for review.',
		blockersFound: overrides.blockersFound ?? [],
		followUpTaskIds: overrides.followUpTaskIds ?? [],
		lastHeartbeatAt: overrides.lastHeartbeatAt ?? null,
		errorSummary: overrides.errorSummary ?? ''
	};
}

function createReview(overrides: Partial<Review> = {}): Review {
	return {
		id: overrides.id ?? 'review_1',
		taskId: overrides.taskId ?? 'task_1',
		runId: overrides.runId ?? 'run_1',
		status: overrides.status ?? 'open',
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
		resolvedAt: overrides.resolvedAt ?? null,
		requestedByExecutionSurfaceId: overrides.requestedByExecutionSurfaceId ?? null,
		reviewerExecutionSurfaceId: overrides.reviewerExecutionSurfaceId ?? null,
		summary: overrides.summary ?? 'Review run evidence.'
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

function createControlPlane(input: {
	tasks?: Task[];
	runs?: Run[];
	reviews?: Review[];
	approvals?: Approval[];
	goal?: Partial<Goal>;
} = {}): ControlPlaneData {
	const tasks = input.tasks ?? [createTask()];

	return {
		providers: [],
		roles: [],
		projects: [createProject()],
		goals: [createGoal({ taskIds: tasks.map((task) => task.id), ...input.goal })],
		workflows: [],
		workflowSteps: [],
		taskTemplates: [],
		executionSurfaces: [],
		tasks,
		runs: input.runs ?? [],
		reviews: input.reviews ?? [],
		approvals: input.approvals ?? [],
		planningSessions: [],
		decisions: []
	};
}

describe('buildOperatorGoalLoopConsole', () => {
	it('routes actionable work to task detail execution', () => {
		const console = buildOperatorGoalLoopConsole(createControlPlane(), { goalId: 'goal_1' });

		expect(console.path).toMatchObject({
			kind: 'execute',
			surface: 'task_detail',
			href: '/app/tasks/task_1',
			taskId: 'task_1'
		});
		expect(console.selectedTaskReport?.nextAction.action).toBe('execute_task');
	});

	it('resolves task-only input to the selected task project and goal', () => {
		const task = createTask({
			id: 'task_2',
			projectId: 'project_2',
			goalId: 'goal_2',
			title: 'Plan goal continuation'
		});
		const data = createControlPlane({
			tasks: [task],
			goal: { id: 'goal_2', projectIds: ['project_2'], taskIds: ['task_2'] }
		});
		data.projects = [
			createProject({ id: 'project_1', name: 'Default project' }),
			createProject({ id: 'project_2', name: 'Selected task project' })
		];
		data.goals = [
			createGoal({ id: 'goal_1', projectIds: ['project_1'], taskIds: [] }),
			createGoal({ id: 'goal_2', projectIds: ['project_2'], taskIds: ['task_2'] })
		];

		const console = buildOperatorGoalLoopConsole(data, { taskId: 'task_2' });

		expect(console.project?.id).toBe('project_2');
		expect(console.goal?.id).toBe('goal_2');
		expect(console.selectedTask?.id).toBe('task_2');
		expect(console.recommendation.taskIds).toEqual(['task_2']);
		expect(console.path).toMatchObject({
			kind: 'execute',
			href: '/app/tasks/task_2',
			taskId: 'task_2'
		});
	});

	it('routes review work to governance using the selected task report', () => {
		const task = createTask({
			status: 'review',
			latestRunId: 'run_1',
			runCount: 1
		});
		const console = buildOperatorGoalLoopConsole(
			createControlPlane({
				tasks: [task],
				runs: [createRun()],
				reviews: [createReview()]
			}),
			{ goalId: 'goal_1' }
		);

		expect(console.recommendation.kind).toBe('review_result');
		expect(console.path).toMatchObject({
			kind: 'review',
			surface: 'governance',
			href: '/app/governance',
			taskId: 'task_1'
		});
		expect(console.selectedTaskReport?.openReview?.id).toBe('review_1');
	});

	it('routes approval gates to governance', () => {
		const task = createTask({ approvalMode: 'before_run' });
		const console = buildOperatorGoalLoopConsole(
			createControlPlane({
				tasks: [task],
				approvals: [createApproval()]
			}),
			{ goalId: 'goal_1' }
		);

		expect(console.recommendation.kind).toBe('resolve_approval');
		expect(console.path).toMatchObject({
			kind: 'approval',
			surface: 'governance',
			href: '/app/governance',
			taskId: 'task_1'
		});
	});

	it('routes blockers to task detail', () => {
		const task = createTask({
			status: 'blocked',
			blockedReason: 'Waiting on reviewer availability.'
		});
		const console = buildOperatorGoalLoopConsole(createControlPlane({ tasks: [task] }), {
			goalId: 'goal_1'
		});

		expect(console.path).toMatchObject({
			kind: 'blocker',
			surface: 'task_detail',
			href: '/app/tasks/task_1',
			taskId: 'task_1'
		});
		expect(console.selectedTaskReport?.nextAction.action).toBe('resolve_blocker');
	});

	it('routes planning fallback to planning when no task is selected', () => {
		const console = buildOperatorGoalLoopConsole(createControlPlane({ tasks: [] }), {
			goalId: 'goal_1'
		});

		expect(console.recommendation.kind).toBe('create_planning_task');
		expect(console.selectedTask).toBeNull();
		expect(console.path).toMatchObject({
			kind: 'planning',
			surface: 'planning',
			href: '/app/planning?goalId=goal_1',
			taskId: null,
			continuationPolicy: {
				mode: 'explicit_validate_first',
				validateOnlyFirst: true,
				autoMaterialize: false
			}
		});
	});

	it('uses read-only continuation policy when an existing task needs planning', () => {
		const task = createTask({
			status: 'in_draft',
			readinessLevel: 'R2_SPECIFIED'
		});
		const console = buildOperatorGoalLoopConsole(createControlPlane({ tasks: [task] }), {
			goalId: 'goal_1',
			taskId: task.id
		});

		expect(console.selectedTaskReport?.nextAction.action).toBe('plan_task');
		expect(console.path).toMatchObject({
			kind: 'planning',
			taskId: task.id,
			suggestedCommands: expect.arrayContaining([
				'work-packet:get_agent_work_packet',
				'goal-loop:explain_task_eligibility'
			]),
			continuationPolicy: {
				mode: 'read_only',
				validateOnlyFirst: false,
				autoMaterialize: false
			}
		});
	});

	it('routes explicitly completed goals back to goal detail', () => {
		const task = createTask({ status: 'done', closeoutState: 'accepted' });
		const console = buildOperatorGoalLoopConsole(
			createControlPlane({ goal: { status: 'done' }, tasks: [task] }),
			{
				goalId: 'goal_1'
			}
		);

		expect(console.recommendation.kind).toBe('goal_complete');
		expect(console.path).toMatchObject({
			kind: 'goal_complete',
			surface: 'goal_detail',
			href: '/app/goals/goal_1',
			taskId: null
		});
	});

	it('routes running goals with only completed work to continuation planning', () => {
		const task = createTask({ status: 'done', closeoutState: 'accepted' });
		const console = buildOperatorGoalLoopConsole(createControlPlane({ tasks: [task] }), {
			goalId: 'goal_1'
		});

		expect(console.recommendation.kind).toBe('create_planning_task');
		expect(console.path).toMatchObject({
			kind: 'planning',
			surface: 'planning',
			href: '/app/planning?goalId=goal_1',
			taskId: null
		});
	});

	it('routes terminal selected tasks to goal continuation planning instead of no action', () => {
		const task = createTask({ status: 'done', closeoutState: 'accepted' });
		const console = buildOperatorGoalLoopConsole(createControlPlane({ tasks: [task] }), {
			goalId: 'goal_1',
			taskId: task.id
		});

		expect(console.selectedTask?.id).toBe(task.id);
		expect(console.selectedTaskReport?.nextAction.action).toBe('no_action');
		expect(console.recommendation.kind).toBe('create_planning_task');
		expect(console.path).toMatchObject({
			kind: 'planning',
			surface: 'planning',
			href: '/app/planning?goalId=goal_1',
			taskId: null,
			suggestedCommands: expect.arrayContaining([
				'goal-loop:materialize_suggested_task',
				'goal-loop:get_next_recommended_action'
			]),
			continuationPolicy: {
				mode: 'explicit_validate_first',
				validateOnlyFirst: true,
				autoMaterialize: false
			}
		});
	});

	it('routes terminal selected tasks to the next goal-recommended task when one exists', () => {
		const doneTask = createTask({ id: 'task_done', status: 'done', closeoutState: 'accepted' });
		const nextTask = createTask({ id: 'task_next', title: 'Continue goal loop' });
		const console = buildOperatorGoalLoopConsole(
			createControlPlane({ tasks: [doneTask, nextTask] }),
			{
				goalId: 'goal_1',
				taskId: doneTask.id
			}
		);

		expect(console.selectedTask?.id).toBe(doneTask.id);
		expect(console.selectedTaskReport?.nextAction.action).toBe('no_action');
		expect(console.recommendation.kind).toBe('execute_task');
		expect(console.path).toMatchObject({
			kind: 'execute',
			surface: 'task_detail',
			href: '/app/tasks/task_next',
			taskId: 'task_next'
		});
	});
});
