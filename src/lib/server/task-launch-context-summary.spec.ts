import { describe, expect, it } from 'vitest';
import { buildTaskLaunchContextSummary } from './task-launch-context-summary';

describe('buildTaskLaunchContextSummary', () => {
	it('summarizes the launch surface, prompt context, and requirements', () => {
		const summary = buildTaskLaunchContextSummary(
			{
				providers: [
					{
						id: 'provider_local_codex',
						name: 'Local Codex',
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
						capabilities: ['planning', 'citations'],
						defaultThreadSandbox: 'workspace-write',
						notes: ''
					}
				]
			},
			{
				task: {
					id: 'task_one',
					title: 'Task one',
					summary: 'Test task',
					successCriteria: 'Done means green checks.',
					readyCondition: '',
					expectedOutcome: 'A merged patch',
					projectId: 'project_app',
					area: 'product',
					goalId: '',
					delegationPacket: {
						objective: 'Implement the slice',
						inputContext: '',
						expectedDeliverable: '',
						doneCondition: '',
						integrationNotes: ''
					},
					priority: 'medium',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiredThreadSandbox: 'danger-full-access',
					requiresReview: true,
					desiredRoleId: '',
					assigneeWorkerId: 'worker_local',
					agentThreadId: null,
					requiredCapabilityNames: ['planning'],
					requiredToolNames: ['codex'],
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 0,
					latestRunId: null,
					artifactPath: '/tmp/output',
					attachments: [],
					createdAt: '2026-04-08T00:00:00.000Z',
					updatedAt: '2026-04-08T00:00:00.000Z'
				},
				project: {
					id: 'project_app',
					name: 'App',
					summary: '',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: 'main',
					additionalWritableRoots: ['/tmp/project/cache'],
					defaultThreadSandbox: 'workspace-write'
				},
				worker: {
					id: 'worker_local',
					name: 'Local worker',
					providerId: 'provider_local_codex',
					roleId: 'role_builder',
					location: 'local',
					status: 'idle',
					capacity: 1,
					registeredAt: '2026-04-08T00:00:00.000Z',
					lastSeenAt: '2026-04-08T00:00:00.000Z',
					note: '',
					tags: [],
					skills: ['svelte'],
					threadSandboxOverride: null,
					authTokenHash: 'hash'
				},
				publishedKnowledgeCount: 2
			}
		);

		expect(summary).toMatchObject({
			assignedWorker: {
				name: 'Local worker',
				status: 'idle',
				skillNames: ['svelte']
			},
			provider: {
				name: 'Local Codex',
				launcher: 'codex',
				capabilityNames: ['planning', 'citations']
			},
			sandbox: {
				effective: 'danger-full-access',
				taskRequirement: 'danger-full-access',
				projectDefault: 'workspace-write',
				providerDefault: 'workspace-write'
			},
			project: {
				rootFolder: '/tmp/project',
				defaultArtifactRoot: '/tmp/project/agent_output',
				additionalWritableRoots: ['/tmp/project/cache']
			},
			promptInputs: {
				includesSuccessCriteria: true,
				includesReadyCondition: false,
				includesExpectedOutcome: true,
				includesDelegationPacket: true,
				publishedKnowledgeCount: 2
			},
			requirements: {
				capabilityNames: ['planning'],
				toolNames: ['codex']
			}
		});
	});
});
