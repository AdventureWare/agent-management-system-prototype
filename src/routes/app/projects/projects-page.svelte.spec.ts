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
					id: 'project_parent',
					name: 'Agent Management System Prototype',
					summary: 'Main product surface and operator experience.',
					parentProjectId: null,
					parentProjectName: '',
					lineageLabel: 'Agent Management System Prototype',
					projectRootFolder: '/tmp/ams',
					defaultArtifactRoot: '/tmp/ams/agent_output',
					defaultRepoPath: '/tmp/ams',
					defaultRepoUrl: 'git@github.com:openai/ams.git',
					defaultBranch: 'main',
					additionalWritableRoots: [],
					defaultThreadSandbox: null,
					taskCount: 4,
					goalCount: 2,
					childProjectCount: 1,
					readinessCount: 4
				},
				{
					id: 'project_child',
					name: 'Projects UI refresh',
					summary: 'Refreshes the collection view and detail navigation for projects.',
					parentProjectId: 'project_parent',
					parentProjectName: 'Agent Management System Prototype',
					lineageLabel: 'Agent Management System Prototype / Projects UI refresh',
					projectRootFolder: '/tmp/ams',
					defaultArtifactRoot: '/tmp/ams/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: '',
					additionalWritableRoots: [],
					defaultThreadSandbox: null,
					taskCount: 1,
					goalCount: 1,
					childProjectCount: 0,
					readinessCount: 2
				},
				{
					id: 'project_other',
					name: 'Operator docs',
					summary: 'Knowledge base and setup guides for operators.',
					parentProjectId: null,
					parentProjectName: '',
					lineageLabel: 'Operator docs',
					projectRootFolder: '/tmp/docs',
					defaultArtifactRoot: '/tmp/docs/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: '',
					additionalWritableRoots: [],
					defaultThreadSandbox: null,
					taskCount: 0,
					goalCount: 0,
					childProjectCount: 0,
					readinessCount: 1
				}
			],
			parentProjectOptions: [
				{ id: 'project_parent', label: 'Agent Management System Prototype' },
				{ id: 'project_child', label: 'Agent Management System Prototype / Projects UI refresh' },
				{ id: 'project_other', label: 'Operator docs' }
			],
			folderOptions: [],
			sandboxOptions: ['workspace-write', 'danger-full-access']
		} as never
	});
}

describe('/app/projects/+page.svelte', () => {
	it('renders the project hierarchy table with parent context and detail links', async () => {
		renderPage();

		expect(document.body.textContent).toContain('Project hierarchy');
		expect(document.body.textContent).toContain('Agent Management System Prototype');
		expect(document.body.textContent).toContain('Projects UI refresh');
		expect(document.body.textContent).toContain('Root project');
		expect(document.body.textContent).toContain('Subproject');
		expect(document.body.textContent).toContain('Top level');
		expect(document.body.textContent).toContain('Open');

		await expect
			.element(page.getByRole('link', { name: 'Projects UI refresh' }))
			.toHaveAttribute('href', '/app/projects/project_child');
	});

	it('shows a recovery hint when matching projects are hidden inside collapsed branches', async () => {
		renderPage();

		await page
			.getByRole('button', {
				name: /Collapse subprojects for Agent Management System Prototype/i
			})
			.click();

		expect(document.body.textContent).not.toContain('Projects UI refresh');
		expect(document.body.textContent).toContain(
			'1 matching project is currently hidden inside collapsed branches.'
		);

		await page.getByRole('button', { name: 'Expand all' }).click();

		expect(document.body.textContent).toContain('Projects UI refresh');
	});

	it('keeps parent context visible when searching for a nested project', async () => {
		renderPage();

		await page.getByLabelText('Search projects').fill('refresh');

		expect(document.body.textContent).toContain('Projects UI refresh');
		expect(document.body.textContent).toContain('Agent Management System Prototype');
		expect(document.body.textContent).not.toContain('Operator docs');
		expect(document.body.textContent).toContain('Context');
	});
});
