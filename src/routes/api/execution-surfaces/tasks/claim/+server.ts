import { json } from '@sveltejs/kit';
import { loadControlPlane, updateControlPlane } from '$lib/server/control-plane';
import { authenticateWorker, claimTaskForWorker } from '$lib/server/worker-api';

export const POST = async ({ request }) => {
	const body = (await request.json()) as {
		workerId?: string;
		workerToken?: string;
		taskId?: string;
	};

	if (!body.taskId?.trim()) {
		return json({ error: 'taskId is required.' }, { status: 400 });
	}

	const data = await loadControlPlane();
	const worker = authenticateWorker(
		data,
		body.workerId?.trim() ?? '',
		body.workerToken?.trim() ?? ''
	);
	const nextData = await updateControlPlane((current) =>
		claimTaskForWorker(current, worker, body.taskId?.trim() ?? '')
	);
	const task = nextData.tasks.find((candidate) => candidate.id === body.taskId?.trim());

	return json({ task });
};
