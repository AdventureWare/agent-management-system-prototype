import { describe, expect, it, vi } from 'vitest';

const loadRolesDirectoryDataMock = vi.hoisted(() =>
	vi.fn(async () => ({
		roleAreaOptions: ['shared', 'product', 'growth', 'ops'],
		initialSelectedRoleId: 'role_writer',
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
				taskExampleTitles: ['Write release notes'],
				executionSurfaceNames: ['Local surface'],
				workflowNames: ['Documentation workflow'],
				templateNames: ['Docs template'],
				configuredDefaultsCount: 7
			}
		]
	}))
);

vi.mock('$lib/server/roles-directory', () => ({
	loadRolesDirectoryData: loadRolesDirectoryDataMock
}));

import { load } from './+page.server';

describe('role detail page server', () => {
	it('loads the requested role detail', async () => {
		const url = new URL('http://localhost/app/roles/role_writer');
		const result = await load({
			params: { roleId: 'role_writer' },
			url
		} as never);

		expect(loadRolesDirectoryDataMock).toHaveBeenCalled();
		expect(result).toMatchObject({
			initialSelectedRoleId: 'role_writer',
			role: expect.objectContaining({
				id: 'role_writer',
				name: 'Technical Writer'
			})
		});
	});

	it('throws a 404 for an unknown role', async () => {
		const url = new URL('http://localhost/app/roles/missing_role');

		await expect(
			load({
				params: { roleId: 'missing_role' },
				url
			} as never)
		).rejects.toMatchObject({
			status: 404
		});
	});
});
