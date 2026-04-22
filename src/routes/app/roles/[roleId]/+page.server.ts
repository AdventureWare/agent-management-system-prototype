import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadRolesDirectoryData } from '$lib/server/roles-directory';
import { updateRoleAction } from '$lib/server/role-form-actions';

export const load: PageServerLoad = async ({ params, url }) => {
	const requestUrl = new URL(url);
	requestUrl.searchParams.set('role', params.roleId);

	const data = await loadRolesDirectoryData(requestUrl);
	const role = data.roles.find((entry) => entry.id === params.roleId);

	if (!role) {
		throw error(404, 'Role not found.');
	}

	return {
		...data,
		role
	};
};

export const actions: Actions = {
	updateRole: async ({ request }) => {
		return updateRoleAction(request);
	}
};
