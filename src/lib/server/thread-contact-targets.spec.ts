import { describe, expect, it } from 'vitest';
import type { AgentThreadDetail } from '$lib/types/agent-thread';
import {
	buildThreadContactTarget,
	buildThreadContactTargets
} from '$lib/server/thread-contact-targets';

function createThread(
	overrides: Partial<AgentThreadDetail> & Pick<AgentThreadDetail, 'id' | 'name'>
): AgentThreadDetail {
	return {
		id: overrides.id,
		name: overrides.name,
		cwd: '/tmp/project',
		additionalWritableRoots: [],
		sandbox: 'workspace-write',
		model: null,
		threadId: overrides.threadId ?? `codex_${overrides.id}`,
		attachments: [],
		archivedAt: overrides.archivedAt ?? null,
		createdAt: '2026-04-07T12:00:00.000Z',
		updatedAt: '2026-04-07T12:05:00.000Z',
		origin: 'managed',
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

describe('thread contact targets', () => {
	it('derives contactability and disabled reasons from thread state', () => {
		expect(
			buildThreadContactTarget(
				createThread({ id: 'thread_ready', name: 'Ready thread', canResume: true })
			)
		).toMatchObject({
			canContact: true,
			disabledReason: ''
		});

		expect(
			buildThreadContactTarget(
				createThread({
					id: 'thread_busy',
					name: 'Busy thread',
					hasActiveRun: true,
					canResume: false,
					threadState: 'working',
					latestRunStatus: 'running'
				})
			)
		).toMatchObject({
			canContact: false,
			disabledReason: 'Wait for the active run to finish before contacting this thread.'
		});
	});

	it('returns ranked targets with normalized contact metadata', () => {
		const sourceThread = createThread({
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
		const targetThread = createThread({
			id: 'thread_target',
			name: 'Implementation thread',
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
				capabilityLabels: [],
				toolLabels: [],
				keywordLabels: []
			}
		});

		expect(
			buildThreadContactTargets([sourceThread, targetThread], { sourceThreadId: 'thread_source' })
		).toEqual([
			expect.objectContaining({
				id: 'thread_target',
				contactLabel: 'Frontend · task_142 · ready',
				canContact: true
			})
		]);
	});
});
