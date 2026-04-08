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
			decidedByWorkerId: null
		})
	)
);
const loadControlPlane = vi.hoisted(() => vi.fn());
const updateControlPlane = vi.hoisted(() => vi.fn());
const getAgentThread = vi.hoisted(() => vi.fn());
const persistTaskAttachments = vi.hoisted(() => vi.fn());
const getTaskAttachmentRoot = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/control-plane', () => ({
	createDecision,
	loadControlPlane,
	updateControlPlane
}));

vi.mock('$lib/server/agent-threads', () => ({
	getAgentThread
}));

vi.mock('$lib/server/task-attachments', () => ({
	getTaskAttachmentRoot,
	persistTaskAttachments
}));

import {
	attachTaskFile,
	removeTaskAttachment,
	TaskDetailMutationActionError,
	updateTaskThreadAssignment
} from './task-detail-mutation-actions';

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
		assigneeWorkerId: null,
		agentThreadId: 'thread_existing',
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
		workers: [],
		tasks: [createTask({})],
		runs: [],
		decisions: [],
		reviews: [],
		approvals: []
	};
}

describe('task-detail-mutation-actions', () => {
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
		getAgentThread.mockReset();
		getAgentThread.mockResolvedValue({ id: 'thread_next' });
		persistTaskAttachments.mockReset();
		persistTaskAttachments.mockResolvedValue([
			{
				id: 'attachment_1',
				name: 'brief.md',
				path: '/tmp/project/agent_output/task-attachments/task_1/attachment_1-brief.md',
				contentType: 'text/markdown',
				sizeBytes: 10,
				attachedAt: '2026-04-01T10:00:00.000Z'
			}
		]);
		getTaskAttachmentRoot.mockReset();
		getTaskAttachmentRoot.mockReturnValue('/tmp/project/agent_output/task-attachments/task_1');
	});

	it('attaches a file and stores it on the task', async () => {
		const form = new FormData();
		form.set('attachment', new File(['hello task'], 'brief.md', { type: 'text/markdown' }));

		const result = await attachTaskFile('task_1', form);

		expect(result).toEqual({
			ok: true,
			successAction: 'attachTaskFile',
			taskId: 'task_1',
			attachmentId: 'attachment_1'
		});
		expect(current.tasks[0]?.attachments).toEqual([
			expect.objectContaining({
				id: 'attachment_1',
				name: 'brief.md'
			})
		]);
	});

	it('removes an existing attachment', async () => {
		current = {
			...current,
			tasks: [
				createTask({
					attachments: [
						{
							id: 'attachment_1',
							name: 'brief.md',
							path: '/tmp/project/agent_output/task-attachments/task_1/attachment_1-brief.md',
							contentType: 'text/markdown',
							sizeBytes: 10,
							attachedAt: '2026-04-01T10:00:00.000Z'
						}
					]
				})
			]
		};

		const form = new FormData();
		form.set('attachmentId', 'attachment_1');

		const result = await removeTaskAttachment('task_1', form);

		expect(result).toEqual({
			ok: true,
			successAction: 'removeTaskAttachment',
			taskId: 'task_1',
			attachmentId: 'attachment_1'
		});
		expect(current.tasks[0]?.attachments).toEqual([]);
	});

	it('updates the task thread and records a decision', async () => {
		const form = new FormData();
		form.set('agentThreadId', 'thread_next');

		const result = await updateTaskThreadAssignment('task_1', form);

		expect(result).toEqual({
			ok: true,
			successAction: 'updateTaskThread',
			taskId: 'task_1'
		});
		expect(current.tasks[0]).toEqual(
			expect.objectContaining({
				agentThreadId: 'thread_next'
			})
		);
		expect(current.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_1',
				decisionType: 'task_thread_updated'
			})
		);
	});

	it('treats an unchanged thread assignment as a no-op', async () => {
		getAgentThread.mockResolvedValue(null);

		const form = new FormData();
		form.set('agentThreadId', 'thread_existing');

		const result = await updateTaskThreadAssignment('task_1', form);

		expect(result).toEqual({
			ok: true,
			successAction: 'updateTaskThread',
			taskId: 'task_1'
		});
		expect(getAgentThread).not.toHaveBeenCalled();
		expect(updateControlPlane).not.toHaveBeenCalled();
		expect(createDecision).not.toHaveBeenCalled();
		expect(current.tasks[0]?.agentThreadId).toBe('thread_existing');
	});

	it('treats clearing an already-empty thread assignment as a no-op', async () => {
		current = {
			...current,
			tasks: [createTask({ agentThreadId: null })]
		};

		const form = new FormData();
		form.set('agentThreadId', '');

		const result = await updateTaskThreadAssignment('task_1', form);

		expect(result).toEqual({
			ok: true,
			successAction: 'updateTaskThread',
			taskId: 'task_1'
		});
		expect(getAgentThread).not.toHaveBeenCalled();
		expect(updateControlPlane).not.toHaveBeenCalled();
		expect(createDecision).not.toHaveBeenCalled();
		expect(current.tasks[0]?.agentThreadId).toBeNull();
	});

	it('clears the task thread and records a decision', async () => {
		const form = new FormData();
		form.set('agentThreadId', '');

		const result = await updateTaskThreadAssignment('task_1', form);

		expect(result).toEqual({
			ok: true,
			successAction: 'updateTaskThread',
			taskId: 'task_1'
		});
		expect(current.tasks[0]).toEqual(
			expect.objectContaining({
				agentThreadId: null
			})
		);
		expect(current.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_1',
				decisionType: 'task_thread_updated',
				summary: 'Cleared the task thread assignment.'
			})
		);
	});

	it('rejects an unknown thread assignment', async () => {
		getAgentThread.mockResolvedValue(null);

		const form = new FormData();
		form.set('agentThreadId', 'thread_missing');

		await expect(updateTaskThreadAssignment('task_1', form)).rejects.toMatchObject({
			status: 400,
			message: 'Selected work thread was not found.'
		} satisfies Pick<TaskDetailMutationActionError, 'status' | 'message'>);
	});
});
