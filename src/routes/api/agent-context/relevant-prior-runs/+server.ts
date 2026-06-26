import { json } from '@sveltejs/kit';
import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
import { getRelevantPriorRuns } from '$lib/server/agent-prior-runs';
import { loadControlPlane } from '$lib/server/control-plane';

function parseLimit(value: string | null) {
	if (!value) {
		return null;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

export const GET = async ({ url }) => {
	try {
		const data = await loadControlPlane();

		return json(
			getRelevantPriorRuns(data, {
				projectId: url.searchParams.get('projectId'),
				goalId: url.searchParams.get('goalId'),
				taskId: url.searchParams.get('taskId'),
				status: url.searchParams.get('status'),
				limit: parseLimit(url.searchParams.get('limit'))
			})
		);
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
