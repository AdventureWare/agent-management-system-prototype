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
const updateTaskRecord = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/control-plane', () => ({
	createDecision,
	loadControlPlane
}));

vi.mock('$lib/server/control-plane-repository', () => ({
	updateTaskRecord
}));

import {
	acceptTaskChildHandoff,
	requestTaskChildHandoffChanges,
	TaskChildHandoffActionError
} from './task-child-handoffs';

function createTask(overrides: Partial<Task>): Task {
	return {
		id: 'task',
		title: 'Task',
		summary: '',
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
		roles: [],
		projects: [],
		goals: [],
		executionSurfaces: [],
		tasks: [
			createTask({
				id: 'task_parent',
				title: 'Parent task'
			}),
			createTask({
				id: 'task_child',
				title: 'Child task',
				parentTaskId: 'task_parent',
				status: 'done'
			})
		],
		runs: [],
		decisions: [],
		reviews: [],
		approvals: []
	};
}

describe('task-child-handoffs', () => {
	let current: ControlPlaneData;

	beforeEach(() => {
		current = createData();
		createDecision.mockClear();
		loadControlPlane.mockReset();
		loadControlPlane.mockImplementation(async () => current);
		updateTaskRecord.mockReset();
		updateTaskRecord.mockImplementation(
			async (input: {
				taskId: string;
				update: (task: Task, data: ControlPlaneData) => Task;
				prependDecisions?: Array<Record<string, unknown>>;
			}) => {
				const existingTask = current.tasks.find((task) => task.id === input.taskId) ?? null;

				if (!existingTask) {
					return null;
				}

				const nextTask = input.update(existingTask, current);
				current = {
					...current,
					tasks: current.tasks.map((task) => (task.id === input.taskId ? nextTask : task)),
					decisions: [
						...(input.prependDecisions ?? []),
						...(current.decisions ?? [])
					] as ControlPlaneData['decisions']
				};

				return nextTask;
			}
		);
	});

	it('accepts a completed child handoff and records a decision', async () => {
		const form = new FormData();
		form.set('childTaskId', 'task_child');
		form.set('summary', 'Accepted and ready to integrate.');

		const result = await acceptTaskChildHandoff('task_parent', form);

		expect(result).toEqual({
			ok: true,
			successAction: 'acceptChildHandoff',
			taskId: 'task_parent',
			childTaskId: 'task_child'
		});
		expect(current.tasks.find((task) => task.id === 'task_child')).toEqual(
			expect.objectContaining({
				delegationAcceptance: expect.objectContaining({
					summary: 'Accepted and ready to integrate.'
				})
			})
		);
		expect(current.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_child',
				decisionType: 'delegation_handoff_accepted'
			})
		);
	});

	it('blocks the child task when changes are requested', async () => {
		const form = new FormData();
		form.set('childTaskId', 'task_child');
		form.set('summary', 'Need a narrower scope and a new test pass.');

		const result = await requestTaskChildHandoffChanges('task_parent', form);

		expect(result).toEqual({
			ok: true,
			successAction: 'requestChildHandoffChanges',
			taskId: 'task_parent',
			childTaskId: 'task_child'
		});
		expect(current.tasks.find((task) => task.id === 'task_child')).toEqual(
			expect.objectContaining({
				status: 'blocked',
				blockedReason: 'Need a narrower scope and a new test pass.',
				delegationAcceptance: null
			})
		);
		expect(current.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_child',
				decisionType: 'delegation_handoff_changes_requested'
			})
		);
	});

	it('rejects acceptance when the child task is not completed', async () => {
		current = {
			...current,
			tasks: current.tasks.map((task) =>
				task.id === 'task_child'
					? {
							...task,
							status: 'review'
						}
					: task
			)
		};

		const form = new FormData();
		form.set('childTaskId', 'task_child');

		await expect(acceptTaskChildHandoff('task_parent', form)).rejects.toMatchObject({
			status: 409,
			message: 'Only completed child tasks can be accepted into the parent.'
		} satisfies Pick<TaskChildHandoffActionError, 'status' | 'message'>);
	});

	it('rejects accepting a child handoff that was already accepted', async () => {
		current = {
			...current,
			tasks: current.tasks.map((task) =>
				task.id === 'task_child'
					? {
							...task,
							delegationAcceptance: {
								summary: 'Already integrated.',
								acceptedAt: '2026-04-01T10:30:00.000Z'
							}
						}
					: task
			)
		};

		const form = new FormData();
		form.set('childTaskId', 'task_child');

		await expect(acceptTaskChildHandoff('task_parent', form)).rejects.toMatchObject({
			status: 409,
			message: 'This child handoff has already been accepted.'
		} satisfies Pick<TaskChildHandoffActionError, 'status' | 'message'>);
	});

	it('rejects requesting follow-up when the child task is not completed', async () => {
		current = {
			...current,
			tasks: current.tasks.map((task) =>
				task.id === 'task_child'
					? {
							...task,
							status: 'in_progress'
						}
					: task
			)
		};

		const form = new FormData();
		form.set('childTaskId', 'task_child');

		await expect(requestTaskChildHandoffChanges('task_parent', form)).rejects.toMatchObject({
			status: 409,
			message: 'Only completed child tasks can be returned for follow-up.'
		} satisfies Pick<TaskChildHandoffActionError, 'status' | 'message'>);
	});

	it('rejects requesting follow-up after the child handoff was accepted', async () => {
		current = {
			...current,
			tasks: current.tasks.map((task) =>
				task.id === 'task_child'
					? {
							...task,
							delegationAcceptance: {
								summary: 'Already integrated.',
								acceptedAt: '2026-04-01T10:30:00.000Z'
							}
						}
					: task
			)
		};

		const form = new FormData();
		form.set('childTaskId', 'task_child');

		await expect(requestTaskChildHandoffChanges('task_parent', form)).rejects.toMatchObject({
			status: 409,
			message: 'Accepted child handoffs cannot be returned for follow-up.'
		} satisfies Pick<TaskChildHandoffActionError, 'status' | 'message'>);
	});
});
