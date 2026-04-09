import { describe, expect, it } from 'vitest';
import { buildExecutionRequirementInventory } from './execution-requirement-inventory';

describe('buildExecutionRequirementInventory', () => {
	it('aggregates execution-surface skills, provider capabilities, and provider launchers', () => {
		const inventory = buildExecutionRequirementInventory({
			providers: [
				{
					id: 'provider_cloud',
					name: 'Cloud',
					service: 'OpenAI',
					kind: 'cloud',
					description: '',
					enabled: true,
					setupStatus: 'connected',
					authMode: 'custom',
					defaultModel: '',
					baseUrl: '',
					launcher: 'codex',
					envVars: [],
					capabilities: ['Citations', 'Planning'],
					defaultThreadSandbox: 'workspace-write',
					notes: ''
				},
				{
					id: 'provider_local',
					name: 'Local',
					service: 'OpenAI',
					kind: 'local',
					description: '',
					enabled: true,
					setupStatus: 'connected',
					authMode: 'custom',
					defaultModel: '',
					baseUrl: '',
					launcher: 'codex',
					envVars: [],
					capabilities: ['planning'],
					defaultThreadSandbox: 'workspace-write',
					notes: ''
				}
			],
			executionSurfaces: [
				{
					id: 'worker_one',
					name: 'ExecutionSurface One',
					providerId: 'provider_cloud',
					supportedRoleIds: [],
					location: 'cloud',
					status: 'idle',
					capacity: 1,
					registeredAt: '2026-04-08T00:00:00.000Z',
					lastSeenAt: '2026-04-08T00:00:00.000Z',
					note: '',
					tags: [],
					skills: ['research', 'planning'],
					threadSandboxOverride: null,
					authTokenHash: 'hash'
				},
				{
					id: 'worker_two',
					name: 'ExecutionSurface Two',
					providerId: 'provider_local',
					supportedRoleIds: [],
					location: 'local',
					status: 'idle',
					capacity: 1,
					registeredAt: '2026-04-08T00:00:00.000Z',
					lastSeenAt: '2026-04-08T00:00:00.000Z',
					note: '',
					tags: [],
					skills: ['Research'],
					threadSandboxOverride: null,
					authTokenHash: 'hash'
				}
			]
		});

		expect(inventory.capabilities).toEqual([
			{ name: 'Citations', executionSurfaceCount: 0, providerCount: 1 },
			{ name: 'Planning', executionSurfaceCount: 1, providerCount: 2 },
			{ name: 'research', executionSurfaceCount: 2, providerCount: 0 }
		]);
		expect(inventory.tools).toEqual([
			{ name: 'codex', executionSurfaceCount: 0, providerCount: 2 }
		]);
		expect(inventory.capabilityNames).toEqual(['Citations', 'Planning', 'research']);
		expect(inventory.toolNames).toEqual(['codex']);
	});
});
