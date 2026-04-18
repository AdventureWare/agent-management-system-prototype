import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createWorkflow,
	createWorkflowStep,
	loadControlPlane,
	updateControlPlaneCollections
} from '$lib/server/control-plane';
import {
	getWorkflowRollup,
	getWorkflowSteps,
	getWorkflowTasks,
	sortWorkflowsByName
} from '$lib/server/workflows';
import { instantiateWorkflowTemplate } from '$lib/server/workflow-template-instantiation';

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

	const stepFields: Array<{
		title: string;
		desiredRoleId: string;
		summary: string;
		dependsOnStepPositions: number[];
		position: number;
	}> = [];

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

function buildWorkflowStepRecords(
	workflowId: string,
	steps: Array<{
		title: string;
		desiredRoleId: string;
		summary: string;
		dependsOnStepPositions: number[];
		position: number;
	}>
) {
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

function readWorkflowForm(form: FormData) {
	const stepFields = readWorkflowStepFields(form);

	return {
		name: form.get('name')?.toString().trim() ?? '',
		summary: form.get('summary')?.toString().trim() ?? '',
		projectId: form.get('projectId')?.toString().trim() ?? '',
		stepFields
	};
}

function buildWorkflowFormValues(values: ReturnType<typeof readWorkflowForm>) {
	return {
		name: values.name,
		summary: values.summary,
		projectId: values.projectId,
		stepFields: values.stepFields
	};
}

export const load: PageServerLoad = async () => {
	const data = await loadControlPlane();
	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const roleMap = new Map(data.roles.map((role) => [role.id, role]));

	return {
		projects: [...data.projects].sort((a, b) => a.name.localeCompare(b.name)),
		roles: [...data.roles].sort((a, b) => a.name.localeCompare(b.name)),
		workflows: sortWorkflowsByName(data.workflows ?? []).map((workflow) => {
			const workflowTasks = getWorkflowTasks(data, workflow.id)
				.map((task) => ({
					id: task.id,
					title: task.title,
					status: task.status,
					projectName: projectMap.get(task.projectId)?.name ?? 'Unknown project'
				}))
				.sort((left, right) => left.title.localeCompare(right.title));
			const orderedWorkflowSteps = getWorkflowSteps(data, workflow.id);
			const workflowStepMap = new Map(orderedWorkflowSteps.map((step) => [step.id, step]));
			const workflowSteps = orderedWorkflowSteps.map((step) => ({
				...step,
				desiredRoleName: step.desiredRoleId
					? (roleMap.get(step.desiredRoleId)?.name ?? step.desiredRoleId)
					: '',
				dependsOnStepTitles: (step.dependsOnStepIds ?? [])
					.map((dependencyStepId) => {
						const dependencyStep = workflowStepMap.get(dependencyStepId);

						return dependencyStep
							? `Step ${dependencyStep.position} · ${dependencyStep.title}`
							: '';
					})
					.filter(Boolean),
				dependsOnStepPositions: (step.dependsOnStepIds ?? [])
					.map((dependencyStepId) => workflowStepMap.get(dependencyStepId)?.position ?? 0)
					.filter((position) => position > 0)
			}));

			return {
				...workflow,
				projectName: projectMap.get(workflow.projectId)?.name ?? 'Unknown project',
				rollup: getWorkflowRollup(data, workflow),
				steps: workflowSteps,
				taskPreview: workflowTasks.slice(0, 5)
			};
		})
	};
};

export const actions: Actions = {
	createWorkflow: async ({ request }) => {
		const values = readWorkflowForm(await request.formData());
		const steps = values.stepFields;

		if (!values.name || !values.summary || !values.projectId) {
			return fail(400, {
				message: 'Name, summary, and project are required.',
				values: buildWorkflowFormValues(values)
			});
		}

		if (steps.length === 0) {
			return fail(400, {
				message: 'Add at least one workflow step.',
				values: buildWorkflowFormValues(values)
			});
		}

		const current = await loadControlPlane();
		const project = current.projects.find((candidate) => candidate.id === values.projectId) ?? null;
		const roleIds = new Set(current.roles.map((role) => role.id));
		const invalidStepRole = steps.find(
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

		const workflowRecord = createWorkflow({
			name: values.name,
			summary: values.summary,
			projectId: values.projectId
		});
		const invalidDependencyPosition = steps.find((step) =>
			step.dependsOnStepPositions.some((position) => position >= step.position)
		);

		if (invalidDependencyPosition) {
			return fail(400, {
				message: `Workflow step "${invalidDependencyPosition.title}" can only depend on earlier steps.`,
				values: buildWorkflowFormValues(values)
			});
		}

		const workflowStepRecords = buildWorkflowStepRecords(workflowRecord.id, steps);

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
			successAction: 'createWorkflow'
		};
	},

	updateWorkflow: async ({ request }) => {
		const form = await request.formData();
		const workflowId = form.get('workflowId')?.toString().trim() ?? '';
		const values = readWorkflowForm(form);
		const steps = values.stepFields;

		if (!workflowId) {
			return fail(400, {
				message: 'Workflow ID is required.',
				workflowId,
				values: buildWorkflowFormValues(values)
			});
		}

		if (!values.name || !values.summary || !values.projectId) {
			return fail(400, {
				message: 'Name, summary, and project are required.',
				workflowId,
				values: buildWorkflowFormValues(values)
			});
		}

		if (steps.length === 0) {
			return fail(400, {
				message: 'Add at least one workflow step.',
				workflowId,
				values: buildWorkflowFormValues(values)
			});
		}

		const current = await loadControlPlane();
		const existingWorkflow =
			(current.workflows ?? []).find((workflow) => workflow.id === workflowId) ?? null;
		const roleIds = new Set(current.roles.map((role) => role.id));
		const invalidStepRole = steps.find(
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

		const invalidDependencyPosition = steps.find((step) =>
			step.dependsOnStepPositions.some((position) => position >= step.position)
		);

		if (invalidDependencyPosition) {
			return fail(400, {
				message: `Workflow step "${invalidDependencyPosition.title}" can only depend on earlier steps.`,
				workflowId,
				values: buildWorkflowFormValues(values)
			});
		}

		const workflowStepRecords = buildWorkflowStepRecords(workflowId, steps);

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
	},

	instantiateWorkflow: async ({ request }) => {
		const form = await request.formData();
		const workflowId = form.get('workflowId')?.toString().trim() ?? '';
		const taskName = form.get('taskName')?.toString().trim() ?? '';
		const taskSummary = form.get('taskSummary')?.toString().trim() ?? '';

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
	},

	deleteWorkflow: async ({ request }) => {
		const form = await request.formData();
		const workflowId = form.get('workflowId')?.toString().trim() ?? '';

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
};
