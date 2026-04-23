import { json } from '@sveltejs/kit';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import type { AssistantActionPlan } from '$lib/assistant/types';
import { executeAssistantPlan } from '$lib/server/assistant/actions';
import { logAssistantAction } from '$lib/server/assistant/audit-log';

function readPlan(value: unknown): AssistantActionPlan {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new AgentControlPlaneApiError(400, 'Assistant action plan is required.', {
			code: 'missing_assistant_plan'
		});
	}

	const plan = value as AssistantActionPlan;

	if (!plan.id || !plan.action || !plan.payload || !plan.needsConfirmation) {
		throw new AgentControlPlaneApiError(400, 'Assistant action plan is invalid.', {
			code: 'invalid_assistant_plan'
		});
	}

	return plan;
}

export const POST = async ({ request }) => {
	let plan: AssistantActionPlan | null = null;

	try {
		const body = (await request.json()) as Record<string, unknown>;
		plan = readPlan(body.plan);
		const result = await executeAssistantPlan(plan);

		await logAssistantAction({
			event: 'assistant_execute',
			plan,
			result
		});

		return json(result, { status: 201 });
	} catch (error) {
		await logAssistantAction({
			event: 'assistant_execute_error',
			plan,
			error: error instanceof Error ? error.message : String(error)
		});

		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
