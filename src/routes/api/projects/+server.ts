import { json } from '@sveltejs/kit';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
import {
	AgentControlPlaneApiError,
	createAgentApiProject,
	listAgentApiProjects
} from '$lib/server/agent-control-plane-api';
import { loadControlPlane } from '$lib/server/control-plane';

export const GET = async ({ url }) => {
	const limitValue = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
	const data = await loadControlPlane();

	return json({
		projects: listAgentApiProjects(data, {
			q: url.searchParams.get('q'),
			limit: Number.isFinite(limitValue) ? limitValue : null
		})
	});
};

export const POST = async ({ request }) => {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const project = await createAgentApiProject({
			name: typeof body.name === 'string' ? body.name : undefined,
			summary: typeof body.summary === 'string' ? body.summary : undefined,
			parentProjectId:
				typeof body.parentProjectId === 'string' || body.parentProjectId === null
					? (body.parentProjectId as string | null)
					: undefined,
			projectBrief: typeof body.projectBrief === 'string' ? body.projectBrief : undefined,
			currentStateMemo:
				typeof body.currentStateMemo === 'string' ? body.currentStateMemo : undefined,
			decisionLog: typeof body.decisionLog === 'string' ? body.decisionLog : undefined,
			agentInstructionsPath:
				typeof body.agentInstructionsPath === 'string' || body.agentInstructionsPath === null
					? (body.agentInstructionsPath as string | null)
					: undefined,
			setupNotes: typeof body.setupNotes === 'string' ? body.setupNotes : undefined,
			validationCommands:
				Array.isArray(body.validationCommands) || typeof body.validationCommands === 'string'
					? (body.validationCommands as string[] | string)
					: undefined,
			codingConventions:
				typeof body.codingConventions === 'string' ? body.codingConventions : undefined,
			approvalRequirements:
				typeof body.approvalRequirements === 'string' ? body.approvalRequirements : undefined,
			defaultAllowedActions:
				Array.isArray(body.defaultAllowedActions) || typeof body.defaultAllowedActions === 'string'
					? (body.defaultAllowedActions as string[] | string)
					: undefined,
			defaultDisallowedActions:
				Array.isArray(body.defaultDisallowedActions) ||
				typeof body.defaultDisallowedActions === 'string'
					? (body.defaultDisallowedActions as string[] | string)
					: undefined,
			defaultAutonomyLevel:
				typeof body.defaultAutonomyLevel === 'string' ? body.defaultAutonomyLevel : undefined,
			defaultRiskThreshold:
				typeof body.defaultRiskThreshold === 'string' ? body.defaultRiskThreshold : undefined,
			defaultReviewRequirement:
				typeof body.defaultReviewRequirement === 'string'
					? body.defaultReviewRequirement
					: undefined,
			defaultRigorProfile:
				typeof body.defaultRigorProfile === 'string' || body.defaultRigorProfile === null
					? (body.defaultRigorProfile as string | null)
					: undefined,
			defaultValidationExpectations:
				typeof body.defaultValidationExpectations === 'string'
					? body.defaultValidationExpectations
					: undefined,
			importantLinks:
				Array.isArray(body.importantLinks) || typeof body.importantLinks === 'string'
					? (body.importantLinks as string[] | string)
					: undefined,
			constraints: typeof body.constraints === 'string' ? body.constraints : undefined,
			nonGoals: typeof body.nonGoals === 'string' ? body.nonGoals : undefined,
			projectRootFolder:
				typeof body.projectRootFolder === 'string' || body.projectRootFolder === null
					? (body.projectRootFolder as string | null)
					: undefined,
			defaultArtifactRoot:
				typeof body.defaultArtifactRoot === 'string' || body.defaultArtifactRoot === null
					? (body.defaultArtifactRoot as string | null)
					: undefined,
			defaultRepoPath:
				typeof body.defaultRepoPath === 'string' || body.defaultRepoPath === null
					? (body.defaultRepoPath as string | null)
					: undefined,
			defaultRepoUrl: typeof body.defaultRepoUrl === 'string' ? body.defaultRepoUrl : undefined,
			defaultBranch: typeof body.defaultBranch === 'string' ? body.defaultBranch : undefined,
			additionalWritableRoots:
				Array.isArray(body.additionalWritableRoots) ||
				typeof body.additionalWritableRoots === 'string'
					? (body.additionalWritableRoots as string[] | string)
					: undefined,
			defaultThreadSandbox:
				typeof body.defaultThreadSandbox === 'string' || body.defaultThreadSandbox === null
					? (body.defaultThreadSandbox as string | null)
					: undefined,
			defaultModel:
				typeof body.defaultModel === 'string' || body.defaultModel === null
					? (body.defaultModel as string | null)
					: undefined
		});

		return json({ project }, { status: 201 });
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
