import { describe, expect, it } from 'vitest';
import type {
	ControlPlaneData,
	Project,
	Provider,
	Task,
	ExecutionSurface
} from '$lib/types/control-plane';
import { buildTaskDetailCollections } from './task-detail-load-data';

const project: Project = {
	id: 'project_1',
	name: 'Agent Management System Prototype',
	summary: 'project',
	projectRootFolder: '/tmp/project',
	defaultArtifactRoot: '/tmp/project/agent_output',
	defaultRepoPath: '',
	defaultRepoUrl: '',
	defaultBranch: ''
};

const provider: Provider = {
	id: 'provider_local',
	name: 'Local Codex ExecutionSurface',
	service: 'OpenAI',
	kind: 'local',
	description: 'local',
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
};

const worker: ExecutionSurface = {
	id: 'worker_1',
	name: 'Planner',
	providerId: 'provider_local',
	supportedRoleIds: [],
	location: 'local',
	status: 'idle',
	capacity: 1,
	registeredAt: '2026-04-01T08:00:00.000Z',
	lastSeenAt: '2026-04-01T08:00:00.000Z',
	note: '',
	tags: [],
	threadSandboxOverride: null,
	authTokenHash: ''
};

const parentTask: Task = {
	id: 'task_parent',
	title: 'Parent task',
	summary: 'Coordinate work',
	projectId: 'project_1',
	area: 'product',
	goalId: '',
	parentTaskId: null,
	delegationPacket: null,
	priority: 'medium',
	status: 'in_progress',
	riskLevel: 'medium',
	approvalMode: 'none',
	requiredThreadSandbox: null,
	requiresReview: true,
	desiredRoleId: '',
	assigneeExecutionSurfaceId: null,
	agentThreadId: null,
	blockedReason: '',
	dependencyTaskIds: ['task_dependency'],
	targetDate: null,
	requiredCapabilityNames: [],
	requiredToolNames: [],
	runCount: 1,
	latestRunId: 'run_1',
	artifactPath: '/tmp/project/agent_output',
	attachments: [],
	createdAt: '2026-04-01T10:00:00.000Z',
	updatedAt: '2026-04-01T10:00:00.000Z'
};

function createData(): ControlPlaneData {
	return {
		providers: [provider],
		roles: [],
		projects: [project],
		goals: [],
		executionSurfaces: [worker],
		tasks: [
			parentTask,
			{
				...parentTask,
				id: 'task_dependency',
				title: 'Dependency task',
				status: 'ready',
				parentTaskId: null,
				dependencyTaskIds: [],
				runCount: 0,
				latestRunId: null,
				createdAt: '2026-04-01T09:00:00.000Z',
				updatedAt: '2026-04-01T09:00:00.000Z'
			},
			{
				...parentTask,
				id: 'task_child_done',
				title: 'Accepted child',
				status: 'done',
				parentTaskId: 'task_parent',
				dependencyTaskIds: [],
				delegationAcceptance: {
					summary: 'Accepted',
					acceptedAt: '2026-04-02T10:00:00.000Z'
				},
				runCount: 0,
				latestRunId: null
			},
			{
				...parentTask,
				id: 'task_child_pending',
				title: 'Pending handoff',
				status: 'done',
				parentTaskId: 'task_parent',
				dependencyTaskIds: [],
				delegationAcceptance: null,
				runCount: 0,
				latestRunId: null
			}
		],
		runs: [
			{
				id: 'run_1',
				taskId: 'task_parent',
				executionSurfaceId: 'worker_1',
				providerId: 'provider_local',
				status: 'running',
				createdAt: '2026-04-02T09:00:00.000Z',
				updatedAt: '2026-04-02T10:00:00.000Z',
				startedAt: '2026-04-02T09:00:00.000Z',
				endedAt: null,
				threadId: null,
				agentThreadId: null,
				promptDigest: 'digest',
				artifactPaths: [],
				summary: 'Running',
				lastHeartbeatAt: '2026-04-02T10:00:00.000Z',
				errorSummary: ''
			}
		],
		decisions: [],
		reviews: [],
		approvals: []
	};
}

describe('task-detail-load-data', () => {
	it('builds derived task detail collections and child rollups', () => {
		const result = buildTaskDetailCollections({
			data: createData(),
			task: parentTask,
			projectMap: new Map([[project.id, project]]),
			executionSurfaceMap: new Map([[worker.id, worker]]),
			providerMap: new Map([[provider.id, provider]]),
			formatRelativeTime: (value) => `relative:${value}`
		});

		expect(result.relatedRuns[0]).toMatchObject({
			id: 'run_1',
			executionSurfaceName: 'Planner',
			providerName: 'Local Codex ExecutionSurface'
		});
		expect(result.dependencyTasks).toEqual([
			{
				id: 'task_dependency',
				title: 'Dependency task',
				status: 'ready',
				projectId: 'project_1',
				projectName: 'Agent Management System Prototype'
			}
		]);
		expect(result.childTasks.map((childTask) => childTask.integrationStatus)).toEqual([
			'accepted',
			'pending'
		]);
		expect(result.childTaskRollup).toMatchObject({
			status: 'review',
			total: 2,
			acceptedCount: 1,
			pendingIntegrationCount: 1
		});
		expect(result.availableDependencyTasks[0]).toMatchObject({
			id: 'task_dependency',
			isSelected: true
		});
	});
});
