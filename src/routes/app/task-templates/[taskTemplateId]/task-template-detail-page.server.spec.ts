import { describe, expect, it, vi } from 'vitest';

const loadTaskTemplateDirectoryDataMock = vi.hoisted(() =>
	vi.fn(async () => ({
		taskTemplates: [
			{
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
				desiredRole: {
					id: 'role_research',
					name: 'Research assistant'
				},
				assigneeExecutionSurfaceId: null,
				assigneeExecutionSurfaceName: 'Leave unassigned',
				assigneeExecutionSurface: null,
				requiredPromptSkillNames: ['web-design-guidelines'],
				requiredCapabilityNames: ['planning'],
				requiredToolNames: ['codex'],
				createdAt: '2026-04-15T09:00:00.000Z',
				updatedAt: '2026-04-15T09:00:00.000Z'
			}
		]
	}))
);

vi.mock('$lib/server/task-template-directory', () => ({
	loadTaskTemplateDirectoryData: loadTaskTemplateDirectoryDataMock
}));

import { load } from './+page.server';

describe('task template detail page server', () => {
	it('loads the requested task template detail', async () => {
		const result = await load({
			params: { taskTemplateId: 'task_template_research' }
		} as never);

		expect(loadTaskTemplateDirectoryDataMock).toHaveBeenCalled();
		expect(result).toMatchObject({
			taskTemplate: expect.objectContaining({
				id: 'task_template_research',
				name: 'Research Brief'
			})
		});
	});

	it('throws a 404 for an unknown task template', async () => {
		await expect(
			load({
				params: { taskTemplateId: 'missing_template' }
			} as never)
		).rejects.toMatchObject({
			status: 404
		});
	});
});
