import { AREA_OPTIONS, ROLE_FAMILY_OPTIONS } from '$lib/types/control-plane';
import type { Role } from '$lib/types/control-plane';
import { getExecutionSurfaces, loadControlPlane } from '$lib/server/control-plane';

type LoadedControlPlane = Awaited<ReturnType<typeof loadControlPlane>>;
type NamedReference = {
	id: string;
	name: string;
};

function countRoleDemand(data: LoadedControlPlane) {
	const taskCounts = new Map<string, number>();
	const executionSurfaceCounts = new Map<string, number>();

	for (const task of data.tasks) {
		taskCounts.set(task.desiredRoleId, (taskCounts.get(task.desiredRoleId) ?? 0) + 1);
	}

	for (const executionSurface of getExecutionSurfaces(data)) {
		const supportedRoleIds = executionSurface.supportedRoleIds ?? [];

		for (const roleId of supportedRoleIds) {
			executionSurfaceCounts.set(roleId, (executionSurfaceCounts.get(roleId) ?? 0) + 1);
		}
	}

	return { taskCounts, executionSurfaceCounts };
}

function pushUniqueValue(map: Map<string, string[]>, key: string, value: string) {
	if (!value.trim()) {
		return;
	}

	const values = map.get(key) ?? [];

	if (!values.includes(value)) {
		values.push(value);
		map.set(key, values);
	}
}

function pushUniqueReference(
	map: Map<string, NamedReference[]>,
	key: string,
	reference: NamedReference
) {
	if (!reference.name.trim()) {
		return;
	}

	const values = map.get(key) ?? [];

	if (!values.some((value) => value.id === reference.id)) {
		values.push(reference);
		map.set(key, values);
	}
}

function countConfiguredDefaults(role: Role) {
	return [
		(role.skillIds?.length ?? 0) > 0,
		(role.toolIds?.length ?? 0) > 0,
		(role.mcpIds?.length ?? 0) > 0,
		Boolean(role.systemPrompt?.trim()),
		(role.qualityChecklist?.length ?? 0) > 0,
		Boolean(role.approvalPolicy?.trim()),
		Boolean(role.escalationPolicy?.trim())
	].filter(Boolean).length;
}

export function buildRoleDirectory(data: LoadedControlPlane) {
	const roleById = new Map(data.roles.map((role) => [role.id, role]));
	const { taskCounts, executionSurfaceCounts } = countRoleDemand(data);
	const taskExamples = new Map<string, NamedReference[]>();
	const executionSurfaceReferences = new Map<string, NamedReference[]>();
	const workflowReferences = new Map<string, NamedReference[]>();
	const templateReferences = new Map<string, NamedReference[]>();
	const workflowCounts = new Map<string, number>();
	const templateCounts = new Map<string, number>();
	const workflowById = new Map((data.workflows ?? []).map((workflow) => [workflow.id, workflow]));
	const workflowIdsByRole = new Map<string, Set<string>>();
	const templateIdsByRole = new Map<string, Set<string>>();

	for (const task of [...data.tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
		const examples = taskExamples.get(task.desiredRoleId) ?? [];

		if (!examples.some((example) => example.id === task.id) && examples.length < 3) {
			examples.push({ id: task.id, name: task.title });
			taskExamples.set(task.desiredRoleId, examples);
		}
	}

	for (const executionSurface of getExecutionSurfaces(data)) {
		for (const roleId of executionSurface.supportedRoleIds ?? []) {
			pushUniqueReference(executionSurfaceReferences, roleId, {
				id: executionSurface.id,
				name: executionSurface.name
			});
		}
	}

	for (const workflowStep of data.workflowSteps ?? []) {
		const workflow = workflowById.get(workflowStep.workflowId);

		if (!workflow) {
			continue;
		}

		pushUniqueReference(workflowReferences, workflowStep.desiredRoleId, {
			id: workflow.id,
			name: workflow.name
		});
		const workflowIds = workflowIdsByRole.get(workflowStep.desiredRoleId) ?? new Set<string>();
		workflowIds.add(workflow.id);
		workflowIdsByRole.set(workflowStep.desiredRoleId, workflowIds);
	}

	for (const taskTemplate of data.taskTemplates ?? []) {
		pushUniqueReference(templateReferences, taskTemplate.desiredRoleId, {
			id: taskTemplate.id,
			name: taskTemplate.name
		});
		const templateIds = templateIdsByRole.get(taskTemplate.desiredRoleId) ?? new Set<string>();
		templateIds.add(taskTemplate.id);
		templateIdsByRole.set(taskTemplate.desiredRoleId, templateIds);
	}

	for (const [roleId, workflowIds] of workflowIdsByRole) {
		workflowCounts.set(roleId, workflowIds.size);
	}

	for (const [roleId, templateIds] of templateIdsByRole) {
		templateCounts.set(roleId, templateIds.size);
	}

	return [...data.roles]
		.map((role) => ({
			...role,
			taskCount: taskCounts.get(role.id) ?? 0,
			executionSurfaceCount: executionSurfaceCounts.get(role.id) ?? 0,
			workflowCount: workflowCounts.get(role.id) ?? 0,
			templateCount: templateCounts.get(role.id) ?? 0,
			taskExamples: taskExamples.get(role.id) ?? [],
			taskExampleTitles: (taskExamples.get(role.id) ?? []).map((reference) => reference.name),
			executionSurfaceReferences: executionSurfaceReferences.get(role.id) ?? [],
			executionSurfaceNames: (executionSurfaceReferences.get(role.id) ?? []).map(
				(reference) => reference.name
			),
			workflowReferences: workflowReferences.get(role.id) ?? [],
			workflowNames: (workflowReferences.get(role.id) ?? []).map((reference) => reference.name),
			templateReferences: templateReferences.get(role.id) ?? [],
			templateNames: (templateReferences.get(role.id) ?? []).map((reference) => reference.name),
			configuredDefaultsCount: countConfiguredDefaults(role),
			sourceRole: role.sourceRoleId ? (roleById.get(role.sourceRoleId) ?? null) : null,
			supersededByRole: role.supersededByRoleId
				? (roleById.get(role.supersededByRoleId) ?? null)
				: null
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadRolesDirectoryData(url: URL) {
	const data = await loadControlPlane();
	const roles = buildRoleDirectory(data);
	const requestedRoleId = url.searchParams.get('role')?.trim() ?? '';
	const initialSelectedRoleId =
		roles.find((role) => role.id === requestedRoleId)?.id ?? roles[0]?.id ?? '';

	return {
		roleAreaOptions: ['shared', ...AREA_OPTIONS],
		roleFamilyOptions: [
			...new Set([
				...ROLE_FAMILY_OPTIONS,
				...roles.map((role) => role.family?.trim() ?? '').filter(Boolean)
			])
		].sort((left, right) => left.localeCompare(right)),
		initialSelectedRoleId,
		roles
	};
}
