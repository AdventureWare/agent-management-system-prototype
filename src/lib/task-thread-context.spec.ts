import { describe, expect, it } from 'vitest';
import type { AgentThreadDetail } from '$lib/types/agent-thread';
import {
	getTaskThreadActionLabel,
	getTaskThreadReviewHref,
	isActiveTaskThread,
	selectTaskThreadContext
} from './task-thread-context';

function createSession(
	id: string,
	threadState: AgentThreadDetail['threadState']
): AgentThreadDetail {
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
		threadState,
		latestRunStatus:
			threadState === 'starting' || threadState === 'waiting' || threadState === 'working'
				? 'running'
				: 'completed',
		hasActiveRun:
			threadState === 'starting' || threadState === 'waiting' || threadState === 'working',
		canResume: threadState === 'ready',
		runCount: 1,
		lastActivityAt: '2026-03-30T00:00:00.000Z',
		lastActivityLabel: 'just now',
		threadSummary: 'summary',
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

	it('builds a stable thread action label from shared thread context', () => {
		expect(
			getTaskThreadActionLabel({
				statusThread: createSession('assigned', 'working'),
				linkThread: createSession('assigned', 'working'),
				linkThreadKind: 'assigned'
			})
		).toBe('Review active thread');

		expect(
			getTaskThreadActionLabel({
				statusThread: createSession('assigned', 'ready'),
				linkThread: createSession('latest', 'ready'),
				linkThreadKind: 'latest'
			})
		).toBe('Review latest thread');

		expect(
			getTaskThreadActionLabel({
				statusThread: createSession('assigned', 'ready'),
				linkThread: createSession('assigned', 'ready'),
				linkThreadKind: 'assigned'
			})
		).toBe('Review assigned thread');
	});

	it('builds a reply-oriented thread href for task surfaces', () => {
		expect(getTaskThreadReviewHref('thread_123')).toBe('/app/threads/thread_123#reply');
	});
});
