import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	acceptTaskChildHandoff,
	requestTaskChildHandoffChanges,
	TaskChildHandoffActionError
} from '$lib/server/task-child-handoffs';
import {
	deleteTaskWithRelatedThreads,
	TaskDeleteActionError
} from '$lib/server/task-delete-action';
import {
	decomposeTaskFromParent,
	TaskDecompositionActionError
} from '$lib/server/task-decomposition-action';
import {
	attachTaskFile as attachTaskFileAction,
	removeTaskAttachment as removeTaskAttachmentAction,
	TaskDetailMutationActionError,
	updateTaskThreadAssignment
} from '$lib/server/task-detail-mutation-actions';
import { loadTaskDetailPageData } from '$lib/server/task-detail-page-data';
import {
	launchTaskSession as launchTaskSessionAction,
	recoverTaskSession as recoverTaskSessionAction,
	TaskSessionActionError
} from '$lib/server/task-session-actions';
import { TaskUpdateActionError, updateTaskFromDetailForm } from '$lib/server/task-update-action';
import {
	approveTaskApproval,
	approveTaskReview,
	rejectTaskApproval,
	requestTaskReviewChanges,
	TaskGovernanceActionError
} from '$lib/server/task-governance';
import { loadAgentCurrentContext } from '$lib/server/agent-current-context';

async function handleTaskGovernanceAction(action: () => Promise<unknown>) {
	try {
		return await action();
	} catch (caughtError) {
		if (caughtError instanceof TaskGovernanceActionError) {
			return fail(caughtError.status, { message: caughtError.message });
		}

		throw caughtError;
	}
}

async function handleTaskChildHandoffAction(action: () => Promise<unknown>) {
	try {
		return await action();
	} catch (caughtError) {
		if (caughtError instanceof TaskChildHandoffActionError) {
			return fail(caughtError.status, { message: caughtError.message });
		}

		throw caughtError;
	}
}

async function handleTaskSessionAction(action: () => Promise<unknown>) {
	try {
		return await action();
	} catch (caughtError) {
		if (caughtError instanceof TaskSessionActionError) {
			return fail(caughtError.status, { message: caughtError.message });
		}

		throw caughtError;
	}
}

async function handleTaskUpdateAction(action: () => Promise<unknown>) {
	try {
		return await action();
	} catch (caughtError) {
		if (caughtError instanceof TaskUpdateActionError) {
			return fail(caughtError.status, { message: caughtError.message });
		}

		throw caughtError;
	}
}

async function handleTaskDetailMutationAction(action: () => Promise<unknown>) {
	try {
		return await action();
	} catch (caughtError) {
		if (caughtError instanceof TaskDetailMutationActionError) {
			return fail(caughtError.status, { message: caughtError.message });
		}

		throw caughtError;
	}
}

async function handleTaskDeleteAction(action: () => Promise<unknown>) {
	try {
		return await action();
	} catch (caughtError) {
		if (caughtError instanceof TaskDeleteActionError) {
			return fail(caughtError.status, { message: caughtError.message });
		}

		throw caughtError;
	}
}

async function handleTaskDecompositionAction(action: () => Promise<unknown>) {
	try {
		return await action();
	} catch (caughtError) {
		if (caughtError instanceof TaskDecompositionActionError) {
			return fail(caughtError.status, { message: caughtError.message });
		}

		throw caughtError;
	}
}

export const load: PageServerLoad = async ({ params }) => {
	const pageData = await loadTaskDetailPageData(params.taskId);

	if (!pageData) {
		throw error(404, 'Task not found.');
	}

	return {
		...pageData,
		agentCurrentContext: await loadAgentCurrentContext({ taskId: params.taskId })
	};
};

export const actions: Actions = {
	updateTask: async ({ params, request }) => {
		const form = await request.formData();
		return handleTaskUpdateAction(() => updateTaskFromDetailForm(params.taskId, form));
	},

	attachTaskFile: async ({ params, request }) => {
		const form = await request.formData();
		return handleTaskDetailMutationAction(() => attachTaskFileAction(params.taskId, form));
	},

	removeTaskAttachment: async ({ params, request }) => {
		const form = await request.formData();
		return handleTaskDetailMutationAction(() => removeTaskAttachmentAction(params.taskId, form));
	},

	updateTaskThread: async ({ params, request }) => {
		const form = await request.formData();
		return handleTaskDetailMutationAction(() => updateTaskThreadAssignment(params.taskId, form));
	},

	acceptChildHandoff: async ({ params, request }) => {
		const form = await request.formData();
		return handleTaskChildHandoffAction(() => acceptTaskChildHandoff(params.taskId, form));
	},

	requestChildHandoffChanges: async ({ params, request }) => {
		const form = await request.formData();
		return handleTaskChildHandoffAction(() => requestTaskChildHandoffChanges(params.taskId, form));
	},

	decomposeTask: async ({ params, request }) => {
		const form = await request.formData();
		return handleTaskDecompositionAction(() => decomposeTaskFromParent(params.taskId, form));
	},

	launchTaskSession: async ({ params, request }) => {
		const form = await request.formData();
		return handleTaskSessionAction(() => launchTaskSessionAction(params.taskId, form));
	},

	recoverTaskSession: async ({ params, request }) => {
		const form = await request.formData();
		return handleTaskSessionAction(() => recoverTaskSessionAction(params.taskId, form));
	},

	approveReview: async ({ params }) =>
		handleTaskGovernanceAction(() => approveTaskReview(params.taskId, 'task detail page')),

	requestChanges: async ({ params }) =>
		handleTaskGovernanceAction(() => requestTaskReviewChanges(params.taskId, 'task detail page')),

	approveApproval: async ({ params }) =>
		handleTaskGovernanceAction(() => approveTaskApproval(params.taskId, 'task detail page')),

	rejectApproval: async ({ params }) =>
		handleTaskGovernanceAction(() => rejectTaskApproval(params.taskId)),

	deleteTask: async ({ params }) => {
		const failure = await handleTaskDeleteAction(() => deleteTaskWithRelatedThreads(params.taskId));

		if (failure) {
			return failure;
		}

		throw redirect(303, '/app/tasks?deleted=1');
	}
};
