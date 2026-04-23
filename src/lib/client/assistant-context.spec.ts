import { describe, expect, it } from 'vitest';
import { buildAssistantContext } from './assistant-context';

describe('buildAssistantContext', () => {
	it('serializes project detail context for assistant linking', () => {
		const context = buildAssistantContext({
			url: new URL('http://localhost/app/projects/project_onboarding?tab=tasks'),
			data: {
				project: {
					id: 'project_onboarding',
					name: 'Onboarding Prototype',
					summary: 'Prototype onboarding'
				},
				projectLineage: [
					{
						id: 'project_parent',
						name: 'Product Experiments'
					},
					{
						id: 'project_onboarding',
						name: 'Onboarding Prototype'
					}
				]
			}
		});

		expect(context.route).toBe('/app/projects/project_onboarding?tab=tasks');
		expect(context.pageType).toBe('project_detail');
		expect(context.currentObject).toEqual({
			type: 'project',
			id: 'project_onboarding',
			name: 'Onboarding Prototype',
			projectId: null,
			goalId: null,
			roleId: null,
			summary: 'Prototype onboarding'
		});
		expect(context.breadcrumbs).toEqual([
			expect.objectContaining({
				type: 'project',
				id: 'project_parent',
				name: 'Product Experiments'
			})
		]);
		expect(context.visibleCapabilities).toEqual(['create_task', 'create_goal']);
	});
});
