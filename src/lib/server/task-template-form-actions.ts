import { fail } from '@sveltejs/kit';
import type { CatalogLifecycleStatus, TaskTemplate } from '$lib/types/control-plane';
import { CATALOG_LIFECYCLE_STATUS_OPTIONS } from '$lib/types/control-plane';
import {
	createTaskTemplate,
	loadControlPlane,
	updateControlPlaneCollections
} from '$lib/server/control-plane';
import { buildTaskTemplateDraft, type TaskTemplateDraftInput } from '$lib/server/task-templates';
import { readCreateTaskForm } from '$lib/server/task-form';

function readTaskTemplateId(form: FormData) {
	return form.get('taskTemplateId')?.toString().trim() ?? '';
}

function readTaskTemplateName(form: FormData) {
	return form.get('taskTemplateName')?.toString().trim() ?? '';
}

function readTaskTemplateSummary(form: FormData) {
	return form.get('taskTemplateSummary')?.toString().trim() ?? '';
}

function readLifecycleStatus(form: FormData) {
	const value = form.get('lifecycleStatus')?.toString().trim() ?? '';
	return CATALOG_LIFECYCLE_STATUS_OPTIONS.includes(
		value as (typeof CATALOG_LIFECYCLE_STATUS_OPTIONS)[number]
	)
		? (value as CatalogLifecycleStatus)
		: 'active';
}

function readOptionalText(form: FormData, key: string) {
	return form.get(key)?.toString().trim() ?? '';
}

function validateTaskTemplateRelationships(
	values: ReturnType<typeof buildTaskTemplateFormValues>,
	taskTemplates: Awaited<ReturnType<typeof loadControlPlane>>['taskTemplates'],
	mode: 'create' | 'update'
) {
	const currentTaskTemplateId = mode === 'update' ? values.taskTemplateId : '';
	const sourceTaskTemplate = values.sourceTaskTemplateId
		? ((taskTemplates ?? []).find(
				(taskTemplate) => taskTemplate.id === values.sourceTaskTemplateId
			) ?? null)
		: null;
	const successorTaskTemplate = values.supersededByTaskTemplateId
		? ((taskTemplates ?? []).find(
				(taskTemplate) => taskTemplate.id === values.supersededByTaskTemplateId
			) ?? null)
		: null;

	if (values.sourceTaskTemplateId && !sourceTaskTemplate) {
		return 'Source template not found.';
	}

	if (values.supersededByTaskTemplateId && !successorTaskTemplate) {
		return 'Successor template not found.';
	}

	if (currentTaskTemplateId && values.sourceTaskTemplateId === currentTaskTemplateId) {
		return 'A template cannot be forked from itself.';
	}

	if (currentTaskTemplateId && values.supersededByTaskTemplateId === currentTaskTemplateId) {
		return 'A template cannot supersede itself.';
	}

	if (values.lifecycleStatus === 'superseded' && !values.supersededByTaskTemplateId) {
		return 'Select the successor template before marking this template as superseded.';
	}

	if (
		successorTaskTemplate &&
		(successorTaskTemplate.lifecycleStatus === 'deprecated' ||
			successorTaskTemplate.lifecycleStatus === 'superseded')
	) {
		return 'Choose an active or draft successor template, not a deprecated or superseded one.';
	}

	if (currentTaskTemplateId && successorTaskTemplate) {
		const seen = new Set<string>([currentTaskTemplateId]);
		let cursor: TaskTemplate | null = successorTaskTemplate;

		while (cursor?.supersededByTaskTemplateId) {
			if (seen.has(cursor.id)) {
				return 'Successor chain cannot loop back to this template.';
			}

			seen.add(cursor.id);
			cursor =
				(taskTemplates ?? []).find(
					(taskTemplate) => taskTemplate.id === cursor?.supersededByTaskTemplateId
				) ?? null;
		}
	}

	return null;
}

function buildTaskTemplateFormValues(
	taskTemplateId: string,
	taskTemplateName: string,
	taskTemplateSummary: string,
	input: ReturnType<typeof readCreateTaskForm>,
	catalogFields: {
		lifecycleStatus: CatalogLifecycleStatus;
		sourceTaskTemplateId: string;
		forkReason: string;
		supersededByTaskTemplateId: string;
	}
) {
	return {
		taskTemplateId,
		taskTemplateName,
		taskTemplateSummary,
		projectId: input.projectId,
		lifecycleStatus: catalogFields.lifecycleStatus,
		sourceTaskTemplateId: catalogFields.sourceTaskTemplateId,
		forkReason: catalogFields.forkReason,
		supersededByTaskTemplateId: catalogFields.supersededByTaskTemplateId,
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

export async function createTaskTemplateAction(request: Request) {
	const form = await request.formData();
	const input = readCreateTaskForm(form);
	const taskTemplateName = readTaskTemplateName(form);
	const taskTemplateSummary = readTaskTemplateSummary(form);
	const catalogFields = {
		lifecycleStatus: readLifecycleStatus(form),
		sourceTaskTemplateId: readOptionalText(form, 'sourceTaskTemplateId'),
		forkReason: readOptionalText(form, 'forkReason'),
		supersededByTaskTemplateId: readOptionalText(form, 'supersededByTaskTemplateId')
	};
	const values = buildTaskTemplateFormValues(
		'',
		taskTemplateName,
		taskTemplateSummary,
		input,
		catalogFields
	);

	if (!taskTemplateName || !input.projectId || !input.name || !input.instructions) {
		return fail(400, {
			message: 'Template name, project, default task title, and default instructions are required.',
			reopenEditor: true,
			editorMode: 'create',
			formContext: 'createTaskTemplate',
			values
		});
	}

	if (catalogFields.sourceTaskTemplateId && !catalogFields.forkReason) {
		return fail(400, {
			message: 'Explain how this fork differs from the source template.',
			reopenEditor: true,
			editorMode: 'create',
			formContext: 'createTaskTemplate',
			values
		});
	}

	const current = await loadControlPlane();
	const duplicateTemplate = (current.taskTemplates ?? []).find(
		(template) =>
			template.projectId === input.projectId &&
			template.name.trim().toLowerCase() === taskTemplateName.toLowerCase()
	);

	const relationshipError = validateTaskTemplateRelationships(
		values,
		current.taskTemplates ?? [],
		'create'
	);

	if (relationshipError) {
		return fail(400, {
			message: relationshipError,
			reopenEditor: true,
			editorMode: 'create',
			formContext: 'createTaskTemplate',
			values
		});
	}

	if (duplicateTemplate) {
		return fail(400, {
			message: 'A task template with that name already exists in this project.',
			reopenEditor: true,
			editorMode: 'create',
			formContext: 'createTaskTemplate',
			values
		});
	}

	const draftedTemplate = await buildTaskTemplateDraft(current, buildTaskTemplateDraftInput(input));

	if (!draftedTemplate.ok) {
		return fail(draftedTemplate.status, {
			message: draftedTemplate.message,
			reopenEditor: true,
			editorMode: 'create',
			formContext: 'createTaskTemplate',
			values
		});
	}

	const taskTemplate = createTaskTemplate({
		name: taskTemplateName,
		summary: taskTemplateSummary,
		projectId: draftedTemplate.project.id,
		lifecycleStatus: catalogFields.lifecycleStatus,
		sourceTaskTemplateId: catalogFields.sourceTaskTemplateId || null,
		forkReason: catalogFields.forkReason || undefined,
		supersededByTaskTemplateId: catalogFields.supersededByTaskTemplateId || null,
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
}

export async function updateTaskTemplateAction(request: Request) {
	const form = await request.formData();
	const taskTemplateId = readTaskTemplateId(form);
	const input = readCreateTaskForm(form);
	const taskTemplateName = readTaskTemplateName(form);
	const taskTemplateSummary = readTaskTemplateSummary(form);
	const catalogFields = {
		lifecycleStatus: readLifecycleStatus(form),
		sourceTaskTemplateId: readOptionalText(form, 'sourceTaskTemplateId'),
		forkReason: readOptionalText(form, 'forkReason'),
		supersededByTaskTemplateId: readOptionalText(form, 'supersededByTaskTemplateId')
	};
	const values = buildTaskTemplateFormValues(
		taskTemplateId,
		taskTemplateName,
		taskTemplateSummary,
		input,
		catalogFields
	);

	if (!taskTemplateId) {
		return fail(400, { message: 'Task template id is required.' });
	}

	if (!taskTemplateName || !input.projectId || !input.name || !input.instructions) {
		return fail(400, {
			message: 'Template name, project, default task title, and default instructions are required.',
			reopenEditor: true,
			editorMode: 'edit',
			formContext: 'updateTaskTemplate',
			taskTemplateId,
			values
		});
	}

	if (catalogFields.sourceTaskTemplateId && !catalogFields.forkReason) {
		return fail(400, {
			message: 'Explain how this fork differs from the source template.',
			reopenEditor: true,
			editorMode: 'edit',
			formContext: 'updateTaskTemplate',
			taskTemplateId,
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

	const relationshipError = validateTaskTemplateRelationships(
		values,
		current.taskTemplates ?? [],
		'update'
	);

	if (relationshipError) {
		return fail(400, {
			message: relationshipError,
			reopenEditor: true,
			editorMode: 'edit',
			formContext: 'updateTaskTemplate',
			taskTemplateId,
			values
		});
	}

	if (duplicateTemplate) {
		return fail(400, {
			message: 'A task template with that name already exists in this project.',
			reopenEditor: true,
			editorMode: 'edit',
			formContext: 'updateTaskTemplate',
			taskTemplateId,
			values
		});
	}

	const draftedTemplate = await buildTaskTemplateDraft(current, buildTaskTemplateDraftInput(input));

	if (!draftedTemplate.ok) {
		return fail(draftedTemplate.status, {
			message: draftedTemplate.message,
			reopenEditor: true,
			editorMode: 'edit',
			formContext: 'updateTaskTemplate',
			taskTemplateId,
			values
		});
	}

	const updatedTaskTemplate = {
		...existingTemplate,
		name: taskTemplateName,
		summary: taskTemplateSummary,
		projectId: draftedTemplate.project.id,
		lifecycleStatus: catalogFields.lifecycleStatus,
		sourceTaskTemplateId: catalogFields.sourceTaskTemplateId || null,
		forkReason: catalogFields.forkReason || undefined,
		supersededByTaskTemplateId: catalogFields.supersededByTaskTemplateId || null,
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
}

export async function migrateTaskTemplateReferencesAction(request: Request) {
	const form = await request.formData();
	const taskTemplateId = readTaskTemplateId(form);

	if (!taskTemplateId) {
		return fail(400, {
			message: 'Task template id is required to migrate references.'
		});
	}

	const current = await loadControlPlane();
	const taskTemplate =
		(current.taskTemplates ?? []).find((candidate) => candidate.id === taskTemplateId) ?? null;

	if (!taskTemplate) {
		return fail(404, {
			message: 'Task template not found.'
		});
	}

	const successorTaskTemplateId = taskTemplate.supersededByTaskTemplateId?.trim() ?? '';

	if (!successorTaskTemplateId) {
		return fail(400, {
			message: 'Set a successor template before migrating references.'
		});
	}

	const successorTaskTemplate =
		(current.taskTemplates ?? []).find((candidate) => candidate.id === successorTaskTemplateId) ??
		null;

	if (!successorTaskTemplate) {
		return fail(400, {
			message: 'Successor template not found.'
		});
	}

	const migratedTaskCount = current.tasks.filter(
		(task) => task.taskTemplateId === taskTemplateId
	).length;

	await updateControlPlaneCollections((data) => ({
		data: {
			...data,
			tasks: data.tasks.map((task) =>
				task.taskTemplateId === taskTemplateId
					? { ...task, taskTemplateId: successorTaskTemplateId }
					: task
			)
		},
		changedCollections: ['tasks']
	}));

	return {
		ok: true,
		taskTemplateId,
		successAction: 'migrateTaskTemplateReferences',
		message: `Migrated ${migratedTaskCount} created task reference${migratedTaskCount === 1 ? '' : 's'} to ${successorTaskTemplate.name}.`
	};
}

export async function deleteTaskTemplateAction(request: Request) {
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
			taskTemplates: (data.taskTemplates ?? []).filter((template) => template.id !== taskTemplateId)
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
