import { describe, expect, it } from 'vitest';
import type { AgentSessionDetail } from '$lib/types/agent-session';
import { isActiveTaskThread, selectTaskThreadContext } from './task-thread-context';

function createSession(
	id: string,
	sessionState: AgentSessionDetail['sessionState']
): AgentSessionDetail {
	return {
		id,
		name: `Thread ${id}`,
		cwd: '/tmp/project',
		sandbox: 'workspace-write',
		model: null,
		threadId: `thread_${id}`,
		archivedAt: null,
		createdAt: '2026-03-30T00:00:00.000Z',
		updatedAt: '2026-03-30T00:00:00.000Z',
		origin: 'managed',
		sessionState,
		latestRunStatus:
			sessionState === 'starting' || sessionState === 'waiting' || sessionState === 'working'
				? 'running'
				: 'completed',
		hasActiveRun:
			sessionState === 'starting' || sessionState === 'waiting' || sessionState === 'working',
		canResume: sessionState === 'ready',
		runCount: 1,
		lastActivityAt: '2026-03-30T00:00:00.000Z',
		lastActivityLabel: 'just now',
		sessionSummary: 'summary',
		lastExitCode: null,
		runTimeline: [],
		relatedTasks: [],
		latestRun: null,
		runs: []
	};
}

describe('task thread context', () => {
	it('treats starting, waiting, and working threads as active', () => {
		expect(isActiveTaskThread(createSession('starting', 'starting'))).toBe(true);
		expect(isActiveTaskThread(createSession('waiting', 'waiting'))).toBe(true);
		expect(isActiveTaskThread(createSession('working', 'working'))).toBe(true);
		expect(isActiveTaskThread(createSession('ready', 'ready'))).toBe(false);
	});

	it('prefers an active latest-run thread over an idle assigned thread', () => {
		const selection = selectTaskThreadContext({
			assignedThread: createSession('assigned', 'ready'),
			latestRunThread: createSession('latest', 'working')
		});

		expect(selection.statusThread?.id).toBe('latest');
		expect(selection.linkThread?.id).toBe('latest');
		expect(selection.linkThreadKind).toBe('latest');
	});

	it('falls back to the assigned thread when no active thread exists', () => {
		const selection = selectTaskThreadContext({
			assignedThread: createSession('assigned', 'ready'),
			latestRunThread: createSession('latest', 'unavailable')
		});

		expect(selection.statusThread?.id).toBe('assigned');
		expect(selection.linkThread?.id).toBe('assigned');
		expect(selection.linkThreadKind).toBe('assigned');
	});
});
