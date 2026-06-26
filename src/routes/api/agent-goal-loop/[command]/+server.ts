import { json } from '@sveltejs/kit';
import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
import { buildAgentGoalLoopResponse } from '$lib/server/agent-goal-loop';
import { loadControlPlane } from '$lib/server/control-plane';

export const GET = async ({ params, url }) => {
	try {
		const limitValue = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
		const data = await loadControlPlane();

		return json(
			buildAgentGoalLoopResponse(data, {
				command: params.command,
				projectId: url.searchParams.get('projectId'),
				goalId: url.searchParams.get('goalId'),
				taskId: url.searchParams.get('taskId'),
				limit: Number.isFinite(limitValue) ? limitValue : null
			})
		);
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
