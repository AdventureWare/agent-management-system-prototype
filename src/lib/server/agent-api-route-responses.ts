import { json } from '@sveltejs/kit';
import { AgentControlPlaneApiError, buildAgentApiErrorPayload } from './agent-api-errors';

export function jsonAgentApiError(error: AgentControlPlaneApiError) {
	return json(buildAgentApiErrorPayload(error), { status: error.status });
}
