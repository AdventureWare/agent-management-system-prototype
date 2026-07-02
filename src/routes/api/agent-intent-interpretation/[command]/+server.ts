import { json } from '@sveltejs/kit';
import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
import { buildAgentIntentInterpretationResponse } from '$lib/server/agent-intent-interpretation';
import { loadControlPlane } from '$lib/server/control-plane';

export const POST = async ({ params, request }) => {
	try {
		const input = await request.json().catch(() => ({}));
		const data = await loadControlPlane();

		return json(
			buildAgentIntentInterpretationResponse(data, {
				...input,
				command: params.command
			})
		);
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
