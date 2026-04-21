import { json } from '@sveltejs/kit';
import {
	AgentControlPlaneApiError,
	attachAgentApiTaskFile
} from '$lib/server/agent-control-plane-api';

export const POST = async ({ params, request }) => {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const result = await attachAgentApiTaskFile(params.taskId, {
			path: typeof body.path === 'string' ? body.path : undefined,
			name: typeof body.name === 'string' ? body.name : undefined,
			contentType: typeof body.contentType === 'string' ? body.contentType : undefined
		});

		return json(result, { status: 201 });
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return json({ error: error.message }, { status: error.status });
		}

		throw error;
	}
};
