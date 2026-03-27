import { json } from '@sveltejs/kit';
import { loadControlPlane, parseWorkerStatus, updateControlPlane } from '$lib/server/control-plane';
import {
	authenticateWorker,
	getWorkerQueueSummary,
	toPublicWorker,
	updateWorkerHeartbeat
} from '$lib/server/worker-api';

export const POST = async ({ request }) => {
	const body = (await request.json()) as {
		workerId?: string;
		workerToken?: string;
		status?: string;
		capacity?: number;
		note?: string;
		tags?: string[];
	};

	const data = await loadControlPlane();
	const worker = authenticateWorker(
		data,
		body.workerId?.trim() ?? '',
		body.workerToken?.trim() ?? ''
	);

	const nextData = await updateControlPlane((current) =>
		updateWorkerHeartbeat(current, worker.id, {
			status: body.status ? parseWorkerStatus(body.status, worker.status) : worker.status,
			capacity: body.capacity,
			note: typeof body.note === 'string' ? body.note.trim() : undefined,
			tags: Array.isArray(body.tags)
				? body.tags.map((tag) => tag.trim()).filter(Boolean)
				: undefined
		})
	);

	const updatedWorker = nextData.workers.find((candidate) => candidate.id === worker.id);

	return json({
		worker: updatedWorker ? toPublicWorker(updatedWorker) : null,
		queueSummary: updatedWorker ? getWorkerQueueSummary(nextData, updatedWorker) : null
	});
};
