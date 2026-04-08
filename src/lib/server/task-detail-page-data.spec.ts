import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';

const loadControlPlane = vi.hoisted(() => vi.fn());
const formatRelativeTime = vi.hoisted(() => vi.fn((value: string) => `relative:${value}`));
const getOpenReviewForTask = vi.hoisted(() => vi.fn(() => null));
const getPendingApprovalForTask = vi.hoisted(() => vi.fn(() => null));
const selectExecutionProvider = vi.hoisted(() =>
	vi.fn(
		(data: Pick<ControlPlaneData, 'providers'>, worker?: { providerId?: string | null } | null) => {
			if (worker?.providerId) {
				return data.providers.find((provider) => provider.id === worker.providerId) ?? null;
			}

			return data.providers[0] ?? null;
		}
	)
);
const resolveThreadSandbox = vi.hoisted(() =>
	vi.fn(
		(input: {
			task?: { requiredThreadSandbox?: string | null } | null;
			worker?: { threadSandboxOverride?: string | null } | null;
			project?: { defaultThreadSandbox?: string | null } | null;
			provider?: { defaultThreadSandbox?: string | null } | null;
		}) =>
			input.task?.requiredThreadSandbox ??
			input.worker?.threadSandboxOverride ??
			input.project?.defaultThreadSandbox ??
			input.provider?.defaultThreadSandbox ??
			'workspace-write'
	)
);
const listAgentThreads = vi.hoisted(() => vi.fn());
const buildArtifactBrowser = vi.hoisted(() => vi.fn());
const listInstalledCodexSkills = vi.hoisted(() => vi.fn());
const loadRelevantSelfImprovementKnowledgeItems = vi.hoisted(() => vi.fn());
const getTaskAttachmentRoot = vi.hoisted(() => vi.fn());
const getWorkerAssignmentSuggestions = vi.hoisted(() => vi.fn());
const buildAssignmentSuggestionViews = vi.hoisted(() => vi.fn());
const buildParentTaskView = vi.hoisted(() => vi.fn());
const buildRecentTaskDecisionViews = vi.hoisted(() => vi.fn());
const buildTaskDetailTaskView = vi.hoisted(() => vi.fn());
const summarizeInstalledSkills = vi.hoisted(() => vi.fn());
const buildTaskDetailCollections = vi.hoisted(() => vi.fn());
const buildTaskDetailRuntimeContext = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/control-plane', () => ({
	formatRelativeTime,
	getOpenReviewForTask,
	getPendingApprovalForTask,
	loadControlPlane,
	selectExecutionProvider,
	resolveThreadSandbox
}));

vi.mock('$lib/server/agent-threads', () => ({
	listAgentThreads
}));

vi.mock('$lib/server/artifact-browser', () => ({
	buildArtifactBrowser
}));

vi.mock('$lib/server/codex-skills', () => ({
	listInstalledCodexSkills
}));

vi.mock('$lib/server/self-improvement-knowledge', () => ({
	loadRelevantSelfImprovementKnowledgeItems
}));

vi.mock('$lib/server/task-attachments', () => ({
	getTaskAttachmentRoot
}));

vi.mock('$lib/server/worker-api', () => ({
	getWorkerAssignmentSuggestions
}));

vi.mock('./task-detail-display-data', () => ({
	buildAssignmentSuggestionViews,
	buildParentTaskView,
	buildRecentTaskDecisionViews,
	buildTaskDetailTaskView,
	summarizeInstalledSkills
}));

vi.mock('./task-detail-load-data', () => ({
	buildTaskDetailCollections
}));

vi.mock('./task-detail-runtime-context', () => ({
	buildTaskDetailRuntimeContext
}));

import { loadTaskDetailPageData } from './task-detail-page-data';

function createData(): ControlPlaneData {
	return {
		providers: [
			{
				id: 'provider_local',
				name: 'Local Provider',
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
			}
		],
		roles: [
			{
				id: 'role_b',
				name: 'Builder',
				area: 'shared',
				description: ''
			},
			{
				id: 'role_a',
				name: 'Architect',
				area: 'shared',
				description: ''
			}
		],
		projects: [
			{
				id: 'project_b',
				name: 'Zulu Project',
				summary: '',
				projectRootFolder: '/tmp/zulu',
				defaultArtifactRoot: '/tmp/zulu/agent_output',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: ''
			},
			{
				id: 'project_a',
				name: 'Alpha Project',
				summary: '',
				projectRootFolder: '/tmp/alpha',
				defaultArtifactRoot: '/tmp/alpha/agent_output',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: ''
			}
		],
		goals: [
			{
				id: 'goal_parent',
				name: 'Parent goal',
				summary: '',
				status: 'ready',
				artifactPath: '/tmp/goals/parent',
				parentGoalId: null,
				projectIds: [],
				taskIds: [],
				area: 'product',
				targetDate: null
			},
			{
				id: 'goal_child',
				name: 'Child goal',
				summary: '',
				status: 'ready',
				artifactPath: '/tmp/goals/child',
				parentGoalId: 'goal_parent',
				projectIds: [],
				taskIds: [],
				area: 'product',
				targetDate: null
			}
		],
		workers: [
			{
				id: 'worker_b',
				name: 'Zulu Worker',
				providerId: 'provider_local',
				roleId: 'role_b',
				location: 'local',
				status: 'idle',
				capacity: 1,
				registeredAt: '2026-04-01T10:00:00.000Z',
				lastSeenAt: '2026-04-01T10:00:00.000Z',
				note: '',
				tags: [],
				threadSandboxOverride: null,
				authTokenHash: ''
			},
			{
				id: 'worker_a',
				name: 'Alpha Worker',
				providerId: 'provider_local',
				roleId: 'role_a',
				location: 'local',
				status: 'idle',
				capacity: 1,
				registeredAt: '2026-04-01T10:00:00.000Z',
				lastSeenAt: '2026-04-01T10:00:00.000Z',
				note: '',
				tags: [],
				threadSandboxOverride: null,
				authTokenHash: ''
			}
		],
		tasks: [
			{
				id: 'task_parent',
				title: 'Parent task',
				summary: '',
				projectId: 'project_a',
				area: 'product',
				goalId: '',
				parentTaskId: null,
				delegationPacket: null,
				priority: 'medium',
				status: 'ready',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiredThreadSandbox: null,
				requiresReview: false,
				desiredRoleId: '',
				assigneeWorkerId: null,
				agentThreadId: null,
				blockedReason: '',
				dependencyTaskIds: [],
				targetDate: null,
				requiredCapabilityNames: [],
				requiredToolNames: [],
				runCount: 0,
				latestRunId: null,
				artifactPath: '/tmp/project/agent_output',
				attachments: [],
				createdAt: '2026-04-01T10:00:00.000Z',
				updatedAt: '2026-04-01T10:00:00.000Z'
			},
			{
				id: 'task_1',
				title: 'Child task',
				summary: '',
				projectId: 'project_a',
				area: 'product',
				goalId: 'goal_child',
				parentTaskId: 'task_parent',
				delegationPacket: null,
				priority: 'medium',
				status: 'in_progress',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiredThreadSandbox: null,
				requiresReview: false,
				desiredRoleId: '',
				assigneeWorkerId: 'worker_a',
				agentThreadId: 'thread_1',
				blockedReason: '',
				dependencyTaskIds: [],
				targetDate: null,
				requiredCapabilityNames: [],
				requiredToolNames: [],
				runCount: 1,
				latestRunId: 'run_1',
				artifactPath: '/tmp/project/agent_output',
				attachments: [
					{
						id: 'attachment_1',
						name: 'notes.txt',
						path: '/tmp/project/agent_output/notes.txt',
						sizeBytes: 12,
						contentType: 'text/plain',
						attachedAt: '2026-04-01T10:00:00.000Z'
					}
				],
				createdAt: '2026-04-01T10:00:00.000Z',
				updatedAt: '2026-04-01T10:00:00.000Z'
			}
		],
		runs: [],
		decisions: [],
		reviews: [],
		approvals: []
	};
}

describe('task-detail-page-data', () => {
	beforeEach(() => {
		loadControlPlane.mockReset();
		loadControlPlane.mockResolvedValue(createData());
		formatRelativeTime.mockClear();
		getOpenReviewForTask.mockClear();
		getPendingApprovalForTask.mockClear();
		listAgentThreads.mockReset();
		listAgentThreads.mockResolvedValue([{ id: 'thread_1' }]);
		buildArtifactBrowser.mockReset();
		buildArtifactBrowser.mockResolvedValue({ entries: [{ id: 'artifact_1' }] });
		listInstalledCodexSkills.mockReset();
		listInstalledCodexSkills.mockReturnValue([{ id: 'skill_1', global: true, project: false }]);
		loadRelevantSelfImprovementKnowledgeItems.mockReset();
		loadRelevantSelfImprovementKnowledgeItems.mockResolvedValue([{ id: 'knowledge_1' }]);
		getTaskAttachmentRoot.mockReset();
		getTaskAttachmentRoot.mockReturnValue('/tmp/project/agent_output/task_1');
		getWorkerAssignmentSuggestions.mockReset();
		getWorkerAssignmentSuggestions.mockReturnValue([
			{
				workerId: 'worker_a',
				workerName: 'Worker A',
				eligible: true,
				withinConcurrencyLimit: true,
				missingCapabilityNames: [],
				missingToolNames: []
			}
		]);
		buildAssignmentSuggestionViews.mockReset();
		buildAssignmentSuggestionViews.mockReturnValue([{ workerId: 'worker_a', eligible: true }]);
		buildParentTaskView.mockReset();
		buildParentTaskView.mockReturnValue({ id: 'task_parent' });
		buildRecentTaskDecisionViews.mockReset();
		buildRecentTaskDecisionViews.mockReturnValue([{ id: 'decision_1' }]);
		buildTaskDetailTaskView.mockReset();
		buildTaskDetailTaskView.mockReturnValue({ id: 'task_1', title: 'Child task' });
		summarizeInstalledSkills.mockReset();
		summarizeInstalledSkills.mockReturnValue({
			totalCount: 1,
			globalCount: 1,
			projectCount: 0,
			previewSkills: []
		});
		buildTaskDetailCollections.mockReset();
		buildTaskDetailCollections.mockReturnValue({
			relatedRuns: [{ id: 'run_1', status: 'running', agentThreadId: 'thread_1' }],
			dependencyTasks: [{ id: 'task_dependency' }],
			childTasks: [{ id: 'task_child' }],
			childTaskRollup: {
				status: 'none',
				total: 1,
				acceptedCount: 0,
				pendingIntegrationCount: 0
			},
			availableDependencyTasks: [{ id: 'task_dependency', isSelected: true }]
		});
		buildTaskDetailRuntimeContext.mockReset();
		buildTaskDetailRuntimeContext.mockReturnValue({
			latestRun: { id: 'run_1' },
			activeRun: { id: 'run_1' },
			threadContext: { statusThread: null },
			candidateThreads: [{ id: 'thread_1' }],
			suggestedThread: { id: 'thread_1' },
			stalledRecovery: null
		});
	});

	it('assembles task detail page data from the shared helpers', async () => {
		const result = await loadTaskDetailPageData('task_1');

		expect(result).not.toBeNull();
		expect(result).toMatchObject({
			task: { id: 'task_1', title: 'Child task' },
			parentTask: { id: 'task_parent' },
			attachmentRoot: '/tmp/project/agent_output/task_1',
			artifactBrowser: { entries: [{ id: 'artifact_1' }] },
			retrievedKnowledgeItems: [{ id: 'knowledge_1' }],
			relatedRuns: [{ id: 'run_1' }],
			candidateThreads: [{ id: 'thread_1' }],
			suggestedThread: { id: 'thread_1' },
			assignmentSuggestions: [{ workerId: 'worker_a', eligible: true }],
			recentDecisions: [{ id: 'decision_1' }]
		});
		expect(result?.projects.map((project) => project.name)).toEqual([
			'Alpha Project',
			'Zulu Project'
		]);
		expect(result?.roles.map((role) => role.name)).toEqual(['Architect', 'Builder']);
		expect(result?.workers.map((worker) => worker.name)).toEqual(['Alpha Worker', 'Zulu Worker']);
		expect(result?.goals.map((goal) => goal.label)).toEqual(['Parent goal', '  - Child goal']);

		expect(loadRelevantSelfImprovementKnowledgeItems).toHaveBeenCalledWith({
			task: expect.objectContaining({ id: 'task_1' }),
			project: expect.objectContaining({ id: 'project_a' }),
			limit: 3
		});
		expect(buildArtifactBrowser).toHaveBeenCalledWith({
			rootPath: '/tmp/project/agent_output/task_1',
			knownOutputs: [
				{
					label: 'notes.txt',
					path: '/tmp/project/agent_output/notes.txt',
					href: '/api/tasks/task_1/attachments/attachment_1',
					description: 'Attached task file · text/plain'
				}
			]
		});
	});

	it('returns null when the task does not exist', async () => {
		const data = createData();
		loadControlPlane.mockResolvedValue({
			...data,
			tasks: data.tasks.filter((task) => task.id !== 'task_1')
		});

		await expect(loadTaskDetailPageData('task_1')).resolves.toBeNull();
	});
});
