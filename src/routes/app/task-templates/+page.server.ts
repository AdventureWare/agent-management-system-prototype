import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createTaskTemplate,
	loadControlPlane,
	updateControlPlaneCollections
} from '$lib/server/control-plane';
import { listInstalledCodexSkills } from '$lib/server/codex-skills';
import { buildExecutionRequirementInventory } from '$lib/server/execution-requirement-inventory';
import {
	buildTaskTemplateDraft,
	decorateTaskTemplates,
	type TaskTemplateDraftInput
} from '$lib/server/task-templates';
import { buildTaskGoalOptions } from '$lib/server/task-goal-options';
import { readCreateTaskForm } from '$lib/server/task-form';
import { sortWorkflowsByName } from '$lib/server/workflows';

function readTaskTemplateId(form: FormData) {
	return form.get('taskTemplateId')?.toString().trim() ?? '';
}

function readTaskTemplateName(form: FormData) {
	return form.get('taskTemplateName')?.toString().trim() ?? '';
}

function readTaskTemplateSummary(form: FormData) {
	return form.get('taskTemplateSummary')?.toString().trim() ?? '';
}

function buildTaskTemplateFormValues(
	taskTemplateId: string,
	taskTemplateName: string,
	taskTemplateSummary: string,
	input: ReturnType<typeof readCreateTaskForm>
) {
	return {
		taskTemplateId,
		taskTemplateName,
		taskTemplateSummary,
		projectId: input.projectId,
		goalId: input.goalId,
		workflowId: input.workflowId,
		name: input.name,
		instructions: input.instructions,
		successCriteria: input.successCriteria,
		readyCondition: input.readyCondition,
		expectedOutcome: input.expectedOutcome,
		area: input.area,
		priority: input.priority,
		riskLevel: input.riskLevel,
		approvalMode: input.approvalMode,
		requiredThreadSandbox: input.requiredThreadSandbox,
		requiresReview: input.requiresReview,
		desiredRoleId: input.desiredRoleId,
		assigneeExecutionSurfaceId: input.assigneeExecutionSurfaceId,
		requiredPromptSkillNames: input.requiredPromptSkillNames,
		requiredCapabilityNames: input.requiredCapabilityNames,
		requiredToolNames: input.requiredToolNames
	};
}

function buildTaskTemplateDraftInput(
	input: ReturnType<typeof readCreateTaskForm>
): TaskTemplateDraftInput {
	return {
		projectId: input.projectId,
		goalId: input.goalId,
		workflowId: input.workflowId,
		taskTitle: input.name,
		taskSummary: input.instructions,
		successCriteria: input.successCriteria,
		readyCondition: input.readyCondition,
		expectedOutcome: input.expectedOutcome,
		area: input.area,
		priority: input.priority,
		riskLevel: input.riskLevel,
		approvalMode: input.approvalMode,
		requiredThreadSandbox: input.requiredThreadSandbox,
		requiresReview: input.requiresReview,
		desiredRoleId: input.desiredRoleId,
		assigneeExecutionSurfaceId: input.assigneeExecutionSurfaceId,
		requiredPromptSkillNames: input.requiredPromptSkillNames,
		requiredCapabilityNames: input.requiredCapabilityNames,
		requiredToolNames: input.requiredToolNames
	};
}

export const load: PageServerLoad = async () => {
	const data = await loadControlPlane();
	const projectSkillSummaries = [...data.projects]
		.map((project) => {
			const installedSkills = listInstalledCodexSkills(project.projectRootFolder);

			return {
				projectId: project.id,
				totalCount: installedSkills.length,
				globalCount: installedSkills.filter((skill) => skill.global).length,
				projectCount: installedSkills.filter((skill) => skill.project).length,
				installedSkills,
				previewSkills: installedSkills.slice(0, 8)
			};
		})
		.sort((left, right) => left.projectId.localeCompare(right.projectId));

	return {
		taskTemplates: decorateTaskTemplates(data),
		projects: [...data.projects].sort((a, b) => a.name.localeCompare(b.name)),
		goals: buildTaskGoalOptions(data.goals),
		workflows: sortWorkflowsByName(data.workflows ?? []).map((workflow) => ({
			...workflow,
			projectName:
				data.projects.find((project) => project.id === workflow.projectId)?.name ??
				'Unknown project'
		})),
		roles: [...data.roles].sort((a, b) => a.name.localeCompare(b.name)),
		executionSurfaces: [...data.executionSurfaces].sort((a, b) => a.name.localeCompare(b.name)),
		projectSkillSummaries,
		executionRequirementInventory: buildExecutionRequirementInventory(data)
	};
};

export const actions: Actions = {
	createTaskTemplate: async ({ request }) => {
		const form = await request.formData();
		const input = readCreateTaskForm(form);
		const taskTemplateName = readTaskTemplateName(form);
		const taskTemplateSummary = readTaskTemplateSummary(form);
		const values = buildTaskTemplateFormValues('', taskTemplateName, taskTemplateSummary, input);

		if (!taskTemplateName || !input.projectId || !input.name || !input.instructions) {
			return fail(400, {
				message:
					'Template name, project, default task title, and default instructions are required.',
				reopenEditor: true,
				editorMode: 'create',
				values
			});
		}

		const current = await loadControlPlane();
		const duplicateTemplate = (current.taskTemplates ?? []).find(
			(template) =>
				template.projectId === input.projectId &&
				template.name.trim().toLowerCase() === taskTemplateName.toLowerCase()
		);

		if (duplicateTemplate) {
			return fail(400, {
				message: 'A task template with that name already exists in this project.',
				reopenEditor: true,
				editorMode: 'create',
				values
			});
		}

		const draftedTemplate = await buildTaskTemplateDraft(
			current,
			buildTaskTemplateDraftInput(input)
		);

		if (!draftedTemplate.ok) {
			return fail(draftedTemplate.status, {
				message: draftedTemplate.message,
				reopenEditor: true,
				editorMode: 'create',
				values
			});
		}

		const taskTemplate = createTaskTemplate({
			name: taskTemplateName,
			summary: taskTemplateSummary,
			projectId: draftedTemplate.project.id,
			goalId: draftedTemplate.goal?.id ?? null,
			workflowId: draftedTemplate.workflow?.id ?? null,
			taskTitle: input.name,
			taskSummary: input.instructions,
			successCriteria: input.successCriteria,
			readyCondition: input.readyCondition,
			expectedOutcome: input.expectedOutcome,
			area: input.area,
			priority: input.priority,
			riskLevel: input.riskLevel,
			approvalMode: input.approvalMode,
			requiredThreadSandbox: input.requiredThreadSandbox,
			requiresReview: input.requiresReview,
			desiredRoleId: input.desiredRoleId,
			assigneeExecutionSurfaceId: draftedTemplate.assignedExecutionSurface?.id ?? null,
			requiredPromptSkillNames: draftedTemplate.normalizedRequiredPromptSkillNames,
			requiredCapabilityNames: draftedTemplate.normalizedRequiredCapabilityNames,
			requiredToolNames: draftedTemplate.normalizedRequiredToolNames
		});

		await updateControlPlaneCollections((data) => ({
			data: {
				...data,
				taskTemplates: [taskTemplate, ...(data.taskTemplates ?? [])]
			},
			changedCollections: ['taskTemplates']
		}));

		return {
			ok: true,
			successAction: 'createTaskTemplate',
			taskTemplateId: taskTemplate.id,
			taskTemplateName: taskTemplate.name
		};
	},

	updateTaskTemplate: async ({ request }) => {
		const form = await request.formData();
		const taskTemplateId = readTaskTemplateId(form);
		const input = readCreateTaskForm(form);
		const taskTemplateName = readTaskTemplateName(form);
		const taskTemplateSummary = readTaskTemplateSummary(form);
		const values = buildTaskTemplateFormValues(
			taskTemplateId,
			taskTemplateName,
			taskTemplateSummary,
			input
		);

		if (!taskTemplateId) {
			return fail(400, { message: 'Task template id is required.' });
		}

		if (!taskTemplateName || !input.projectId || !input.name || !input.instructions) {
			return fail(400, {
				message:
					'Template name, project, default task title, and default instructions are required.',
				reopenEditor: true,
				editorMode: 'edit',
				values
			});
		}

		const current = await loadControlPlane();
		const existingTemplate =
			(current.taskTemplates ?? []).find((candidate) => candidate.id === taskTemplateId) ?? null;

		if (!existingTemplate) {
			return fail(404, { message: 'Task template not found.' });
		}

		const duplicateTemplate = (current.taskTemplates ?? []).find(
			(template) =>
				template.id !== taskTemplateId &&
				template.projectId === input.projectId &&
				template.name.trim().toLowerCase() === taskTemplateName.toLowerCase()
		);

		if (duplicateTemplate) {
			return fail(400, {
				message: 'A task template with that name already exists in this project.',
				reopenEditor: true,
				editorMode: 'edit',
				values
			});
		}

		const draftedTemplate = await buildTaskTemplateDraft(
			current,
			buildTaskTemplateDraftInput(input)
		);

		if (!draftedTemplate.ok) {
			return fail(draftedTemplate.status, {
				message: draftedTemplate.message,
				reopenEditor: true,
				editorMode: 'edit',
				values
			});
		}

		const updatedTaskTemplate = {
			...existingTemplate,
			name: taskTemplateName,
			summary: taskTemplateSummary,
			projectId: draftedTemplate.project.id,
			goalId: draftedTemplate.goal?.id ?? null,
			workflowId: draftedTemplate.workflow?.id ?? null,
			taskTitle: input.name,
			taskSummary: input.instructions,
			successCriteria: input.successCriteria,
			readyCondition: input.readyCondition,
			expectedOutcome: input.expectedOutcome,
			area: input.area,
			priority: input.priority,
			riskLevel: input.riskLevel,
			approvalMode: input.approvalMode,
			requiredThreadSandbox: input.requiredThreadSandbox,
			requiresReview: input.requiresReview,
			desiredRoleId: input.desiredRoleId,
			assigneeExecutionSurfaceId: draftedTemplate.assignedExecutionSurface?.id ?? null,
			requiredPromptSkillNames: draftedTemplate.normalizedRequiredPromptSkillNames,
			requiredCapabilityNames: draftedTemplate.normalizedRequiredCapabilityNames,
			requiredToolNames: draftedTemplate.normalizedRequiredToolNames,
			updatedAt: new Date().toISOString()
		};

		await updateControlPlaneCollections((data) => ({
			data: {
				...data,
				taskTemplates: (data.taskTemplates ?? []).map((template) =>
					template.id === taskTemplateId ? updatedTaskTemplate : template
				)
			},
			changedCollections: ['taskTemplates']
		}));

		return {
			ok: true,
			successAction: 'updateTaskTemplate',
			taskTemplateId: updatedTaskTemplate.id,
			taskTemplateName: updatedTaskTemplate.name
		};
	},

	deleteTaskTemplate: async ({ request }) => {
		const form = await request.formData();
		const taskTemplateId = readTaskTemplateId(form);

		if (!taskTemplateId) {
			return fail(400, { message: 'Task template id is required.' });
		}

		const current = await loadControlPlane();
		const existingTemplate =
			(current.taskTemplates ?? []).find((candidate) => candidate.id === taskTemplateId) ?? null;

		if (!existingTemplate) {
			return fail(404, { message: 'Task template not found.' });
		}

		await updateControlPlaneCollections((data) => ({
			data: {
				...data,
				taskTemplates: (data.taskTemplates ?? []).filter(
					(template) => template.id !== taskTemplateId
				)
			},
			changedCollections: ['taskTemplates']
		}));

		return {
			ok: true,
			successAction: 'deleteTaskTemplate',
			taskTemplateId,
			taskTemplateName: existingTemplate.name
		};
	}
};
