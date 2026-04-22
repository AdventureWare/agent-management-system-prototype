import { json } from '@sveltejs/kit';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
import { AgentControlPlaneApiError, updateAgentApiTask } from '$lib/server/agent-control-plane-api';
import { load as loadTaskDetailPageData } from '../../../app/tasks/[taskId]/+page.server';

export const GET = async ({ params }) => {
	return json(await loadTaskDetailPageData({ params } as never));
};

export const PATCH = async ({ params, request }) => {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const task = await updateAgentApiTask(params.taskId, {
			title: typeof body.title === 'string' ? body.title : undefined,
			summary: typeof body.summary === 'string' ? body.summary : undefined,
			successCriteria: typeof body.successCriteria === 'string' ? body.successCriteria : undefined,
			readyCondition: typeof body.readyCondition === 'string' ? body.readyCondition : undefined,
			expectedOutcome: typeof body.expectedOutcome === 'string' ? body.expectedOutcome : undefined,
			priority: typeof body.priority === 'string' ? body.priority : undefined,
			status: typeof body.status === 'string' ? body.status : undefined,
			area: typeof body.area === 'string' ? body.area : undefined,
			riskLevel: typeof body.riskLevel === 'string' ? body.riskLevel : undefined,
			approvalMode: typeof body.approvalMode === 'string' ? body.approvalMode : undefined,
			requiredThreadSandbox:
				typeof body.requiredThreadSandbox === 'string' || body.requiredThreadSandbox === null
					? (body.requiredThreadSandbox as string | null)
					: undefined,
			requiresReview: typeof body.requiresReview === 'boolean' ? body.requiresReview : undefined,
			desiredRoleId:
				typeof body.desiredRoleId === 'string' || body.desiredRoleId === null
					? (body.desiredRoleId as string | null)
					: undefined,
			assigneeExecutionSurfaceId:
				typeof body.assigneeExecutionSurfaceId === 'string' ||
				body.assigneeExecutionSurfaceId === null
					? (body.assigneeExecutionSurfaceId as string | null)
					: undefined,
			agentThreadId:
				typeof body.agentThreadId === 'string' || body.agentThreadId === null
					? (body.agentThreadId as string | null)
					: undefined,
			blockedReason: typeof body.blockedReason === 'string' ? body.blockedReason : undefined,
			dependencyTaskIds:
				Array.isArray(body.dependencyTaskIds) || typeof body.dependencyTaskIds === 'string'
					? (body.dependencyTaskIds as string[] | string)
					: undefined,
			targetDate:
				typeof body.targetDate === 'string' || body.targetDate === null
					? (body.targetDate as string | null)
					: undefined,
			artifactPath:
				typeof body.artifactPath === 'string' || body.artifactPath === null
					? (body.artifactPath as string | null)
					: undefined,
			requiredPromptSkillNames:
				Array.isArray(body.requiredPromptSkillNames) ||
				typeof body.requiredPromptSkillNames === 'string'
					? (body.requiredPromptSkillNames as string[] | string)
					: undefined,
			requiredCapabilityNames:
				Array.isArray(body.requiredCapabilityNames) ||
				typeof body.requiredCapabilityNames === 'string'
					? (body.requiredCapabilityNames as string[] | string)
					: undefined,
			requiredToolNames:
				Array.isArray(body.requiredToolNames) || typeof body.requiredToolNames === 'string'
					? (body.requiredToolNames as string[] | string)
					: undefined
		});

		return json({ task });
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
