import { json } from '@sveltejs/kit';
import {
	AgentControlPlaneApiError,
	approveAgentApiTaskReview,
	requestAgentApiTaskReviewChanges
} from '$lib/server/agent-control-plane-api';

export const POST = async ({ params, request }) => {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const decision = typeof body.decision === 'string' ? body.decision : '';

		if (decision === 'approve') {
			return json(await approveAgentApiTaskReview(params.taskId));
		}

		if (decision === 'changes_requested') {
			return json(await requestAgentApiTaskReviewChanges(params.taskId));
		}

		return json({ error: 'decision must be approve or changes_requested.' }, { status: 400 });
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return json({ error: error.message }, { status: error.status });
		}

		throw error;
	}
};
