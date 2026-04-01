import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';

const controlPlaneState = vi.hoisted(() => ({
	current: null as ControlPlaneData | null,
	saved: null as ControlPlaneData | null
}));

const getAgentSession = vi.hoisted(() => vi.fn());
const updateAgentSessionSandbox = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/agent-sessions', () => ({
	getAgentSession,
	parseAgentSandbox: vi.fn((value: string | null | undefined, fallback: string) => value ?? fallback),
	updateAgentSessionSandbox
}));

vi.mock('$lib/server/control-plane', () => ({
	createApproval: vi.fn((input: { taskId: string; runId?: string | null; mode: string; status?: string; resolvedAt?: string | null; summary?: string }) => ({
		id: 'approval_created',
		taskId: input.taskId,
		runId: input.runId ?? null,
		mode: input.mode,
		status: input.status ?? 'pending',
		createdAt: '2026-03-31T12:00:00.000Z',
		updatedAt: '2026-03-31T12:00:00.000Z',
		resolvedAt: input.resolvedAt ?? null,
		requestedByWorkerId: null,
		approverWorkerId: null,
		summary: input.summary ?? ''
	})),
	createReview: vi.fn((input: { taskId: string; runId?: string | null; status?: string; resolvedAt?: string | null; summary?: string }) => ({
		id: 'review_created',
		taskId: input.taskId,
		runId: input.runId ?? null,
		status: input.status ?? 'open',
		createdAt: '2026-03-31T12:00:00.000Z',
		updatedAt: '2026-03-31T12:00:00.000Z',
		resolvedAt: input.resolvedAt ?? null,
		requestedByWorkerId: null,
		reviewerWorkerId: null,
		summary: input.summary ?? ''
	})),
	getOpenReviewForTask: vi.fn((data: ControlPlaneData, taskId: string) =>
		data.reviews.find((review) => review.taskId === taskId && review.status === 'open') ?? null
	),
	getPendingApprovalForTask: vi.fn((data: ControlPlaneData, taskId: string) =>
		data.approvals.find((approval) => approval.taskId === taskId && approval.status === 'pending') ??
		null
	),
	loadControlPlane: vi.fn(async () => controlPlaneState.current),
	updateControlPlane: vi.fn(async (updater: (data: ControlPlaneData) => ControlPlaneData) => {
		controlPlaneState.saved = updater(controlPlaneState.current as ControlPlaneData);
		controlPlaneState.current = controlPlaneState.saved;
		return controlPlaneState.saved;
	})
}));

import { actions } from './+page.server';

describe('session detail page server actions', () => {
	beforeEach(() => {
		controlPlaneState.current = {
			providers: [],
			roles: [],
			projects: [],
			goals: [],
			workers: [],
			tasks: [
				{
					id: 'task_1',
					title: 'Approve thread output',
					summary: 'Review the implementation and close the task.',
					projectId: 'project_1',
					lane: 'product',
					goalId: '',
					priority: 'medium',
					status: 'review',
					riskLevel: 'medium',
					approvalMode: 'before_complete',
					requiresReview: true,
					desiredRoleId: 'role_builder',
					assigneeWorkerId: null,
					threadSessionId: 'session_1',
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 1,
					latestRunId: 'run_1',
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-03-31T11:00:00.000Z',
					updatedAt: '2026-03-31T11:30:00.000Z'
				}
			],
			runs: [
				{
					id: 'run_1',
					taskId: 'task_1',
					workerId: null,
					providerId: null,
					status: 'running',
					createdAt: '2026-03-31T11:00:00.000Z',
					updatedAt: '2026-03-31T11:30:00.000Z',
					startedAt: '2026-03-31T11:01:00.000Z',
					endedAt: null,
					threadId: 'thread_1',
					sessionId: 'session_1',
					promptDigest: 'digest_1',
					artifactPaths: ['/tmp/project/agent_output'],
					summary: 'Agent is working.',
					lastHeartbeatAt: '2026-03-31T11:30:00.000Z',
					errorSummary: ''
				}
			],
			reviews: [
				{
					id: 'review_1',
					taskId: 'task_1',
					runId: 'run_1',
					status: 'open',
					createdAt: '2026-03-31T11:15:00.000Z',
					updatedAt: '2026-03-31T11:15:00.000Z',
					resolvedAt: null,
					requestedByWorkerId: null,
					reviewerWorkerId: null,
					summary: 'Waiting on a final approval.'
				}
			],
			approvals: [
				{
					id: 'approval_1',
					taskId: 'task_1',
					runId: 'run_1',
					mode: 'before_complete',
					status: 'pending',
					createdAt: '2026-03-31T11:20:00.000Z',
					updatedAt: '2026-03-31T11:20:00.000Z',
					resolvedAt: null,
					requestedByWorkerId: null,
					approverWorkerId: null,
					summary: 'Needs sign-off before the task is closed.'
				}
			]
		};
		controlPlaneState.saved = null;
		getAgentSession.mockReset();
		updateAgentSessionSandbox.mockReset();
		getAgentSession.mockResolvedValue({
			id: 'session_1',
			name: 'Task thread',
			cwd: '/tmp/project',
			sandbox: 'workspace-write',
			model: 'gpt-5.4',
			origin: 'managed',
			threadId: 'thread_1',
			attachments: [],
			archivedAt: null,
			createdAt: '2026-03-31T11:00:00.000Z',
			updatedAt: '2026-03-31T11:35:00.000Z',
			sessionState: 'ready',
			latestRunStatus: 'completed',
			hasActiveRun: false,
			canResume: true,
			runCount: 1,
			lastActivityAt: '2026-03-31T11:35:00.000Z',
			lastActivityLabel: 'just now',
			sessionSummary: 'Available for review.',
			lastExitCode: 0,
			runTimeline: [],
			relatedTasks: [
				{
					id: 'task_1',
					title: 'Approve thread output',
					status: 'review',
					isPrimary: true
				}
			],
			latestRun: {
				id: 'run_agent_1',
				sessionId: 'session_1',
				mode: 'start',
				prompt: 'Implement the feature.',
				requestedThreadId: null,
				createdAt: '2026-03-31T11:00:00.000Z',
				updatedAt: '2026-03-31T11:35:00.000Z',
				logPath: '/tmp/run.log',
				statePath: '/tmp/run-state.json',
				messagePath: '/tmp/run-message.txt',
				configPath: '/tmp/run-config.json',
				state: {
					status: 'completed',
					pid: null,
					startedAt: '2026-03-31T11:01:00.000Z',
					finishedAt: '2026-03-31T11:35:00.000Z',
					exitCode: 0,
					signal: null,
					codexThreadId: 'thread_1'
				},
				lastMessage: 'Implemented the requested flow.',
				logTail: [],
				activityAt: '2026-03-31T11:35:00.000Z'
			},
			runs: []
		});
	});

	it('approves the thread response and completes the linked task', async () => {
		const result = await actions.approveTaskResponse({
			params: { sessionId: 'session_1' },
			request: new Request('http://localhost/app/sessions/session_1', { method: 'POST' })
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'approveTaskResponse',
				taskId: 'task_1'
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				id: 'task_1',
				status: 'done',
				blockedReason: ''
			})
		);
		expect(controlPlaneState.saved?.runs[0]).toEqual(
			expect.objectContaining({
				id: 'run_1',
				status: 'completed',
				summary: 'Task approved and completed from the thread detail page.'
			})
		);
		expect(controlPlaneState.saved?.reviews[0]).toEqual(
			expect.objectContaining({
				id: 'review_1',
				status: 'approved'
			})
		);
		expect(controlPlaneState.saved?.approvals[0]).toEqual(
			expect.objectContaining({
				id: 'approval_1',
				status: 'approved'
			})
		);
	});

	it('updates the thread sandbox for future follow-up runs', async () => {
		const form = new FormData();
		form.set('sandbox', 'danger-full-access');

		const result = await actions.updateSessionSandbox({
			params: { sessionId: 'session_1' },
			request: new Request('http://localhost/app/sessions/session_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(updateAgentSessionSandbox).toHaveBeenCalledWith('session_1', 'danger-full-access');
		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'updateSessionSandbox',
				sessionId: 'session_1'
			})
		);
	});

	it('rejects approval while the thread still has active work', async () => {
		getAgentSession.mockResolvedValue({
			id: 'session_1',
			name: 'Task thread',
			cwd: '/tmp/project',
			sandbox: 'workspace-write',
			model: 'gpt-5.4',
			origin: 'managed',
			threadId: 'thread_1',
			attachments: [],
			archivedAt: null,
			createdAt: '2026-03-31T11:00:00.000Z',
			updatedAt: '2026-03-31T11:35:00.000Z',
			sessionState: 'working',
			latestRunStatus: 'running',
			hasActiveRun: true,
			canResume: false,
			runCount: 1,
			lastActivityAt: '2026-03-31T11:35:00.000Z',
			lastActivityLabel: 'just now',
			sessionSummary: 'Still running.',
			lastExitCode: null,
			runTimeline: [],
			relatedTasks: [],
			latestRun: {
				id: 'run_agent_1',
				sessionId: 'session_1',
				mode: 'start',
				prompt: 'Implement the feature.',
				requestedThreadId: null,
				createdAt: '2026-03-31T11:00:00.000Z',
				updatedAt: '2026-03-31T11:35:00.000Z',
				logPath: '/tmp/run.log',
				statePath: '/tmp/run-state.json',
				messagePath: '/tmp/run-message.txt',
				configPath: '/tmp/run-config.json',
				state: {
					status: 'running',
					pid: 123,
					startedAt: '2026-03-31T11:01:00.000Z',
					finishedAt: null,
					exitCode: null,
					signal: null,
					codexThreadId: 'thread_1'
				},
				lastMessage: null,
				logTail: [],
				activityAt: '2026-03-31T11:35:00.000Z'
			},
			runs: []
		});

		const result = await actions.approveTaskResponse({
			params: { sessionId: 'session_1' },
			request: new Request('http://localhost/app/sessions/session_1', { method: 'POST' })
		} as never);

		expect(result).toMatchObject({
			status: 409,
			data: {
				message: 'Wait for the active run to finish before approving this thread response.'
			}
		});
		expect(controlPlaneState.saved).toBeNull();
	});
});
