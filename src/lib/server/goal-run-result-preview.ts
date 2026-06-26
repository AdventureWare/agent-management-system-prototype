import {
	getOpenReviewForTask,
	getPendingApprovalForTask
} from '$lib/server/control-plane';
import { buildGoalWorkLoopClassification } from '$lib/server/goal-work-loop';
import type { ControlPlaneData, Run, Task } from '$lib/types/control-plane';

export const RUN_RESULT_CLASSIFICATION_OPTIONS = [
	'completed_accepted',
	'completed_awaiting_review',
	'partial_completion',
	'needs_revision',
	'blocked',
	'failed',
	'out_of_scope_follow_up',
	'duplicate_superseded',
	'requires_user_decision'
] as const;

export type RunResultClassification = (typeof RUN_RESULT_CLASSIFICATION_OPTIONS)[number];

export type RunResultStateUpdatePreview = {
	resource: 'task' | 'run' | 'review' | 'approval' | 'project' | 'goal';
	id: string;
	fields: Record<string, unknown>;
	reason: string;
};

export type RunResultPreviewNextAction =
	| 'accept_or_close_task'
	| 'request_review'
	| 'plan_revision'
	| 'resolve_blocker'
	| 'diagnose_failure'
	| 'create_follow_up_task'
	| 'resolve_duplicate'
	| 'request_user_decision';

export type RunResultPreview = {
	runId: string;
	taskId: string;
	classification: RunResultClassification;
	confidence: 'low' | 'medium' | 'high';
	reasons: string[];
	proposedUpdates: RunResultStateUpdatePreview[];
	nextAction: RunResultPreviewNextAction;
	followUpTaskIds: string[];
};

export type BuildRunResultPreviewInput = {
	runId: string;
};

function hasText(value: string | null | undefined) {
	return Boolean(value?.trim());
}

function textIncludes(input: Array<string | null | undefined>, pattern: RegExp) {
	return input.some((value) => pattern.test(value ?? ''));
}

function findTask(data: ControlPlaneData, run: Run): Task | null {
	return data.tasks.find((task) => task.id === run.taskId) ?? null;
}

function getChangesRequested(data: ControlPlaneData, task: Task) {
	return data.reviews.find(
		(review) => review.taskId === task.id && review.status === 'changes_requested'
	);
}

function classifyRunResult(data: ControlPlaneData, run: Run, task: Task) {
	const reasons: string[] = [];
	const pendingApproval = getPendingApprovalForTask(data, task.id);
	const openReview = getOpenReviewForTask(data, task.id);
	const changesRequested = getChangesRequested(data, task);
	const goalLoop = buildGoalWorkLoopClassification(data, {
		projectId: task.projectId,
		goalId: task.goalId || null
	});
	const classifiedTask = goalLoop.tasks.find((candidate) => candidate.id === task.id);
	const evidenceText = [
		run.summary,
		run.resultSummary,
		run.validationSummary,
		run.errorSummary,
		...(run.blockersFound ?? [])
	];

	if (run.status === 'failed') {
		reasons.push(run.errorSummary || 'Run failed.');
		return {
			classification: 'failed',
			confidence: 'high',
			reasons
		} as const;
	}

	if (pendingApproval) {
		reasons.push('Task has pending approval.');
		return {
			classification: 'requires_user_decision',
			confidence: 'high',
			reasons
		} as const;
	}

	if (changesRequested || task.closeoutState === 'needs_revision' || task.closeoutState === 'rejected') {
		reasons.push(changesRequested?.summary || task.closeoutRemainingIssues || 'Changes requested.');
		return {
			classification: 'needs_revision',
			confidence: 'high',
			reasons
		} as const;
	}

	if (run.status === 'blocked' || (run.blockersFound ?? []).length > 0 || task.status === 'blocked') {
		reasons.push(task.blockedReason || run.blockersFound?.[0] || 'Run found a blocker.');
		return {
			classification: 'blocked',
			confidence: 'high',
			reasons
		} as const;
	}

	if (classifiedTask?.classification === 'duplicate_superseded') {
		reasons.push(classifiedTask.reasons[0]?.message ?? 'Task appears duplicate or superseded.');
		return {
			classification: 'duplicate_superseded',
			confidence: 'medium',
			reasons
		} as const;
	}

	if (textIncludes(evidenceText, /\b(out[- ]of[- ]scope|outside scope|separate follow[- ]up)\b/i)) {
		reasons.push('Run discovered out-of-scope follow-up work.');
		return {
			classification: 'out_of_scope_follow_up',
			confidence: 'medium',
			reasons
		} as const;
	}

	if (textIncludes(evidenceText, /\b(partial|partly|incomplete|remaining|not complete)\b/i)) {
		reasons.push('Run result indicates partial completion or remaining work.');
		return {
			classification: 'partial_completion',
			confidence: 'medium',
			reasons
		} as const;
	}

	if (task.status === 'done' || task.closeoutState === 'accepted') {
		reasons.push('Linked task is done or accepted.');
		return {
			classification: 'completed_accepted',
			confidence: 'high',
			reasons
		} as const;
	}

	if (run.status === 'completed' && (openReview || task.requiresReview || task.status === 'review')) {
		reasons.push(openReview ? 'Open review exists.' : 'Completed run requires review.');
		return {
			classification: 'completed_awaiting_review',
			confidence: 'high',
			reasons
		} as const;
	}

	reasons.push('Run result needs human decision before state can change safely.');
	return {
		classification: 'requires_user_decision',
		confidence: 'low',
		reasons
	} as const;
}

function proposedUpdatesFor(input: {
	run: Run;
	task: Task;
	classification: RunResultClassification;
}) {
	const { run, task, classification } = input;
	const updates: RunResultStateUpdatePreview[] = [];

	if (classification === 'completed_accepted') {
		updates.push({
			resource: 'task',
			id: task.id,
			fields: { status: 'done', closeoutState: 'accepted' },
			reason: 'Accepted run result should close the task.'
		});
		updates.push({
			resource: 'run',
			id: run.id,
			fields: { status: 'completed' },
			reason: 'Run evidence is complete and accepted.'
		});
	}

	if (classification === 'completed_awaiting_review') {
		updates.push({
			resource: 'task',
			id: task.id,
			fields: { status: 'review' },
			reason: 'Completed run should be reviewed before acceptance.'
		});
		updates.push({
			resource: 'review',
			id: `review:${task.id}`,
			fields: { taskId: task.id, runId: run.id, status: 'open' },
			reason: 'Open or create a review gate for the completed run.'
		});
	}

	if (classification === 'partial_completion' || classification === 'needs_revision') {
		updates.push({
			resource: 'task',
			id: task.id,
			fields: { status: 'blocked', closeoutState: 'needs_revision' },
			reason: 'Remaining work should be revised or replanned.'
		});
	}

	if (classification === 'blocked') {
		updates.push({
			resource: 'task',
			id: task.id,
			fields: {
				status: 'blocked',
				blockedReason: task.blockedReason || run.blockersFound?.[0] || 'Blocked by run result.'
			},
			reason: 'Blocker should be visible on the linked task.'
		});
	}

	if (classification === 'failed') {
		updates.push({
			resource: 'run',
			id: run.id,
			fields: { status: 'failed', errorSummary: run.errorSummary },
			reason: 'Failed run should preserve diagnostic evidence.'
		});
	}

	if (classification === 'requires_user_decision') {
		updates.push({
			resource: 'approval',
			id: `approval:${task.id}`,
			fields: { taskId: task.id, runId: run.id, status: 'pending' },
			reason: 'A user decision is required before task state changes.'
		});
	}

	return updates;
}

function nextActionFor(classification: RunResultClassification): RunResultPreviewNextAction {
	switch (classification) {
		case 'completed_accepted':
			return 'accept_or_close_task';
		case 'completed_awaiting_review':
			return 'request_review';
		case 'partial_completion':
		case 'needs_revision':
			return 'plan_revision';
		case 'blocked':
			return 'resolve_blocker';
		case 'failed':
			return 'diagnose_failure';
		case 'out_of_scope_follow_up':
			return 'create_follow_up_task';
		case 'duplicate_superseded':
			return 'resolve_duplicate';
		case 'requires_user_decision':
			return 'request_user_decision';
	}
}

export function buildRunResultPreview(
	data: ControlPlaneData,
	input: BuildRunResultPreviewInput
): RunResultPreview | null {
	const run = data.runs.find((candidate) => candidate.id === input.runId) ?? null;

	if (!run) {
		return null;
	}

	const task = findTask(data, run);

	if (!task) {
		return null;
	}

	const result = classifyRunResult(data, run, task);
	const proposedUpdates = proposedUpdatesFor({
		run,
		task,
		classification: result.classification
	});

	if (hasText(run.resultSummary)) {
		proposedUpdates.push({
			resource: 'run',
			id: run.id,
			fields: { resultSummary: run.resultSummary },
			reason: 'Preserve run result evidence for review.'
		});
	}

	return {
		runId: run.id,
		taskId: task.id,
		classification: result.classification,
		confidence: result.confidence,
		reasons: result.reasons,
		proposedUpdates,
		nextAction: nextActionFor(result.classification),
		followUpTaskIds: run.followUpTaskIds ?? []
	};
}
