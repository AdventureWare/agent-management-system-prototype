import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AGENT_SANDBOX_OPTIONS } from '$lib/types/agent-thread';
import { WORKER_LOCATION_OPTIONS, WORKER_STATUS_OPTIONS } from '$lib/types/control-plane';
import {
	formatRelativeTime,
	getExecutionSurfaces,
	loadControlPlane,
	parseWorkerLocation,
	parseWorkerStatus,
	updateControlPlane
} from '$lib/server/control-plane';
import { parseAgentSandbox } from '$lib/server/agent-threads';

const ACTIVE_RUN_STATUSES = new Set(['queued', 'starting', 'running']);

function readThreadSandboxOverride(value: FormDataEntryValue | null) {
	const raw = value?.toString().trim() ?? '';
	return raw ? parseAgentSandbox(raw, 'workspace-write') : null;
}

function parseListField(value: FormDataEntryValue | null) {
	return (
		value
			?.toString()
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean) ?? []
	);
}

function parseSelectedIds(form: FormData, key: string) {
	return [
		...new Set(
			form
				.getAll(key)
				.map((value) => value.toString().trim())
				.filter(Boolean)
		)
	];
}

function parsePositiveInteger(value: FormDataEntryValue | null) {
	const parsed = Number.parseInt(value?.toString() ?? '', 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getSupportedRoleIds(worker: { roleId: string; supportedRoleIds?: string[] }) {
	return Array.from(
		new Set([...(worker.supportedRoleIds ?? []), worker.roleId.trim()].filter(Boolean))
	);
}

function readWorkerForm(form: FormData) {
	const supportedRoleIds = parseSelectedIds(form, 'supportedRoleIds');
	const legacyRoleId = form.get('roleId')?.toString().trim() ?? '';

	return {
		name: form.get('name')?.toString().trim() ?? '',
		providerId: form.get('providerId')?.toString().trim() ?? '',
		roleId: supportedRoleIds[0] ?? legacyRoleId,
		supportedRoleIds:
			supportedRoleIds.length > 0 ? supportedRoleIds : legacyRoleId ? [legacyRoleId] : [],
		note: form.get('note')?.toString().trim() ?? '',
		tags: parseListField(form.get('tags')),
		skills: parseListField(form.get('skills')),
		capacity: Number.parseInt(form.get('capacity')?.toString() ?? '1', 10),
		maxConcurrentRuns: parsePositiveInteger(form.get('maxConcurrentRuns')),
		location: parseWorkerLocation(form.get('location')?.toString() ?? '', 'cloud'),
		status: parseWorkerStatus(form.get('status')?.toString() ?? '', 'idle'),
		threadSandboxOverride: readThreadSandboxOverride(form.get('threadSandboxOverride'))
	};
}

export const load: PageServerLoad = async ({ params }) => {
	const data = await loadControlPlane();
	const executionSurfaces = getExecutionSurfaces(data);
	const worker = executionSurfaces.find((candidate) => candidate.id === params.executionSurfaceId);

	if (!worker) {
		throw error(404, 'Execution surface not found.');
	}

	const providerMap = new Map(data.providers.map((provider) => [provider.id, provider]));
	const provider = providerMap.get(worker.providerId) ?? null;
	const roleMap = new Map(data.roles.map((role) => [role.id, role]));
	const supportedRoleIds = getSupportedRoleIds(worker);
	const supportedRoleNames = supportedRoleIds.map(
		(roleId) => roleMap.get(roleId)?.name ?? 'Unknown role'
	);
	const activeRunCount = data.runs.filter(
		(run) => run.workerId === worker.id && ACTIVE_RUN_STATUSES.has(run.status)
	).length;
	const recentRuns = data.runs
		.filter((run) => run.workerId === worker.id)
		.map((run) => ({
			...run,
			taskTitle: data.tasks.find((task) => task.id === run.taskId)?.title ?? 'Unknown task',
			updatedAtLabel: formatRelativeTime(run.updatedAt)
		}))
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
		.slice(0, 8);
	const assignedTasks = data.tasks
		.filter((task) => task.assigneeWorkerId === worker.id)
		.map((task) => ({
			id: task.id,
			title: task.title,
			status: task.status,
			updatedAtLabel: formatRelativeTime(task.updatedAt)
		}))
		.sort((a, b) => a.title.localeCompare(b.title));

	const executionSurfaceDetail = {
		...worker,
		providerName: provider?.name ?? 'Unknown provider',
		providerDefaultThreadSandbox: provider?.defaultThreadSandbox ?? 'workspace-write',
		roleName: supportedRoleNames[0] ?? 'Unknown role',
		supportedRoleIds,
		supportedRoleNames,
		providerCapabilities: provider?.capabilities ?? [],
		effectiveCapabilities: [
			...new Set([...(worker.skills ?? []), ...(provider?.capabilities ?? [])])
		],
		activeRunCount,
		effectiveConcurrencyLimit:
			typeof worker.maxConcurrentRuns === 'number' && Number.isFinite(worker.maxConcurrentRuns)
				? Math.max(1, worker.maxConcurrentRuns)
				: worker.capacity
	};

	return {
		executionSurface: executionSurfaceDetail,
		worker: executionSurfaceDetail,
		providers: [...data.providers].sort((a, b) => a.name.localeCompare(b.name)),
		roles: [...data.roles].sort((a, b) => a.name.localeCompare(b.name)),
		statusOptions: WORKER_STATUS_OPTIONS,
		locationOptions: WORKER_LOCATION_OPTIONS,
		sandboxOptions: AGENT_SANDBOX_OPTIONS,
		recentRuns,
		assignedTasks
	};
};

export const actions: Actions = {
	updateWorker: async ({ params, request }) => {
		const workerUpdates = readWorkerForm(await request.formData());

		if (
			!workerUpdates.name ||
			!workerUpdates.providerId ||
			workerUpdates.supportedRoleIds.length === 0
		) {
			return fail(400, {
				message: 'Name, provider, and at least one supported role are required.'
			});
		}

		let workerUpdated = false;

		await updateControlPlane((data) => ({
			...data,
			workers: data.workers.map((worker) => {
				if (worker.id !== params.executionSurfaceId) {
					return worker;
				}

				workerUpdated = true;

				return {
					...worker,
					...workerUpdates,
					capacity:
						Number.isFinite(workerUpdates.capacity) && workerUpdates.capacity > 0
							? workerUpdates.capacity
							: 1,
					lastSeenAt: new Date().toISOString()
				};
			})
		}));

		if (!workerUpdated) {
			return fail(404, { message: 'Execution surface not found.' });
		}

		return {
			ok: true,
			successAction: 'updateWorker',
			workerId: params.executionSurfaceId
		};
	}
};
