import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/app/workflows/+page.svelte', () => {
	it('renders a workflow directory with preview-first navigation', async () => {
		render(Page, {
			data: {
				deleteSuccess: false,
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
						parallelizableStepCount: 1,
						defaultRoleCount: 2,
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
								canRunInParallel: false,
								position: 1
							},
							{
								id: 'workflow_step_2',
								title: 'Technical implementation',
								summary: 'Build the feature.',
								desiredRoleId: 'role_engineer',
								desiredRoleName: 'Engineer',
								dependsOnStepTitles: [],
								dependsOnStepPositions: [],
								canRunInParallel: true,
								position: 2
							}
						],
						taskPreview: [
							{
								id: 'task_1',
								title: 'Build dark mode: Requirements gathering',
								status: 'ready',
								projectName: 'Agent Management System Prototype',
								updatedAt: '2026-04-15T09:30:00.000Z'
							}
						]
					}
				]
			} as never
		});

		await expect
			.element(page.getByRole('heading', { name: 'Workflow directory' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { name: 'Feature development' }))
			.toBeInTheDocument();
		await expect.element(page.getByText('Preview', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByText('Quick preview')).toBeInTheDocument();
		await expect.element(page.getByText('Step outline')).toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: 'Open workflow detail' }).first())
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: 'View generated tasks' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: 'Create workflow' }))
			.toHaveAttribute('href', '/app/workflows/new');
	});
});
