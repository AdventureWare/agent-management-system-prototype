import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

function renderPage() {
	render(Page, {
		form: {} as never,
		data: {
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
					executionSurfaceCount: 2
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
					executionSurfaceCount: 1
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
		expect(document.body.textContent).toContain('Selected role');
		expect(document.body.textContent).toContain('App Worker');
		expect(document.body.textContent).toContain('5 tasks');

		await page.getByRole('button', { name: /Reviewer Area/i }).click();

		const roleIdField = document.querySelector(
			'form[action="?/updateRole"] input[name="roleId"]'
		) as HTMLInputElement | null;
		const nameField = document.querySelector(
			'form[action="?/updateRole"] input[name="name"]'
		) as HTMLInputElement | null;

		expect(roleIdField?.value).toBe('role_reviewer');
		expect(nameField?.value).toBe('Reviewer');
		expect(document.body.textContent).toContain('1 tasks');
	});
});
