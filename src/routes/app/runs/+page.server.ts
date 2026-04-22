import type { PageServerLoad } from './$types';
import { listAgentThreads } from '$lib/server/agent-threads';
import { buildAgentGuidanceHint } from '$lib/server/agent-current-context';
import { buildRunRecords } from '$lib/server/run-records';
import { loadControlPlaneWithRunTelemetry } from '$lib/server/run-telemetry';
import { getOpenReviewForTask, getPendingApprovalForTask } from '$lib/server/control-plane';
import { RUN_STATUS_OPTIONS } from '$lib/types/control-plane';

export const load: PageServerLoad = async () => {
	const controlPlanePromise = loadControlPlaneWithRunTelemetry();
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
	const modelsWithRuns = new Set(
		data.runs
			.map((run) => run.modelUsed?.trim() ?? '')
			.filter((model): model is string => model.length > 0)
	);

	return {
		runs: buildRunRecords(data, threads).map((run) => {
			const task = data.tasks.find((candidate) => candidate.id === run.taskId) ?? null;
			const openReview = task ? getOpenReviewForTask(data, task.id) : null;
			const pendingApproval = task ? getPendingApprovalForTask(data, task.id) : null;

			return {
				...run,
				agentGuidanceHint: buildAgentGuidanceHint({
					task,
					run,
					openReview,
					pendingApproval,
					threadId: run.agentThreadId ?? run.threadId ?? null
				})
			};
		}),
		statusOptions: RUN_STATUS_OPTIONS,
		tasks: [...data.tasks]
			.filter((task) => taskIdsWithRuns.has(task.id))
			.map((task) => ({ id: task.id, title: task.title }))
			.sort((left, right) => left.title.localeCompare(right.title)),
		executionSurfaces: [...data.executionSurfaces]
			.filter((executionSurface) => executionSurfaceIdsWithRuns.has(executionSurface.id))
			.map((executionSurface) => ({ id: executionSurface.id, name: executionSurface.name }))
			.sort((left, right) => left.name.localeCompare(right.name)),
		providers: [...data.providers]
			.filter((provider) => providerIdsWithRuns.has(provider.id))
			.map((provider) => ({ id: provider.id, name: provider.name }))
			.sort((left, right) => left.name.localeCompare(right.name)),
		models: [...modelsWithRuns].sort((left, right) => left.localeCompare(right))
	};
};
