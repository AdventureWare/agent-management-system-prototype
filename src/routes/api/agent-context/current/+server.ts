import { json } from '@sveltejs/kit';
import { loadAgentCurrentContext } from '$lib/server/agent-current-context';
import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';

export const GET = async ({ url }) => {
	try {
		return json(
			await loadAgentCurrentContext({
				threadId: url.searchParams.get('threadId'),
				taskId: url.searchParams.get('taskId'),
				runId: url.searchParams.get('runId')
			})
		);
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
