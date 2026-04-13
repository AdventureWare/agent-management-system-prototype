import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AGENT_SANDBOX_OPTIONS } from '$lib/types/agent-thread';
import {
	PROVIDER_AUTH_MODE_OPTIONS,
	PROVIDER_KIND_OPTIONS,
	PROVIDER_SETUP_STATUS_OPTIONS
} from '$lib/types/control-plane';
import {
	formatRelativeTime,
	loadControlPlane,
	parseProviderAuthMode,
	parseProviderKind,
	parseProviderSetupStatus,
	updateControlPlaneCollections
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

function parseModelPricingField(value: FormDataEntryValue | null) {
	const raw = value?.toString().trim() ?? '';

	if (!raw) {
		return [];
	}

	let parsed: unknown;

	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error('Model pricing must be valid JSON.');
	}

	if (!Array.isArray(parsed)) {
		throw new Error('Model pricing must be a JSON array.');
	}

	return parsed.flatMap((candidate) => {
		if (!candidate || typeof candidate !== 'object') {
			return [];
		}

		const row = candidate as Record<string, unknown>;
		const model = row.model?.toString().trim() ?? '';
		const pricingVersion = row.pricingVersion?.toString().trim() ?? '';
		const updatedAt = row.updatedAt?.toString().trim() ?? '';
		const inputUsdPer1M = Number(row.inputUsdPer1M);
		const cachedInputUsdPer1M = Number(row.cachedInputUsdPer1M);
		const outputUsdPer1M = Number(row.outputUsdPer1M);

		if (
			!model ||
			!pricingVersion ||
			!updatedAt ||
			!Number.isFinite(inputUsdPer1M) ||
			!Number.isFinite(cachedInputUsdPer1M) ||
			!Number.isFinite(outputUsdPer1M) ||
			inputUsdPer1M < 0 ||
			cachedInputUsdPer1M < 0 ||
			outputUsdPer1M < 0
		) {
			throw new Error(
				'Each model pricing row needs model, inputUsdPer1M, cachedInputUsdPer1M, outputUsdPer1M, pricingVersion, and updatedAt.'
			);
		}

		return [
			{
				model,
				inputUsdPer1M,
				cachedInputUsdPer1M,
				outputUsdPer1M,
				pricingVersion,
				updatedAt
			}
		];
	});
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
		modelPricing: parseModelPricingField(form.get('modelPricing')),
		defaultThreadSandbox: parseAgentSandbox(
			form.get('defaultThreadSandbox')?.toString(),
			'workspace-write'
		),
		notes: form.get('notes')?.toString().trim() ?? ''
	};
}

export const load: PageServerLoad = async ({ params }) => {
	const data = await loadControlPlane();
	const provider = data.providers.find((candidate) => candidate.id === params.providerId);

	if (!provider) {
		throw error(404, 'Provider not found.');
	}

	const roleMap = new Map(data.roles.map((role) => [role.id, role]));
	const taskMap = new Map(data.tasks.map((task) => [task.id, task]));
	const attachedExecutionSurfaces = data.executionSurfaces
		.filter((executionSurface) => executionSurface.providerId === provider.id)
		.map((executionSurface) => {
			const supportedRoleIds = Array.from(new Set([...(executionSurface.supportedRoleIds ?? [])]));
			const supportedRoleNames = supportedRoleIds.map(
				(roleId) => roleMap.get(roleId)?.name ?? 'Unknown role'
			);

			return {
				...executionSurface,
				roleName: supportedRoleNames[0] ?? 'Unknown role',
				supportedRoleIds,
				supportedRoleNames
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name));
	const recentRuns = data.runs
		.filter((run) => run.providerId === provider.id)
		.map((run) => ({
			...run,
			taskTitle: taskMap.get(run.taskId)?.title ?? 'Unknown task',
			updatedAtLabel: formatRelativeTime(run.updatedAt)
		}))
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
		.slice(0, 8);

	return {
		provider,
		attachedExecutionSurfaces,
		recentRuns,
		sandboxOptions: AGENT_SANDBOX_OPTIONS,
		kindOptions: PROVIDER_KIND_OPTIONS,
		setupStatusOptions: PROVIDER_SETUP_STATUS_OPTIONS,
		authModeOptions: PROVIDER_AUTH_MODE_OPTIONS
	};
};

export const actions: Actions = {
	updateProvider: async ({ params, request }) => {
		let providerUpdates;

		try {
			providerUpdates = readProviderForm(await request.formData());
		} catch (error) {
			return fail(400, {
				message:
					error instanceof Error ? error.message : 'Provider pricing could not be parsed.'
			});
		}

		if (!providerUpdates.name || !providerUpdates.service) {
			return fail(400, { message: 'Provider name and service are required.' });
		}

		let providerUpdated = false;

		await updateControlPlaneCollections((data) => ({
			data: {
				...data,
				providers: data.providers.map((provider) => {
					if (provider.id !== params.providerId) {
						return provider;
					}

					providerUpdated = true;
					return {
						...provider,
						...providerUpdates
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
			successAction: 'updateProvider',
			providerId: params.providerId
		};
	}
};
