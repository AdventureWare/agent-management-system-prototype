import { json } from '@sveltejs/kit';
import { loadControlPlane, updateControlPlane } from '$lib/server/control-plane';
import {
	authenticateExecutionSurface,
	claimTaskForExecutionSurface
} from '$lib/server/execution-surface-api';

export const POST = async ({ request }) => {
	const body = (await request.json()) as {
		executionSurfaceId?: string;
		executionSurfaceToken?: string;
		taskId?: string;
	};

	if (!body.taskId?.trim()) {
		return json({ error: 'taskId is required.' }, { status: 400 });
	}

	const data = await loadControlPlane();
	const executionSurface = authenticateExecutionSurface(
		data,
		body.executionSurfaceId?.trim() ?? '',
		body.executionSurfaceToken?.trim() ?? ''
	);
	const nextData = await updateControlPlane((current) =>
		claimTaskForExecutionSurface(current, executionSurface, body.taskId?.trim() ?? '')
	);
	const task = nextData.tasks.find((candidate) => candidate.id === body.taskId?.trim());

	return json({ task });
};
