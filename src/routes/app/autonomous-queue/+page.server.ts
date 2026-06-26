import type { PageServerLoad } from './$types';
import { buildAutonomousQueue } from '$lib/server/autonomous-queue';
import { loadControlPlane } from '$lib/server/control-plane';

export const load: PageServerLoad = async () => {
	const data = await loadControlPlane();
	const queue = buildAutonomousQueue(data);

	return {
		...queue
	};
};
