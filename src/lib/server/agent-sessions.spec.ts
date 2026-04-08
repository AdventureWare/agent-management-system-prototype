import { describe, expect, it, vi } from 'vitest';
import type { AgentRunDetail, AgentThreadDetail } from '$lib/types/agent-thread';
import {
	buildAgentThreadContactLabel,
	buildAgentThreadContactPrompt,
	buildAgentThreadHandle,
	deriveRunState,
	extractThreadIdFromOutputLine,
	isAbandonedThreadDetail,
	normalizeAgentThreadHandleAlias,
	parseAgentSandbox,
	rankAgentThreadsForRouting,
	reconcileControlPlaneThreadMessage,
	reconcileControlPlaneThreadState
} from './agent-threads';
import { buildThreadAttachmentPrompt } from './agent-thread-attachments';
import { buildCodexArgs } from '../../../scripts/agent-thread-runner-args.mjs';
import type { ControlPlaneData } from '$lib/types/control-plane';

function buildAgentThreadDetailFixture(
	overrides: Partial<AgentThreadDetail> & Pick<AgentThreadDetail, 'id' | 'name'>
): AgentThreadDetail {
	return {
		id: overrides.id,
		name: overrides.name,
		cwd: overrides.cwd ?? '/tmp/agent-management-system-prototype',
		additionalWritableRoots: [],
		sandbox: 'workspace-write',
		model: null,
		threadId: overrides.threadId ?? `codex_${overrides.id}`,
		attachments: [],
		archivedAt: overrides.archivedAt ?? null,
		createdAt: overrides.createdAt ?? '2026-04-07T12:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-04-07T12:05:00.000Z',
		origin: overrides.origin ?? 'managed',
		handle: overrides.handle ?? `${overrides.id}.handle`,
		contactLabel: overrides.contactLabel ?? overrides.name,
		routingScore: overrides.routingScore,
		routingReason: overrides.routingReason,
		topicLabels: overrides.topicLabels ?? [],
		categorization: overrides.categorization,
		threadState: overrides.threadState ?? 'ready',
		latestRunStatus: overrides.latestRunStatus ?? 'completed',
		hasActiveRun: overrides.hasActiveRun ?? false,
		canResume: overrides.canResume ?? true,
		runCount: overrides.runCount ?? 1,
		lastActivityAt: overrides.lastActivityAt ?? '2026-04-07T12:05:00.000Z',
		lastActivityLabel: overrides.lastActivityLabel ?? 'just now',
		threadSummary: overrides.threadSummary ?? 'Ready for follow-up.',
		lastExitCode: overrides.lastExitCode ?? 0,
		runTimeline: overrides.runTimeline ?? [],
		relatedTasks: overrides.relatedTasks ?? [],
		latestRun: overrides.latestRun ?? null,
		runs: overrides.runs ?? []
	};
}

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
			'--disable',
			'apps',
			'-c',
			'mcp_servers.supabase.enabled=false',
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
			'--disable',
			'apps',
			'-c',
			'mcp_servers.supabase.enabled=false',
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
			'--disable',
			'apps',
			'-c',
			'mcp_servers.supabase.enabled=false',
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
				additionalWritableRoots: ['/tmp/iCloud/shared', '/tmp/dropbox'],
				sandbox: 'workspace-write',
				model: null,
				messagePath: '/tmp/last-message.txt',
				prompt: 'start work'
			})
		).toEqual([
			'exec',
			'--json',
			'--skip-git-repo-check',
			'--disable',
			'apps',
			'-c',
			'mcp_servers.supabase.enabled=false',
			'-C',
			'/tmp/project',
			'--sandbox',
			'workspace-write',
			'--add-dir',
			'/tmp/iCloud/shared',
			'--add-dir',
			'/tmp/dropbox',
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
			agentThreadId: 'session_stale',
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
			agentThreadId: 'session_stale',
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

	it('keeps auth refresh startup noise running during the initial grace window', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-04-01T16:14:20.000Z'));

		const run: AgentRunDetail = {
			id: 'run_auth_failure',
			agentThreadId: 'session_auth_failure',
			mode: 'start',
			prompt: 'start work',
			requestedThreadId: null,
			createdAt: '2026-04-01T16:14:14.718Z',
			updatedAt: '2026-04-01T16:14:15.667Z',
			logPath: '/tmp/codex.log',
			statePath: '/tmp/state.json',
			messagePath: '/tmp/last-message.txt',
			configPath: '/tmp/config.json',
			state: {
				status: 'running',
				pid: 76910,
				startedAt: '2026-04-01T16:14:14.718Z',
				finishedAt: null,
				exitCode: null,
				signal: null,
				codexThreadId: null
			},
			lastMessage: null,
			logTail: [
				'=== 2026-04-01T16:14:14.721Z START ===',
				'cwd=/Users/colinfreed/Projects/Experiments/agent-management-system-prototype',
				'Reading additional input from stdin...',
				'2026-04-01T16:14:15.667723Z ERROR rmcp::transport::worker: worker quit with fatal: Transport channel closed, when Auth(TokenRefreshFailed("Failed to parse server response"))'
			],
			activityAt: '2026-04-01T16:14:15.667Z'
		};

		expect(deriveRunState(run)).toEqual({
			status: 'running',
			pid: 76910,
			startedAt: '2026-04-01T16:14:14.718Z',
			finishedAt: null,
			exitCode: null,
			signal: null,
			codexThreadId: null
		});

		vi.useRealTimers();
	});

	it('marks fresh thread launches as failed when auth refresh dies before thread startup', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-04-01T16:15:00.000Z'));

		const run: AgentRunDetail = {
			id: 'run_auth_start_failed',
			agentThreadId: 'session_auth_start_failed',
			mode: 'start',
			prompt: 'start work',
			requestedThreadId: null,
			createdAt: '2026-04-01T16:14:14.718Z',
			updatedAt: '2026-04-01T16:14:15.667Z',
			logPath: '/tmp/codex.log',
			statePath: '/tmp/state.json',
			messagePath: '/tmp/last-message.txt',
			configPath: '/tmp/config.json',
			state: {
				status: 'running',
				pid: 76910,
				startedAt: '2026-04-01T16:14:14.718Z',
				finishedAt: null,
				exitCode: null,
				signal: null,
				codexThreadId: null
			},
			lastMessage: null,
			logTail: [
				'=== 2026-04-01T16:14:14.721Z START ===',
				'cwd=/Users/colinfreed/Projects/Experiments/agent-management-system-prototype',
				'Reading additional input from stdin...',
				'2026-04-01T16:14:15.667723Z ERROR rmcp::transport::worker: worker quit with fatal: Transport channel closed, when Auth(TokenRefreshFailed("Failed to parse server response"))'
			],
			activityAt: '2026-04-01T16:14:15.667Z'
		};

		expect(deriveRunState(run)).toEqual({
			status: 'failed',
			pid: null,
			startedAt: '2026-04-01T16:14:14.718Z',
			finishedAt: '2026-04-01T16:14:15.667Z',
			exitCode: -1,
			signal: null,
			codexThreadId: null
		});

		vi.useRealTimers();
	});

	it('treats auth-refresh startup failures as failed even when the runner exits code 0', () => {
		const run: AgentRunDetail = {
			id: 'run_auth_exit_zero',
			agentThreadId: 'session_auth_exit_zero',
			mode: 'start',
			prompt: 'start work',
			requestedThreadId: null,
			createdAt: '2026-04-01T16:14:14.718Z',
			updatedAt: '2026-04-01T16:14:15.900Z',
			logPath: '/tmp/codex.log',
			statePath: '/tmp/state.json',
			messagePath: '/tmp/last-message.txt',
			configPath: '/tmp/config.json',
			state: {
				status: 'running',
				pid: 76910,
				startedAt: '2026-04-01T16:14:14.718Z',
				finishedAt: null,
				exitCode: null,
				signal: null,
				codexThreadId: null
			},
			lastMessage: null,
			logTail: [
				'=== 2026-04-01T16:14:14.721Z START ===',
				'cwd=/Users/colinfreed/Projects/Experiments/agent-management-system-prototype',
				'Reading additional input from stdin...',
				'2026-04-01T16:14:15.667723Z ERROR rmcp::transport::worker: worker quit with fatal: Transport channel closed, when Auth(TokenRefreshFailed("Failed to parse server response"))',
				'=== EXIT code=0 signal=null ==='
			],
			activityAt: '2026-04-01T16:14:15.900Z'
		};

		expect(deriveRunState(run)).toEqual({
			status: 'failed',
			pid: null,
			startedAt: '2026-04-01T16:14:14.718Z',
			finishedAt: '2026-04-01T16:14:15.900Z',
			exitCode: 0,
			signal: null,
			codexThreadId: null
		});
	});

	it('marks startup runs as failed when they remain stuck waiting on stdin', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-04-01T20:15:00.000Z'));

		const run: AgentRunDetail = {
			id: 'run_stdin_stall',
			agentThreadId: 'session_stdin_stall',
			mode: 'start',
			prompt: 'start work',
			requestedThreadId: null,
			createdAt: '2026-04-01T20:13:10.328Z',
			updatedAt: '2026-04-01T20:13:10.331Z',
			logPath: '/tmp/codex.log',
			statePath: '/tmp/state.json',
			messagePath: '/tmp/last-message.txt',
			configPath: '/tmp/config.json',
			state: {
				status: 'running',
				pid: 31371,
				startedAt: '2026-04-01T20:13:10.328Z',
				finishedAt: null,
				exitCode: null,
				signal: null,
				codexThreadId: null
			},
			lastMessage: null,
			logTail: [
				'=== 2026-04-01T20:13:10.331Z START ===',
				'cwd=/Users/colinfreed/Projects/Experiments/agent-management-system-prototype',
				'Reading additional input from stdin...'
			],
			activityAt: '2026-04-01T20:13:10.331Z'
		};

		expect(deriveRunState(run)).toEqual({
			status: 'failed',
			pid: null,
			startedAt: '2026-04-01T20:13:10.328Z',
			finishedAt: '2026-04-01T20:13:10.331Z',
			exitCode: -1,
			signal: null,
			codexThreadId: null
		});

		vi.useRealTimers();
	});

	it('marks active runs as completed when the runner already wrote a clean exit marker', () => {
		const run: AgentRunDetail = {
			id: 'run_completed_log',
			agentThreadId: 'session_completed_log',
			mode: 'message',
			prompt: 'follow up',
			requestedThreadId: 'thread_123',
			createdAt: '2026-04-01T16:20:00.000Z',
			updatedAt: '2026-04-01T16:25:00.000Z',
			logPath: '/tmp/codex.log',
			statePath: '/tmp/state.json',
			messagePath: '/tmp/last-message.txt',
			configPath: '/tmp/config.json',
			state: {
				status: 'running',
				pid: 22222,
				startedAt: '2026-04-01T16:20:00.000Z',
				finishedAt: null,
				exitCode: null,
				signal: null,
				codexThreadId: 'thread_123'
			},
			lastMessage: 'Done.',
			logTail: ['Assistant: Done.', '=== EXIT code=0 signal=null ==='],
			activityAt: '2026-04-01T16:25:00.000Z'
		};

		expect(deriveRunState(run)).toEqual({
			status: 'completed',
			pid: null,
			startedAt: '2026-04-01T16:20:00.000Z',
			finishedAt: '2026-04-01T16:25:00.000Z',
			exitCode: 0,
			signal: null,
			codexThreadId: 'thread_123'
		});
	});

	it('builds follow-up prompts that include attached thread files as immediate context', () => {
		expect(
			buildThreadAttachmentPrompt({
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
			buildThreadAttachmentPrompt({
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

	it('builds structured cross-thread contact prompts with source context', () => {
		expect(
			buildAgentThreadContactPrompt({
				sourceThread: {
					id: 'thread_source',
					name: 'UI implementation thread',
					threadSummary: 'Waiting on architecture guidance before continuing the implementation.',
					relatedTasks: [
						{
							id: 'task_1',
							title: 'Implement cross-thread messaging',
							status: 'in_progress',
							isPrimary: true
						}
					],
					latestRun: {
						id: 'run_1',
						agentThreadId: 'thread_source',
						mode: 'message',
						prompt: 'Review the implementation plan and continue.',
						requestedThreadId: 'codex_thread_source',
						createdAt: '2026-04-07T12:01:00.000Z',
						updatedAt: '2026-04-07T12:05:00.000Z',
						logPath: '/tmp/log.txt',
						statePath: '/tmp/state.json',
						messagePath: '/tmp/message.txt',
						configPath: '/tmp/config.json',
						lastMessage: 'Implemented the API path but need guidance on the coordination model.',
						logTail: [],
						activityAt: '2026-04-07T12:05:00.000Z',
						state: null
					}
				},
				prompt: 'Need assignment guidance for which thread should own outbound coordination.'
			})
		).toContain('Source thread: UI implementation thread (thread_source)');
		expect(
			buildAgentThreadContactPrompt({
				sourceThread: {
					id: 'thread_source',
					name: 'UI implementation thread',
					threadSummary: 'Waiting on architecture guidance before continuing the implementation.',
					relatedTasks: [
						{
							id: 'task_1',
							title: 'Implement cross-thread messaging',
							status: 'in_progress',
							isPrimary: true
						}
					],
					latestRun: {
						id: 'run_1',
						agentThreadId: 'thread_source',
						mode: 'message',
						prompt: 'Review the implementation plan and continue.',
						requestedThreadId: 'codex_thread_source',
						createdAt: '2026-04-07T12:01:00.000Z',
						updatedAt: '2026-04-07T12:05:00.000Z',
						logPath: '/tmp/log.txt',
						statePath: '/tmp/state.json',
						messagePath: '/tmp/message.txt',
						configPath: '/tmp/config.json',
						lastMessage: 'Implemented the API path but need guidance on the coordination model.',
						logTail: [],
						activityAt: '2026-04-07T12:05:00.000Z',
						state: null
					}
				},
				prompt: 'Need assignment guidance for which thread should own outbound coordination.'
			})
		).toContain('Linked task context: Implement cross-thread messaging');
		expect(
			buildAgentThreadContactPrompt({
				sourceThread: {
					id: 'thread_source',
					name: 'UI implementation thread',
					threadSummary: 'Waiting on architecture guidance before continuing the implementation.',
					relatedTasks: [
						{
							id: 'task_1',
							title: 'Implement cross-thread messaging',
							status: 'in_progress',
							isPrimary: true
						}
					],
					latestRun: {
						id: 'run_1',
						agentThreadId: 'thread_source',
						mode: 'message',
						prompt: 'Review the implementation plan and continue.',
						requestedThreadId: 'codex_thread_source',
						createdAt: '2026-04-07T12:01:00.000Z',
						updatedAt: '2026-04-07T12:05:00.000Z',
						logPath: '/tmp/log.txt',
						statePath: '/tmp/state.json',
						messagePath: '/tmp/message.txt',
						configPath: '/tmp/config.json',
						lastMessage: 'Implemented the API path but need guidance on the coordination model.',
						logTail: [],
						activityAt: '2026-04-07T12:05:00.000Z',
						state: null
					}
				},
				prompt: 'Need assignment guidance for which thread should own outbound coordination.',
				contactType: 'request_assignment',
				contextSummary:
					'Decide which thread owns outbound coordination before the UI thread proceeds.',
				contactId: 'contact_1',
				replyRequested: true,
				replyToContactId: 'contact_0'
			})
		).toContain(
			'Requested help:\nNeed assignment guidance for which thread should own outbound coordination.'
		);
		expect(
			buildAgentThreadContactPrompt({
				sourceThread: {
					id: 'thread_source',
					name: 'UI implementation thread',
					threadSummary: 'Waiting on architecture guidance before continuing the implementation.',
					relatedTasks: [
						{
							id: 'task_1',
							title: 'Implement cross-thread messaging',
							status: 'in_progress',
							isPrimary: true
						}
					],
					latestRun: {
						id: 'run_1',
						agentThreadId: 'thread_source',
						mode: 'message',
						prompt: 'Review the implementation plan and continue.',
						requestedThreadId: 'codex_thread_source',
						createdAt: '2026-04-07T12:01:00.000Z',
						updatedAt: '2026-04-07T12:05:00.000Z',
						logPath: '/tmp/log.txt',
						statePath: '/tmp/state.json',
						messagePath: '/tmp/message.txt',
						configPath: '/tmp/config.json',
						lastMessage: 'Implemented the API path but need guidance on the coordination model.',
						logTail: [],
						activityAt: '2026-04-07T12:05:00.000Z',
						state: null
					}
				},
				prompt: 'Need assignment guidance for which thread should own outbound coordination.',
				contactType: 'request_assignment',
				contextSummary:
					'Decide which thread owns outbound coordination before the UI thread proceeds.',
				contactId: 'contact_1',
				replyRequested: true,
				replyToContactId: 'contact_0'
			})
		).toContain('Coordination type: Request Assignment');
		expect(
			buildAgentThreadContactPrompt({
				sourceThread: {
					id: 'thread_source',
					name: 'UI implementation thread',
					threadSummary: 'Waiting on architecture guidance before continuing the implementation.',
					relatedTasks: [
						{
							id: 'task_1',
							title: 'Implement cross-thread messaging',
							status: 'in_progress',
							isPrimary: true
						}
					],
					latestRun: {
						id: 'run_1',
						agentThreadId: 'thread_source',
						mode: 'message',
						prompt: 'Review the implementation plan and continue.',
						requestedThreadId: 'codex_thread_source',
						createdAt: '2026-04-07T12:01:00.000Z',
						updatedAt: '2026-04-07T12:05:00.000Z',
						logPath: '/tmp/log.txt',
						statePath: '/tmp/state.json',
						messagePath: '/tmp/message.txt',
						configPath: '/tmp/config.json',
						lastMessage: 'Implemented the API path but need guidance on the coordination model.',
						logTail: [],
						activityAt: '2026-04-07T12:05:00.000Z',
						state: null
					}
				},
				prompt: 'Need assignment guidance for which thread should own outbound coordination.',
				contactType: 'request_assignment',
				contextSummary:
					'Decide which thread owns outbound coordination before the UI thread proceeds.',
				contactId: 'contact_1',
				replyRequested: true,
				replyToContactId: 'contact_0'
			})
		).toContain(
			'Focused context note:\nDecide which thread owns outbound coordination before the UI thread proceeds.'
		);
		expect(
			buildAgentThreadContactPrompt({
				sourceThread: {
					id: 'thread_source',
					name: 'UI implementation thread',
					threadSummary: 'Waiting on architecture guidance before continuing the implementation.',
					relatedTasks: [
						{
							id: 'task_1',
							title: 'Implement cross-thread messaging',
							status: 'in_progress',
							isPrimary: true
						}
					],
					latestRun: {
						id: 'run_1',
						agentThreadId: 'thread_source',
						mode: 'message',
						prompt: 'Review the implementation plan and continue.',
						requestedThreadId: 'codex_thread_source',
						createdAt: '2026-04-07T12:01:00.000Z',
						updatedAt: '2026-04-07T12:05:00.000Z',
						logPath: '/tmp/log.txt',
						statePath: '/tmp/state.json',
						messagePath: '/tmp/message.txt',
						configPath: '/tmp/config.json',
						lastMessage: 'Implemented the API path but need guidance on the coordination model.',
						logTail: [],
						activityAt: '2026-04-07T12:05:00.000Z',
						state: null
					}
				},
				prompt: 'Need assignment guidance for which thread should own outbound coordination.',
				contactId: 'contact_1',
				replyRequested: true,
				replyToContactId: 'contact_0'
			})
		).toContain('Replying to contact: contact_0');
		expect(
			buildAgentThreadContactPrompt({
				sourceThread: {
					id: 'thread_source',
					name: 'UI implementation thread',
					threadSummary: 'Waiting on architecture guidance before continuing the implementation.',
					relatedTasks: [
						{
							id: 'task_1',
							title: 'Implement cross-thread messaging',
							status: 'in_progress',
							isPrimary: true
						}
					],
					latestRun: {
						id: 'run_1',
						agentThreadId: 'thread_source',
						mode: 'message',
						prompt: 'Review the implementation plan and continue.',
						requestedThreadId: 'codex_thread_source',
						createdAt: '2026-04-07T12:01:00.000Z',
						updatedAt: '2026-04-07T12:05:00.000Z',
						logPath: '/tmp/log.txt',
						statePath: '/tmp/state.json',
						messagePath: '/tmp/message.txt',
						configPath: '/tmp/config.json',
						lastMessage: 'Implemented the API path but need guidance on the coordination model.',
						logTail: [],
						activityAt: '2026-04-07T12:05:00.000Z',
						state: null
					}
				},
				prompt: 'Need assignment guidance for which thread should own outbound coordination.',
				contactId: 'contact_1',
				replyRequested: true
			})
		).toContain('set replyToContactId=contact_1');
	});

	it('builds a stable thread handle and readable contact label', () => {
		expect(
			buildAgentThreadHandle({
				threadId: 'thread_123',
				cwd: '/tmp/agent-management-system-prototype',
				relatedTasks: [
					{
						id: 'task_142',
						title: 'Implement cross-thread contact',
						status: 'in_progress',
						isPrimary: true
					}
				],
				categorization: {
					labels: [],
					projectIds: ['project_1'],
					projectLabels: ['Agent Management System Prototype'],
					goalIds: [],
					goalLabels: [],
					areaLabels: ['product'],
					focusLabels: [],
					entityLabels: [],
					roleLabels: ['Frontend'],
					capabilityLabels: [],
					toolLabels: [],
					keywordLabels: []
				}
			})
		).toBe('frontend.agent-management-system-prototype.task-142');
		expect(
			buildAgentThreadContactLabel({
				handle: 'frontend.agent-management-system-prototype.task-142',
				threadState: 'ready',
				relatedTasks: [
					{
						id: 'task_142',
						title: 'Implement cross-thread contact',
						status: 'in_progress',
						isPrimary: true
					}
				],
				categorization: {
					labels: [],
					projectIds: ['project_1'],
					projectLabels: ['Agent Management System Prototype'],
					goalIds: [],
					goalLabels: [],
					areaLabels: ['product'],
					focusLabels: [],
					entityLabels: [],
					roleLabels: ['Frontend'],
					capabilityLabels: [],
					toolLabels: [],
					keywordLabels: []
				}
			})
		).toBe('Frontend · task_142 · ready');
	});

	it('normalizes and prefers explicit handle aliases', () => {
		expect(normalizeAgentThreadHandleAlias(' Coordination.Main  ')).toBe('coordination.main');
		expect(
			buildAgentThreadHandle({
				threadId: 'thread_123',
				cwd: '/tmp/agent-management-system-prototype',
				handleAlias: 'coordination.main',
				relatedTasks: [],
				categorization: null
			})
		).toBe('coordination.main');
	});

	it('ranks routing targets using source thread context and contactability', () => {
		const sourceThread = buildAgentThreadDetailFixture({
			id: 'thread_source',
			name: 'Source thread',
			handle: 'frontend.agent-management-system-prototype.task-100',
			contactLabel: 'Frontend · task_100 · ready',
			relatedTasks: [
				{ id: 'task_100', title: 'Coordinate work', status: 'in_progress', isPrimary: true }
			],
			categorization: {
				labels: [],
				projectIds: ['project_1'],
				projectLabels: ['Agent Management System Prototype'],
				goalIds: ['goal_1'],
				goalLabels: ['Cross-thread coordination'],
				areaLabels: ['product'],
				focusLabels: [],
				entityLabels: [],
				roleLabels: ['Frontend'],
				capabilityLabels: [],
				toolLabels: [],
				keywordLabels: []
			}
		});
		const bestTarget = buildAgentThreadDetailFixture({
			id: 'thread_target_best',
			name: 'Frontend implementation thread',
			handle: 'frontend.agent-management-system-prototype.task-142',
			contactLabel: 'Frontend · task_142 · ready',
			relatedTasks: [
				{ id: 'task_142', title: 'Implement contact UI', status: 'in_progress', isPrimary: true }
			],
			categorization: {
				labels: [],
				projectIds: ['project_1'],
				projectLabels: ['Agent Management System Prototype'],
				goalIds: ['goal_1'],
				goalLabels: ['Cross-thread coordination'],
				areaLabels: ['product'],
				focusLabels: [],
				entityLabels: [],
				roleLabels: ['Frontend'],
				capabilityLabels: ['Svelte'],
				toolLabels: [],
				keywordLabels: []
			}
		});
		const weakerTarget = buildAgentThreadDetailFixture({
			id: 'thread_target_weaker',
			name: 'Backend review thread',
			handle: 'backend.other-project.task-9',
			contactLabel: 'Backend · task_9 · ready',
			cwd: '/tmp/other-project',
			relatedTasks: [
				{ id: 'task_9', title: 'Review logs', status: 'in_progress', isPrimary: true }
			],
			categorization: {
				labels: [],
				projectIds: ['project_2'],
				projectLabels: ['Other Project'],
				goalIds: [],
				goalLabels: [],
				areaLabels: ['platform'],
				focusLabels: [],
				entityLabels: [],
				roleLabels: ['Backend'],
				capabilityLabels: [],
				toolLabels: [],
				keywordLabels: []
			}
		});
		const busyTarget = buildAgentThreadDetailFixture({
			id: 'thread_target_busy',
			name: 'Busy frontend thread',
			handle: 'frontend.agent-management-system-prototype.task-143',
			contactLabel: 'Frontend · task_143 · working',
			threadState: 'working',
			hasActiveRun: true,
			canResume: false,
			relatedTasks: [
				{ id: 'task_143', title: 'Ship change', status: 'in_progress', isPrimary: true }
			],
			categorization: {
				labels: [],
				projectIds: ['project_1'],
				projectLabels: ['Agent Management System Prototype'],
				goalIds: ['goal_1'],
				goalLabels: ['Cross-thread coordination'],
				areaLabels: ['product'],
				focusLabels: [],
				entityLabels: [],
				roleLabels: ['Frontend'],
				capabilityLabels: [],
				toolLabels: [],
				keywordLabels: []
			}
		});

		const ranked = rankAgentThreadsForRouting(
			[sourceThread, weakerTarget, busyTarget, bestTarget],
			{ sourceThreadId: 'thread_source' }
		);

		expect(ranked.map((thread) => thread.id)).toEqual([
			'thread_target_best',
			'thread_target_busy',
			'thread_target_weaker'
		]);
		expect(ranked[0]?.routingReason).toMatch(
			/Shares project (Agent Management System Prototype|project_1)/
		);
		expect(ranked[0]?.routingReason).toContain('Shares role Frontend');
	});

	it('filters routing targets by role, project, task, and contactability', () => {
		const matchingTarget = buildAgentThreadDetailFixture({
			id: 'thread_target_match',
			name: 'Frontend task thread',
			handle: 'frontend.agent-management-system-prototype.task-142',
			contactLabel: 'Frontend · task_142 · ready',
			relatedTasks: [
				{ id: 'task_142', title: 'Implement contact UI', status: 'in_progress', isPrimary: true }
			],
			categorization: {
				labels: [],
				projectIds: ['project_1'],
				projectLabels: ['Agent Management System Prototype'],
				goalIds: [],
				goalLabels: [],
				areaLabels: ['product'],
				focusLabels: [],
				entityLabels: [],
				roleLabels: ['Frontend'],
				capabilityLabels: [],
				toolLabels: [],
				keywordLabels: []
			}
		});
		const nonMatchingTarget = buildAgentThreadDetailFixture({
			id: 'thread_target_other',
			name: 'Research thread',
			handle: 'research.other-project.task-7',
			contactLabel: 'Research · task_7 · ready',
			cwd: '/tmp/other-project',
			relatedTasks: [{ id: 'task_7', title: 'Research options', status: 'todo', isPrimary: true }],
			categorization: {
				labels: [],
				projectIds: ['project_2'],
				projectLabels: ['Other Project'],
				goalIds: [],
				goalLabels: [],
				areaLabels: ['research'],
				focusLabels: [],
				entityLabels: [],
				roleLabels: ['Research'],
				capabilityLabels: [],
				toolLabels: [],
				keywordLabels: []
			}
		});
		const blockedMatch = buildAgentThreadDetailFixture({
			id: 'thread_target_blocked',
			name: 'Blocked frontend task thread',
			handle: 'frontend.agent-management-system-prototype.task-142',
			contactLabel: 'Frontend · task_142 · working',
			threadState: 'working',
			hasActiveRun: true,
			canResume: false,
			relatedTasks: [
				{ id: 'task_142', title: 'Implement contact UI', status: 'in_progress', isPrimary: true }
			],
			categorization: {
				labels: [],
				projectIds: ['project_1'],
				projectLabels: ['Agent Management System Prototype'],
				goalIds: [],
				goalLabels: [],
				areaLabels: ['product'],
				focusLabels: [],
				entityLabels: [],
				roleLabels: ['Frontend'],
				capabilityLabels: [],
				toolLabels: [],
				keywordLabels: []
			}
		});

		const ranked = rankAgentThreadsForRouting([nonMatchingTarget, blockedMatch, matchingTarget], {
			role: 'frontend',
			project: 'agent-management-system-prototype',
			taskId: 'task_142',
			canContact: true,
			limit: 1
		});

		expect(ranked).toHaveLength(1);
		expect(ranked[0]?.id).toBe('thread_target_match');
		expect(ranked[0]?.routingReason).toContain('Linked to task task_142');
		expect(ranked[0]?.routingReason).toContain('Matches project Agent Management System Prototype');
	});

	it('hides abandoned managed sessions that never produced a real thread', () => {
		const session: AgentThreadDetail = {
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
			threadState: 'attention',
			latestRunStatus: 'failed',
			hasActiveRun: false,
			canResume: false,
			runCount: 1,
			lastActivityAt: '2026-03-27T23:47:36.683Z',
			lastActivityLabel: '3d ago',
			threadSummary: 'The latest run failed. Check the recent log output.',
			lastExitCode: -1,
			runTimeline: [],
			relatedTasks: [],
			latestRun: {
				id: 'run_stale',
				agentThreadId: 'session_stale',
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

		expect(isAbandonedThreadDetail(session)).toBe(true);
		expect(
			isAbandonedThreadDetail({
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
					area: 'product',
					goalId: 'goal_1',
					priority: 'high',
					status: 'in_progress',
					riskLevel: 'medium',
					approvalMode: 'before_complete',
					requiresReview: true,
					desiredRoleId: 'role_app_worker',
					assigneeWorkerId: null,
					agentThreadId: 'session_1',
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
					agentThreadId: 'session_1',
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

		const next = reconcileControlPlaneThreadState(data, {
			id: 'session_1',
			hasActiveRun: false,
			canResume: true,
			latestRunStatus: 'completed',
			lastActivityAt: '2026-03-30T20:15:00.000Z',
			latestRun: null
		});

		expect(next.tasks[0]?.status).toBe('review');
		expect(next.runs[0]?.status).toBe('completed');
		expect(next.runs[0]?.endedAt).toBe('2026-03-30T20:15:00.000Z');
		expect(next.runs[0]?.summary).toBe('Task run finished and is ready for review.');
	});

	it('preserves the specific failed-thread detail when blocking a linked task', () => {
		const data: ControlPlaneData = {
			providers: [],
			roles: [],
			projects: [],
			goals: [],
			workers: [],
			tasks: [
				{
					id: 'task_1',
					title: 'Planning work and chunking',
					summary: 'Collect notes about planning and chunking work.',
					projectId: 'project_1',
					area: 'product',
					goalId: 'goal_1',
					priority: 'medium',
					status: 'in_progress',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeWorkerId: null,
					agentThreadId: 'session_1',
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
					threadId: null,
					agentThreadId: 'session_1',
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

		const next = reconcileControlPlaneThreadState(data, {
			id: 'session_1',
			hasActiveRun: false,
			canResume: false,
			latestRunStatus: 'failed',
			lastActivityAt: '2026-03-30T20:15:00.000Z',
			latestRun: {
				id: 'run_1',
				agentThreadId: 'session_1',
				mode: 'start',
				prompt: 'start work',
				requestedThreadId: null,
				createdAt: '2026-03-30T20:00:00.000Z',
				updatedAt: '2026-03-30T20:15:00.000Z',
				logPath: '/tmp/codex.log',
				statePath: '/tmp/state.json',
				messagePath: '/tmp/last-message.txt',
				configPath: '/tmp/config.json',
				state: {
					status: 'failed',
					pid: 123,
					startedAt: '2026-03-30T20:00:00.000Z',
					finishedAt: '2026-03-30T20:15:00.000Z',
					exitCode: 1,
					signal: null,
					codexThreadId: null
				},
				lastMessage: null,
				logTail: [
					'=== 2026-03-30T20:00:00.000Z START ===',
					'cwd=/restricted/project',
					'Error: Operation not permitted (os error 1)',
					'=== EXIT code=1 signal=null ==='
				],
				activityAt: '2026-03-30T20:15:00.000Z'
			}
		});

		expect(next.tasks[0]?.status).toBe('blocked');
		expect(next.tasks[0]?.blockedReason).toBe('Error: Operation not permitted (os error 1)');
		expect(next.runs[0]?.status).toBe('failed');
		expect(next.runs[0]?.errorSummary).toBe('Error: Operation not permitted (os error 1)');
	});

	it('surfaces a concrete auth startup failure reason for linked tasks', () => {
		const data: ControlPlaneData = {
			providers: [],
			roles: [],
			projects: [],
			goals: [],
			workers: [],
			tasks: [
				{
					id: 'task_1',
					title: 'Add target date field',
					summary: 'Start the task in a fresh thread.',
					projectId: 'project_1',
					area: 'product',
					goalId: 'goal_1',
					priority: 'medium',
					status: 'in_progress',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeWorkerId: null,
					agentThreadId: 'session_1',
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 1,
					latestRunId: 'run_1',
					artifactPath: '/tmp/artifacts',
					attachments: [],
					createdAt: '2026-04-01T16:14:14.000Z',
					updatedAt: '2026-04-01T16:14:14.000Z'
				}
			],
			runs: [
				{
					id: 'run_1',
					taskId: 'task_1',
					workerId: null,
					providerId: null,
					status: 'running',
					createdAt: '2026-04-01T16:14:14.000Z',
					updatedAt: '2026-04-01T16:14:14.000Z',
					startedAt: '2026-04-01T16:14:14.000Z',
					endedAt: null,
					threadId: null,
					agentThreadId: 'session_1',
					promptDigest: '',
					artifactPaths: [],
					summary: 'Running task.',
					lastHeartbeatAt: '2026-04-01T16:14:14.000Z',
					errorSummary: ''
				}
			],
			reviews: [],
			approvals: []
		};

		const next = reconcileControlPlaneThreadState(data, {
			id: 'session_1',
			hasActiveRun: false,
			canResume: false,
			latestRunStatus: 'failed',
			lastActivityAt: '2026-04-01T16:14:15.900Z',
			latestRun: {
				id: 'run_1',
				agentThreadId: 'session_1',
				mode: 'start',
				prompt: 'start work',
				requestedThreadId: null,
				createdAt: '2026-04-01T16:14:14.000Z',
				updatedAt: '2026-04-01T16:14:15.900Z',
				logPath: '/tmp/codex.log',
				statePath: '/tmp/state.json',
				messagePath: '/tmp/last-message.txt',
				configPath: '/tmp/config.json',
				state: {
					status: 'failed',
					pid: null,
					startedAt: '2026-04-01T16:14:14.000Z',
					finishedAt: '2026-04-01T16:14:15.900Z',
					exitCode: 0,
					signal: null,
					codexThreadId: null
				},
				lastMessage: null,
				logTail: [
					'=== 2026-04-01T16:14:14.721Z START ===',
					'cwd=/Users/colinfreed/Projects/Experiments/agent-management-system-prototype',
					'Reading additional input from stdin...',
					'2026-04-01T16:14:15.667723Z ERROR rmcp::transport::worker: worker quit with fatal: Transport channel closed, when Auth(TokenRefreshFailed("Failed to parse server response"))',
					'=== EXIT code=0 signal=null ==='
				],
				activityAt: '2026-04-01T16:14:15.900Z'
			}
		});

		expect(next.tasks[0]?.blockedReason).toBe(
			'Codex could not start the work thread because authentication refresh failed before thread startup. Re-login to Codex CLI and retry the task.'
		);
		expect(next.runs[0]?.errorSummary).toBe(
			'Codex could not start the work thread because authentication refresh failed before thread startup. Re-login to Codex CLI and retry the task.'
		);
	});

	it('reopens linked blocked tasks when the session is actively running', () => {
		const data: ControlPlaneData = {
			providers: [],
			roles: [],
			projects: [],
			goals: [],
			workers: [],
			tasks: [
				{
					id: 'task_1',
					title: 'Documentation sync',
					summary: 'Keep the task active while the linked session is still running.',
					projectId: 'project_1',
					area: 'product',
					goalId: 'goal_1',
					priority: 'medium',
					status: 'blocked',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeWorkerId: null,
					agentThreadId: 'session_1',
					blockedReason: 'False transport error.',
					dependencyTaskIds: [],
					runCount: 1,
					latestRunId: 'run_1',
					artifactPath: '/tmp/artifacts',
					attachments: [],
					createdAt: '2026-04-01T16:36:41.901Z',
					updatedAt: '2026-04-01T16:36:42.920Z'
				}
			],
			runs: [
				{
					id: 'run_1',
					taskId: 'task_1',
					workerId: null,
					providerId: null,
					status: 'failed',
					createdAt: '2026-04-01T16:36:41.929Z',
					updatedAt: '2026-04-01T16:36:42.920Z',
					startedAt: '2026-04-01T16:36:41.929Z',
					endedAt: '2026-04-01T16:36:42.920Z',
					threadId: null,
					agentThreadId: 'session_1',
					promptDigest: '',
					artifactPaths: [],
					summary: 'Task blocked after the linked work thread failed.',
					lastHeartbeatAt: '2026-04-01T16:36:41.929Z',
					errorSummary: 'False transport error.'
				}
			],
			reviews: [],
			approvals: []
		};

		const next = reconcileControlPlaneThreadState(data, {
			id: 'session_1',
			hasActiveRun: true,
			canResume: false,
			latestRunStatus: 'running',
			lastActivityAt: '2026-04-01T16:38:00.000Z',
			latestRun: {
				id: 'run_1',
				agentThreadId: 'session_1',
				mode: 'start',
				prompt: 'start work',
				requestedThreadId: null,
				createdAt: '2026-04-01T16:36:41.929Z',
				updatedAt: '2026-04-01T16:38:00.000Z',
				logPath: '/tmp/codex.log',
				statePath: '/tmp/state.json',
				messagePath: '/tmp/last-message.txt',
				configPath: '/tmp/config.json',
				state: {
					status: 'running',
					pid: 123,
					startedAt: '2026-04-01T16:36:42.006Z',
					finishedAt: null,
					exitCode: null,
					signal: null,
					codexThreadId: null
				},
				lastMessage: null,
				logTail: [
					'2026-04-01T16:36:42.918672Z ERROR rmcp::transport::worker: worker quit with fatal: Transport channel closed, when Auth(TokenRefreshFailed("Failed to parse server response"))',
					'{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"Still running."}}'
				],
				activityAt: '2026-04-01T16:38:00.000Z'
			}
		});

		expect(next.tasks[0]).toEqual(
			expect.objectContaining({
				id: 'task_1',
				status: 'in_progress',
				blockedReason: '',
				updatedAt: '2026-04-01T16:38:00.000Z'
			})
		);
		expect(next.runs[0]).toEqual(
			expect.objectContaining({
				id: 'run_1',
				status: 'running',
				summary: 'Linked work thread is actively running.',
				endedAt: null,
				lastHeartbeatAt: '2026-04-01T16:38:00.000Z',
				errorSummary: ''
			})
		);
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
					area: 'product',
					goalId: 'goal_1',
					priority: 'high',
					status: 'review',
					riskLevel: 'medium',
					approvalMode: 'before_complete',
					requiresReview: true,
					desiredRoleId: 'role_app_worker',
					assigneeWorkerId: null,
					agentThreadId: 'session_1',
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
					agentThreadId: 'session_1',
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

		const next = reconcileControlPlaneThreadMessage(data, 'session_1', '2026-03-30T20:20:00.000Z');

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
