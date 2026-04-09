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
		const providerUpdates = readProviderForm(await request.formData());

		if (!providerUpdates.name || !providerUpdates.service) {
			return fail(400, { message: 'Provider name and service are required.' });
		}

		let providerUpdated = false;

		await updateControlPlane((data) => ({
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
