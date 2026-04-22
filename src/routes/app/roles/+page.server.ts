import type { Actions, PageServerLoad } from './$types';
import { loadRolesDirectoryData } from '$lib/server/roles-directory';
import { createRoleAction, updateRoleAction } from '$lib/server/role-form-actions';

export const load: PageServerLoad = async ({ url }) => {
	return loadRolesDirectoryData(url);
};

export const actions: Actions = {
	createRole: async ({ request }) => {
		return createRoleAction(request);
	},

	updateRole: async ({ request }) => {
		return updateRoleAction(request);
	}
};
