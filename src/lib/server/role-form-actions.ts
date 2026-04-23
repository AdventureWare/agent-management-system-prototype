import { fail } from '@sveltejs/kit';
import type { CatalogLifecycleStatus, Role } from '$lib/types/control-plane';
import {
	AREA_OPTIONS,
	CATALOG_LIFECYCLE_STATUS_OPTIONS,
	normalizeRoleFamily
} from '$lib/types/control-plane';
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

function parseRoleFamily(value: FormDataEntryValue | null) {
	const raw = parseOptionalText(value);
	return raw ? normalizeRoleFamily(raw) : '';
}

function validateRoleRelationships(
	values: ReturnType<typeof readRoleForm>,
	roles: Role[],
	mode: 'create' | 'update'
) {
	const currentRoleId = mode === 'update' ? values.roleId : '';
	const sourceRole = values.sourceRoleId
		? (roles.find((role) => role.id === values.sourceRoleId) ?? null)
		: null;
	const successorRole = values.supersededByRoleId
		? (roles.find((role) => role.id === values.supersededByRoleId) ?? null)
		: null;

	if (values.sourceRoleId && !sourceRole) {
		return 'Source role not found.';
	}

	if (values.supersededByRoleId && !successorRole) {
		return 'Successor role not found.';
	}

	if (currentRoleId && values.sourceRoleId === currentRoleId) {
		return 'A role cannot be forked from itself.';
	}

	if (currentRoleId && values.supersededByRoleId === currentRoleId) {
		return 'A role cannot supersede itself.';
	}

	if (values.lifecycleStatus === 'superseded' && !values.supersededByRoleId) {
		return 'Select the successor role before marking this role as superseded.';
	}

	if (
		successorRole &&
		(successorRole.lifecycleStatus === 'deprecated' ||
			successorRole.lifecycleStatus === 'superseded')
	) {
		return 'Choose an active or draft successor role, not a deprecated or superseded one.';
	}

	if (currentRoleId && successorRole) {
		const seen = new Set<string>([currentRoleId]);
		let cursor: Role | null = successorRole;

		while (cursor?.supersededByRoleId) {
			if (seen.has(cursor.id)) {
				return 'Successor chain cannot loop back to this role.';
			}

			seen.add(cursor.id);
			cursor = roles.find((role) => role.id === cursor?.supersededByRoleId) ?? null;
		}
	}

	return null;
}

export function readRoleForm(form: FormData) {
	return {
		roleId: form.get('roleId')?.toString().trim() ?? '',
		name: form.get('name')?.toString().trim() ?? '',
		area: parseRoleArea(form.get('area')),
		family: parseRoleFamily(form.get('family')),
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

	const relationshipError = validateRoleRelationships(values, current.roles, 'create');

	if (relationshipError) {
		return fail(400, {
			formContext: 'createRole',
			message: relationshipError,
			values
		});
	}

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

	const relationshipError = validateRoleRelationships(values, current.roles, 'update');

	if (relationshipError) {
		return fail(400, {
			formContext: 'updateRole',
			message: relationshipError,
			roleId: values.roleId,
			values
		});
	}

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

export async function migrateRoleReferencesAction(request: Request) {
	const form = await request.formData();
	const roleId = form.get('roleId')?.toString().trim() ?? '';

	if (!roleId) {
		return fail(400, {
			message: 'Role ID is required to migrate references.'
		});
	}

	const current = await loadControlPlane();
	const role = current.roles.find((candidate) => candidate.id === roleId) ?? null;

	if (!role) {
		return fail(404, {
			message: 'Role not found.'
		});
	}

	const successorRoleId = role.supersededByRoleId?.trim() ?? '';

	if (!successorRoleId) {
		return fail(400, {
			message: 'Set a successor role before migrating references.'
		});
	}

	const successorRole = current.roles.find((candidate) => candidate.id === successorRoleId) ?? null;

	if (!successorRole) {
		return fail(400, {
			message: 'Successor role not found.'
		});
	}

	const taskCount = current.tasks.filter((task) => task.desiredRoleId === roleId).length;
	const taskTemplateCount = (current.taskTemplates ?? []).filter(
		(taskTemplate) => taskTemplate.desiredRoleId === roleId
	).length;
	const workflowStepCount = (current.workflowSteps ?? []).filter(
		(workflowStep) => workflowStep.desiredRoleId === roleId
	).length;
	const executionSurfaceCount = current.executionSurfaces.filter((executionSurface) =>
		(executionSurface.supportedRoleIds ?? []).includes(roleId)
	).length;

	await updateControlPlaneCollections((data) => ({
		data: {
			...data,
			tasks: data.tasks.map((task) =>
				task.desiredRoleId === roleId ? { ...task, desiredRoleId: successorRoleId } : task
			),
			taskTemplates: (data.taskTemplates ?? []).map((taskTemplate) =>
				taskTemplate.desiredRoleId === roleId
					? { ...taskTemplate, desiredRoleId: successorRoleId }
					: taskTemplate
			),
			workflowSteps: (data.workflowSteps ?? []).map((workflowStep) =>
				workflowStep.desiredRoleId === roleId
					? { ...workflowStep, desiredRoleId: successorRoleId }
					: workflowStep
			),
			executionSurfaces: data.executionSurfaces.map((executionSurface) =>
				(executionSurface.supportedRoleIds ?? []).includes(roleId)
					? {
							...executionSurface,
							supportedRoleIds: [
								...new Set(
									(executionSurface.supportedRoleIds ?? []).map((supportedRoleId) =>
										supportedRoleId === roleId ? successorRoleId : supportedRoleId
									)
								)
							]
						}
					: executionSurface
			)
		},
		changedCollections: ['tasks', 'taskTemplates', 'workflowSteps', 'executionSurfaces']
	}));

	return {
		ok: true,
		roleId,
		successAction: 'migrateRoleReferences',
		message: `Migrated ${taskCount + taskTemplateCount + workflowStepCount + executionSurfaceCount} references to ${successorRole.name}.`
	};
}
