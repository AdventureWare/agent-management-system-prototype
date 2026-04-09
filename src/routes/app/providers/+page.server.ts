import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AGENT_SANDBOX_OPTIONS } from '$lib/types/agent-thread';
import {
	PROVIDER_AUTH_MODE_OPTIONS,
	PROVIDER_KIND_OPTIONS,
	PROVIDER_SETUP_STATUS_OPTIONS
} from '$lib/types/control-plane';
import {
	createProvider,
	loadControlPlane,
	parseProviderAuthMode,
	parseProviderKind,
	parseProviderSetupStatus,
	updateControlPlane
} from '$lib/server/control-plane';
import { parseAgentSandbox } from '$lib/server/agent-threads';

function parseListField(value: FormDataEntryValue | null) {
	return (
		value
			?.toString()
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean) ?? []
	);
}

function readProviderForm(form: FormData) {
	return {
		name: form.get('name')?.toString().trim() ?? '',
		service: form.get('service')?.toString().trim() ?? '',
		kind: parseProviderKind(form.get('kind')?.toString() ?? '', 'cloud'),
		description: form.get('description')?.toString().trim() ?? '',
		enabled: form.get('enabled')?.toString() === 'on',
		setupStatus: parseProviderSetupStatus(form.get('setupStatus')?.toString() ?? '', 'planned'),
		authMode: parseProviderAuthMode(form.get('authMode')?.toString() ?? '', 'custom'),
		defaultModel: form.get('defaultModel')?.toString().trim() ?? '',
		baseUrl: form.get('baseUrl')?.toString().trim() ?? '',
		launcher: form.get('launcher')?.toString().trim() ?? '',
		envVars: parseListField(form.get('envVars')),
		capabilities: parseListField(form.get('capabilities')),
		defaultThreadSandbox: parseAgentSandbox(
			form.get('defaultThreadSandbox')?.toString(),
			'workspace-write'
		),
		notes: form.get('notes')?.toString().trim() ?? ''
	};
}

export const load: PageServerLoad = async () => {
	const data = await loadControlPlane();
	const executionSurfaceCounts = new Map<string, number>();

	for (const executionSurface of data.executionSurfaces) {
		executionSurfaceCounts.set(
			executionSurface.providerId,
			(executionSurfaceCounts.get(executionSurface.providerId) ?? 0) + 1
		);
	}

	return {
		providers: [...data.providers]
			.map((provider) => ({
				...provider,
				executionSurfaceCount: executionSurfaceCounts.get(provider.id) ?? 0
			}))
			.sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name)),
		sandboxOptions: AGENT_SANDBOX_OPTIONS,
		kindOptions: PROVIDER_KIND_OPTIONS,
		setupStatusOptions: PROVIDER_SETUP_STATUS_OPTIONS,
		authModeOptions: PROVIDER_AUTH_MODE_OPTIONS
	};
};

export const actions: Actions = {
	createProvider: async ({ request }) => {
		const provider = readProviderForm(await request.formData());

		if (!provider.name || !provider.service) {
			return fail(400, { message: 'Provider name and service are required.' });
		}

		await updateControlPlane((data) => ({
			...data,
			providers: [createProvider(provider), ...data.providers]
		}));

		return { ok: true, successAction: 'createProvider' };
	},

	updateProvider: async ({ request }) => {
		const form = await request.formData();
		const providerId = form.get('providerId')?.toString().trim() ?? '';
		const providerUpdates = readProviderForm(form);

		if (!providerId) {
			return fail(400, { message: 'Provider ID is required.' });
		}

		if (!providerUpdates.name || !providerUpdates.service) {
			return fail(400, { message: 'Provider name and service are required.' });
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
					...providerUpdates
				};
			})
		}));

		if (!providerUpdated) {
			return fail(404, { message: 'Provider not found.' });
		}

		return {
			ok: true,
			successAction: 'updateProvider',
			providerId
		};
	}
};
