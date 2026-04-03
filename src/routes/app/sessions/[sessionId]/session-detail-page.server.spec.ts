import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';

const controlPlaneState = vi.hoisted(() => ({
	current: null as ControlPlaneData | null,
	saved: null as ControlPlaneData | null
}));

const getAgentThread = vi.hoisted(() => vi.fn());
const recoverAgentThread = vi.hoisted(() => vi.fn());
const sendAgentThreadMessage = vi.hoisted(() => vi.fn());
const startAgentThread = vi.hoisted(() =>
	vi.fn(async () => ({
		sessionId: 'session_replacement',
		runId: 'run_replacement'
	}))
);
const updateAgentThreadSandbox = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/agent-threads', () => ({
	getAgentThread,
	parseAgentSandbox: vi.fn(
		(value: string | null | undefined, fallback: string) => value ?? fallback
	),
	recoverAgentThread,
	sendAgentThreadMessage,
	startAgentThread,
	updateAgentThreadSandbox
}));

vi.mock('$lib/server/control-plane', () => ({
	createApproval: vi.fn(
		(input: {
			taskId: string;
			runId?: string | null;
			mode: string;
			status?: string;
			resolvedAt?: string | null;
			summary?: string;
		}) => ({
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
		})
	),
	createDecision: vi.fn(
		(input: {
			taskId?: string | null;
			decisionType: string;
			summary: string;
			createdAt?: string;
		}) => ({
			id: 'decision_created',
			taskId: input.taskId ?? null,
			goalId: null,
			runId: null,
			reviewId: null,
			approvalId: null,
			planningSessionId: null,
			decisionType: input.decisionType,
			summary: input.summary,
			createdAt: input.createdAt ?? '2026-03-31T12:00:00.000Z',
			decidedByWorkerId: null
		})
	),
	createRun: vi.fn(
		(input: {
			taskId: string;
			workerId?: string | null;
			providerId?: string | null;
			status?: string;
			startedAt?: string | null;
			endedAt?: string | null;
			threadId?: string | null;
			sessionId?: string | null;
			promptDigest?: string;
			artifactPaths?: string[];
			summary?: string;
			lastHeartbeatAt?: string | null;
			errorSummary?: string;
		}) => ({
			id: `run_created_${input.taskId}`,
			taskId: input.taskId,
			workerId: input.workerId ?? null,
			providerId: input.providerId ?? null,
			status: input.status ?? 'queued',
			createdAt: '2026-03-31T12:00:00.000Z',
			updatedAt: '2026-03-31T12:00:00.000Z',
			startedAt: input.startedAt ?? null,
			endedAt: input.endedAt ?? null,
			threadId: input.threadId ?? null,
			sessionId: input.sessionId ?? null,
			promptDigest: input.promptDigest ?? '',
			artifactPaths: input.artifactPaths ?? [],
			summary: input.summary ?? '',
			lastHeartbeatAt: input.lastHeartbeatAt ?? null,
			errorSummary: input.errorSummary ?? ''
		})
	),
	createReview: vi.fn(
		(input: {
			taskId: string;
			runId?: string | null;
			status?: string;
			resolvedAt?: string | null;
			summary?: string;
		}) => ({
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
		})
	),
	getOpenReviewForTask: vi.fn(
		(data: ControlPlaneData, taskId: string) =>
			data.reviews.find((review) => review.taskId === taskId && review.status === 'open') ?? null
	),
	getPendingApprovalForTask: vi.fn(
		(data: ControlPlaneData, taskId: string) =>
			data.approvals.find(
				(approval) => approval.taskId === taskId && approval.status === 'pending'
			) ?? null
	),
	loadControlPlane: vi.fn(async () => controlPlaneState.current),
	updateControlPlane: vi.fn(async (updater: (data: ControlPlaneData) => ControlPlaneData) => {
		controlPlaneState.saved = updater(controlPlaneState.current as ControlPlaneData);
		controlPlaneState.current = controlPlaneState.saved;
		return controlPlaneState.saved;
	})
}));

import { actions, load } from './+page.server';

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
		getAgentThread.mockReset();
		recoverAgentThread.mockReset();
		sendAgentThreadMessage.mockReset();
		startAgentThread.mockReset();
		updateAgentThreadSandbox.mockReset();
		recoverAgentThread.mockResolvedValue({
			sessionId: 'session_1',
			runId: 'run_agent_1',
			status: 'canceled',
			signal: 'SIGTERM',
			recoveredAt: '2026-03-31T11:36:00.000Z'
		});
		sendAgentThreadMessage.mockResolvedValue({
			sessionId: 'session_1',
			runId: 'run_agent_retry'
		});
		startAgentThread.mockResolvedValue({
			sessionId: 'session_replacement',
			runId: 'run_replacement'
		});
		getAgentThread.mockResolvedValue({
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
		expect(controlPlaneState.saved?.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_1',
				decisionType: 'task_completed'
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

		expect(updateAgentThreadSandbox).toHaveBeenCalledWith('session_1', 'danger-full-access');
		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'updateSessionSandbox',
				sessionId: 'session_1'
			})
		);
	});

	it('rejects approval while the thread still has active work', async () => {
		getAgentThread.mockResolvedValue({
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

	it('re-queues the latest request in the same thread during recovery', async () => {
		getAgentThread
			.mockResolvedValueOnce({
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
				sessionState: 'attention',
				latestRunStatus: 'failed',
				hasActiveRun: false,
				canResume: true,
				runCount: 1,
				lastActivityAt: '2026-03-31T11:35:00.000Z',
				lastActivityLabel: 'just now',
				sessionSummary: 'The latest run failed.',
				lastExitCode: 1,
				runTimeline: [],
				relatedTasks: [
					{
						id: 'task_1',
						title: 'Approve thread output',
						status: 'blocked',
						isPrimary: true
					}
				],
				latestRun: {
					id: 'run_agent_1',
					sessionId: 'session_1',
					mode: 'message',
					prompt: 'Retry the implementation.',
					requestedThreadId: 'thread_1',
					createdAt: '2026-03-31T11:00:00.000Z',
					updatedAt: '2026-03-31T11:35:00.000Z',
					logPath: '/tmp/run.log',
					statePath: '/tmp/run-state.json',
					messagePath: '/tmp/run-message.txt',
					configPath: '/tmp/run-config.json',
					state: {
						status: 'failed',
						pid: null,
						startedAt: '2026-03-31T11:01:00.000Z',
						finishedAt: '2026-03-31T11:35:00.000Z',
						exitCode: 1,
						signal: null,
						codexThreadId: 'thread_1'
					},
					lastMessage: null,
					logTail: ['Build failed.'],
					activityAt: '2026-03-31T11:35:00.000Z'
				},
				runs: []
			})
			.mockResolvedValueOnce({
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
				updatedAt: '2026-03-31T11:36:00.000Z',
				sessionState: 'ready',
				latestRunStatus: 'failed',
				hasActiveRun: false,
				canResume: true,
				runCount: 1,
				lastActivityAt: '2026-03-31T11:36:00.000Z',
				lastActivityLabel: 'just now',
				sessionSummary: 'Available again.',
				lastExitCode: 1,
				runTimeline: [],
				relatedTasks: [
					{
						id: 'task_1',
						title: 'Approve thread output',
						status: 'blocked',
						isPrimary: true
					}
				],
				latestRun: {
					id: 'run_agent_1',
					sessionId: 'session_1',
					mode: 'message',
					prompt: 'Retry the implementation.',
					requestedThreadId: 'thread_1',
					createdAt: '2026-03-31T11:00:00.000Z',
					updatedAt: '2026-03-31T11:35:00.000Z',
					logPath: '/tmp/run.log',
					statePath: '/tmp/run-state.json',
					messagePath: '/tmp/run-message.txt',
					configPath: '/tmp/run-config.json',
					state: {
						status: 'failed',
						pid: null,
						startedAt: '2026-03-31T11:01:00.000Z',
						finishedAt: '2026-03-31T11:35:00.000Z',
						exitCode: 1,
						signal: null,
						codexThreadId: 'thread_1'
					},
					lastMessage: null,
					logTail: ['Build failed.'],
					activityAt: '2026-03-31T11:35:00.000Z'
				},
				runs: []
			});
		controlPlaneState.current = {
			...controlPlaneState.current!,
			tasks: [
				{
					...controlPlaneState.current!.tasks[0],
					status: 'blocked',
					blockedReason: 'Build failed.'
				}
			],
			runs: [
				{
					...controlPlaneState.current!.runs[0],
					status: 'failed',
					errorSummary: 'Build failed.',
					endedAt: '2026-03-31T11:35:00.000Z'
				}
			]
		};

		const result = await actions.recoverSessionThread({
			params: { sessionId: 'session_1' },
			request: new Request('http://localhost/app/sessions/session_1', { method: 'POST' })
		} as never);

		expect(sendAgentThreadMessage).toHaveBeenCalledWith('session_1', 'Retry the implementation.');
		expect(recoverAgentThread).not.toHaveBeenCalled();
		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'recoverSessionThread',
				sessionId: 'session_1'
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				id: 'task_1',
				threadSessionId: 'session_1',
				status: 'in_progress',
				blockedReason: ''
			})
		);
		expect(controlPlaneState.saved?.runs[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_1',
				sessionId: 'session_1',
				status: 'running',
				summary: 'Recovered the work thread and re-queued the latest request.'
			})
		);
		expect(controlPlaneState.saved?.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_1',
				decisionType: 'task_recovered'
			})
		);
	});

	it('moves the latest request into a fresh thread and carries the task forward', async () => {
		getAgentThread.mockResolvedValue({
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
			sessionState: 'attention',
			latestRunStatus: 'failed',
			hasActiveRun: false,
			canResume: true,
			runCount: 1,
			lastActivityAt: '2026-03-31T11:35:00.000Z',
			lastActivityLabel: 'just now',
			sessionSummary: 'The latest run failed.',
			lastExitCode: 1,
			runTimeline: [],
			relatedTasks: [
				{
					id: 'task_1',
					title: 'Approve thread output',
					status: 'blocked',
					isPrimary: true
				}
			],
			latestRun: {
				id: 'run_agent_1',
				sessionId: 'session_1',
				mode: 'message',
				prompt: 'Retry the implementation in a clean thread.',
				requestedThreadId: 'thread_1',
				createdAt: '2026-03-31T11:00:00.000Z',
				updatedAt: '2026-03-31T11:35:00.000Z',
				logPath: '/tmp/run.log',
				statePath: '/tmp/run-state.json',
				messagePath: '/tmp/run-message.txt',
				configPath: '/tmp/run-config.json',
				state: {
					status: 'failed',
					pid: null,
					startedAt: '2026-03-31T11:01:00.000Z',
					finishedAt: '2026-03-31T11:35:00.000Z',
					exitCode: 1,
					signal: null,
					codexThreadId: 'thread_1'
				},
				lastMessage: null,
				logTail: ['Build failed.'],
				activityAt: '2026-03-31T11:35:00.000Z'
			},
			runs: []
		});
		controlPlaneState.current = {
			...controlPlaneState.current!,
			tasks: [
				{
					...controlPlaneState.current!.tasks[0],
					status: 'blocked',
					blockedReason: 'Build failed.'
				}
			],
			runs: [
				{
					...controlPlaneState.current!.runs[0],
					status: 'failed',
					errorSummary: 'Build failed.',
					endedAt: '2026-03-31T11:35:00.000Z'
				}
			]
		};

		const result = await actions.moveLatestRequestToNewThread({
			params: { sessionId: 'session_1' },
			request: new Request('http://localhost/app/sessions/session_1', { method: 'POST' })
		} as never);

		expect(startAgentThread).toHaveBeenCalledWith({
			name: 'Task thread',
			cwd: '/tmp/project',
			prompt: 'Retry the implementation in a clean thread.',
			sandbox: 'workspace-write',
			model: 'gpt-5.4'
		});
		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'moveLatestRequestToNewThread',
				sessionId: 'session_replacement',
				previousSessionId: 'session_1'
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				id: 'task_1',
				threadSessionId: 'session_replacement',
				status: 'in_progress',
				blockedReason: ''
			})
		);
		expect(controlPlaneState.saved?.runs[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_1',
				sessionId: 'session_replacement',
				status: 'running',
				summary: 'Moved the latest request into a new work thread.'
			})
		);
		expect(controlPlaneState.saved?.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_1',
				decisionType: 'task_recovered',
				summary: expect.stringContaining('session_replacement')
			})
		);
	});

	it('returns task resource context artifacts for the response panel', async () => {
		controlPlaneState.current = {
			...controlPlaneState.current!,
			tasks: [
				{
					...controlPlaneState.current!.tasks[0],
					attachments: [
						{
							id: 'attachment_1',
							name: 'response-summary.md',
							path: '/tmp/project/agent_output/task-attachments/task_1/response-summary.md',
							contentType: 'text/markdown',
							sizeBytes: 320,
							attachedAt: '2026-03-31T11:10:00.000Z'
						}
					]
				}
			]
		};

		const result = await load({
			params: { sessionId: 'session_1' }
		} as never);

		expect(result).toBeTruthy();

		if (!result) {
			throw new Error('Expected load result.');
		}

		expect(result.responseContextArtifacts).toEqual(
			expect.arrayContaining([
				{
					path: '/tmp/project/agent_output',
					label: 'Approve thread output',
					href: '/app/tasks/task_1#resources',
					sourceLabel: 'Task outputs',
					actionLabel: 'Open task'
				},
				{
					path: '/tmp/project/agent_output/task-attachments/task_1/response-summary.md',
					label: 'response-summary.md',
					href: '/app/tasks/task_1#resources',
					sourceLabel: 'Task attachment',
					actionLabel: 'Open task'
				}
			])
		);
	});
});
