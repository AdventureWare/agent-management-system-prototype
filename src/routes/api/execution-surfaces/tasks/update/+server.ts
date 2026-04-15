import { json } from '@sveltejs/kit';
import {
	loadControlPlane,
	parseTaskStatus,
	updateControlPlaneCollections
} from '$lib/server/control-plane';
import {
	authenticateExecutionSurface,
	updateTaskFromExecutionSurface
} from '$lib/server/execution-surface-api';

export const POST = async ({ request }) => {
	const body = (await request.json()) as {
		executionSurfaceId?: string;
		executionSurfaceToken?: string;
		taskId?: string;
		status?: string;
	};

	const taskId = body.taskId?.trim() ?? '';

	if (!taskId || !body.status?.trim()) {
		return json({ error: 'taskId and status are required.' }, { status: 400 });
	}

	const data = await loadControlPlane();
	const executionSurface = authenticateExecutionSurface(
		data,
		body.executionSurfaceId?.trim() ?? '',
		body.executionSurfaceToken?.trim() ?? ''
	);
	const task = data.tasks.find((candidate) => candidate.id === taskId);

	if (!task) {
		return json({ error: 'Task not found.' }, { status: 404 });
	}

	const nextData = await updateControlPlaneCollections((current) => ({
		data: updateTaskFromExecutionSurface(current, executionSurface, {
			taskId,
			status: parseTaskStatus(body.status?.trim() ?? '', task.status)
		}),
		changedCollections: ['tasks', 'runs', 'reviews', 'approvals']
	}));
	const updatedTask = nextData.tasks.find((candidate) => candidate.id === taskId);

	return json({ task: updatedTask });
};
