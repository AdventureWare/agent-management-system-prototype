import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/app/task-templates/+page.svelte', () => {
	it('renders the task template library and opens the editor dialog', async () => {
		render(Page, {
			form: {} as never,
			data: {
				taskTemplates: [
					{
						id: 'task_template_research',
						name: 'Research Brief',
						summary: 'Reusable research setup.',
						projectId: 'project_1',
						projectName: 'Agent Management System Prototype',
						goalId: 'goal_1',
						goalLabel: 'Reduce task intake friction',
						workflowId: 'workflow_1',
						workflowName: 'Feature development',
						taskTitle: 'Research [topic]',
						taskSummary: 'Investigate the topic and summarize the findings.',
						successCriteria: '',
						readyCondition: '',
						expectedOutcome: '',
						area: 'product',
						priority: 'medium',
						riskLevel: 'medium',
						approvalMode: 'none',
						requiredThreadSandbox: null,
						requiresReview: true,
						desiredRoleId: 'role_research',
						desiredRoleName: 'Research assistant',
						assigneeExecutionSurfaceId: null,
						assigneeExecutionSurfaceName: 'Leave unassigned',
						requiredPromptSkillNames: ['web-design-guidelines'],
						requiredCapabilityNames: ['planning'],
						requiredToolNames: ['codex'],
						createdAt: '2026-04-15T09:00:00.000Z',
						updatedAt: '2026-04-15T09:00:00.000Z'
					}
				],
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
				goals: [
					{
						id: 'goal_1',
						name: 'Reduce task intake friction',
						label: 'Reduce task intake friction'
					}
				],
				workflows: [
					{
						id: 'workflow_1',
						name: 'Feature development',
						summary: 'Reusable feature delivery process.',
						projectId: 'project_1',
						projectName: 'Agent Management System Prototype',
						goalId: 'goal_1',
						status: 'active',
						templateKey: null,
						createdAt: '2026-04-15T09:00:00.000Z',
						updatedAt: '2026-04-15T09:00:00.000Z'
					}
				],
				roles: [
					{
						id: 'role_research',
						name: 'Research assistant',
						area: 'shared',
						description: 'Runs research tasks'
					}
				],
				executionSurfaces: [],
				projectSkillSummaries: [
					{
						projectId: 'project_1',
						totalCount: 1,
						globalCount: 0,
						projectCount: 1,
						installedSkills: [
							{
								id: 'web-design-guidelines',
								description: 'Review UI against guidelines',
								global: false,
								project: true,
								sourceLabel: 'Project'
							}
						],
						previewSkills: [
							{
								id: 'web-design-guidelines',
								description: 'Review UI against guidelines',
								global: false,
								project: true,
								sourceLabel: 'Project'
							}
						]
					}
				],
				executionRequirementInventory: {
					capabilities: [{ name: 'planning', executionSurfaceCount: 0, providerCount: 1 }],
					tools: [{ name: 'codex', executionSurfaceCount: 0, providerCount: 1 }],
					capabilityNames: ['planning'],
					toolNames: ['codex']
				}
			} as never
		});

		await expect.element(page.getByText('Task template library')).toBeInTheDocument();
		await expect.element(page.getByRole('link', { name: 'Research Brief' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Delete' })).toBeInTheDocument();

		await page.getByRole('button', { name: 'New template' }).click();
		await expect.element(page.getByText('New task template')).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Create template' })).toBeInTheDocument();
	});
});
