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
				area: 'product',
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
				area: 'product',
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
		executionSurfaces: [
			{
				id: 'worker_1',
				name: 'Local builder',
				providerId: 'provider_local',
				supportedRoleIds: ['role_product'],
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
				supportedRoleIds: ['role_coordinator'],
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
				area: 'product',
				goalId: 'goal_1',
				priority: 'high',
				status: 'in_progress',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: true,
				desiredRoleId: 'role_product',
				assigneeExecutionSurfaceId: 'worker_1',
				agentThreadId: null,
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
				area: 'product',
				goalId: 'goal_1',
				priority: 'medium',
				status: 'ready',
				riskLevel: 'low',
				approvalMode: 'none',
				requiresReview: false,
				desiredRoleId: 'role_coordinator',
				assigneeExecutionSurfaceId: null,
				agentThreadId: null,
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
	it('builds planning metrics, goal summaries, and execution-surface loads', () => {
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
				eligibleExecutionSurfaceCount: 1,
				suggestedExecutionSurfaceNames: ['Local builder'],
				assignedExecutionSurfaceEligible: true
			})
		]);
		expect(snapshot.unscheduledTasks).toEqual([
			expect.objectContaining({
				id: 'task_2',
				requiredCapabilityNames: ['planning'],
				requiredToolNames: [],
				eligibleExecutionSurfaceCount: 1,
				suggestedExecutionSurfaceNames: ['Cloud coordinator'],
				assignedExecutionSurfaceEligible: null
			})
		]);
		expect(
			snapshot.executionSurfaceLoads.find((executionSurface) => executionSurface.id === 'worker_1')
		).toEqual(
			expect.objectContaining({
				plannedHours: 12,
				capacityHours: 18,
				remainingHours: 6
			})
		);
	});

	it('narrows planning scope by execution-surface filter', () => {
		const snapshot = buildPlanningPageData(buildFixture(), {
			startDate: '2026-04-01',
			endDate: '2026-04-15',
			executionSurfaceId: 'worker_1',
			includeUnscheduled: true
		});

		expect(snapshot.scheduledTasks.map((task) => task.id)).toEqual(['task_1']);
		expect(snapshot.unscheduledTasks).toEqual([]);
		expect(snapshot.goalsInScope.map((goal) => goal.id)).toEqual(['goal_1']);
	});

	it('treats a parent project filter as including linked subprojects', () => {
		const fixture = buildFixture();
		fixture.projects.push({
			id: 'project_2',
			name: 'Kwipoo website',
			summary: 'Website subproject',
			parentProjectId: 'project_1',
			projectRootFolder: '/tmp/ams-site',
			defaultArtifactRoot: '/tmp/ams-site/agent_output',
			defaultRepoPath: '',
			defaultRepoUrl: '',
			defaultBranch: 'main'
		});
		fixture.tasks.push({
			id: 'task_3',
			title: 'Refine website copy',
			summary: 'Ship the website content updates.',
			projectId: 'project_2',
			area: 'product',
			goalId: 'goal_1',
			priority: 'medium',
			status: 'ready',
			riskLevel: 'low',
			approvalMode: 'none',
			requiresReview: false,
			desiredRoleId: 'role_coordinator',
			assigneeExecutionSurfaceId: null,
			agentThreadId: null,
			blockedReason: '',
			dependencyTaskIds: [],
			estimateHours: 4,
			targetDate: '2026-04-12',
			requiredCapabilityNames: ['planning'],
			requiredToolNames: [],
			runCount: 0,
			latestRunId: null,
			artifactPath: '/tmp/ams-site/agent_output',
			attachments: [],
			createdAt: '2026-03-31T00:00:00.000Z',
			updatedAt: '2026-03-31T00:00:00.000Z'
		});

		const snapshot = buildPlanningPageData(fixture, {
			startDate: '2026-04-01',
			endDate: '2026-04-15',
			projectId: 'project_1',
			includeUnscheduled: true
		});

		expect(snapshot.scheduledTasks.map((task) => task.id)).toEqual(['task_1', 'task_3']);
		expect(snapshot.scheduledTasks.map((task) => task.projectName)).toEqual([
			'Agent Management System Prototype',
			'Kwipoo website'
		]);
	});

	it('builds an explicit now next later backlog with ranking reasons', () => {
		const fixture = buildFixture();
		fixture.tasks.push({
			id: 'task_3',
			title: 'Resolve approval routing gap',
			summary: 'Blocked on governance clarifications.',
			projectId: 'project_1',
			area: 'product',
			goalId: 'goal_2',
			priority: 'low',
			status: 'blocked',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiresReview: false,
			desiredRoleId: 'role_coordinator',
			assigneeExecutionSurfaceId: null,
			agentThreadId: null,
			blockedReason: 'Waiting for approval policy decision',
			dependencyTaskIds: ['task_1'],
			estimateHours: 3,
			targetDate: null,
			requiredCapabilityNames: ['planning'],
			requiredToolNames: [],
			runCount: 0,
			latestRunId: null,
			artifactPath: '/tmp/ams/agent_output',
			attachments: [],
			createdAt: '2026-03-31T00:00:00.000Z',
			updatedAt: '2026-03-31T00:00:00.000Z'
		});

		const snapshot = buildPlanningPageData(fixture, {
			startDate: '2026-04-01',
			endDate: '2026-04-15',
			projectId: 'project_1',
			includeUnscheduled: true
		});

		expect(snapshot.backlogBuckets.find((bucket) => bucket.id === 'now')?.items).toEqual([
			expect.objectContaining({
				id: 'task_1',
				bucket: 'now',
				priorityReasons: expect.arrayContaining([
					'Urgency: already in progress, so finishing it first avoids churn.'
				])
			})
		]);
		expect(snapshot.backlogBuckets.find((bucket) => bucket.id === 'next')?.items).toEqual([
			expect.objectContaining({
				id: 'task_2',
				bucket: 'next',
				priorityReasons: expect.arrayContaining([
					'Leverage: supports planning priority 3 goal Ship planning surface.',
					'Deferral: important, but it follows the current now commitments.'
				])
			})
		]);
		expect(snapshot.backlogBuckets.find((bucket) => bucket.id === 'later')?.items).toEqual([
			expect.objectContaining({
				id: 'task_3',
				bucket: 'later',
				priorityReasons: expect.arrayContaining([
					'Deferral: Waiting for approval policy decision.',
					'Dependency order: waits on Build planning route.'
				])
			})
		]);
	});
});
