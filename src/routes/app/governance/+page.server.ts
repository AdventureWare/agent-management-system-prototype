import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	approveTaskApproval,
	approveTaskReview,
	loadGovernanceInboxData,
	rejectTaskApproval,
	requestTaskReviewChanges,
	TaskGovernanceActionError
} from '$lib/server/task-governance';

function readTaskId(form: FormData) {
	return form.get('taskId')?.toString().trim() ?? '';
}

function handleGovernanceActionError(caughtError: unknown) {
	if (caughtError instanceof TaskGovernanceActionError) {
		return fail(caughtError.status, { message: caughtError.message });
	}

	throw caughtError;
}

export const load: PageServerLoad = async () => {
	return loadGovernanceInboxData();
};

export const actions: Actions = {
	approveReview: async ({ request }) => {
		const taskId = readTaskId(await request.formData());

		if (!taskId) {
			return fail(400, { message: 'Task ID is required.' });
		}

		try {
			return await approveTaskReview(taskId, 'governance inbox');
		} catch (caughtError) {
			return handleGovernanceActionError(caughtError);
		}
	},

	requestChanges: async ({ request }) => {
		const taskId = readTaskId(await request.formData());

		if (!taskId) {
			return fail(400, { message: 'Task ID is required.' });
		}

		try {
			return await requestTaskReviewChanges(taskId, 'governance inbox');
		} catch (caughtError) {
			return handleGovernanceActionError(caughtError);
		}
	},

	approveApproval: async ({ request }) => {
		const taskId = readTaskId(await request.formData());

		if (!taskId) {
			return fail(400, { message: 'Task ID is required.' });
		}

		try {
			return await approveTaskApproval(taskId, 'governance inbox');
		} catch (caughtError) {
			return handleGovernanceActionError(caughtError);
		}
	},

	rejectApproval: async ({ request }) => {
		const taskId = readTaskId(await request.formData());

		if (!taskId) {
			return fail(400, { message: 'Task ID is required.' });
		}

		try {
			return await rejectTaskApproval(taskId);
		} catch (caughtError) {
			return handleGovernanceActionError(caughtError);
		}
	}
};
