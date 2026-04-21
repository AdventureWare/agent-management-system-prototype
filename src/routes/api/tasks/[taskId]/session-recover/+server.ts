import { json } from '@sveltejs/kit';
import {
	AgentControlPlaneApiError,
	recoverAgentApiTaskSession
} from '$lib/server/agent-control-plane-api';

export const POST = async ({ params }) => {
	try {
		return json(await recoverAgentApiTaskSession(params.taskId), { status: 201 });
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return json({ error: error.message }, { status: error.status });
		}

		throw error;
	}
};
