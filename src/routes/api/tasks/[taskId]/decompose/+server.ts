import { json } from '@sveltejs/kit';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
import {
	AgentControlPlaneApiError,
	decomposeAgentApiTask
} from '$lib/server/agent-control-plane-api';

export const POST = async ({ params, request }) => {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const result = await decomposeAgentApiTask(params.taskId, {
			children: Array.isArray(body.children)
				? body.children.map((child) => {
						const item = child as Record<string, unknown>;

						return {
							title: typeof item.title === 'string' ? item.title : undefined,
							instructions: typeof item.instructions === 'string' ? item.instructions : undefined,
							desiredRoleId:
								typeof item.desiredRoleId === 'string' ? item.desiredRoleId : undefined,
							delegationObjective:
								typeof item.delegationObjective === 'string' ? item.delegationObjective : undefined,
							delegationExpectedDeliverable:
								typeof item.delegationExpectedDeliverable === 'string'
									? item.delegationExpectedDeliverable
									: undefined,
							delegationDoneCondition:
								typeof item.delegationDoneCondition === 'string'
									? item.delegationDoneCondition
									: undefined
						};
					})
				: undefined
		});

		return json(result, { status: 201 });
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
