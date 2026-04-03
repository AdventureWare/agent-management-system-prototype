import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentSessionDetail } from '$lib/types/agent-session';
import type { ControlPlaneData, Project } from '$lib/types/control-plane';

const { mkdir, writeFile } = vi.hoisted(() => ({
	mkdir: vi.fn(),
	writeFile: vi.fn()
}));

const controlPlaneState = vi.hoisted(() => ({
	current: null as ControlPlaneData | null,
	saved: null as ControlPlaneData | null
}));

const agentSessionState = vi.hoisted(() => ({
	session: null as AgentSessionDetail | null
}));

const createRunMock = vi.hoisted(() =>
	vi.fn((input: { taskId: string; sessionId?: string | null; status?: string }) => ({
		id: `run_${input.taskId}`,
		taskId: input.taskId,
		workerId: null,
		providerId: null,
		status: input.status ?? 'queued',
		createdAt: '2026-03-31T10:00:00.000Z',
		updatedAt: '2026-03-31T10:00:00.000Z',
		startedAt: '2026-03-31T10:00:00.000Z',
		endedAt: null,
		threadId: null,
		sessionId: input.sessionId ?? null,
		promptDigest: 'digest_create_and_run',
		artifactPaths: ['/tmp/project/agent_output'],
		summary: 'Started a new work thread during task creation.',
		lastHeartbeatAt: '2026-03-31T10:00:00.000Z',
		errorSummary: ''
	}))
);

const createTaskMock = vi.hoisted(() =>
	vi.fn(
		(input: {
			title: string;
			summary: string;
			projectId: string;
			goalId: string;
			desiredRoleId: string;
			artifactPath: string;
			targetDate?: string | null;
			requiredCapabilityNames?: string[];
			requiredToolNames?: string[];
			status?: string;
		}) => ({
			id: `task_${input.title.toLowerCase().replace(/\s+/g, '_')}`,
			title: input.title,
			summary: input.summary,
			projectId: input.projectId,
			lane: 'product',
			goalId: input.goalId,
			priority: 'medium',
			status: input.status ?? 'ready',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiresReview: true,
			desiredRoleId: input.desiredRoleId,
			assigneeWorkerId: null,
			agentThreadId: null,
			blockedReason: '',
			dependencyTaskIds: [],
			targetDate: input.targetDate ?? null,
			requiredCapabilityNames: input.requiredCapabilityNames ?? [],
			requiredToolNames: input.requiredToolNames ?? [],
			runCount: 0,
			latestRunId: null,
			artifactPath: input.artifactPath,
			attachments: [],
			createdAt: '2026-03-30T12:00:00.000Z',
			updatedAt: '2026-03-30T12:00:00.000Z'
		})
	)
);

const startAgentSessionMock = vi.hoisted(() =>
	vi.fn(async () => ({
		sessionId: 'session_created',
		runId: 'runner_created'
	}))
);
const getWorkspaceExecutionIssueMock = vi.hoisted(() =>
	vi.fn<(_: { cwd: string; sandbox: string; scopeLabel?: string }) => string | null>(() => null)
);

const buildPromptDigestMock = vi.hoisted(() => vi.fn(() => 'digest_create_and_run'));
const buildTaskThreadNameMock = vi.hoisted(() =>
	vi.fn(
		(input: { projectName: string; taskName: string; taskId: string }) =>
			`Task thread · ${input.taskName} · ${input.projectName} · ${input.taskId}`
	)
);
const buildTaskThreadPromptMock = vi.hoisted(() => vi.fn(() => 'task prompt'));
const listInstalledCodexSkillsMock = vi.hoisted(() =>
	vi.fn(() => [
		{
			id: 'skill-installer',
			description: 'Install Codex skills',
			global: true,
			project: false,
			sourceLabel: 'Global'
		},
		{
			id: 'web-design-guidelines',
			description: 'Review UI against guidelines',
			global: false,
			project: true,
			sourceLabel: 'Project'
		}
	])
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

function syncTaskExecutionStateLike(data: ControlPlaneData) {
	return {
		...data,
		tasks: data.tasks.map((task) => {
			const taskRuns = data.runs
				.filter((run) => run.taskId === task.id)
				.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

			return {
				...task,
				agentThreadId: task.agentThreadId,
				runCount: taskRuns.length,
				latestRunId: taskRuns[0]?.id ?? null
			};
		})
	};
}

vi.mock('$lib/server/control-plane', () => ({
	createTaskAttachmentId: vi.fn(() => 'attachment_created'),
	createRun: createRunMock,
	createTask: createTaskMock,
	deleteTask: vi.fn(),
	formatRelativeTime: vi.fn(() => 'just now'),
	getOpenReviewForTask: vi.fn(() => null),
	getPendingApprovalForTask: vi.fn(() => null),
	loadControlPlane: vi.fn(async () => controlPlaneState.current),
	parseTaskStatus: vi.fn((_value: string, fallback: string) => fallback),
	projectMatchesPath: vi.fn(
		(
			project: { defaultArtifactRoot?: string; projectRootFolder?: string },
			artifactPath: string
		) => {
			const normalizedPath = artifactPath.trim();
			return Boolean(
				normalizedPath &&
					(project.defaultArtifactRoot === normalizedPath ||
						project.projectRootFolder === normalizedPath)
			);
		}
	),
	resolveThreadSandbox: vi.fn(
		(input: {
			worker?: { threadSandboxOverride: string | null } | null;
			project?: { defaultThreadSandbox?: string | null } | null;
			provider?: { defaultThreadSandbox: string } | null;
		}) =>
			input.worker?.threadSandboxOverride ??
			input.project?.defaultThreadSandbox ??
			input.provider?.defaultThreadSandbox ??
			'workspace-write'
	),
	selectExecutionProvider: vi.fn(
		(data: ControlPlaneData, worker?: { providerId: string } | null) =>
			(worker?.providerId
				? data.providers.find((provider) => provider.id === worker.providerId)
				: null) ??
			data.providers.find((provider) => provider.kind === 'local' && provider.enabled) ??
			data.providers[0] ??
			null
	),
	taskHasUnmetDependencies: vi.fn(() => false),
	updateControlPlane: vi.fn(async (updater: (data: ControlPlaneData) => ControlPlaneData) => {
		controlPlaneState.saved = syncTaskExecutionStateLike(
			updater(controlPlaneState.current as ControlPlaneData)
		);
		controlPlaneState.current = controlPlaneState.saved;
		return controlPlaneState.saved;
	})
}));

vi.mock('node:fs/promises', () => ({
	mkdir,
	writeFile
}));

vi.mock('$lib/server/agent-sessions', () => ({
	cancelAgentSession: vi.fn(),
	getAgentSession: vi.fn(async () => agentSessionState.session),
	listAgentSessions: vi.fn(async () => []),
	sendAgentSessionMessage: vi.fn(),
	startAgentSession: startAgentSessionMock
}));

vi.mock('$lib/task-thread-context', () => ({
	selectTaskThreadContext: vi.fn(() => ({
		linkThread: null,
		linkThreadKind: 'assigned',
		statusThread: null
	}))
}));

vi.mock('$lib/server/task-threads', () => ({
	buildPromptDigest: buildPromptDigestMock,
	buildTaskThreadName: buildTaskThreadNameMock,
	buildTaskThreadPrompt: buildTaskThreadPromptMock
}));

vi.mock('$lib/server/codex-skills', () => ({
	listInstalledCodexSkills: listInstalledCodexSkillsMock
}));

vi.mock('$lib/server/task-execution-workspace', () => ({
	getWorkspaceExecutionIssue: getWorkspaceExecutionIssueMock
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
		mkdir.mockReset();
		writeFile.mockReset();
		buildPromptDigestMock.mockClear();
		buildTaskThreadNameMock.mockClear();
		buildTaskThreadPromptMock.mockClear();
		listInstalledCodexSkillsMock.mockClear();
		createRunMock.mockClear();
		createTaskMock.mockClear();
		parseIdeationTaskSuggestionsMock.mockClear();
		startAgentSessionMock.mockClear();
		getWorkspaceExecutionIssueMock.mockReset();
		getWorkspaceExecutionIssueMock.mockReturnValue(null);
		controlPlaneState.current = {
			providers: [
				{
					id: 'provider_local',
					name: 'Local Codex',
					service: 'codex',
					kind: 'local',
					description: 'Local provider',
					enabled: true,
					setupStatus: 'connected',
					authMode: 'local_cli',
					defaultModel: 'gpt-5',
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
			goals: [
				{
					id: 'goal_queue_quality',
					name: 'Reduce task intake friction',
					lane: 'product',
					status: 'running',
					summary: 'Improve task intake and routing quality.',
					artifactPath: '/tmp/project/goals/queue-quality',
					successSignal: 'Operators can link work to goals during intake.',
					parentGoalId: null,
					projectIds: ['project_ams'],
					taskIds: ['task_existing']
				}
			],
			workers: [],
			tasks: [
				{
					id: 'task_existing',
					title: 'Show routing defaults beside ideation suggestions',
					summary: 'Existing task already in queue.',
					projectId: 'project_ams',
					lane: 'product',
					goalId: 'goal_queue_quality',
					priority: 'medium',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeWorkerId: null,
					agentThreadId: null,
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

	it('creates a queued task without launching a work thread by default', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('name', 'Add create and run button');
		form.set('instructions', 'Add a second action in the create task form.');
		form.set('targetDate', '2026-04-18');
		form.set('requiredCapabilityNames', 'planning, citations');
		form.set('requiredToolNames', 'codex, playwright');

		const result = await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'createTask'
			})
		);
		expect(startAgentSessionMock).not.toHaveBeenCalled();
		expect(createRunMock).not.toHaveBeenCalled();
		expect(createTaskMock).toHaveBeenCalledWith(
			expect.objectContaining({
				requiredCapabilityNames: ['planning', 'citations'],
				requiredToolNames: ['codex', 'playwright']
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				title: 'Add create and run button',
				status: 'ready',
				targetDate: '2026-04-18',
				requiredCapabilityNames: ['planning', 'citations'],
				requiredToolNames: ['codex', 'playwright'],
				agentThreadId: null,
				runCount: 0
			})
		);
	});

	it('links a newly created task to the selected goal', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('goalId', 'goal_queue_quality');
		form.set('name', 'Link new task to goal');
		form.set('instructions', 'Create a task directly under the queue-quality goal.');

		const result = await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'createTask'
			})
		);
		expect(createTaskMock).toHaveBeenCalledWith(
			expect.objectContaining({
				goalId: 'goal_queue_quality'
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				title: 'Link new task to goal',
				goalId: 'goal_queue_quality'
			})
		);
		expect(
			controlPlaneState.saved?.goals.find((goal) => goal.id === 'goal_queue_quality')?.taskIds
		).toEqual(['task_existing', 'task_link_new_task_to_goal']);
	});

	it('rejects an invalid target date during task creation', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('name', 'Add create and run button');
		form.set('instructions', 'Add a second action in the create task form.');
		form.set('targetDate', '04/18/2026');

		const result = await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: {
				message: 'Target date must use YYYY-MM-DD format.',
				targetDate: '04/18/2026'
			}
		});
		expect(createTaskMock).not.toHaveBeenCalledWith(
			expect.objectContaining({
				targetDate: '04/18/2026'
			})
		);
		expect(controlPlaneState.saved).toBeNull();
	});

	it('attaches uploaded files while creating a queued task', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('name', 'Create task with source files');
		form.set('instructions', 'Save the uploaded brief files during creation.');
		form.append('attachments', new File(['brief'], 'brief.md', { type: 'text/markdown' }));
		form.append('attachments', new File(['diagram'], 'diagram.png', { type: 'image/png' }));

		const result = await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'createTask',
				attachmentCount: 2
			})
		);
		expect(mkdir).toHaveBeenCalledWith(
			'/tmp/project/agent_output/task-attachments/task_create_task_with_source_files',
			{ recursive: true }
		);
		expect(writeFile).toHaveBeenCalledTimes(2);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				title: 'Create task with source files',
				attachments: [
					expect.objectContaining({
						id: 'attachment_created',
						name: 'brief.md',
						path: '/tmp/project/agent_output/task-attachments/task_create_task_with_source_files/attachment_created-brief.md',
						contentType: 'text/markdown',
						sizeBytes: 5
					}),
					expect.objectContaining({
						id: 'attachment_created',
						name: 'diagram.png',
						path: '/tmp/project/agent_output/task-attachments/task_create_task_with_source_files/attachment_created-diagram.png',
						contentType: 'image/png',
						sizeBytes: 7
					})
				]
			})
		);
	});

	it('creates and launches a task when the create-and-run submit mode is used', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('name', 'Create and run from the task form');
		form.set('instructions', 'Create the task and immediately start its work thread.');
		form.set('submitMode', 'createAndRun');

		const result = await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'createTaskAndRun',
				taskId: 'task_create_and_run_from_the_task_form',
				sessionId: 'session_created'
			})
		);
		expect(buildTaskThreadPromptMock).toHaveBeenCalledWith(
			expect.objectContaining({
				taskName: 'Create and run from the task form',
				taskInstructions: 'Create the task and immediately start its work thread.',
				projectName: 'Agent Management System Prototype',
				projectRootFolder: '/tmp/project',
				defaultArtifactRoot: '/tmp/project/agent_output',
				availableSkillNames: ['skill-installer', 'web-design-guidelines']
			})
		);
		expect(startAgentSessionMock).toHaveBeenCalledWith({
			name: 'Task thread · Create and run from the task form · Agent Management System Prototype · task_create_and_run_from_the_task_form',
			cwd: '/tmp/project',
			prompt: 'task prompt',
			sandbox: 'workspace-write',
			model: null
		});
		expect(buildTaskThreadNameMock).toHaveBeenCalledWith({
			projectName: 'Agent Management System Prototype',
			taskName: 'Create and run from the task form',
			taskId: 'task_create_and_run_from_the_task_form'
		});
		expect(createRunMock).toHaveBeenCalledWith(
			expect.objectContaining({
				taskId: 'task_create_and_run_from_the_task_form',
				providerId: 'provider_local',
				status: 'running',
				sessionId: 'session_created',
				promptDigest: 'digest_create_and_run',
				artifactPaths: ['/tmp/project/agent_output']
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				title: 'Create and run from the task form',
				status: 'in_progress',
				agentThreadId: 'session_created',
				runCount: 1,
				latestRunId: 'run_task_create_and_run_from_the_task_form'
			})
		);
		expect(controlPlaneState.saved?.runs[0]).toEqual(
			expect.objectContaining({
				id: 'run_task_create_and_run_from_the_task_form',
				taskId: 'task_create_and_run_from_the_task_form',
				sessionId: 'session_created'
			})
		);
	});

	it('prefers the project default sandbox over the provider default during create-and-run', async () => {
		(controlPlaneState.current as ControlPlaneData).projects[0]!.defaultThreadSandbox =
			'danger-full-access';
		(controlPlaneState.current as ControlPlaneData).providers[0]!.defaultThreadSandbox =
			'read-only';

		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('name', 'Launch with project sandbox');
		form.set('instructions', 'Use the project sandbox preference.');
		form.set('submitMode', 'createAndRun');

		await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(startAgentSessionMock).toHaveBeenCalledWith(
			expect.objectContaining({
				sandbox: 'danger-full-access'
			})
		);
	});

	it('uses the provider thread sandbox default when launching from create-and-run', async () => {
		(controlPlaneState.current as ControlPlaneData).providers[0]!.defaultThreadSandbox =
			'read-only';

		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('name', 'Launch with provider sandbox');
		form.set('instructions', 'Use the provider default thread sandbox.');
		form.set('submitMode', 'createAndRun');

		await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(startAgentSessionMock).toHaveBeenCalledWith(
			expect.objectContaining({
				sandbox: 'read-only'
			})
		);
	});

	it('rejects create-and-run when the project root is not writable in the sandbox', async () => {
		getWorkspaceExecutionIssueMock.mockReturnValue(
			'Project root cannot be used with the workspace-write sandbox: /tmp/project. Operation not permitted (EPERM).'
		);

		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('name', 'Create and run from the task form');
		form.set('instructions', 'Create the task and immediately start its work thread.');
		form.set('submitMode', 'createAndRun');

		const result = await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: {
				message:
					'Project root cannot be used with the workspace-write sandbox: /tmp/project. Operation not permitted (EPERM).'
			}
		});
		expect(startAgentSessionMock).not.toHaveBeenCalled();
		expect(createRunMock).not.toHaveBeenCalled();
		expect(controlPlaneState.saved).toBeNull();
	});
});
