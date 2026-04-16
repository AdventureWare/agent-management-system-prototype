import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/app/workflows/+page.svelte', () => {
	it('renders workflow templates with steps and instantiation controls', async () => {
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
				],
				workflows: [
					{
						id: 'workflow_1',
						name: 'Feature development',
						summary: 'Reusable feature delivery process.',
						projectId: 'project_1',
						projectName: 'Agent Management System Prototype',
						status: 'draft',
						templateKey: null,
						createdAt: '2026-04-15T09:00:00.000Z',
						updatedAt: '2026-04-15T09:00:00.000Z',
						rollup: {
							taskCount: 2,
							inDraftCount: 0,
							readyCount: 2,
							inProgressCount: 0,
							reviewCount: 0,
							blockedCount: 0,
							doneCount: 0,
							waitingOnDependenciesCount: 0,
							pendingAcceptanceCount: 0,
							runnableTaskCount: 2,
							derivedStatus: 'active'
						},
						steps: [
							{
								id: 'workflow_step_1',
								title: 'Requirements gathering',
								summary: 'Clarify scope.',
								desiredRoleId: 'role_product',
								desiredRoleName: 'Product strategist',
								dependsOnStepTitles: [],
								dependsOnStepPositions: [],
								position: 1
							},
							{
								id: 'workflow_step_2',
								title: 'Technical implementation',
								summary: 'Build the feature.',
								desiredRoleId: 'role_engineer',
								desiredRoleName: 'Engineer',
								dependsOnStepTitles: ['Step 1 · Requirements gathering'],
								dependsOnStepPositions: [1],
								position: 2
							}
						],
						taskPreview: [
							{
								id: 'task_1',
								title: 'Build dark mode: Requirements gathering',
								status: 'ready',
								projectName: 'Agent Management System Prototype'
							}
						]
					}
				]
			} as never
		});

		await expect
			.element(page.getByRole('heading', { name: 'Create workflow template' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { name: 'Template library' }))
			.toBeInTheDocument();
		await expect.element(page.getByText('Feature development')).toBeInTheDocument();
		await expect
			.element(page.getByText('Step 1 · Requirements gathering', { exact: true }))
			.toBeInTheDocument();
		await expect.element(page.getByText('Role · Product strategist')).toBeInTheDocument();
		await expect
			.element(page.getByText('Depends on Step 1 · Requirements gathering', { exact: true }))
			.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Create task set' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Save template' })).toBeInTheDocument();
	});
});
