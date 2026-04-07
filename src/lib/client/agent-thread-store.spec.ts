import { describe, expect, it, beforeEach } from 'vitest';
import {
	agentThreadStore,
	getAgentThreadStoreState,
	getStoredAgentThread
} from '$lib/client/agent-thread-store';
import type { AgentThreadDetail } from '$lib/types/agent-thread';

function createThread(overrides: Partial<AgentThreadDetail> = {}): AgentThreadDetail {
	return {
		id: overrides.id ?? 'thread-1',
		name: overrides.name ?? 'Thread 1',
		cwd: overrides.cwd ?? '/tmp/thread-1',
		additionalWritableRoots: overrides.additionalWritableRoots ?? [],
		sandbox: overrides.sandbox ?? 'workspace-write',
		model: overrides.model ?? 'gpt-5.4',
		threadId: overrides.threadId ?? 'codex-thread-1',
		attachments: overrides.attachments ?? [],
		archivedAt: overrides.archivedAt ?? null,
		createdAt: overrides.createdAt ?? '2026-04-06T00:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-04-06T00:00:00.000Z',
		origin: overrides.origin ?? 'managed',
		topicLabels: overrides.topicLabels ?? [],
		categorization: overrides.categorization,
		threadState: overrides.threadState ?? 'ready',
		latestRunStatus: overrides.latestRunStatus ?? 'completed',
		hasActiveRun: overrides.hasActiveRun ?? false,
		canResume: overrides.canResume ?? true,
		runCount: overrides.runCount ?? 1,
		lastActivityAt: overrides.lastActivityAt ?? '2026-04-06T00:00:00.000Z',
		lastActivityLabel: overrides.lastActivityLabel ?? 'just now',
		threadSummary: overrides.threadSummary ?? 'Ready for follow-up work.',
		lastExitCode: overrides.lastExitCode ?? 0,
		runTimeline: overrides.runTimeline ?? [],
		relatedTasks: overrides.relatedTasks ?? [],
		latestRun: overrides.latestRun ?? null,
		runs: overrides.runs ?? []
	};
}

describe('agentThreadStore', () => {
	beforeEach(() => {
		agentThreadStore.reset();
	});

	it('replaces the ordered thread collection while keeping the latest record content', () => {
		agentThreadStore.seedThreads([
			createThread({
				id: 'thread-1',
				threadState: 'ready',
				threadSummary: 'Original summary.'
			}),
			createThread({
				id: 'thread-2',
				name: 'Thread 2'
			})
		]);

		agentThreadStore.seedThread(
			createThread({
				id: 'thread-1',
				threadState: 'working',
				threadSummary: 'Updated summary.',
				hasActiveRun: true,
				latestRunStatus: 'running'
			})
		);

		agentThreadStore.seedThreads(
			[
				createThread({
					id: 'thread-1',
					threadState: 'working',
					threadSummary: 'Updated summary.',
					hasActiveRun: true,
					latestRunStatus: 'running'
				})
			],
			{ replace: true }
		);

		expect(getAgentThreadStoreState().orderedIds).toEqual(['thread-1']);
		expect(getStoredAgentThread('thread-1')?.threadSummary).toBe('Updated summary.');
		expect(getStoredAgentThread('thread-1')?.threadState).toBe('working');
	});

	it('patches archive state without refetching the full thread collection', () => {
		agentThreadStore.seedThreads([
			createThread({ id: 'thread-1', archivedAt: null }),
			createThread({ id: 'thread-2', archivedAt: null })
		]);

		agentThreadStore.patchArchiveState(['thread-2'], true);
		expect(getStoredAgentThread('thread-2')?.archivedAt).not.toBeNull();

		agentThreadStore.patchArchiveState(['thread-2'], false);
		expect(getStoredAgentThread('thread-2')?.archivedAt).toBeNull();
	});
});
