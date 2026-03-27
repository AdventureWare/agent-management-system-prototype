import { createHash, randomBytes } from 'node:crypto';
import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import { taskHasUnmetDependencies } from '$lib/server/control-plane';
import type {
	ControlPlaneData,
	Task,
	TaskStatus,
	Worker,
	WorkerStatus
} from '$lib/types/control-plane';

export type PublicWorker = Omit<Worker, 'authTokenHash'>;

export function createWorkerAuthToken() {
	return randomBytes(24).toString('hex');
}

export function hashWorkerToken(token: string) {
	return createHash('sha256').update(token).digest('hex');
}

export function toPublicWorker(worker: Worker): PublicWorker {
	const { authTokenHash, ...publicWorker } = worker;
	void authTokenHash;
	return publicWorker;
}

export function getWorkerBootstrapToken() {
	const fromEnv = process.env.WORKER_BOOTSTRAP_TOKEN?.trim();

	if (fromEnv) return fromEnv;
	if (dev) return 'local-dev-bootstrap-token';

	return null;
}

export function assertBootstrapToken(token: string | null | undefined) {
	const expectedToken = getWorkerBootstrapToken();

	if (!expectedToken) {
		throw error(
			503,
			'Worker bootstrap token is not configured. Set WORKER_BOOTSTRAP_TOKEN before registering remote workers.'
		);
	}

	if (!token || token !== expectedToken) {
		throw error(401, 'Invalid bootstrap token.');
	}
}

export function authenticateWorker(data: ControlPlaneData, workerId: string, workerToken: string) {
	const worker = data.workers.find((candidate) => candidate.id === workerId);

	if (!worker) {
		throw error(404, 'Worker not found.');
	}

	if (!workerToken || worker.authTokenHash !== hashWorkerToken(workerToken)) {
		throw error(401, 'Invalid worker token.');
	}

	return worker;
}

export function isWorkerEligibleForTask(worker: Worker, task: Task) {
	return worker.roleId === 'role_coordinator' || worker.roleId === task.desiredRoleId;
}

export function getWorkerTaskView(data: ControlPlaneData, worker: Worker) {
	const assigned = data.tasks.filter(
		(task) => task.assigneeWorkerId === worker.id && task.status !== 'done'
	);

	const available = data.tasks.filter(
		(task) =>
			task.assigneeWorkerId === null &&
			task.status === 'ready' &&
			isWorkerEligibleForTask(worker, task) &&
			!taskHasUnmetDependencies(data, task)
	);

	return {
		assigned,
		available
	};
}

export function getWorkerQueueSummary(data: ControlPlaneData, worker: Worker) {
	const tasks = getWorkerTaskView(data, worker);

	return {
		assignedCount: tasks.assigned.length,
		availableCount: tasks.available.length,
		runningAssignedCount: tasks.assigned.filter((task) => task.status === 'running').length
	};
}

export function updateWorkerHeartbeat(
	data: ControlPlaneData,
	workerId: string,
	input: {
		status?: WorkerStatus;
		capacity?: number;
		note?: string;
		tags?: string[];
	}
) {
	return {
		...data,
		workers: data.workers.map((worker) =>
			worker.id === workerId
				? {
						...worker,
						status: input.status ?? worker.status,
						capacity:
							typeof input.capacity === 'number' &&
							Number.isFinite(input.capacity) &&
							input.capacity > 0
								? input.capacity
								: worker.capacity,
						note: input.note ?? worker.note,
						tags: input.tags ?? worker.tags,
						lastSeenAt: new Date().toISOString()
					}
				: worker
		)
	};
}

export function claimTaskForWorker(data: ControlPlaneData, worker: Worker, taskId: string) {
	const task = data.tasks.find((candidate) => candidate.id === taskId);

	if (!task) {
		throw error(404, 'Task not found.');
	}

	if (!isWorkerEligibleForTask(worker, task)) {
		throw error(403, 'Worker is not eligible for this task.');
	}

	if (task.assigneeWorkerId && task.assigneeWorkerId !== worker.id) {
		throw error(409, 'Task is already assigned to another worker.');
	}

	if (
		task.status !== 'ready' &&
		!(task.assigneeWorkerId === worker.id && task.status === 'running')
	) {
		throw error(409, 'Only ready tasks can be claimed.');
	}

	if (taskHasUnmetDependencies(data, task)) {
		throw error(409, 'Task dependencies are not complete.');
	}

	return {
		...data,
		tasks: data.tasks.map((candidate) =>
			candidate.id === taskId
				? {
						...candidate,
						assigneeWorkerId: worker.id,
						status: 'running' as const,
						updatedAt: new Date().toISOString()
					}
				: candidate
		)
	};
}

export function updateTaskFromWorker(
	data: ControlPlaneData,
	worker: Worker,
	input: {
		taskId: string;
		status: TaskStatus;
	}
) {
	const task = data.tasks.find((candidate) => candidate.id === input.taskId);

	if (!task) {
		throw error(404, 'Task not found.');
	}

	if (task.assigneeWorkerId !== worker.id) {
		throw error(403, 'Task is not assigned to this worker.');
	}

	return {
		...data,
		tasks: data.tasks.map((candidate) =>
			candidate.id === input.taskId
				? {
						...candidate,
						status: input.status,
						updatedAt: new Date().toISOString()
					}
				: candidate
		)
	};
}
