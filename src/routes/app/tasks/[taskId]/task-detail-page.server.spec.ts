import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';
import type { RetrievedSelfImprovementKnowledgeItem } from '$lib/types/self-improvement';

const existsSync = vi.hoisted(() => vi.fn(() => true));

const { mkdir, writeFile } = vi.hoisted(() => ({
	mkdir: vi.fn(),
	writeFile: vi.fn()
}));

const createRun = vi.hoisted(() =>
	vi.fn(
		(input: {
			taskId: string;
			workerId: string | null;
			providerId: string | null;
			status: string;
			threadId: string | null;
			sessionId: string | null;
			promptDigest: string;
			artifactPaths: string[];
			summary: string;
			lastHeartbeatAt: string;
			startedAt: string;
		}) => ({
			id: 'run_test',
			taskId: input.taskId,
			workerId: input.workerId,
			providerId: input.providerId,
			status: input.status,
			createdAt: input.startedAt,
			updatedAt: input.startedAt,
			startedAt: input.startedAt,
			endedAt: null,
			threadId: input.threadId,
			agentThreadId: input.sessionId,
			promptDigest: input.promptDigest,
			artifactPaths: input.artifactPaths,
			summary: input.summary,
			lastHeartbeatAt: input.lastHeartbeatAt,
			errorSummary: ''
		})
	)
);

const projectMatchesPath = vi.hoisted(() => vi.fn(() => true));
const getWorkspaceExecutionIssue = vi.hoisted(() =>
	vi.fn<(_: { cwd: string; sandbox: string; scopeLabel?: string }) => string | null>(() => null)
);
const getAgentSession = vi.hoisted(() => vi.fn());
const recoverAgentSession = vi.hoisted(() => vi.fn());
const sendAgentSessionMessage = vi.hoisted(() => vi.fn());
const loadRelevantSelfImprovementKnowledgeItems = vi.hoisted(() =>
	vi.fn<() => Promise<RetrievedSelfImprovementKnowledgeItem[]>>(async () => [])
);
const startAgentSession = vi.hoisted(() =>
	vi.fn(async () => ({
		sessionId: 'session_new',
		runId: 'run_new'
	}))
);
const listInstalledCodexSkills = vi.hoisted(() =>
	vi.fn(() => [
		{
			id: 'skill-installer',
			description: 'Install Codex skills',
			global: true,
			project: false,
			sourceLabel: 'Global'
		}
	])
);
const buildTaskThreadPromptMock = vi.hoisted(() => vi.fn(() => 'run the task'));

const controlPlaneState = vi.hoisted(() => ({
	current: null as ControlPlaneData | null,
	saved: null as ControlPlaneData | null
}));

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

vi.mock('node:fs', () => ({
	existsSync
}));

vi.mock('node:fs/promises', () => ({
	mkdir,
	writeFile
}));

vi.mock('$lib/server/control-plane', () => ({
	createDecision: vi.fn(
		(input: {
			taskId?: string | null;
			decisionType: string;
			summary: string;
			createdAt?: string;
		}) => ({
			id: 'decision_test',
			taskId: input.taskId ?? null,
			goalId: null,
			runId: null,
			reviewId: null,
			approvalId: null,
			planningSessionId: null,
			decisionType: input.decisionType,
			summary: input.summary,
			createdAt: input.createdAt ?? '2026-03-30T12:00:00.000Z',
			decidedByWorkerId: null
		})
	),
	createTaskAttachmentId: vi.fn(() => 'attachment_test'),
	createRun,
	deleteTask: vi.fn(),
	formatRelativeTime: vi.fn(() => 'just now'),
	getOpenReviewForTask: vi.fn(() => null),
	getPendingApprovalForTask: vi.fn(() => null),
	loadControlPlane: vi.fn(async () => controlPlaneState.current),
	parseTaskStatus: vi.fn((_value: string, fallback: string) => fallback),
	projectMatchesPath,
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
	updateControlPlane: vi.fn(async (updater: (data: ControlPlaneData) => ControlPlaneData) => {
		controlPlaneState.saved = syncTaskExecutionStateLike(
			updater(controlPlaneState.current as ControlPlaneData)
		);
		controlPlaneState.current = controlPlaneState.saved;
		return controlPlaneState.saved;
	})
}));

vi.mock('$lib/server/agent-sessions', () => ({
	cancelAgentSession: vi.fn(),
	getAgentSession,
	listAgentSessions: vi.fn(async () => []),
	recoverAgentSession,
	sendAgentSessionMessage,
	startAgentSession
}));

vi.mock('$lib/server/task-threads', () => ({
	buildPromptDigest: vi.fn(() => 'digest_test'),
	buildTaskThreadName: vi.fn(
		(input: { projectName: string; taskName: string; taskId: string }) =>
			`Task thread · ${input.taskName} · ${input.projectName} · ${input.taskId}`
	),
	buildTaskThreadPrompt: buildTaskThreadPromptMock
}));

vi.mock('$lib/server/codex-skills', () => ({
	listInstalledCodexSkills
}));

vi.mock('$lib/server/self-improvement-knowledge', () => ({
	loadRelevantSelfImprovementKnowledgeItems
}));

vi.mock('$lib/server/task-execution-workspace', () => ({
	getWorkspaceExecutionIssue
}));

vi.mock('$lib/task-thread-context', () => ({
	isActiveTaskThread: vi.fn((thread: { sessionState?: string } | null | undefined) =>
		Boolean(thread && ['starting', 'waiting', 'working'].includes(thread.sessionState ?? ''))
	),
	selectTaskThreadContext: vi.fn(
		(input: {
			assignedThread: { id: string; sessionState?: string } | null;
			latestRunThread: { id: string; sessionState?: string } | null;
		}) => {
			const isActive = (thread: { sessionState?: string } | null | undefined) =>
				Boolean(thread && ['starting', 'waiting', 'working'].includes(thread.sessionState ?? ''));
			const statusThread =
				[input.assignedThread, input.latestRunThread].find((thread) => isActive(thread)) ??
				input.assignedThread ??
				input.latestRunThread ??
				null;

			return {
				assignedThread: input.assignedThread,
				latestRunThread: input.latestRunThread,
				statusThread,
				linkThread: statusThread,
				linkThreadKind: statusThread
					? statusThread.id === input.assignedThread?.id
						? 'assigned'
						: 'latest'
					: null
			};
		}
	)
}));

import { actions } from './+page.server';

describe('task detail page server actions', () => {
	beforeEach(() => {
		existsSync.mockReset();
		existsSync.mockReturnValue(true);
		mkdir.mockReset();
		writeFile.mockReset();
		createRun.mockClear();
		projectMatchesPath.mockReset();
		projectMatchesPath.mockReturnValue(true);
		getWorkspaceExecutionIssue.mockReset();
		getWorkspaceExecutionIssue.mockReturnValue(null);
		getAgentSession.mockReset();
		getAgentSession.mockResolvedValue(null);
		recoverAgentSession.mockReset();
		sendAgentSessionMessage.mockReset();
		loadRelevantSelfImprovementKnowledgeItems.mockReset();
		loadRelevantSelfImprovementKnowledgeItems.mockResolvedValue([]);
		startAgentSession.mockReset();
		buildTaskThreadPromptMock.mockClear();
		listInstalledCodexSkills.mockClear();
		startAgentSession.mockResolvedValue({
			sessionId: 'session_new',
			runId: 'run_new'
		});
		controlPlaneState.current = {
			providers: [
				{
					id: 'provider_local_codex',
					name: 'Local Codex Worker',
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
				}
			],
			roles: [
				{
					id: 'role_coordinator',
					name: 'Coordinator',
					lane: 'shared',
					description: 'Coordinates task execution'
				},
				{
					id: 'role_reviewer',
					name: 'Reviewer',
					lane: 'product',
					description: 'Reviews and governs higher-risk work'
				}
			],
			projects: [
				{
					id: 'project_1',
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
					id: 'goal_launch',
					name: 'Improve goal UX',
					lane: 'product',
					status: 'running',
					summary: 'Make goal creation clearer and more useful.',
					artifactPath: '/tmp/project/agent_output/goals',
					parentGoalId: null,
					projectIds: ['project_1'],
					taskIds: [],
					targetDate: null
				}
			],
			workers: [],
			tasks: [
				{
					id: 'task_1',
					title: 'Attach a brief',
					summary: 'Need source documents',
					projectId: 'project_1',
					lane: 'product',
					goalId: '',
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
					targetDate: null,
					runCount: 1,
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
	});

	it('updates the task target date from the detail form', async () => {
		const form = new FormData();
		form.set('name', 'Attach a brief');
		form.set('instructions', 'Need source documents');
		form.set('projectId', 'project_1');
		form.set('targetDate', '2026-04-22');

		const result = await actions.updateTask({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'updateTask',
				taskId: 'task_1'
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				targetDate: '2026-04-22'
			})
		);
		expect(controlPlaneState.saved?.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_1',
				decisionType: 'task_plan_updated'
			})
		);
	});

	it('updates the task goal link from the detail form', async () => {
		const form = new FormData();
		form.set('name', 'Attach a brief');
		form.set('instructions', 'Need source documents');
		form.set('projectId', 'project_1');
		form.set('goalId', 'goal_launch');

		const result = await actions.updateTask({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'updateTask',
				taskId: 'task_1'
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				goalId: 'goal_launch'
			})
		);
		expect(controlPlaneState.saved?.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_1',
				decisionType: 'task_plan_updated',
				summary: expect.stringContaining('linked the task to goal "Improve goal UX"')
			})
		);
	});

	it('updates routing and governance fields from the detail form', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			tasks: [
				...(controlPlaneState.current as ControlPlaneData).tasks,
				{
					id: 'task_2',
					title: 'Unblock API contract',
					summary: 'Finalize the downstream API shape',
					projectId: 'project_1',
					lane: 'product',
					goalId: '',
					priority: 'high',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeWorkerId: null,
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					targetDate: null,
					runCount: 0,
					latestRunId: null,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z'
				}
			]
		};

		const form = new FormData();
		form.set('name', 'Attach a brief');
		form.set('instructions', 'Need source documents');
		form.set('projectId', 'project_1');
		form.set('priority', 'urgent');
		form.set('riskLevel', 'high');
		form.set('approvalMode', 'before_apply');
		form.set('requiresReview', 'false');
		form.set('desiredRoleId', 'role_reviewer');
		form.set('blockedReason', 'Waiting on API contract');
		form.set('dependencyTaskSelection', 'true');
		form.append('dependencyTaskIds', 'task_2');

		const result = await actions.updateTask({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'updateTask',
				taskId: 'task_1'
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				priority: 'urgent',
				riskLevel: 'high',
				approvalMode: 'before_apply',
				requiresReview: false,
				desiredRoleId: 'role_reviewer',
				blockedReason: 'Waiting on API contract',
				dependencyTaskIds: ['task_2']
			})
		);
		expect(controlPlaneState.saved?.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_1',
				decisionType: 'task_plan_updated',
				summary: expect.stringContaining('set priority to Urgent')
			})
		);
		expect(controlPlaneState.saved?.decisions?.[0]?.summary).toContain(
			'set approval mode to Before Apply'
		);
		expect(controlPlaneState.saved?.decisions?.[0]?.summary).toContain(
			'set desired role to Reviewer'
		);
		expect(controlPlaneState.saved?.decisions?.[0]?.summary).toContain('"Unblock API contract"');
	});

	it('rejects an invalid task target date from the detail form', async () => {
		const form = new FormData();
		form.set('name', 'Attach a brief');
		form.set('instructions', 'Need source documents');
		form.set('projectId', 'project_1');
		form.set('targetDate', '04/22/2026');

		const result = await actions.updateTask({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: {
				message: 'Target date must use YYYY-MM-DD format.'
			}
		});
		expect(controlPlaneState.saved).toBeNull();
	});

	it('attaches an uploaded file to the task artifact area', async () => {
		const form = new FormData();
		form.set('attachment', new File(['hello task'], 'brief.md', { type: 'text/markdown' }));

		const result = await actions.attachTaskFile({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'attachTaskFile',
				taskId: 'task_1',
				attachmentId: 'attachment_test'
			})
		);
		expect(mkdir).toHaveBeenCalledWith('/tmp/project/agent_output/task-attachments/task_1', {
			recursive: true
		});
		expect(writeFile).toHaveBeenCalledWith(
			'/tmp/project/agent_output/task-attachments/task_1/attachment_test-brief.md',
			expect.any(Buffer)
		);
		expect(controlPlaneState.saved?.tasks[0]?.attachments).toEqual([
			expect.objectContaining({
				id: 'attachment_test',
				name: 'brief.md',
				path: '/tmp/project/agent_output/task-attachments/task_1/attachment_test-brief.md',
				contentType: 'text/markdown',
				sizeBytes: 10
			})
		]);
	});

	it('starts a fresh task thread when the assigned thread no longer matches the project', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			tasks: [
				{
					...(controlPlaneState.current as ControlPlaneData).tasks[0]!,
					agentThreadId: 'session_stale',
					latestRunId: 'run_previous'
				}
			]
		};
		projectMatchesPath.mockReturnValue(false);
		getAgentSession.mockResolvedValue({
			id: 'session_stale',
			name: 'Work thread: Wrong Project',
			cwd: '/tmp/other-project',
			sandbox: 'workspace-write',
			model: null,
			threadId: 'thread_stale',
			archivedAt: null,
			createdAt: '2026-03-30T12:00:00.000Z',
			updatedAt: '2026-03-30T12:05:00.000Z',
			origin: 'managed',
			sessionState: 'ready',
			latestRunStatus: 'completed',
			hasActiveRun: false,
			canResume: true,
			runCount: 1,
			lastActivityAt: '2026-03-30T12:05:00.000Z',
			lastActivityLabel: 'just now',
			sessionSummary: 'The thread is idle and available for the next instruction.',
			lastExitCode: 0,
			runTimeline: [],
			relatedTasks: [],
			latestRun: null,
			runs: []
		});

		const result = await actions.launchTaskSession({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: new FormData()
			})
		} as never);

		expect(sendAgentSessionMessage).not.toHaveBeenCalled();
		expect(startAgentSession).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'Task thread · Attach a brief · Agent Management System Prototype · task_1',
				cwd: '/tmp/project',
				prompt: 'run the task'
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				agentThreadId: 'session_new',
				status: 'in_progress',
				latestRunId: 'run_test'
			})
		);
		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'launchTaskSession',
				taskId: 'task_1',
				sessionId: 'session_new'
			})
		);
	});

	it('injects retrieved published knowledge into the launch prompt context', async () => {
		loadRelevantSelfImprovementKnowledgeItems.mockResolvedValue([
			{
				id: 'knowledge_1',
				status: 'published',
				title: 'Failure recovery pattern',
				summary: 'Capture repeated launch failures as a reusable play.',
				category: 'reliability',
				projectId: 'project_1',
				projectName: 'Agent Management System Prototype',
				sourceOpportunityId: 'failed_runs:task_1',
				sourceTaskIds: ['task_1'],
				sourceRunIds: [],
				sourceSessionIds: [],
				sourceSignalIds: [],
				triggerPattern: 'Repeated launch or retry failures for the same task.',
				recommendedResponse: 'Add a preflight check before retrying the failing step.',
				applicabilityScope: ['Agent Management System Prototype'],
				createdAt: '2026-03-30T12:00:00.000Z',
				updatedAt: '2026-03-31T12:00:00.000Z',
				publishedAt: '2026-03-31T12:00:00.000Z',
				archivedAt: null,
				matchScore: 97,
				matchReasons: ['Matches this project.']
			}
		]);

		await actions.launchTaskSession({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: new FormData()
			})
		} as never);

		expect(buildTaskThreadPromptMock).toHaveBeenCalledWith(
			expect.objectContaining({
				relevantKnowledgeItems: [
					expect.objectContaining({
						id: 'knowledge_1',
						title: 'Failure recovery pattern'
					})
				]
			})
		);
	});

	it('reuses the latest compatible thread when no explicit thread is assigned', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			tasks: [
				{
					...(controlPlaneState.current as ControlPlaneData).tasks[0]!,
					agentThreadId: null,
					latestRunId: 'run_previous'
				}
			],
			runs: [
				{
					id: 'run_previous',
					taskId: 'task_1',
					workerId: null,
					providerId: 'provider_local_codex',
					status: 'completed',
					createdAt: '2026-03-30T12:10:00.000Z',
					updatedAt: '2026-03-30T12:15:00.000Z',
					startedAt: '2026-03-30T12:10:00.000Z',
					endedAt: '2026-03-30T12:15:00.000Z',
					threadId: 'thread_previous',
					agentThreadId: 'session_previous',
					promptDigest: 'digest_previous',
					artifactPaths: ['/tmp/project/agent_output'],
					summary: 'Completed previous run.',
					lastHeartbeatAt: '2026-03-30T12:15:00.000Z',
					errorSummary: ''
				}
			]
		};
		getAgentSession.mockResolvedValue({
			id: 'session_previous',
			name: 'Work thread: Previous Run',
			cwd: '/tmp/project',
			sandbox: 'workspace-write',
			model: null,
			threadId: 'thread_previous',
			archivedAt: null,
			createdAt: '2026-03-30T12:10:00.000Z',
			updatedAt: '2026-03-30T12:15:00.000Z',
			origin: 'managed',
			sessionState: 'ready',
			latestRunStatus: 'completed',
			hasActiveRun: false,
			canResume: true,
			runCount: 1,
			lastActivityAt: '2026-03-30T12:15:00.000Z',
			lastActivityLabel: 'just now',
			sessionSummary: 'The thread is idle and available for the next instruction.',
			lastExitCode: 0,
			runTimeline: [],
			relatedTasks: [],
			latestRun: null,
			runs: []
		});

		const result = await actions.launchTaskSession({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: new FormData()
			})
		} as never);

		expect(sendAgentSessionMessage).toHaveBeenCalledWith('session_previous', 'run the task');
		expect(startAgentSession).not.toHaveBeenCalled();
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				agentThreadId: 'session_previous',
				status: 'in_progress',
				latestRunId: 'run_test'
			})
		);
		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'launchTaskSession',
				taskId: 'task_1',
				sessionId: 'session_previous'
			})
		);
	});

	it('rejects launching a task when it already has an active run', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			runs: [
				{
					id: 'run_active',
					taskId: 'task_1',
					workerId: null,
					providerId: 'provider_local_codex',
					status: 'running',
					createdAt: '2026-03-30T12:10:00.000Z',
					updatedAt: '2026-03-30T12:10:00.000Z',
					startedAt: '2026-03-30T12:10:00.000Z',
					endedAt: null,
					threadId: 'thread_active',
					agentThreadId: 'session_active',
					promptDigest: 'digest_active',
					artifactPaths: ['/tmp/project/agent_output'],
					summary: 'Already running.',
					lastHeartbeatAt: '2026-03-30T12:10:00.000Z',
					errorSummary: ''
				}
			]
		};

		const result = await actions.launchTaskSession({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: new FormData()
			})
		} as never);

		expect(result).toMatchObject({
			status: 409,
			data: {
				message:
					'This task already has an active run. Open the current work thread or wait for it to finish before starting another run.'
			}
		});
		expect(createRun).not.toHaveBeenCalled();
		expect(sendAgentSessionMessage).not.toHaveBeenCalled();
		expect(startAgentSession).not.toHaveBeenCalled();
		expect(controlPlaneState.saved).toBeNull();
	});

	it('recovers a stale active run and requeues the task in the existing thread', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			tasks: [
				{
					...(controlPlaneState.current as ControlPlaneData).tasks[0]!,
					status: 'in_progress',
					agentThreadId: 'session_active',
					latestRunId: 'run_active',
					updatedAt: '2026-03-30T12:00:00.000Z'
				}
			],
			runs: [
				{
					id: 'run_active',
					taskId: 'task_1',
					workerId: null,
					providerId: 'provider_local_codex',
					status: 'running',
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z',
					startedAt: '2026-03-30T12:00:00.000Z',
					endedAt: null,
					threadId: 'thread_active',
					agentThreadId: 'session_active',
					promptDigest: 'digest_active',
					artifactPaths: ['/tmp/project/agent_output'],
					summary: 'Already running.',
					lastHeartbeatAt: '2026-03-30T12:00:00.000Z',
					errorSummary: ''
				}
			]
		};
		getAgentSession.mockResolvedValue({
			id: 'session_active',
			name: 'Task thread continuity',
			cwd: '/tmp/project',
			sandbox: 'workspace-write',
			model: null,
			threadId: 'thread_active',
			archivedAt: null,
			createdAt: '2026-03-30T11:55:00.000Z',
			updatedAt: '2026-03-30T12:00:00.000Z',
			origin: 'managed',
			sessionState: 'working',
			latestRunStatus: 'running',
			hasActiveRun: false,
			canResume: true,
			runCount: 1,
			lastActivityAt: '2026-03-30T12:00:00.000Z',
			lastActivityLabel: '30m ago',
			sessionSummary: 'Thread appears stalled.',
			lastExitCode: null,
			runTimeline: [],
			relatedTasks: [],
			latestRun: null,
			runs: []
		});
		recoverAgentSession.mockImplementation(async () => {
			controlPlaneState.current = {
				...(controlPlaneState.current as ControlPlaneData),
				tasks: [
					{
						...(controlPlaneState.current as ControlPlaneData).tasks[0]!,
						status: 'blocked',
						blockedReason: 'Recovered stalled run.',
						updatedAt: '2026-03-30T12:45:00.000Z'
					}
				],
				runs: (controlPlaneState.current as ControlPlaneData).runs.map((run) =>
					run.id === 'run_active'
						? {
								...run,
								status: 'failed',
								endedAt: '2026-03-30T12:45:00.000Z',
								updatedAt: '2026-03-30T12:45:00.000Z',
								errorSummary: 'Recovered stalled run.'
							}
						: run
				)
			};

			return {
				sessionId: 'session_active',
				runId: 'run_active',
				status: 'failed',
				signal: null,
				recoveredAt: '2026-03-30T12:45:00.000Z'
			};
		});

		const result = await actions.recoverTaskSession({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: new FormData()
			})
		} as never);

		expect(recoverAgentSession).toHaveBeenCalledWith('session_active');
		expect(sendAgentSessionMessage).toHaveBeenCalledWith('session_active', 'run the task');
		expect(startAgentSession).not.toHaveBeenCalled();
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				status: 'in_progress',
				blockedReason: '',
				agentThreadId: 'session_active',
				latestRunId: 'run_test'
			})
		);
		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'recoverTaskSession',
				taskId: 'task_1',
				sessionId: 'session_active'
			})
		);
	});

	it('rejects launching a task when the submitted status is not ready', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			tasks: [
				{
					...(controlPlaneState.current as ControlPlaneData).tasks[0]!,
					status: 'blocked'
				}
			]
		};

		const result = await actions.launchTaskSession({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: new FormData()
			})
		} as never);

		expect(result).toMatchObject({
			status: 409,
			data: {
				message: 'Only tasks in the Ready state can be run. Set the task status to Ready first.'
			}
		});
		expect(createRun).not.toHaveBeenCalled();
		expect(sendAgentSessionMessage).not.toHaveBeenCalled();
		expect(startAgentSession).not.toHaveBeenCalled();
		expect(controlPlaneState.saved).toBeNull();
	});

	it('rejects launching a task when the project root is not writable in the sandbox', async () => {
		getWorkspaceExecutionIssue.mockReturnValue(
			'Project root cannot be used with the workspace-write sandbox: /tmp/project. Operation not permitted (EPERM).'
		);

		const result = await actions.launchTaskSession({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: new FormData()
			})
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: {
				message:
					'Project root cannot be used with the workspace-write sandbox: /tmp/project. Operation not permitted (EPERM).'
			}
		});
		expect(startAgentSession).not.toHaveBeenCalled();
		expect(sendAgentSessionMessage).not.toHaveBeenCalled();
		expect(createRun).not.toHaveBeenCalled();
		expect(controlPlaneState.saved).toBeNull();
	});

	it('uses a worker thread sandbox override when starting a new task thread', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			roles: [
				{
					id: 'role_coordinator',
					name: 'Coordinator',
					lane: 'shared',
					description: 'Coordinates work'
				}
			],
			workers: [
				{
					id: 'worker_1',
					name: 'Local operator',
					providerId: 'provider_local_codex',
					roleId: 'role_coordinator',
					location: 'local',
					status: 'idle',
					capacity: 1,
					registeredAt: '2026-03-30T12:00:00.000Z',
					lastSeenAt: '2026-03-30T12:00:00.000Z',
					note: '',
					tags: [],
					threadSandboxOverride: 'danger-full-access',
					authTokenHash: ''
				}
			],
			tasks: [
				{
					...(controlPlaneState.current as ControlPlaneData).tasks[0]!,
					assigneeWorkerId: 'worker_1'
				}
			]
		};

		const form = new FormData();
		form.set('assigneeWorkerId', 'worker_1');

		await actions.launchTaskSession({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(startAgentSession).toHaveBeenCalledWith(
			expect.objectContaining({
				sandbox: 'danger-full-access'
			})
		);
	});

	it('prefers the project default sandbox over the provider default on the task detail page', async () => {
		(controlPlaneState.current as ControlPlaneData).projects[0]!.defaultThreadSandbox =
			'danger-full-access';
		(controlPlaneState.current as ControlPlaneData).providers[0]!.defaultThreadSandbox =
			'read-only';

		await actions.launchTaskSession({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: new FormData()
			})
		} as never);

		expect(startAgentSession).toHaveBeenCalledWith(
			expect.objectContaining({
				sandbox: 'danger-full-access'
			})
		);
	});
});
