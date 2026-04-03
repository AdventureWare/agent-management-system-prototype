import { describe, expect, it } from 'vitest';
import {
	formatSessionStateLabel,
	getSessionActivityMeta,
	type SessionActivityMeta
} from './session-activity';
import type { AgentSessionDetail } from '$lib/types/agent-session';

function createSession(overrides: Partial<AgentSessionDetail> = {}): AgentSessionDetail {
	return {
		id: 'session-1',
		name: 'Session 1',
		cwd: '/tmp/project',
		sandbox: 'workspace-write',
		model: 'gpt-5.4',
		threadId: 'thread-1',
		archivedAt: null,
		createdAt: '2026-03-31T10:00:00.000Z',
		updatedAt: '2026-03-31T10:00:00.000Z',
		origin: 'managed',
		sessionState: 'ready',
		latestRunStatus: 'completed',
		hasActiveRun: false,
		canResume: true,
		runCount: 1,
		lastActivityAt: '2026-03-31T10:00:00.000Z',
		lastActivityLabel: 'just now',
		sessionSummary: 'summary',
		lastExitCode: 0,
		runTimeline: [],
		relatedTasks: [],
		latestRun: null,
		runs: [],
		...overrides
	};
}

describe('session activity labels', () => {
	it('collapses waiting and working into the same high-level working label', () => {
		expect(formatSessionStateLabel('waiting')).toBe('Working');
		expect(formatSessionStateLabel('working')).toBe('Working');
		expect(formatSessionStateLabel('ready')).toBe('Available');
		expect(formatSessionStateLabel('unavailable')).toBe('History only');
	});

	it('describes a waiting session as active work rather than user follow-up', () => {
		const meta: SessionActivityMeta = getSessionActivityMeta(
			createSession({
				sessionState: 'waiting',
				latestRunStatus: 'running',
				hasActiveRun: true,
				canResume: false,
				lastActivityAt: '2026-03-31T09:59:20.000Z'
			}),
			Date.parse('2026-03-31T10:00:00.000Z')
		);

		expect(meta.label).toBe('Working');
		expect(meta.detail).toBe(
			'The run is marked active, but only minimal local runner output is visible so far.'
		);
		expect(meta.activityHeading).toBe('Now');
		expect(meta.activityLabel).toBe('Waiting for first signal');
		expect(meta.activityDetail).toBe(
			'The run is marked active, but there is no structured Codex event to show yet.'
		);
	});

	it('marks recent structured output as confirmed active', () => {
		const meta: SessionActivityMeta = getSessionActivityMeta(
			createSession({
				sessionState: 'working',
				latestRunStatus: 'running',
				hasActiveRun: true,
				canResume: false,
				lastActivityAt: '2026-03-31T09:59:56.000Z',
				latestRun: {
					id: 'run-1',
					sessionId: 'session-1',
					mode: 'start',
					prompt: 'start work',
					requestedThreadId: null,
					createdAt: '2026-03-31T09:59:00.000Z',
					updatedAt: '2026-03-31T09:59:56.000Z',
					logPath: '/tmp/log',
					statePath: '/tmp/state',
					messagePath: '/tmp/message',
					configPath: '/tmp/config',
					state: {
						status: 'running',
						pid: 123,
						startedAt: '2026-03-31T09:59:00.000Z',
						finishedAt: null,
						exitCode: null,
						signal: null,
						codexThreadId: 'thread-1'
					},
					lastMessage: null,
					logTail: [
						'{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"Still running."}}'
					],
					activityAt: '2026-03-31T09:59:56.000Z'
				}
			}),
			Date.parse('2026-03-31T10:00:00.000Z')
		);

		expect(meta.label).toBe('Confirmed active');
		expect(meta.detail).toBe('Recent Codex output confirms the run is still moving.');
		expect(meta.activityHeading).toBe('Now');
		expect(meta.activityLabel).toBe('Shared update');
		expect(meta.activityDetail).toBe('Still running.');
	});

	it('surfaces the latest active command from structured log output', () => {
		const meta: SessionActivityMeta = getSessionActivityMeta(
			createSession({
				sessionState: 'working',
				latestRunStatus: 'running',
				hasActiveRun: true,
				canResume: false,
				lastActivityAt: '2026-03-31T09:59:58.000Z',
				latestRun: {
					id: 'run-2',
					sessionId: 'session-1',
					mode: 'message',
					prompt: 'run checks',
					requestedThreadId: 'thread-1',
					createdAt: '2026-03-31T09:59:00.000Z',
					updatedAt: '2026-03-31T09:59:58.000Z',
					logPath: '/tmp/log',
					statePath: '/tmp/state',
					messagePath: '/tmp/message',
					configPath: '/tmp/config',
					state: {
						status: 'running',
						pid: 123,
						startedAt: '2026-03-31T09:59:00.000Z',
						finishedAt: null,
						exitCode: null,
						signal: null,
						codexThreadId: 'thread-1'
					},
					lastMessage: null,
					logTail: [
						`{"type":"item.started","item":{"id":"item_3","type":"command_execution","command":"/bin/zsh -lc 'npm run check'","aggregated_output":"","exit_code":null,"status":"in_progress"}}`
					],
					activityAt: '2026-03-31T09:59:58.000Z'
				}
			}),
			Date.parse('2026-03-31T10:00:00.000Z')
		);

		expect(meta.activityHeading).toBe('Now');
		expect(meta.activityLabel).toBe('Running command');
		expect(meta.activityDetail).toBe('npm run check');
	});

	it('marks older active runs without recent proof as suspect stalled', () => {
		const meta: SessionActivityMeta = getSessionActivityMeta(
			createSession({
				sessionState: 'waiting',
				latestRunStatus: 'running',
				hasActiveRun: true,
				canResume: false,
				lastActivityAt: '2026-03-31T09:55:00.000Z'
			}),
			Date.parse('2026-03-31T10:00:00.000Z')
		);

		expect(meta.label).toBe('Suspect stalled');
		expect(meta.detail).toBe(
			'The run is still marked active, but there is no recent structured Codex output to prove it is moving.'
		);
		expect(meta.activityHeading).toBe('Last signal');
		expect(meta.activityLabel).toBe('No live signal');
	});

	it('describes a resumable thread as available', () => {
		const meta: SessionActivityMeta = getSessionActivityMeta(
			createSession(),
			Date.parse('2026-03-31T10:00:20.000Z')
		);

		expect(meta.label).toBe('Available now');
		expect(meta.detail).toBe('The thread is idle and available for the next instruction.');
		expect(meta.activityHeading).toBeNull();
		expect(meta.activityLabel).toBeNull();
		expect(meta.activityDetail).toBeNull();
	});
});
