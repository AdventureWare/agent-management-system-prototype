import { loadControlPlane } from '$lib/server/control-plane';
import { deleteTaskRecords } from '$lib/server/control-plane-repository';
import { cancelAgentThread } from '$lib/server/agent-threads';

export class TaskDeleteActionError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'TaskDeleteActionError';
	}
}

export async function deleteTaskWithRelatedThreads(taskId: string) {
	const current = await loadControlPlane();
	const task = current.tasks.find((candidate) => candidate.id === taskId);

	if (!task) {
		throw new TaskDeleteActionError(404, 'Task not found.');
	}

	const relatedThreadIds = [
		...new Set(
			current.runs
				.filter((run) => run.taskId === taskId)
				.map((run) => run.agentThreadId)
				.filter((threadId): threadId is string => Boolean(threadId))
		)
	];

	await Promise.all(relatedThreadIds.map((threadId) => cancelAgentThread(threadId)));
	await deleteTaskRecords([taskId]);
}
