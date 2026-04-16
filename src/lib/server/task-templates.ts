import { canonicalizeExecutionRequirementNames } from '$lib/execution-requirements';
import { buildExecutionRequirementInventory } from '$lib/server/execution-requirement-inventory';
import { listInstalledCodexSkills } from '$lib/server/codex-skills';
import type { ControlPlaneData } from '$lib/types/control-plane';

export type TaskTemplateDraftInput = {
	projectId: string;
	goalId: string;
	workflowId: string;
	taskTitle: string;
	taskSummary: string;
	successCriteria: string;
	readyCondition: string;
	expectedOutcome: string;
	area: string;
	priority: string;
	riskLevel: string;
	approvalMode: string;
	requiredThreadSandbox: string | null;
	requiresReview: boolean;
	desiredRoleId: string;
	assigneeExecutionSurfaceId: string;
	requiredPromptSkillNames: string[];
	requiredCapabilityNames: string[];
	requiredToolNames: string[];
};

export function sortTaskTemplatesByName<T extends { name: string }>(taskTemplates: T[]) {
	return [...taskTemplates].sort((left, right) => left.name.localeCompare(right.name));
}

export function decorateTaskTemplates(data: ControlPlaneData) {
	return sortTaskTemplatesByName(data.taskTemplates ?? []).map((taskTemplate) => ({
		...taskTemplate,
		projectName:
			data.projects.find((project) => project.id === taskTemplate.projectId)?.name ??
			'Unknown project',
		goalLabel: data.goals.find((goal) => goal.id === taskTemplate.goalId)?.name ?? 'No goal linked',
		workflowName:
			(data.workflows ?? []).find((workflow) => workflow.id === taskTemplate.workflowId)?.name ??
			'No workflow',
		desiredRoleName:
			data.roles.find((role) => role.id === taskTemplate.desiredRoleId)?.name ??
			'No role preference',
		assigneeExecutionSurfaceName:
			data.executionSurfaces.find(
				(executionSurface) => executionSurface.id === taskTemplate.assigneeExecutionSurfaceId
			)?.name ?? 'Leave unassigned'
	}));
}

export async function buildTaskTemplateDraft(
	current: ControlPlaneData,
	input: TaskTemplateDraftInput
) {
	const executionRequirementInventory = buildExecutionRequirementInventory(current);
	const project = current.projects.find((candidate) => candidate.id === input.projectId) ?? null;
	const goal = input.goalId
		? (current.goals.find((candidate) => candidate.id === input.goalId) ?? null)
		: null;
	const workflow = input.workflowId
		? ((current.workflows ?? []).find((candidate) => candidate.id === input.workflowId) ?? null)
		: null;
	const assignedExecutionSurface = input.assigneeExecutionSurfaceId
		? (current.executionSurfaces.find(
				(candidate) => candidate.id === input.assigneeExecutionSurfaceId
			) ?? null)
		: null;

	if (!project) {
		return { ok: false as const, status: 400, message: 'Project not found.' };
	}

	if (input.goalId && !goal) {
		return { ok: false as const, status: 400, message: 'Goal not found.' };
	}

	if (input.workflowId && !workflow) {
		return { ok: false as const, status: 400, message: 'Workflow not found.' };
	}

	if (input.assigneeExecutionSurfaceId && !assignedExecutionSurface) {
		return { ok: false as const, status: 400, message: 'Execution surface not found.' };
	}

	if (workflow && workflow.projectId !== project.id) {
		return {
			ok: false as const,
			status: 400,
			message: 'Workflow project does not match the selected task project.'
		};
	}

	if (input.desiredRoleId && !current.roles.some((role) => role.id === input.desiredRoleId)) {
		return { ok: false as const, status: 400, message: 'Desired role not found.' };
	}

	const projectInstalledSkills = listInstalledCodexSkills(project.projectRootFolder ?? '');
	const normalizedRequiredPromptSkillNames = canonicalizeExecutionRequirementNames(
		input.requiredPromptSkillNames,
		projectInstalledSkills.map((skill) => skill.id)
	);
	const normalizedRequiredCapabilityNames = canonicalizeExecutionRequirementNames(
		input.requiredCapabilityNames,
		executionRequirementInventory.capabilityNames
	);
	const normalizedRequiredToolNames = canonicalizeExecutionRequirementNames(
		input.requiredToolNames,
		executionRequirementInventory.toolNames
	);

	return {
		ok: true as const,
		project,
		goal,
		workflow,
		assignedExecutionSurface,
		normalizedRequiredPromptSkillNames,
		normalizedRequiredCapabilityNames,
		normalizedRequiredToolNames
	};
}
