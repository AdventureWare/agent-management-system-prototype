import { json } from '@sveltejs/kit';
import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
import { runAgentGoalLoopAction } from '$lib/server/agent-goal-loop-actions';
import { buildAgentGoalLoopResponse } from '$lib/server/agent-goal-loop';
import { runManagedContinuationRunner } from '$lib/server/managed-continuation-runner';
import { loadControlPlane } from '$lib/server/control-plane';

export const GET = async ({ params, url }) => {
	try {
		const limitValue = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
		const data = await loadControlPlane();

		return json(
			buildAgentGoalLoopResponse(data, {
				command: params.command,
				projectId: url.searchParams.get('projectId'),
				goalId: url.searchParams.get('goalId'),
				taskId: url.searchParams.get('taskId'),
				limit: Number.isFinite(limitValue) ? limitValue : null
			})
		);
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};

export const POST = async ({ params, request }) => {
	try {
		const input = await request.json().catch(() => ({}));

		if (params.command === 'managed_continuation_runner') {
			return json(await runManagedContinuationRunner(input));
		}

		return json(
			await runAgentGoalLoopAction({
				...input,
				command: params.command
			})
		);
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
