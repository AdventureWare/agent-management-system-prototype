import { fail } from '@sveltejs/kit';
import type { CatalogLifecycleStatus, Role } from '$lib/types/control-plane';
import { AREA_OPTIONS, CATALOG_LIFECYCLE_STATUS_OPTIONS } from '$lib/types/control-plane';
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

function parseLifecycleStatus(value: FormDataEntryValue | null) {
	const raw = value?.toString().trim() ?? '';
	return CATALOG_LIFECYCLE_STATUS_OPTIONS.includes(
		raw as (typeof CATALOG_LIFECYCLE_STATUS_OPTIONS)[number]
	)
		? (raw as CatalogLifecycleStatus)
		: 'active';
}

export function readRoleForm(form: FormData) {
	return {
		roleId: form.get('roleId')?.toString().trim() ?? '',
		name: form.get('name')?.toString().trim() ?? '',
		area: parseRoleArea(form.get('area')),
		family: parseOptionalText(form.get('family')),
		lifecycleStatus: parseLifecycleStatus(form.get('lifecycleStatus')),
		sourceRoleId: parseOptionalText(form.get('sourceRoleId')),
		forkReason: parseOptionalText(form.get('forkReason')),
		supersededByRoleId: parseOptionalText(form.get('supersededByRoleId')),
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

	if (values.sourceRoleId && !values.forkReason) {
		return fail(400, {
			formContext: 'createRole',
			message: 'Explain how this fork differs from the source role.',
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
					family: values.family || undefined,
					lifecycleStatus: values.lifecycleStatus,
					sourceRoleId: values.sourceRoleId || null,
					forkReason: values.forkReason || undefined,
					supersededByRoleId: values.supersededByRoleId || null,
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

	if (values.sourceRoleId && !values.forkReason) {
		return fail(400, {
			formContext: 'updateRole',
			message: 'Explain how this fork differs from the source role.',
			roleId: values.roleId,
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
							family: values.family || undefined,
							lifecycleStatus: values.lifecycleStatus,
							sourceRoleId: values.sourceRoleId || null,
							forkReason: values.forkReason || undefined,
							supersededByRoleId: values.supersededByRoleId || null,
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
