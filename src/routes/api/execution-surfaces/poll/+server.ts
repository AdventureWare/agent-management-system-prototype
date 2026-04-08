import { json } from '@sveltejs/kit';
import { loadControlPlane } from '$lib/server/control-plane';
import {
	authenticateWorker,
	getWorkerQueueSummary,
	getWorkerTaskView,
	toPublicWorker
} from '$lib/server/worker-api';

export const POST = async ({ request }) => {
	const body = (await request.json()) as {
		workerId?: string;
		workerToken?: string;
	};

	const data = await loadControlPlane();
	const worker = authenticateWorker(
		data,
		body.workerId?.trim() ?? '',
		body.workerToken?.trim() ?? ''
	);
	const tasks = getWorkerTaskView(data, worker);

	return json({
		worker: toPublicWorker(worker),
		queueSummary: getWorkerQueueSummary(data, worker),
		tasks
	});
};
