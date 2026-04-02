import { page } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
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
		targetDate: null,
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
	ideationReviews = [] as ReturnType<typeof createIdeationReview>[],
	form: Record<string, unknown> = {}
) {
	render(Page, {
		form: form as never,
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
			projectSkillSummaries: [
				{
					projectId: 'project_1',
					totalCount: 2,
					globalCount: 1,
					projectCount: 1,
					previewSkills: [
						{
							id: 'skill-installer',
							description: 'Install Codex skills',
							global: true,
							project: false,
							sourceLabel: 'Global'
						},
						{
							id: 'web-design-guidelines',
							description: 'Review UI against guidelines',
							global: false,
							project: true,
							sourceLabel: 'Project'
						}
					]
				}
			],
			workers: [],
			tasks
		} as never
	});
}

describe('/app/tasks/+page.svelte', () => {
	afterEach(() => {
		window.localStorage.clear();
	});

	it('stretches the active queue table to the full section width', () => {
		renderPage([createTask()]);

		const appPage = document.querySelector('.ui-page');
		const queueTable = document.querySelector('table');

		expect(appPage?.className).toContain('max-w-none');
		expect(queueTable?.className).toContain('w-full');
	});

	it('renders the project selector before the task name in the create form', async () => {
		renderPage();
		await page.getByRole('button', { name: 'Add task' }).click();

		const createFormLabels = Array.from(
			document.querySelectorAll('form[action="?/createTask"] label > span:first-child')
		).map((label) => label.textContent?.trim());

		expect(createFormLabels.slice(0, 2)).toEqual(['Project', 'Name']);
	});

	it('renders create and run controls in the quick create form', async () => {
		renderPage();
		await page.getByRole('button', { name: 'Add task' }).click();

		await expect
			.element(page.getByRole('button', { name: 'Create task', exact: true }))
			.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Create and run' })).toBeInTheDocument();
	});

	it('renders a multi-file attachment control in the quick create form', async () => {
		renderPage();
		await page.getByRole('button', { name: 'Add task' }).click();

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
		await page.getByRole('button', { name: 'Add task' }).click();

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

	it('shows project skill coverage inside the create dialog', async () => {
		renderPage();
		await page.getByRole('button', { name: 'Add task' }).click();

		await expect.element(page.getByText('Skill coverage')).toBeInTheDocument();
		await expect
			.element(page.getByText('2 installed skills will be available when this task launches.'))
			.toBeInTheDocument();
		await expect.element(page.getByText('skill-installer')).toBeInTheDocument();
		await expect.element(page.getByText('web-design-guidelines')).toBeInTheDocument();
	});

	it('restores a saved create-task draft after reload', async () => {
		window.localStorage.setItem(
			'ams:create-task',
			JSON.stringify({
				projectId: 'project_1',
				name: 'Keep my draft',
				instructions: 'Persist this between reloads.',
				assigneeWorkerId: '',
				targetDate: '2026-04-10',
				requiredCapabilityNames: 'planning, citations',
				requiredToolNames: 'codex'
			})
		);

		renderPage();

		await expect.element(page.getByRole('dialog', { name: 'Create task' })).toBeInTheDocument();

		const nameInput = document.querySelector(
			'form[action="?/createTask"] input[name="name"]'
		) as HTMLInputElement | null;
		const targetDateInput = document.querySelector(
			'form[action="?/createTask"] input[name="targetDate"]'
		) as HTMLInputElement | null;
		const instructionsInput = document.querySelector(
			'form[action="?/createTask"] textarea[name="instructions"]'
		) as HTMLTextAreaElement | null;
		const requiredCapabilitiesInput = document.querySelector(
			'form[action="?/createTask"] input[name="requiredCapabilityNames"]'
		) as HTMLInputElement | null;
		const requiredToolsInput = document.querySelector(
			'form[action="?/createTask"] input[name="requiredToolNames"]'
		) as HTMLInputElement | null;

		expect(nameInput?.value).toBe('Keep my draft');
		expect(targetDateInput?.value).toBe('2026-04-10');
		expect(instructionsInput?.value).toBe('Persist this between reloads.');
		expect(requiredCapabilitiesInput?.value).toBe('planning, citations');
		expect(requiredToolsInput?.value).toBe('codex');
	});

	it('clears a saved create-task draft after successful creation', () => {
		window.localStorage.setItem(
			'ams:create-task',
			JSON.stringify({
				projectId: 'project_1',
				name: 'Stale draft'
			})
		);

		renderPage([], [], {
			ok: true,
			successAction: 'createTask'
		});

		expect(window.localStorage.getItem('ams:create-task')).toBeNull();
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

		await expect
			.element(page.getByText('Stale in-progress task', { exact: true }))
			.toBeInTheDocument();
		await expect.element(page.getByText('Fresh ready task', { exact: true })).toBeInTheDocument();

		await page.getByRole('button', { name: /Stale in-progress \(1\)/i }).click();

		await expect
			.element(page.getByText('Stale in-progress task', { exact: true }))
			.toBeInTheDocument();
		await expect
			.element(page.getByText('Fresh ready task', { exact: true }))
			.not.toBeInTheDocument();
	});

	it('shows the target date in the queue when a task has one', async () => {
		renderPage([
			createTask({
				id: 'task_target_date',
				title: 'Task with date',
				targetDate: '2026-04-18'
			})
		]);

		await expect.element(page.getByText('Target Apr 18, 2026')).toBeInTheDocument();
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

	it('switches between active and completed task views with local tabs', async () => {
		renderPage([
			createTask({
				id: 'task_active',
				title: 'Active queue item',
				status: 'ready'
			}),
			createTask({
				id: 'task_done',
				title: 'Completed queue item',
				status: 'done'
			})
		]);

		await expect.element(page.getByText('Active queue item', { exact: true })).toBeInTheDocument();
		await expect
			.element(page.getByText('Completed queue item', { exact: true }))
			.not.toBeInTheDocument();

		await page.getByRole('tab', { name: /Completed work 1/i }).click();

		await expect
			.element(page.getByText('Completed queue item', { exact: true }))
			.toBeInTheDocument();
		await expect
			.element(page.getByText('Active queue item', { exact: true }))
			.not.toBeInTheDocument();
	});
});
