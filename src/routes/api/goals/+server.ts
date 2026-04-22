import { json } from '@sveltejs/kit';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
import {
	AgentControlPlaneApiError,
	createAgentApiGoal,
	listAgentApiGoals
} from '$lib/server/agent-control-plane-api';
import { loadControlPlane } from '$lib/server/control-plane';

export const GET = async ({ url }) => {
	const limitValue = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
	const data = await loadControlPlane();

	return json({
		goals: listAgentApiGoals(data, {
			q: url.searchParams.get('q'),
			projectId: url.searchParams.get('projectId'),
			status: url.searchParams.get('status'),
			limit: Number.isFinite(limitValue) ? limitValue : null
		})
	});
};

export const POST = async ({ request }) => {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const goal = await createAgentApiGoal({
			name: typeof body.name === 'string' ? body.name : undefined,
			summary: typeof body.summary === 'string' ? body.summary : undefined,
			successSignal: typeof body.successSignal === 'string' ? body.successSignal : undefined,
			targetDate:
				typeof body.targetDate === 'string' || body.targetDate === null
					? (body.targetDate as string | null)
					: undefined,
			artifactPath:
				typeof body.artifactPath === 'string' || body.artifactPath === null
					? (body.artifactPath as string | null)
					: undefined,
			parentGoalId:
				typeof body.parentGoalId === 'string' || body.parentGoalId === null
					? (body.parentGoalId as string | null)
					: undefined,
			projectIds:
				Array.isArray(body.projectIds) || typeof body.projectIds === 'string'
					? (body.projectIds as string[] | string)
					: undefined,
			taskIds:
				Array.isArray(body.taskIds) || typeof body.taskIds === 'string'
					? (body.taskIds as string[] | string)
					: undefined,
			area: typeof body.area === 'string' ? body.area : undefined,
			status: typeof body.status === 'string' ? body.status : undefined
		});

		return json({ goal }, { status: 201 });
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
