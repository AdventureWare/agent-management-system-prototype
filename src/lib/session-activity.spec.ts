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
				lastActivityAt: '2026-03-31T09:58:00.000Z'
			}),
			Date.parse('2026-03-31T10:00:00.000Z')
		);

		expect(meta.label).toBe('Working');
		expect(meta.detail).toBe('The agent is still working, but no saved reply has landed yet.');
	});

	it('describes a resumable thread as available', () => {
		const meta: SessionActivityMeta = getSessionActivityMeta(
			createSession(),
			Date.parse('2026-03-31T10:00:20.000Z')
		);

		expect(meta.label).toBe('Available now');
		expect(meta.detail).toBe('The thread is idle and available for the next instruction.');
	});
});
