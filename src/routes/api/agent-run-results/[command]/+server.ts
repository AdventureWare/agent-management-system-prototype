import { json } from '@sveltejs/kit';
import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
import { recordAgentRunResult } from '$lib/server/agent-run-results';

export const POST = async ({ params, request }) => {
	try {
		const input = await request.json().catch(() => ({}));

		return json(
			await recordAgentRunResult({
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
