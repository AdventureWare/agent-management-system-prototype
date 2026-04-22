import { json } from '@sveltejs/kit';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
import {
	AgentControlPlaneApiError,
	requestAgentApiTaskReview
} from '$lib/server/agent-control-plane-api';

export const POST = async ({ params, request }) => {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const result = await requestAgentApiTaskReview(params.taskId, {
			summary: typeof body.summary === 'string' ? body.summary : undefined,
			requestedByExecutionSurfaceId:
				typeof body.requestedByExecutionSurfaceId === 'string' ||
				body.requestedByExecutionSurfaceId === null
					? (body.requestedByExecutionSurfaceId as string | null)
					: undefined,
			reviewerExecutionSurfaceId:
				typeof body.reviewerExecutionSurfaceId === 'string' ||
				body.reviewerExecutionSurfaceId === null
					? (body.reviewerExecutionSurfaceId as string | null)
					: undefined
		});

		return json(result, { status: 201 });
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
