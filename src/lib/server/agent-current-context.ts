import { getAgentThread } from '$lib/server/agent-threads';
import {
	getOpenReviewForTask,
	getPendingApprovalForTask,
	loadControlPlane
} from '$lib/server/control-plane';
import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';

type AgentCurrentContextInput = {
	threadId?: string | null;
	taskId?: string | null;
	runId?: string | null;
};

type RecommendedAction = {
	resource: 'context' | 'intent' | 'task' | 'thread' | 'goal' | 'project';
	command: string;
	reason: string;
	stateSignals: string[];
	expectedOutcome: string;
	suggestedReadbackCommands: string[];
	shouldValidateFirst?: boolean;
	validationMode?: 'validateOnly';
	validationReason?: string;
};

export type AgentGuidanceHint = {
	resource: RecommendedAction['resource'];
	command: string;
	reason: string;
	expectedOutcome: string;
	shouldValidateFirst: boolean;
	validationMode?: 'validateOnly';
	validationReason?: string;
};

type LoadedControlPlane = Awaited<ReturnType<typeof loadControlPlane>>;
type LoadedTask = LoadedControlPlane['tasks'][number];
type LoadedRun = LoadedControlPlane['runs'][number];
type LoadedReview = LoadedControlPlane['reviews'][number];
type LoadedApproval = LoadedControlPlane['approvals'][number];

function readOptionalId(value: string | null | undefined) {
	const normalized = value?.trim() ?? '';
	return normalized.length > 0 ? normalized : null;
}

function uniqueRecommendedActions(actions: RecommendedAction[]) {
	const seen = new Set<string>();

	return actions.filter((action) => {
		const key = `${action.resource}:${action.command}`;

		if (seen.has(key)) {
			return false;
		}

		seen.add(key);
		return true;
	});
}

function action(input: RecommendedAction): RecommendedAction {
	return input;
}

function selectPrimaryActionHint(actions: RecommendedAction[]): AgentGuidanceHint | null {
	const actionable =
		actions.find(
			(candidate) =>
				!(candidate.resource === 'context' && candidate.command === 'current') &&
				!(candidate.resource === 'task' && candidate.command === 'get')
		) ?? null;

	if (!actionable) {
		return null;
	}

	return {
		resource: actionable.resource,
		command: actionable.command,
		reason: actionable.reason,
		expectedOutcome: actionable.expectedOutcome,
		shouldValidateFirst: actionable.shouldValidateFirst ?? false,
		validationMode: actionable.validationMode,
		validationReason: actionable.validationReason
	};
}

function inferTaskFromThread(data: LoadedControlPlane, threadId: string) {
	const directTask = data.tasks.find((task) => task.agentThreadId === threadId) ?? null;

	if (directTask) {
		return directTask;
	}

	const matchingRun =
		[...data.runs]
			.filter((run) => run.threadId === threadId || run.agentThreadId === threadId)
			.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;

	return matchingRun ? (data.tasks.find((task) => task.id === matchingRun.taskId) ?? null) : null;
}

function buildRecommendedActions(args: {
	task: LoadedTask | null;
	threadId: string | null;
	openReview: LoadedReview | null;
	pendingApproval: LoadedApproval | null;
}) {
	const actions: RecommendedAction[] = [];
	const { task, threadId, openReview, pendingApproval } = args;

	actions.push(
		action({
			resource: 'context',
			command: 'current',
			reason: 'Refresh canonical task, run, and thread state before acting on stale assumptions.',
			stateSignals: ['Context recommendations should be based on the latest control-plane state.'],
			expectedOutcome:
				'Return the canonical current task, run, thread, project, goal, and governance context.',
			suggestedReadbackCommands: ['context:current']
		})
	);

	if (!task) {
		actions.push(
			action({
				resource: 'task',
				command: 'list',
				reason:
					'No task could be resolved from the current ids. List available tasks to recover context.',
				stateSignals: ['No task was resolved from the provided thread, task, or run ids.'],
				expectedOutcome: 'Recover a valid task id before attempting task-scoped work.',
				suggestedReadbackCommands: ['task:get', 'context:current']
			})
		);

		if (threadId) {
			actions.push(
				action({
					resource: 'thread',
					command: 'panel',
					reason: 'Inspect the current thread directly when no task mapping is available.',
					stateSignals: [
						`Current thread ${threadId} is available even though no task mapping was found.`
					],
					expectedOutcome:
						'Inspect the live thread state and recover task/run context from the thread itself.',
					suggestedReadbackCommands: ['context:current']
				})
			);
		}

		return uniqueRecommendedActions(actions);
	}

	actions.push(
		action({
			resource: 'task',
			command: 'get',
			reason: 'Read the latest task state before running follow-up mutations.',
			stateSignals: [`Resolved task ${task.id} is the current control-plane anchor.`],
			expectedOutcome:
				'Return the latest task fields, linked thread, run, and governance state before mutating.',
			suggestedReadbackCommands: ['task:get']
		})
	);

	if (pendingApproval) {
		actions.push(
			action({
				resource: 'task',
				command: 'approve-approval',
				reason: 'There is a pending approval gate on this task.',
				stateSignals: [
					`Task ${task.id} has pending approval ${pendingApproval.id}.`,
					`Approval mode is ${pendingApproval.mode}.`
				],
				expectedOutcome: 'Resolve the pending approval by approving the task output.',
				suggestedReadbackCommands: ['task:get', 'context:current'],
				shouldValidateFirst: true,
				validationMode: 'validateOnly',
				validationReason:
					'Approval resolution is high-impact. Preview whether the task would close before mutating.'
			})
		);
		actions.push(
			action({
				resource: 'task',
				command: 'reject-approval',
				reason: 'Reject the approval if the task output should not proceed.',
				stateSignals: [
					`Task ${task.id} has pending approval ${pendingApproval.id}.`,
					'Use this when the current output should not pass the approval gate yet.'
				],
				expectedOutcome: 'Resolve the pending approval by rejecting the task output.',
				suggestedReadbackCommands: ['task:get', 'context:current'],
				shouldValidateFirst: true,
				validationMode: 'validateOnly',
				validationReason:
					'Rejection will block the task. Preview the resulting blocked state first.'
			})
		);
		return uniqueRecommendedActions(actions);
	}

	if (openReview) {
		actions.push(
			action({
				resource: 'task',
				command: 'approve-review',
				reason: 'There is an open review gate on this task.',
				stateSignals: [`Task ${task.id} has open review ${openReview.id}.`],
				expectedOutcome: 'Resolve the open review by approving the current task output.',
				suggestedReadbackCommands: ['task:get', 'context:current'],
				shouldValidateFirst: true,
				validationMode: 'validateOnly',
				validationReason:
					'Review approval may close the task. Preview the resulting task state first.'
			})
		);
		actions.push(
			action({
				resource: 'task',
				command: 'request-review-changes',
				reason: 'Request follow-up changes if the review should not pass yet.',
				stateSignals: [
					`Task ${task.id} has open review ${openReview.id}.`,
					'Use this when the current output is not ready to pass review.'
				],
				expectedOutcome: 'Keep the review loop open and record requested follow-up changes.',
				suggestedReadbackCommands: ['task:get', 'context:current'],
				shouldValidateFirst: true,
				validationMode: 'validateOnly',
				validationReason:
					'Changes requested will block the task. Preview the blocked outcome first.'
			})
		);
		return uniqueRecommendedActions(actions);
	}

	if (task.parentTaskId && task.status === 'done' && !task.delegationAcceptance) {
		actions.push(
			action({
				resource: 'intent',
				command: 'accept_child_handoff',
				reason: 'This delegated child task is done and waiting for parent acceptance.',
				stateSignals: [
					`Task ${task.id} is a delegated child of ${task.parentTaskId}.`,
					'The child task is done and no delegation acceptance has been recorded yet.'
				],
				expectedOutcome: 'Accept the child handoff into the parent task in one intent call.',
				suggestedReadbackCommands: ['context:current', 'task:get'],
				shouldValidateFirst: true,
				validationMode: 'validateOnly',
				validationReason:
					'Child handoff acceptance changes delegated-work state. Preview eligibility before mutating.'
			})
		);
		actions.push(
			action({
				resource: 'intent',
				command: 'request_child_handoff_changes',
				reason: 'Ask for follow-up work if the child handoff is incomplete.',
				stateSignals: [
					`Task ${task.id} is a delegated child of ${task.parentTaskId}.`,
					'The child task is done but may still require follow-up before acceptance.'
				],
				expectedOutcome: 'Return the child handoff for follow-up work in one intent call.',
				suggestedReadbackCommands: ['context:current', 'task:get'],
				shouldValidateFirst: true,
				validationMode: 'validateOnly',
				validationReason:
					'Returning a handoff for follow-up will block the child task. Preview that transition first.'
			})
		);
		return uniqueRecommendedActions(actions);
	}

	if (task.status === 'blocked') {
		actions.push(
			action({
				resource: 'task',
				command: 'update',
				reason: 'The task is blocked. Clear or revise the blocked state before continuing.',
				stateSignals: [
					`Task ${task.id} is blocked.`,
					task.blockedReason
						? `Blocked reason: ${task.blockedReason}`
						: 'No blocked reason was recorded.'
				],
				expectedOutcome:
					'Update the task so the blocked state or blocker details reflect the next action.',
				suggestedReadbackCommands: ['task:get', 'context:current']
			})
		);
		return uniqueRecommendedActions(actions);
	}

	if (task.status === 'in_draft') {
		actions.push(
			action({
				resource: 'task',
				command: 'update',
				reason: 'The task is still in draft and likely needs planning fields filled in.',
				stateSignals: [`Task ${task.id} is still in_draft.`],
				expectedOutcome: 'Fill in or revise the planning fields needed before execution can begin.',
				suggestedReadbackCommands: ['task:get', 'context:current']
			})
		);
		return uniqueRecommendedActions(actions);
	}

	if (task.status === 'ready') {
		actions.push(
			action({
				resource: 'task',
				command: 'launch-session',
				reason: 'The task is ready to start execution.',
				stateSignals: [
					`Task ${task.id} is ready.`,
					'No blocking governance gate is currently open.'
				],
				expectedOutcome: 'Launch execution for the ready task.',
				suggestedReadbackCommands: ['context:current', 'thread:panel']
			})
		);
		if (!task.agentThreadId) {
			actions.push(
				action({
					resource: 'thread',
					command: 'best-target',
					reason:
						'No agent thread is linked yet. Resolve the best thread target before routing work.',
					stateSignals: [`Task ${task.id} does not have an agentThreadId yet.`],
					expectedOutcome: 'Return the best contactable thread candidate for this task context.',
					suggestedReadbackCommands: ['context:current']
				})
			);
		}
		return uniqueRecommendedActions(actions);
	}

	if (task.status === 'in_progress' && threadId) {
		actions.push(
			action({
				resource: 'thread',
				command: 'panel',
				reason: 'Inspect the active thread while the task is in progress.',
				stateSignals: [
					`Task ${task.id} is in_progress.`,
					`Thread ${threadId} is linked to the active work.`
				],
				expectedOutcome:
					'Inspect the live thread state before sending follow-up or making task-level assumptions.',
				suggestedReadbackCommands: ['context:current']
			})
		);
		actions.push(
			action({
				resource: 'intent',
				command: 'coordinate_with_another_thread',
				reason:
					'Route focused context or delegation to another thread without manually resolving and messaging it.',
				stateSignals: [
					`Task ${task.id} is in_progress.`,
					`Source thread ${threadId} is available for cross-thread routing.`
				],
				expectedOutcome:
					'Resolve a target thread, send the contact, and read back contact state in one call.',
				suggestedReadbackCommands: ['thread:contacts', 'context:current'],
				shouldValidateFirst: true,
				validationMode: 'validateOnly',
				validationReason:
					'Cross-thread routing is coordination-heavy. Preview target resolution and availability first.'
			})
		);
		return uniqueRecommendedActions(actions);
	}

	if (task.status === 'done' && task.requiresReview) {
		actions.push(
			action({
				resource: 'intent',
				command: 'prepare_task_for_review',
				reason: 'The task is done and requires review before it can be considered complete.',
				stateSignals: [`Task ${task.id} is done.`, 'The task still requires review.'],
				expectedOutcome: 'Open the review workflow in one intent call and return readback context.',
				suggestedReadbackCommands: ['context:current', 'task:get'],
				shouldValidateFirst: true,
				validationMode: 'validateOnly',
				validationReason:
					'Use a dry-run first if you want to confirm review checks before opening the gate.'
			})
		);
	}

	if (task.status === 'done' && task.approvalMode !== 'none') {
		actions.push(
			action({
				resource: 'intent',
				command: 'prepare_task_for_approval',
				reason: 'The task is done and still requires an approval gate.',
				stateSignals: [`Task ${task.id} is done.`, `Approval mode is ${task.approvalMode}.`],
				expectedOutcome:
					'Open the approval workflow in one intent call and return readback context.',
				suggestedReadbackCommands: ['context:current', 'task:get'],
				shouldValidateFirst: true,
				validationMode: 'validateOnly',
				validationReason:
					'Use a dry-run first if you want to confirm approval checks before opening the gate.'
			})
		);
	}

	return uniqueRecommendedActions(actions);
}

function buildContextSummary(args: {
	task: LoadedTask | null;
	run: LoadedRun | null;
	openReview: LoadedReview | null;
	pendingApproval: LoadedApproval | null;
}) {
	const blockers: string[] = [];
	const openGates: string[] = [];
	const { task, run, openReview, pendingApproval } = args;

	if (task?.blockedReason) {
		blockers.push(task.blockedReason);
	}

	if (run?.status === 'failed' && run.errorSummary) {
		blockers.push(run.errorSummary);
	}

	if (openReview) {
		openGates.push(`Open review: ${openReview.summary}`);
	}

	if (pendingApproval) {
		openGates.push(`Pending approval: ${pendingApproval.summary}`);
	}

	if (task?.parentTaskId && task.status === 'done' && !task.delegationAcceptance) {
		openGates.push('Child handoff is waiting for parent acceptance.');
	}

	let currentState = 'No control-plane task or run context could be resolved.';

	if (task && run) {
		currentState = `Task "${task.title}" is ${task.status} with run ${run.status}.`;
	} else if (task) {
		currentState = `Task "${task.title}" is ${task.status}.`;
	} else if (run) {
		currentState = `Run ${run.id} is ${run.status}.`;
	}

	return {
		currentState,
		blockers,
		openGates
	};
}

export function buildAgentGuidanceHint(args: {
	task: LoadedTask | null;
	run: LoadedRun | null;
	openReview: LoadedReview | null;
	pendingApproval: LoadedApproval | null;
	threadId?: string | null;
}) {
	return selectPrimaryActionHint(
		buildRecommendedActions({
			task: args.task,
			threadId:
				args.threadId ??
				args.run?.agentThreadId ??
				args.run?.threadId ??
				args.task?.agentThreadId ??
				null,
			openReview: args.openReview,
			pendingApproval: args.pendingApproval
		})
	);
}

export async function loadAgentCurrentContext(input: AgentCurrentContextInput = {}) {
	const requestedThreadId = readOptionalId(input.threadId);
	const requestedTaskId = readOptionalId(input.taskId);
	const requestedRunId = readOptionalId(input.runId);
	const data = await loadControlPlane();

	const requestedRun = requestedRunId
		? (data.runs.find((run) => run.id === requestedRunId) ?? null)
		: null;

	if (requestedRunId && !requestedRun) {
		throw new AgentControlPlaneApiError(404, 'Run not found.', {
			code: 'run_not_found',
			suggestedNextCommands: ['task:get', 'context:current'],
			details: { runId: requestedRunId }
		});
	}

	const requestedTask = requestedTaskId
		? (data.tasks.find((task) => task.id === requestedTaskId) ?? null)
		: null;

	if (requestedTaskId && !requestedTask) {
		throw new AgentControlPlaneApiError(404, 'Task not found.', {
			code: 'task_not_found',
			suggestedNextCommands: ['task:list', 'context:current'],
			details: { taskId: requestedTaskId }
		});
	}

	let resolvedTask =
		requestedTask ??
		(requestedRun ? (data.tasks.find((task) => task.id === requestedRun.taskId) ?? null) : null);

	if (!resolvedTask && requestedThreadId) {
		resolvedTask = inferTaskFromThread(data, requestedThreadId);
	}

	let resolvedRun =
		requestedRun ??
		(resolvedTask?.latestRunId
			? (data.runs.find((run) => run.id === resolvedTask.latestRunId) ?? null)
			: null);

	if (!resolvedRun && requestedThreadId) {
		resolvedRun =
			[...data.runs]
				.filter(
					(run) => run.threadId === requestedThreadId || run.agentThreadId === requestedThreadId
				)
				.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
	}

	const resolvedThreadId =
		requestedThreadId ??
		resolvedRun?.agentThreadId ??
		resolvedRun?.threadId ??
		resolvedTask?.agentThreadId ??
		null;
	const thread = resolvedThreadId
		? await getAgentThread(resolvedThreadId, { controlPlane: data })
		: null;

	if (requestedThreadId && !thread) {
		throw new AgentControlPlaneApiError(404, 'Thread not found.', {
			code: 'thread_not_found',
			suggestedNextCommands: ['thread:list', 'context:current'],
			details: { threadId: requestedThreadId }
		});
	}

	const project = resolvedTask
		? (data.projects.find((candidate) => candidate.id === resolvedTask.projectId) ?? null)
		: null;
	const goal = resolvedTask?.goalId
		? (data.goals.find((candidate) => candidate.id === resolvedTask.goalId) ?? null)
		: null;
	const openReview = resolvedTask ? getOpenReviewForTask(data, resolvedTask.id) : null;
	const pendingApproval = resolvedTask ? getPendingApprovalForTask(data, resolvedTask.id) : null;

	return {
		requested: {
			threadId: requestedThreadId,
			taskId: requestedTaskId,
			runId: requestedRunId
		},
		resolved: {
			threadId: thread?.id ?? resolvedThreadId,
			taskId: resolvedTask?.id ?? null,
			runId: resolvedRun?.id ?? null,
			projectId: project?.id ?? null,
			goalId: goal?.id ?? null
		},
		thread: thread && {
			id: thread.id,
			name: thread.name,
			handle: thread.handle ?? null,
			contactLabel: thread.contactLabel ?? null,
			threadState: thread.threadState,
			latestRunStatus: thread.latestRunStatus,
			hasActiveRun: thread.hasActiveRun,
			canResume: thread.canResume,
			lastActivityAt: thread.lastActivityAt
		},
		task: resolvedTask && {
			id: resolvedTask.id,
			title: resolvedTask.title,
			summary: resolvedTask.summary,
			status: resolvedTask.status,
			blockedReason: resolvedTask.blockedReason,
			requiresReview: resolvedTask.requiresReview,
			approvalMode: resolvedTask.approvalMode,
			projectId: resolvedTask.projectId,
			goalId: resolvedTask.goalId,
			parentTaskId: resolvedTask.parentTaskId ?? null,
			agentThreadId: resolvedTask.agentThreadId,
			latestRunId: resolvedTask.latestRunId
		},
		run: resolvedRun && {
			id: resolvedRun.id,
			taskId: resolvedRun.taskId,
			status: resolvedRun.status,
			summary: resolvedRun.summary,
			errorSummary: resolvedRun.errorSummary,
			threadId: resolvedRun.threadId,
			agentThreadId: resolvedRun.agentThreadId,
			updatedAt: resolvedRun.updatedAt
		},
		project: project && {
			id: project.id,
			name: project.name,
			summary: project.summary
		},
		goal: goal && {
			id: goal.id,
			name: goal.name,
			summary: goal.summary,
			status: goal.status
		},
		governance: {
			openReview: openReview && {
				id: openReview.id,
				status: openReview.status,
				summary: openReview.summary
			},
			pendingApproval: pendingApproval && {
				id: pendingApproval.id,
				status: pendingApproval.status,
				summary: pendingApproval.summary,
				mode: pendingApproval.mode
			}
		},
		summary: {
			...buildContextSummary({
				task: resolvedTask,
				run: resolvedRun,
				openReview,
				pendingApproval
			}),
			recommendedNextActions: buildRecommendedActions({
				task: resolvedTask,
				threadId: thread?.id ?? resolvedThreadId,
				openReview,
				pendingApproval
			}),
			primaryActionHint: buildAgentGuidanceHint({
				task: resolvedTask,
				run: resolvedRun,
				openReview,
				pendingApproval,
				threadId: thread?.id ?? resolvedThreadId
			})
		}
	};
}
