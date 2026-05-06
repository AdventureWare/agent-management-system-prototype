import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AGENT_SANDBOX_OPTIONS } from '$lib/types/agent-thread';
import {
	EXECUTION_SURFACE_LOCATION_OPTIONS,
	EXECUTION_SURFACE_STATUS_OPTIONS
} from '$lib/types/control-plane';
import {
	formatRelativeTime,
	getExecutionSurfaces,
	loadControlPlane,
	parseExecutionSurfaceLocation,
	parseExecutionSurfaceStatus,
	updateControlPlaneCollections
} from '$lib/server/control-plane';
import { parseAgentSandbox } from '$lib/server/agent-threads';

const ACTIVE_RUN_STATUSES = new Set(['queued', 'starting', 'running']);

function readThreadSandboxOverride(value: FormDataEntryValue | null) {
	const raw = value?.toString().trim() ?? '';
	return raw ? parseAgentSandbox(raw, 'workspace-write') : null;
}

function parseListField(value: FormDataEntryValue | null) {
	return (
		value
			?.toString()
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean) ?? []
	);
}

function parseSelectedIds(form: FormData, key: string) {
	return [
		...new Set(
			form
				.getAll(key)
				.map((value) => value.toString().trim())
				.filter(Boolean)
		)
	];
}

function parsePositiveInteger(value: FormDataEntryValue | null) {
	const parsed = Number.parseInt(value?.toString() ?? '', 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getSupportedRoleIds(executionSurface: { supportedRoleIds?: string[] }) {
	return Array.from(new Set([...(executionSurface.supportedRoleIds ?? [])].filter(Boolean)));
}

function readExecutionSurfaceForm(form: FormData) {
	const supportedRoleIds = parseSelectedIds(form, 'supportedRoleIds');

	return {
		name: form.get('name')?.toString().trim() ?? '',
		providerId: form.get('providerId')?.toString().trim() ?? '',
		supportedRoleIds,
		note: form.get('note')?.toString().trim() ?? '',
		tags: parseListField(form.get('tags')),
		skills: parseListField(form.get('skills')),
		capacity: Number.parseInt(form.get('capacity')?.toString() ?? '1', 10),
		maxConcurrentRuns: parsePositiveInteger(form.get('maxConcurrentRuns')),
		location: parseExecutionSurfaceLocation(form.get('location')?.toString() ?? '', 'cloud'),
		status: parseExecutionSurfaceStatus(form.get('status')?.toString() ?? '', 'idle'),
		threadSandboxOverride: readThreadSandboxOverride(form.get('threadSandboxOverride')),
		modelOverride: form.get('modelOverride')?.toString().trim() || null
	};
}

export const load: PageServerLoad = async ({ params }) => {
	const data = await loadControlPlane();
	const executionSurfaces = getExecutionSurfaces(data);
	const executionSurface = executionSurfaces.find(
		(candidate) => candidate.id === params.executionSurfaceId
	);

	if (!executionSurface) {
		throw error(404, 'Execution surface not found.');
	}

	const providerMap = new Map(data.providers.map((provider) => [provider.id, provider]));
	const provider = providerMap.get(executionSurface.providerId) ?? null;
	const roleMap = new Map(data.roles.map((role) => [role.id, role]));
	const supportedRoleIds = getSupportedRoleIds(executionSurface);
	const supportedRoleNames = supportedRoleIds.map(
		(roleId) => roleMap.get(roleId)?.name ?? 'Unknown role'
	);
	const activeRunCount = data.runs.filter(
		(run) => run.executionSurfaceId === executionSurface.id && ACTIVE_RUN_STATUSES.has(run.status)
	).length;
	const recentRuns = data.runs
		.filter((run) => run.executionSurfaceId === executionSurface.id)
		.map((run) => ({
			...run,
			taskTitle: data.tasks.find((task) => task.id === run.taskId)?.title ?? 'Unknown task',
			updatedAtLabel: formatRelativeTime(run.updatedAt)
		}))
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
		.slice(0, 8);
	const assignedTasks = data.tasks
		.filter((task) => task.assigneeExecutionSurfaceId === executionSurface.id)
		.map((task) => ({
			id: task.id,
			title: task.title,
			status: task.status,
			updatedAtLabel: formatRelativeTime(task.updatedAt)
		}))
		.sort((a, b) => a.title.localeCompare(b.title));

	const executionSurfaceDetail = {
		...executionSurface,
		providerName: provider?.name ?? 'Unknown provider',
		providerDefaultThreadSandbox: provider?.defaultThreadSandbox ?? 'workspace-write',
		providerDefaultModel: provider?.defaultModel?.trim() || null,
		roleName: supportedRoleNames[0] ?? 'Unknown role',
		supportedRoleIds,
		supportedRoleNames,
		providerCapabilities: provider?.capabilities ?? [],
		effectiveCapabilities: [
			...new Set([...(executionSurface.skills ?? []), ...(provider?.capabilities ?? [])])
		],
		activeRunCount,
		effectiveConcurrencyLimit:
			typeof executionSurface.maxConcurrentRuns === 'number' &&
			Number.isFinite(executionSurface.maxConcurrentRuns)
				? Math.max(1, executionSurface.maxConcurrentRuns)
				: executionSurface.capacity
	};

	return {
		executionSurface: executionSurfaceDetail,
		providers: [...data.providers].sort((a, b) => a.name.localeCompare(b.name)),
		roles: [...data.roles].sort((a, b) => a.name.localeCompare(b.name)),
		statusOptions: EXECUTION_SURFACE_STATUS_OPTIONS,
		locationOptions: EXECUTION_SURFACE_LOCATION_OPTIONS,
		sandboxOptions: AGENT_SANDBOX_OPTIONS,
		recentRuns,
		assignedTasks
	};
};

export const actions: Actions = {
	updateExecutionSurface: async ({ params, request }) => {
		const executionSurfaceUpdates = readExecutionSurfaceForm(await request.formData());

		if (
			!executionSurfaceUpdates.name ||
			!executionSurfaceUpdates.providerId ||
			executionSurfaceUpdates.supportedRoleIds.length === 0
		) {
			return fail(400, {
				message: 'Name, provider, and at least one supported role are required.'
			});
		}

		let executionSurfaceUpdated = false;

		await updateControlPlaneCollections((data) => ({
			data: {
				...data,
				executionSurfaces: data.executionSurfaces.map((executionSurface) => {
					if (executionSurface.id !== params.executionSurfaceId) {
						return executionSurface;
					}

					executionSurfaceUpdated = true;

					return {
						...executionSurface,
						...executionSurfaceUpdates,
						capacity:
							Number.isFinite(executionSurfaceUpdates.capacity) &&
							executionSurfaceUpdates.capacity > 0
								? executionSurfaceUpdates.capacity
								: 1,
						lastSeenAt: new Date().toISOString()
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
			successAction: 'updateExecutionSurface',
			executionSurfaceId: params.executionSurfaceId
		};
	}
};
