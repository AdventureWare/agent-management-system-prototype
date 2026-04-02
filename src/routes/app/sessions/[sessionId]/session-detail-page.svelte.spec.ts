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
		activityAt: '2026-03-27T12:05:00.000Z',
		...overrides
	};
}

describe('/app/sessions/[sessionId]/+page.svelte', () => {
	it('shows the latest reply and lets you inspect older turns on a dedicated page', async () => {
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
			prompt:
				'Refine the implementation and add coverage while keeping the latest instruction readable at a glance, preserving the thread context hierarchy, avoiding oversized instruction blocks in the decision pane, and making sure the operator can still expand the full text when they need to inspect the exact wording of the last request.',
			lastMessage: 'Follow-up response from the agent.'
		});
		const middleRun = createRun({
			id: 'run-middle',
			mode: 'message',
			requestedThreadId: 'thread-1',
			createdAt: '2026-03-27T12:30:00.000Z',
			updatedAt: '2026-03-27T12:35:00.000Z',
			prompt: 'Tighten the layout and keep the summary readable.',
			lastMessage: 'Middle response with another checkpoint.'
		});
		const session: AgentSessionDetail = {
			id: 'session-1',
			name: 'Session detail inspector',
			cwd: '/tmp/project',
			sandbox: 'workspace-write',
			model: 'gpt-5.4',
			origin: 'external',
			threadId: 'thread-1',
			attachments: [
				{
					id: 'attachment-1',
					name: 'brief.md',
					path: '/tmp/session-1/attachments/brief.md',
					contentType: 'text/markdown',
					sizeBytes: 128,
					attachedAt: '2026-03-27T12:59:00.000Z'
				}
			],
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
					title: 'Session detail inspector task',
					status: 'running',
					isPrimary: true
				}
			],
			latestRun: followUpRun,
			runs: [followUpRun, middleRun, initialRun]
		};

		render(Page, {
			form: null as never,
			data: {
				session,
				sandboxOptions: ['read-only', 'workspace-write', 'danger-full-access'],
				taskResponseAction: {
					taskId: 'task-1',
					taskTitle: 'Session detail inspector task',
					taskProjectId: 'project_1',
					taskStatus: 'review',
					taskGoalId: 'goal_1',
					taskLane: 'product',
					taskPriority: 'high',
					taskRiskLevel: 'medium',
					taskApprovalMode: 'before_complete',
					taskRequiresReview: true,
					taskDesiredRoleId: 'role_builder',
					taskAssigneeWorkerId: 'worker_1',
					taskTargetDate: '2026-04-04',
					taskRequiredCapabilityNames: ['svelte', 'ux'],
					taskRequiredToolNames: ['codex'],
					openReview: {
						status: 'open',
						summary: 'Review the latest thread output.'
					},
					pendingApproval: {
						mode: 'before_complete',
						status: 'pending',
						summary: 'Sign-off required before closing.'
					},
					canApproveAndComplete: true,
					helperText:
						'Approving here will close the open review, approve the pending gate, and mark the task complete.',
					disabledReason: ''
				}
			} as never
		});

		await expect
			.element(page.getByRole('heading', { name: 'Session detail inspector' }))
			.toBeVisible();
		await expect.element(page.getByText('Thread status')).toBeVisible();
		await expect.element(page.getByRole('heading', { name: 'Available' })).toBeVisible();
		await expect
			.element(page.getByText('The thread is idle and available for the next instruction.'))
			.toBeVisible();
		await expect.element(page.getByText('Imported from Codex')).toBeVisible();
		await expect.element(page.getByText('latest run completed')).toBeVisible();
		await expect
			.element(
				page.getByText(/A work thread keeps one Codex conversation and all of its runs together\./i)
			)
			.toBeVisible();
		await expect
			.element(page.getByText(/Related tasks: Session detail inspector task/i))
			.toBeVisible();
		await expect.element(page.getByText('Current task')).toBeVisible();
		await expect.element(page.getByRole('heading', { name: 'Decision context' })).toBeVisible();
		await expect.element(page.getByText('Most recent response')).toBeVisible();
		await expect.element(page.getByText('Latest instruction')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Expand instruction' })).toBeVisible();
		await expect.element(page.getByText('Relevant context')).toBeVisible();
		await expect.element(page.getByText('Working on')).toBeVisible();
		await expect
			.element(page.getByText('Keep this visible while composing the next instruction.'))
			.toBeVisible();
		await expect
			.element(page.getByRole('link', { name: 'Open task detail' }).first())
			.toHaveAttribute('href', '/app/tasks/task-1');
		await expect.element(page.getByRole('button', { name: 'Create new task' })).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: /Back to threads/i }))
			.toHaveAttribute('href', '/app/sessions');
		await expect
			.element(
				page
					.getByTestId('session-detail-panel')
					.getByText('Follow-up response from the agent.')
					.first()
			)
			.toBeVisible();
		await expect
			.element(page.getByRole('button', { name: 'Send follow-up instruction' }))
			.toBeEnabled();
		await expect.element(page.getByRole('heading', { name: 'Thread attachments' })).toBeVisible();
		await expect.element(page.getByText('brief.md')).toBeVisible();
		await expect
			.element(page.getByRole('heading', { name: 'Approve task response' }))
			.toBeVisible();
		await expect
			.element(page.getByRole('button', { name: 'Approve response and complete task' }))
			.toBeEnabled();
		await page.getByRole('button', { name: 'Expand instruction' }).click();
		await expect.element(page.getByRole('button', { name: 'Collapse instruction' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: /Show 1 older turn/i })).toBeVisible();
		await page.getByRole('button', { name: /Show 1 older turn/i }).click();
		const initialRunCard = page.getByTestId('conversation-run-run-initial');

		await expect
			.element(initialRunCard.getByText(/without hiding the final clue for older turns\./i))
			.not.toBeInTheDocument();
		await initialRunCard.getByRole('button', { name: 'Expand full text' }).click();
		await expect
			.element(initialRunCard.getByText(/without hiding the final clue for older turns\./i))
			.toBeVisible();
		await expect
			.element(
				initialRunCard.getByText(
					/Initial response with the older run sentinel that should only be visible in the selected run detail after choosing the first turn\./i
				)
			)
			.toBeVisible();

		await page.getByRole('button', { name: 'Viewing Turn 1' }).click();

		await expect
			.element(page.getByRole('heading', { name: 'Inspect earlier context' }))
			.toBeVisible();
		await expect
			.element(page.getByText(/without hiding the final clue for older turns\./i))
			.toBeVisible();
		await expect
			.element(
				page
					.getByTestId('session-detail-panel')
					.getByText(
						/Initial response with the older run sentinel that should only be visible in the selected run detail after choosing the first turn\./i
					)
					.first()
			)
			.toBeVisible();
	});

	it('shows recovery controls when a thread needs attention', async () => {
		const failedRun = createRun({
			id: 'run-failed',
			mode: 'message',
			requestedThreadId: 'thread-1',
			state: {
				status: 'failed',
				pid: null,
				startedAt: '2026-03-27T12:01:00.000Z',
				finishedAt: '2026-03-27T12:05:00.000Z',
				exitCode: 1,
				signal: null,
				codexThreadId: 'thread-1'
			},
			lastMessage: null,
			prompt: 'Retry the build and finish the fix.'
		});
		const session: AgentSessionDetail = {
			id: 'session-1',
			name: 'Broken thread',
			cwd: '/tmp/project',
			sandbox: 'workspace-write',
			model: 'gpt-5.4',
			origin: 'managed',
			threadId: 'thread-1',
			attachments: [],
			archivedAt: null,
			createdAt: '2026-03-27T12:00:00.000Z',
			updatedAt: '2026-03-27T12:05:00.000Z',
			sessionState: 'attention',
			latestRunStatus: 'failed',
			hasActiveRun: false,
			canResume: true,
			runCount: 1,
			lastActivityAt: '2026-03-27T12:05:00.000Z',
			lastActivityLabel: 'moments ago',
			sessionSummary: 'The latest run failed and needs a recovery decision.',
			lastExitCode: 1,
			runTimeline: timeline,
			relatedTasks: [],
			latestRun: failedRun,
			runs: [failedRun]
		};

		render(Page, {
			form: null as never,
			data: {
				session,
				sandboxOptions: ['read-only', 'workspace-write', 'danger-full-access'],
				taskResponseAction: null
			} as never
		});

		await expect.element(page.getByRole('heading', { name: 'Recover or move work' })).toBeVisible();
		await expect
			.element(page.getByRole('button', { name: 'Recover in this thread' }))
			.toBeEnabled();
		await expect
			.element(page.getByRole('button', { name: 'Move latest request to new thread' }))
			.toBeEnabled();
	});
});
