import type { PageServerLoad } from './$types';
import { loadControlPlane } from '$lib/server/control-plane';

export const load: PageServerLoad = async () => {
	const data = await loadControlPlane();
	const taskCounts = new Map<string, number>();
	const workerCounts = new Map<string, number>();

	for (const task of data.tasks) {
		taskCounts.set(task.desiredRoleId, (taskCounts.get(task.desiredRoleId) ?? 0) + 1);
	}

	for (const worker of data.workers) {
		const supportedRoleIds = worker.supportedRoleIds?.length
			? worker.supportedRoleIds
			: worker.roleId
				? [worker.roleId]
				: [];

		for (const roleId of supportedRoleIds) {
			workerCounts.set(roleId, (workerCounts.get(roleId) ?? 0) + 1);
		}
	}

	return {
		roles: [...data.roles]
			.map((role) => ({
				...role,
				taskCount: taskCounts.get(role.id) ?? 0,
				workerCount: workerCounts.get(role.id) ?? 0
			}))
			.sort((a, b) => a.name.localeCompare(b.name))
	};
};
