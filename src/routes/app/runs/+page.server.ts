import type { PageServerLoad } from './$types';
import { listAgentThreads } from '$lib/server/agent-threads';
import { loadControlPlane } from '$lib/server/control-plane';
import { buildRunRecords } from '$lib/server/run-records';
import { RUN_STATUS_OPTIONS } from '$lib/types/control-plane';

export const load: PageServerLoad = async () => {
	const controlPlanePromise = loadControlPlane();
	const [data, threads] = await Promise.all([
		controlPlanePromise,
		listAgentThreads({
			includeArchived: true,
			controlPlane: controlPlanePromise,
			includeCategorization: false
		})
	]);
	const taskIdsWithRuns = new Set(data.runs.map((run) => run.taskId));
	const executionSurfaceIdsWithRuns = new Set(
		data.runs
			.map((run) => run.executionSurfaceId)
			.filter((executionSurfaceId): executionSurfaceId is string => Boolean(executionSurfaceId))
	);
	const providerIdsWithRuns = new Set(
		data.runs
			.map((run) => run.providerId)
			.filter((providerId): providerId is string => Boolean(providerId))
	);

	return {
		runs: buildRunRecords(data, threads),
		statusOptions: RUN_STATUS_OPTIONS,
		tasks: [...data.tasks]
			.filter((task) => taskIdsWithRuns.has(task.id))
			.map((task) => ({ id: task.id, title: task.title }))
			.sort((left, right) => left.title.localeCompare(right.title)),
		executionSurfaces: [...data.executionSurfaces]
			.filter((worker) => executionSurfaceIdsWithRuns.has(worker.id))
			.map((worker) => ({ id: worker.id, name: worker.name }))
			.sort((left, right) => left.name.localeCompare(right.name)),
		providers: [...data.providers]
			.filter((provider) => providerIdsWithRuns.has(provider.id))
			.map((provider) => ({ id: provider.id, name: provider.name }))
			.sort((left, right) => left.name.localeCompare(right.name))
	};
};
