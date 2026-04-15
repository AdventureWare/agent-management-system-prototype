import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { WORKFLOW_KIND_OPTIONS } from '$lib/types/control-plane';
import Page from './+page.svelte';

describe('/app/workflows/+page.svelte', () => {
	it('renders create and update controls for workflows', async () => {
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
				goals: [{ id: 'goal_1', name: 'Release confidence', label: 'Release confidence' }],
				workflowKindOptions: WORKFLOW_KIND_OPTIONS,
				workflows: [
					{
						id: 'workflow_1',
						name: 'Release flow',
						summary: 'Coordinate release work.',
						projectId: 'project_1',
						projectName: 'Agent Management System Prototype',
						goalId: 'goal_1',
						goalName: 'Release confidence',
						kind: 'repeatable',
						status: 'active',
						templateKey: null,
						targetDate: '2026-04-20',
						createdAt: '2026-04-14T09:00:00.000Z',
						updatedAt: '2026-04-14T09:00:00.000Z',
						rollup: {
							taskCount: 1,
							inDraftCount: 0,
							readyCount: 1,
							inProgressCount: 0,
							reviewCount: 0,
							blockedCount: 0,
							doneCount: 0,
							waitingOnDependenciesCount: 0,
							pendingAcceptanceCount: 0,
							runnableTaskCount: 1,
							derivedStatus: 'active'
						},
						taskPreview: [
							{
								id: 'task_1',
								title: 'Draft release notes',
								status: 'ready',
								projectName: 'Agent Management System Prototype'
							}
						]
					}
				]
			} as never
		});

		await expect
			.element(page.getByRole('heading', { name: 'Create workflow' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { name: 'Workflow registry' }))
			.toBeInTheDocument();
		await expect.element(page.getByText('Release flow')).toBeInTheDocument();
		await expect.element(page.getByText('Edit workflow metadata')).toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: 'Create task in workflow' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'Activate workflow' }))
			.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Cancel workflow' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Delete workflow' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Save workflow' })).toBeInTheDocument();
		expect(page.getByRole('button', { name: 'Delete workflow' }).element()).toHaveProperty(
			'disabled',
			true
		);
	});
});
