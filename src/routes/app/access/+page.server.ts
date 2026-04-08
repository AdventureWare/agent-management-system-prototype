import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadAccessDashboardData } from '$lib/server/access-dashboard';
import { loadAccessProbeState, runAndStoreAccessProbe } from '$lib/server/access-probe-store';
import { createProjectCodexSkill } from '$lib/server/codex-skills';
import {
	loadControlPlane,
	parseProviderSetupStatus,
	parseExecutionSurfaceStatus,
	updateControlPlane
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
		workerStatusOptions: EXECUTION_SURFACE_STATUS_OPTIONS
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
		const executionSurfaceId = form.get('executionSurfaceId')?.toString().trim() ?? '';
		const status = parseExecutionSurfaceStatus(form.get('status')?.toString() ?? '', 'idle');

		if (!executionSurfaceId) {
			return fail(400, { message: 'ExecutionSurface ID is required.' });
		}

		let workerUpdated = false;

		await updateControlPlane((data) => ({
			...data,
			executionSurfaces: data.executionSurfaces.map((worker) => {
				if (worker.id !== executionSurfaceId) {
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
			return fail(404, { message: 'ExecutionSurface not found.' });
		}

		return {
			ok: true,
			successAction: 'updateWorkerAvailability',
			executionSurfaceId
		};
	},

	createProjectSkill: async ({ request }) => {
		const form = await request.formData();
		const projectId = form.get('projectId')?.toString().trim() ?? '';
		const skillId = form.get('skillId')?.toString().trim() ?? '';
		const description = form.get('description')?.toString().trim() ?? '';

		if (!projectId) {
			return fail(400, { message: 'Project is required.' });
		}

		if (!skillId) {
			return fail(400, { message: 'Skill ID is required.' });
		}

		if (!description) {
			return fail(400, { message: 'Skill description is required.' });
		}

		const data = await loadControlPlane();
		const project = data.projects.find((candidate) => candidate.id === projectId) ?? null;

		if (!project) {
			return fail(404, { message: 'Project not found.' });
		}

		if (!project.projectRootFolder) {
			return fail(400, {
				message: 'This project needs a root folder before a project-local skill can be created.'
			});
		}

		try {
			const createdSkill = createProjectCodexSkill({
				projectRootFolder: project.projectRootFolder,
				skillId,
				description
			});

			return {
				ok: true,
				successAction: 'createProjectSkill',
				projectId,
				createdSkillId: createdSkill.skillId
			};
		} catch (error) {
			return fail(400, {
				message: error instanceof Error ? error.message : 'Could not create the project skill.',
				projectId,
				skillId,
				description
			});
		}
	}
};
