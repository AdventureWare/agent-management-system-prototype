import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadTaskTemplateDirectoryData } from '$lib/server/task-template-directory';
import {
	migrateTaskTemplateReferencesAction,
	updateTaskTemplateAction
} from '$lib/server/task-template-form-actions';

export const load: PageServerLoad = async ({ params }) => {
	const data = await loadTaskTemplateDirectoryData();
	const taskTemplate = data.taskTemplates.find((entry) => entry.id === params.taskTemplateId);

	if (!taskTemplate) {
		throw error(404, 'Task template not found.');
	}

	return {
		...data,
		taskTemplate
	};
};

export const actions: Actions = {
	updateTaskTemplate: async ({ request }) => updateTaskTemplateAction(request),
	migrateTaskTemplateReferences: async ({ request }) => migrateTaskTemplateReferencesAction(request)
};
