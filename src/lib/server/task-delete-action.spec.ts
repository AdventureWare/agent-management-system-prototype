import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData, Task } from '$lib/types/control-plane';

const loadControlPlane = vi.hoisted(() => vi.fn());
const deleteTaskRecords = vi.hoisted(() => vi.fn());
const cancelAgentThread = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/control-plane', () => ({
	loadControlPlane
}));

vi.mock('$lib/server/control-plane-repository', () => ({
	deleteTaskRecords
}));

vi.mock('$lib/server/agent-threads', () => ({
	cancelAgentThread
}));

import { deleteTaskWithRelatedThreads, TaskDeleteActionError } from './task-delete-action';

function createTask(overrides: Partial<Task>): Task {
	return {
		id: 'task_1',
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
		tasks: [createTask({})],
		runs: [
			{
				id: 'run_1',
				taskId: 'task_1',
				executionSurfaceId: null,
				providerId: null,
				status: 'completed',
				createdAt: '2026-04-01T10:00:00.000Z',
				updatedAt: '2026-04-01T10:01:00.000Z',
				startedAt: '2026-04-01T10:00:00.000Z',
				endedAt: '2026-04-01T10:01:00.000Z',
				threadId: null,
				agentThreadId: 'thread_1',
				promptDigest: 'digest',
				artifactPaths: [],
				summary: '',
				lastHeartbeatAt: '2026-04-01T10:01:00.000Z',
				errorSummary: ''
			},
			{
				id: 'run_2',
				taskId: 'task_1',
				executionSurfaceId: null,
				providerId: null,
				status: 'completed',
				createdAt: '2026-04-01T10:02:00.000Z',
				updatedAt: '2026-04-01T10:03:00.000Z',
				startedAt: '2026-04-01T10:02:00.000Z',
				endedAt: '2026-04-01T10:03:00.000Z',
				threadId: null,
				agentThreadId: 'thread_1',
				promptDigest: 'digest',
				artifactPaths: [],
				summary: '',
				lastHeartbeatAt: '2026-04-01T10:03:00.000Z',
				errorSummary: ''
			}
		],
		decisions: [],
		reviews: [],
		approvals: []
	};
}

describe('task-delete-action', () => {
	let current: ControlPlaneData;

	beforeEach(() => {
		current = createData();
		loadControlPlane.mockReset();
		loadControlPlane.mockImplementation(async () => current);
		deleteTaskRecords.mockReset();
		deleteTaskRecords.mockImplementation(async (taskIds: string[]) => {
			current = {
				...current,
				tasks: current.tasks.filter((task) => !taskIds.includes(task.id)),
				runs: current.runs.filter((run) => !taskIds.includes(run.taskId))
			};
			return taskIds;
		});
		cancelAgentThread.mockReset();
		cancelAgentThread.mockResolvedValue(undefined);
	});

	it('cancels related threads and removes the task', async () => {
		await deleteTaskWithRelatedThreads('task_1');

		expect(cancelAgentThread).toHaveBeenCalledTimes(1);
		expect(cancelAgentThread).toHaveBeenCalledWith('thread_1');
		expect(current.tasks).toEqual([]);
		expect(current.runs).toEqual([]);
	});

	it('rejects deletion when the task does not exist', async () => {
		await expect(deleteTaskWithRelatedThreads('task_missing')).rejects.toMatchObject({
			status: 404,
			message: 'Task not found.'
		} satisfies Pick<TaskDeleteActionError, 'status' | 'message'>);
	});
});
