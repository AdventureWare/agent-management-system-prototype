import { describe, expect, it } from 'vitest';
import { buildOntologyV1Snapshot } from './ontology';
import type { AgentSessionDetail } from '$lib/types/agent-session';
import type { ControlPlaneData } from '$lib/types/control-plane';

function buildFixture(): {
	data: ControlPlaneData;
	sessions: AgentSessionDetail[];
} {
	return {
		data: {
			providers: [
				{
					id: 'provider_local_codex',
					name: 'Local Codex Worker',
					service: 'OpenAI',
					kind: 'local',
					description: 'Local execution surface',
					enabled: true,
					setupStatus: 'connected',
					authMode: 'local_cli',
					defaultModel: '',
					baseUrl: '',
					launcher: 'codex',
					envVars: [],
					capabilities: ['repo edits', 'terminal'],
					defaultThreadSandbox: 'workspace-write',
					notes: ''
				}
			],
			roles: [
				{
					id: 'role_app_worker',
					name: 'App Worker',
					lane: 'product',
					description: 'Implements product changes'
				}
			],
			projects: [
				{
					id: 'project_ams',
					name: 'Agent Management System Prototype',
					summary: 'This app',
					projectRootFolder: '/repo',
					defaultArtifactRoot: '/repo/agent_output',
					defaultRepoPath: '/repo',
					defaultRepoUrl: '',
					defaultBranch: 'main',
					defaultThreadSandbox: null
				}
			],
			goals: [
				{
					id: 'goal_1',
					name: 'Improve planning',
					lane: 'product',
					status: 'running',
					summary: 'Make planning less noisy',
					artifactPath: '/repo',
					successSignal: 'Planning is usable',
					parentGoalId: null,
					projectIds: ['project_ams'],
					taskIds: [],
					targetDate: '2026-04-15',
					planningPriority: 5,
					confidence: 'medium'
				}
			],
			workers: [
				{
					id: 'worker_local',
					name: 'Colin Mac Local',
					providerId: 'provider_local_codex',
					roleId: 'role_app_worker',
					location: 'local',
					status: 'idle',
					capacity: 2,
					registeredAt: '2026-04-01T00:00:00.000Z',
					lastSeenAt: '2026-04-01T01:00:00.000Z',
					note: '',
					tags: ['svelte'],
					skills: ['svelte', 'planning'],
					weeklyCapacityHours: null,
					focusFactor: 1,
					maxConcurrentRuns: null,
					threadSandboxOverride: null,
					authTokenHash: ''
				}
			],
			tasks: [
				{
					id: 'task_1',
					title: 'Rework planning model',
					summary: 'Replace horizon thinking with planning sessions.',
					projectId: 'project_ams',
					lane: 'product',
					goalId: 'goal_1',
					priority: 'high',
					status: 'in_progress',
					riskLevel: 'medium',
					approvalMode: 'before_apply',
					requiresReview: true,
					desiredRoleId: 'role_app_worker',
					assigneeWorkerId: 'worker_local',
					threadSessionId: 'session_1',
					blockedReason: '',
					dependencyTaskIds: [],
					parentTaskId: null,
					estimateHours: 6,
					targetDate: '2026-04-10',
					runCount: 1,
					latestRunId: 'run_1',
					artifactPath: '/repo/agent_output',
					attachments: [
						{
							id: 'attachment_1',
							name: 'brief.md',
							path: '/repo/brief.md',
							contentType: 'text/markdown',
							sizeBytes: 512,
							attachedAt: '2026-04-01T00:00:00.000Z'
						}
					],
					createdAt: '2026-04-01T00:00:00.000Z',
					updatedAt: '2026-04-01T00:00:00.000Z'
				}
			],
			runs: [
				{
					id: 'run_1',
					taskId: 'task_1',
					workerId: 'worker_local',
					providerId: 'provider_local_codex',
					status: 'running',
					createdAt: '2026-04-01T00:00:00.000Z',
					updatedAt: '2026-04-01T00:10:00.000Z',
					startedAt: '2026-04-01T00:01:00.000Z',
					endedAt: null,
					threadId: 'codex_thread_1',
					sessionId: 'session_1',
					promptDigest: 'digest',
					artifactPaths: ['/repo/agent_output/plan.md'],
					summary: 'Planning model updated',
					lastHeartbeatAt: '2026-04-01T00:09:00.000Z',
					errorSummary: ''
				}
			],
			reviews: [
				{
					id: 'review_1',
					taskId: 'task_1',
					runId: 'run_1',
					status: 'open',
					createdAt: '2026-04-01T00:00:00.000Z',
					updatedAt: '2026-04-01T00:00:00.000Z',
					resolvedAt: null,
					requestedByWorkerId: 'worker_local',
					reviewerWorkerId: 'worker_local',
					summary: 'Check ontology framing'
				}
			],
			approvals: [
				{
					id: 'approval_1',
					taskId: 'task_1',
					runId: 'run_1',
					mode: 'before_apply',
					status: 'pending',
					createdAt: '2026-04-01T00:00:00.000Z',
					updatedAt: '2026-04-01T00:00:00.000Z',
					resolvedAt: null,
					requestedByWorkerId: 'worker_local',
					approverWorkerId: null,
					summary: 'Approve schema update'
				}
			]
		},
		sessions: [
			{
				id: 'session_1',
				name: 'Planning thread',
				cwd: '/repo',
				sandbox: 'workspace-write',
				model: null,
				threadId: 'codex_thread_1',
				attachments: [
					{
						id: 'session_attachment_1',
						name: 'screenshot.png',
						path: '/repo/screenshot.png',
						contentType: 'image/png',
						sizeBytes: 1024,
						attachedAt: '2026-04-01T00:00:00.000Z'
					}
				],
				archivedAt: null,
				createdAt: '2026-04-01T00:00:00.000Z',
				updatedAt: '2026-04-01T00:10:00.000Z',
				origin: 'managed',
				topicLabels: [],
				sessionState: 'working',
				latestRunStatus: 'running',
				hasActiveRun: true,
				canResume: false,
				runCount: 1,
				lastActivityAt: '2026-04-01T00:10:00.000Z',
				lastActivityLabel: 'just now',
				sessionSummary: 'Reworking the planning model',
				lastExitCode: null,
				runTimeline: [],
				relatedTasks: [
					{
						id: 'task_1',
						title: 'Rework planning model',
						status: 'in_progress',
						isPrimary: true
					}
				],
				latestRun: null,
				runs: []
			}
		]
	};
}

describe('ontology v1 snapshot', () => {
	it('maps current control-plane data into the ontology model', () => {
		const snapshot = buildOntologyV1Snapshot(buildFixture());

		expect(snapshot.goals).toHaveLength(1);
		expect(snapshot.tasks).toHaveLength(1);
		expect(snapshot.workAttempts).toHaveLength(1);
		expect(snapshot.threads).toHaveLength(1);
		expect(snapshot.actors).toHaveLength(1);
		expect(snapshot.executionSurfaces).toHaveLength(1);
		expect(snapshot.capabilities.map((capability) => capability.name)).toEqual([
			'planning',
			'repo edits',
			'svelte',
			'terminal'
		]);
		expect(snapshot.tools.map((tool) => tool.name)).toEqual(['codex']);
		expect(snapshot.tasks[0]?.assignedActorId).toBe('actor_worker_local');
		expect(snapshot.tasks[0]?.primaryThreadId).toBe('session_1');
		expect(snapshot.tasks[0]?.contextResourceIds).toHaveLength(1);
		expect(snapshot.tasks[0]?.artifactIds).toHaveLength(1);
		expect(snapshot.workAttempts[0]?.threadId).toBe('session_1');
		expect(snapshot.threads[0]?.taskIds).toEqual(['task_1']);
		expect(snapshot.contextResources).toHaveLength(2);
		expect(snapshot.artifacts).toHaveLength(1);
	});

	it('surfaces migration gaps from the current schema', () => {
		const snapshot = buildOntologyV1Snapshot(buildFixture());

		expect(snapshot.gaps.planningSessionCount).toBe(0);
		expect(snapshot.gaps.decisionCount).toBe(0);
		expect(snapshot.gaps.humanActorCount).toBe(0);
		expect(snapshot.gaps.tasksWithoutCapabilityRequirementsCount).toBe(1);
		expect(snapshot.limitations).toContain(
			'Planning sessions are not yet captured as first-class records in the current schema.'
		);
	});
});
