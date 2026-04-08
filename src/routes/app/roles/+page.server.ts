import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { Role } from '$lib/types/control-plane';
import { AREA_OPTIONS } from '$lib/types/control-plane';
import {
	createRole,
	getExecutionSurfaces,
	loadControlPlane,
	updateControlPlane
} from '$lib/server/control-plane';

function parseListField(value: FormDataEntryValue | null) {
	return (
		value
			?.toString()
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean) ?? []
	);
}

function parseOptionalText(value: FormDataEntryValue | null) {
	const normalized = value?.toString().trim() ?? '';
	return normalized.length > 0 ? normalized : '';
}

function parseRoleArea(value: FormDataEntryValue | null) {
	const raw = value?.toString().trim() ?? '';
	return raw === 'shared' || AREA_OPTIONS.includes(raw as (typeof AREA_OPTIONS)[number])
		? (raw as Role['area'])
		: 'shared';
}

function readRoleForm(form: FormData) {
	return {
		roleId: form.get('roleId')?.toString().trim() ?? '',
		name: form.get('name')?.toString().trim() ?? '',
		area: parseRoleArea(form.get('area')),
		description: form.get('description')?.toString().trim() ?? '',
		skillIds: parseListField(form.get('skillIds')),
		toolIds: parseListField(form.get('toolIds')),
		mcpIds: parseListField(form.get('mcpIds')),
		systemPrompt: parseOptionalText(form.get('systemPrompt')),
		qualityChecklist: parseListField(form.get('qualityChecklist')),
		approvalPolicy: parseOptionalText(form.get('approvalPolicy')),
		escalationPolicy: parseOptionalText(form.get('escalationPolicy'))
	};
}

function countRoleDemand(data: Awaited<ReturnType<typeof loadControlPlane>>) {
	const taskCounts = new Map<string, number>();
	const workerCounts = new Map<string, number>();

	for (const task of data.tasks) {
		taskCounts.set(task.desiredRoleId, (taskCounts.get(task.desiredRoleId) ?? 0) + 1);
	}

	for (const worker of getExecutionSurfaces(data)) {
		const supportedRoleIds = worker.supportedRoleIds?.length
			? worker.supportedRoleIds
			: worker.roleId
				? [worker.roleId]
				: [];

		for (const roleId of supportedRoleIds) {
			workerCounts.set(roleId, (workerCounts.get(roleId) ?? 0) + 1);
		}
	}

	return { taskCounts, workerCounts };
}

export const load: PageServerLoad = async () => {
	const data = await loadControlPlane();
	const { taskCounts, workerCounts } = countRoleDemand(data);

	return {
		roleAreaOptions: ['shared', ...AREA_OPTIONS],
		roles: [...data.roles]
			.map((role) => ({
				...role,
				taskCount: taskCounts.get(role.id) ?? 0,
				workerCount: workerCounts.get(role.id) ?? 0
			}))
			.sort((a, b) => a.name.localeCompare(b.name))
	};
};

export const actions: Actions = {
	createRole: async ({ request }) => {
		const values = readRoleForm(await request.formData());

		if (!values.name || !values.description) {
			return fail(400, {
				message: 'Name and description are required.',
				values
			});
		}

		const current = await loadControlPlane();
		const duplicateRole = current.roles.find(
			(role) => role.name.trim().toLowerCase() === values.name.toLowerCase()
		);

		if (duplicateRole) {
			return fail(400, {
				message: 'A role with that name already exists.',
				values
			});
		}

		await updateControlPlane((data) => ({
			...data,
			roles: [
				createRole({
					name: values.name,
					area: values.area,
					description: values.description,
					skillIds: values.skillIds,
					toolIds: values.toolIds,
					mcpIds: values.mcpIds,
					systemPrompt: values.systemPrompt,
					qualityChecklist: values.qualityChecklist,
					approvalPolicy: values.approvalPolicy,
					escalationPolicy: values.escalationPolicy
				}),
				...data.roles
			]
		}));

		return {
			ok: true,
			successAction: 'createRole'
		};
	},

	updateRole: async ({ request }) => {
		const values = readRoleForm(await request.formData());

		if (!values.roleId) {
			return fail(400, {
				message: 'Role ID is required.',
				values
			});
		}

		if (!values.name || !values.description) {
			return fail(400, {
				message: 'Name and description are required.',
				values
			});
		}

		const current = await loadControlPlane();
		const duplicateRole = current.roles.find(
			(role) =>
				role.id !== values.roleId && role.name.trim().toLowerCase() === values.name.toLowerCase()
		);

		if (duplicateRole) {
			return fail(400, {
				message: 'A role with that name already exists.',
				values
			});
		}

		let roleUpdated = false;

		await updateControlPlane((data) => ({
			...data,
			roles: data.roles.map((role) => {
				if (role.id !== values.roleId) {
					return role;
				}

				roleUpdated = true;

				return {
					...role,
					name: values.name,
					area: values.area,
					description: values.description,
					skillIds: values.skillIds.length > 0 ? values.skillIds : undefined,
					toolIds: values.toolIds.length > 0 ? values.toolIds : undefined,
					mcpIds: values.mcpIds.length > 0 ? values.mcpIds : undefined,
					systemPrompt: values.systemPrompt || undefined,
					qualityChecklist:
						values.qualityChecklist.length > 0 ? values.qualityChecklist : undefined,
					approvalPolicy: values.approvalPolicy || undefined,
					escalationPolicy: values.escalationPolicy || undefined
				};
			})
		}));

		if (!roleUpdated) {
			return fail(404, {
				message: 'Role not found.',
				values
			});
		}

		return {
			ok: true,
			successAction: 'updateRole',
			roleId: values.roleId
		};
	}
};
