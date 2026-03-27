import type { PageServerLoad } from './$types';
import { loadControlPlane, summarizeControlPlane } from '$lib/server/control-plane';

export const load: PageServerLoad = async () => {
	const data = await loadControlPlane();

	return {
		summary: summarizeControlPlane(data),
		goals: data.goals.slice(0, 3),
		tasks: data.tasks.slice(0, 5)
	};
};
