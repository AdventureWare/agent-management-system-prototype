import { describe, expect, it, vi } from 'vitest';
import type { AgentRunDetail, AgentSessionDetail } from '$lib/types/agent-session';
import {
	deriveRunState,
	extractThreadIdFromOutputLine,
	isAbandonedSessionDetail,
	parseAgentSandbox,
	reconcileControlPlaneSessionMessage,
	reconcileControlPlaneSessionState
} from './agent-sessions';
import { buildSessionAttachmentPrompt } from './agent-session-attachments';
import { buildCodexArgs } from '../../../scripts/agent-session-runner-args.mjs';
import type { ControlPlaneData } from '$lib/types/control-plane';

describe('agent session helpers', () => {
	it('extracts thread ids from codex json lines', () => {
		expect(
			extractThreadIdFromOutputLine(
				'{"type":"thread.started","thread_id":"019d2d45-9094-7311-9d52-c2d5479c1368"}'
			)
		).toBe('019d2d45-9094-7311-9d52-c2d5479c1368');
	});

	it('ignores non-thread json lines and plain text logs', () => {
		expect(extractThreadIdFromOutputLine('{"type":"turn.started"}')).toBeNull();
		expect(extractThreadIdFromOutputLine('plain stderr line')).toBeNull();
	});

	it('parses sandbox values safely', () => {
		expect(parseAgentSandbox('read-only', 'workspace-write')).toBe('read-only');
		expect(parseAgentSandbox('unknown', 'workspace-write')).toBe('workspace-write');
	});

	it('keeps resume runs read-only by default', () => {
		expect(
			buildCodexArgs({
				mode: 'message',
				threadId: 'thread_123',
				sandbox: 'read-only',
				model: null,
				messagePath: '/tmp/last-message.txt',
				prompt: 'follow up'
			})
		).toEqual([
			'exec',
			'resume',
			'--json',
			'--skip-git-repo-check',
			'thread_123',
			'-o',
			'/tmp/last-message.txt',
			'follow up'
		]);
	});

	it('maps workspace-write resume runs to full-auto', () => {
		expect(
			buildCodexArgs({
				mode: 'message',
				threadId: 'thread_123',
				sandbox: 'workspace-write',
				model: 'gpt-5',
				messagePath: '/tmp/last-message.txt',
				prompt: 'follow up'
			})
		).toEqual([
			'exec',
			'resume',
			'--json',
			'--skip-git-repo-check',
			'--full-auto',
			'-m',
			'gpt-5',
			'thread_123',
			'-o',
			'/tmp/last-message.txt',
			'follow up'
		]);
	});

	it('maps danger-full-access resume runs to bypass approvals and sandbox', () => {
		expect(
			buildCodexArgs({
				mode: 'message',
				threadId: 'thread_123',
				sandbox: 'danger-full-access',
				model: null,
				messagePath: '/tmp/last-message.txt',
				prompt: 'follow up'
			})
		).toEqual([
			'exec',
			'resume',
			'--json',
			'--skip-git-repo-check',
			'--dangerously-bypass-approvals-and-sandbox',
			'thread_123',
			'-o',
			'/tmp/last-message.txt',
			'follow up'
		]);
	});

	it('keeps start runs on the explicit sandbox flag path', () => {
		expect(
			buildCodexArgs({
				mode: 'start',
				cwd: '/tmp/project',
				sandbox: 'workspace-write',
				model: null,
				messagePath: '/tmp/last-message.txt',
				prompt: 'start work'
			})
		).toEqual([
			'exec',
			'--json',
			'--skip-git-repo-check',
			'-C',
			'/tmp/project',
			'--sandbox',
			'workspace-write',
			'-o',
			'/tmp/last-message.txt',
			'start work'
		]);
	});

	it('downgrades stale pid-less active runs to failed state', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-30T21:10:00.000Z'));

		const run: AgentRunDetail = {
			id: 'run_stale',
			sessionId: 'session_stale',
			mode: 'start',
			prompt: 'start work',
			requestedThreadId: null,
			createdAt: '2026-03-30T21:00:00.000Z',
			updatedAt: '2026-03-30T21:00:00.000Z',
			logPath: '/tmp/codex.log',
			statePath: '/tmp/state.json',
			messagePath: '/tmp/last-message.txt',
			configPath: '/tmp/config.json',
			state: {
				status: 'queued',
				pid: null,
				startedAt: '2026-03-30T21:00:00.000Z',
				finishedAt: null,
				exitCode: null,
				signal: null,
				codexThreadId: null
			},
			lastMessage: null,
			logTail: [],
			activityAt: '2026-03-30T21:00:00.000Z'
		};

		expect(deriveRunState(run)).toEqual({
			status: 'failed',
			pid: null,
			startedAt: '2026-03-30T21:00:00.000Z',
			finishedAt: '2026-03-30T21:00:00.000Z',
			exitCode: -1,
			signal: null,
			codexThreadId: null
		});

		vi.useRealTimers();
	});

	it('downgrades stale follow-up runs even after a thread id was discovered', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-30T21:10:00.000Z'));

		const run: AgentRunDetail = {
			id: 'run_stale_followup',
			sessionId: 'session_stale',
			mode: 'message',
			prompt: 'follow up',
			requestedThreadId: 'thread_123',
			createdAt: '2026-03-30T21:00:00.000Z',
			updatedAt: '2026-03-30T21:00:00.000Z',
			logPath: '/tmp/codex.log',
			statePath: '/tmp/state.json',
			messagePath: '/tmp/last-message.txt',
			configPath: '/tmp/config.json',
			state: {
				status: 'queued',
				pid: null,
				startedAt: '2026-03-30T21:00:00.000Z',
				finishedAt: null,
				exitCode: null,
				signal: null,
				codexThreadId: 'thread_123'
			},
			lastMessage: null,
			logTail: [],
			activityAt: '2026-03-30T21:00:00.000Z'
		};

		expect(deriveRunState(run)).toEqual({
			status: 'failed',
			pid: null,
			startedAt: '2026-03-30T21:00:00.000Z',
			finishedAt: '2026-03-30T21:00:00.000Z',
			exitCode: -1,
			signal: null,
			codexThreadId: 'thread_123'
		});

		vi.useRealTimers();
	});

	it('builds follow-up prompts that include attached thread files as immediate context', () => {
		expect(
			buildSessionAttachmentPrompt({
				prompt: 'Use the brief and continue.',
				attachments: [
					{
						id: 'attachment_1',
						name: 'brief.md',
						path: '/tmp/session/attachments/brief.md',
						contentType: 'text/markdown',
						sizeBytes: 128,
						attachedAt: '2026-03-31T10:00:00.000Z'
					}
				],
				inlineAttachmentContents: [
					{
						attachment: {
							id: 'attachment_1',
							name: 'brief.md',
							path: '/tmp/session/attachments/brief.md',
							contentType: 'text/markdown',
							sizeBytes: 128,
							attachedAt: '2026-03-31T10:00:00.000Z'
						},
						content: '# Brief\nImportant context.'
					}
				]
			})
		).toContain('Treat them as immediate context for this run.');
		expect(
			buildSessionAttachmentPrompt({
				prompt: 'Use the brief and continue.',
				attachments: [
					{
						id: 'attachment_1',
						name: 'brief.md',
						path: '/tmp/session/attachments/brief.md',
						contentType: 'text/markdown',
						sizeBytes: 128,
						attachedAt: '2026-03-31T10:00:00.000Z'
					}
				],
				inlineAttachmentContents: [
					{
						attachment: {
							id: 'attachment_1',
							name: 'brief.md',
							path: '/tmp/session/attachments/brief.md',
							contentType: 'text/markdown',
							sizeBytes: 128,
							attachedAt: '2026-03-31T10:00:00.000Z'
						},
						content: '# Brief\nImportant context.'
					}
				]
			})
		).toContain('Path: /tmp/session/attachments/brief.md');
	});

	it('hides abandoned managed sessions that never produced a real thread', () => {
		const session: AgentSessionDetail = {
			id: 'session_stale',
			name: 'Task: Research Kwipoo competitors',
			cwd: '/tmp/project',
			sandbox: 'workspace-write',
			model: null,
			threadId: null,
			attachments: [],
			archivedAt: null,
			createdAt: '2026-03-27T23:47:36.683Z',
			updatedAt: '2026-03-27T23:47:36.683Z',
			origin: 'managed',
			sessionState: 'attention',
			latestRunStatus: 'failed',
			hasActiveRun: false,
			canResume: false,
			runCount: 1,
			lastActivityAt: '2026-03-27T23:47:36.683Z',
			lastActivityLabel: '3d ago',
			sessionSummary: 'The latest run failed. Check the recent log output.',
			lastExitCode: -1,
			runTimeline: [],
			relatedTasks: [],
			latestRun: {
				id: 'run_stale',
				sessionId: 'session_stale',
				mode: 'start',
				prompt: 'start work',
				requestedThreadId: null,
				createdAt: '2026-03-27T23:47:36.683Z',
				updatedAt: '2026-03-27T23:47:36.683Z',
				logPath: '/tmp/codex.log',
				statePath: '/tmp/state.json',
				messagePath: '/tmp/last-message.txt',
				configPath: '/tmp/config.json',
				state: {
					status: 'failed',
					pid: null,
					startedAt: '2026-03-27T23:47:36.780Z',
					finishedAt: '2026-03-27T23:47:36.780Z',
					exitCode: -1,
					signal: null,
					codexThreadId: null
				},
				lastMessage: null,
				logTail: [],
				activityAt: '2026-03-27T23:47:36.780Z'
			},
			runs: []
		};

		expect(isAbandonedSessionDetail(session)).toBe(true);
		expect(
			isAbandonedSessionDetail({
				...session,
				relatedTasks: [
					{
						id: 'task_1',
						title: 'Keep this visible',
						status: 'running',
						isPrimary: true
					}
				]
			})
		).toBe(false);
	});

	it('moves linked in-progress tasks to review when the session is ready for follow-up', () => {
		const data: ControlPlaneData = {
			providers: [],
			roles: [],
			projects: [],
			goals: [],
			workers: [],
			tasks: [
				{
					id: 'task_1',
					title: 'Review the output',
					summary: 'Wrap the task when the session is done.',
					projectId: 'project_1',
					lane: 'product',
					goalId: 'goal_1',
					priority: 'high',
					status: 'in_progress',
					riskLevel: 'medium',
					approvalMode: 'before_complete',
					requiresReview: true,
					desiredRoleId: 'role_app_worker',
					assigneeWorkerId: null,
					threadSessionId: 'session_1',
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 1,
					latestRunId: 'run_1',
					artifactPath: '/tmp/artifacts',
					attachments: [],
					createdAt: '2026-03-30T20:00:00.000Z',
					updatedAt: '2026-03-30T20:00:00.000Z'
				}
			],
			runs: [
				{
					id: 'run_1',
					taskId: 'task_1',
					workerId: null,
					providerId: null,
					status: 'running',
					createdAt: '2026-03-30T20:00:00.000Z',
					updatedAt: '2026-03-30T20:00:00.000Z',
					startedAt: '2026-03-30T20:00:00.000Z',
					endedAt: null,
					threadId: 'thread_1',
					sessionId: 'session_1',
					promptDigest: '',
					artifactPaths: [],
					summary: 'Running task.',
					lastHeartbeatAt: '2026-03-30T20:00:00.000Z',
					errorSummary: ''
				}
			],
			reviews: [],
			approvals: []
		};

		const next = reconcileControlPlaneSessionState(data, {
			id: 'session_1',
			hasActiveRun: false,
			canResume: true,
			latestRunStatus: 'completed',
			lastActivityAt: '2026-03-30T20:15:00.000Z'
		});

		expect(next.tasks[0]?.status).toBe('review');
		expect(next.runs[0]?.status).toBe('completed');
		expect(next.runs[0]?.endedAt).toBe('2026-03-30T20:15:00.000Z');
		expect(next.runs[0]?.summary).toBe('Task run finished and is ready for review.');
	});

	it('moves linked review tasks back to in progress when a follow-up message is queued', () => {
		const data: ControlPlaneData = {
			providers: [],
			roles: [],
			projects: [],
			goals: [],
			workers: [],
			tasks: [
				{
					id: 'task_1',
					title: 'Address review feedback',
					summary: 'Resume the linked task thread after review comments.',
					projectId: 'project_1',
					lane: 'product',
					goalId: 'goal_1',
					priority: 'high',
					status: 'review',
					riskLevel: 'medium',
					approvalMode: 'before_complete',
					requiresReview: true,
					desiredRoleId: 'role_app_worker',
					assigneeWorkerId: null,
					threadSessionId: 'session_1',
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 1,
					latestRunId: 'run_1',
					artifactPath: '/tmp/artifacts',
					attachments: [],
					createdAt: '2026-03-30T20:00:00.000Z',
					updatedAt: '2026-03-30T20:15:00.000Z'
				}
			],
			runs: [
				{
					id: 'run_1',
					taskId: 'task_1',
					workerId: null,
					providerId: null,
					status: 'completed',
					createdAt: '2026-03-30T20:00:00.000Z',
					updatedAt: '2026-03-30T20:15:00.000Z',
					startedAt: '2026-03-30T20:00:00.000Z',
					endedAt: '2026-03-30T20:15:00.000Z',
					threadId: 'thread_1',
					sessionId: 'session_1',
					promptDigest: '',
					artifactPaths: [],
					summary: 'Task run finished and is ready for review.',
					lastHeartbeatAt: '2026-03-30T20:15:00.000Z',
					errorSummary: ''
				}
			],
			reviews: [
				{
					id: 'review_1',
					taskId: 'task_1',
					runId: 'run_1',
					status: 'open',
					createdAt: '2026-03-30T20:15:00.000Z',
					updatedAt: '2026-03-30T20:15:00.000Z',
					resolvedAt: null,
					requestedByWorkerId: null,
					reviewerWorkerId: null,
					summary: 'Waiting on review.'
				}
			],
			approvals: [
				{
					id: 'approval_1',
					taskId: 'task_1',
					runId: 'run_1',
					mode: 'before_complete',
					status: 'pending',
					createdAt: '2026-03-30T20:15:00.000Z',
					updatedAt: '2026-03-30T20:15:00.000Z',
					resolvedAt: null,
					requestedByWorkerId: null,
					approverWorkerId: null,
					summary: 'Task requires approval before it can be closed out.'
				}
			]
		};

		const next = reconcileControlPlaneSessionMessage(
			data,
			'session_1',
			'2026-03-30T20:20:00.000Z'
		);

		expect(next.tasks[0]).toEqual(
			expect.objectContaining({
				id: 'task_1',
				status: 'in_progress',
				blockedReason: '',
				updatedAt: '2026-03-30T20:20:00.000Z'
			})
		);
		expect(next.runs[0]).toEqual(
			expect.objectContaining({
				id: 'run_1',
				status: 'running',
				summary: 'Queued follow-up work in the linked thread.',
				endedAt: null,
				lastHeartbeatAt: '2026-03-30T20:20:00.000Z'
			})
		);
		expect(next.reviews[0]).toEqual(
			expect.objectContaining({
				id: 'review_1',
				status: 'dismissed',
				resolvedAt: '2026-03-30T20:20:00.000Z'
			})
		);
		expect(next.approvals[0]).toEqual(
			expect.objectContaining({
				id: 'approval_1',
				status: 'canceled',
				resolvedAt: '2026-03-30T20:20:00.000Z'
			})
		);
	});
});
