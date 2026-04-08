import { json } from '@sveltejs/kit';
import { loadControlPlane, parseTaskStatus, updateControlPlane } from '$lib/server/control-plane';
import { authenticateWorker, updateTaskFromWorker } from '$lib/server/worker-api';

export const POST = async ({ request }) => {
	const body = (await request.json()) as {
		workerId?: string;
		workerToken?: string;
		taskId?: string;
		status?: string;
	};

	const taskId = body.taskId?.trim() ?? '';

	if (!taskId || !body.status?.trim()) {
		return json({ error: 'taskId and status are required.' }, { status: 400 });
	}

	const data = await loadControlPlane();
	const worker = authenticateWorker(
		data,
		body.workerId?.trim() ?? '',
		body.workerToken?.trim() ?? ''
	);
	const task = data.tasks.find((candidate) => candidate.id === taskId);

	if (!task) {
		return json({ error: 'Task not found.' }, { status: 404 });
	}

	const nextData = await updateControlPlane((current) =>
		updateTaskFromWorker(current, worker, {
			taskId,
			status: parseTaskStatus(body.status?.trim() ?? '', task.status)
		})
	);
	const updatedTask = nextData.tasks.find((candidate) => candidate.id === taskId);

	return json({ task: updatedTask });
};
