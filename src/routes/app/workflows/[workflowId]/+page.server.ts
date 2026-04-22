import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadControlPlane } from '$lib/server/control-plane';
import {
	deleteWorkflowFromFormData,
	instantiateWorkflowFromFormData,
	updateWorkflowFromFormData
} from '$lib/server/workflow-actions';
import { getWorkflowDisplayRecord } from '$lib/server/workflows';

export const load: PageServerLoad = async ({ params, url }) => {
	const data = await loadControlPlane();
	const workflow = getWorkflowDisplayRecord(data, params.workflowId);

	if (!workflow) {
		throw error(404, 'Workflow not found.');
	}

	return {
		createdSuccess: url.searchParams.get('created') === '1',
		project: data.projects.find((project) => project.id === workflow.projectId) ?? null,
		roles: [...data.roles].sort((a, b) => a.name.localeCompare(b.name)),
		workflow
	};
};

export const actions: Actions = {
	updateWorkflow: async ({ request, params }) =>
		updateWorkflowFromFormData(await request.formData(), params.workflowId),

	instantiateWorkflow: async ({ request, params }) =>
		instantiateWorkflowFromFormData(await request.formData(), params.workflowId),

	deleteWorkflow: async ({ request, params }) => {
		const result = await deleteWorkflowFromFormData(await request.formData(), params.workflowId);

		if ('ok' in result && result.ok) {
			throw redirect(303, '/app/workflows?deleted=1');
		}

		return result;
	}
};
