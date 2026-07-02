import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import type { ControlPlaneCollection } from '$lib/server/db/control-plane-store';
import {
	buildRunEvidenceProgressPreview,
	buildRunResultPreview
} from '$lib/server/goal-run-result-preview';
import {
	createDecision,
	createReview,
	createTask,
	getOpenReviewForTask,
	loadControlPlane,
	parseRunStatus,
	updateControlPlaneCollections
} from '$lib/server/control-plane';
import type { ControlPlaneData, Run, Task } from '$lib/types/control-plane';

export const AGENT_RUN_RESULT_COMMANDS = [
	'record_run_result',
	'record_validation_result',
	'record_blocker',
	'record_followup_recommendations',
	'create_followup_task',
	'request_review_from_run',
	'mark_task_blocked_from_run',
	'preview_progress_updates',
	'apply_progress_updates'
] as const;

export type AgentRunResultCommand = (typeof AGENT_RUN_RESULT_COMMANDS)[number];

export type AgentRunResultInput = {
	command: string | null | undefined;
	runId?: string | null;
	status?: string | null;
	summary?: string | null;
	actionsTaken?: string | null;
	validationSummary?: string | null;
	resultSummary?: string | null;
	errorSummary?: string | null;
	title?: string | null;
	successCriteria?: string | null;
	readyCondition?: string | null;
	expectedOutcome?: string | null;
	scope?: string | null;
	nonGoals?: string | null;
	validationSteps?: string | null;
	blocker?: string | null;
	validateOnly?: boolean;
	selectedProposalIndexes?: unknown;
	blockersFound?: unknown;
	followUpTaskIds?: unknown;
	artifactPaths?: unknown;
};

export type AgentRunResultRecord = {
	command: AgentRunResultCommand;
	run: Run;
	preview: ReturnType<typeof buildRunResultPreview>;
	safety: {
		mutation:
			| 'run_evidence_only'
			| 'run_evidence_and_draft_task'
			| 'task_review_request'
			| 'task_blocked_update'
			| 'reviewed_progress_update'
			| 'none';
		taskStateChanged: boolean;
		reviewStateChanged: boolean;
		approvalStateChanged: false;
		note: string;
	};
	task?: Task | null;
	reviewId?: string | null;
	createdTask?: boolean;
	dedupedExistingTask?: boolean;
	validationOnly?: boolean;
	wouldExecuteCommands?: string[];
	appliedUpdates?: Array<{
		resource: 'project' | 'goal';
		id: string;
		field: string;
		evidenceIds: string[];
	}>;
	readbackCommands?: string[];
	suggestedNextCommands: string[];
};

type AgentRunResultApplyResult = {
	data: ControlPlaneData;
	record: AgentRunResultRecord;
	changedCollections: ControlPlaneCollection[];
};

function normalizeCommand(command: string | null | undefined): AgentRunResultCommand {
	const normalized = command?.trim() ?? '';

	if (AGENT_RUN_RESULT_COMMANDS.includes(normalized as AgentRunResultCommand)) {
		return normalized as AgentRunResultCommand;
	}

	throw new AgentControlPlaneApiError(404, 'Unknown run-result command.', {
		code: 'run_result_command_unknown',
		suggestedNextCommands: ['manifest --resource run-result'],
		details: { command }
	});
}

function requireId(value: string | null | undefined, fieldName: string) {
	const normalized = value?.trim() ?? '';

	if (!normalized) {
		throw new AgentControlPlaneApiError(400, `${fieldName} is required.`, {
			code: 'run_result_required_field_missing',
			suggestedNextCommands: ['context:current', 'run-result:record_run_result'],
			details: { fieldName }
		});
	}

	return normalized;
}

function normalizeOptionalString(value: string | null | undefined) {
	const normalized = value?.trim() ?? '';
	return normalized || null;
}

function hasSimilarText(existing: string | null | undefined, proposed: string) {
	const normalizedExisting = existing?.trim().replace(/\s+/g, ' ').toLowerCase() ?? '';
	const normalizedProposed = proposed.trim().replace(/\s+/g, ' ').toLowerCase();

	if (!normalizedExisting || !normalizedProposed) {
		return false;
	}

	const proposedSnippet = normalizedProposed.slice(0, 120);
	const existingSnippet = normalizedExisting.slice(0, 120);

	return (
		normalizedExisting.includes(proposedSnippet) ||
		normalizedProposed.includes(existingSnippet) ||
		normalizedExisting.includes(normalizedProposed.slice(0, 80))
	);
}

function normalizeStringList(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value
			.filter((entry): entry is string => typeof entry === 'string')
			.map((entry) => entry.trim())
			.filter(Boolean);
	}

	if (typeof value === 'string') {
		return value
			.split(/\r?\n|,/)
			.map((entry) => entry.trim())
			.filter(Boolean);
	}

	return [];
}

function uniqueStrings(...values: string[][]) {
	return [
		...new Set(
			values
				.flat()
				.map((value) => value.trim())
				.filter(Boolean)
		)
	];
}

function hasEvidencePatch(patch: Partial<Run>) {
	return [
		'summary',
		'actionsTaken',
		'validationSummary',
		'resultSummary',
		'errorSummary',
		'status',
		'artifactPaths',
		'blockersFound',
		'followUpTaskIds'
	].some((fieldName) => fieldName in patch);
}

function buildPatch(command: AgentRunResultCommand, run: Run, input: AgentRunResultInput) {
	const patch: Partial<Run> = {};
	const summary = normalizeOptionalString(input.summary);
	const actionsTaken = normalizeOptionalString(input.actionsTaken);
	const validationSummary = normalizeOptionalString(input.validationSummary);
	const resultSummary = normalizeOptionalString(input.resultSummary);
	const errorSummary = normalizeOptionalString(input.errorSummary);
	const blocker = normalizeOptionalString(input.blocker);
	const blockersFound = uniqueStrings(
		run.blockersFound ?? [],
		normalizeStringList(input.blockersFound)
	);
	const followUpTaskIds = uniqueStrings(
		run.followUpTaskIds ?? [],
		normalizeStringList(input.followUpTaskIds)
	);
	const artifactPaths = uniqueStrings(
		run.artifactPaths ?? [],
		normalizeStringList(input.artifactPaths)
	);

	if (input.status) {
		patch.status = parseRunStatus(input.status, run.status);
	}

	if (summary) patch.summary = summary;
	if (actionsTaken) patch.actionsTaken = actionsTaken;
	if (validationSummary) patch.validationSummary = validationSummary;
	if (resultSummary) patch.resultSummary = resultSummary;
	if (errorSummary) patch.errorSummary = errorSummary;
	if (artifactPaths.length > (run.artifactPaths ?? []).length) patch.artifactPaths = artifactPaths;

	if (command === 'record_validation_result' && !validationSummary) {
		throw new AgentControlPlaneApiError(400, 'validationSummary is required.', {
			code: 'run_result_validation_summary_required',
			suggestedNextCommands: ['run-result:record_run_result'],
			details: { runId: run.id }
		});
	}

	if (command === 'record_blocker') {
		const nextBlockers = uniqueStrings(blockersFound, blocker ? [blocker] : []);

		if (nextBlockers.length === (run.blockersFound ?? []).length) {
			throw new AgentControlPlaneApiError(400, 'blocker or blockersFound is required.', {
				code: 'run_result_blocker_required',
				suggestedNextCommands: ['run-result:record_run_result'],
				details: { runId: run.id }
			});
		}

		patch.blockersFound = nextBlockers;
		patch.status = 'blocked';
	}

	if (command !== 'record_blocker' && blockersFound.length > (run.blockersFound ?? []).length) {
		patch.blockersFound = blockersFound;
	}

	if (
		command === 'record_followup_recommendations' &&
		followUpTaskIds.length === (run.followUpTaskIds ?? []).length &&
		!resultSummary
	) {
		throw new AgentControlPlaneApiError(400, 'followUpTaskIds or resultSummary is required.', {
			code: 'run_result_followup_required',
			suggestedNextCommands: ['task:create', 'run-result:record_run_result'],
			details: { runId: run.id }
		});
	}

	if (followUpTaskIds.length > (run.followUpTaskIds ?? []).length) {
		patch.followUpTaskIds = followUpTaskIds;
	}

	if (!hasEvidencePatch(patch)) {
		throw new AgentControlPlaneApiError(400, 'At least one run evidence field is required.', {
			code: 'run_result_empty_patch',
			suggestedNextCommands: ['run-result:record_run_result'],
			details: { runId: run.id }
		});
	}

	return patch;
}

function buildRecordResponse(input: {
	command: AgentRunResultCommand;
	run: Run;
	preview: ReturnType<typeof buildRunResultPreview>;
	task?: Task | null;
	createdTask?: boolean;
	dedupedExistingTask?: boolean;
}): AgentRunResultRecord {
	const {
		command,
		run,
		preview,
		task = null,
		createdTask = false,
		dedupedExistingTask = false
	} = input;
	const createdOrLinkedTask = Boolean(task);

	return {
		command,
		run,
		preview,
		safety: {
			mutation: createdTask ? 'run_evidence_and_draft_task' : 'run_evidence_only',
			taskStateChanged: createdTask,
			reviewStateChanged: false,
			approvalStateChanged: false,
			note: createdTask
				? 'This operation created a draft follow-up task and linked it to run evidence. It did not accept work or change review/approval state.'
				: 'This operation records run evidence only. Apply task, review, approval, or follow-up mutations separately through their structured tools.'
		},
		...(createdOrLinkedTask ? { task, createdTask, dedupedExistingTask } : {}),
		suggestedNextCommands: [
			'run-result:record_run_result',
			...(preview?.nextAction === 'request_review' ? ['task:request-review'] : []),
			...(command === 'record_followup_recommendations' ||
			command === 'create_followup_task' ||
			preview?.nextAction === 'create_follow_up_task'
				? ['task:create']
				: []),
			...(createdOrLinkedTask ? ['task:get'] : []),
			...(preview?.nextAction === 'resolve_blocker' ? ['task:update'] : []),
			'context:current'
		]
	};
}

export function applyAgentRunResultToData(
	data: ControlPlaneData,
	input: AgentRunResultInput
): AgentRunResultApplyResult {
	const command = normalizeCommand(input.command);
	const runId = requireId(input.runId, 'runId');
	const existingRun = data.runs.find((candidate) => candidate.id === runId) ?? null;

	if (!existingRun) {
		throw new AgentControlPlaneApiError(404, 'Run not found.', {
			code: 'run_not_found',
			suggestedNextCommands: ['context:current', 'task:get'],
			details: { runId }
		});
	}

	const task = data.tasks.find((candidate) => candidate.id === existingRun.taskId) ?? null;

	if (!task) {
		throw new AgentControlPlaneApiError(404, 'Linked task not found for run.', {
			code: 'run_task_not_found',
			suggestedNextCommands: ['task:list', 'context:current'],
			details: { runId, taskId: existingRun.taskId }
		});
	}

	if (command === 'create_followup_task') {
		return applyFollowupTaskCreation(data, {
			input,
			run: existingRun,
			sourceTask: task
		});
	}

	if (command === 'request_review_from_run') {
		return applyReviewRequestFromRun(data, {
			input,
			run: existingRun,
			sourceTask: task
		});
	}

	if (command === 'mark_task_blocked_from_run') {
		return applyBlockedTaskFromRun(data, {
			input,
			run: existingRun,
			sourceTask: task
		});
	}

	if (command === 'preview_progress_updates') {
		const preview = buildRunResultPreview(data, { runId });

		return {
			data,
			record: {
				command,
				run: existingRun,
				preview,
				task,
				validationOnly: true,
				wouldExecuteCommands: [],
				safety: {
					mutation: 'none',
					taskStateChanged: false,
					reviewStateChanged: false,
					approvalStateChanged: false,
					note: 'Preview only. This operation does not edit project memory, decision logs, goal state, tasks, reviews, or approvals.'
				},
				suggestedNextCommands: [
					'project:get',
					'goal-loop:get_goal_progress',
					'task:get',
					'context:current'
				]
			},
			changedCollections: []
		};
	}

	if (command === 'apply_progress_updates') {
		return applyReviewedProgressUpdates(data, {
			input,
			run: existingRun,
			sourceTask: task
		});
	}

	const patch = buildPatch(command, existingRun, input);
	const updatedRun = {
		...existingRun,
		...patch,
		updatedAt: new Date().toISOString()
	};
	const nextData = {
		...data,
		runs: data.runs.map((candidate) => (candidate.id === runId ? updatedRun : candidate))
	};
	const preview = buildRunResultPreview(nextData, { runId });

	return {
		data: nextData,
		record: buildRecordResponse({
			command,
			run: updatedRun,
			preview
		}),
		changedCollections: ['runs']
	};
}

function normalizeTitle(value: string | null | undefined) {
	return value?.trim().replace(/\s+/g, ' ') ?? '';
}

function findDuplicateFollowupTask(data: ControlPlaneData, sourceTask: Task, title: string) {
	const normalizedTitle = title.toLowerCase();

	return (
		data.tasks.find(
			(candidate) =>
				candidate.status !== 'done' &&
				candidate.projectId === sourceTask.projectId &&
				(candidate.goalId || '') === (sourceTask.goalId || '') &&
				candidate.title.trim().toLowerCase() === normalizedTitle
		) ?? null
	);
}

function appendTaskToGoal(data: ControlPlaneData, task: Task) {
	if (!task.goalId) {
		return data.goals;
	}

	return data.goals.map((goal) =>
		goal.id === task.goalId
			? {
					...goal,
					taskIds: uniqueStrings(goal.taskIds ?? [], [task.id])
				}
			: goal
	);
}

function buildFollowupSummary(input: AgentRunResultInput, run: Run, sourceTask: Task) {
	const explicitSummary = normalizeOptionalString(input.summary);

	if (explicitSummary) {
		return explicitSummary;
	}

	return [
		`Follow-up from run ${run.id} for task ${sourceTask.id}: ${sourceTask.title}.`,
		normalizeOptionalString(run.resultSummary),
		normalizeOptionalString(run.validationSummary)
	]
		.filter(Boolean)
		.join(' ');
}

function applyFollowupTaskCreation(
	data: ControlPlaneData,
	input: {
		input: AgentRunResultInput;
		run: Run;
		sourceTask: Task;
	}
): AgentRunResultApplyResult {
	const title = normalizeTitle(input.input.title);

	if (!title) {
		throw new AgentControlPlaneApiError(400, 'title is required for follow-up task creation.', {
			code: 'run_result_followup_title_required',
			suggestedNextCommands: ['run-result:record_followup_recommendations'],
			details: { runId: input.run.id }
		});
	}

	const duplicateTask = findDuplicateFollowupTask(data, input.sourceTask, title);
	const now = new Date().toISOString();

	if (duplicateTask) {
		const updatedRun = {
			...input.run,
			followUpTaskIds: uniqueStrings(input.run.followUpTaskIds ?? [], [duplicateTask.id]),
			updatedAt: now
		};
		const nextData = {
			...data,
			runs: data.runs.map((candidate) => (candidate.id === updatedRun.id ? updatedRun : candidate))
		};

		return {
			data: nextData,
			record: buildRecordResponse({
				command: 'create_followup_task',
				run: updatedRun,
				preview: buildRunResultPreview(nextData, { runId: updatedRun.id }),
				task: duplicateTask,
				createdTask: false,
				dedupedExistingTask: true
			}),
			changedCollections: ['runs']
		};
	}

	const followupTask = createTask({
		title,
		summary: buildFollowupSummary(input.input, input.run, input.sourceTask),
		successCriteria: normalizeOptionalString(input.input.successCriteria) ?? '',
		readyCondition: normalizeOptionalString(input.input.readyCondition) ?? '',
		expectedOutcome: normalizeOptionalString(input.input.expectedOutcome) ?? '',
		scope: normalizeOptionalString(input.input.scope) ?? '',
		nonGoals: normalizeOptionalString(input.input.nonGoals) ?? '',
		validationSteps: normalizeOptionalString(input.input.validationSteps) ?? '',
		readinessLevel: 'R1_FRAMED',
		autonomyLevel: 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE',
		reviewRequirement: 'SUMMARY_REVIEW',
		projectId: input.sourceTask.projectId,
		goalId: input.sourceTask.goalId || '',
		area: input.sourceTask.area,
		priority: 'medium',
		status: 'in_draft',
		riskLevel: 'medium',
		approvalMode: 'none',
		requiresReview: true,
		desiredRoleId: '',
		artifactPath: input.sourceTask.artifactPath
	});
	const updatedRun = {
		...input.run,
		followUpTaskIds: uniqueStrings(input.run.followUpTaskIds ?? [], [followupTask.id]),
		updatedAt: now
	};
	const nextData = {
		...data,
		tasks: [followupTask, ...data.tasks],
		runs: data.runs.map((candidate) => (candidate.id === updatedRun.id ? updatedRun : candidate)),
		goals: appendTaskToGoal(data, followupTask)
	};

	return {
		data: nextData,
		record: buildRecordResponse({
			command: 'create_followup_task',
			run: updatedRun,
			preview: buildRunResultPreview(nextData, { runId: updatedRun.id }),
			task: followupTask,
			createdTask: true,
			dedupedExistingTask: false
		}),
		changedCollections: ['tasks', 'runs', 'goals']
	};
}

function buildTransitionPreviewRecord(input: {
	command: AgentRunResultCommand;
	run: Run;
	task: Task;
	preview: ReturnType<typeof buildRunResultPreview>;
	mutation: 'task_review_request' | 'task_blocked_update';
	note: string;
	wouldExecuteCommands: string[];
}): AgentRunResultRecord {
	return {
		command: input.command,
		run: input.run,
		preview: input.preview,
		task: input.task,
		validationOnly: true,
		wouldExecuteCommands: input.wouldExecuteCommands,
		safety: {
			mutation: input.mutation,
			taskStateChanged: false,
			reviewStateChanged: false,
			approvalStateChanged: false,
			note: input.note
		},
		suggestedNextCommands: [`run-result:${input.command}`, 'task:get', 'context:current']
	};
}

function applyReviewRequestFromRun(
	data: ControlPlaneData,
	input: {
		input: AgentRunResultInput;
		run: Run;
		sourceTask: Task;
	}
): AgentRunResultApplyResult {
	if (input.run.status !== 'completed') {
		throw new AgentControlPlaneApiError(409, 'Run must be completed before requesting review.', {
			code: 'run_result_run_not_completed',
			suggestedNextCommands: ['run-result:record_run_result', 'context:current'],
			details: { runId: input.run.id, status: input.run.status }
		});
	}

	if (getOpenReviewForTask(data, input.sourceTask.id)) {
		throw new AgentControlPlaneApiError(409, 'An open review already exists for this task.', {
			code: 'task_review_already_open',
			suggestedNextCommands: ['task:get', 'context:current'],
			details: { taskId: input.sourceTask.id, runId: input.run.id }
		});
	}

	const preview = buildRunResultPreview(data, { runId: input.run.id });

	if (input.input.validateOnly === true) {
		return {
			data,
			record: buildTransitionPreviewRecord({
				command: 'request_review_from_run',
				run: input.run,
				task: input.sourceTask,
				preview,
				mutation: 'task_review_request',
				note: 'Validation only. This would open a review and move the linked task to review if it is not done.',
				wouldExecuteCommands: ['run-result:request_review_from_run', 'task:get', 'context:current']
			}),
			changedCollections: []
		};
	}

	const now = new Date().toISOString();
	const reviewSummary =
		normalizeOptionalString(input.input.summary) ||
		input.run.resultSummary ||
		`Review requested from completed run ${input.run.id}.`;
	const review = createReview({
		taskId: input.sourceTask.id,
		runId: input.run.id,
		summary: reviewSummary
	});
	const updatedTask = {
		...input.sourceTask,
		status: input.sourceTask.status === 'done' ? 'done' : 'review',
		blockedReason: '',
		updatedAt: now
	} satisfies Task;
	const nextData = {
		...data,
		tasks: data.tasks.map((candidate) =>
			candidate.id === updatedTask.id ? updatedTask : candidate
		),
		reviews: [review, ...data.reviews],
		decisions: [
			createDecision({
				taskId: input.sourceTask.id,
				runId: input.run.id,
				reviewId: review.id,
				decisionType: 'task_plan_updated',
				summary: reviewSummary,
				createdAt: now
			}),
			...(data.decisions ?? [])
		]
	};

	return {
		data: nextData,
		record: {
			command: 'request_review_from_run',
			run: input.run,
			preview: buildRunResultPreview(nextData, { runId: input.run.id }),
			task: updatedTask,
			reviewId: review.id,
			safety: {
				mutation: 'task_review_request',
				taskStateChanged: updatedTask.status !== input.sourceTask.status,
				reviewStateChanged: true,
				approvalStateChanged: false,
				note: 'Opened a review from completed run evidence. This did not approve or accept the task.'
			},
			suggestedNextCommands: ['task:get', 'context:current']
		},
		changedCollections: ['tasks', 'reviews', 'decisions']
	};
}

function applyBlockedTaskFromRun(
	data: ControlPlaneData,
	input: {
		input: AgentRunResultInput;
		run: Run;
		sourceTask: Task;
	}
): AgentRunResultApplyResult {
	const blocker =
		normalizeOptionalString(input.input.blocker) ||
		(input.run.blockersFound ?? []).find((entry) => entry.trim()) ||
		input.run.errorSummary ||
		'Blocked by run result.';
	const preview = buildRunResultPreview(data, { runId: input.run.id });

	if (input.input.validateOnly === true) {
		return {
			data,
			record: buildTransitionPreviewRecord({
				command: 'mark_task_blocked_from_run',
				run: input.run,
				task: input.sourceTask,
				preview,
				mutation: 'task_blocked_update',
				note: 'Validation only. This would mark the linked task blocked using run blocker evidence.',
				wouldExecuteCommands: [
					'run-result:mark_task_blocked_from_run',
					'task:get',
					'context:current'
				]
			}),
			changedCollections: []
		};
	}

	const now = new Date().toISOString();
	const updatedTask = {
		...input.sourceTask,
		status: 'blocked',
		blockedReason: blocker,
		updatedAt: now
	} satisfies Task;
	const updatedRun = {
		...input.run,
		status: input.run.status === 'completed' ? input.run.status : 'blocked',
		blockersFound: uniqueStrings(input.run.blockersFound ?? [], [blocker]),
		updatedAt: now
	} satisfies Run;
	const nextData = {
		...data,
		tasks: data.tasks.map((candidate) =>
			candidate.id === updatedTask.id ? updatedTask : candidate
		),
		runs: data.runs.map((candidate) => (candidate.id === updatedRun.id ? updatedRun : candidate)),
		decisions: [
			createDecision({
				taskId: input.sourceTask.id,
				runId: input.run.id,
				decisionType: 'task_plan_updated',
				summary: `Marked task blocked from run evidence: ${blocker}`,
				createdAt: now
			}),
			...(data.decisions ?? [])
		]
	};

	return {
		data: nextData,
		record: {
			command: 'mark_task_blocked_from_run',
			run: updatedRun,
			preview: buildRunResultPreview(nextData, { runId: input.run.id }),
			task: updatedTask,
			safety: {
				mutation: 'task_blocked_update',
				taskStateChanged:
					updatedTask.status !== input.sourceTask.status ||
					updatedTask.blockedReason !== input.sourceTask.blockedReason,
				reviewStateChanged: false,
				approvalStateChanged: false,
				note: 'Marked the linked task blocked from run evidence. This did not approve, reject, or accept work.'
			},
			suggestedNextCommands: ['task:get', 'goal-loop:get_goal_blockers', 'context:current']
		},
		changedCollections: ['tasks', 'runs', 'decisions']
	};
}

function normalizeSelectedProposalIndexes(value: unknown) {
	if (Array.isArray(value)) {
		return [
			...new Set(
				value
					.map((entry) => (typeof entry === 'number' ? entry : Number.parseInt(String(entry), 10)))
					.filter((entry) => Number.isInteger(entry) && entry >= 0)
			)
		];
	}

	if (typeof value === 'string') {
		return normalizeSelectedProposalIndexes(value.split(','));
	}

	return [];
}

function appendReviewedNote(existing: string | null | undefined, note: string) {
	const current = existing?.trim() ?? '';

	if (!current) {
		return note;
	}

	return `${current}\n\n${note}`;
}

function buildReviewedProgressNote(input: {
	run: Run;
	task: Task;
	fieldName: string;
	value: unknown;
	reason: string;
}) {
	const valueText = Array.isArray(input.value)
		? input.value
				.map((entry) => String(entry).trim())
				.filter(Boolean)
				.join(', ')
		: String(input.value ?? '').trim();

	return [
		`Reviewed run progress update from run ${input.run.id} for task ${input.task.id}.`,
		`${input.fieldName}: ${valueText}`,
		`Reason: ${input.reason}`
	]
		.filter(Boolean)
		.join(' ');
}

function assertNoDuplicateReviewedProgress(input: {
	existing: string | null | undefined;
	note: string;
	resource: 'project' | 'goal';
	id: string;
	fieldName: string;
	runId: string;
}) {
	if (!hasSimilarText(input.existing, input.note)) {
		return;
	}

	throw new AgentControlPlaneApiError(
		409,
		'Selected progress update already appears to be applied.',
		{
			code: 'run_result_progress_update_duplicate',
			suggestedNextCommands: ['project:get', 'goal:get', 'run-result:preview_progress_updates'],
			details: {
				resource: input.resource,
				id: input.id,
				fieldName: input.fieldName,
				runId: input.runId
			}
		}
	);
}

function applyReviewedProgressUpdates(
	data: ControlPlaneData,
	input: {
		input: AgentRunResultInput;
		run: Run;
		sourceTask: Task;
	}
): AgentRunResultApplyResult {
	const preview = buildRunResultPreview(data, { runId: input.run.id });
	const progressPreview = preview?.projectGoalProgressPreview;

	if (!progressPreview) {
		throw new AgentControlPlaneApiError(409, 'Run progress preview is unavailable.', {
			code: 'run_result_progress_preview_unavailable',
			suggestedNextCommands: [
				'run-result:record_run_result',
				'run-result:preview_progress_updates'
			],
			details: { runId: input.run.id }
		});
	}

	const selectedIndexes = normalizeSelectedProposalIndexes(input.input.selectedProposalIndexes);

	if (selectedIndexes.length === 0) {
		throw new AgentControlPlaneApiError(400, 'selectedProposalIndexes is required.', {
			code: 'run_result_progress_selection_required',
			suggestedNextCommands: ['run-result:preview_progress_updates'],
			details: { runId: input.run.id }
		});
	}

	const selectedUpdates = selectedIndexes.map((index) => {
		const update = progressPreview.proposedUpdates[index];

		if (!update) {
			throw new AgentControlPlaneApiError(400, 'Selected progress proposal index is invalid.', {
				code: 'run_result_progress_selection_invalid',
				suggestedNextCommands: ['run-result:preview_progress_updates'],
				details: { runId: input.run.id, selectedProposalIndex: index }
			});
		}

		return { index, update };
	});
	const projectPatches = new Map<string, Partial<ControlPlaneData['projects'][number]>>();
	const goalPatches = new Map<string, Partial<ControlPlaneData['goals'][number]>>();
	const appliedUpdates: NonNullable<AgentRunResultRecord['appliedUpdates']> = [];
	const decisions: ControlPlaneData['decisions'] = [];
	const now = new Date().toISOString();

	for (const { update } of selectedUpdates) {
		if (update.resource === 'task') {
			throw new AgentControlPlaneApiError(
				400,
				'Task progress proposals must use task-specific commands.',
				{
					code: 'run_result_progress_task_update_rejected',
					suggestedNextCommands: ['task:update', 'run-result:preview_progress_updates'],
					details: { runId: input.run.id, update }
				}
			);
		}

		if (update.resource === 'project') {
			const project = data.projects.find((candidate) => candidate.id === update.id) ?? null;

			if (!project) {
				throw new AgentControlPlaneApiError(
					404,
					'Project for selected progress update was not found.',
					{
						code: 'run_result_progress_project_not_found',
						suggestedNextCommands: ['project:list', 'run-result:preview_progress_updates'],
						details: { runId: input.run.id, projectId: update.id }
					}
				);
			}

			for (const [fieldName, value] of Object.entries(update.fields)) {
				if (fieldName !== 'currentStateMemo' && fieldName !== 'decisionLog') {
					throw new AgentControlPlaneApiError(
						400,
						'Project progress update field is not allowed.',
						{
							code: 'run_result_progress_project_field_rejected',
							suggestedNextCommands: ['run-result:preview_progress_updates', 'project:get'],
							details: { runId: input.run.id, projectId: update.id, fieldName }
						}
					);
				}

				const note = buildReviewedProgressNote({
					run: input.run,
					task: input.sourceTask,
					fieldName,
					value,
					reason: update.reason
				});
				const existing =
					fieldName === 'currentStateMemo' ? project.currentStateMemo : project.decisionLog;
				assertNoDuplicateReviewedProgress({
					existing,
					note,
					resource: 'project',
					id: project.id,
					fieldName,
					runId: input.run.id
				});
				const patch = projectPatches.get(project.id) ?? {};
				patch[fieldName] = appendReviewedNote(
					fieldName in patch ? (patch[fieldName] as string) : existing,
					note
				);
				projectPatches.set(project.id, patch);
				appliedUpdates.push({
					resource: 'project',
					id: project.id,
					field: fieldName,
					evidenceIds: update.evidenceIds
				});
				decisions.push(
					createDecision({
						taskId: input.sourceTask.id,
						goalId: input.sourceTask.goalId || null,
						runId: input.run.id,
						decisionType: 'task_plan_updated',
						summary: `Applied reviewed project ${fieldName} progress update from run ${input.run.id}.`,
						createdAt: now
					})
				);
			}
		}

		if (update.resource === 'goal') {
			const goal = data.goals.find((candidate) => candidate.id === update.id) ?? null;

			if (!goal) {
				throw new AgentControlPlaneApiError(
					404,
					'Goal for selected progress update was not found.',
					{
						code: 'run_result_progress_goal_not_found',
						suggestedNextCommands: ['goal:list', 'run-result:preview_progress_updates'],
						details: { runId: input.run.id, goalId: update.id }
					}
				);
			}

			for (const [fieldName, value] of Object.entries(update.fields)) {
				if (
					fieldName !== 'progressNote' &&
					fieldName !== 'blockerNote' &&
					fieldName !== 'remainingWork' &&
					fieldName !== 'followUpWork'
				) {
					throw new AgentControlPlaneApiError(400, 'Goal progress update field is not allowed.', {
						code: 'run_result_progress_goal_field_rejected',
						suggestedNextCommands: ['run-result:preview_progress_updates', 'goal:get'],
						details: { runId: input.run.id, goalId: update.id, fieldName }
					});
				}

				const note = buildReviewedProgressNote({
					run: input.run,
					task: input.sourceTask,
					fieldName,
					value,
					reason: update.reason
				});
				const existingSummary = goalPatches.get(goal.id)?.summary ?? goal.summary;
				assertNoDuplicateReviewedProgress({
					existing: existingSummary,
					note,
					resource: 'goal',
					id: goal.id,
					fieldName,
					runId: input.run.id
				});
				goalPatches.set(goal.id, {
					...(goalPatches.get(goal.id) ?? {}),
					summary: appendReviewedNote(existingSummary, note)
				});
				appliedUpdates.push({
					resource: 'goal',
					id: goal.id,
					field: fieldName,
					evidenceIds: update.evidenceIds
				});
				decisions.push(
					createDecision({
						taskId: input.sourceTask.id,
						goalId: goal.id,
						runId: input.run.id,
						decisionType: 'goal_plan_updated',
						summary: `Applied reviewed goal ${fieldName} progress update from run ${input.run.id}.`,
						createdAt: now
					})
				);
			}
		}
	}

	const readbackCommands = [
		...new Set([
			...appliedUpdates.map((update) => `${update.resource}:get ${update.id}`),
			'goal-loop:get_goal_progress',
			'context:current'
		])
	];

	if (input.input.validateOnly === true) {
		return {
			data,
			record: {
				command: 'apply_progress_updates',
				run: input.run,
				task: input.sourceTask,
				preview,
				validationOnly: true,
				wouldExecuteCommands: ['run-result:apply_progress_updates', ...readbackCommands],
				appliedUpdates,
				readbackCommands,
				safety: {
					mutation: 'reviewed_progress_update',
					taskStateChanged: false,
					reviewStateChanged: false,
					approvalStateChanged: false,
					note: 'Validation only. This would apply selected progress proposals to existing project or goal fields after operator review.'
				},
				suggestedNextCommands: ['run-result:apply_progress_updates', ...readbackCommands]
			},
			changedCollections: []
		};
	}

	const nextData = {
		...data,
		projects:
			projectPatches.size > 0
				? data.projects.map((project) => ({
						...project,
						...(projectPatches.get(project.id) ?? {})
					}))
				: data.projects,
		goals:
			goalPatches.size > 0
				? data.goals.map((goal) => ({ ...goal, ...(goalPatches.get(goal.id) ?? {}) }))
				: data.goals,
		decisions: [...decisions, ...(data.decisions ?? [])]
	};
	const changedCollections: ControlPlaneCollection[] = [
		...(projectPatches.size > 0 ? (['projects'] as const) : []),
		...(goalPatches.size > 0 ? (['goals'] as const) : []),
		...(decisions.length > 0 ? (['decisions'] as const) : [])
	];

	return {
		data: nextData,
		record: {
			command: 'apply_progress_updates',
			run: input.run,
			task: input.sourceTask,
			preview: buildRunResultPreview(nextData, { runId: input.run.id }),
			appliedUpdates,
			readbackCommands,
			safety: {
				mutation: 'reviewed_progress_update',
				taskStateChanged: false,
				reviewStateChanged: false,
				approvalStateChanged: false,
				note: 'Applied selected reviewed progress proposals to project or goal state. This did not accept work or change task, review, or approval state.'
			},
			suggestedNextCommands: readbackCommands
		},
		changedCollections
	};
}

export async function recordAgentRunResult(input: AgentRunResultInput) {
	const command = normalizeCommand(input.command);

	if (command === 'preview_progress_updates') {
		return previewAgentRunProgressUpdates(input);
	}

	let record: AgentRunResultRecord | null = null;

	await updateControlPlaneCollections((data) => {
		const result = applyAgentRunResultToData(data, input);
		record = result.record;

		return {
			data: result.data,
			changedCollections: result.changedCollections
		};
	});

	if (!record) {
		throw new AgentControlPlaneApiError(404, 'Run not found.', {
			code: 'run_not_found',
			suggestedNextCommands: ['context:current', 'task:get'],
			details: { runId: input.runId }
		});
	}

	return record;
}

export async function previewAgentRunProgressUpdates(input: AgentRunResultInput) {
	const runId = requireId(input.runId, 'runId');
	const data = await loadControlPlane();
	const run = data.runs.find((candidate) => candidate.id === runId) ?? null;

	if (!run) {
		throw new AgentControlPlaneApiError(404, 'Run not found.', {
			code: 'run_not_found',
			suggestedNextCommands: ['context:current', 'task:get'],
			details: { runId }
		});
	}

	const task = data.tasks.find((candidate) => candidate.id === run.taskId) ?? null;

	if (!task) {
		throw new AgentControlPlaneApiError(404, 'Linked task not found for run.', {
			code: 'run_task_not_found',
			suggestedNextCommands: ['task:list', 'context:current'],
			details: { runId, taskId: run.taskId }
		});
	}

	const preview = buildRunResultPreview(data, { runId });
	const progressPreview =
		preview?.projectGoalProgressPreview ??
		buildRunEvidenceProgressPreview(data, {
			run,
			task,
			classification: 'requires_user_decision',
			classificationConfidence: 'low'
		});

	return {
		command: 'preview_progress_updates' as AgentRunResultCommand,
		run,
		task,
		preview,
		progressPreview,
		validationOnly: true,
		safety: {
			mutation: 'none' as const,
			taskStateChanged: false,
			reviewStateChanged: false,
			approvalStateChanged: false,
			note: 'Preview only. This operation does not edit project memory, decision logs, goal state, tasks, reviews, or approvals.'
		},
		suggestedNextCommands: progressPreview.suggestedNextCommands
	};
}
