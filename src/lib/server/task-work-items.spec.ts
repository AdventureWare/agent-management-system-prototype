import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentThreadDetail } from '$lib/types/agent-thread';
import type { ControlPlaneData } from '$lib/types/control-plane';
import {
	buildTaskWorkItems,
	selectStaleTaskWorkItems,
	summarizeTaskFreshness
} from './task-work-items';

function createSession(overrides: Partial<AgentThreadDetail> = {}): AgentThreadDetail {
	return {
		id: 'session_1',
		name: 'Task thread',
		cwd: '/tmp',
		sandbox: 'workspace-write',
		model: null,
		threadId: 'thread_1',
		archivedAt: null,
		createdAt: '2026-03-31T08:00:00.000Z',
		updatedAt: '2026-03-31T09:00:00.000Z',
		origin: 'managed',
		threadState: 'working',
		latestRunStatus: 'running',
		hasActiveRun: true,
		canResume: false,
		runCount: 1,
		lastActivityAt: '2026-03-31T11:40:00.000Z',
		lastActivityLabel: '20m ago',
		threadSummary: 'Worker is still running.',
		lastExitCode: null,
		runTimeline: [],
		relatedTasks: [],
		latestRun: null,
		runs: [],
		...overrides
	};
}

function createControlPlane(): ControlPlaneData {
	return {
		providers: [
			{
				id: 'provider_local',
				name: 'Local Codex',
				service: 'codex',
				kind: 'local',
				description: 'Local provider',
				enabled: true,
				setupStatus: 'connected',
				authMode: 'local_cli',
				defaultModel: '',
				baseUrl: '',
				launcher: '',
				envVars: [],
				capabilities: [],
				defaultThreadSandbox: 'workspace-write',
				notes: ''
			}
		],
		roles: [
			{
				id: 'role_1',
				name: 'Coordinator',
				area: 'shared',
				description: 'Coordinates work'
			}
		],
		projects: [
			{
				id: 'project_1',
				name: 'Agent Management System Prototype',
				summary: 'Primary app project',
				projectRootFolder: '/tmp',
				defaultArtifactRoot: '/tmp/out',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: ''
			}
		],
		goals: [],
		workers: [
			{
				id: 'worker_1',
				name: 'Operator worker',
				providerId: 'provider_local',
				roleId: 'role_1',
				location: 'local',
				status: 'busy',
				capacity: 1,
				registeredAt: '2026-03-31T08:00:00.000Z',
				lastSeenAt: '2026-03-31T11:58:00.000Z',
				note: '',
				tags: [],
				threadSandboxOverride: null,
				authTokenHash: ''
			}
		],
		tasks: [
			{
				id: 'task_stale_wip',
				title: 'Stale in-progress task',
				summary: 'A task that has not been updated in hours.',
				projectId: 'project_1',
				area: 'product',
				goalId: '',
				priority: 'medium',
				status: 'in_progress',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: true,
				desiredRoleId: 'role_1',
				assigneeWorkerId: 'worker_1',
				agentThreadId: null,
				blockedReason: '',
				dependencyTaskIds: [],
				runCount: 1,
				latestRunId: 'run_stale_wip',
				artifactPath: '/tmp/out',
				attachments: [],
				createdAt: '2026-03-31T07:00:00.000Z',
				updatedAt: '2026-03-31T04:00:00.000Z'
			},
			{
				id: 'task_quiet_thread',
				title: 'Quiet active thread task',
				summary: 'Run is active but thread output has gone quiet.',
				projectId: 'project_1',
				area: 'product',
				goalId: '',
				priority: 'medium',
				status: 'ready',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: true,
				desiredRoleId: 'role_1',
				assigneeWorkerId: 'worker_1',
				agentThreadId: 'session_quiet',
				blockedReason: '',
				dependencyTaskIds: [],
				runCount: 1,
				latestRunId: 'run_quiet_thread',
				artifactPath: '/tmp/out',
				attachments: [],
				createdAt: '2026-03-31T08:00:00.000Z',
				updatedAt: '2026-03-31T11:50:00.000Z'
			},
			{
				id: 'task_fresh',
				title: 'Fresh task',
				summary: 'Fresh work stays out of the stale watchlist.',
				projectId: 'project_1',
				area: 'product',
				goalId: '',
				priority: 'medium',
				status: 'ready',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: true,
				desiredRoleId: 'role_1',
				assigneeWorkerId: null,
				agentThreadId: null,
				blockedReason: '',
				dependencyTaskIds: [],
				runCount: 0,
				latestRunId: null,
				artifactPath: '/tmp/out',
				attachments: [],
				createdAt: '2026-03-31T11:40:00.000Z',
				updatedAt: '2026-03-31T11:55:00.000Z'
			}
		],
		runs: [
			{
				id: 'run_stale_wip',
				taskId: 'task_stale_wip',
				workerId: 'worker_1',
				providerId: 'provider_local',
				status: 'running',
				createdAt: '2026-03-31T04:00:00.000Z',
				updatedAt: '2026-03-31T04:00:00.000Z',
				startedAt: '2026-03-31T04:00:00.000Z',
				endedAt: null,
				threadId: null,
				agentThreadId: null,
				promptDigest: '',
				artifactPaths: [],
				summary: '',
				lastHeartbeatAt: '2026-03-31T11:53:00.000Z',
				errorSummary: ''
			},
			{
				id: 'run_quiet_thread',
				taskId: 'task_quiet_thread',
				workerId: 'worker_1',
				providerId: 'provider_local',
				status: 'running',
				createdAt: '2026-03-31T11:00:00.000Z',
				updatedAt: '2026-03-31T11:20:00.000Z',
				startedAt: '2026-03-31T11:00:00.000Z',
				endedAt: null,
				threadId: 'thread_quiet',
				agentThreadId: 'session_quiet',
				promptDigest: '',
				artifactPaths: [],
				summary: '',
				lastHeartbeatAt: '2026-03-31T11:20:00.000Z',
				errorSummary: ''
			}
		],
		reviews: [],
		approvals: []
	};
}

describe('task-work-items', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-31T12:00:00.000Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('builds stale freshness signals from task age, heartbeat age, and thread activity', () => {
		const sessions = [
			createSession({
				id: 'session_quiet',
				threadId: 'thread_quiet',
				lastActivityAt: '2026-03-31T11:20:00.000Z'
			})
		];
		const tasks = buildTaskWorkItems(createControlPlane(), sessions);
		const staleWip = tasks.find((task) => task.id === 'task_stale_wip');
		const quietThread = tasks.find((task) => task.id === 'task_quiet_thread');
		const freshTask = tasks.find((task) => task.id === 'task_fresh');

		expect(staleWip?.freshness.staleInProgress).toBe(true);
		expect(staleWip?.freshness.noRecentRunActivity).toBe(true);
		expect(staleWip?.freshness.activeThreadNoRecentOutput).toBe(false);

		expect(quietThread?.freshness.staleInProgress).toBe(false);
		expect(quietThread?.freshness.noRecentRunActivity).toBe(true);
		expect(quietThread?.freshness.activeThreadNoRecentOutput).toBe(true);

		expect(freshTask?.freshness.isStale).toBe(false);

		expect(summarizeTaskFreshness(tasks)).toEqual({
			totalCount: 2,
			staleInProgressCount: 1,
			noRecentRunActivityCount: 2,
			activeThreadNoRecentOutputCount: 1
		});
	});

	it('prioritizes tasks with more stale signals in the watchlist', () => {
		const sessions = [
			createSession({
				id: 'session_quiet',
				threadId: 'thread_quiet',
				lastActivityAt: '2026-03-31T11:20:00.000Z'
			})
		];
		const staleTasks = selectStaleTaskWorkItems(buildTaskWorkItems(createControlPlane(), sessions));

		expect(staleTasks.map((task) => task.id)).toEqual(['task_stale_wip', 'task_quiet_thread']);
	});
});
