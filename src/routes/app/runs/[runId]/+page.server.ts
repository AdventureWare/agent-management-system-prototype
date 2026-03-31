import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listAgentSessions } from '$lib/server/agent-sessions';
import { loadControlPlane } from '$lib/server/control-plane';
import { buildRunRecords } from '$lib/server/run-records';

export const load: PageServerLoad = async ({ params }) => {
	const sessions = await listAgentSessions({ includeArchived: true });
	const data = await loadControlPlane();
	const runs = buildRunRecords(data, sessions);
	const run = runs.find((candidate) => candidate.id === params.runId) ?? null;

	if (!run) {
		throw error(404, 'Run not found.');
	}

	return {
		run,
		task: data.tasks.find((task) => task.id === run.taskId) ?? null,
		worker: run.workerId ? (data.workers.find((worker) => worker.id === run.workerId) ?? null) : null,
		provider: run.providerId
			? (data.providers.find((provider) => provider.id === run.providerId) ?? null)
			: null,
		session: run.sessionId
			? (sessions.find((session) => session.id === run.sessionId) ?? null)
			: null,
		relatedTaskRuns: runs
			.filter((candidate) => candidate.taskId === run.taskId && candidate.id !== run.id)
			.slice(0, 6)
	};
};
