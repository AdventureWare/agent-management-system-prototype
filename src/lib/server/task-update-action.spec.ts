import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData, Task } from '$lib/types/control-plane';

const createDecision = vi.hoisted(() =>
	vi.fn(
		(input: {
			taskId?: string | null;
			decisionType: string;
			summary: string;
			createdAt?: string;
		}) => ({
			id: 'decision_test',
			taskId: input.taskId ?? null,
			goalId: null,
			runId: null,
			reviewId: null,
			approvalId: null,
			planningSessionId: null,
			decisionType: input.decisionType,
			summary: input.summary,
			createdAt: input.createdAt ?? '2026-04-01T10:00:00.000Z',
			decidedByExecutionSurfaceId: null
		})
	)
);
const loadControlPlane = vi.hoisted(() => vi.fn());
const updateControlPlane = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/control-plane', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/control-plane')>(
		'$lib/server/control-plane'
	);

	return {
		...actual,
		createDecision,
		loadControlPlane,
		updateControlPlane
	};
});

import { TaskUpdateActionError, updateTaskFromDetailForm } from './task-update-action';

function createTask(overrides: Partial<Task>): Task {
	return {
		id: 'task_1',
		title: 'Existing task',
		summary: 'Existing summary',
		projectId: 'project_1',
		area: 'product',
		goalId: '',
		parentTaskId: null,
		delegationPacket: null,
		delegationAcceptance: null,
		priority: 'medium',
		status: 'ready',
		riskLevel: 'medium',
		approvalMode: 'none',
		requiredThreadSandbox: null,
		requiresReview: false,
		desiredRoleId: '',
		assigneeExecutionSurfaceId: null,
		agentThreadId: null,
		requiredCapabilityNames: [],
		requiredToolNames: [],
		blockedReason: '',
		dependencyTaskIds: [],
		targetDate: null,
		runCount: 0,
		latestRunId: null,
		artifactPath: '/tmp/project/agent_output',
		attachments: [],
		createdAt: '2026-04-01T10:00:00.000Z',
		updatedAt: '2026-04-01T10:00:00.000Z',
		...overrides
	};
}

function createData(): ControlPlaneData {
	return {
		providers: [],
		roles: [
			{
				id: 'role_reviewer',
				name: 'Reviewer',
				area: 'shared',
				description: ''
			}
		],
		projects: [
			{
				id: 'project_1',
				name: 'Project',
				summary: '',
				projectRootFolder: '/tmp/project',
				defaultArtifactRoot: '/tmp/project/agent_output',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: ''
			}
		],
		goals: [],
		executionSurfaces: [],
		tasks: [
			createTask({}),
			createTask({
				id: 'task_dep',
				title: 'Dependency task',
				status: 'done'
			})
		],
		runs: [],
		decisions: [],
		reviews: [],
		approvals: []
	};
}

describe('task-update-action', () => {
	let current: ControlPlaneData;

	beforeEach(() => {
		current = createData();
		createDecision.mockClear();
		loadControlPlane.mockReset();
		loadControlPlane.mockImplementation(async () => current);
		updateControlPlane.mockReset();
		updateControlPlane.mockImplementation(
			async (updater: (data: ControlPlaneData) => ControlPlaneData) => {
				current = updater(current);
				return current;
			}
		);
	});

	it('updates the task and records a plan-update decision', async () => {
		const form = new FormData();
		form.set('name', 'Updated task');
		form.set('instructions', 'New instructions');
		form.set('projectId', 'project_1');
		form.set('targetDate', '2026-04-22');
		form.set('dependencyTaskSelection', '1');
		form.set('dependencyTaskIds', 'task_dep');

		const result = await updateTaskFromDetailForm('task_1', form);

		expect(result).toEqual({
			ok: true,
			successAction: 'updateTask',
			taskId: 'task_1'
		});
		expect(current.tasks.find((task) => task.id === 'task_1')).toEqual(
			expect.objectContaining({
				title: 'Updated task',
				summary: 'New instructions',
				targetDate: '2026-04-22',
				dependencyTaskIds: ['task_dep']
			})
		);
		expect(current.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_1',
				decisionType: 'task_plan_updated'
			})
		);
	});

	it('rejects an invalid target date format', async () => {
		const form = new FormData();
		form.set('name', 'Updated task');
		form.set('instructions', 'New instructions');
		form.set('projectId', 'project_1');
		form.set('targetDate', '04/22/2026');

		await expect(updateTaskFromDetailForm('task_1', form)).rejects.toMatchObject({
			status: 400,
			message: 'Target date must use YYYY-MM-DD format.'
		} satisfies Pick<TaskUpdateActionError, 'status' | 'message'>);
	});

	it('rejects missing dependency references', async () => {
		const form = new FormData();
		form.set('name', 'Updated task');
		form.set('instructions', 'New instructions');
		form.set('projectId', 'project_1');
		form.set('dependencyTaskSelection', '1');
		form.set('dependencyTaskIds', 'task_missing');

		await expect(updateTaskFromDetailForm('task_1', form)).rejects.toMatchObject({
			status: 400,
			message: 'One or more selected dependencies are no longer available.'
		} satisfies Pick<TaskUpdateActionError, 'status' | 'message'>);
	});
});
