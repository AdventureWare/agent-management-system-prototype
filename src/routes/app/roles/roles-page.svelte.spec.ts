import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

function renderPage() {
	render(Page, {
		form: {} as never,
		data: {
			initialSelectedRoleId: 'role_app_worker',
			roleAreaOptions: ['shared', 'product', 'growth', 'ops'],
			roles: [
				{
					id: 'role_app_worker',
					name: 'App Worker',
					area: 'product',
					description: 'Implements repo-scoped product changes in the application codebase.',
					skillIds: ['design-system'],
					toolIds: ['codex'],
					mcpIds: ['github'],
					systemPrompt: 'Ship the fix.',
					qualityChecklist: ['working', 'tested'],
					approvalPolicy: 'Require review for sensitive changes.',
					escalationPolicy: 'Escalate when requirements are unclear.',
					taskCount: 5,
					executionSurfaceCount: 2,
					workflowCount: 1,
					templateCount: 2,
					family: 'Implementation',
					taskExamples: [
						{ id: 'task_fix_layout', name: 'Fix task detail layout' },
						{ id: 'task_roles_page', name: 'Improve roles page' }
					],
					executionSurfaceReferences: [
						{ id: 'surface_local', name: 'Local Codex Worker' },
						{ id: 'surface_cloud', name: 'Cloud UI Worker' }
					],
					workflowReferences: [{ id: 'workflow_ui_audit', name: 'UI audit workflow' }],
					templateReferences: [
						{ id: 'template_ui_polish', name: 'UI polish template' },
						{ id: 'template_cleanup', name: 'Task detail cleanup' }
					],
					taskExampleTitles: ['Fix task detail layout', 'Improve roles page'],
					executionSurfaceNames: ['Local Codex Worker', 'Cloud UI Worker'],
					workflowNames: ['UI audit workflow'],
					templateNames: ['UI polish template', 'Task detail cleanup'],
					configuredDefaultsCount: 6
				},
				{
					id: 'role_reviewer',
					name: 'Reviewer',
					area: 'ops',
					description: 'Checks completeness, provenance, duplicates, and handoff quality.',
					skillIds: ['writing'],
					toolIds: ['codex'],
					mcpIds: ['github'],
					systemPrompt: 'Review carefully.',
					qualityChecklist: ['accurate'],
					approvalPolicy: 'Require sign-off before closing.',
					escalationPolicy: 'Escalate blocking defects.',
					taskCount: 1,
					executionSurfaceCount: 1,
					workflowCount: 0,
					templateCount: 1,
					family: 'Review',
					taskExamples: [{ id: 'task_review_roles', name: 'Review role changes' }],
					executionSurfaceReferences: [{ id: 'surface_review', name: 'Review surface' }],
					workflowReferences: [],
					templateReferences: [{ id: 'template_review', name: 'Review template' }],
					taskExampleTitles: ['Review role changes'],
					executionSurfaceNames: ['Review surface'],
					workflowNames: [],
					templateNames: ['Review template'],
					configuredDefaultsCount: 5
				}
			]
		} as never
	});
}

describe('/app/roles/+page.svelte', () => {
	it('renders only one role editor at a time and switches details with selection', async () => {
		renderPage();

		expect(document.querySelectorAll('form[action="?/updateRole"]')).toHaveLength(1);
		expect(document.querySelectorAll('textarea[name="systemPrompt"]')).toHaveLength(2);
		expect(document.body.textContent).toContain('Role purpose and fit');
		expect(document.body.textContent).toContain('App Worker');
		expect(document.body.textContent).toContain('5 task references');
		expect(window.location.search).toContain('role=role_app_worker');
		const dedicatedDetailLink = Array.from(document.querySelectorAll('a')).find((link) =>
			link.textContent?.includes('Open dedicated detail')
		) as HTMLAnchorElement | undefined;
		expect(dedicatedDetailLink?.getAttribute('href')).toBe('/app/roles/role_app_worker');

		const roleButtons = document.querySelectorAll('button[aria-pressed]');
		(roleButtons[1] as HTMLButtonElement | undefined)?.click();
		await new Promise((resolve) => window.setTimeout(resolve, 0));

		const roleIdField = document.querySelector(
			'form[action="?/updateRole"] input[name="roleId"]'
		) as HTMLInputElement | null;
		const nameField = document.querySelector(
			'form[action="?/updateRole"] input[name="name"]'
		) as HTMLInputElement | null;

		expect(roleIdField?.value).toBe('role_reviewer');
		expect(nameField?.value).toBe('Reviewer');
		expect(document.body.textContent).toContain('Review role changes');
		expect(window.location.search).toContain('role=role_reviewer');
		const reviewerDetailLink = Array.from(document.querySelectorAll('a')).find((link) =>
			link.textContent?.includes('Open dedicated detail')
		) as HTMLAnchorElement | undefined;
		expect(reviewerDetailLink?.getAttribute('href')).toBe('/app/roles/role_reviewer');

		const createFromSelectedRoleButton = Array.from(document.querySelectorAll('button')).find(
			(button) => button.textContent?.includes('Fork selected role')
		) as HTMLButtonElement | undefined;

		createFromSelectedRoleButton?.click();
		await new Promise((resolve) => window.setTimeout(resolve, 0));

		const createNameField = document.querySelector(
			'form[action="?/createRole"] input[name="name"]'
		) as HTMLInputElement | null;
		const createDescriptionField = document.querySelector(
			'form[action="?/createRole"] textarea[name="description"]'
		) as HTMLTextAreaElement | null;
		const createAreaField = document.querySelector(
			'form[action="?/createRole"] select[name="area"]'
		) as HTMLSelectElement | null;
		const createSkillIdsField = document.querySelector(
			'form[action="?/createRole"] input[type="hidden"][name="skillIds"]'
		) as HTMLInputElement | null;
		const createAdvancedDetails = document.querySelector(
			'form[action="?/createRole"] details'
		) as HTMLDetailsElement | null;

		const createSourceRoleField = document.querySelector(
			'form[action="?/createRole"] select[name="sourceRoleId"]'
		) as HTMLSelectElement | null;

		expect(createNameField?.value).toBe('Reviewer variant');
		expect(createDescriptionField?.value).toBe(
			'Checks completeness, provenance, duplicates, and handoff quality.'
		);
		expect(createAreaField?.value).toBe('ops');
		expect(createSourceRoleField?.value).toBe('role_reviewer');
		expect(createSkillIdsField?.value).toBe('writing');
		expect(createAdvancedDetails?.open).toBe(true);
	});
});
