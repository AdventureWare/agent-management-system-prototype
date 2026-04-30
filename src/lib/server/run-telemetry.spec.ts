import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';

const readFile = vi.hoisted(() => vi.fn());
const existsSync = vi.hoisted(() => vi.fn<(path?: string) => boolean>(() => false));

vi.mock('node:fs/promises', () => ({
	readFile
}));

vi.mock('node:fs', () => ({
	existsSync
}));

import { buildRunUsageCostSummary, syncControlPlaneRunTelemetry } from './run-telemetry';

function createData(): ControlPlaneData {
	return {
		providers: [
			{
				id: 'provider_1',
				name: 'Local Codex',
				service: 'OpenAI',
				kind: 'local',
				description: '',
				enabled: true,
				setupStatus: 'connected',
				authMode: 'local_cli',
				defaultModel: 'gpt-5.4',
				baseUrl: '',
				launcher: 'codex',
				envVars: [],
				capabilities: [],
				defaultThreadSandbox: 'workspace-write',
				notes: '',
				modelPricing: [
					{
						model: 'gpt-5.4',
						inputUsdPer1M: 1.25,
						cachedInputUsdPer1M: 0.125,
						outputUsdPer1M: 10,
						pricingVersion: '2026-04-10',
						updatedAt: '2026-04-10T00:00:00.000Z'
					}
				]
			}
		],
		roles: [],
		projects: [
			{
				id: 'project_1',
				name: 'AMS',
				summary: '',
				projectRootFolder: '/tmp/project',
				defaultArtifactRoot: '/tmp/project/agent_output',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: ''
			}
		],
		goals: [
			{
				id: 'goal_1',
				name: 'Route work better',
				area: 'product',
				status: 'running',
				summary: '',
				artifactPath: '/tmp/goal'
			}
		],
		executionSurfaces: [
			{
				id: 'worker_1',
				name: 'Coordinator',
				providerId: 'provider_1',
				supportedRoleIds: [],
				location: 'local',
				status: 'idle',
				capacity: 1,
				registeredAt: '2026-04-10T10:00:00.000Z',
				lastSeenAt: '2026-04-10T10:00:00.000Z',
				note: '',
				tags: [],
				threadSandboxOverride: null,
				authTokenHash: ''
			}
		],
		tasks: [
			{
				id: 'task_1',
				title: 'Capture spend',
				summary: '',
				projectId: 'project_1',
				area: 'product',
				goalId: 'goal_1',
				priority: 'high',
				status: 'in_progress',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: false,
				desiredRoleId: '',
				assigneeExecutionSurfaceId: 'worker_1',
				agentThreadId: 'thread_1',
				blockedReason: '',
				dependencyTaskIds: [],
				runCount: 1,
				latestRunId: 'run_1',
				artifactPath: '/tmp/project/out',
				attachments: [],
				createdAt: '2026-04-10T10:00:00.000Z',
				updatedAt: '2026-04-10T10:00:00.000Z'
			}
		],
		runs: [
			{
				id: 'run_1',
				taskId: 'task_1',
				executionSurfaceId: 'worker_1',
				providerId: 'provider_1',
				agentThreadId: 'thread_1',
				agentThreadRunId: 'managed_run_1',
				status: 'completed',
				createdAt: '2026-04-10T10:00:00.000Z',
				updatedAt: '2026-04-10T11:00:00.000Z',
				startedAt: '2026-04-10T10:00:00.000Z',
				endedAt: '2026-04-10T11:00:00.000Z',
				threadId: 'codex_thread_1',
				promptDigest: 'digest',
				artifactPaths: [],
				summary: '',
				lastHeartbeatAt: null,
				errorSummary: ''
			}
		],
		reviews: [],
		approvals: [],
		planningSessions: [],
		decisions: []
	};
}

describe('run telemetry', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-04-10T12:30:00.000Z'));
		readFile.mockReset();
		existsSync.mockReset();
		existsSync.mockReturnValue(false);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('hydrates run usage and rough cost from managed summary data', async () => {
		existsSync.mockImplementation((path?: string) => Boolean(path?.endsWith('/summary.json')));
		readFile.mockResolvedValue(
			JSON.stringify({
				modelUsed: 'gpt-5.4',
				usage: {
					inputTokens: 120000,
					cachedInputTokens: 90000,
					outputTokens: 4500,
					uncachedInputTokens: 30000,
					usageCapturedAt: '2026-04-10T11:00:00.000Z'
				}
			})
		);

		const next = await syncControlPlaneRunTelemetry(createData());
		const run = next.runs[0];

		expect(run).toMatchObject({
			modelUsed: 'gpt-5.4',
			modelSource: 'runner_reported',
			usageSource: 'provider_reported',
			inputTokens: 120000,
			cachedInputTokens: 90000,
			outputTokens: 4500,
			uncachedInputTokens: 30000,
			costSource: 'configured_model_pricing',
			pricingVersion: '2026-04-10'
		});
		expect(run?.estimatedCostUsd ?? 0).toBeCloseTo(0.09375, 6);
	});

	it('falls back to codex logs when summary usage is missing', async () => {
		existsSync.mockImplementation((path?: string) => Boolean(path?.endsWith('/codex.log')));
		readFile.mockResolvedValue(
			[
				'{"type":"thread.started","thread_id":"codex_thread_1"}',
				'{"type":"turn.completed","usage":{"input_tokens":200000,"cached_input_tokens":50000,"output_tokens":10000}}'
			].join('\n')
		);

		const next = await syncControlPlaneRunTelemetry(createData());
		const run = next.runs[0];

		expect(run).toMatchObject({
			modelUsed: null,
			modelSource: 'runner_default_unverified',
			usageSource: 'provider_reported',
			inputTokens: 200000,
			cachedInputTokens: 50000,
			outputTokens: 10000,
			uncachedInputTokens: 150000
		});
	});

	it('builds spend rollups by provider, actor, project, and goal', () => {
		const summary = buildRunUsageCostSummary({
			...createData(),
			runs: [
				{
					...createData().runs[0],
					modelUsed: 'gpt-5.4',
					usageSource: 'provider_reported',
					inputTokens: 120000,
					cachedInputTokens: 90000,
					outputTokens: 4500,
					uncachedInputTokens: 30000,
					estimatedCostUsd: 0.4875,
					costSource: 'configured_model_pricing',
					pricingVersion: '2026-04-10'
				},
				{
					...createData().runs[0],
					id: 'run_2',
					status: 'failed',
					updatedAt: '2026-04-10T12:00:00.000Z',
					estimatedCostUsd: 1.25,
					inputTokens: 200000,
					outputTokens: 8000
				}
			]
		});

		expect(summary.spendLast24hUsd).toBeCloseTo(1.7375, 6);
		expect(summary.rollups.byProvider[0]).toMatchObject({
			label: 'Local Codex',
			runCount: 2
		});
		expect(summary.rollups.byActor[0]?.label).toBe('Coordinator');
		expect(summary.rollups.byProject[0]?.label).toBe('AMS');
		expect(summary.rollups.byGoal[0]?.label).toBe('Route work better');
	});
});
