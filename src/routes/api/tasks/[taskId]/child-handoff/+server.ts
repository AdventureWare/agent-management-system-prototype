import { json } from '@sveltejs/kit';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
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

		return jsonAgentApiError(
			new AgentControlPlaneApiError(400, 'decision must be accept or changes_requested.', {
				code: 'invalid_child_handoff_decision',
				suggestedNextCommands: [
					'task:get',
					'task:accept-child-handoff',
					'task:request-child-handoff-changes'
				],
				details: {
					taskId: params.taskId,
					allowedDecisions: ['accept', 'changes_requested']
				}
			})
		);
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
