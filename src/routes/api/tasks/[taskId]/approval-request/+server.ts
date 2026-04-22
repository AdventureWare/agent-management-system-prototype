import { json } from '@sveltejs/kit';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
import {
	AgentControlPlaneApiError,
	previewAgentApiTaskApprovalRequest,
	requestAgentApiTaskApproval
} from '$lib/server/agent-control-plane-api';

export const POST = async ({ params, request }) => {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const input = {
			mode:
				typeof body.mode === 'string' || body.mode === null
					? (body.mode as string | null)
					: undefined,
			summary: typeof body.summary === 'string' ? body.summary : undefined,
			requestedByExecutionSurfaceId:
				typeof body.requestedByExecutionSurfaceId === 'string' ||
				body.requestedByExecutionSurfaceId === null
					? (body.requestedByExecutionSurfaceId as string | null)
					: undefined,
			approverExecutionSurfaceId:
				typeof body.approverExecutionSurfaceId === 'string' ||
				body.approverExecutionSurfaceId === null
					? (body.approverExecutionSurfaceId as string | null)
					: undefined
		};
		const validateOnly = body.validateOnly === true;
		const result = validateOnly
			? await previewAgentApiTaskApprovalRequest(params.taskId, input)
			: await requestAgentApiTaskApproval(params.taskId, input);

		return json(result, { status: validateOnly ? 200 : 201 });
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
