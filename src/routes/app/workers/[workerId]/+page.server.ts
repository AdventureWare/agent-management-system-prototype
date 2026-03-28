import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { WORKER_LOCATION_OPTIONS, WORKER_STATUS_OPTIONS } from '$lib/types/control-plane';
import {
	formatRelativeTime,
	loadControlPlane,
	parseWorkerLocation,
	parseWorkerStatus,
	updateControlPlane
} from '$lib/server/control-plane';

function readWorkerForm(form: FormData) {
	return {
		name: form.get('name')?.toString().trim() ?? '',
		providerId: form.get('providerId')?.toString().trim() ?? '',
		roleId: form.get('roleId')?.toString().trim() ?? '',
		note: form.get('note')?.toString().trim() ?? '',
		tags:
			form
				.get('tags')
				?.toString()
				.split(',')
				.map((tag) => tag.trim())
				.filter(Boolean) ?? [],
		capacity: Number.parseInt(form.get('capacity')?.toString() ?? '1', 10),
		location: parseWorkerLocation(form.get('location')?.toString() ?? '', 'cloud'),
		status: parseWorkerStatus(form.get('status')?.toString() ?? '', 'idle')
	};
}

export const load: PageServerLoad = async ({ params }) => {
	const data = await loadControlPlane();
	const worker = data.workers.find((candidate) => candidate.id === params.workerId);

	if (!worker) {
		throw error(404, 'Worker not found.');
	}

	const providerMap = new Map(data.providers.map((provider) => [provider.id, provider]));
	const roleMap = new Map(data.roles.map((role) => [role.id, role]));
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

	return {
		worker: {
			...worker,
			providerName: providerMap.get(worker.providerId)?.name ?? 'Unknown provider',
			roleName: roleMap.get(worker.roleId)?.name ?? 'Unknown role'
		},
		providers: [...data.providers].sort((a, b) => a.name.localeCompare(b.name)),
		roles: [...data.roles].sort((a, b) => a.name.localeCompare(b.name)),
		statusOptions: WORKER_STATUS_OPTIONS,
		locationOptions: WORKER_LOCATION_OPTIONS,
		recentRuns,
		assignedTasks
	};
};

export const actions: Actions = {
	updateWorker: async ({ params, request }) => {
		const workerUpdates = readWorkerForm(await request.formData());

		if (!workerUpdates.name || !workerUpdates.providerId || !workerUpdates.roleId) {
			return fail(400, { message: 'Name, provider, and role are required.' });
		}

		let workerUpdated = false;

		await updateControlPlane((data) => ({
			...data,
			workers: data.workers.map((worker) => {
				if (worker.id !== params.workerId) {
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
			return fail(404, { message: 'Worker not found.' });
		}

		return {
			ok: true,
			successAction: 'updateWorker',
			workerId: params.workerId
		};
	}
};
