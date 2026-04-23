import { json } from '@sveltejs/kit';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { logAssistantAction } from '$lib/server/assistant/audit-log';
import { interpretAssistantRequest } from '$lib/server/assistant/intent';
import { loadControlPlane } from '$lib/server/control-plane';
import type { AssistantContextSnapshot } from '$lib/assistant/types';

function readContext(value: unknown): AssistantContextSnapshot {
	const fallback: AssistantContextSnapshot = {
		route: '/app',
		pageType: 'unknown',
		currentObject: null,
		selectedObjects: [],
		breadcrumbs: [],
		visibleCapabilities: ['create_task', 'create_goal', 'create_role', 'create_agent']
	};

	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return fallback;
	}

	return {
		...fallback,
		...(value as Partial<AssistantContextSnapshot>)
	};
}

export const POST = async ({ request }) => {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const rawInput = typeof body.input === 'string' ? body.input : '';
		const context = readContext(body.context);
		const data = await loadControlPlane();
		const response = interpretAssistantRequest({ rawInput, context, data });

		await logAssistantAction({
			event: 'assistant_plan',
			rawInput,
			context,
			response
		});

		return json(response);
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
