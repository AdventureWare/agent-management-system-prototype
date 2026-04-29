import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadAccessDashboardData } from '$lib/server/access-dashboard';
import { loadAccessProbeState, runAndStoreAccessProbe } from '$lib/server/access-probe-store';
import {
	loadControlPlane,
	parseProviderSetupStatus,
	parseExecutionSurfaceStatus,
	updateControlPlaneCollections
} from '$lib/server/control-plane';
import {
	PROVIDER_SETUP_STATUS_OPTIONS,
	EXECUTION_SURFACE_STATUS_OPTIONS
} from '$lib/types/control-plane';

export const load: PageServerLoad = async () => {
	const dashboard = await loadAccessDashboardData();

	return {
		...dashboard,
		probeState: await loadAccessProbeState(),
		providerSetupStatusOptions: PROVIDER_SETUP_STATUS_OPTIONS,
		executionSurfaceStatusOptions: EXECUTION_SURFACE_STATUS_OPTIONS
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

		await updateControlPlaneCollections((data) => ({
			data: {
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
			},
			changedCollections: ['providers']
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

	updateExecutionSurfaceAvailability: async ({ request }) => {
		const form = await request.formData();
		const executionSurfaceId = form.get('executionSurfaceId')?.toString().trim() ?? '';
		const status = parseExecutionSurfaceStatus(form.get('status')?.toString() ?? '', 'idle');

		if (!executionSurfaceId) {
			return fail(400, { message: 'Execution surface ID is required.' });
		}

		let executionSurfaceUpdated = false;

		await updateControlPlaneCollections((data) => ({
			data: {
				...data,
				executionSurfaces: data.executionSurfaces.map((executionSurface) => {
					if (executionSurface.id !== executionSurfaceId) {
						return executionSurface;
					}

					executionSurfaceUpdated = true;

					return {
						...executionSurface,
						status
					};
				})
			},
			changedCollections: ['executionSurfaces']
		}));

		if (!executionSurfaceUpdated) {
			return fail(404, { message: 'Execution surface not found.' });
		}

		return {
			ok: true,
			successAction: 'updateExecutionSurfaceAvailability',
			executionSurfaceId
		};
	}
};
