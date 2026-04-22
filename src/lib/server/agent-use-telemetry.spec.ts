import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tempRoot: string | null = null;

beforeEach(() => {
	vi.resetModules();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

afterEach(async () => {
	if (tempRoot) {
		await rm(tempRoot, { recursive: true, force: true });
		tempRoot = null;
	}
});

async function prepareTelemetryFileEnv() {
	tempRoot = await mkdtemp(join(tmpdir(), 'ams-agent-use-telemetry-'));
	const telemetryFile = join(tempRoot, 'agent-use-telemetry.json');
	vi.stubEnv('AMS_AGENT_USE_TELEMETRY_FILE', telemetryFile);
	return telemetryFile;
}

describe('agent-use-telemetry', () => {
	it('summarizes tool usage and matched playbooks from recorded events', async () => {
		await prepareTelemetryFileEnv();
		const { recordAgentToolUse, summarizeAgentToolUse } = await import('./agent-use-telemetry.js');
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-04-21T12:00:00.000Z'));

		for (const toolName of [
			'ams_manifest',
			'ams_task_get',
			'ams_task_request_approval',
			'ams_task_get'
		]) {
			await recordAgentToolUse({
				threadId: 'thread_task',
				toolName,
				args: toolName === 'ams_task_request_approval' ? { taskId: 'task_123' } : {},
				outcome: 'success'
			});
			vi.setSystemTime(new Date(Date.now() + 1_000));
		}

		const summary = await summarizeAgentToolUse({ threadId: 'thread_task' });

		expect(summary.totalEvents).toBe(4);
		expect(summary.successfulEvents).toBe(4);
		expect(summary.failedEvents).toBe(0);
		expect(summary.retention).toEqual(
			expect.objectContaining({
				retentionDays: 30,
				maxEvents: 5000,
				retainedEventCount: 4
			})
		);
		expect(summary.recentEvents).toHaveLength(4);
		expect(summary.toolCounts).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					toolName: 'ams_task_get',
					count: 2,
					successCount: 2,
					errorCount: 0
				}),
				expect.objectContaining({
					toolName: 'ams_task_request_approval',
					count: 1
				})
			])
		);
		expect(summary.playbookMatches).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					intent: 'prepare_task_for_approval',
					count: 1,
					threadIds: ['thread_task']
				})
			])
		);
		expect(summary.unusedPlaybooks).toContain('coordinate_with_another_thread');
		expect(summary.uncoveredToolCounts).toEqual([]);
		expect(summary.unobservedPlaybookTools).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					toolName: 'ams_thread_best_target',
					intents: ['coordinate_with_another_thread']
				})
			])
		);
		vi.useRealTimers();
	});

	it('reports observed tools that are not covered by any manifest playbook', async () => {
		await prepareTelemetryFileEnv();
		const { recordAgentToolUse, summarizeAgentToolUse } = await import('./agent-use-telemetry.js');

		await recordAgentToolUse({
			threadId: 'thread_gap',
			toolName: 'ams_goal_update',
			args: { goalId: 'goal_1' },
			outcome: 'success'
		});

		const summary = await summarizeAgentToolUse({ threadId: 'thread_gap' });

		expect(summary.uncoveredToolCounts).toEqual([
			expect.objectContaining({
				toolName: 'ams_goal_update',
				count: 1,
				successCount: 1,
				errorCount: 0,
				intents: []
			})
		]);
	});

	it('treats direct intent tools as covered playbook usage instead of a guidance gap', async () => {
		await prepareTelemetryFileEnv();
		const { recordAgentToolUse, summarizeAgentToolUse } = await import('./agent-use-telemetry.js');

		await recordAgentToolUse({
			threadId: 'thread_intent',
			toolName: 'ams_intent_prepare_task_for_approval',
			args: { taskId: 'task_123' },
			outcome: 'success'
		});

		const summary = await summarizeAgentToolUse({ threadId: 'thread_intent' });

		expect(summary.playbookMatches).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					intent: 'prepare_task_for_approval',
					count: 1
				})
			])
		);
		expect(summary.uncoveredToolCounts).toEqual([]);
	});

	it('treats direct thread-coordination intent tools as covered playbook usage', async () => {
		await prepareTelemetryFileEnv();
		const { recordAgentToolUse, summarizeAgentToolUse } = await import('./agent-use-telemetry.js');

		await recordAgentToolUse({
			threadId: 'thread_coordination',
			toolName: 'ams_intent_coordinate_with_another_thread',
			args: { targetThreadIdOrHandle: 'researcher' },
			outcome: 'success'
		});

		const summary = await summarizeAgentToolUse({ threadId: 'thread_coordination' });

		expect(summary.playbookMatches).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					intent: 'coordinate_with_another_thread',
					count: 1
				})
			])
		);
		expect(summary.uncoveredToolCounts).toEqual([]);
	});

	it('supports filtering by thread, task, run, tool, outcome, and recent time window', async () => {
		await prepareTelemetryFileEnv();
		const { recordAgentToolUse, summarizeAgentToolUse } = await import('./agent-use-telemetry.js');

		await recordAgentToolUse({
			threadId: 'thread_alpha',
			taskId: 'task_alpha',
			runId: 'run_alpha',
			toolName: 'ams_manifest',
			args: { resource: 'task' },
			outcome: 'success'
		});
		await recordAgentToolUse({
			threadId: 'thread_beta',
			taskId: 'task_beta',
			runId: 'run_beta',
			toolName: 'ams_thread_contact',
			args: { targetThreadIdOrHandle: 'thread_target' },
			outcome: 'error',
			errorMessage: 'Contact failed.'
		});

		const filtered = await summarizeAgentToolUse({
			threadId: 'thread_beta',
			taskId: 'task_beta',
			runId: 'run_beta',
			toolName: 'ams_thread_contact',
			outcome: 'error',
			since: '24h'
		});

		expect(filtered.totalEvents).toBe(1);
		expect(filtered.failedEvents).toBe(1);
		expect(filtered.recentEvents).toEqual([
			expect.objectContaining({
				threadId: 'thread_beta',
				taskId: 'task_beta',
				runId: 'run_beta',
				toolName: 'ams_thread_contact',
				outcome: 'error'
			})
		]);
		expect(filtered.taskCounts).toEqual([{ taskId: 'task_beta', count: 1 }]);
		expect(filtered.runCounts).toEqual([{ runId: 'run_beta', count: 1 }]);
	});

	it('prunes telemetry outside the configured retention window', async () => {
		await prepareTelemetryFileEnv();
		vi.stubEnv('AMS_AGENT_USE_TELEMETRY_RETENTION_DAYS', '7');
		const { recordAgentToolUse, summarizeAgentToolUse } = await import('./agent-use-telemetry.js');
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-04-21T12:00:00.000Z'));

		await recordAgentToolUse({
			threadId: 'thread_old',
			toolName: 'ams_manifest',
			args: {},
			outcome: 'success'
		});

		vi.setSystemTime(new Date('2026-04-30T12:00:00.000Z'));

		await recordAgentToolUse({
			threadId: 'thread_recent',
			toolName: 'ams_task_get',
			args: { taskId: 'task_recent' },
			outcome: 'success'
		});

		const summary = await summarizeAgentToolUse();

		expect(summary.totalEvents).toBe(1);
		expect(summary.retention).toEqual(
			expect.objectContaining({
				retentionDays: 7,
				maxEvents: 5000,
				retainedEventCount: 1,
				oldestRetainedAt: summary.recentEvents[0]?.recordedAt ?? null
			})
		);
		expect(summary.threadCounts).toEqual([{ threadId: 'thread_recent', count: 1 }]);
		vi.useRealTimers();
	});

	it('records telemetry automatically when invokeTool runs through the MCP bridge', async () => {
		await prepareTelemetryFileEnv();
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		vi.stubEnv('AMS_AGENT_THREAD_ID', 'thread_observed');
		vi.stubEnv('AMS_AGENT_TASK_ID', 'task_observed');
		vi.stubEnv('AMS_AGENT_RUN_ID', 'run_observed');
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({ ok: true })
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const { summarizeAgentToolUse } = await import('./agent-use-telemetry.js');

		await invokeTool('ams_manifest', { resource: 'task' });
		const summary = await summarizeAgentToolUse({ threadId: 'thread_observed' });

		expect(summary.totalEvents).toBe(1);
		expect(summary.recentEvents).toHaveLength(1);
		expect(summary.recentEvents[0]).toEqual(
			expect.objectContaining({
				threadId: 'thread_observed',
				taskId: 'task_observed',
				runId: 'run_observed'
			})
		);
		expect(summary.toolCounts).toEqual([
			expect.objectContaining({
				toolName: 'ams_manifest',
				count: 1,
				successCount: 1
			})
		]);
	});
});
