import type { Actions, PageServerLoad } from './$types';
import { loadAccessDashboardData } from '$lib/server/access-dashboard';
import { loadAccessProbeState, runAndStoreAccessProbe } from '$lib/server/access-probe-store';

export const load: PageServerLoad = async () => {
	const dashboard = await loadAccessDashboardData();

	return {
		...dashboard,
		probeState: await loadAccessProbeState()
	};
};

export const actions: Actions = {
	runProbe: async () => {
		const dashboard = await loadAccessDashboardData();
		const probeState = await runAndStoreAccessProbe(dashboard);

		return {
			ok: true,
			successAction: 'runProbe',
			probeState
		};
	}
};
