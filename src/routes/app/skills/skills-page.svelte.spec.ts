import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

function renderPage(form: Record<string, unknown> = {}) {
	render(Page, {
		form: form as never,
		data: {
			projects: [
				{
					id: 'project_app',
					name: 'Agent Management System Prototype',
					projectRootFolder: '/tmp/ams'
				}
			],
			executionCatalog: {
				skills: [
					{
						id: 'docs-writer',
						description: 'Write project docs',
						availableProjectCount: 1,
						projectLocalProjectCount: 1,
						globalProjectCount: 0,
						requestedProjectCount: 1,
						requestingTaskCount: 2,
						missingProjectCount: 0,
						tasksMissingRequestedSkillCount: 0,
						projects: [
							{
								projectId: 'project_app',
								projectName: 'Agent Management System Prototype',
								projectHref: '/app/projects/project_app',
								installed: true,
								projectLocal: true,
								global: false,
								sourceLabel: 'Project',
								description: 'Write project docs',
								availability: 'enabled',
								availabilityLabel: 'Enabled for project',
								availabilityNotes: 'Required by docs tasks.',
								requestingTaskCount: 2,
								missing: false
							}
						]
					},
					{
						id: 'release-runner',
						description: 'Run release tasks',
						availableProjectCount: 0,
						projectLocalProjectCount: 0,
						globalProjectCount: 0,
						requestedProjectCount: 1,
						requestingTaskCount: 1,
						missingProjectCount: 1,
						tasksMissingRequestedSkillCount: 1,
						projects: [
							{
								projectId: 'project_app',
								projectName: 'Agent Management System Prototype',
								projectHref: '/app/projects/project_app',
								installed: false,
								projectLocal: false,
								global: false,
								sourceLabel: 'Missing',
								description: '',
								availability: 'default',
								availabilityLabel: 'Missing',
								availabilityNotes: '',
								requestingTaskCount: 1,
								missing: true
							}
						]
					}
				],
				projectSkills: [
					{
						projectId: 'project_app',
						projectName: 'Agent Management System Prototype',
						projectHref: '/app/projects/project_app',
						totalCount: 1,
						projectCount: 1,
						globalCount: 0,
						requestedSkillCount: 1,
						requestingTaskCount: 2,
						missingRequestedSkillCount: 0,
						tasksMissingRequestedSkillCount: 0,
						missingRequestedSkills: [],
						installedSkills: [],
						previewSkills: [
							{
								id: 'docs-writer',
								description: 'Write project docs',
								global: false,
								project: true,
								sourceLabel: 'Project',
								availability: 'enabled',
								availabilityLabel: 'Enabled for project',
								availabilityNotes: 'Required by docs tasks.'
							}
						]
					}
				],
				capabilities: [],
				tools: []
			}
		} as never
	});
}

describe('/app/skills/+page.svelte', () => {
	it('renders skill inventory with detail links and import controls', async () => {
		renderPage();

		expect(document.body.textContent).toContain('Skill availability');
		expect(document.body.textContent).toContain('docs-writer');
		expect(document.body.textContent).toContain('Install external skills');
		expect(document.body.textContent).toContain('Enabled for project');

		await expect
			.element(page.getByRole('link', { name: 'docs-writer', exact: true }))
			.toHaveAttribute('href', '/app/skills/docs-writer');
		await expect.element(page.getByRole('button', { name: 'Search Skills' })).toBeVisible();
	});

	it('filters the inventory by search text and status', async () => {
		renderPage();

		await expect.element(page.getByText('Showing 2 of 2')).toBeVisible();

		await page.getByLabelText('Search').fill('release');

		await expect
			.element(page.getByRole('link', { name: 'release-runner', exact: true }))
			.toBeVisible();
		await expect.element(page.getByText('Showing 1 of 2')).toBeVisible();
		expect(window.location.search).toContain('q=release');
		expect(
			[...document.querySelectorAll('a')].some((link) => link.textContent?.trim() === 'docs-writer')
		).toBe(false);

		await page.getByLabelText('Search').fill('');
		await page.getByLabelText('Status').selectOptions('missing');
		expect(window.location.search).toContain('status=missing');

		await expect
			.element(page.getByRole('link', { name: 'release-runner', exact: true }))
			.toBeVisible();
		expect(
			[...document.querySelectorAll('a')].some((link) => link.textContent?.trim() === 'docs-writer')
		).toBe(false);
	});
});
