import { describe, expect, it } from 'vitest';
import { buildTaskThreadSuggestions } from './task-thread-suggestions';
import type { AgentSessionDetail } from '$lib/types/agent-session';
import type { Task } from '$lib/types/control-plane';

function createSession(
	id: string,
	overrides: Partial<AgentSessionDetail> = {}
): AgentSessionDetail {
	return {
		id,
		name: `Session ${id}`,
		cwd: '/tmp/project',
		sandbox: 'workspace-write',
		model: null,
		threadId: `thread_${id}`,
		archivedAt: null,
		createdAt: '2026-03-31T10:00:00.000Z',
		updatedAt: '2026-03-31T10:00:00.000Z',
		origin: 'managed',
		topicLabels: [],
		sessionState: 'ready',
		latestRunStatus: 'idle',
		hasActiveRun: false,
		canResume: true,
		runCount: 1,
		lastActivityAt: '2026-03-31T10:00:00.000Z',
		lastActivityLabel: 'just now',
		sessionSummary: 'Reusable work thread',
		lastExitCode: null,
		runTimeline: [],
		relatedTasks: [],
		latestRun: null,
		runs: [],
		...overrides
	};
}

function createTask(overrides: Partial<Task> = {}): Task {
	return {
		id: 'task_1',
		title: 'Suggest a relevant thread',
		summary: 'Continue the assignment suggestion flow for task threads.',
		projectId: 'project_1',
		lane: 'product',
		goalId: '',
		priority: 'medium',
		status: 'ready',
		riskLevel: 'medium',
		approvalMode: 'none',
		requiresReview: true,
		desiredRoleId: 'role_coordinator',
		assigneeWorkerId: null,
		threadSessionId: null,
		blockedReason: '',
		dependencyTaskIds: [],
		runCount: 0,
		latestRunId: null,
		artifactPath: '/tmp/project/agent_output',
		attachments: [],
		createdAt: '2026-03-31T10:00:00.000Z',
		updatedAt: '2026-03-31T10:00:00.000Z',
		...overrides
	};
}

describe('buildTaskThreadSuggestions', () => {
	it('suggests the most relevant available thread', () => {
		const result = buildTaskThreadSuggestions({
			task: createTask(),
			assignedThreadId: null,
			sessions: [
				createSession('busy', {
					name: 'Thread suggestion work',
					sessionState: 'working',
					canResume: false,
					hasActiveRun: true,
					sessionSummary: 'Busy thread already working on assignment ideas'
				}),
				createSession('relevant', {
					name: 'Task thread suggestion follow-up',
					sessionSummary: 'Continue the assignment suggestion flow',
					topicLabels: ['Product', 'Coordination', 'Suggestion'],
					relatedTasks: [
						{ id: 'task_2', title: 'Task thread continuity', status: 'ready', isPrimary: true }
					]
				}),
				createSession('other', {
					name: 'General maintenance',
					sessionSummary: 'Unrelated housekeeping work'
				})
			]
		});

		expect(result.suggestedThread?.id).toBe('relevant');
		expect(result.suggestedThread?.topicLabels).toContain('Coordination');
		expect(result.candidateThreads[0]).toEqual(
			expect.objectContaining({
				id: 'relevant',
				isSuggested: true
			})
		);
		expect(result.suggestedThread?.suggestionReason).toContain('available');
	});

	it('keeps the assigned thread first while still surfacing a better available suggestion', () => {
		const result = buildTaskThreadSuggestions({
			task: createTask(),
			assignedThreadId: 'assigned',
			sessions: [
				createSession('assigned', {
					name: 'Assigned history thread',
					sessionState: 'unavailable',
					canResume: false,
					hasActiveRun: false
				}),
				createSession('suggested', {
					name: 'Relevant task thread',
					sessionSummary: 'Suggest a relevant task thread for assignment',
					topicLabels: ['Product', 'Coordination', 'Suggestion']
				})
			]
		});

		expect(result.candidateThreads[0]?.id).toBe('assigned');
		expect(result.suggestedThread?.id).toBe('suggested');
	});

	it('prefers threads that share derived topic labels with the task', () => {
		const result = buildTaskThreadSuggestions({
			task: createTask({
				title: 'Add attachment browser coverage',
				summary: 'Expand task attachment tests and improve artifact browser validation.'
			}),
			assignedThreadId: null,
			sessions: [
				createSession('generic', {
					name: 'General product coordination',
					topicLabels: ['Product', 'Coordination']
				}),
				createSession('testing', {
					name: 'Attachment browser follow-up',
					topicLabels: ['Product', 'Testing', 'Attachment']
				})
			]
		});

		expect(result.suggestedThread?.id).toBe('testing');
		expect(result.suggestedThread?.suggestionReason).toContain('Shares topic labels');
	});
});
