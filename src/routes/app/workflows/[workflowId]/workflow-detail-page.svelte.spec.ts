import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/app/workflows/[workflowId]/+page.svelte', () => {
	it('renders the workflow detail editor and secondary actions separately', async () => {
		render(Page, {
			form: {} as never,
			data: {
				createdSuccess: false,
				project: {
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'Primary app project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				},
				roles: [
					{ id: 'role_product', name: 'Product strategist', area: 'shared', description: '' },
					{ id: 'role_engineer', name: 'Engineer', area: 'shared', description: '' }
				],
				workflow: {
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
						taskCount: 0,
						inDraftCount: 0,
						readyCount: 0,
						inProgressCount: 0,
						reviewCount: 0,
						blockedCount: 0,
						doneCount: 0,
						waitingOnDependenciesCount: 0,
						pendingAcceptanceCount: 0,
						runnableTaskCount: 0,
						derivedStatus: 'draft'
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
					taskPreview: []
				}
			} as never
		});

		await expect
			.element(page.getByRole('heading', { name: 'Feature development' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { name: 'Template definition' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { name: 'Instantiate template' }))
			.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Save template' })).toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'Delete workflow template' }))
			.toBeInTheDocument();
	});

	it('surfaces recovery actions when generated tasks still block deletion', async () => {
		render(Page, {
			form: {} as never,
			data: {
				createdSuccess: false,
				project: {
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'Primary app project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				},
				roles: [{ id: 'role_engineer', name: 'Engineer', area: 'shared', description: '' }],
				workflow: {
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
					defaultRoleCount: 1,
					rollup: {
						taskCount: 4,
						inDraftCount: 0,
						readyCount: 2,
						inProgressCount: 1,
						reviewCount: 1,
						blockedCount: 0,
						doneCount: 0,
						waitingOnDependenciesCount: 0,
						pendingAcceptanceCount: 0,
						runnableTaskCount: 2,
						derivedStatus: 'review'
					},
					steps: [
						{
							id: 'workflow_step_1',
							title: 'Implementation',
							summary: 'Build the feature.',
							desiredRoleId: 'role_engineer',
							desiredRoleName: 'Engineer',
							dependsOnStepTitles: [],
							dependsOnStepPositions: [],
							canRunInParallel: true,
							position: 1
						}
					],
					taskPreview: [
						{
							id: 'task_1',
							title: 'Build dark mode: Implementation',
							status: 'in_progress',
							projectName: 'Agent Management System Prototype',
							updatedAt: '2026-04-15T09:30:00.000Z'
						}
					]
				}
			} as never
		});

		await expect
			.element(page.getByRole('link', { name: 'View all generated tasks' }))
			.toHaveAttribute('href', '/app/tasks?workflowId=workflow_1');
		await expect
			.element(page.getByRole('link', { name: 'Review linked tasks' }))
			.toHaveAttribute('href', '/app/tasks?workflowId=workflow_1');
		await expect
			.element(
				page.getByText('Delete is blocked because 4 generated tasks still point at this workflow.')
			)
			.toBeInTheDocument();
	});
});
