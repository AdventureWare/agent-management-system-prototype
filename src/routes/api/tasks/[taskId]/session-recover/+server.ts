import { json } from '@sveltejs/kit';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
import {
	AgentControlPlaneApiError,
	recoverAgentApiTaskSession
} from '$lib/server/agent-control-plane-api';

export const POST = async ({ params }) => {
	try {
		return json(await recoverAgentApiTaskSession(params.taskId), { status: 201 });
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
