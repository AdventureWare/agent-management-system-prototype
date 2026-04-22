import { mkdirSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { buildTaskLaunchPlan, TaskLaunchPlanError } from './task-launch-planning';
import type { ControlPlaneData, Task } from '$lib/types/control-plane';
import type { TaskDetailFormInput } from '$lib/server/task-form';

vi.mock('$lib/server/self-improvement-knowledge', () => ({
	loadRelevantSelfImprovementKnowledgeItems: vi.fn(async () => [])
}));

function buildTaskDetailInput(overrides: Partial<TaskDetailFormInput> = {}): TaskDetailFormInput {
	return {
		name: '',
		instructions: '',
		successCriteria: '',
		readyCondition: '',
		expectedOutcome: '',
		projectId: '',
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
		dependencyTaskIds: [],
		requiredPromptSkillNames: [],
		requiredCapabilityNames: [],
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

function buildFixture(taskOverrides: Partial<Task> = {}): {
	current: ControlPlaneData;
	task: Task;
} {
	mkdirSync('/tmp/project/agent_output', { recursive: true });

	const task: Task = {
		id: 'task_one',
		title: 'Launch task',
		summary: 'Test launch plan.',
		successCriteria: 'A reviewer can confirm the task is complete.',
		readyCondition: 'The task is ready to run and its inputs are available.',
		expectedOutcome: 'A completed launch attempt with a queued worker thread.',
		projectId: 'project_app',
		area: 'product',
		goalId: '',
		priority: 'medium',
		status: 'ready',
		riskLevel: 'medium',
		approvalMode: 'none',
		requiresReview: true,
		desiredRoleId: 'role_builder',
		assigneeExecutionSurfaceId: null,
		agentThreadId: null,
		requiredCapabilityNames: ['planning'],
		requiredToolNames: [],
		blockedReason: '',
		dependencyTaskIds: [],
		runCount: 0,
		latestRunId: null,
		artifactPath: '/tmp/project/agent_output',
		attachments: [],
		createdAt: '2026-04-08T00:00:00.000Z',
		updatedAt: '2026-04-08T00:00:00.000Z',
		...taskOverrides
	};

	return {
		task,
		current: {
			providers: [
				{
					id: 'provider_local',
					name: 'Local Codex',
					service: 'OpenAI',
					kind: 'local',
					description: '',
					enabled: true,
					setupStatus: 'connected',
					authMode: 'local_cli',
					defaultModel: '',
					baseUrl: '',
					launcher: 'codex',
					envVars: [],
					capabilities: ['planning'],
					defaultThreadSandbox: 'workspace-write',
					notes: ''
				}
			],
			roles: [
				{
					id: 'role_builder',
					name: 'Builder',
					area: 'product',
					description: ''
				}
			],
			projects: [
				{
					id: 'project_app',
					name: 'App',
					summary: '',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: 'main',
					additionalWritableRoots: [],
					defaultThreadSandbox: 'workspace-write'
				}
			],
			goals: [],
			executionSurfaces: [
				{
					id: 'worker_builder',
					name: 'Builder execution surface',
					providerId: 'provider_local',
					supportedRoleIds: ['role_builder'],
					location: 'local',
					status: 'idle',
					capacity: 1,
					registeredAt: '2026-04-08T00:00:00.000Z',
					lastSeenAt: '2026-04-08T00:00:00.000Z',
					note: '',
					tags: [],
					skills: ['planning'],
					threadSandboxOverride: null,
					authTokenHash: 'hash'
				},
				{
					id: 'worker_other',
					name: 'Other execution surface',
					providerId: 'provider_local',
					supportedRoleIds: ['role_builder'],
					location: 'local',
					status: 'offline',
					capacity: 1,
					registeredAt: '2026-04-08T00:00:00.000Z',
					lastSeenAt: '2026-04-08T00:00:00.000Z',
					note: '',
					tags: [],
					skills: [],
					threadSandboxOverride: null,
					authTokenHash: 'hash'
				}
			],
			tasks: [task],
			runs: [],
			reviews: [],
			approvals: []
		} as ControlPlaneData
	};
}

describe('buildTaskLaunchPlan', () => {
	it('auto-selects the best eligible execution surface when requirements are declared', async () => {
		const { current, task } = buildFixture();

		const plan = await buildTaskLaunchPlan(current, task, buildTaskDetailInput());

		expect(plan.effectiveExecutionSurface?.id).toBe('worker_builder');
		expect(plan.provider?.id).toBe('provider_local');
		expect(plan.effectiveRequiredCapabilityNames).toEqual(['planning']);
	});

	it('blocks launch when the assigned execution surface does not cover declared tools', async () => {
		const { current, task } = buildFixture({
			assigneeExecutionSurfaceId: 'worker_builder',
			requiredToolNames: ['playwright']
		});

		const error = await buildTaskLaunchPlan(current, task, buildTaskDetailInput()).catch(
			(caughtError) => caughtError
		);

		expect(error).toBeInstanceOf(TaskLaunchPlanError);
		expect(error).toMatchObject({ status: 409 });
		expect(String(error)).toMatch(/does not cover/);
	});

	it('allows launch through a direct provider when no execution surfaces are registered', async () => {
		const { current, task } = buildFixture({
			requiredCapabilityNames: ['planning'],
			requiredToolNames: ['codex']
		});
		current.executionSurfaces = [];

		const plan = await buildTaskLaunchPlan(current, task, buildTaskDetailInput());

		expect(plan.effectiveExecutionSurface).toBeNull();
		expect(plan.provider?.id).toBe('provider_local');
		expect(plan.effectiveRequiredToolNames).toEqual(['codex']);
	});

	it('blocks launch when the chosen execution surface is already at task capacity', async () => {
		const { current, task } = buildFixture();
		current.executionSurfaces[0] = {
			...current.executionSurfaces[0]!,
			capacity: 1
		};
		current.tasks.push({
			...task,
			id: 'task_existing',
			title: 'Existing queued task',
			status: 'ready',
			assigneeExecutionSurfaceId: 'worker_builder'
		});

		const error = await buildTaskLaunchPlan(current, task, buildTaskDetailInput()).catch(
			(caughtError) => caughtError
		);

		expect(error).toBeInstanceOf(TaskLaunchPlanError);
		expect(error).toMatchObject({ status: 409 });
		expect(String(error)).toMatch(/task capacity/);
	});

	it('allows launch when the current task already occupies the worker task slot', async () => {
		const { current, task } = buildFixture({
			assigneeExecutionSurfaceId: 'worker_builder'
		});
		current.executionSurfaces[0] = {
			...current.executionSurfaces[0]!,
			capacity: 1
		};
		current.tasks = current.tasks.map((candidate) =>
			candidate.id === task.id
				? {
						...candidate,
						assigneeExecutionSurfaceId: 'worker_builder'
					}
				: candidate
		);

		const plan = await buildTaskLaunchPlan(current, current.tasks[0]!, buildTaskDetailInput());

		expect(plan.effectiveExecutionSurface?.id).toBe('worker_builder');
	});
});
