import { describe, expect, it } from 'vitest';
import { buildExecutionCapabilityCatalog } from './execution-capability-catalog';

describe('buildExecutionCapabilityCatalog', () => {
	it('reports project skills, capabilities, and launchers with readiness counts', () => {
		const catalog = buildExecutionCapabilityCatalog({
			projects: [
				{
					id: 'project_app',
					name: 'App',
					summary: '',
					projectRootFolder: '/tmp/project-app',
					defaultArtifactRoot: '',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: 'main'
				}
			],
			providers: [
				{
					id: 'provider_local',
					name: 'Local',
					service: 'OpenAI',
					kind: 'local',
					description: '',
					enabled: true,
					setupStatus: 'connected',
					authMode: 'local_cli',
					defaultModel: '',
					baseUrl: '',
					launcher: 'codex',
					envVars: [],
					capabilities: ['planning'],
					defaultThreadSandbox: 'workspace-write',
					notes: ''
				},
				{
					id: 'provider_cloud',
					name: 'Cloud',
					service: 'OpenAI',
					kind: 'cloud',
					description: '',
					enabled: false,
					setupStatus: 'needs_setup',
					authMode: 'custom',
					defaultModel: '',
					baseUrl: '',
					launcher: 'codex',
					envVars: [],
					capabilities: ['citations'],
					defaultThreadSandbox: 'workspace-write',
					notes: ''
				}
			],
			workers: [
				{
					id: 'worker_one',
					name: 'Worker One',
					providerId: 'provider_local',
					roleId: 'role_builder',
					location: 'local',
					status: 'idle',
					capacity: 1,
					registeredAt: '2026-04-08T00:00:00.000Z',
					lastSeenAt: '2026-04-08T00:00:00.000Z',
					note: '',
					tags: [],
					skills: ['planning', 'svelte'],
					threadSandboxOverride: null,
					authTokenHash: 'hash'
				},
				{
					id: 'worker_two',
					name: 'Worker Two',
					providerId: 'provider_cloud',
					roleId: 'role_researcher',
					location: 'cloud',
					status: 'offline',
					capacity: 1,
					registeredAt: '2026-04-08T00:00:00.000Z',
					lastSeenAt: '2026-04-08T00:00:00.000Z',
					note: '',
					tags: [],
					skills: ['research'],
					threadSandboxOverride: null,
					authTokenHash: 'hash'
				}
			]
		});

		expect(catalog.projectSkills).toHaveLength(1);
		expect(catalog.capabilities).toEqual([
			{
				name: 'citations',
				workerSkillCount: 0,
				supportedWorkerCount: 1,
				onlineSupportedWorkerCount: 0,
				providerCapabilityCount: 1,
				connectedProviderCount: 0
			},
			{
				name: 'planning',
				workerSkillCount: 1,
				supportedWorkerCount: 1,
				onlineSupportedWorkerCount: 1,
				providerCapabilityCount: 1,
				connectedProviderCount: 1
			},
			{
				name: 'research',
				workerSkillCount: 1,
				supportedWorkerCount: 1,
				onlineSupportedWorkerCount: 0,
				providerCapabilityCount: 0,
				connectedProviderCount: 0
			},
			{
				name: 'svelte',
				workerSkillCount: 1,
				supportedWorkerCount: 1,
				onlineSupportedWorkerCount: 1,
				providerCapabilityCount: 0,
				connectedProviderCount: 0
			}
		]);
		expect(catalog.tools).toEqual([
			{
				name: 'codex',
				providerCount: 2,
				connectedProviderCount: 1,
				workerCount: 2,
				onlineWorkerCount: 1
			}
		]);
	});
});
