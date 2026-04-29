import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
			executionSurfaces: [
				{
					id: 'worker_one',
					name: 'ExecutionSurface One',
					providerId: 'provider_local',
					supportedRoleIds: [],
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
					name: 'ExecutionSurface Two',
					providerId: 'provider_cloud',
					supportedRoleIds: [],
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
			],
			tasks: [
				{
					id: 'task_prompt_gap',
					title: 'Task with prompt gap',
					summary: 'Needs explicit prompt skills',
					projectId: 'project_app',
					area: 'product',
					goalId: '',
					priority: 'medium',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: '',
					assigneeExecutionSurfaceId: null,
					agentThreadId: null,
					requiredPromptSkillNames: ['frontend-sveltekit', 'docs-writer'],
					requiredCapabilityNames: [],
					requiredToolNames: [],
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 0,
					latestRunId: null,
					artifactPath: '/tmp/project-app/agent_output',
					attachments: [],
					createdAt: '2026-04-08T00:00:00.000Z',
					updatedAt: '2026-04-08T00:00:00.000Z'
				}
			]
		});

		expect(catalog.projectSkills).toHaveLength(1);
		expect(catalog.projectSkills[0]).toMatchObject({
			requestedSkillCount: 2,
			requestingTaskCount: 1,
			missingRequestedSkillCount: 2,
			tasksMissingRequestedSkillCount: 1,
			missingRequestedSkills: [
				{ id: 'docs-writer', requestingTaskCount: 1 },
				{ id: 'frontend-sveltekit', requestingTaskCount: 1 }
			]
		});
		expect(catalog.capabilities).toEqual([
			{
				name: 'citations',
				executionSurfaceSkillCount: 0,
				supportedExecutionSurfaceCount: 1,
				onlineSupportedExecutionSurfaceCount: 0,
				providerCapabilityCount: 1,
				connectedProviderCount: 0
			},
			{
				name: 'planning',
				executionSurfaceSkillCount: 1,
				supportedExecutionSurfaceCount: 1,
				onlineSupportedExecutionSurfaceCount: 1,
				providerCapabilityCount: 1,
				connectedProviderCount: 1
			},
			{
				name: 'research',
				executionSurfaceSkillCount: 1,
				supportedExecutionSurfaceCount: 1,
				onlineSupportedExecutionSurfaceCount: 0,
				providerCapabilityCount: 0,
				connectedProviderCount: 0
			},
			{
				name: 'svelte',
				executionSurfaceSkillCount: 1,
				supportedExecutionSurfaceCount: 1,
				onlineSupportedExecutionSurfaceCount: 1,
				providerCapabilityCount: 0,
				connectedProviderCount: 0
			}
		]);
		expect(catalog.tools).toEqual([
			{
				name: 'codex',
				providerCount: 2,
				connectedProviderCount: 1,
				executionSurfaceCount: 2,
				onlineExecutionSurfaceCount: 1
			}
		]);
	});

	it('carries explicit project skill availability policies into the skill catalog', () => {
		const projectRoot = mkdtempSync(join(tmpdir(), 'ams-skill-catalog-'));
		const skillDir = join(projectRoot, '.agents', 'skills', 'docs-writer');
		mkdirSync(skillDir, { recursive: true });
		writeFileSync(
			join(skillDir, 'SKILL.md'),
			[
				'---',
				'name: docs-writer',
				'description: Write project docs',
				'---',
				'',
				'## When to use',
				'',
				'- Use this skill for docs.',
				'',
				'## Workflow',
				'',
				'1. Read source material.'
			].join('\n')
		);

		const catalog = buildExecutionCapabilityCatalog({
			projects: [
				{
					id: 'project_app',
					name: 'App',
					summary: '',
					projectRootFolder: projectRoot,
					defaultArtifactRoot: '',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: 'main',
					skillAvailabilityPolicies: [
						{
							skillId: 'docs-writer',
							availability: 'disabled',
							notes: 'Use only after docs cleanup.',
							updatedAt: '2026-04-29T00:00:00.000Z'
						}
					]
				}
			],
			providers: [],
			executionSurfaces: [],
			tasks: []
		});

		const projectSkill = catalog.projectSkills[0]?.installedSkills.find(
			(skill) => skill.id === 'docs-writer'
		);
		const catalogSkillProject = catalog.skills
			.find((skill) => skill.id === 'docs-writer')
			?.projects.find((project) => project.projectId === 'project_app');

		expect(projectSkill).toMatchObject({
			id: 'docs-writer',
			availability: 'disabled',
			availabilityLabel: 'Disabled for project',
			availabilityNotes: 'Use only after docs cleanup.'
		});
		expect(catalogSkillProject).toMatchObject({
			projectId: 'project_app',
			availability: 'disabled',
			availabilityLabel: 'Disabled for project',
			availabilityNotes: 'Use only after docs cleanup.'
		});
	});
});
