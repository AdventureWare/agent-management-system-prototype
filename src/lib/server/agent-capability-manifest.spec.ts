import { describe, expect, it } from 'vitest';
import { getAgentCapabilityManifest } from './agent-capability-manifest';

describe('agent-capability-manifest', () => {
	it('returns the full discovery manifest with task coverage', () => {
		const manifest = getAgentCapabilityManifest();

		expect(manifest.discovery.apiPath).toBe('/api/agent-capabilities');
		expect(manifest.discovery.currentContextApiPath).toBe('/api/agent-context/current');
		expect(manifest.discovery.cliCommand).toBe('node scripts/ams-cli.mjs manifest');
		expect(manifest.discovery.currentContextCliCommand).toBe(
			'node scripts/ams-cli.mjs context current'
		);
		expect(manifest.guidance.reliableLoop).toEqual(
			expect.arrayContaining([
				expect.stringContaining('manifest discovery'),
				expect.stringContaining('resolve current context'),
				expect.stringContaining('After every mutation')
			])
		);
		expect(manifest.guidance.playbooks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					intent: 'create_task'
				}),
				expect.objectContaining({
					intent: 'prepare_task_for_approval'
				}),
				expect.objectContaining({
					intent: 'accept_child_handoff'
				}),
				expect.objectContaining({
					intent: 'reject_task_approval'
				}),
				expect.objectContaining({
					intent: 'request_child_handoff_changes'
				}),
				expect.objectContaining({
					intent: 'coordinate_with_another_thread'
				})
			])
		);
		expect(manifest.commands).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					resource: 'context',
					command: 'current',
					path: '/api/agent-context/current',
					whenToUse: expect.any(Array),
					nextCommands: expect.arrayContaining(['task:get', 'thread:panel'])
				}),
				expect.objectContaining({
					resource: 'intent',
					command: 'prepare_task_for_approval',
					path: '/api/agent-intents/:intent',
					readAfter: expect.arrayContaining(['context:current'])
				}),
				expect.objectContaining({
					resource: 'task',
					command: 'create',
					readAfter: expect.arrayContaining(['task:get'])
				}),
				expect.objectContaining({
					resource: 'task',
					command: 'launch-session',
					path: '/api/tasks/:taskId/session-launch'
				}),
				expect.objectContaining({
					resource: 'thread',
					command: 'panel',
					path: '/api/agents/threads/:threadId/panel',
					whenToUse: expect.any(Array)
				})
			])
		);
		expect(manifest.environment).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: 'AMS_AGENT_THREAD_ID' }),
				expect.objectContaining({ name: 'AMS_AGENT_TASK_ID' }),
				expect.objectContaining({ name: 'AMS_AGENT_RUN_ID' })
			])
		);
	});

	it('filters commands by resource and command name', () => {
		const taskManifest = getAgentCapabilityManifest({ resource: 'task', command: 'decompose' });

		expect(taskManifest.commands).toEqual([
			expect.objectContaining({
				resource: 'task',
				command: 'decompose',
				path: '/api/tasks/:taskId/decompose'
			})
		]);
		expect(taskManifest.commands[0]).not.toHaveProperty('mcp');
	});
});
