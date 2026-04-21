import { json } from '@sveltejs/kit';
import {
	acceptAgentApiTaskChildHandoff,
	AgentControlPlaneApiError,
	requestAgentApiTaskChildHandoffChanges
} from '$lib/server/agent-control-plane-api';

export const POST = async ({ params, request }) => {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const decision = typeof body.decision === 'string' ? body.decision : '';
		const payload = {
			childTaskId: typeof body.childTaskId === 'string' ? body.childTaskId : undefined,
			summary: typeof body.summary === 'string' ? body.summary : undefined
		};

		if (decision === 'accept') {
			return json(await acceptAgentApiTaskChildHandoff(params.taskId, payload));
		}

		if (decision === 'changes_requested') {
			return json(await requestAgentApiTaskChildHandoffChanges(params.taskId, payload));
		}

		return json({ error: 'decision must be accept or changes_requested.' }, { status: 400 });
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return json({ error: error.message }, { status: error.status });
		}

		throw error;
	}
};
