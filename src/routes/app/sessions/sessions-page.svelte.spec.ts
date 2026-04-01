import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';
import type {
	AgentRunDetail,
	AgentSessionDetail,
	AgentTimelineStep
} from '$lib/types/agent-session';

const timeline: AgentTimelineStep[] = [
	{
		key: 'submitted',
		label: 'Submitted',
		state: 'complete',
		detail: 'Queued recently.',
		timestamp: '2026-03-27T12:00:00.000Z'
	},
	{
		key: 'running',
		label: 'Running',
		state: 'complete',
		detail: 'Work started.',
		timestamp: '2026-03-27T12:01:00.000Z'
	},
	{
		key: 'thread',
		label: 'Thread',
		state: 'complete',
		detail: 'Thread discovered.',
		timestamp: '2026-03-27T12:01:30.000Z'
	},
	{
		key: 'response',
		label: 'Response',
		state: 'complete',
		detail: 'A response was captured.',
		timestamp: '2026-03-27T12:05:00.000Z'
	},
	{
		key: 'finished',
		label: 'Finished',
		state: 'complete',
		detail: 'Finished successfully.',
		timestamp: '2026-03-27T12:05:00.000Z'
	}
];

function createRun(overrides: Partial<AgentRunDetail>): AgentRunDetail {
	return {
		id: 'run-default',
		sessionId: 'session-1',
		mode: 'start',
		prompt: 'Default prompt',
		requestedThreadId: null,
		createdAt: '2026-03-27T12:00:00.000Z',
		updatedAt: '2026-03-27T12:05:00.000Z',
		logPath: '/tmp/default.log',
		statePath: '/tmp/default-state.json',
		messagePath: '/tmp/default-message.txt',
		configPath: '/tmp/default-config.json',
		state: {
			status: 'completed',
			pid: null,
			startedAt: '2026-03-27T12:01:00.000Z',
			finishedAt: '2026-03-27T12:05:00.000Z',
			exitCode: 0,
			signal: null,
			codexThreadId: 'thread-1'
		},
		lastMessage: 'Default response',
		logTail: [],
		activityAt: '2026-03-27T12:05:00.000Z',
		...overrides
	};
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('/app/sessions/+page.svelte', () => {
	it('shows session previews and links each row to the dedicated detail page', async () => {
		const run = createRun({
			id: 'run-follow-up',
			mode: 'message',
			requestedThreadId: 'thread-1',
			createdAt: '2026-03-27T13:00:00.000Z',
			updatedAt: '2026-03-27T13:03:00.000Z',
			prompt: 'Refine the implementation and add coverage.',
			lastMessage: 'Follow-up response from the agent.'
		});
		const session: AgentSessionDetail = {
			id: 'session-1',
			name: 'Session detail inspector',
			cwd: '/tmp/project',
			sandbox: 'workspace-write',
			model: 'gpt-5.4',
			origin: 'external',
			threadId: 'thread-1',
			attachments: [],
			topicLabels: ['Documentation', 'Integrations'],
			archivedAt: null,
			createdAt: '2026-03-27T12:00:00.000Z',
			updatedAt: '2026-03-27T13:03:00.000Z',
			sessionState: 'ready',
			latestRunStatus: 'completed',
			hasActiveRun: false,
			canResume: true,
			runCount: 2,
			lastActivityAt: '2026-03-27T13:03:00.000Z',
			lastActivityLabel: 'moments ago',
			sessionSummary: 'The thread is idle and available for a follow-up instruction.',
			lastExitCode: 0,
			runTimeline: timeline,
			relatedTasks: [
				{
					id: 'task-1',
					title: 'Polish follow-up flow',
					status: 'running',
					isPrimary: true
				}
			],
			latestRun: run,
			runs: [run]
		};

		render(Page, {
			data: {
				sessions: [session]
			} as never
		});

		await expect
			.element(page.getByText('Last reply: Follow-up response from the agent.'))
			.toBeVisible();
		await expect.element(page.getByText('Imported from Codex')).toBeVisible();
		await expect.element(page.getByText('Documentation')).toBeVisible();
		await expect.element(page.getByText('Tasks: Polish follow-up flow')).toBeVisible();
		await expect
			.element(page.getByText('The thread is idle and available for the next instruction.'))
			.toBeVisible();
		await expect.element(page.getByText('Available')).toBeVisible();
		await expect.element(page.getByText('Latest run completed')).toBeVisible();
		await expect
			.element(
				page.getByRole('link', { name: /View thread details for Session detail inspector/i })
			)
			.toHaveAttribute('href', '/app/sessions/session-1');
		await expect
			.element(page.getByRole('link', { name: 'View thread', exact: true }))
			.toBeVisible();
	});

	it('renders separate links for active and past sessions', async () => {
		const activeRun = createRun({
			id: 'run-active',
			sessionId: 'session-active',
			lastMessage: null,
			state: {
				status: 'running',
				pid: 123,
				startedAt: '2026-03-27T14:00:30.000Z',
				finishedAt: null,
				exitCode: null,
				signal: null,
				codexThreadId: 'thread-active'
			}
		});
		const activeSession: AgentSessionDetail = {
			id: 'session-active',
			name: 'Active session',
			cwd: '/tmp/active-project',
			sandbox: 'workspace-write',
			model: 'gpt-5.4',
			origin: 'managed',
			threadId: 'thread-active',
			attachments: [],
			archivedAt: null,
			createdAt: '2026-03-27T14:00:00.000Z',
			updatedAt: '2026-03-27T14:01:00.000Z',
			sessionState: 'waiting',
			latestRunStatus: 'running',
			hasActiveRun: true,
			canResume: false,
			runCount: 1,
			lastActivityAt: '2026-03-27T14:01:00.000Z',
			lastActivityLabel: 'just now',
			sessionSummary: 'Codex is running, but no saved reply has been captured yet.',
			lastExitCode: null,
			runTimeline: timeline,
			relatedTasks: [],
			latestRun: activeRun,
			runs: [activeRun]
		};

		const completedRun = createRun({
			id: 'run-completed',
			sessionId: 'session-past',
			lastMessage: 'Archived reply with the follow-up sentinel.'
		});
		const completedSession: AgentSessionDetail = {
			id: 'session-past',
			name: 'Past session',
			cwd: '/tmp/past-project',
			sandbox: 'workspace-write',
			model: 'gpt-5.4',
			origin: 'managed',
			threadId: 'thread-past',
			attachments: [],
			archivedAt: null,
			createdAt: '2026-03-27T13:00:00.000Z',
			updatedAt: '2026-03-27T13:10:00.000Z',
			sessionState: 'ready',
			latestRunStatus: 'completed',
			hasActiveRun: false,
			canResume: true,
			runCount: 1,
			lastActivityAt: '2026-03-27T13:10:00.000Z',
			lastActivityLabel: '50m ago',
			sessionSummary: 'The thread is idle and available for a follow-up instruction.',
			lastExitCode: 0,
			runTimeline: timeline,
			relatedTasks: [],
			latestRun: completedRun,
			runs: [completedRun]
		};

		render(Page, {
			data: {
				sessions: [activeSession, completedSession]
			} as never
		});

		await expect.element(page.getByText('Live activity')).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: /View thread details for Active session/i }))
			.toHaveAttribute('href', '/app/sessions/session-active');
		await expect
			.element(page.getByRole('link', { name: /View thread details for Past session/i }))
			.toHaveAttribute('href', '/app/sessions/session-past');
	});

	it('archives and restores threads with bulk selection', async () => {
		const activeRun = createRun({
			id: 'run-active',
			sessionId: 'session-active',
			lastMessage: null,
			state: {
				status: 'running',
				pid: 123,
				startedAt: '2026-03-27T14:00:30.000Z',
				finishedAt: null,
				exitCode: null,
				signal: null,
				codexThreadId: 'thread-active'
			}
		});
		const activeSession: AgentSessionDetail = {
			id: 'session-active',
			name: 'Active session',
			cwd: '/tmp/active-project',
			sandbox: 'workspace-write',
			model: 'gpt-5.4',
			origin: 'managed',
			threadId: 'thread-active',
			attachments: [],
			archivedAt: null,
			createdAt: '2026-03-27T14:00:00.000Z',
			updatedAt: '2026-03-27T14:01:00.000Z',
			sessionState: 'waiting',
			latestRunStatus: 'running',
			hasActiveRun: true,
			canResume: false,
			runCount: 1,
			lastActivityAt: '2026-03-27T14:01:00.000Z',
			lastActivityLabel: 'just now',
			sessionSummary: 'Codex is running, but no saved reply has been captured yet.',
			lastExitCode: null,
			runTimeline: timeline,
			relatedTasks: [],
			latestRun: activeRun,
			runs: [activeRun]
		};
		const completedRun = createRun({
			id: 'run-completed',
			sessionId: 'session-past',
			lastMessage: 'Past session response.'
		});
		const completedSession: AgentSessionDetail = {
			id: 'session-past',
			name: 'Past session',
			cwd: '/tmp/past-project',
			sandbox: 'workspace-write',
			model: 'gpt-5.4',
			origin: 'managed',
			threadId: 'thread-past',
			attachments: [],
			archivedAt: null,
			createdAt: '2026-03-27T13:00:00.000Z',
			updatedAt: '2026-03-27T13:10:00.000Z',
			sessionState: 'ready',
			latestRunStatus: 'completed',
			hasActiveRun: false,
			canResume: true,
			runCount: 1,
			lastActivityAt: '2026-03-27T13:10:00.000Z',
			lastActivityLabel: '50m ago',
			sessionSummary: 'The thread is idle and available for a follow-up instruction.',
			lastExitCode: 0,
			runTimeline: timeline,
			relatedTasks: [],
			latestRun: completedRun,
			runs: [completedRun]
		};
		const archivedRun = createRun({
			id: 'run-archived',
			sessionId: 'session-archived',
			lastMessage: 'Already archived session response.'
		});
		const archivedSession: AgentSessionDetail = {
			id: 'session-archived',
			name: 'Archived session',
			cwd: '/tmp/archived-project',
			sandbox: 'workspace-write',
			model: 'gpt-5.4',
			origin: 'managed',
			threadId: 'thread-archived',
			attachments: [],
			archivedAt: '2026-03-27T15:00:00.000Z',
			createdAt: '2026-03-27T12:30:00.000Z',
			updatedAt: '2026-03-27T12:45:00.000Z',
			sessionState: 'ready',
			latestRunStatus: 'completed',
			hasActiveRun: false,
			canResume: true,
			runCount: 1,
			lastActivityAt: '2026-03-27T12:45:00.000Z',
			lastActivityLabel: '1h ago',
			sessionSummary: 'The thread is idle and available for a follow-up instruction.',
			lastExitCode: 0,
			runTimeline: timeline,
			relatedTasks: [],
			latestRun: archivedRun,
			runs: [archivedRun]
		};

		const refreshedSessions = [
			[
				activeSession,
				{ ...completedSession, archivedAt: '2026-03-27T15:10:00.000Z' },
				archivedSession
			],
			[activeSession, completedSession, archivedSession]
		];
		const archiveRequests: Array<{ archived: boolean; sessionIds: string[] }> = [];

		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
				const url =
					typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

				if (url === '/api/agents/sessions/archive') {
					const body = JSON.parse(init?.body?.toString() ?? '{}') as {
						archived: boolean;
						sessionIds: string[];
					};

					archiveRequests.push(body);

					return {
						ok: true,
						json: async () => ({
							updatedSessionIds: body.sessionIds
						})
					} as Response;
				}

				if (url === '/api/agents/sessions?includeArchived=1') {
					return {
						ok: true,
						json: async () => ({
							sessions: refreshedSessions.shift() ?? [
								activeSession,
								completedSession,
								archivedSession
							]
						})
					} as Response;
				}

				throw new Error(`Unexpected fetch: ${url}`);
			})
		);

		render(Page, {
			data: {
				sessions: [activeSession, completedSession, archivedSession]
			} as never
		});

		await expect
			.element(page.getByRole('link', { name: /View thread details for Archived session/i }))
			.not.toBeInTheDocument();

		await page.getByRole('checkbox', { name: /Select thread Past session/i }).click();
		await page.getByRole('button', { name: 'Archive selected' }).click();

		expect(archiveRequests).toEqual([{ archived: true, sessionIds: ['session-past'] }]);
		await expect.element(page.getByText('Archived 1 thread.')).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: /View thread details for Past session/i }))
			.not.toBeInTheDocument();

		await page.getByRole('checkbox', { name: 'Show archived threads' }).click();
		await expect.element(page.getByRole('heading', { name: 'Archived threads' })).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: /View thread details for Past session/i }))
			.toBeVisible();

		await page.getByRole('checkbox', { name: /Select thread Past session/i }).click();
		await page.getByRole('button', { name: 'Unarchive selected' }).click();

		expect(archiveRequests).toEqual([
			{ archived: true, sessionIds: ['session-past'] },
			{ archived: false, sessionIds: ['session-past'] }
		]);
		await expect.element(page.getByText('Unarchived 1 thread.')).toBeVisible();
	});
});
