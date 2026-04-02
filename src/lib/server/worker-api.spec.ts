import { describe, expect, it } from 'vitest';
import {
	claimTaskForWorker,
	describeWorkerTaskFit,
	getWorkerAssignmentSuggestions,
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
		skills: ['research'],
		threadSandboxOverride: null,
		authTokenHash: workerTokenHash
	};

	return {
		worker,
		data: {
			providers: [
				{
					id: 'provider_cloud_codex',
					name: 'Cloud Codex',
					service: 'OpenAI',
					kind: 'cloud',
					description: '',
					enabled: true,
					setupStatus: 'connected',
					authMode: 'custom',
					defaultModel: '',
					baseUrl: '',
					launcher: 'codex',
					envVars: [],
					capabilities: ['citations'],
					defaultThreadSandbox: 'workspace-write',
					notes: ''
				}
			],
			roles: [],
			projects: [],
			goals: [],
			workers: [worker],
			runs: [
				{
					id: 'run_running_assigned',
					taskId: 'task_running_assigned',
					workerId: 'worker_one',
					providerId: 'provider_cloud_codex',
					status: 'running',
					createdAt: '2026-03-26T00:00:00.000Z',
					updatedAt: '2026-03-26T00:00:00.000Z',
					startedAt: '2026-03-26T00:00:00.000Z',
					endedAt: null,
					threadId: null,
					sessionId: null,
					promptDigest: '',
					artifactPaths: [],
					summary: 'Already running.',
					lastHeartbeatAt: '2026-03-26T00:00:00.000Z',
					errorSummary: ''
				}
			],
			reviews: [],
			approvals: [],
			tasks: [
				{
					id: 'task_ready_match',
					title: 'Ready match',
					summary: 'ready task',
					projectId: 'project_growth',
					lane: 'growth',
					goalId: 'goal_1',
					priority: 'high',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_researcher',
					assigneeWorkerId: null,
					threadSessionId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 0,
					latestRunId: null,
					artifactPath: '/tmp/one',
					attachments: [],
					createdAt: '2026-03-26T00:00:00.000Z',
					updatedAt: '2026-03-26T00:00:00.000Z'
				},
				{
					id: 'task_running_assigned',
					title: 'Assigned',
					summary: 'assigned task',
					projectId: 'project_growth',
					lane: 'growth',
					goalId: 'goal_1',
					priority: 'high',
					status: 'in_progress',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_researcher',
					assigneeWorkerId: 'worker_one',
					threadSessionId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 1,
					latestRunId: 'run_running_assigned',
					artifactPath: '/tmp/two',
					attachments: [],
					createdAt: '2026-03-26T00:00:00.000Z',
					updatedAt: '2026-03-26T00:00:00.000Z'
				},
				{
					id: 'task_ready_other_role',
					title: 'Other role',
					summary: 'different role',
					projectId: 'project_product',
					lane: 'product',
					goalId: 'goal_2',
					priority: 'medium',
					status: 'ready',
					riskLevel: 'low',
					approvalMode: 'before_complete',
					requiresReview: false,
					desiredRoleId: 'role_app_worker',
					assigneeWorkerId: null,
					threadSessionId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 0,
					latestRunId: null,
					artifactPath: '/tmp/three',
					attachments: [],
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
		const run = next.runs.find((candidate) => candidate.taskId === 'task_ready_match');

		expect(claimed?.assigneeWorkerId).toBe(worker.id);
		expect(claimed?.status).toBe('in_progress');
		expect(claimed?.runCount).toBe(1);
		expect(claimed?.latestRunId).toBe(run?.id);
		expect(run?.workerId).toBe(worker.id);
		expect(run?.status).toBe('running');
	});

	it('does not create a duplicate run when the same worker reclaims an active task', () => {
		const { data, worker } = buildFixture();
		const next = claimTaskForWorker(data, worker, 'task_running_assigned');

		expect(next).toEqual(data);
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
		const runningTask = data.tasks.find((task) => task.id === 'task_running_assigned');

		if (!runningTask) {
			throw new Error('Expected in-progress task fixture.');
		}

		runningTask.approvalMode = 'before_complete';
		const next = updateTaskFromWorker(data, worker, {
			taskId: 'task_running_assigned',
			status: 'review'
		});
		const updatedTask = next.tasks.find((task) => task.id === 'task_running_assigned');
		const updatedRun = next.runs.find((run) => run.id === 'run_running_assigned');
		const review = next.reviews.find((candidate) => candidate.taskId === 'task_running_assigned');
		const approval = next.approvals.find(
			(candidate) => candidate.taskId === 'task_running_assigned'
		);

		expect(updatedTask?.status).toBe('review');
		expect(updatedRun?.status).toBe('completed');
		expect(updatedRun?.endedAt).not.toBeNull();
		expect(review?.status).toBe('open');
		expect(approval?.status).toBe('pending');
	});

	it('checks worker role eligibility correctly', () => {
		const { data, worker } = buildFixture();

		expect(isWorkerEligibleForTask(data, worker, data.tasks[0]!)).toBe(true);
		expect(isWorkerEligibleForTask(data, worker, data.tasks[2]!)).toBe(false);
	});

	it('requires capability and tool matches when task requirements are set', () => {
		const { data, worker } = buildFixture();
		data.tasks[0] = {
			...data.tasks[0]!,
			requiredCapabilityNames: ['research', 'citations'],
			requiredToolNames: ['codex']
		};
		data.tasks[2] = {
			...data.tasks[2]!,
			requiredCapabilityNames: ['ios'],
			requiredToolNames: ['xcodebuild']
		};

		expect(isWorkerEligibleForTask(data, worker, data.tasks[0]!)).toBe(true);
		expect(isWorkerEligibleForTask(data, worker, data.tasks[2]!)).toBe(false);
	});

	it('describes worker fit and sorts assignment suggestions by eligibility and load', () => {
		const { data, worker } = buildFixture();
		data.tasks[0] = {
			...data.tasks[0]!,
			requiredCapabilityNames: ['research', 'citations'],
			requiredToolNames: ['codex']
		};
		data.workers.push({
			...worker,
			id: 'worker_two',
			name: 'Worker Two',
			status: 'busy',
			roleId: 'role_coordinator',
			skills: ['research']
		});
		data.workers.push({
			...worker,
			id: 'worker_three',
			name: 'Worker Three',
			status: 'idle',
			skills: ['research'],
			providerId: 'provider_other'
		});
		data.providers.push({
			...data.providers[0]!,
			id: 'provider_other',
			name: 'Other Provider',
			launcher: 'playwright',
			capabilities: []
		});

		const fit = describeWorkerTaskFit(data, data.workers[2]!, data.tasks[0]!);
		const suggestions = getWorkerAssignmentSuggestions(data, data.tasks[0]!);

		expect(fit.eligible).toBe(false);
		expect(fit.missingCapabilityNames).toEqual(['citations']);
		expect(fit.missingToolNames).toEqual(['codex']);
		expect(suggestions.slice(0, 2).map((candidate) => candidate.workerId)).toEqual([
			'worker_one',
			'worker_two'
		]);
		expect(suggestions[2]).toEqual(
			expect.objectContaining({
				workerId: 'worker_three',
				eligible: false,
				missingCapabilityNames: ['citations'],
				missingToolNames: ['codex']
			})
		);
	});

	it('does not expose ready tasks with unmet dependencies', () => {
		const { data, worker } = buildFixture();
		data.tasks.push({
			id: 'task_waiting_on_dependency',
			title: 'Waiting',
			summary: 'blocked by another task',
			projectId: 'project_growth',
			lane: 'growth',
			goalId: 'goal_1',
			priority: 'high',
			status: 'ready',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiresReview: true,
			desiredRoleId: 'role_researcher',
			assigneeWorkerId: null,
			threadSessionId: null,
			blockedReason: '',
			dependencyTaskIds: ['task_running_assigned'],
			runCount: 0,
			latestRunId: null,
			artifactPath: '/tmp/four',
			attachments: [],
			createdAt: '2026-03-26T00:00:00.000Z',
			updatedAt: '2026-03-26T00:00:00.000Z'
		});

		const view = getWorkerTaskView(data, worker);

		expect(view.available.map((task) => task.id)).not.toContain('task_waiting_on_dependency');
	});

	it('does not expose ready tasks waiting on before-run approval', () => {
		const { data, worker } = buildFixture();
		const readyTask = data.tasks.find((task) => task.id === 'task_ready_match');

		if (!readyTask) {
			throw new Error('Expected ready task fixture.');
		}

		readyTask.approvalMode = 'before_run';
		data.approvals.push({
			id: 'approval_before_run',
			taskId: readyTask.id,
			runId: null,
			mode: 'before_run',
			status: 'pending',
			createdAt: '2026-03-26T00:00:00.000Z',
			updatedAt: '2026-03-26T00:00:00.000Z',
			resolvedAt: null,
			requestedByWorkerId: null,
			approverWorkerId: null,
			summary: 'Waiting on before-run approval.'
		});

		const view = getWorkerTaskView(data, worker);

		expect(view.available.map((task) => task.id)).not.toContain('task_ready_match');
	});
});
