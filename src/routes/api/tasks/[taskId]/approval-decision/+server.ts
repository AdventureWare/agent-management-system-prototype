import { json } from '@sveltejs/kit';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
import {
	AgentControlPlaneApiError,
	approveAgentApiTaskApproval,
	previewAgentApiTaskApprovalDecision,
	rejectAgentApiTaskApproval
} from '$lib/server/agent-control-plane-api';

export const POST = async ({ params, request }) => {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const decision = typeof body.decision === 'string' ? body.decision : '';
		const validateOnly = body.validateOnly === true;

		if (decision === 'approve') {
			return json(
				validateOnly
					? await previewAgentApiTaskApprovalDecision(params.taskId, 'approve')
					: await approveAgentApiTaskApproval(params.taskId)
			);
		}

		if (decision === 'reject') {
			return json(
				validateOnly
					? await previewAgentApiTaskApprovalDecision(params.taskId, 'reject')
					: await rejectAgentApiTaskApproval(params.taskId)
			);
		}

		return jsonAgentApiError(
			new AgentControlPlaneApiError(400, 'decision must be approve or reject.', {
				code: 'invalid_approval_decision',
				suggestedNextCommands: ['task:get', 'task:approve-approval', 'task:reject-approval'],
				details: {
					taskId: params.taskId,
					allowedDecisions: ['approve', 'reject']
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
