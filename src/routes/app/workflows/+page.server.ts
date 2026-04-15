import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createWorkflow,
	loadControlPlane,
	updateControlPlaneCollections
} from '$lib/server/control-plane';
import { getWorkflowRollup, getWorkflowTasks, sortWorkflowsByName } from '$lib/server/workflows';
import {
	WORKFLOW_KIND_OPTIONS,
	type WorkflowKind,
	type WorkflowStatus
} from '$lib/types/control-plane';

function isValidDate(value: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseWorkflowKind(value: string): WorkflowKind {
	return WORKFLOW_KIND_OPTIONS.includes(value as WorkflowKind) ? (value as WorkflowKind) : 'ad_hoc';
}

function parseManualWorkflowStatus(value: string): WorkflowStatus | null {
	switch (value) {
		case 'draft':
		case 'active':
		case 'done':
		case 'canceled':
			return value;
		default:
			return null;
	}
}

function readWorkflowForm(form: FormData) {
	return {
		name: form.get('name')?.toString().trim() ?? '',
		summary: form.get('summary')?.toString().trim() ?? '',
		projectId: form.get('projectId')?.toString().trim() ?? '',
		goalId: form.get('goalId')?.toString().trim() ?? '',
		kind: parseWorkflowKind(form.get('kind')?.toString().trim() ?? ''),
		targetDate: form.get('targetDate')?.toString().trim() ?? ''
	};
}

function buildWorkflowFormValues(values: ReturnType<typeof readWorkflowForm>) {
	return {
		name: values.name,
		summary: values.summary,
		projectId: values.projectId,
		goalId: values.goalId,
		kind: values.kind,
		targetDate: values.targetDate
	};
}

function getLinkedWorkflowTasks(
	data: Awaited<ReturnType<typeof loadControlPlane>>,
	workflowId: string
) {
	return data.tasks.filter((task) => task.workflowId === workflowId);
}

export const load: PageServerLoad = async () => {
	const data = await loadControlPlane();
	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const goalMap = new Map(data.goals.map((goal) => [goal.id, goal]));

	return {
		projects: [...data.projects].sort((a, b) => a.name.localeCompare(b.name)),
		goals: [...data.goals]
			.map((goal) => ({
				id: goal.id,
				name: goal.name,
				label: goal.parentGoalId ? `${goal.name} (${goal.parentGoalId})` : goal.name
			}))
			.sort((a, b) => a.name.localeCompare(b.name)),
		workflowKindOptions: WORKFLOW_KIND_OPTIONS,
		workflows: sortWorkflowsByName(data.workflows ?? []).map((workflow) => {
			const workflowTasks = getWorkflowTasks(data, workflow.id)
				.map((task) => ({
					id: task.id,
					title: task.title,
					status: task.status,
					projectName: projectMap.get(task.projectId)?.name ?? 'Unknown project'
				}))
				.sort((left, right) => left.title.localeCompare(right.title));

			return {
				...workflow,
				projectName: projectMap.get(workflow.projectId)?.name ?? 'Unknown project',
				goalName: workflow.goalId ? (goalMap.get(workflow.goalId)?.name ?? 'Unknown goal') : '',
				rollup: getWorkflowRollup(data, workflow),
				taskPreview: workflowTasks.slice(0, 5)
			};
		})
	};
};

export const actions: Actions = {
	createWorkflow: async ({ request }) => {
		const values = readWorkflowForm(await request.formData());

		if (!values.name || !values.summary || !values.projectId) {
			return fail(400, {
				message: 'Name, summary, and project are required.',
				values: buildWorkflowFormValues(values)
			});
		}

		if (values.targetDate && !isValidDate(values.targetDate)) {
			return fail(400, {
				message: 'Target date must use YYYY-MM-DD.',
				values: buildWorkflowFormValues(values)
			});
		}

		const current = await loadControlPlane();
		const project = current.projects.find((candidate) => candidate.id === values.projectId) ?? null;
		const goal = values.goalId
			? (current.goals.find((candidate) => candidate.id === values.goalId) ?? null)
			: null;
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

		if (values.goalId && !goal) {
			return fail(400, {
				message: 'Goal not found.',
				values: buildWorkflowFormValues(values)
			});
		}

		if (duplicateWorkflow) {
			return fail(400, {
				message: 'A workflow with that name already exists for the selected project.',
				values: buildWorkflowFormValues(values)
			});
		}

		await updateControlPlaneCollections((data) => ({
			data: {
				...data,
				workflows: [
					createWorkflow({
						name: values.name,
						summary: values.summary,
						projectId: values.projectId,
						goalId: values.goalId || null,
						kind: values.kind,
						targetDate: values.targetDate || null
					}),
					...(data.workflows ?? [])
				]
			},
			changedCollections: ['workflows']
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

		if (!workflowId) {
			return fail(400, {
				message: 'Workflow ID is required.',
				values: buildWorkflowFormValues(values)
			});
		}

		if (!values.name || !values.summary || !values.projectId) {
			return fail(400, {
				message: 'Name, summary, and project are required.',
				values: buildWorkflowFormValues(values)
			});
		}

		if (values.targetDate && !isValidDate(values.targetDate)) {
			return fail(400, {
				message: 'Target date must use YYYY-MM-DD.',
				values: buildWorkflowFormValues(values)
			});
		}

		const current = await loadControlPlane();
		const existingWorkflow =
			(current.workflows ?? []).find((workflow) => workflow.id === workflowId) ?? null;
		const goal = values.goalId
			? (current.goals.find((candidate) => candidate.id === values.goalId) ?? null)
			: null;
		const duplicateWorkflow = (current.workflows ?? []).find(
			(workflow) =>
				workflow.id !== workflowId &&
				workflow.projectId === values.projectId &&
				workflow.name.trim().toLowerCase() === values.name.toLowerCase()
		);

		if (!existingWorkflow) {
			return fail(404, {
				message: 'Workflow not found.',
				values: buildWorkflowFormValues(values)
			});
		}

		if (existingWorkflow.projectId !== values.projectId) {
			return fail(400, {
				message: 'Workflow project cannot be changed after creation.',
				values: buildWorkflowFormValues(values)
			});
		}

		if (values.goalId && !goal) {
			return fail(400, {
				message: 'Goal not found.',
				values: buildWorkflowFormValues(values)
			});
		}

		if (duplicateWorkflow) {
			return fail(400, {
				message: 'A workflow with that name already exists for the selected project.',
				values: buildWorkflowFormValues(values)
			});
		}

		if (
			values.goalId &&
			current.tasks.some(
				(task) => task.workflowId === workflowId && task.goalId && task.goalId !== values.goalId
			)
		) {
			return fail(400, {
				message:
					'This workflow already has linked tasks with a different goal. Move those tasks first or keep the existing workflow goal.',
				values: buildWorkflowFormValues(values)
			});
		}

		let workflowUpdated = false;

		await updateControlPlaneCollections((data) => ({
			data: {
				...data,
				workflows: (data.workflows ?? []).map((workflow) => {
					if (workflow.id !== workflowId) {
						return workflow;
					}

					workflowUpdated = true;

					return {
						...workflow,
						name: values.name,
						summary: values.summary,
						goalId: values.goalId || null,
						kind: values.kind,
						targetDate: values.targetDate || null,
						updatedAt: new Date().toISOString()
					};
				})
			},
			changedCollections: ['workflows']
		}));

		if (!workflowUpdated) {
			return fail(404, {
				message: 'Workflow not found.',
				values: buildWorkflowFormValues(values)
			});
		}

		return {
			ok: true,
			successAction: 'updateWorkflow',
			workflowId
		};
	},

	setWorkflowStatus: async ({ request }) => {
		const form = await request.formData();
		const workflowId = form.get('workflowId')?.toString().trim() ?? '';
		const targetStatus = parseManualWorkflowStatus(form.get('status')?.toString().trim() ?? '');

		if (!workflowId || !targetStatus) {
			return fail(400, {
				message: 'Workflow ID and a valid status are required.'
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

		const linkedTasks = getLinkedWorkflowTasks(current, workflowId);

		if (targetStatus === 'done' && linkedTasks.some((task) => task.status !== 'done')) {
			return fail(400, {
				message: 'Workflow can only be marked done after every linked task is done.'
			});
		}

		await updateControlPlaneCollections((data) => ({
			data: {
				...data,
				workflows: (data.workflows ?? []).map((workflow) =>
					workflow.id === workflowId
						? {
								...workflow,
								status: targetStatus,
								updatedAt: new Date().toISOString()
							}
						: workflow
				)
			},
			changedCollections: ['workflows']
		}));

		return {
			ok: true,
			successAction: 'setWorkflowStatus',
			workflowId,
			status: targetStatus
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

		if (getLinkedWorkflowTasks(current, workflowId).length > 0) {
			return fail(400, {
				message: 'Workflow cannot be deleted while linked tasks still point to it.'
			});
		}

		await updateControlPlaneCollections((data) => ({
			data: {
				...data,
				workflows: (data.workflows ?? []).filter((workflow) => workflow.id !== workflowId)
			},
			changedCollections: ['workflows']
		}));

		return {
			ok: true,
			successAction: 'deleteWorkflow',
			workflowId
		};
	}
};
