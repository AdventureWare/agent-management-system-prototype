import { json } from '@sveltejs/kit';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
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

		return jsonAgentApiError(
			new AgentControlPlaneApiError(400, 'decision must be approve or changes_requested.', {
				code: 'invalid_review_decision',
				suggestedNextCommands: ['task:get', 'task:approve-review', 'task:request-review-changes'],
				details: {
					taskId: params.taskId,
					allowedDecisions: ['approve', 'changes_requested']
				}
			})
		);
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
