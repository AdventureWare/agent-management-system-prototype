import { describe, expect, it } from 'vitest';
import type {
	ControlPlaneData,
	Goal,
	Project,
	Task,
	ExecutionSurface
} from '$lib/types/control-plane';
import type { TaskDetailFormInput } from './task-form';
import { resolveTaskPlanUpdate } from './task-plan-updates';

const project: Project = {
	id: 'project_1',
	name: 'Agent Management System Prototype',
	summary: 'project',
	projectRootFolder: '/tmp/project',
	defaultArtifactRoot: '/tmp/project/agent_output',
	defaultRepoPath: '',
	defaultRepoUrl: '',
	defaultBranch: ''
};

const goal: Goal = {
	id: 'goal_cleanup',
	name: 'Cleanup iteration',
	area: 'product',
	status: 'running',
	summary: 'Reduce complexity in task flows.',
	artifactPath: '/tmp/project/agent_output/goals',
	parentGoalId: null,
	projectIds: ['project_1'],
	taskIds: []
};

const worker: ExecutionSurface = {
	id: 'worker_1',
	name: 'Planner',
	providerId: 'provider_local',
	supportedRoleIds: [],
	location: 'local',
	status: 'idle',
	capacity: 1,
	registeredAt: '2026-04-01T08:00:00.000Z',
	lastSeenAt: '2026-04-01T08:00:00.000Z',
	note: '',
	tags: [],
	threadSandboxOverride: null,
	authTokenHash: ''
};

const task: Task = {
	id: 'task_1',
	title: 'Current task',
	summary: 'Current summary',
	projectId: 'project_1',
	area: 'product',
	goalId: '',
	parentTaskId: null,
	delegationPacket: null,
	priority: 'medium',
	status: 'ready',
	riskLevel: 'medium',
	approvalMode: 'none',
	requiredThreadSandbox: null,
	requiresReview: true,
	desiredRoleId: '',
	assigneeExecutionSurfaceId: null,
	agentThreadId: null,
	requiredPromptSkillNames: [],
	blockedReason: '',
	dependencyTaskIds: ['task_dep'],
	targetDate: null,
	requiredCapabilityNames: ['planning'],
	requiredToolNames: [],
	runCount: 0,
	latestRunId: null,
	artifactPath: '/tmp/project/agent_output',
	attachments: [],
	createdAt: '2026-04-01T10:00:00.000Z',
	updatedAt: '2026-04-01T10:00:00.000Z'
};

function createCurrentState(): ControlPlaneData {
	return {
		providers: [],
		roles: [
			{
				id: 'role_reviewer',
				name: 'Reviewer',
				area: 'product',
				description: 'Reviews higher-risk work'
			}
		],
		projects: [project],
		goals: [goal],
		executionSurfaces: [worker],
		tasks: [
			task,
			{
				...task,
				id: 'task_dep',
				title: 'Dependency task',
				dependencyTaskIds: [],
				requiredCapabilityNames: [],
				createdAt: '2026-04-01T09:00:00.000Z',
				updatedAt: '2026-04-01T09:00:00.000Z'
			}
		],
		runs: [],
		decisions: [],
		reviews: [],
		approvals: []
	};
}

function createFormInput(overrides: Partial<TaskDetailFormInput> = {}): TaskDetailFormInput {
	return {
		name: task.title,
		instructions: task.summary,
		successCriteria: '',
		readyCondition: '',
		expectedOutcome: '',
		projectId: task.projectId,
		taskTemplateId: '',
		workflowId: '',
		parentTaskId: '',
		delegationObjective: '',
		delegationInputContext: '',
		delegationExpectedDeliverable: '',
		delegationDoneCondition: '',
		delegationIntegrationNotes: '',
		assigneeExecutionSurfaceId: '',
		targetDate: '',
		goalId: '',
		area: 'product',
		priority: 'medium',
		riskLevel: 'medium',
		approvalMode: 'none',
		requiredThreadSandbox: null,
		requiresReview: true,
		desiredRoleId: '',
		blockedReason: '',
		dependencyTaskIds: ['task_dep'],
		requiredPromptSkillNames: [],
		requiredCapabilityNames: ['planning'],
		requiredToolNames: [],
		hasSuccessCriteria: false,
		hasReadyCondition: false,
		hasExpectedOutcome: false,
		hasDelegationPacketFields: false,
		hasGoalId: false,
		hasWorkflowId: false,
		hasAssigneeExecutionSurfaceId: false,
		hasPriority: false,
		hasRiskLevel: false,
		hasApprovalMode: false,
		hasRequiredThreadSandbox: false,
		hasRequiresReview: false,
		hasDesiredRoleId: false,
		hasRequiredPromptSkillNames: false,
		hasRequiredCapabilityNames: false,
		hasRequiredToolNames: false,
		hasBlockedReason: false,
		hasDependencyTaskSelection: false,
		hasTargetDate: false,
		...overrides
	};
}

describe('task-plan-updates', () => {
	it('keeps current task values when optional fields are not present', () => {
		const result = resolveTaskPlanUpdate({
			current: createCurrentState(),
			task,
			status: 'ready',
			form: createFormInput(),
			project,
			goal: null,
			assignedExecutionSurface: null
		});

		expect(result.nextPriority).toBe('medium');
		expect(result.nextDependencyTaskIds).toEqual(['task_dep']);
		expect(result.decisionSummary).toBeNull();
	});

	it('builds a decision summary for updated task plan fields', () => {
		const result = resolveTaskPlanUpdate({
			current: createCurrentState(),
			task,
			status: 'blocked',
			form: createFormInput({
				name: 'Refined task',
				instructions: 'Rewrite the task surface',
				goalId: 'goal_cleanup',
				hasGoalId: true,
				assigneeExecutionSurfaceId: 'worker_1',
				hasAssigneeExecutionSurfaceId: true,
				priority: 'high',
				hasPriority: true,
				blockedReason: 'Waiting on review',
				hasBlockedReason: true,
				dependencyTaskIds: [],
				hasDependencyTaskSelection: true,
				targetDate: '2026-04-12',
				hasTargetDate: true
			}),
			project,
			goal,
			assignedExecutionSurface: worker
		});

		expect(result.nextTitle).toBe('Refined task');
		expect(result.nextAssignedExecutionSurface?.id).toBe('worker_1');
		expect(result.nextPriority).toBe('high');
		expect(result.nextDependencyTaskIds).toEqual([]);
		expect(result.nextTargetDate).toBe('2026-04-12');
		expect(result.decisionSummary).toContain('renamed the task to "Refined task"');
		expect(result.decisionSummary).toContain('linked the task to goal "Cleanup iteration"');
		expect(result.decisionSummary).toContain('assigned the task to Planner');
		expect(result.decisionSummary).toContain('set priority to High');
		expect(result.decisionSummary).toContain('cleared dependencies');
	});
});
