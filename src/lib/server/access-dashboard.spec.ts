import { describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';

const buildProjectPermissionSurfaceMock = vi.hoisted(() =>
	vi.fn((project: { id: string; name: string }) => ({
		checkedAt: '2026-04-06T12:00:00.000Z',
		effectiveSandbox: 'workspace-write',
		sandboxSource: 'Project default',
		summary:
			project.id === 'project_1'
				? {
						trackedPathCount: 4,
						blockerCount: 1,
						macosPromptCount: 1,
						outsideSandboxCount: 1
					}
				: {
						trackedPathCount: 3,
						blockerCount: 0,
						macosPromptCount: 0,
						outsideSandboxCount: 0
					},
		localPaths:
			project.id === 'project_1'
				? [
						{
							id: 'project-root-folder',
							label: 'Project root folder',
							path: '/restricted/project',
							requiredForLaunch: true,
							accessStatus: 'needs_host_access',
							accessMessage: 'Operation not permitted (EPERM).',
							coverageStatus: 'project_root',
							coverageMessage: 'Covered because the path lives under the thread workspace root.',
							recommendedAction: 'Grant access.'
						},
						{
							id: 'artifact-root',
							label: 'Default artifact root',
							path: '/Users/test/Library/Mobile Documents/com~apple~CloudDocs/Shared',
							requiredForLaunch: false,
							accessStatus: 'macos_cloud_probe_blocked',
							accessMessage: 'macOS blocked the direct access probe for this cloud-synced folder.',
							coverageStatus: 'outside_sandbox',
							coverageMessage: 'Not automatically writable from a standard thread launch.',
							recommendedAction: 'Retry the task first.'
						}
					]
				: [
						{
							id: 'project-root-folder',
							label: 'Project root folder',
							path: '/tmp/project',
							requiredForLaunch: true,
							accessStatus: 'ready',
							accessMessage: 'Accessible to the current app process.',
							coverageStatus: 'project_root',
							coverageMessage: 'Covered because the path lives under the thread workspace root.',
							recommendedAction: null
						}
					]
	}))
);

vi.mock('$lib/server/project-access', () => ({
	buildProjectPermissionSurface: buildProjectPermissionSurfaceMock
}));

import { buildAccessDashboardData } from './access-dashboard';

describe('buildAccessDashboardData', () => {
	it('rolls up project, provider, and execution-surface access signals', () => {
		const result = buildAccessDashboardData({
			providers: [
				{
					id: 'provider_1',
					name: 'Codex',
					service: 'OpenAI',
					kind: 'local',
					description: 'Local Codex CLI',
					enabled: true,
					setupStatus: 'connected',
					authMode: 'local_cli',
					defaultModel: 'gpt-5',
					baseUrl: '',
					launcher: 'codex',
					envVars: [],
					capabilities: ['threads'],
					defaultThreadSandbox: 'workspace-write',
					notes: ''
				},
				{
					id: 'provider_2',
					name: 'GitHub',
					service: 'GitHub',
					kind: 'api',
					description: 'GitHub connector',
					enabled: false,
					setupStatus: 'planned',
					authMode: 'oauth',
					defaultModel: '',
					baseUrl: '',
					launcher: '',
					envVars: [],
					capabilities: ['prs'],
					defaultThreadSandbox: 'workspace-write',
					notes: ''
				}
			],
			roles: [
				{
					id: 'role_1',
					name: 'Engineer',
					area: 'product',
					description: ''
				}
			],
			projects: [
				{
					id: 'project_1',
					name: 'Vault Ops',
					summary: 'Sync-heavy workspace',
					projectRootFolder: '/restricted/project',
					defaultArtifactRoot: '',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: '',
					additionalWritableRoots: []
				},
				{
					id: 'project_2',
					name: 'Local Repo',
					summary: 'Healthy local project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: '',
					additionalWritableRoots: []
				}
			],
			goals: [],
			executionSurfaces: [
				{
					id: 'worker_1',
					name: 'Local runner',
					providerId: 'provider_1',
					supportedRoleIds: [],
					location: 'local',
					status: 'idle',
					capacity: 1,
					registeredAt: '2026-04-06T12:00:00.000Z',
					lastSeenAt: '2026-04-06T12:00:00.000Z',
					note: '',
					tags: [],
					threadSandboxOverride: null,
					authTokenHash: ''
				},
				{
					id: 'worker_2',
					name: 'Disabled provider execution surface',
					providerId: 'provider_2',
					supportedRoleIds: [],
					location: 'cloud',
					status: 'offline',
					capacity: 1,
					registeredAt: '2026-04-06T12:00:00.000Z',
					lastSeenAt: '2026-04-06T12:00:00.000Z',
					note: '',
					tags: [],
					threadSandboxOverride: null,
					authTokenHash: ''
				}
			],
			tasks: [
				{
					id: 'task_1',
					title: 'Need prompt skill',
					summary: 'Task summary',
					projectId: 'project_1',
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
					requiredPromptSkillNames: ['frontend-sveltekit'],
					requiredCapabilityNames: [],
					requiredToolNames: [],
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 0,
					latestRunId: null,
					artifactPath: '/restricted/project/agent_output',
					attachments: [],
					createdAt: '2026-04-06T12:00:00.000Z',
					updatedAt: '2026-04-06T12:00:00.000Z'
				}
			],
			runs: [],
			reviews: [],
			approvals: []
		} satisfies ControlPlaneData);

		expect(result.summary).toMatchObject({
			projectBlockerCount: 1,
			attentionPathCount: 2,
			macosPromptCount: 1,
			projectsMissingRequestedPromptSkillsCount: 1,
			providerNeedsSetupCount: 1,
			executionSurfaceAccessIssueCount: 1
		});
		expect(result.attentionPaths[0]).toMatchObject({
			projectName: 'Vault Ops',
			severity: 'high',
			requiredForLaunch: true
		});
		expect(result.providers).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: 'GitHub',
					executionSurfaceCount: 1
				})
			])
		);
		expect(result.executionSurfaces).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: 'Disabled provider execution surface',
					accessState: 'provider_disabled'
				})
			])
		);
	});
});
