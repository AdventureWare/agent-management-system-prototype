import { createTask } from '$lib/server/control-plane';
import { getWorkflowSteps } from '$lib/server/workflows';
import type { ControlPlaneData, Project, Task, Workflow } from '$lib/types/control-plane';

type WorkflowTemplateInstantiationFailure = {
	ok: false;
	status: 400 | 404;
	message: string;
};

type WorkflowTemplateInstantiationSuccess = {
	ok: true;
	workflow: Workflow;
	project: Project;
	parentTask: Task;
	linkedTasks: Task[];
	nextTasks: Task[];
};

export type WorkflowTemplateInstantiationResult =
	| WorkflowTemplateInstantiationFailure
	| WorkflowTemplateInstantiationSuccess;

function buildGeneratedStepSummary(
	parentTaskTitle: string,
	workflowName: string,
	step: { title: string; summary: string }
) {
	if (step.summary) {
		return `${step.summary}\n\nWorkflow template: ${workflowName}\nParent task: ${parentTaskTitle}`;
	}

	return `Complete the "${step.title}" step for ${parentTaskTitle} using the ${workflowName} workflow template.`;
}

export function instantiateWorkflowTemplate(
	data: ControlPlaneData,
	input: {
		workflowId: string;
		taskName: string;
		taskSummary: string;
		targetProjectId?: string;
	}
): WorkflowTemplateInstantiationResult {
	const workflow =
		(data.workflows ?? []).find((candidate) => candidate.id === input.workflowId) ?? null;
	const workflowSteps = getWorkflowSteps(data, input.workflowId);
	const targetProjectId = input.targetProjectId?.trim() || workflow?.projectId || '';
	const project = workflow
		? (data.projects.find((candidate) => candidate.id === targetProjectId) ?? null)
		: null;

	if (!workflow || !project) {
		return {
			ok: false,
			status: 404,
			message: 'Workflow template not found.'
		};
	}

	if (workflowSteps.length === 0) {
		return {
			ok: false,
			status: 400,
			message: 'Workflow template does not have any steps yet.'
		};
	}

	const artifactPath = project.defaultArtifactRoot || project.projectRootFolder || '';
	const parentTask = createTask({
		title: input.taskName,
		summary: input.taskSummary || `Instantiated from workflow template "${workflow.name}".`,
		projectId: project.id,
		area: 'product',
		goalId: '',
		workflowId: workflow.id,
		priority: 'medium',
		riskLevel: 'medium',
		approvalMode: 'none',
		requiresReview: false,
		desiredRoleId: '',
		status: 'in_draft',
		artifactPath
	});

	const generatedTasks = workflowSteps.map((step) =>
		createTask({
			title: `${input.taskName}: ${step.title}`,
			summary: buildGeneratedStepSummary(input.taskName, workflow.name, step),
			projectId: project.id,
			area: 'product',
			goalId: '',
			workflowId: workflow.id,
			parentTaskId: parentTask.id,
			delegationPacket: {
				objective: step.summary || `Complete the ${step.title} step for ${input.taskName}.`,
				inputContext: input.taskSummary,
				expectedDeliverable: `Completed step output for ${step.title}.`,
				doneCondition: `Finish the ${step.title} step for ${input.taskName}.`,
				integrationNotes: `Report completion back to parent task ${parentTask.title}.`
			},
			priority: 'medium',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiresReview: true,
			desiredRoleId: step.desiredRoleId,
			dependencyTaskIds: [],
			artifactPath
		})
	);

	const taskIdByWorkflowStepId = new Map(
		workflowSteps.map((step, index) => [step.id, generatedTasks[index]?.id ?? ''])
	);
	const linkedTasks = generatedTasks.map((task, index) => {
		const step = workflowSteps[index];
		const dependencyTaskIds = (step?.dependsOnStepIds ?? [])
			.map((dependencyStepId) => taskIdByWorkflowStepId.get(dependencyStepId) ?? '')
			.filter(Boolean);

		return {
			...task,
			dependencyTaskIds
		};
	});

	return {
		ok: true,
		workflow,
		project,
		parentTask,
		linkedTasks,
		nextTasks: [parentTask, ...linkedTasks]
	};
}
