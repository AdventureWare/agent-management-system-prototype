import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

function renderPage(form: Record<string, unknown> = {}) {
	render(Page, {
		form: form as never,
		data: {
			skill: {
				id: 'docs-writer',
				description: 'Write project docs',
				availableProjectCount: 1,
				projectLocalProjectCount: 1,
				globalProjectCount: 0,
				requestedProjectCount: 1,
				requestingTaskCount: 1,
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
						availability: 'disabled',
						availabilityLabel: 'Disabled for project',
						availabilityNotes: 'Paused during docs cleanup.',
						requestingTaskCount: 1,
						missing: false
					}
				]
			},
			installations: [
				{
					id: 'docs-writer',
					description: 'Write project docs',
					sourceLabel: 'Project',
					global: false,
					project: true,
					projectId: 'project_app',
					projectName: 'Agent Management System Prototype',
					projectHref: '/app/projects/project_app',
					skillDirectory: '/tmp/ams/.agents/skills/docs-writer',
					skillFilePath: '/tmp/ams/.agents/skills/docs-writer/SKILL.md',
					content:
						'---\nname: docs-writer\ndescription: Write project docs\n---\n\n# docs-writer\n\n## When to use this skill\n\n- Use it for docs.\n\n## Workflow\n\n1. Read source material.',
					bodyMarkdown:
						'# docs-writer\n\n## When to use this skill\n\n- Use it for docs.\n\n## Workflow\n\n1. Read source material.'
				}
			],
			requestingTasks: [
				{
					id: 'task_docs',
					title: 'Write setup docs',
					status: 'ready',
					projectId: 'project_app',
					projectName: 'Agent Management System Prototype',
					taskHref: '/app/tasks/task_docs',
					projectHref: '/app/projects/project_app'
				}
			],
			projects: []
		} as never
	});
}

describe('/app/skills/[skillId]/+page.svelte', () => {
	it('renders detail content with edit and availability controls', async () => {
		renderPage();

		expect(document.body.textContent).toContain('docs-writer');
		expect(document.body.textContent).toContain('Installed skill files');
		expect(document.body.textContent).toContain('When to use this skill');
		expect(document.body.textContent).toContain('Disabled for project');
		expect(document.body.textContent).toContain('Write setup docs');

		await page.getByRole('button', { name: 'Edit', exact: true }).click();

		await expect.element(page.getByLabelText('Body')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Save Project Skill' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Save Availability' })).toBeVisible();
	});
});
