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
	it('shows the latest reply preview and lets you inspect older turns', async () => {
		const initialRun = createRun({
			id: 'run-initial',
			prompt:
				'Read the repository and implement a session detail inspector that preserves the full conversation context all the way through the last sentence without hiding the final clue for older turns.',
			lastMessage:
				'Initial response with the older run sentinel that should only be visible in the selected run detail after choosing the first turn.'
		});
		const followUpRun = createRun({
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
			latestRun: followUpRun,
			runs: [followUpRun, initialRun]
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
		await expect.element(page.getByText('Refine the implementation and add coverage.')).toBeVisible();
		await expect.element(page.getByText('Follow-up response from the agent.')).toBeVisible();

		await page.getByRole('button', { name: /Turn 1/i }).click();

		await expect
			.element(page.getByText(/without hiding the final clue for older turns\./i))
			.toBeVisible();
		await expect
			.element(
				page.getByText(
					/Initial response with the older run sentinel that should only be visible in the selected run detail after choosing the first turn\./i
				)
			)
			.toBeVisible();
	});
});
