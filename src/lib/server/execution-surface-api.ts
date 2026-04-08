import { createHash, randomBytes } from 'node:crypto';
import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import { normalizeExecutionRequirementName } from '$lib/execution-requirements';
import {
	createRun,
	getExecutionSurfaces,
	getPendingApprovalForTask,
	syncTaskExecutionState,
	syncGovernanceQueues,
	taskHasUnmetDependencies
} from '$lib/server/control-plane';
import type {
	ControlPlaneData,
	RunStatus,
	Task,
	TaskStatus,
	ExecutionSurface,
	ExecutionSurfaceStatus
} from '$lib/types/control-plane';

export type PublicExecutionSurface = Omit<ExecutionSurface, 'authTokenHash'>;
export type ExecutionSurfaceTaskFit = {
	executionSurfaceId: string;
	executionSurfaceName: string;
	roleId: string;
	providerId: string;
	status: ExecutionSurfaceStatus;
	eligible: boolean;
	exactRoleMatch: boolean;
	assignedOpenTaskCount: number;
	activeRunCount: number;
	availableRunCapacity: number;
	withinConcurrencyLimit: boolean;
	missingCapabilityNames: string[];
	missingToolNames: string[];
};

export function createExecutionSurfaceAuthToken() {
	return randomBytes(24).toString('hex');
}

export function hashExecutionSurfaceToken(token: string) {
	return createHash('sha256').update(token).digest('hex');
}

export function toPublicExecutionSurface(
	executionSurface: ExecutionSurface
): PublicExecutionSurface {
	const { authTokenHash, ...publicExecutionSurface } = executionSurface;
	void authTokenHash;
	return publicExecutionSurface;
}

export function getExecutionSurfaceBootstrapToken() {
	const fromEnv = process.env.EXECUTION_SURFACE_BOOTSTRAP_TOKEN?.trim();

	if (fromEnv) return fromEnv;
	if (dev) return 'local-dev-bootstrap-token';

	return null;
}

export function assertBootstrapToken(token: string | null | undefined) {
	const expectedToken = getExecutionSurfaceBootstrapToken();

	if (!expectedToken) {
		throw error(
			503,
			'Execution surface bootstrap token is not configured. Set EXECUTION_SURFACE_BOOTSTRAP_TOKEN before registering remote execution surfaces.'
		);
	}

	if (!token || token !== expectedToken) {
		throw error(401, 'Invalid bootstrap token.');
	}
}

export function authenticateExecutionSurface(
	data: ControlPlaneData,
	executionSurfaceId: string,
	executionSurfaceToken: string
) {
	const executionSurface = getExecutionSurfaces(data).find(
		(candidate) => candidate.id === executionSurfaceId
	);

	if (!executionSurface) {
		throw error(404, 'Execution surface not found.');
	}

	if (
		!executionSurfaceToken ||
		executionSurface.authTokenHash !== hashExecutionSurfaceToken(executionSurfaceToken)
	) {
		throw error(401, 'Invalid execution surface token.');
	}

	return executionSurface;
}

function getExecutionSurfaceCapabilityKeys(
	data: ControlPlaneData,
	executionSurface: ExecutionSurface
) {
	const provider =
		data.providers.find((candidate) => candidate.id === executionSurface.providerId) ?? null;

	return new Set(
		[...(executionSurface.skills ?? []), ...(provider?.capabilities ?? [])]
			.map(normalizeExecutionRequirementName)
			.filter(Boolean)
	);
}

function getExecutionSurfaceToolKeys(data: ControlPlaneData, executionSurface: ExecutionSurface) {
	const provider =
		data.providers.find((candidate) => candidate.id === executionSurface.providerId) ?? null;

	return new Set([provider?.launcher ?? ''].map(normalizeExecutionRequirementName).filter(Boolean));
}

function getExecutionSurfaceSupportedRoleIds(executionSurface: ExecutionSurface) {
	return Array.from(new Set([...(executionSurface.supportedRoleIds ?? [])].filter(Boolean)));
}

function getExecutionSurfaceAssignedOpenTaskCount(
	data: ControlPlaneData,
	executionSurface: ExecutionSurface
) {
	return data.tasks.filter(
		(task) => task.assigneeExecutionSurfaceId === executionSurface.id && task.status !== 'done'
	).length;
}

function getExecutionSurfaceEffectiveConcurrencyLimit(executionSurface: ExecutionSurface) {
	const configuredLimit =
		typeof executionSurface.maxConcurrentRuns === 'number' &&
		Number.isFinite(executionSurface.maxConcurrentRuns)
			? executionSurface.maxConcurrentRuns
			: null;

	return Math.max(1, configuredLimit ?? executionSurface.capacity);
}

function getExecutionSurfaceActiveRunCount(
	data: ControlPlaneData,
	executionSurface: ExecutionSurface
) {
	return data.runs.filter(
		(run) =>
			run.executionSurfaceId === executionSurface.id &&
			(run.status === 'queued' || run.status === 'starting' || run.status === 'running')
	).length;
}

function getExecutionSurfaceStatusRank(status: ExecutionSurfaceStatus) {
	switch (status) {
		case 'idle':
			return 0;
		case 'busy':
			return 1;
		case 'offline':
		default:
			return 2;
	}
}

export function describeExecutionSurfaceTaskFit(
	data: ControlPlaneData,
	executionSurface: ExecutionSurface,
	task: Task
): ExecutionSurfaceTaskFit {
	const supportedRoleIds = getExecutionSurfaceSupportedRoleIds(executionSurface);
	const hasDesiredRole = Boolean(task.desiredRoleId?.trim());
	const roleEligible =
		!hasDesiredRole ||
		supportedRoleIds.includes('role_coordinator') ||
		supportedRoleIds.includes(task.desiredRoleId);
	const capabilityKeys = getExecutionSurfaceCapabilityKeys(data, executionSurface);
	const toolKeys = getExecutionSurfaceToolKeys(data, executionSurface);
	const activeRunCount = getExecutionSurfaceActiveRunCount(data, executionSurface);
	const concurrencyLimit = getExecutionSurfaceEffectiveConcurrencyLimit(executionSurface);
	const withinConcurrencyLimit = activeRunCount < concurrencyLimit;
	const missingCapabilityNames = (task.requiredCapabilityNames ?? []).filter(
		(name) => !capabilityKeys.has(normalizeExecutionRequirementName(name))
	);
	const missingToolNames = (task.requiredToolNames ?? []).filter(
		(name) => !toolKeys.has(normalizeExecutionRequirementName(name))
	);

	return {
		executionSurfaceId: executionSurface.id,
		executionSurfaceName: executionSurface.name,
		roleId: supportedRoleIds[0] ?? '',
		providerId: executionSurface.providerId,
		status: executionSurface.status,
		eligible:
			roleEligible &&
			withinConcurrencyLimit &&
			missingCapabilityNames.length === 0 &&
			missingToolNames.length === 0,
		exactRoleMatch: hasDesiredRole && supportedRoleIds.includes(task.desiredRoleId),
		assignedOpenTaskCount: getExecutionSurfaceAssignedOpenTaskCount(data, executionSurface),
		activeRunCount,
		availableRunCapacity: Math.max(0, concurrencyLimit - activeRunCount),
		withinConcurrencyLimit,
		missingCapabilityNames,
		missingToolNames
	};
}

export function isExecutionSurfaceEligibleForTask(
	data: ControlPlaneData,
	executionSurface: ExecutionSurface,
	task: Task
) {
	return describeExecutionSurfaceTaskFit(data, executionSurface, task).eligible;
}

export function getExecutionSurfaceAssignmentSuggestions(data: ControlPlaneData, task: Task) {
	return getExecutionSurfaces(data)
		.map((executionSurface) => describeExecutionSurfaceTaskFit(data, executionSurface, task))
		.sort((left, right) => {
			if (left.eligible !== right.eligible) {
				return left.eligible ? -1 : 1;
			}

			if (left.exactRoleMatch !== right.exactRoleMatch) {
				return left.exactRoleMatch ? -1 : 1;
			}

			if (
				getExecutionSurfaceStatusRank(left.status) !== getExecutionSurfaceStatusRank(right.status)
			) {
				return (
					getExecutionSurfaceStatusRank(left.status) - getExecutionSurfaceStatusRank(right.status)
				);
			}

			if (left.assignedOpenTaskCount !== right.assignedOpenTaskCount) {
				return left.assignedOpenTaskCount - right.assignedOpenTaskCount;
			}

			const leftMissingCount = left.missingCapabilityNames.length + left.missingToolNames.length;
			const rightMissingCount = right.missingCapabilityNames.length + right.missingToolNames.length;

			if (leftMissingCount !== rightMissingCount) {
				return leftMissingCount - rightMissingCount;
			}

			return left.executionSurfaceName.localeCompare(right.executionSurfaceName);
		});
}

export function getExecutionSurfaceTaskView(
	data: ControlPlaneData,
	executionSurface: ExecutionSurface
) {
	const assigned = data.tasks.filter(
		(task) => task.assigneeExecutionSurfaceId === executionSurface.id && task.status !== 'done'
	);

	const available = data.tasks.filter(
		(task) =>
			task.assigneeExecutionSurfaceId === null &&
			task.status === 'ready' &&
			isExecutionSurfaceEligibleForTask(data, executionSurface, task) &&
			getPendingApprovalForTask(data, task.id)?.mode !== 'before_run' &&
			!taskHasUnmetDependencies(data, task)
	);

	return {
		assigned,
		available
	};
}

export function getExecutionSurfaceQueueSummary(
	data: ControlPlaneData,
	executionSurface: ExecutionSurface
) {
	const tasks = getExecutionSurfaceTaskView(data, executionSurface);

	return {
		assignedCount: tasks.assigned.length,
		availableCount: tasks.available.length,
		runningAssignedCount: tasks.assigned.filter((task) => task.status === 'in_progress').length
	};
}

export function updateExecutionSurfaceHeartbeat(
	data: ControlPlaneData,
	executionSurfaceId: string,
	input: {
		status?: ExecutionSurfaceStatus;
		capacity?: number;
		note?: string;
		tags?: string[];
	}
) {
	return {
		...data,
		executionSurfaces: getExecutionSurfaces(data).map((executionSurface) =>
			executionSurface.id === executionSurfaceId
				? {
						...executionSurface,
						status: input.status ?? executionSurface.status,
						capacity:
							typeof input.capacity === 'number' &&
							Number.isFinite(input.capacity) &&
							input.capacity > 0
								? input.capacity
								: executionSurface.capacity,
						note: input.note ?? executionSurface.note,
						tags: input.tags ?? executionSurface.tags,
						lastSeenAt: new Date().toISOString()
					}
				: executionSurface
		)
	};
}

export function claimTaskForExecutionSurface(
	data: ControlPlaneData,
	executionSurface: ExecutionSurface,
	taskId: string
) {
	const task = data.tasks.find((candidate) => candidate.id === taskId);

	if (!task) {
		throw error(404, 'Task not found.');
	}

	if (task.assigneeExecutionSurfaceId && task.assigneeExecutionSurfaceId !== executionSurface.id) {
		throw error(409, 'Task is already assigned to another execution surface.');
	}

	if (
		task.status !== 'ready' &&
		!(task.assigneeExecutionSurfaceId === executionSurface.id && task.status === 'in_progress')
	) {
		throw error(409, 'Only ready tasks can be claimed.');
	}

	if (taskHasUnmetDependencies(data, task)) {
		throw error(409, 'Task dependencies are not complete.');
	}

	if (getPendingApprovalForTask(data, task.id)?.mode === 'before_run') {
		throw error(409, 'Task is waiting on before-run approval.');
	}

	const fit = describeExecutionSurfaceTaskFit(data, executionSurface, task);

	if (!fit.withinConcurrencyLimit) {
		throw error(409, 'ExecutionSurface is already at its concurrency limit.');
	}

	if (!fit.eligible) {
		throw error(403, 'ExecutionSurface is not eligible for this task.');
	}

	if (task.assigneeExecutionSurfaceId === executionSurface.id && task.status === 'in_progress') {
		return data;
	}

	const run = createRun({
		taskId,
		executionSurfaceId: executionSurface.id,
		assumedRoleId: task.desiredRoleId,
		providerId: executionSurface.providerId,
		status: 'running',
		startedAt: new Date().toISOString(),
		summary: 'Task claimed by execution surface.',
		lastHeartbeatAt: new Date().toISOString()
	});

	return syncGovernanceQueues(
		syncTaskExecutionState({
			...data,
			runs: [run, ...data.runs],
			tasks: data.tasks.map((candidate) =>
				candidate.id === taskId
					? {
							...candidate,
							assigneeExecutionSurfaceId: executionSurface.id,
							status: 'in_progress' as const,
							updatedAt: new Date().toISOString()
						}
					: candidate
			)
		})
	);
}

function taskStatusToRunStatus(status: TaskStatus): RunStatus {
	switch (status) {
		case 'in_draft':
		case 'ready':
			return 'completed';
		case 'blocked':
			return 'blocked';
		case 'done':
		case 'review':
			return 'completed';
		case 'in_progress':
			return 'running';
		default:
			return 'running';
	}
}

export function updateTaskFromExecutionSurface(
	data: ControlPlaneData,
	executionSurface: ExecutionSurface,
	input: {
		taskId: string;
		status: TaskStatus;
	}
) {
	const task = data.tasks.find((candidate) => candidate.id === input.taskId);

	if (!task) {
		throw error(404, 'Task not found.');
	}

	if (task.assigneeExecutionSurfaceId !== executionSurface.id) {
		throw error(403, 'Task is not assigned to this execution surface.');
	}

	return syncGovernanceQueues(
		syncTaskExecutionState({
			...data,
			runs: data.runs.map((candidate) =>
				candidate.id === task.latestRunId && candidate.executionSurfaceId === executionSurface.id
					? {
							...candidate,
							status: taskStatusToRunStatus(input.status),
							updatedAt: new Date().toISOString(),
							lastHeartbeatAt: new Date().toISOString(),
							endedAt:
								input.status === 'in_progress'
									? null
									: (candidate.endedAt ?? new Date().toISOString()),
							summary: `ExecutionSurface updated task to ${input.status}.`
						}
					: candidate
			),
			tasks: data.tasks.map((candidate) =>
				candidate.id === input.taskId
					? {
							...candidate,
							status: input.status,
							updatedAt: new Date().toISOString()
						}
					: candidate
			)
		})
	);
}
