import { json } from '@sveltejs/kit';
import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
import { buildAgentWorkPacketResponse } from '$lib/server/agent-work-packets';
import { loadControlPlane } from '$lib/server/control-plane';

export const GET = async ({ params, url }) => {
	try {
		const data = await loadControlPlane();

		return json(
			buildAgentWorkPacketResponse(data, {
				command: params.command,
				projectId: url.searchParams.get('projectId'),
				goalId: url.searchParams.get('goalId'),
				taskId: url.searchParams.get('taskId')
			})
		);
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
