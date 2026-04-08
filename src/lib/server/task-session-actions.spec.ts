import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData, Task } from '$lib/types/control-plane';

const createDecision = vi.hoisted(() =>
	vi.fn(
		(input: {
			taskId?: string | null;
			runId?: string | null;
			decisionType: string;
			summary: string;
			createdAt?: string;
		}) => ({
			id: 'decision_test',
			taskId: input.taskId ?? null,
			goalId: null,
			runId: input.runId ?? null,
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
const getAgentThread = vi.hoisted(() => vi.fn());
const recoverAgentThread = vi.hoisted(() => vi.fn());
const buildStalledRecoveryState = vi.hoisted(() => vi.fn());
const buildTaskLaunchPlan = vi.hoisted(() => vi.fn());
const launchTaskFromPlan = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/control-plane', () => ({
	createDecision,
	loadControlPlane,
	updateControlPlane
}));

vi.mock('$lib/server/agent-threads', () => ({
	getAgentThread,
	recoverAgentThread
}));

vi.mock('$lib/server/task-detail-runtime-context', () => ({
	buildStalledRecoveryState
}));

vi.mock('$lib/server/task-launch-planning', () => ({
	TaskLaunchPlanError: class TaskLaunchPlanError extends Error {
		constructor(
			readonly status: number,
			message: string
		) {
			super(message);
		}
	},
	buildTaskLaunchPlan,
	launchTaskFromPlan
}));

import {
	launchTaskSession,
	recoverTaskSession,
	TaskSessionActionError
} from './task-session-actions';

function createTask(overrides: Partial<Task>): Task {
	return {
		id: 'task_1',
		title: 'Launch task',
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
		agentThreadId: 'thread_assigned',
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
		executionSurfaces: [],
		tasks: [createTask({})],
		runs: [],
		decisions: [],
		reviews: [],
		approvals: []
	};
}

describe('task-session-actions', () => {
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
		getAgentThread.mockResolvedValue({ id: 'thread_assigned', threadState: 'working' });
		recoverAgentThread.mockReset();
		recoverAgentThread.mockResolvedValue(undefined);
		buildStalledRecoveryState.mockReset();
		buildStalledRecoveryState.mockReturnValue({
			eligible: true,
			headline: 'stalled',
			detail: 'stalled'
		});
		buildTaskLaunchPlan.mockReset();
		buildTaskLaunchPlan.mockResolvedValue({ id: 'plan_1' });
		launchTaskFromPlan.mockReset();
		launchTaskFromPlan.mockResolvedValue({ threadId: 'thread_new' });
	});

	it('launches a ready task through the shared launch planner', async () => {
		const result = await launchTaskSession('task_1', new FormData());

		expect(result).toEqual({
			ok: true,
			successAction: 'launchTaskSession',
			taskId: 'task_1',
			threadId: 'thread_new'
		});
		expect(buildTaskLaunchPlan).toHaveBeenCalledWith(
			current,
			expect.objectContaining({ id: 'task_1' }),
			expect.any(Object)
		);
		expect(launchTaskFromPlan).toHaveBeenCalledWith('task_1', { id: 'plan_1' });
	});

	it('rejects launch when the task already has an active run', async () => {
		current = {
			...current,
			runs: [
				{
					id: 'run_active',
					taskId: 'task_1',
					executionSurfaceId: null,
					providerId: null,
					status: 'running',
					createdAt: '2026-04-01T10:00:00.000Z',
					updatedAt: '2026-04-01T10:01:00.000Z',
					startedAt: '2026-04-01T10:00:00.000Z',
					endedAt: null,
					threadId: null,
					agentThreadId: 'thread_assigned',
					promptDigest: 'digest',
					artifactPaths: [],
					summary: '',
					lastHeartbeatAt: '2026-04-01T10:01:00.000Z',
					errorSummary: ''
				}
			]
		};

		await expect(launchTaskSession('task_1', new FormData())).rejects.toMatchObject({
			status: 409,
			message:
				'This task already has an active run. Open the current work thread or wait for it to finish before starting another run.'
		} satisfies Pick<TaskSessionActionError, 'status' | 'message'>);
	});

	it('recovers a stalled task and records a recovery decision', async () => {
		current = {
			...current,
			tasks: [createTask({ status: 'in_progress' })],
			runs: [
				{
					id: 'run_active',
					taskId: 'task_1',
					executionSurfaceId: null,
					providerId: null,
					status: 'running',
					createdAt: '2026-04-01T10:00:00.000Z',
					updatedAt: '2026-04-01T10:05:00.000Z',
					startedAt: '2026-04-01T10:00:00.000Z',
					endedAt: null,
					threadId: null,
					agentThreadId: 'thread_assigned',
					promptDigest: 'digest',
					artifactPaths: [],
					summary: '',
					lastHeartbeatAt: '2026-04-01T10:05:00.000Z',
					errorSummary: ''
				}
			]
		};

		const result = await recoverTaskSession('task_1', new FormData());

		expect(result).toEqual({
			ok: true,
			successAction: 'recoverTaskSession',
			taskId: 'task_1',
			threadId: 'thread_new'
		});
		expect(recoverAgentThread).toHaveBeenCalledWith('thread_assigned');
		expect(current.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_1',
				runId: 'run_active',
				decisionType: 'task_recovered'
			})
		);
	});

	it('evaluates stalled recovery against the active run thread instead of the assigned thread', async () => {
		current = {
			...current,
			tasks: [createTask({ status: 'in_progress', agentThreadId: 'thread_reassigned' })],
			runs: [
				{
					id: 'run_active',
					taskId: 'task_1',
					executionSurfaceId: null,
					providerId: null,
					status: 'running',
					createdAt: '2026-04-01T10:00:00.000Z',
					updatedAt: '2026-04-01T10:05:00.000Z',
					startedAt: '2026-04-01T10:00:00.000Z',
					endedAt: null,
					threadId: null,
					agentThreadId: 'thread_active_run',
					promptDigest: 'digest',
					artifactPaths: [],
					summary: '',
					lastHeartbeatAt: '2026-04-01T10:05:00.000Z',
					errorSummary: ''
				}
			]
		};
		getAgentThread.mockImplementation(async (threadId: string) =>
			threadId === 'thread_active_run'
				? { id: 'thread_active_run', threadState: 'working' }
				: { id: 'thread_reassigned', threadState: 'working' }
		);

		await recoverTaskSession('task_1', new FormData());

		expect(buildStalledRecoveryState).toHaveBeenCalledWith(
			expect.objectContaining({
				task: expect.objectContaining({ id: 'task_1', agentThreadId: 'thread_reassigned' }),
				activeRun: expect.objectContaining({
					id: 'run_active',
					agentThreadId: 'thread_active_run'
				}),
				activeRunThread: expect.objectContaining({ id: 'thread_active_run' })
			})
		);
	});

	it('rejects recovery when the active run is not linked to a recoverable thread', async () => {
		current = {
			...current,
			tasks: [createTask({ status: 'in_progress' })],
			runs: [
				{
					id: 'run_active',
					taskId: 'task_1',
					executionSurfaceId: null,
					providerId: null,
					status: 'running',
					createdAt: '2026-04-01T10:00:00.000Z',
					updatedAt: '2026-04-01T10:05:00.000Z',
					startedAt: '2026-04-01T10:00:00.000Z',
					endedAt: null,
					threadId: null,
					agentThreadId: null,
					promptDigest: 'digest',
					artifactPaths: [],
					summary: '',
					lastHeartbeatAt: '2026-04-01T10:05:00.000Z',
					errorSummary: ''
				}
			]
		};

		await expect(recoverTaskSession('task_1', new FormData())).rejects.toMatchObject({
			status: 409,
			message: 'The active run is not linked to a recoverable work thread.'
		} satisfies Pick<TaskSessionActionError, 'status' | 'message'>);
	});

	it('rejects recovery when the task is no longer in progress', async () => {
		current = {
			...current,
			tasks: [createTask({ status: 'done' })],
			runs: [
				{
					id: 'run_active',
					taskId: 'task_1',
					executionSurfaceId: null,
					providerId: null,
					status: 'running',
					createdAt: '2026-04-01T10:00:00.000Z',
					updatedAt: '2026-04-01T10:05:00.000Z',
					startedAt: '2026-04-01T10:00:00.000Z',
					endedAt: null,
					threadId: null,
					agentThreadId: 'thread_assigned',
					promptDigest: 'digest',
					artifactPaths: [],
					summary: '',
					lastHeartbeatAt: '2026-04-01T10:05:00.000Z',
					errorSummary: ''
				}
			]
		};

		await expect(recoverTaskSession('task_1', new FormData())).rejects.toMatchObject({
			status: 409,
			message: 'Only tasks that are still In Progress can be recovered automatically.'
		} satisfies Pick<TaskSessionActionError, 'status' | 'message'>);
	});
});
