import { json } from '@sveltejs/kit';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
import {
	AgentControlPlaneApiError,
	decomposeAgentApiTask,
	previewAgentApiTaskDecomposition
} from '$lib/server/agent-control-plane-api';

export const POST = async ({ params, request }) => {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const input = {
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
		};
		const validateOnly = body.validateOnly === true;
		const result = validateOnly
			? await previewAgentApiTaskDecomposition(params.taskId, input)
			: await decomposeAgentApiTask(params.taskId, input);

		return json(result, { status: validateOnly ? 200 : 201 });
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
