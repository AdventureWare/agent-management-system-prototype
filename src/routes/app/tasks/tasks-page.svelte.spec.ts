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
		area: 'product',
		goalId: '',
		priority: 'medium',
		status: 'ready',
		riskLevel: 'medium',
		approvalMode: 'none',
		requiresReview: true,
		desiredRoleId: 'role_1',
		assigneeWorkerId: null,
		agentThreadId: null,
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
		desiredRoleName: 'Coordinator',
		dependencyTaskNames: [],
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

function createGoal(overrides: Record<string, unknown> = {}) {
	return {
		id: 'goal_1',
		name: 'Reduce task intake friction',
		label: 'Reduce task intake friction',
		depth: 0,
		parentGoalId: null,
		status: 'running',
		area: 'product',
		...overrides
	};
}

function renderPage(
	tasks = [] as ReturnType<typeof createTask>[],
	form: Record<string, unknown> = {},
	createTaskPrefill: Record<string, unknown> = {}
) {
	render(Page, {
		form: form as never,
		data: {
			deleted: false,
			createTaskPrefill: {
				open: false,
				projectId: '',
				name: '',
				instructions: '',
				assigneeWorkerId: '',
				targetDate: '',
				goalId: '',
				requiredCapabilityNames: '',
				requiredToolNames: '',
				...createTaskPrefill
			},
			goals: [createGoal()],
			statusOptions: TASK_STATUS_OPTIONS,
			defaultDraftRoleName: 'Coordinator',
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
			roles: [
				{
					id: 'role_1',
					name: 'Coordinator',
					area: 'shared',
					description: 'Routes work'
				},
				{
					id: 'role_2',
					name: 'Reviewer',
					area: 'shared',
					description: 'Reviews work'
				}
			],
			availableDependencyTasks: [
				{
					id: 'task_dependency',
					title: 'Existing dependency task',
					status: 'in_progress',
					projectId: 'project_1',
					projectName: 'Agent Management System Prototype'
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

	it('renders a stacked task card layout for small-screen queue scanning', async () => {
		renderPage([
			createTask({
				id: 'task_mobile',
				title: 'Run the mobile operator loop',
				linkThread: {
					id: 'thread_1',
					name: 'Operator loop thread',
					threadState: 'ready'
				}
			})
		]);

		const mobileCard = page.getByTestId('task-mobile-card-task_mobile');

		await expect.element(mobileCard).toBeInTheDocument();
		await expect.element(mobileCard.getByRole('link', { name: 'Open task' })).toBeInTheDocument();
		await expect
			.element(mobileCard.getByRole('link', { name: 'Review assigned thread' }))
			.toBeInTheDocument();
	});

	it('keeps the desktop queue in table view and renders action menus for panel opening', () => {
		renderPage([
			createTask({
				id: 'task_preview',
				title: 'Preview the queue row beside the table',
				summary: 'Keep the current task context visible while scanning adjacent rows.',
				linkThread: {
					id: 'thread_preview',
					name: 'Preview thread',
					threadState: 'ready'
				}
			}),
			createTask({
				id: 'task_secondary',
				title: 'Secondary queue row',
				summary: 'Another task in the queue for comparison.'
			})
		]);

		expect(document.querySelector('[data-testid="task-detail-panel"]')).toBeNull();
		expect(document.body.textContent).toContain('Open task');
		expect(document.body.textContent).toContain('Review assigned thread');
		expect(
			Array.from(document.querySelectorAll('button')).some(
				(button) => button.textContent?.trim() === 'More'
			)
		).toBe(true);
	});

	it('keeps the task index toolbar sticky while the queue scrolls', () => {
		renderPage([createTask()]);

		const toolbar = document.querySelector('[data-testid="task-index-toolbar"]');

		expect(toolbar?.className).toContain('sticky');
		expect(toolbar?.className).toContain('top-0');
		expect(toolbar?.className).toContain('z-20');
	});

	it('renders the project selector before the task name in the create form', async () => {
		renderPage();
		await page.getByRole('button', { name: 'Add task' }).click();

		const createFormLabels = Array.from(
			document.querySelectorAll('form[action="?/createTask"] label > span:first-child')
		).map((label) => label.textContent?.trim());

		expect(createFormLabels.slice(0, 2)).toEqual(['Project', 'Name']);
	});

	it('includes a required sandbox control in the advanced create task intake', async () => {
		renderPage();
		await page.getByRole('button', { name: 'Add task' }).click();
		await page.getByRole('button', { name: 'Show advanced' }).click();

		await expect
			.element(page.getByRole('combobox', { name: 'Required sandbox' }))
			.toBeInTheDocument();
	});

	it('renders create and run controls in the quick create form', async () => {
		renderPage();
		await page.getByRole('button', { name: 'Add task' }).click();

		await expect
			.element(page.getByRole('button', { name: 'Create task', exact: true }))
			.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Create and run' })).toBeInTheDocument();

		const assistButton = document.querySelector(
			'form[action="?/createTask"] button[formaction="?/assistTaskWriting"]'
		) as HTMLButtonElement | null;

		expect(assistButton).not.toBeNull();
		expect(assistButton?.textContent?.trim()).toBe('Improve with AI');
	});

	it('renders a goal selector and removes the queue snapshot pane from the create form', async () => {
		renderPage();
		await page.getByRole('button', { name: 'Add task' }).click();

		const goalSelect = document.querySelector(
			'form[action="?/createTask"] select[name="goalId"]'
		) as HTMLSelectElement | null;

		expect(goalSelect).not.toBeNull();
		expect(goalSelect?.value).toBe('');
		await expect.element(page.getByText('Reduce task intake friction')).toBeInTheDocument();
		await expect.element(page.getByText('Queue snapshot')).not.toBeInTheDocument();
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

	it('keeps advanced routing fields collapsed until requested', async () => {
		renderPage();
		await page.getByRole('button', { name: 'Add task' }).click();

		await expect.element(page.getByText('Advanced intake')).toBeInTheDocument();
		await expect.element(page.getByText('Defaults stay lightweight')).toBeInTheDocument();
		expect(
			document.querySelector('form[action="?/createTask"] select[name="priority"]')
		).toBeNull();

		await page.getByRole('button', { name: 'Show advanced' }).click();

		expect(
			document.querySelector('form[action="?/createTask"] select[name="priority"]')
		).not.toBeNull();
		expect(
			document.querySelector('form[action="?/createTask"] textarea[name="blockedReason"]')
		).not.toBeNull();
		await expect.element(page.getByText('Existing dependency task')).toBeInTheDocument();
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
				goalId: 'goal_1',
				area: 'product',
				priority: 'urgent',
				riskLevel: 'high',
				approvalMode: 'before_apply',
				requiresReview: false,
				desiredRoleId: 'role_2',
				blockedReason: 'Waiting on review environment access.',
				dependencyTaskIds: ['task_dependency'],
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
		await expect.element(page.getByRole('button', { name: 'Hide advanced' })).toBeInTheDocument();
		expect(
			(
				document.querySelector(
					'form[action="?/createTask"] select[name="priority"]'
				) as HTMLSelectElement | null
			)?.value
		).toBe('urgent');
		expect(
			(
				document.querySelector(
					'form[action="?/createTask"] textarea[name="blockedReason"]'
				) as HTMLTextAreaElement | null
			)?.value
		).toBe('Waiting on review environment access.');
		expect(
			(
				document.querySelector(
					'form[action="?/createTask"] input[name="dependencyTaskIds"]'
				) as HTMLInputElement | null
			)?.checked
		).toBe(true);
	});

	it('opens the create dialog from a prefilled deep link', async () => {
		renderPage(
			[],
			{},
			{
				open: true,
				projectId: 'project_1',
				name: 'Follow-up: Default task',
				instructions: 'Create a new task from detail context.',
				goalId: 'goal_1'
			}
		);

		await expect.element(page.getByRole('dialog', { name: 'Create task' })).toBeInTheDocument();

		const nameInput = document.querySelector(
			'form[action="?/createTask"] input[name="name"]'
		) as HTMLInputElement | null;
		const instructionsInput = document.querySelector(
			'form[action="?/createTask"] textarea[name="instructions"]'
		) as HTMLTextAreaElement | null;
		const goalSelect = document.querySelector(
			'form[action="?/createTask"] select[name="goalId"]'
		) as HTMLSelectElement | null;

		expect(nameInput?.value).toBe('Follow-up: Default task');
		expect(instructionsInput?.value).toBe('Create a new task from detail context.');
		expect(goalSelect?.value).toBe('goal_1');
	});

	it('keeps the create dialog open and shows the rewritten instructions after writing assist', async () => {
		renderPage([], {
			ok: true,
			formContext: 'taskCreate',
			successAction: 'assistTaskWriting',
			reopenCreateModal: true,
			projectId: 'project_1',
			name: 'Rewrite this task',
			instructions:
				'## Objective\nClarify the task.\n\n## Deliverable\nReturn a tighter agent-facing brief.',
			assistChangeSummary:
				'Rewrote the draft into a clearer execution brief with explicit deliverable and constraints.'
		});

		await expect.element(page.getByRole('dialog', { name: 'Create task' })).toBeInTheDocument();
		await expect
			.element(
				page.getByText(
					'Rewrote the draft into a clearer execution brief with explicit deliverable and constraints.'
				)
			)
			.toBeInTheDocument();

		const instructionsInput = document.querySelector(
			'form[action="?/createTask"] textarea[name="instructions"]'
		) as HTMLTextAreaElement | null;

		expect(instructionsInput?.value).toContain('## Objective');
		expect(instructionsInput?.value).toContain('Return a tighter agent-facing brief.');
	});

	it('shows routing metadata directly in queue rows', async () => {
		renderPage([
			createTask({
				id: 'task_routed',
				title: 'Routed task',
				priority: 'urgent',
				riskLevel: 'high',
				approvalMode: 'before_apply',
				requiresReview: false,
				desiredRoleId: 'role_2',
				desiredRoleName: 'Reviewer',
				blockedReason: 'Awaiting stakeholder sign-off.',
				dependencyTaskNames: ['Existing dependency task']
			})
		]);

		const routedTaskCard = page.getByTestId('task-mobile-card-task_routed');

		await expect.element(routedTaskCard.getByText('Urgent')).toBeInTheDocument();
		await expect.element(routedTaskCard.getByText('High risk')).toBeInTheDocument();
		await expect.element(routedTaskCard.getByText('Review optional')).toBeInTheDocument();
		await expect.element(routedTaskCard.getByText('Role Reviewer')).toBeInTheDocument();
		await expect
			.element(routedTaskCard.getByText('Awaiting stakeholder sign-off.'))
			.toBeInTheDocument();
		await expect
			.element(routedTaskCard.getByText('Depends on: Existing dependency task'))
			.toBeInTheDocument();
	});

	it('clears a saved create-task draft after successful creation', () => {
		window.localStorage.setItem(
			'ams:create-task',
			JSON.stringify({
				projectId: 'project_1',
				name: 'Stale draft'
			})
		);

		renderPage([], {
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

		const staleTaskCard = page.getByTestId('task-mobile-card-task_stale');
		const freshTaskCard = page.getByTestId('task-mobile-card-task_fresh');

		await expect.element(staleTaskCard).toBeInTheDocument();
		await expect.element(freshTaskCard).toBeInTheDocument();

		await page.getByRole('button', { name: /Stale WIP \(1\)/i }).click();

		await expect.element(staleTaskCard).toBeInTheDocument();
		await expect.element(freshTaskCard).not.toBeInTheDocument();
	});

	it('shows the target date in the queue when a task has one', async () => {
		renderPage([
			createTask({
				id: 'task_target_date',
				title: 'Task with date',
				targetDate: '2026-04-18'
			})
		]);

		await expect
			.element(
				page.getByTestId('task-mobile-card-task_target_date').getByText('Target Apr 18, 2026')
			)
			.toBeInTheDocument();
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

		const activeTaskCard = page.getByTestId('task-mobile-card-task_active');
		const completedTaskCard = page.getByTestId('task-mobile-card-task_done');

		await expect.element(activeTaskCard).toBeInTheDocument();
		await expect.element(completedTaskCard).not.toBeInTheDocument();

		await page.getByRole('tab', { name: /Completed work 1/i }).click();

		await expect.element(completedTaskCard).toBeInTheDocument();
		await expect.element(activeTaskCard).not.toBeInTheDocument();
	});
});
