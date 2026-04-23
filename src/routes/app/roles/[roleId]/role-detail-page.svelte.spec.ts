import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/app/roles/[roleId]/+page.svelte', () => {
	it('renders dedicated role detail content', () => {
		render(Page, {
			form: {} as never,
			data: {
				role: {
					id: 'role_writer',
					name: 'Technical Writer',
					area: 'product',
					description: 'Produces docs.',
					skillIds: ['documentation-writing'],
					toolIds: ['codex'],
					mcpIds: ['github'],
					systemPrompt: 'Write clearly.',
					qualityChecklist: ['accurate'],
					approvalPolicy: 'Require review.',
					escalationPolicy: 'Escalate conflicts.',
					taskCount: 2,
					executionSurfaceCount: 1,
					workflowCount: 1,
					templateCount: 1,
					family: 'Writing',
					taskExamples: [{ id: 'task_release_notes', name: 'Write release notes' }],
					executionSurfaceReferences: [{ id: 'surface_local', name: 'Local surface' }],
					workflowReferences: [{ id: 'workflow_docs', name: 'Documentation workflow' }],
					templateReferences: [{ id: 'template_docs', name: 'Docs template' }],
					taskExampleTitles: ['Write release notes'],
					executionSurfaceNames: ['Local surface'],
					workflowNames: ['Documentation workflow'],
					templateNames: ['Docs template'],
					configuredDefaultsCount: 7,
					lifecycleStatus: 'superseded',
					supersededByRoleId: 'role_editor',
					supersededByRole: {
						id: 'role_editor',
						name: 'Editor'
					}
				},
				roles: [
					{
						id: 'role_writer',
						name: 'Technical Writer',
						area: 'product',
						description: 'Produces docs.',
						skillIds: ['documentation-writing'],
						toolIds: ['codex'],
						mcpIds: ['github'],
						systemPrompt: 'Write clearly.',
						qualityChecklist: ['accurate'],
						approvalPolicy: 'Require review.',
						escalationPolicy: 'Escalate conflicts.',
						taskCount: 2,
						executionSurfaceCount: 1,
						workflowCount: 1,
						templateCount: 1,
						family: 'Writing',
						taskExamples: [{ id: 'task_release_notes', name: 'Write release notes' }],
						executionSurfaceReferences: [{ id: 'surface_local', name: 'Local surface' }],
						workflowReferences: [{ id: 'workflow_docs', name: 'Documentation workflow' }],
						templateReferences: [{ id: 'template_docs', name: 'Docs template' }],
						taskExampleTitles: ['Write release notes'],
						executionSurfaceNames: ['Local surface'],
						workflowNames: ['Documentation workflow'],
						templateNames: ['Docs template'],
						configuredDefaultsCount: 7,
						lifecycleStatus: 'superseded',
						supersededByRoleId: 'role_editor',
						supersededByRole: {
							id: 'role_editor',
							name: 'Editor'
						}
					},
					{
						id: 'role_editor',
						name: 'Editor',
						area: 'product',
						description: 'Reviews and tightens docs.',
						skillIds: ['documentation-writing'],
						toolIds: ['codex'],
						mcpIds: [],
						systemPrompt: '',
						qualityChecklist: [],
						approvalPolicy: '',
						escalationPolicy: '',
						taskCount: 1,
						executionSurfaceCount: 0,
						workflowCount: 0,
						templateCount: 0,
						family: 'Writing',
						taskExamples: [{ id: 'task_edit_release_notes', name: 'Edit release notes' }],
						executionSurfaceReferences: [],
						workflowReferences: [],
						templateReferences: [],
						taskExampleTitles: ['Edit release notes'],
						executionSurfaceNames: [],
						workflowNames: [],
						templateNames: [],
						configuredDefaultsCount: 2
					}
				]
			} as never
		});

		expect(document.body.textContent).toContain('Technical Writer');
		expect(document.body.textContent).toContain('Role purpose and fit');
		expect(document.body.textContent).toContain('Write release notes');
		expect(document.body.textContent).toContain('Related roles');
		expect(document.body.textContent).toContain('Migrate existing references');
		expect(document.body.textContent).toContain('Compare roles');
		expect(document.body.textContent).toContain('Key contrasts');
		expect(document.body.textContent).toContain('Defaults:');
		expect(document.querySelector('form[action="?/updateRole"]')).not.toBeNull();
		expect(document.querySelector('form[action="?/migrateRoleReferences"]')).not.toBeNull();
		expect(
			(
				document.querySelector(
					'form[action="?/updateRole"] input[type="hidden"][name="skillIds"]'
				) as HTMLInputElement | null
			)?.value
		).toBe('documentation-writing');

		const links = Array.from(document.querySelectorAll('a'));
		expect(
			links.find((link) => link.textContent?.includes('Back to directory'))?.getAttribute('href')
		).toBe('/app/roles?role=role_writer');
		expect(links.find((link) => link.textContent?.includes('Editor'))?.getAttribute('href')).toBe(
			'/app/roles/role_editor'
		);
	});
});
