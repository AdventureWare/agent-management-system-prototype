import { describe, expect, it } from 'vitest';
import { getAgentCapabilityManifest } from './agent-capability-manifest';

describe('agent-capability-manifest', () => {
	it('returns the full discovery manifest with task coverage', () => {
		const manifest = getAgentCapabilityManifest();

		expect(manifest.discovery.apiPath).toBe('/api/agent-capabilities');
		expect(manifest.discovery.cliCommand).toBe('node scripts/ams-cli.mjs manifest');
		expect(manifest.commands).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					resource: 'task',
					command: 'create'
				}),
				expect.objectContaining({
					resource: 'task',
					command: 'launch-session'
				}),
				expect.objectContaining({
					resource: 'thread',
					command: 'passthrough'
				})
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
	});
});
