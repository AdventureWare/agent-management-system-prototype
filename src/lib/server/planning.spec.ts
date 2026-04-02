import { describe, expect, it } from 'vitest';
import { buildPlanningPageData } from './planning';
import type { ControlPlaneData } from '$lib/types/control-plane';

function buildFixture(): ControlPlaneData {
	return {
		providers: [
			{
				id: 'provider_local',
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
				capabilities: [],
				defaultThreadSandbox: 'workspace-write',
				notes: ''
			},
			{
				id: 'provider_cloud',
				name: 'Cloud Codex',
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
				capabilities: ['planning'],
				defaultThreadSandbox: 'workspace-write',
				notes: ''
			}
		],
		roles: [],
		projects: [
			{
				id: 'project_1',
				name: 'Agent Management System Prototype',
				summary: 'Main app project',
				projectRootFolder: '/tmp/ams',
				defaultArtifactRoot: '/tmp/ams/agent_output',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: 'main'
			}
		],
		goals: [
			{
				id: 'goal_1',
				name: 'Ship planning surface',
				lane: 'product',
				status: 'running',
				summary: 'Create the first planning route.',
				artifactPath: '/tmp/ams/agent_output',
				projectIds: ['project_1'],
				taskIds: [],
				targetDate: '2026-04-15',
				planningPriority: 3,
				confidence: 'medium'
			},
			{
				id: 'goal_2',
				name: 'Improve task routing',
				lane: 'product',
				status: 'ready',
				summary: 'Keep queue movement healthy.',
				artifactPath: '/tmp/ams/agent_output',
				projectIds: ['project_1'],
				taskIds: [],
				targetDate: null,
				planningPriority: 0,
				confidence: 'high'
			}
		],
		workers: [
			{
				id: 'worker_1',
				name: 'Local builder',
				providerId: 'provider_local',
				roleId: 'role_product',
				location: 'local',
				status: 'busy',
				capacity: 2,
				registeredAt: '2026-03-31T00:00:00.000Z',
				lastSeenAt: '2026-03-31T00:00:00.000Z',
				note: '',
				tags: [],
				skills: ['svelte'],
				weeklyCapacityHours: 18,
				focusFactor: 1,
				maxConcurrentRuns: 2,
				threadSandboxOverride: null,
				authTokenHash: ''
			},
			{
				id: 'worker_2',
				name: 'Cloud coordinator',
				providerId: 'provider_cloud',
				roleId: 'role_coordinator',
				location: 'cloud',
				status: 'idle',
				capacity: 1,
				registeredAt: '2026-03-31T00:00:00.000Z',
				lastSeenAt: '2026-03-31T00:00:00.000Z',
				note: '',
				tags: [],
				skills: ['planning'],
				weeklyCapacityHours: 10,
				focusFactor: 0.8,
				maxConcurrentRuns: 1,
				threadSandboxOverride: null,
				authTokenHash: ''
			}
		],
		tasks: [
			{
				id: 'task_1',
				title: 'Build planning route',
				summary: 'Add route and loader.',
				projectId: 'project_1',
				lane: 'product',
				goalId: 'goal_1',
				priority: 'high',
				status: 'in_progress',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: true,
				desiredRoleId: 'role_product',
				assigneeWorkerId: 'worker_1',
				threadSessionId: null,
				blockedReason: '',
				dependencyTaskIds: [],
				estimateHours: 12,
				targetDate: '2026-04-10',
				requiredCapabilityNames: ['svelte'],
				requiredToolNames: ['codex'],
				runCount: 0,
				latestRunId: null,
				artifactPath: '/tmp/ams/agent_output',
				attachments: [],
				createdAt: '2026-03-31T00:00:00.000Z',
				updatedAt: '2026-03-31T00:00:00.000Z'
			},
			{
				id: 'task_2',
				title: 'Document planning interactions',
				summary: 'Capture scope and UX.',
				projectId: 'project_1',
				lane: 'product',
				goalId: 'goal_1',
				priority: 'medium',
				status: 'ready',
				riskLevel: 'low',
				approvalMode: 'none',
				requiresReview: false,
				desiredRoleId: 'role_coordinator',
				assigneeWorkerId: null,
				threadSessionId: null,
				blockedReason: '',
				dependencyTaskIds: [],
				estimateHours: null,
				targetDate: null,
				requiredCapabilityNames: ['planning'],
				requiredToolNames: [],
				runCount: 0,
				latestRunId: null,
				artifactPath: '/tmp/ams/agent_output',
				attachments: [],
				createdAt: '2026-03-31T00:00:00.000Z',
				updatedAt: '2026-03-31T00:00:00.000Z'
			}
		],
		runs: [],
		reviews: [],
		approvals: []
	};
}

describe('planning helpers', () => {
	it('builds planning metrics, goal summaries, and worker loads', () => {
		const snapshot = buildPlanningPageData(buildFixture(), {
			startDate: '2026-04-01',
			endDate: '2026-04-15',
			includeUnscheduled: true
		});

		expect(snapshot.metrics.goalCount).toBe(1);
		expect(snapshot.metrics.taskCount).toBe(2);
		expect(snapshot.metrics.scheduledTaskCount).toBe(1);
		expect(snapshot.metrics.plannedHours).toBe(12);
		expect(snapshot.metrics.totalCapacityHours).toBe(26);
		expect(snapshot.metrics.unestimatedTaskCount).toBe(1);
		expect(snapshot.metrics.unscheduledTaskCount).toBe(1);
		expect(snapshot.goalsInScope[0]).toEqual(
			expect.objectContaining({
				id: 'goal_1',
				taskCount: 2,
				scheduledTaskCount: 1,
				unscheduledTaskCount: 1,
				plannedHours: 12
			})
		);
		expect(snapshot.scheduledTasks).toEqual([
			expect.objectContaining({
				id: 'task_1',
				requiredCapabilityNames: ['svelte'],
				requiredToolNames: ['codex'],
				eligibleWorkerCount: 1,
				suggestedWorkerNames: ['Local builder'],
				assignedWorkerEligible: true
			})
		]);
		expect(snapshot.unscheduledTasks).toEqual([
			expect.objectContaining({
				id: 'task_2',
				requiredCapabilityNames: ['planning'],
				requiredToolNames: [],
				eligibleWorkerCount: 1,
				suggestedWorkerNames: ['Cloud coordinator'],
				assignedWorkerEligible: null
			})
		]);
		expect(snapshot.workerLoads.find((worker) => worker.id === 'worker_1')).toEqual(
			expect.objectContaining({
				plannedHours: 12,
				capacityHours: 18,
				remainingHours: 6
			})
		);
	});

	it('narrows planning scope by worker filter', () => {
		const snapshot = buildPlanningPageData(buildFixture(), {
			startDate: '2026-04-01',
			endDate: '2026-04-15',
			workerId: 'worker_1',
			includeUnscheduled: true
		});

		expect(snapshot.scheduledTasks.map((task) => task.id)).toEqual(['task_1']);
		expect(snapshot.unscheduledTasks).toEqual([]);
		expect(snapshot.goalsInScope.map((goal) => goal.id)).toEqual(['goal_1']);
	});
});
