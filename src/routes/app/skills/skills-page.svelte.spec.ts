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
});
