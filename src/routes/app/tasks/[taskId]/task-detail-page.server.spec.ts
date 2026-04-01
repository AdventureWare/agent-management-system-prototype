import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';

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
			sessionId: input.sessionId,
			promptDigest: input.promptDigest,
			artifactPaths: input.artifactPaths,
			summary: input.summary,
			lastHeartbeatAt: input.lastHeartbeatAt,
			errorSummary: ''
		})
	)
);

const projectMatchesPath = vi.hoisted(() => vi.fn(() => true));
const getAgentSession = vi.hoisted(() => vi.fn());
const sendAgentSessionMessage = vi.hoisted(() => vi.fn());
const startAgentSession = vi.hoisted(() =>
	vi.fn(async () => ({
		sessionId: 'session_new',
		runId: 'run_new'
	}))
);

const controlPlaneState = vi.hoisted(() => ({
	current: null as ControlPlaneData | null,
	saved: null as ControlPlaneData | null
}));

vi.mock('node:fs', () => ({
	existsSync
}));

vi.mock('node:fs/promises', () => ({
	mkdir,
	writeFile
}));

vi.mock('$lib/server/control-plane', () => ({
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
		(input: { worker?: { threadSandboxOverride: string | null } | null; provider?: { defaultThreadSandbox: string } | null }) =>
			input.worker?.threadSandboxOverride ?? input.provider?.defaultThreadSandbox ?? 'workspace-write'
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
		controlPlaneState.saved = updater(controlPlaneState.current as ControlPlaneData);
		controlPlaneState.current = controlPlaneState.saved;
		return controlPlaneState.saved;
	})
}));

vi.mock('$lib/server/agent-sessions', () => ({
	cancelAgentSession: vi.fn(),
	getAgentSession,
	listAgentSessions: vi.fn(async () => []),
	sendAgentSessionMessage,
	startAgentSession
}));

vi.mock('$lib/server/task-threads', () => ({
	buildPromptDigest: vi.fn(() => 'digest_test'),
	buildTaskThreadName: vi.fn(
		(input: { projectName: string; taskName: string; taskId: string }) =>
			`Task thread · ${input.taskName} · ${input.projectName} · ${input.taskId}`
	),
	buildTaskThreadPrompt: vi.fn(() => 'run the task')
}));

vi.mock('$lib/task-thread-context', () => ({
	selectTaskThreadContext: vi.fn(() => ({
		linkThread: null,
		linkThreadKind: 'assigned',
		statusThread: null
	}))
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
		getAgentSession.mockReset();
		getAgentSession.mockResolvedValue(null);
		sendAgentSessionMessage.mockReset();
		startAgentSession.mockReset();
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
			roles: [],
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
			goals: [],
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
					threadSessionId: null,
					blockedReason: '',
					dependencyTaskIds: [],
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
					threadSessionId: 'session_stale',
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
				threadSessionId: 'session_new',
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
					sessionId: 'session_active',
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
});
