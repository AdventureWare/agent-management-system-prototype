import { json } from '@sveltejs/kit';
import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
import { runAgentIntent } from '$lib/server/agent-intent-actions';

export const POST = async ({ params, request }) => {
	try {
		const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
		return json(await runAgentIntent(params.intent, body));
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
