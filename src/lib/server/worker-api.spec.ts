import { describe, expect, it } from 'vitest';
import {
	claimTaskForWorker,
	getWorkerTaskView,
	hashWorkerToken,
	isWorkerEligibleForTask,
	toPublicWorker,
	updateTaskFromWorker,
	updateWorkerHeartbeat
} from './worker-api';
import type { ControlPlaneData, Worker } from '$lib/types/control-plane';

function buildFixture(): { data: ControlPlaneData; worker: Worker } {
	const workerTokenHash = hashWorkerToken('secret-token');
	const worker: Worker = {
		id: 'worker_one',
		name: 'Worker One',
		providerId: 'provider_cloud_codex',
		roleId: 'role_researcher',
		location: 'cloud',
		status: 'idle',
		capacity: 2,
		registeredAt: '2026-03-26T00:00:00.000Z',
		lastSeenAt: '2026-03-26T00:00:00.000Z',
		note: 'fixture worker',
		tags: ['research'],
		authTokenHash: workerTokenHash
	};

	return {
		worker,
		data: {
			providers: [],
			roles: [],
			projects: [],
			goals: [],
			workers: [worker],
			tasks: [
				{
					id: 'task_ready_match',
					title: 'Ready match',
					summary: 'ready task',
					lane: 'growth',
					goalId: 'goal_1',
					priority: 'high',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_researcher',
					assigneeWorkerId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					artifactPath: '/tmp/one',
					createdAt: '2026-03-26T00:00:00.000Z',
					updatedAt: '2026-03-26T00:00:00.000Z'
				},
				{
					id: 'task_running_assigned',
					title: 'Assigned',
					summary: 'assigned task',
					lane: 'growth',
					goalId: 'goal_1',
					priority: 'high',
					status: 'running',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_researcher',
					assigneeWorkerId: 'worker_one',
					blockedReason: '',
					dependencyTaskIds: [],
					artifactPath: '/tmp/two',
					createdAt: '2026-03-26T00:00:00.000Z',
					updatedAt: '2026-03-26T00:00:00.000Z'
				},
				{
					id: 'task_ready_other_role',
					title: 'Other role',
					summary: 'different role',
					lane: 'product',
					goalId: 'goal_2',
					priority: 'medium',
					status: 'ready',
					riskLevel: 'low',
					approvalMode: 'before_complete',
					requiresReview: false,
					desiredRoleId: 'role_app_worker',
					assigneeWorkerId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					artifactPath: '/tmp/three',
					createdAt: '2026-03-26T00:00:00.000Z',
					updatedAt: '2026-03-26T00:00:00.000Z'
				}
			]
		}
	};
}

describe('worker-api helpers', () => {
	it('omits authTokenHash from public worker output', () => {
		const { worker } = buildFixture();
		const publicWorker = toPublicWorker(worker);

		expect('authTokenHash' in publicWorker).toBe(false);
		expect(publicWorker.id).toBe(worker.id);
	});

	it('selects assigned and available tasks for a worker', () => {
		const { data, worker } = buildFixture();
		const view = getWorkerTaskView(data, worker);

		expect(view.assigned).toHaveLength(1);
		expect(view.available).toHaveLength(1);
		expect(view.available[0]?.id).toBe('task_ready_match');
	});

	it('claims a ready task for an eligible worker', () => {
		const { data, worker } = buildFixture();
		const next = claimTaskForWorker(data, worker, 'task_ready_match');
		const claimed = next.tasks.find((task) => task.id === 'task_ready_match');

		expect(claimed?.assigneeWorkerId).toBe(worker.id);
		expect(claimed?.status).toBe('running');
	});

	it('updates worker heartbeat fields', () => {
		const { data, worker } = buildFixture();
		const next = updateWorkerHeartbeat(data, worker.id, {
			status: 'busy',
			capacity: 4,
			note: 'updated',
			tags: ['growth', 'citations']
		});
		const updatedWorker = next.workers[0];

		expect(updatedWorker?.status).toBe('busy');
		expect(updatedWorker?.capacity).toBe(4);
		expect(updatedWorker?.note).toBe('updated');
		expect(updatedWorker?.tags).toEqual(['growth', 'citations']);
	});

	it('updates an assigned task status from the worker', () => {
		const { data, worker } = buildFixture();
		const next = updateTaskFromWorker(data, worker, {
			taskId: 'task_running_assigned',
			status: 'review'
		});
		const updatedTask = next.tasks.find((task) => task.id === 'task_running_assigned');

		expect(updatedTask?.status).toBe('review');
	});

	it('checks worker role eligibility correctly', () => {
		const { data, worker } = buildFixture();

		expect(isWorkerEligibleForTask(worker, data.tasks[0]!)).toBe(true);
		expect(isWorkerEligibleForTask(worker, data.tasks[2]!)).toBe(false);
	});

	it('does not expose ready tasks with unmet dependencies', () => {
		const { data, worker } = buildFixture();
		data.tasks.push({
			id: 'task_waiting_on_dependency',
			title: 'Waiting',
			summary: 'blocked by another task',
			lane: 'growth',
			goalId: 'goal_1',
			priority: 'high',
			status: 'ready',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiresReview: true,
			desiredRoleId: 'role_researcher',
			assigneeWorkerId: null,
			blockedReason: '',
			dependencyTaskIds: ['task_running_assigned'],
			artifactPath: '/tmp/four',
			createdAt: '2026-03-26T00:00:00.000Z',
			updatedAt: '2026-03-26T00:00:00.000Z'
		});

		const view = getWorkerTaskView(data, worker);

		expect(view.available.map((task) => task.id)).not.toContain('task_waiting_on_dependency');
	});
});
