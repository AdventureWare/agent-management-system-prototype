import {
	createDecision,
	createTask,
	loadControlPlane,
	updateControlPlane
} from '$lib/server/control-plane';
import {
	applyGoalRelationships,
	getGoalLinkedProjectIds,
	getGoalLinkedTaskIds
} from '$lib/server/goal-relationships';
import { formatTaskStatusLabel, type ControlPlaneData } from '$lib/types/control-plane';

const MAX_DECOMPOSED_CHILD_TASKS = 3;
const DECOMPOSITION_TEMPLATE_SLOT_COUNT = 3;

type DecompositionTemplate = {
	title: string;
	instructions: string;
	desiredRoleId: string;
	delegationObjective: string;
	delegationExpectedDeliverable: string;
	delegationDoneCondition: string;
};

export class TaskDecompositionActionError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'TaskDecompositionActionError';
	}
}

function readTrimmedValue(value: FormDataEntryValue | null) {
	return value?.toString().trim() ?? '';
}

function readTemplateToggle(form: FormData, index: number) {
	return form.get(`decompositionEnabled${index}`)?.toString() === 'true';
}

function readTemplate(form: FormData, index: number): DecompositionTemplate {
	return {
		title: readTrimmedValue(form.get(`decompositionTitle${index}`)),
		instructions: readTrimmedValue(form.get(`decompositionInstructions${index}`)),
		desiredRoleId: readTrimmedValue(form.get(`decompositionDesiredRoleId${index}`)),
		delegationObjective: readTrimmedValue(form.get(`decompositionObjective${index}`)),
		delegationExpectedDeliverable: readTrimmedValue(
			form.get(`decompositionExpectedDeliverable${index}`)
		),
		delegationDoneCondition: readTrimmedValue(form.get(`decompositionDoneCondition${index}`))
	};
}

function readDecompositionTemplates(form: FormData) {
	return Array.from({ length: DECOMPOSITION_TEMPLATE_SLOT_COUNT }, (_, index) => index)
		.filter((index) => readTemplateToggle(form, index))
		.map((index) => ({
			index,
			template: readTemplate(form, index)
		}));
}

function buildDelegationInputContext(parentTask: {
	id: string;
	title: string;
	status: string;
	summary: string;
	successCriteria?: string;
}) {
	return [
		`Parent task: ${parentTask.title} (${parentTask.id})`,
		`Parent status: ${formatTaskStatusLabel(parentTask.status)}`,
		`Parent summary: ${parentTask.summary}`,
		parentTask.successCriteria?.trim()
			? `Parent success criteria: ${parentTask.successCriteria.trim()}`
			: ''
	]
		.filter(Boolean)
		.join('\n');
}

function buildDelegationIntegrationNotes(parentTask: { id: string; title: string }) {
	return [
		`Return the completed handoff to parent task "${parentTask.title}" (${parentTask.id}).`,
		'Flag unresolved risks, assumptions, or integration conflicts so the parent can decide whether follow-up is needed.'
	].join('\n');
}

function buildReadyCondition(parentTask: { title: string }) {
	return `The parent task "${parentTask.title}" has provided enough context to start and the delegated scope is clear.`;
}

function buildDecompositionDecisionSummary(parentTaskTitle: string, childTitles: string[]) {
	return `Decomposed parent task "${parentTaskTitle}" into ${childTitles.length} delegated child task${childTitles.length === 1 ? '' : 's'}: ${childTitles.join(', ')}.`;
}

export async function decomposeTaskFromParent(taskId: string, form: FormData) {
	const templates = readDecompositionTemplates(form);

	if (templates.length === 0) {
		throw new TaskDecompositionActionError(
			400,
			'Select at least one child template before decomposing this task.'
		);
	}

	if (templates.length > MAX_DECOMPOSED_CHILD_TASKS) {
		throw new TaskDecompositionActionError(
			400,
			`A task can only decompose into ${MAX_DECOMPOSED_CHILD_TASKS} child templates at once.`
		);
	}

	const current = await loadControlPlane();
	const parentTask = current.tasks.find((candidate) => candidate.id === taskId);

	if (!parentTask) {
		throw new TaskDecompositionActionError(404, 'Task not found.');
	}

	if (parentTask.status === 'done') {
		throw new TaskDecompositionActionError(
			409,
			'Completed tasks cannot create new delegated child tasks.'
		);
	}

	const existingChildCount = current.tasks.filter(
		(candidate) => candidate.parentTaskId === parentTask.id
	).length;

	if (existingChildCount + templates.length > MAX_DECOMPOSED_CHILD_TASKS) {
		throw new TaskDecompositionActionError(
			409,
			`This task already has ${existingChildCount} delegated child task${existingChildCount === 1 ? '' : 's'}. The current fan-out limit is ${MAX_DECOMPOSED_CHILD_TASKS}.`
		);
	}

	const project = current.projects.find((candidate) => candidate.id === parentTask.projectId);

	if (!project) {
		throw new TaskDecompositionActionError(400, 'Task project not found.');
	}

	const goal = parentTask.goalId
		? (current.goals.find((candidate) => candidate.id === parentTask.goalId) ?? null)
		: null;
	const delegationInputContext = buildDelegationInputContext(parentTask);
	const delegationIntegrationNotes = buildDelegationIntegrationNotes(parentTask);
	const readyCondition = buildReadyCondition(parentTask);

	for (const { index, template } of templates) {
		if (!template.title || !template.instructions) {
			throw new TaskDecompositionActionError(
				400,
				`Child template ${index + 1} needs both a title and a work brief.`
			);
		}

		if (!template.delegationObjective) {
			throw new TaskDecompositionActionError(
				400,
				`Child template ${index + 1} needs a delegation objective.`
			);
		}

		if (!template.delegationDoneCondition) {
			throw new TaskDecompositionActionError(
				400,
				`Child template ${index + 1} needs a done condition.`
			);
		}

		if (
			!template.desiredRoleId ||
			!current.roles.some((candidate) => candidate.id === template.desiredRoleId)
		) {
			throw new TaskDecompositionActionError(
				400,
				`Child template ${index + 1} needs a valid desired role.`
			);
		}
	}

	const now = new Date().toISOString();
	const createdTasks = templates.map(({ template }) =>
		createTask({
			title: template.title,
			summary: template.instructions,
			successCriteria: template.delegationDoneCondition,
			readyCondition,
			expectedOutcome: template.delegationExpectedDeliverable,
			projectId: parentTask.projectId,
			area: parentTask.area,
			goalId: goal?.id ?? '',
			parentTaskId: parentTask.id,
			delegationPacket: {
				objective: template.delegationObjective,
				inputContext: delegationInputContext,
				expectedDeliverable: template.delegationExpectedDeliverable,
				doneCondition: template.delegationDoneCondition,
				integrationNotes: delegationIntegrationNotes
			},
			priority: parentTask.priority,
			riskLevel: parentTask.riskLevel,
			approvalMode: parentTask.approvalMode,
			requiredThreadSandbox: parentTask.requiredThreadSandbox ?? null,
			requiresReview: parentTask.requiresReview,
			desiredRoleId: template.desiredRoleId,
			requiredCapabilityNames: parentTask.requiredCapabilityNames ?? [],
			requiredToolNames: parentTask.requiredToolNames ?? [],
			targetDate: parentTask.targetDate ?? null,
			artifactPath:
				parentTask.artifactPath || project.defaultArtifactRoot || project.projectRootFolder
		})
	);
	const decisionSummary = buildDecompositionDecisionSummary(
		parentTask.title,
		createdTasks.map((task) => `"${task.title}"`)
	);

	await updateControlPlane((data) => {
		let nextData: ControlPlaneData = {
			...data,
			tasks: [
				...createdTasks,
				...data.tasks.map((candidate) =>
					candidate.id === parentTask.id
						? {
								...candidate,
								updatedAt: now
							}
						: candidate
				)
			],
			decisions: [
				createDecision({
					taskId: parentTask.id,
					decisionType: 'task_decomposed',
					summary: decisionSummary,
					createdAt: now
				}),
				...(data.decisions ?? [])
			]
		};

		if (!goal) {
			return nextData;
		}

		const nextGoal = nextData.goals.find((candidate) => candidate.id === goal.id);

		if (!nextGoal) {
			return nextData;
		}

		nextData = applyGoalRelationships({
			data: nextData,
			goalId: nextGoal.id,
			parentGoalId: nextGoal.parentGoalId ?? null,
			projectIds: getGoalLinkedProjectIds(nextData, nextGoal),
			taskIds: getGoalLinkedTaskIds(nextData, nextGoal)
		});

		return nextData;
	});

	return {
		ok: true,
		successAction: 'decomposeTask' as const,
		taskId: parentTask.id,
		createdChildCount: createdTasks.length
	};
}
