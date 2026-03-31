import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentSessionDetail } from '$lib/types/agent-session';
import type { ControlPlaneData, Project } from '$lib/types/control-plane';

const controlPlaneState = vi.hoisted(() => ({
	current: null as ControlPlaneData | null,
	saved: null as ControlPlaneData | null
}));

const agentSessionState = vi.hoisted(() => ({
	session: null as AgentSessionDetail | null
}));

const createTaskMock = vi.hoisted(() =>
	vi.fn(
		(input: {
			title: string;
			summary: string;
			projectId: string;
			desiredRoleId: string;
			artifactPath: string;
			status?: string;
		}) => ({
			id: `task_${input.title.toLowerCase().replace(/\s+/g, '_')}`,
			title: input.title,
			summary: input.summary,
			projectId: input.projectId,
			lane: 'product',
			goalId: '',
			priority: 'medium',
			status: input.status ?? 'ready',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiresReview: true,
			desiredRoleId: input.desiredRoleId,
			assigneeWorkerId: null,
			threadSessionId: null,
			blockedReason: '',
			dependencyTaskIds: [],
			runCount: 0,
			latestRunId: null,
			artifactPath: input.artifactPath,
			attachments: [],
			createdAt: '2026-03-30T12:00:00.000Z',
			updatedAt: '2026-03-30T12:00:00.000Z'
		})
	)
);

const parseIdeationTaskSuggestionsMock = vi.hoisted(() =>
	vi.fn(() => [
		{
			index: 0,
			title: 'Create draft tasks directly from ideation output',
			whyItMatters: 'Eliminate retyping.',
			suggestedInstructions: 'Add a review flow that creates selected suggestions as drafts.',
			signals: 'Operators currently have to create tasks manually after ideation.',
			confidence: 'high'
		},
		{
			index: 1,
			title: 'Show routing defaults beside ideation suggestions',
			whyItMatters: 'Clarify where drafts go.',
			suggestedInstructions: 'Display the default role and artifact path in the review UI.',
			signals: 'Task creation already derives routing from project defaults.',
			confidence: 'medium'
		}
	])
);

vi.mock('$lib/server/control-plane', () => ({
	createRun: vi.fn(),
	createTask: createTaskMock,
	deleteTask: vi.fn(),
	formatRelativeTime: vi.fn(() => 'just now'),
	getOpenReviewForTask: vi.fn(() => null),
	getPendingApprovalForTask: vi.fn(() => null),
	loadControlPlane: vi.fn(async () => controlPlaneState.current),
	parseTaskStatus: vi.fn((_value: string, fallback: string) => fallback),
	taskHasUnmetDependencies: vi.fn(() => false),
	updateControlPlane: vi.fn(async (updater: (data: ControlPlaneData) => ControlPlaneData) => {
		controlPlaneState.saved = updater(controlPlaneState.current as ControlPlaneData);
		controlPlaneState.current = controlPlaneState.saved;
		return controlPlaneState.saved;
	})
}));

vi.mock('$lib/server/agent-sessions', () => ({
	cancelAgentSession: vi.fn(),
	getAgentSession: vi.fn(async () => agentSessionState.session),
	listAgentSessions: vi.fn(async () => []),
	sendAgentSessionMessage: vi.fn(),
	startAgentSession: vi.fn()
}));

vi.mock('$lib/task-thread-context', () => ({
	selectTaskThreadContext: vi.fn(() => ({
		linkThread: null,
		linkThreadKind: 'assigned',
		statusThread: null
	}))
}));

vi.mock('$lib/server/task-threads', () => ({
	buildPromptDigest: vi.fn(),
	buildTaskThreadName: vi.fn(),
	buildTaskThreadPrompt: vi.fn()
}));

vi.mock('$lib/server/task-ideation', () => ({
	buildProjectTaskIdeationPrompt: vi.fn(),
	buildProjectTaskIdeationThreadName: vi.fn(
		(projectName: string) => `Task ideation: ${projectName}`
	),
	findProjectForTaskIdeationThread: vi.fn(
		(_session: AgentSessionDetail, projects: Project[]) => projects[0] ?? null
	),
	findProjectTaskIdeationThread: vi.fn(),
	getProjectTaskIdeationWorkspace: vi.fn(),
	parseIdeationTaskSuggestions: parseIdeationTaskSuggestionsMock
}));

import { actions } from './+page.server';

describe('tasks page server actions', () => {
	beforeEach(() => {
		createTaskMock.mockClear();
		parseIdeationTaskSuggestionsMock.mockClear();
		controlPlaneState.current = {
			providers: [],
			roles: [
				{
					id: 'role_coordinator',
					name: 'Coordinator',
					lane: 'shared',
					description: 'Routes work'
				}
			],
			projects: [
				{
					id: 'project_ams',
					name: 'Agent Management System Prototype',
					summary: 'project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				}
			],
			goals: [],
			workers: [],
			tasks: [
				{
					id: 'task_existing',
					title: 'Show routing defaults beside ideation suggestions',
					summary: 'Existing task already in queue.',
					projectId: 'project_ams',
					lane: 'product',
					goalId: '',
					priority: 'medium',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeWorkerId: null,
					threadSessionId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 0,
					latestRunId: null,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z'
				}
			],
			runs: [],
			reviews: [],
			approvals: []
		};
		controlPlaneState.saved = null;
		agentSessionState.session = {
			id: 'session_ideation',
			name: 'Task ideation: Agent Management System Prototype',
			cwd: '/tmp/project',
			sandbox: 'workspace-write',
			model: null,
			threadId: 'thread_1',
			archivedAt: null,
			createdAt: '2026-03-30T11:00:00.000Z',
			updatedAt: '2026-03-30T12:00:00.000Z',
			origin: 'managed',
			sessionState: 'ready',
			latestRunStatus: 'completed',
			hasActiveRun: false,
			canResume: true,
			runCount: 1,
			lastActivityAt: '2026-03-30T12:00:00.000Z',
			lastActivityLabel: 'just now',
			sessionSummary: 'Suggested the next tasks.',
			lastExitCode: 0,
			runTimeline: [],
			relatedTasks: [],
			latestRun: null,
			runs: []
		};
	});

	it('creates selected ideation suggestions as draft tasks and skips duplicates', async () => {
		const form = new FormData();
		form.set('sessionId', 'session_ideation');
		form.append('suggestionIndex', '0');
		form.append('suggestionIndex', '1');

		const result = await actions.createDraftTasksFromIdeation({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'createDraftTasksFromIdeation',
				projectName: 'Agent Management System Prototype',
				createdCount: 1,
				skippedCount: 1
			})
		);
		expect(createTaskMock).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Create draft tasks directly from ideation output',
				summary: 'Add a review flow that creates selected suggestions as drafts.',
				projectId: 'project_ams',
				desiredRoleId: 'role_coordinator',
				artifactPath: '/tmp/project/agent_output',
				status: 'in_draft'
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				title: 'Create draft tasks directly from ideation output',
				status: 'in_draft',
				projectId: 'project_ams'
			})
		);
	});
});
