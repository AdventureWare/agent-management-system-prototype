import { json } from '@sveltejs/kit';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
import {
	AgentControlPlaneApiError,
	previewAgentApiTaskReviewRequest,
	requestAgentApiTaskReview
} from '$lib/server/agent-control-plane-api';

export const POST = async ({ params, request }) => {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const input = {
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
		};
		const validateOnly = body.validateOnly === true;
		const result = validateOnly
			? await previewAgentApiTaskReviewRequest(params.taskId, input)
			: await requestAgentApiTaskReview(params.taskId, input);

		return json(result, { status: validateOnly ? 200 : 201 });
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
