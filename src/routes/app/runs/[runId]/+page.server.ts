import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listAgentThreads } from '$lib/server/agent-threads';
import { buildArtifactBrowser } from '$lib/server/artifact-browser';
import { getExecutionSurfaces, loadControlPlane } from '$lib/server/control-plane';
import { buildRunRecords } from '$lib/server/run-records';

export const load: PageServerLoad = async ({ params }) => {
	const controlPlanePromise = loadControlPlane();
	const [data, threads] = await Promise.all([
		controlPlanePromise,
		listAgentThreads({
			includeArchived: true,
			controlPlane: controlPlanePromise,
			includeCategorization: false
		})
	]);
	const runs = buildRunRecords(data, threads);
	const run = runs.find((candidate) => candidate.id === params.runId) ?? null;

	if (!run) {
		throw error(404, 'Run not found.');
	}

	return {
		run,
		artifactBrowsers: await Promise.all(
			run.artifactPaths.map((path) =>
				buildArtifactBrowser({
					rootPath: path,
					rootFileLabel: 'Recorded output'
				})
			)
		),
		task: data.tasks.find((task) => task.id === run.taskId) ?? null,
		executionSurface: run.executionSurfaceId
			? (getExecutionSurfaces(data).find((worker) => worker.id === run.executionSurfaceId) ?? null)
			: null,
		worker: run.executionSurfaceId
			? (getExecutionSurfaces(data).find((worker) => worker.id === run.executionSurfaceId) ?? null)
			: null,
		provider: run.providerId
			? (data.providers.find((provider) => provider.id === run.providerId) ?? null)
			: null,
		thread: run.agentThreadId
			? (threads.find((thread) => thread.id === run.agentThreadId) ?? null)
			: null,
		relatedTaskRuns: runs
			.filter((candidate) => candidate.taskId === run.taskId && candidate.id !== run.id)
			.slice(0, 6)
	};
};
