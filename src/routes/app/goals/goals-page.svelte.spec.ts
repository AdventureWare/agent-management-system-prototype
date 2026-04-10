import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { GOAL_STATUS_OPTIONS, AREA_OPTIONS } from '$lib/types/control-plane';
import Page from './+page.svelte';

function renderPage(form: Record<string, unknown> = {}) {
	render(Page, {
		form: form as never,
		data: {
			goals: [
				{
					id: 'goal_parent',
					name: 'Grow Kwipoo into a repeatable business',
					area: 'growth',
					status: 'running',
					summary: 'Establish repeatable acquisition and retention loops.',
					artifactPath: '/tmp/project/agent_output/goals/grow-kwipoo',
					targetDate: '2026-05-20',
					successSignal: 'The team can point to a reliable acquisition channel.',
					parentGoalId: null,
					parentGoalName: '',
					childGoals: [
						{
							id: 'goal_child',
							name: 'Validate creator partnerships',
							status: 'ready'
						}
					],
					childGoalCount: 1,
					linkedProjects: [{ id: 'project_1', name: 'Kwipoo website' }],
					linkedTasks: [
						{
							id: 'task_1',
							title: 'Draft creator outreach plan',
							status: 'ready',
							projectName: 'Kwipoo website'
						}
					],
					relatedTaskCount: 1
				},
				{
					id: 'goal_child',
					name: 'Validate creator partnerships',
					area: 'growth',
					status: 'ready',
					summary: 'Prove whether creator partnerships can become a repeatable channel.',
					artifactPath: '/tmp/project/agent_output/goals/creator-partnerships',
					targetDate: null,
					successSignal: 'At least one creator channel shows repeatable traction.',
					parentGoalId: 'goal_parent',
					parentGoalName: 'Grow Kwipoo into a repeatable business',
					childGoals: [],
					childGoalCount: 0,
					linkedProjects: [{ id: 'project_1', name: 'Kwipoo website' }],
					linkedTasks: [],
					relatedTaskCount: 0
				}
			],
			areaOptions: AREA_OPTIONS,
			statusOptions: GOAL_STATUS_OPTIONS,
			folderOptions: [],
			parentGoalOptions: [
				{
					id: 'goal_parent',
					name: 'Grow Kwipoo into a repeatable business',
					status: 'running',
					artifactPath: '/tmp/project/agent_output/goals/grow-kwipoo'
				}
			],
			projectOptions: [
				{
					id: 'project_1',
					name: 'Kwipoo website',
					summary: 'Marketing and launch surface.',
					defaultArtifactRoot: '/tmp/project/agent_output',
					projectRootFolder: '/tmp/project'
				}
			],
			taskOptions: [
				{
					id: 'task_1',
					title: 'Draft creator outreach plan',
					status: 'ready',
					projectId: 'project_1',
					projectName: 'Kwipoo website',
					currentGoalId: 'goal_parent',
					currentGoalName: 'Grow Kwipoo into a repeatable business'
				}
			]
		} as never
	});
}

describe('/app/goals/+page.svelte', () => {
	it('renders the goal directory table with relationship counts and open links', async () => {
		renderPage();

		expect(document.body.textContent).toContain('Goal directory');
		expect(document.body.textContent).toContain('Add goal');
		expect(document.body.textContent).toContain('Grow Kwipoo into a repeatable business');
		expect(document.body.textContent).toContain('Validate creator partnerships');
		expect(document.body.textContent).toContain('Subgoal');
		expect(document.body.textContent).toContain('1 project');
		expect(document.body.textContent).toContain('1 task');
		expect(document.body.textContent).toContain('May 20, 2026');
		expect(document.body.textContent).toContain('Unscheduled');
		expect(document.body.textContent).toContain('Open');
	});

	it('renders goal-writing assist controls in the create dialog', async () => {
		renderPage();
		await page.getByRole('button', { name: 'Add goal' }).click();

		const assistButton = document.querySelector(
			'form[action="?/createGoal"] button[formaction="?/assistGoalWriting"]'
		) as HTMLButtonElement | null;

		expect(assistButton).not.toBeNull();
		expect(assistButton?.textContent?.trim()).toBe('Improve with AI');
		expect(assistButton?.disabled).toBe(true);

		await page.getByRole('textbox', { name: 'Name' }).fill('Clarify the goal');

		expect(assistButton?.disabled).toBe(false);
	});

	it('keeps the create dialog open and shows the rewritten goal draft after assist', async () => {
		renderPage({
			ok: true,
			successAction: 'assistGoalWriting',
			reopenCreateModal: true,
			assistChangeSummary:
				'Rewrote the goal draft into a clearer outcome, summary, and observable success signal.',
			values: {
				name: 'Help operators define goals clearly before linking work',
				summary:
					'This goal improves the goal-writing flow so operators can describe the outcome before managing structure. It matters because weak goal framing makes linked execution harder to trust.',
				successSignal:
					'Most new goals include a concrete outcome and a visible proof point before execution work is linked.'
			}
		});

		await expect.element(page.getByRole('dialog', { name: 'Add goal' })).toBeInTheDocument();
		await expect
			.element(
				page.getByText(
					'Rewrote the goal draft into a clearer outcome, summary, and observable success signal.'
				)
			)
			.toBeInTheDocument();

		const nameInput = document.querySelector(
			'form[action="?/createGoal"] input[name="name"]'
		) as HTMLInputElement | null;
		const summaryInput = document.querySelector(
			'form[action="?/createGoal"] textarea[name="summary"]'
		) as HTMLTextAreaElement | null;
		const successSignalInput = document.querySelector(
			'form[action="?/createGoal"] textarea[name="successSignal"]'
		) as HTMLTextAreaElement | null;

		expect(nameInput?.value).toBe('Help operators define goals clearly before linking work');
		expect(summaryInput?.value).toContain('This goal improves the goal-writing flow');
		expect(successSignalInput?.value).toContain('Most new goals include a concrete outcome');
	});

	it('shows a recovery hint when matching goals are hidden in collapsed branches', async () => {
		renderPage();

		await page
			.getByRole('button', {
				name: /Collapse subgoals for Grow Kwipoo into a repeatable business/i
			})
			.click();

		expect(document.body.textContent).not.toContain('Validate creator partnerships');
		expect(document.body.textContent).toContain(
			'1 matching goal is currently hidden inside collapsed branches.'
		);

		await page.getByRole('button', { name: 'Expand all' }).click();

		expect(document.body.textContent).toContain('Validate creator partnerships');
	});
});
