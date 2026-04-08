import { json } from '@sveltejs/kit';
import {
	loadControlPlane,
	parseExecutionSurfaceStatus,
	updateControlPlane
} from '$lib/server/control-plane';
import {
	authenticateExecutionSurface,
	getExecutionSurfaceQueueSummary,
	toPublicExecutionSurface,
	updateExecutionSurfaceHeartbeat
} from '$lib/server/execution-surface-api';

export const POST = async ({ request }) => {
	const body = (await request.json()) as {
		executionSurfaceId?: string;
		executionSurfaceToken?: string;
		status?: string;
		capacity?: number;
		note?: string;
		tags?: string[];
	};

	const data = await loadControlPlane();
	const executionSurface = authenticateExecutionSurface(
		data,
		body.executionSurfaceId?.trim() ?? '',
		body.executionSurfaceToken?.trim() ?? ''
	);

	const nextData = await updateControlPlane((current) =>
		updateExecutionSurfaceHeartbeat(current, executionSurface.id, {
			status: body.status
				? parseExecutionSurfaceStatus(body.status, executionSurface.status)
				: executionSurface.status,
			capacity: body.capacity,
			note: typeof body.note === 'string' ? body.note.trim() : undefined,
			tags: Array.isArray(body.tags)
				? body.tags.map((tag) => tag.trim()).filter(Boolean)
				: undefined
		})
	);

	const updatedExecutionSurface = nextData.executionSurfaces.find(
		(candidate) => candidate.id === executionSurface.id
	);

	return json({
		executionSurface: updatedExecutionSurface
			? toPublicExecutionSurface(updatedExecutionSurface)
			: null,
		queueSummary: updatedExecutionSurface
			? getExecutionSurfaceQueueSummary(nextData, updatedExecutionSurface)
			: null
	});
};
