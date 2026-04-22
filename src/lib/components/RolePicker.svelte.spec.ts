import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import RolePicker from './RolePicker.svelte';

describe('RolePicker', () => {
	it('selects, previews, and clears a role', async () => {
		render(RolePicker, {
			props: {
				label: 'Desired role',
				name: 'desiredRoleId',
				inputId: 'role-picker-test',
				value: '',
				roles: [
					{
						id: 'role_writer',
						name: 'Technical Writer',
						area: 'product',
						description: 'Produces docs.',
						skillIds: ['documentation-writing'],
						toolIds: ['codex'],
						mcpIds: ['github'],
						systemPrompt: 'Write clearly.'
					},
					{
						id: 'role_reviewer',
						name: 'Reviewer',
						area: 'shared',
						description: 'Checks completeness.',
						skillIds: ['writing'],
						toolIds: ['codex'],
						mcpIds: [],
						systemPrompt: ''
					}
				]
			}
		});

		expect(document.body.textContent).toContain('No role preference');

		const chooseButton = Array.from(document.querySelectorAll('button')).find((button) =>
			button.textContent?.includes('Choose role')
		) as HTMLButtonElement | undefined;
		chooseButton?.click();
		await new Promise((resolve) => window.setTimeout(resolve, 0));

		const writerOption = Array.from(document.querySelectorAll('button')).find((button) =>
			button.textContent?.includes('Technical Writer')
		) as HTMLButtonElement | undefined;
		writerOption?.click();
		await new Promise((resolve) => window.setTimeout(resolve, 0));

		expect(document.body.textContent).toContain('Product');
		expect(document.body.textContent).toContain('Produces docs.');
		expect(document.body.textContent).toContain(
			'Configured defaults: 1 skill · 1 tool · 1 MCP · prompt'
		);
		expect(document.body.textContent).toContain('Nearby roles to compare');
		expect(document.body.textContent).toContain('Reviewer');
		expect(document.body.textContent).toContain('Tools: codex');
		expect(document.body.textContent).toContain('Use when: Checks completeness.');
		expect(
			(
				document.querySelector(
					'input[type="hidden"][name="desiredRoleId"]'
				) as HTMLInputElement | null
			)?.value
		).toBe('role_writer');
		expect(
			Array.from(document.querySelectorAll('a'))
				.find((link) => link.textContent?.includes('Open detail'))
				?.getAttribute('href')
		).toBe('/app/roles/role_writer');

		const clearButton = Array.from(document.querySelectorAll('button')).find((button) =>
			button.textContent?.includes('Clear')
		) as HTMLButtonElement | undefined;
		clearButton?.click();
		await new Promise((resolve) => window.setTimeout(resolve, 0));

		expect(document.body.textContent).toContain('No role preference');
		expect(
			(
				document.querySelector(
					'input[type="hidden"][name="desiredRoleId"]'
				) as HTMLInputElement | null
			)?.value
		).toBe('');
	});
});
