import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
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
		...overrides
	};
}

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
			threadId: 'thread-1',
			createdAt: '2026-03-27T12:00:00.000Z',
			updatedAt: '2026-03-27T13:03:00.000Z',
			status: 'completed',
			hasActiveRun: false,
			canResume: true,
			runCount: 2,
			lastActivityAt: '2026-03-27T13:03:00.000Z',
			lastActivityLabel: 'moments ago',
			statusSummary: 'Completed and ready for a follow-up instruction.',
			lastExitCode: 0,
			runTimeline: timeline,
			latestRun: run,
			runs: [run]
		};

		render(Page, {
			data: {
				sessions: [session],
				sandboxOptions: ['read-only', 'workspace-write', 'danger-full-access'],
				folderOptions: [],
				projects: []
			} as never,
			form: null as never
		});

		await expect
			.element(page.getByText('Last reply: Follow-up response from the agent.'))
			.toBeVisible();
		await expect
			.element(page.getByRole('link', { name: /View details for Session detail inspector/i }))
			.toHaveAttribute('href', '/app/sessions/session-1');
		await expect
			.element(page.getByRole('link', { name: /View details for Session detail inspector/i }))
			.toHaveAttribute('data-sveltekit-reload', '');
		await expect.element(page.getByRole('link', { name: 'View session' })).toBeVisible();
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
			threadId: 'thread-active',
			createdAt: '2026-03-27T14:00:00.000Z',
			updatedAt: '2026-03-27T14:01:00.000Z',
			status: 'running',
			hasActiveRun: true,
			canResume: false,
			runCount: 1,
			lastActivityAt: '2026-03-27T14:01:00.000Z',
			lastActivityLabel: 'just now',
			statusSummary: 'Codex is actively working right now.',
			lastExitCode: null,
			runTimeline: timeline,
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
			threadId: 'thread-past',
			createdAt: '2026-03-27T13:00:00.000Z',
			updatedAt: '2026-03-27T13:10:00.000Z',
			status: 'completed',
			hasActiveRun: false,
			canResume: true,
			runCount: 1,
			lastActivityAt: '2026-03-27T13:10:00.000Z',
			lastActivityLabel: '50m ago',
			statusSummary: 'Completed and ready for a follow-up instruction.',
			lastExitCode: 0,
			runTimeline: timeline,
			latestRun: completedRun,
			runs: [completedRun]
		};

		render(Page, {
			data: {
				sessions: [activeSession, completedSession],
				sandboxOptions: ['read-only', 'workspace-write', 'danger-full-access'],
				folderOptions: [],
				projects: []
			} as never,
			form: null as never
		});

		await expect
			.element(page.getByRole('link', { name: /View details for Active session/i }))
			.toHaveAttribute('href', '/app/sessions/session-active');
		await expect
			.element(page.getByRole('link', { name: /View details for Active session/i }))
			.toHaveAttribute('data-sveltekit-reload', '');
		await expect
			.element(page.getByRole('link', { name: /View details for Past session/i }))
			.toHaveAttribute('href', '/app/sessions/session-past');
	});
});
