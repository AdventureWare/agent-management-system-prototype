import { fail } from '@sveltejs/kit';
import type { Role } from '$lib/types/control-plane';
import { AREA_OPTIONS } from '$lib/types/control-plane';
import {
	createRole,
	loadControlPlane,
	updateControlPlaneCollections
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

export function readRoleForm(form: FormData) {
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

export async function createRoleAction(request: Request) {
	const values = readRoleForm(await request.formData());

	if (!values.name || !values.description) {
		return fail(400, {
			formContext: 'createRole',
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
			formContext: 'createRole',
			message: 'A role with that name already exists.',
			values
		});
	}

	await updateControlPlaneCollections((data) => ({
		data: {
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
		},
		changedCollections: ['roles']
	}));

	return {
		ok: true,
		successAction: 'createRole'
	};
}

export async function updateRoleAction(request: Request) {
	const values = readRoleForm(await request.formData());

	if (!values.roleId) {
		return fail(400, {
			formContext: 'updateRole',
			message: 'Role ID is required.',
			values
		});
	}

	if (!values.name || !values.description) {
		return fail(400, {
			formContext: 'updateRole',
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
			formContext: 'updateRole',
			message: 'A role with that name already exists.',
			roleId: values.roleId,
			values
		});
	}

	if (!current.roles.some((role) => role.id === values.roleId)) {
		return fail(404, {
			formContext: 'updateRole',
			message: 'Role not found.',
			roleId: values.roleId,
			values
		});
	}

	await updateControlPlaneCollections((data) => ({
		data: {
			...data,
			roles: data.roles.map((role) =>
				role.id === values.roleId
					? {
							...role,
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
						}
					: role
			)
		},
		changedCollections: ['roles']
	}));

	return {
		ok: true,
		roleId: values.roleId,
		successAction: 'updateRole'
	};
}
