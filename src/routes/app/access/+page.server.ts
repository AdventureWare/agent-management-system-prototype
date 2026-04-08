import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadAccessDashboardData } from '$lib/server/access-dashboard';
import { loadAccessProbeState, runAndStoreAccessProbe } from '$lib/server/access-probe-store';
import {
	parseProviderSetupStatus,
	parseWorkerStatus,
	updateControlPlane
} from '$lib/server/control-plane';
import { PROVIDER_SETUP_STATUS_OPTIONS, WORKER_STATUS_OPTIONS } from '$lib/types/control-plane';

export const load: PageServerLoad = async () => {
	const dashboard = await loadAccessDashboardData();

	return {
		...dashboard,
		probeState: await loadAccessProbeState(),
		providerSetupStatusOptions: PROVIDER_SETUP_STATUS_OPTIONS,
		workerStatusOptions: WORKER_STATUS_OPTIONS
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
	},

	updateProviderAvailability: async ({ request }) => {
		const form = await request.formData();
		const providerId = form.get('providerId')?.toString().trim() ?? '';
		const enabled = form.get('enabled')?.toString() === 'on';
		const setupStatus = parseProviderSetupStatus(
			form.get('setupStatus')?.toString() ?? '',
			'planned'
		);

		if (!providerId) {
			return fail(400, { message: 'Provider ID is required.' });
		}

		let providerUpdated = false;

		await updateControlPlane((data) => ({
			...data,
			providers: data.providers.map((provider) => {
				if (provider.id !== providerId) {
					return provider;
				}

				providerUpdated = true;

				return {
					...provider,
					enabled,
					setupStatus
				};
			})
		}));

		if (!providerUpdated) {
			return fail(404, { message: 'Provider not found.' });
		}

		return {
			ok: true,
			successAction: 'updateProviderAvailability',
			providerId
		};
	},

	updateWorkerAvailability: async ({ request }) => {
		const form = await request.formData();
		const workerId = form.get('workerId')?.toString().trim() ?? '';
		const status = parseWorkerStatus(form.get('status')?.toString() ?? '', 'idle');

		if (!workerId) {
			return fail(400, { message: 'Worker ID is required.' });
		}

		let workerUpdated = false;

		await updateControlPlane((data) => ({
			...data,
			workers: data.workers.map((worker) => {
				if (worker.id !== workerId) {
					return worker;
				}

				workerUpdated = true;

				return {
					...worker,
					status
				};
			})
		}));

		if (!workerUpdated) {
			return fail(404, { message: 'Worker not found.' });
		}

		return {
			ok: true,
			successAction: 'updateWorkerAvailability',
			workerId
		};
	}
};
