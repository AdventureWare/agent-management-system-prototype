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
		requiredCapabilityNames: [],
		requiredToolNames: [],
		assigneeWorkerId: null,
		agentThreadId: null,
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

	it('uses structured categorization overlap to explain why a thread matches', () => {
		const result = buildTaskThreadSuggestions({
			task: createTask({
				title: 'Improve thread assignment suggestions',
				summary: 'Match new tasks to reusable work threads and surface context discovery.'
			}),
			assignedThreadId: null,
			sessions: [
				createSession('structured', {
					name: 'Thread assignment follow-up',
					topicLabels: ['Product', 'Coordination', 'Thread', 'Suggestion'],
					categorization: {
						projectIds: [],
						projectLabels: [],
						goalIds: [],
						goalLabels: [],
						laneLabels: ['Product'],
						focusLabels: ['Coordination'],
						entityLabels: ['Thread'],
						roleLabels: [],
						capabilityLabels: [],
						toolLabels: [],
						keywordLabels: ['Suggestion'],
						labels: ['Product', 'Coordination', 'Thread', 'Suggestion']
					}
				}),
				createSession('generic', {
					name: 'General product follow-up',
					topicLabels: ['Product']
				})
			]
		});

		expect(result.suggestedThread?.id).toBe('structured');
		expect(result.suggestedThread?.matchedContext.labels).toEqual(
			expect.arrayContaining(['Product', 'Coordination', 'Thread'])
		);
		expect(result.suggestedThread?.suggestionReason).toContain("Matches this task's");
		expect(result.suggestedThread?.suggestionReason).toContain('area Product');
		expect(result.suggestedThread?.suggestionReason).toContain('focus Coordination');
	});

	it('matches reusable threads on role, capability, and tool metadata even when text is generic', () => {
		const result = buildTaskThreadSuggestions({
			task: createTask({
				title: 'Ship the implementation pass',
				summary: 'Continue the work with the right execution context.',
				desiredRoleId: 'role_app_worker',
				requiredCapabilityNames: ['ios', 'swiftui'],
				requiredToolNames: ['xcodebuild']
			}),
			assignedThreadId: null,
			sessions: [
				createSession('metadata', {
					name: 'Implementation follow-up',
					sessionSummary: 'Continue the execution context.',
					categorization: {
						projectIds: [],
						projectLabels: [],
						goalIds: [],
						goalLabels: [],
						laneLabels: ['Product'],
						focusLabels: ['UI/UX'],
						entityLabels: ['Task'],
						roleLabels: ['App Worker'],
						capabilityLabels: ['iOS', 'SwiftUI'],
						toolLabels: ['Xcodebuild'],
						keywordLabels: [],
						labels: ['Product', 'UI/UX', 'Task', 'App Worker']
					}
				}),
				createSession('generic', {
					name: 'Implementation follow-up',
					sessionSummary: 'Continue the execution context.'
				})
			]
		});

		expect(result.suggestedThread?.id).toBe('metadata');
		expect(result.suggestedThread?.matchedContext.roleLabels).toEqual(['App Worker']);
		expect(result.suggestedThread?.matchedContext.capabilityLabels).toEqual(
			expect.arrayContaining(['iOS', 'SwiftUI'])
		);
		expect(result.suggestedThread?.matchedContext.toolLabels).toEqual(['Xcodebuild']);
		expect(result.suggestedThread?.suggestionReason).toContain('role App Worker');
		expect(result.suggestedThread?.suggestionReason).toContain('capabilities iOS, SwiftUI');
		expect(result.suggestedThread?.suggestionReason).toContain('tools Xcodebuild');
	});

	it('prefers threads that share project and goal scope even when text is generic', () => {
		const result = buildTaskThreadSuggestions({
			task: createTask({
				title: 'Continue execution',
				summary: 'Pick the best existing thread.',
				projectId: 'project_ams',
				goalId: 'goal_threads'
			}),
			assignedThreadId: null,
			sessions: [
				createSession('scoped', {
					name: 'Continuation thread',
					sessionSummary: 'Continue execution.',
					categorization: {
						projectIds: ['project_ams'],
						projectLabels: ['Agent Management System Prototype'],
						goalIds: ['goal_threads'],
						goalLabels: ['Improve Thread Reuse'],
						laneLabels: [],
						focusLabels: [],
						entityLabels: [],
						roleLabels: [],
						capabilityLabels: [],
						toolLabels: [],
						keywordLabels: [],
						labels: []
					}
				}),
				createSession('generic', {
					name: 'Continuation thread',
					sessionSummary: 'Continue execution.'
				})
			]
		});

		expect(result.suggestedThread?.id).toBe('scoped');
		expect(result.suggestedThread?.matchedContext.projectLabels).toEqual([
			'Agent Management System Prototype'
		]);
		expect(result.suggestedThread?.matchedContext.goalLabels).toEqual(['Improve Thread Reuse']);
		expect(result.suggestedThread?.suggestionReason).toContain('goal Improve Thread Reuse');
		expect(result.suggestedThread?.suggestionReason).toContain(
			'project Agent Management System Prototype'
		);
	});
});
