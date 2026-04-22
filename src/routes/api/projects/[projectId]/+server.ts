import { json } from '@sveltejs/kit';
import { jsonAgentApiError } from '$lib/server/agent-api-route-responses';
import {
	AgentControlPlaneApiError,
	updateAgentApiProject
} from '$lib/server/agent-control-plane-api';
import { load as loadProjectDetailPageData } from '../../../app/projects/[projectId]/+page.server';

export const GET = async ({ params }) => {
	return json(await loadProjectDetailPageData({ params } as never));
};

export const PATCH = async ({ params, request }) => {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const project = await updateAgentApiProject(params.projectId, {
			name: typeof body.name === 'string' ? body.name : undefined,
			summary: typeof body.summary === 'string' ? body.summary : undefined,
			parentProjectId:
				typeof body.parentProjectId === 'string' || body.parentProjectId === null
					? (body.parentProjectId as string | null)
					: undefined,
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
					: undefined
		});

		return json({ project });
	} catch (error) {
		if (error instanceof AgentControlPlaneApiError) {
			return jsonAgentApiError(error);
		}

		throw error;
	}
};
