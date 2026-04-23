import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAgentThread, listAgentThreads } from '$lib/server/agent-threads';
import { loadAgentCurrentContext } from '$lib/server/agent-current-context';
import { buildArtifactBrowser } from '$lib/server/artifact-browser';
import { getExecutionSurfaces } from '$lib/server/control-plane';
import { buildRunRecords } from '$lib/server/run-records';
import { loadControlPlaneWithRunTelemetry } from '$lib/server/run-telemetry';
import type { AgentRunDetail, AgentThreadDetail } from '$lib/types/agent-thread';
import type { Run } from '$lib/types/control-plane';

function findAgentThreadRun(input: {
	run: Run;
	thread: AgentThreadDetail | null;
}): AgentRunDetail | null {
	if (!input.thread) {
		return null;
	}

	if (input.run.agentThreadRunId) {
		const matchedRun =
			input.thread.runs.find((candidate) => candidate.id === input.run.agentThreadRunId) ?? null;

		if (matchedRun) {
			return matchedRun;
		}
	}

	if (input.thread.runs.length === 1) {
		return input.thread.runs[0] ?? null;
	}

	return null;
}

export const load: PageServerLoad = async ({ params }) => {
	const controlPlanePromise = loadControlPlaneWithRunTelemetry();
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

	const thread = run.agentThreadId
		? await getAgentThread(run.agentThreadId, { controlPlane: data })
		: null;
	const agentThreadRun = findAgentThreadRun({ run, thread });

	return {
		run,
		agentThreadRun,
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
			? (getExecutionSurfaces(data).find((surface) => surface.id === run.executionSurfaceId) ??
				null)
			: null,
		provider: run.providerId
			? (data.providers.find((provider) => provider.id === run.providerId) ?? null)
			: null,
		thread: run.agentThreadId
			? (thread ?? threads.find((candidate) => candidate.id === run.agentThreadId) ?? null)
			: null,
		agentCurrentContext: await loadAgentCurrentContext({ runId: params.runId }),
		relatedTaskRuns: runs
			.filter((candidate) => candidate.taskId === run.taskId && candidate.id !== run.id)
			.slice(0, 6)
	};
};
