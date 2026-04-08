import { json } from '@sveltejs/kit';
import { loadControlPlane } from '$lib/server/control-plane';
import {
	authenticateExecutionSurface,
	getExecutionSurfaceQueueSummary,
	getExecutionSurfaceTaskView,
	toPublicExecutionSurface
} from '$lib/server/execution-surface-api';

export const POST = async ({ request }) => {
	const body = (await request.json()) as {
		executionSurfaceId?: string;
		executionSurfaceToken?: string;
	};

	const data = await loadControlPlane();
	const executionSurface = authenticateExecutionSurface(
		data,
		body.executionSurfaceId?.trim() ?? '',
		body.executionSurfaceToken?.trim() ?? ''
	);
	const tasks = getExecutionSurfaceTaskView(data, executionSurface);

	return json({
		executionSurface: toPublicExecutionSurface(executionSurface),
		queueSummary: getExecutionSurfaceQueueSummary(data, executionSurface),
		tasks
	});
};
