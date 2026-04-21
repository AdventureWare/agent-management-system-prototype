import { json } from '@sveltejs/kit';
import {
	AgentControlPlaneApiError,
	approveAgentApiTaskApproval,
	rejectAgentApiTaskApproval
} from '$lib/server/agent-control-plane-api';

export const POST = async ({ params, request }) => {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const decision = typeof body.decision === 'string' ? body.decision : '';

		if (decision === 'approve') {
			return json(await approveAgentApiTaskApproval(params.taskId));
		}

		if (decision === 'reject') {
			return json(await rejectAgentApiTaskApproval(params.taskId));
		}

		return json({ error: 'decision must be approve or reject.' }, { status: 400 });
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return json({ error: error.message }, { status: error.status });
		}

		throw error;
	}
};
