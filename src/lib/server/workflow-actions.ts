import { fail } from '@sveltejs/kit';
import {
	createWorkflow,
	createWorkflowStep,
	loadControlPlane,
	updateControlPlaneCollections
} from '$lib/server/control-plane';
import { instantiateWorkflowTemplate } from '$lib/server/workflow-template-instantiation';
import { getWorkflowTasks } from '$lib/server/workflows';

export type WorkflowFormValues = {
	name: string;
	summary: string;
	projectId: string;
	stepFields: Array<{
		title: string;
		desiredRoleId: string;
		summary: string;
		dependsOnStepPositions: number[];
		position: number;
	}>;
};

function parseDependencyPositions(value: string) {
	return [
		...new Set(
			value
				.split(',')
				.map((entry) => Number.parseInt(entry.trim(), 10))
				.filter((position) => Number.isInteger(position) && position > 0)
		)
	].sort((left, right) => left - right);
}

function readWorkflowStepFields(form: FormData) {
	const titles = form.getAll('stepTitle').map((value) => value.toString().trim());
	const desiredRoleIds = form.getAll('stepDesiredRoleId').map((value) => value.toString().trim());
	const summaries = form.getAll('stepSummary').map((value) => value.toString().trim());
	const dependencyPositions = form
		.getAll('stepDependsOnStepPositions')
		.map((value) => parseDependencyPositions(value.toString()));
	const maxLength = Math.max(
		titles.length,
		desiredRoleIds.length,
		summaries.length,
		dependencyPositions.length
	);

	if (maxLength === 0) {
		return [];
	}

	const stepFields: WorkflowFormValues['stepFields'] = [];

	for (let index = 0; index < maxLength; index += 1) {
		const title = titles[index] ?? '';
		const desiredRoleId = desiredRoleIds[index] ?? '';
		const summary = summaries[index] ?? '';
		const dependsOnStepPositions = dependencyPositions[index] ?? [];

		if (!title && !desiredRoleId && !summary && dependsOnStepPositions.length === 0) {
			continue;
		}

		stepFields.push({
			title,
			desiredRoleId,
			summary,
			dependsOnStepPositions,
			position: stepFields.length + 1
		});
	}

	return stepFields;
}

function buildWorkflowStepRecords(workflowId: string, steps: WorkflowFormValues['stepFields']) {
	const draftedSteps = steps.map((step) =>
		createWorkflowStep({
			workflowId,
			title: step.title,
			summary: step.summary,
			desiredRoleId: step.desiredRoleId,
			position: step.position
		})
	);
	const stepIdByPosition = new Map(draftedSteps.map((step) => [step.position, step.id]));

	return draftedSteps.map((step, index) => ({
		...step,
		dependsOnStepIds: steps[index]?.dependsOnStepPositions
			.map((position) => stepIdByPosition.get(position) ?? '')
			.filter(Boolean)
	}));
}

function readWorkflowForm(form: FormData): WorkflowFormValues {
	return {
		name: form.get('name')?.toString().trim() ?? '',
		summary: form.get('summary')?.toString().trim() ?? '',
		projectId: form.get('projectId')?.toString().trim() ?? '',
		stepFields: readWorkflowStepFields(form)
	};
}

export function buildWorkflowFormValues(values: WorkflowFormValues) {
	return {
		name: values.name,
		summary: values.summary,
		projectId: values.projectId,
		stepFields: values.stepFields
	};
}

function validateWorkflowValues(values: WorkflowFormValues) {
	if (!values.name || !values.summary || !values.projectId) {
		return 'Name, summary, and project are required.';
	}

	if (values.stepFields.length === 0) {
		return 'Add at least one workflow step.';
	}

	return null;
}

function findInvalidDependencyStep(steps: WorkflowFormValues['stepFields']) {
	return steps.find((step) =>
		step.dependsOnStepPositions.some((position) => position >= step.position)
	);
}

export async function createWorkflowFromFormData(formData: FormData) {
	const values = readWorkflowForm(formData);
	const validationMessage = validateWorkflowValues(values);

	if (validationMessage) {
		return fail(400, {
			message: validationMessage,
			values: buildWorkflowFormValues(values)
		});
	}

	const current = await loadControlPlane();
	const project = current.projects.find((candidate) => candidate.id === values.projectId) ?? null;
	const roleIds = new Set(current.roles.map((role) => role.id));
	const invalidStepRole = values.stepFields.find(
		(step) => step.desiredRoleId && !roleIds.has(step.desiredRoleId)
	);
	const duplicateWorkflow = (current.workflows ?? []).find(
		(workflow) =>
			workflow.projectId === values.projectId &&
			workflow.name.trim().toLowerCase() === values.name.toLowerCase()
	);

	if (!project) {
		return fail(400, {
			message: 'Project not found.',
			values: buildWorkflowFormValues(values)
		});
	}

	if (invalidStepRole) {
		return fail(400, {
			message: `Workflow step "${invalidStepRole.title}" references a missing role.`,
			values: buildWorkflowFormValues(values)
		});
	}

	if (duplicateWorkflow) {
		return fail(400, {
			message: 'A workflow with that name already exists for the selected project.',
			values: buildWorkflowFormValues(values)
		});
	}

	const invalidDependencyPosition = findInvalidDependencyStep(values.stepFields);

	if (invalidDependencyPosition) {
		return fail(400, {
			message: `Workflow step "${invalidDependencyPosition.title}" can only depend on earlier steps.`,
			values: buildWorkflowFormValues(values)
		});
	}

	const workflowRecord = createWorkflow({
		name: values.name,
		summary: values.summary,
		projectId: values.projectId
	});
	const workflowStepRecords = buildWorkflowStepRecords(workflowRecord.id, values.stepFields);

	await updateControlPlaneCollections((data) => ({
		data: {
			...data,
			workflows: [workflowRecord, ...(data.workflows ?? [])],
			workflowSteps: [...workflowStepRecords, ...(data.workflowSteps ?? [])]
		},
		changedCollections: ['workflows', 'workflowSteps']
	}));

	return {
		ok: true,
		successAction: 'createWorkflow',
		workflowId: workflowRecord.id
	};
}

export async function updateWorkflowFromFormData(formData: FormData, workflowIdOverride?: string) {
	const workflowId = workflowIdOverride ?? formData.get('workflowId')?.toString().trim() ?? '';
	const values = readWorkflowForm(formData);
	const validationMessage = validateWorkflowValues(values);

	if (!workflowId) {
		return fail(400, {
			message: 'Workflow ID is required.',
			workflowId,
			values: buildWorkflowFormValues(values)
		});
	}

	if (validationMessage) {
		return fail(400, {
			message: validationMessage,
			workflowId,
			values: buildWorkflowFormValues(values)
		});
	}

	const current = await loadControlPlane();
	const existingWorkflow =
		(current.workflows ?? []).find((workflow) => workflow.id === workflowId) ?? null;
	const roleIds = new Set(current.roles.map((role) => role.id));
	const invalidStepRole = values.stepFields.find(
		(step) => step.desiredRoleId && !roleIds.has(step.desiredRoleId)
	);
	const duplicateWorkflow = (current.workflows ?? []).find(
		(workflow) =>
			workflow.id !== workflowId &&
			workflow.projectId === values.projectId &&
			workflow.name.trim().toLowerCase() === values.name.toLowerCase()
	);

	if (!existingWorkflow) {
		return fail(404, {
			message: 'Workflow not found.',
			workflowId,
			values: buildWorkflowFormValues(values)
		});
	}

	if (existingWorkflow.projectId !== values.projectId) {
		return fail(400, {
			message: 'Workflow project cannot be changed after creation.',
			workflowId,
			values: buildWorkflowFormValues(values)
		});
	}

	if (invalidStepRole) {
		return fail(400, {
			message: `Workflow step "${invalidStepRole.title}" references a missing role.`,
			workflowId,
			values: buildWorkflowFormValues(values)
		});
	}

	if (duplicateWorkflow) {
		return fail(400, {
			message: 'A workflow with that name already exists for the selected project.',
			workflowId,
			values: buildWorkflowFormValues(values)
		});
	}

	const invalidDependencyPosition = findInvalidDependencyStep(values.stepFields);

	if (invalidDependencyPosition) {
		return fail(400, {
			message: `Workflow step "${invalidDependencyPosition.title}" can only depend on earlier steps.`,
			workflowId,
			values: buildWorkflowFormValues(values)
		});
	}

	const workflowStepRecords = buildWorkflowStepRecords(workflowId, values.stepFields);

	await updateControlPlaneCollections((data) => ({
		data: {
			...data,
			workflows: (data.workflows ?? []).map((workflow) =>
				workflow.id === workflowId
					? {
							...workflow,
							name: values.name,
							summary: values.summary,
							updatedAt: new Date().toISOString()
						}
					: workflow
			),
			workflowSteps: [
				...workflowStepRecords,
				...(data.workflowSteps ?? []).filter((step) => step.workflowId !== workflowId)
			]
		},
		changedCollections: ['workflows', 'workflowSteps']
	}));

	return {
		ok: true,
		successAction: 'updateWorkflow',
		workflowId
	};
}

export async function instantiateWorkflowFromFormData(
	formData: FormData,
	workflowIdOverride?: string
) {
	const workflowId = workflowIdOverride ?? formData.get('workflowId')?.toString().trim() ?? '';
	const taskName = formData.get('taskName')?.toString().trim() ?? '';
	const taskSummary = formData.get('taskSummary')?.toString().trim() ?? '';

	if (!workflowId || !taskName) {
		return fail(400, {
			message: 'Workflow and task name are required.'
		});
	}

	const current = await loadControlPlane();
	const plan = instantiateWorkflowTemplate(current, {
		workflowId,
		taskName,
		taskSummary
	});

	if (!plan.ok) {
		return fail(plan.status, {
			message: plan.message
		});
	}

	await updateControlPlaneCollections((data) => ({
		data: {
			...data,
			tasks: [...plan.nextTasks, ...data.tasks]
		},
		changedCollections: ['tasks']
	}));

	return {
		ok: true,
		successAction: 'instantiateWorkflow',
		parentTaskId: plan.parentTask.id,
		createdTaskCount: plan.nextTasks.length
	};
}

export async function deleteWorkflowFromFormData(formData: FormData, workflowIdOverride?: string) {
	const workflowId = workflowIdOverride ?? formData.get('workflowId')?.toString().trim() ?? '';

	if (!workflowId) {
		return fail(400, {
			message: 'Workflow ID is required.'
		});
	}

	const current = await loadControlPlane();
	const existingWorkflow =
		(current.workflows ?? []).find((workflow) => workflow.id === workflowId) ?? null;

	if (!existingWorkflow) {
		return fail(404, {
			message: 'Workflow not found.'
		});
	}

	if (getWorkflowTasks(current, workflowId).length > 0) {
		return fail(400, {
			message: 'Workflow cannot be deleted while generated tasks still point to it.'
		});
	}

	await updateControlPlaneCollections((data) => ({
		data: {
			...data,
			workflows: (data.workflows ?? []).filter((workflow) => workflow.id !== workflowId),
			workflowSteps: (data.workflowSteps ?? []).filter((step) => step.workflowId !== workflowId)
		},
		changedCollections: ['workflows', 'workflowSteps']
	}));

	return {
		ok: true,
		successAction: 'deleteWorkflow',
		workflowId
	};
}
