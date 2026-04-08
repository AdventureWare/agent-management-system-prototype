import { describe, expect, it } from 'vitest';
import type { AgentThreadDetail } from '$lib/types/agent-thread';
import type { Run, Task } from '$lib/types/control-plane';
import { buildStalledRecoveryState } from '$lib/server/task-detail-runtime-context';

function createTask(overrides: Partial<Task> = {}): Task {
	return {
		id: 'task_1',
		title: 'Recover task',
		summary: 'Recover a stalled task thread.',
		projectId: 'project_1',
		area: 'product',
		goalId: '',
		parentTaskId: null,
		delegationPacket: null,
		delegationAcceptance: null,
		priority: 'medium',
		status: 'in_progress',
		riskLevel: 'medium',
		approvalMode: 'none',
		requiredThreadSandbox: null,
		requiresReview: false,
		desiredRoleId: '',
		assigneeWorkerId: null,
		agentThreadId: 'thread_1',
		requiredCapabilityNames: [],
		requiredToolNames: [],
		blockedReason: '',
		dependencyTaskIds: [],
		targetDate: null,
		runCount: 1,
		latestRunId: 'run_1',
		artifactPath: '/tmp/project/out',
		attachments: [],
		createdAt: '2026-04-07T12:00:00.000Z',
		updatedAt: '2026-04-07T12:00:00.000Z',
		...overrides
	};
}

function createRun(overrides: Partial<Run> = {}): Run {
	return {
		id: 'run_1',
		taskId: 'task_1',
		workerId: null,
		providerId: null,
		status: 'running',
		createdAt: '2026-04-07T12:00:00.000Z',
		updatedAt: '2026-04-07T12:00:00.000Z',
		startedAt: '2026-04-07T12:00:00.000Z',
		endedAt: null,
		threadId: 'codex_thread_1',
		agentThreadId: 'thread_1',
		promptDigest: 'digest',
		artifactPaths: [],
		summary: '',
		lastHeartbeatAt: '2026-04-07T12:00:00.000Z',
		errorSummary: '',
		...overrides
	};
}

function createThread(overrides: Partial<AgentThreadDetail> = {}): AgentThreadDetail {
	return {
		id: 'thread_1',
		name: 'Worker thread',
		cwd: '/tmp/project',
		additionalWritableRoots: [],
		sandbox: 'workspace-write',
		model: null,
		threadId: 'codex_thread_1',
		attachments: [],
		archivedAt: null,
		createdAt: '2026-04-07T12:00:00.000Z',
		updatedAt: '2026-04-07T12:30:00.000Z',
		origin: 'managed',
		threadState: 'working',
		latestRunStatus: 'running',
		hasActiveRun: true,
		canResume: false,
		runCount: 1,
		lastActivityAt: '2026-04-07T12:00:00.000Z',
		lastActivityLabel: '30m ago',
		threadSummary: 'No recent output.',
		lastExitCode: null,
		runTimeline: [],
		relatedTasks: [],
		latestRun: null,
		runs: [],
		...overrides
	};
}

describe('buildStalledRecoveryState', () => {
	it('does not mark a stale active run as recoverable when it has no linked thread', () => {
		const recovery = buildStalledRecoveryState({
			task: createTask(),
			activeRun: createRun({
				agentThreadId: null,
				threadId: null,
				updatedAt: '2026-04-07T11:00:00.000Z',
				lastHeartbeatAt: '2026-04-07T11:00:00.000Z'
			}),
			activeRunThread: null
		});

		expect(recovery).toBeNull();
	});

	it('does not mark a completed task as recoverable even if its active run looks stale', () => {
		const recovery = buildStalledRecoveryState({
			task: createTask({ status: 'done' }),
			activeRun: createRun({
				updatedAt: '2026-04-07T11:00:00.000Z',
				lastHeartbeatAt: '2026-04-07T11:00:00.000Z'
			}),
			activeRunThread: createThread({
				lastActivityAt: '2026-04-07T11:00:00.000Z'
			})
		});

		expect(recovery).toBeNull();
	});

	it('marks a stale linked run as recoverable when heartbeat and thread output are quiet', () => {
		const recovery = buildStalledRecoveryState({
			task: createTask(),
			activeRun: createRun({
				updatedAt: '2026-04-07T11:00:00.000Z',
				lastHeartbeatAt: '2026-04-07T11:00:00.000Z'
			}),
			activeRunThread: createThread({
				lastActivityAt: '2026-04-07T11:00:00.000Z'
			})
		});

		expect(recovery).toMatchObject({
			eligible: true,
			headline: 'This task appears stalled.'
		});
	});
});
