import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { WORKER_LOCATION_OPTIONS, WORKER_STATUS_OPTIONS } from '$lib/types/control-plane';
import {
	createWorker,
	getExecutionSurfaces,
	loadControlPlane,
	parseWorkerLocation,
	parseWorkerStatus,
	updateControlPlane
} from '$lib/server/control-plane';

const ACTIVE_RUN_STATUSES = new Set(['queued', 'starting', 'running']);

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

export const load: PageServerLoad = async () => {
	const data = await loadControlPlane();
	const executionSurfaces = getExecutionSurfaces(data);
	const providerMap = new Map(data.providers.map((provider) => [provider.id, provider]));
	const roleMap = new Map(data.roles.map((role) => [role.id, role]));
	const assignedTaskCounts = new Map<string, number>();
	const latestRunByWorker = new Map<string, string>();
	const activeRunCounts = new Map<string, number>();

	for (const task of data.tasks) {
		if (!task.assigneeWorkerId) {
			continue;
		}

		assignedTaskCounts.set(
			task.assigneeWorkerId,
			(assignedTaskCounts.get(task.assigneeWorkerId) ?? 0) + 1
		);
	}

	for (const run of [...data.runs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
		if (!run.workerId || latestRunByWorker.has(run.workerId)) {
			// Keep counting active runs below even if this worker already has a latest timestamp.
		} else {
			latestRunByWorker.set(run.workerId, run.updatedAt);
		}

		if (run.workerId && ACTIVE_RUN_STATUSES.has(run.status)) {
			activeRunCounts.set(run.workerId, (activeRunCounts.get(run.workerId) ?? 0) + 1);
		}
	}

	const executionSurfacesView = [...executionSurfaces]
		.map((worker) => {
			const provider = providerMap.get(worker.providerId) ?? null;
			const workerSkills = worker.skills ?? [];
			const providerCapabilities = provider?.capabilities ?? [];
			const supportedRoleIds = getSupportedRoleIds(worker);
			const supportedRoleNames = supportedRoleIds.map(
				(roleId) => roleMap.get(roleId)?.name ?? 'Unknown role'
			);

			return {
				...worker,
				providerName: provider?.name ?? 'Unknown provider',
				roleName: supportedRoleNames[0] ?? 'Unknown role',
				supportedRoleIds,
				supportedRoleNames,
				assignedTaskCount: assignedTaskCounts.get(worker.id) ?? 0,
				activeRunCount: activeRunCounts.get(worker.id) ?? 0,
				latestRunAt: latestRunByWorker.get(worker.id) ?? null,
				providerCapabilities,
				effectiveCapabilities: [...new Set([...workerSkills, ...providerCapabilities])],
				effectiveConcurrencyLimit:
					typeof worker.maxConcurrentRuns === 'number' && Number.isFinite(worker.maxConcurrentRuns)
						? Math.max(1, worker.maxConcurrentRuns)
						: worker.capacity
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name));

	return {
		executionSurfaces: executionSurfacesView,
		workers: executionSurfacesView,
		providers: [...data.providers].sort((a, b) => a.name.localeCompare(b.name)),
		roles: [...data.roles].sort((a, b) => a.name.localeCompare(b.name)),
		statusOptions: WORKER_STATUS_OPTIONS,
		locationOptions: WORKER_LOCATION_OPTIONS
	};
};

export const actions: Actions = {
	createWorker: async ({ request }) => {
		const form = await request.formData();
		const name = form.get('name')?.toString().trim() ?? '';
		const providerId = form.get('providerId')?.toString().trim() ?? '';
		const supportedRoleIds = parseSelectedIds(form, 'supportedRoleIds');
		const legacyRoleId = form.get('roleId')?.toString().trim() ?? '';
		const note = form.get('note')?.toString().trim() ?? '';
		const tags = parseListField(form.get('tags'));
		const skills = parseListField(form.get('skills'));
		const capacity = Number.parseInt(form.get('capacity')?.toString() ?? '1', 10);
		const maxConcurrentRuns = parsePositiveInteger(form.get('maxConcurrentRuns'));
		const location = parseWorkerLocation(form.get('location')?.toString() ?? '', 'cloud');
		const status = parseWorkerStatus(form.get('status')?.toString() ?? '', 'idle');

		const nextSupportedRoleIds =
			supportedRoleIds.length > 0 ? supportedRoleIds : legacyRoleId ? [legacyRoleId] : [];

		if (!name || !providerId || nextSupportedRoleIds.length === 0) {
			return fail(400, {
				message: 'Name, provider, and at least one supported role are required.'
			});
		}

		await updateControlPlane((data) => ({
			...data,
			workers: [
				createWorker({
					name,
					providerId,
					roleId: nextSupportedRoleIds[0] ?? '',
					supportedRoleIds: nextSupportedRoleIds,
					location,
					status,
					note,
					capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 1,
					tags,
					skills,
					maxConcurrentRuns
				}),
				...data.workers
			]
		}));

		return { ok: true, successAction: 'createWorker' };
	},

	updateWorker: async ({ request }) => {
		const form = await request.formData();
		const workerId = form.get('workerId')?.toString().trim() ?? '';
		const status = parseWorkerStatus(form.get('status')?.toString() ?? '', 'idle');

		if (!workerId) {
			return fail(400, { message: 'Execution surface ID is required.' });
		}

		await updateControlPlane((data) => ({
			...data,
			workers: data.workers.map((worker) =>
				worker.id === workerId
					? { ...worker, status, lastSeenAt: new Date().toISOString() }
					: worker
			)
		}));

		return { ok: true };
	}
};
