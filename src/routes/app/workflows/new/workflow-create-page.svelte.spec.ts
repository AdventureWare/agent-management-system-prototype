import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/app/workflows/new/+page.svelte', () => {
	it('renders a focused create flow separate from the directory', async () => {
		render(Page, {
			form: {} as never,
			data: {
				projects: [
					{
						id: 'project_1',
						name: 'Agent Management System Prototype',
						summary: 'Primary app project',
						projectRootFolder: '/tmp/project',
						defaultArtifactRoot: '/tmp/project/agent_output',
						defaultRepoPath: '',
						defaultRepoUrl: '',
						defaultBranch: ''
					}
				],
				roles: [
					{ id: 'role_product', name: 'Product strategist', area: 'shared', description: '' },
					{ id: 'role_engineer', name: 'Engineer', area: 'shared', description: '' }
				]
			} as never
		});

		await expect
			.element(page.getByRole('heading', { name: 'Create workflow template' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { name: 'Template definition' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { name: 'What happens next' }))
			.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Create template' })).toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: 'Back to workflows' }))
			.toHaveAttribute('href', '/app/workflows');
	});
});
