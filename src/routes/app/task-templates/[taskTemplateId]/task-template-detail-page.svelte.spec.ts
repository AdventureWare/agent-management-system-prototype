import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/app/task-templates/[taskTemplateId]/+page.svelte', () => {
	it('renders dedicated task template detail content', () => {
		render(Page, {
			form: {} as never,
			data: {
				taskTemplate: {
					id: 'task_template_research',
					name: 'Research Brief',
					summary: 'Reusable research setup.',
					projectId: 'project_1',
					projectName: 'Agent Management System Prototype',
					project: {
						id: 'project_1',
						name: 'Agent Management System Prototype'
					},
					goalId: 'goal_1',
					goalLabel: 'Reduce task intake friction',
					goal: {
						id: 'goal_1',
						name: 'Reduce task intake friction'
					},
					workflowId: 'workflow_1',
					workflowName: 'Feature development',
					workflow: {
						id: 'workflow_1',
						name: 'Feature development'
					},
					taskTitle: 'Research [topic]',
					taskSummary: 'Investigate the topic and summarize the findings.',
					successCriteria: 'Provide cited findings.',
					readyCondition: 'Topic is already approved.',
					expectedOutcome: 'A concise research brief.',
					area: 'product',
					priority: 'medium',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiredThreadSandbox: null,
					requiresReview: true,
					desiredRoleId: 'role_research',
					desiredRoleName: 'Research assistant',
					desiredRole: {
						id: 'role_research',
						name: 'Research assistant'
					},
					assigneeExecutionSurfaceId: 'surface_local',
					assigneeExecutionSurfaceName: 'Local surface',
					assigneeExecutionSurface: {
						id: 'surface_local',
						name: 'Local surface'
					},
					requiredPromptSkillNames: ['web-design-guidelines'],
					requiredCapabilityNames: ['planning'],
					requiredToolNames: ['codex'],
					createdAt: '2026-04-15T09:00:00.000Z',
					updatedAt: '2026-04-15T09:00:00.000Z'
				},
				taskTemplates: [],
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
						description: 'Runs research tasks',
						skillIds: ['documentation-writing'],
						toolIds: ['codex'],
						mcpIds: ['github'],
						systemPrompt: 'Investigate thoroughly.',
						family: 'Research'
					}
				],
				executionSurfaces: [{ id: 'surface_local', name: 'Local surface' }],
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

		expect(document.body.textContent).toContain('Research Brief');
		expect(document.body.textContent).toContain('Template purpose and defaults');
		expect(document.body.textContent).toContain('Linked context');
		expect(document.body.textContent).toContain('Execution defaults');
		expect(document.querySelector('form[action="?/updateTaskTemplate"]')).not.toBeNull();
		expect(
			Array.from(document.querySelectorAll('a'))
				.find((link) => link.textContent?.includes('Back to task templates'))
				?.getAttribute('href')
		).toBe('/app/task-templates');
		expect(
			Array.from(document.querySelectorAll('a'))
				.find((link) => link.textContent?.includes('Research assistant'))
				?.getAttribute('href')
		).toBe('/app/roles/role_research');
	});
});
