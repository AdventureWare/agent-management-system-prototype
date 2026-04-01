import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { TASK_STATUS_OPTIONS } from '$lib/types/control-plane';
import Page from './+page.svelte';

function createTask(overrides: Record<string, unknown> = {}) {
	return {
		id: 'task_default',
		title: 'Default task',
		summary: 'Default summary',
		projectId: 'project_1',
		lane: 'product',
		goalId: '',
		priority: 'medium',
		status: 'ready',
		riskLevel: 'medium',
		approvalMode: 'none',
		requiresReview: true,
		desiredRoleId: 'role_1',
		assigneeWorkerId: null,
		threadSessionId: null,
		blockedReason: '',
		dependencyTaskIds: [],
		runCount: 0,
		latestRunId: null,
		artifactPath: '/tmp/project/out',
		attachments: [],
		createdAt: '2026-03-30T09:00:00.000Z',
		updatedAt: '2026-03-31T09:00:00.000Z',
		projectName: 'Agent Management System Prototype',
		assigneeName: 'Unassigned',
		latestRun: null,
		assignedThread: null,
		latestRunThread: null,
		statusThread: null,
		linkThread: null,
		linkThreadKind: null,
		updatedAtLabel: '1h ago',
		hasUnmetDependencies: false,
		openReview: null,
		pendingApproval: null,
		freshness: {
			isStale: false,
			staleSignals: [],
			staleInProgress: false,
			noRecentRunActivity: false,
			activeThreadNoRecentOutput: false,
			taskAgeMs: 60 * 60 * 1000,
			taskAgeLabel: '1h ago',
			runActivityAgeMs: null,
			runActivityAgeLabel: 'No activity yet',
			threadActivityAgeMs: null,
			threadActivityAgeLabel: 'No activity yet'
		},
		...overrides
	};
}

function createIdeationReview(overrides: Record<string, unknown> = {}) {
	return {
		projectId: 'project_1',
		projectName: 'Agent Management System Prototype',
		sessionId: 'session_ideation_1',
		sessionState: 'waiting',
		lastActivityAt: '2026-03-31T09:00:00.000Z',
		lastActivityLabel: '1h ago',
		sessionSummary: 'Suggested follow-up queue work.',
		hasActiveRun: false,
		canResume: true,
		suggestionCount: 1,
		hasSavedReply: true,
		defaultDraftRoleId: 'role_1',
		defaultDraftRoleName: 'Coordinator',
		defaultArtifactPath: '/tmp/project/out',
		suggestions: [
			{
				index: 0,
				title: 'Add queue review flow',
				whyItMatters: 'Keeps task intake aligned with follow-up work.',
				suggestedInstructions: 'Create a review step for ideation output.',
				signals: 'Existing queue management work suggests this gap.',
				confidence: 'medium'
			}
		],
		...overrides
	};
}

function renderPage(
	tasks = [] as ReturnType<typeof createTask>[],
	ideationReviews = [] as ReturnType<typeof createIdeationReview>[]
) {
	render(Page, {
		form: {} as never,
		data: {
			deleted: false,
			statusOptions: TASK_STATUS_OPTIONS,
			defaultDraftRoleName: 'Coordinator',
			ideationReviews,
			projects: [
				{
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'Primary app project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/out',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				}
			],
			workers: [],
			tasks
		} as never
	});
}

describe('/app/tasks/+page.svelte', () => {
	it('renders the project selector before the task name in the create form', async () => {
		renderPage();

		const createFormLabels = Array.from(
			document.querySelectorAll('form[action="?/createTask"] label > span:first-child')
		).map((label) => label.textContent?.trim());

		expect(createFormLabels.slice(0, 2)).toEqual(['Project', 'Name']);
	});

	it('renders create and run controls in the quick create form', async () => {
		renderPage();

		await expect.element(page.getByRole('button', { name: 'Create task' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Create and run' })).toBeInTheDocument();
	});

	it('renders a multi-file attachment control in the quick create form', async () => {
		renderPage();

		const attachmentInput = document.querySelector(
			'form[action="?/createTask"] input[name="attachments"]'
		) as HTMLInputElement | null;

		expect(attachmentInput).not.toBeNull();
		expect(attachmentInput?.multiple).toBe(true);
		await expect
			.element(page.getByText('Paste files into the form to attach them'))
			.toBeInTheDocument();
	});

	it('adds pasted files to the quick create attachment list', async () => {
		renderPage();

		const createForm = document.querySelector(
			'form[action="?/createTask"]'
		) as HTMLFormElement | null;
		const attachmentInput = document.querySelector(
			'form[action="?/createTask"] input[name="attachments"]'
		) as HTMLInputElement | null;

		expect(createForm).not.toBeNull();
		expect(attachmentInput).not.toBeNull();

		const file = new File(['brief'], 'brief.md', { type: 'text/markdown' });
		const dataTransfer = new DataTransfer();
		dataTransfer.items.add(file);
		const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });

		Object.defineProperty(pasteEvent, 'clipboardData', {
			value: dataTransfer
		});

		createForm?.dispatchEvent(pasteEvent);

		expect(attachmentInput?.files).toHaveLength(1);
		expect(attachmentInput?.files?.[0]?.name).toBe('brief.md');
		await expect.element(page.getByText('1 attachment selected')).toBeInTheDocument();
		await expect.element(page.getByText('brief.md')).toBeInTheDocument();
	});

	it('filters the active queue with stale work chips', async () => {
		renderPage([
			createTask({
				id: 'task_stale',
				title: 'Stale in-progress task',
				status: 'in_progress',
				freshness: {
					isStale: true,
					staleSignals: ['staleInProgress'],
					staleInProgress: true,
					noRecentRunActivity: false,
					activeThreadNoRecentOutput: false,
					taskAgeMs: 8 * 60 * 60 * 1000,
					taskAgeLabel: '8h ago',
					runActivityAgeMs: null,
					runActivityAgeLabel: 'No activity yet',
					threadActivityAgeMs: null,
					threadActivityAgeLabel: 'No activity yet'
				}
			}),
			createTask({
				id: 'task_fresh',
				title: 'Fresh ready task',
				status: 'ready'
			})
		]);

		await expect.element(page.getByText('Stale in-progress task')).toBeInTheDocument();
		await expect.element(page.getByText('Fresh ready task')).toBeInTheDocument();

		await page.getByRole('button', { name: /Stale in-progress \(1\)/i }).click();

		await expect.element(page.getByText('Stale in-progress task')).toBeInTheDocument();
		await expect.element(page.getByText('Fresh ready task')).not.toBeInTheDocument();
	});

	it('renders task ideation in a collapsed section below the queue', async () => {
		renderPage([], [createIdeationReview()]);

		const ideationPanel = document.querySelector('details');
		const headings = Array.from(document.querySelectorAll('h2')).map((heading) =>
			heading.textContent?.trim()
		);

		expect(ideationPanel).not.toBeNull();
		expect(ideationPanel?.open).toBe(false);
		expect(headings.indexOf('Active queue')).toBeLessThan(
			headings.indexOf('Ideation assistant and saved reviews')
		);
		await expect
			.element(page.getByRole('heading', { name: 'Ideation assistant and saved reviews' }))
			.toBeVisible();
	});
});
