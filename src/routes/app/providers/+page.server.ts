import type { PageServerLoad } from './$types';
import { loadControlPlane } from '$lib/server/control-plane';

export const load: PageServerLoad = async () => {
	const data = await loadControlPlane();
	const workerCounts = new Map<string, number>();

	for (const worker of data.workers) {
		workerCounts.set(worker.providerId, (workerCounts.get(worker.providerId) ?? 0) + 1);
	}

	return {
		providers: [...data.providers]
			.map((provider) => ({
				...provider,
				workerCount: workerCounts.get(provider.id) ?? 0
			}))
			.sort((a, b) => a.name.localeCompare(b.name))
	};
};
