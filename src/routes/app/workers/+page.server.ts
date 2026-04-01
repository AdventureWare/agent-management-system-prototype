import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { WORKER_LOCATION_OPTIONS, WORKER_STATUS_OPTIONS } from '$lib/types/control-plane';
import {
	createWorker,
	loadControlPlane,
	parseWorkerLocation,
	parseWorkerStatus,
	updateControlPlane
} from '$lib/server/control-plane';

export const load: PageServerLoad = async () => {
	const data = await loadControlPlane();
	const providerMap = new Map(data.providers.map((provider) => [provider.id, provider]));
	const roleMap = new Map(data.roles.map((role) => [role.id, role]));
	const assignedTaskCounts = new Map<string, number>();
	const latestRunByWorker = new Map<string, string>();

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
			continue;
		}

		latestRunByWorker.set(run.workerId, run.updatedAt);
	}

	return {
		workers: [...data.workers]
			.map((worker) => ({
				...worker,
				providerName: providerMap.get(worker.providerId)?.name ?? 'Unknown provider',
				roleName: roleMap.get(worker.roleId)?.name ?? 'Unknown role',
				assignedTaskCount: assignedTaskCounts.get(worker.id) ?? 0,
				latestRunAt: latestRunByWorker.get(worker.id) ?? null
			}))
			.sort((a, b) => a.name.localeCompare(b.name)),
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
		const roleId = form.get('roleId')?.toString().trim() ?? '';
		const note = form.get('note')?.toString().trim() ?? '';
		const tags =
			form
				.get('tags')
				?.toString()
				.split(',')
				.map((tag) => tag.trim())
				.filter(Boolean) ?? [];
		const capacity = Number.parseInt(form.get('capacity')?.toString() ?? '1', 10);
		const location = parseWorkerLocation(form.get('location')?.toString() ?? '', 'cloud');
		const status = parseWorkerStatus(form.get('status')?.toString() ?? '', 'idle');

		if (!name || !providerId || !roleId) {
			return fail(400, { message: 'Name, provider, and role are required.' });
		}

		await updateControlPlane((data) => ({
			...data,
			workers: [
				createWorker({
					name,
					providerId,
					roleId,
					location,
					status,
					note,
					capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 1,
					tags
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
			return fail(400, { message: 'Worker ID is required.' });
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
