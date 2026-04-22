import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadControlPlane } from '$lib/server/control-plane';
import { createWorkflowFromFormData } from '$lib/server/workflow-actions';

export const load: PageServerLoad = async () => {
	const data = await loadControlPlane();

	return {
		projects: [...data.projects].sort((a, b) => a.name.localeCompare(b.name)),
		roles: [...data.roles].sort((a, b) => a.name.localeCompare(b.name))
	};
};

export const actions: Actions = {
	createWorkflow: async ({ request }) => {
		const result = await createWorkflowFromFormData(await request.formData());

		if ('ok' in result && result.ok) {
			throw redirect(303, `/app/workflows/${result.workflowId}?created=1`);
		}

		return result;
	}
};
