import type { Actions, PageServerLoad } from './$types';
import { loadTaskTemplateDirectoryData } from '$lib/server/task-template-directory';
import {
	createTaskTemplateAction,
	deleteTaskTemplateAction,
	updateTaskTemplateAction
} from '$lib/server/task-template-form-actions';

export const load: PageServerLoad = async () => {
	return loadTaskTemplateDirectoryData();
};

export const actions: Actions = {
	createTaskTemplate: async ({ request }) => createTaskTemplateAction(request),
	updateTaskTemplate: async ({ request }) => updateTaskTemplateAction(request),
	deleteTaskTemplate: async ({ request }) => deleteTaskTemplateAction(request)
};
