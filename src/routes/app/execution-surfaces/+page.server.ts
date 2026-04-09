import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	EXECUTION_SURFACE_LOCATION_OPTIONS,
	EXECUTION_SURFACE_STATUS_OPTIONS
} from '$lib/types/control-plane';
import {
	createExecutionSurface,
	getExecutionSurfaces,
	loadControlPlane,
	parseExecutionSurfaceLocation,
	parseExecutionSurfaceStatus,
	updateControlPlane
} from '$lib/server/control-plane';

const ACTIVE_RUN_STATUSES = new Set(['queued', 'starting', 'running']);

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

export const load: PageServerLoad = async () => {
	const data = await loadControlPlane();
	const executionSurfaces = getExecutionSurfaces(data);
	const providerMap = new Map(data.providers.map((provider) => [provider.id, provider]));
	const roleMap = new Map(data.roles.map((role) => [role.id, role]));
	const assignedTaskCounts = new Map<string, number>();
	const latestRunByExecutionSurface = new Map<string, string>();
	const activeRunCounts = new Map<string, number>();

	for (const task of data.tasks) {
		if (!task.assigneeExecutionSurfaceId) {
			continue;
		}

		assignedTaskCounts.set(
			task.assigneeExecutionSurfaceId,
			(assignedTaskCounts.get(task.assigneeExecutionSurfaceId) ?? 0) + 1
		);
	}

	for (const run of [...data.runs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
		if (!run.executionSurfaceId || latestRunByExecutionSurface.has(run.executionSurfaceId)) {
			// Keep counting active runs below even if this execution surface already has a latest timestamp.
		} else {
			latestRunByExecutionSurface.set(run.executionSurfaceId, run.updatedAt);
		}

		if (run.executionSurfaceId && ACTIVE_RUN_STATUSES.has(run.status)) {
			activeRunCounts.set(
				run.executionSurfaceId,
				(activeRunCounts.get(run.executionSurfaceId) ?? 0) + 1
			);
		}
	}

	const executionSurfacesView = [...executionSurfaces]
		.map((executionSurface) => {
			const provider = providerMap.get(executionSurface.providerId) ?? null;
			const executionSurfaceSkills = executionSurface.skills ?? [];
			const providerCapabilities = provider?.capabilities ?? [];
			const supportedRoleIds = getSupportedRoleIds(executionSurface);
			const supportedRoleNames = supportedRoleIds.map(
				(roleId) => roleMap.get(roleId)?.name ?? 'Unknown role'
			);

			return {
				...executionSurface,
				providerName: provider?.name ?? 'Unknown provider',
				roleName: supportedRoleNames[0] ?? 'Unknown role',
				supportedRoleIds,
				supportedRoleNames,
				assignedTaskCount: assignedTaskCounts.get(executionSurface.id) ?? 0,
				activeRunCount: activeRunCounts.get(executionSurface.id) ?? 0,
				latestRunAt: latestRunByExecutionSurface.get(executionSurface.id) ?? null,
				providerCapabilities,
				effectiveCapabilities: [...new Set([...executionSurfaceSkills, ...providerCapabilities])],
				effectiveConcurrencyLimit:
					typeof executionSurface.maxConcurrentRuns === 'number' &&
					Number.isFinite(executionSurface.maxConcurrentRuns)
						? Math.max(1, executionSurface.maxConcurrentRuns)
						: executionSurface.capacity
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name));

	return {
		executionSurfaces: executionSurfacesView,
		providers: [...data.providers].sort((a, b) => a.name.localeCompare(b.name)),
		roles: [...data.roles].sort((a, b) => a.name.localeCompare(b.name)),
		statusOptions: EXECUTION_SURFACE_STATUS_OPTIONS,
		locationOptions: EXECUTION_SURFACE_LOCATION_OPTIONS
	};
};

export const actions: Actions = {
	createExecutionSurface: async ({ request }) => {
		const form = await request.formData();
		const name = form.get('name')?.toString().trim() ?? '';
		const providerId = form.get('providerId')?.toString().trim() ?? '';
		const supportedRoleIds = parseSelectedIds(form, 'supportedRoleIds');
		const note = form.get('note')?.toString().trim() ?? '';
		const tags = parseListField(form.get('tags'));
		const skills = parseListField(form.get('skills'));
		const capacity = Number.parseInt(form.get('capacity')?.toString() ?? '1', 10);
		const maxConcurrentRuns = parsePositiveInteger(form.get('maxConcurrentRuns'));
		const location = parseExecutionSurfaceLocation(form.get('location')?.toString() ?? '', 'cloud');
		const status = parseExecutionSurfaceStatus(form.get('status')?.toString() ?? '', 'idle');

		if (!name || !providerId || supportedRoleIds.length === 0) {
			return fail(400, {
				message: 'Name, provider, and at least one supported role are required.'
			});
		}

		await updateControlPlane((data) => ({
			...data,
			executionSurfaces: [
				createExecutionSurface({
					name,
					providerId,
					supportedRoleIds,
					location,
					status,
					note,
					capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 1,
					tags,
					skills,
					maxConcurrentRuns
				}),
				...data.executionSurfaces
			]
		}));

		return { ok: true, successAction: 'createExecutionSurface' };
	},

	updateExecutionSurfaceStatus: async ({ request }) => {
		const form = await request.formData();
		const executionSurfaceId = form.get('executionSurfaceId')?.toString().trim() ?? '';
		const status = parseExecutionSurfaceStatus(form.get('status')?.toString() ?? '', 'idle');

		if (!executionSurfaceId) {
			return fail(400, { message: 'Execution surface ID is required.' });
		}

		await updateControlPlane((data) => ({
			...data,
			executionSurfaces: data.executionSurfaces.map((executionSurface) =>
				executionSurface.id === executionSurfaceId
					? { ...executionSurface, status, lastSeenAt: new Date().toISOString() }
					: executionSurface
			)
		}));

		return { ok: true };
	}
};
