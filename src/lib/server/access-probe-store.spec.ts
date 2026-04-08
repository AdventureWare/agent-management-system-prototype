import { describe, expect, it } from 'vitest';
import { applyAccessProbeSnapshot, buildAccessProbeRecords } from '$lib/server/access-probe-store';

describe('access probe store', () => {
	it('builds records across local paths, providers, and workers', () => {
		const records = buildAccessProbeRecords(
			{
				summary: {
					projectBlockerCount: 1,
					attentionPathCount: 1,
					macosPromptCount: 0,
					providerNeedsSetupCount: 1,
					workerAccessIssueCount: 1
				},
				executionCatalog: {
					projectSkills: [],
					capabilities: [],
					tools: []
				},
				projects: [
					{
						id: 'project_1',
						name: 'Vault Ops',
						summary: 'Project summary',
						projectRootFolder: '/tmp/project',
						defaultArtifactRoot: '',
						defaultRepoPath: '',
						defaultRepoUrl: '',
						defaultBranch: '',
						additionalWritableRoots: [],
						projectHref: '/app/projects/project_1',
						permissionSurface: {
							checkedAt: '2026-04-06T12:00:00.000Z',
							effectiveSandbox: 'workspace-write',
							sandboxSource: 'Project default',
							summary: {
								trackedPathCount: 3,
								blockerCount: 1,
								macosPromptCount: 0,
								outsideSandboxCount: 0
							},
							localPaths: [
								{
									id: 'project-root-folder',
									label: 'Project root folder',
									path: '/tmp/project',
									kind: 'project_root_folder',
									importance: 'Required for every thread start.',
									requiredForLaunch: true,
									accessStatus: 'needs_host_access',
									accessMessage: 'Operation not permitted (EPERM).',
									accessGuidance: 'Grant host access.',
									coverageStatus: 'project_root',
									coverageLabel: 'Inside project root',
									coverageMessage:
										'Covered because the path lives under the thread workspace root.',
									recommendedAction: 'Grant host access.'
								}
							]
						}
					}
				],
				attentionPaths: [],
				providers: [
					{
						id: 'provider_1',
						name: 'Codex',
						service: 'OpenAI',
						kind: 'local',
						description: '',
						enabled: true,
						setupStatus: 'needs_setup',
						authMode: 'local_cli',
						defaultModel: '',
						baseUrl: '',
						launcher: '',
						envVars: [],
						capabilities: [],
						defaultThreadSandbox: 'workspace-write',
						notes: '',
						workerCount: 1,
						providerHref: '/app/providers/provider_1'
					}
				],
				workers: [
					{
						id: 'worker_1',
						name: 'Local worker',
						providerId: 'provider_1',
						roleId: 'role_1',
						location: 'local',
						status: 'idle',
						capacity: 1,
						registeredAt: '2026-04-06T12:00:00.000Z',
						lastSeenAt: '2026-04-06T12:00:00.000Z',
						note: '',
						tags: [],
						threadSandboxOverride: null,
						authTokenHash: '',
						providerName: 'Codex',
						roleName: 'Engineer',
						workerHref: '/app/workers/worker_1',
						accessState: 'provider_needs_setup'
					}
				]
			},
			'2026-04-06T12:00:00.000Z'
		);

		expect(records).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					targetKey: 'local_path:project_1:project-root-folder',
					status: 'blocked'
				}),
				expect.objectContaining({
					targetKey: 'provider:provider_1',
					status: 'needs_setup'
				}),
				expect.objectContaining({
					targetKey: 'worker:worker_1',
					status: 'needs_setup'
				})
			])
		);
	});

	it('creates change events when a recorded status changes', () => {
		const next = applyAccessProbeSnapshot(
			{
				lastCheckedAt: '2026-04-06T11:00:00.000Z',
				records: [
					{
						targetKey: 'provider:provider_1',
						targetKind: 'provider',
						targetLabel: 'Codex',
						scopeLabel: 'OpenAI',
						scopeHref: '/app/providers/provider_1',
						status: 'healthy',
						summary: 'Setup status: connected.',
						checkedAt: '2026-04-06T11:00:00.000Z'
					}
				],
				events: []
			},
			[
				{
					targetKey: 'provider:provider_1',
					targetKind: 'provider',
					targetLabel: 'Codex',
					scopeLabel: 'OpenAI',
					scopeHref: '/app/providers/provider_1',
					status: 'needs_setup',
					summary: 'Setup status: needs_setup.',
					checkedAt: '2026-04-06T12:00:00.000Z'
				}
			],
			'2026-04-06T12:00:00.000Z'
		);

		expect(next.lastCheckedAt).toBe('2026-04-06T12:00:00.000Z');
		expect(next.events[0]).toMatchObject({
			targetKey: 'provider:provider_1',
			previousStatus: 'healthy',
			nextStatus: 'needs_setup'
		});
	});
});
