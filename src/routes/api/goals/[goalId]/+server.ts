import { json } from '@sveltejs/kit';
import { AgentControlPlaneApiError, updateAgentApiGoal } from '$lib/server/agent-control-plane-api';
import { load as loadGoalDetailPageData } from '../../../app/goals/[goalId]/+page.server';

export const GET = async ({ params }) => {
	return json(await loadGoalDetailPageData({ params } as never));
};

export const PATCH = async ({ params, request }) => {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const goal = await updateAgentApiGoal(params.goalId, {
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

		return json({ goal });
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return json({ error: error.message }, { status: error.status });
		}

		throw error;
	}
};
