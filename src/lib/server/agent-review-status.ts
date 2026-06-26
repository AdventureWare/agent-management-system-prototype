import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { getOpenReviewForTask, getPendingApprovalForTask } from '$lib/server/control-plane';
import type { Approval, ControlPlaneData, Review, Run, Task } from '$lib/types/control-plane';

export const AGENT_REVIEW_STATUS_COMMANDS = ['get_review_status'] as const;

export type AgentReviewStatusCommand = (typeof AGENT_REVIEW_STATUS_COMMANDS)[number];

export type AgentReviewStatusInput = {
	command: string;
	taskId?: string | null;
	goalId?: string | null;
	projectId?: string | null;
	limit?: number | null;
};

function normalizeText(value: string | null | undefined) {
	return value?.trim() ?? '';
}

function clampLimit(value: number | null | undefined, fallback = 25) {
	if (!Number.isFinite(value) || !value || value <= 0) {
		return fallback;
	}

	return Math.min(Math.max(1, Math.trunc(value)), 100);
}

function normalizeCommand(command: string): AgentReviewStatusCommand {
	const normalized = command.trim() as AgentReviewStatusCommand;

	if (AGENT_REVIEW_STATUS_COMMANDS.includes(normalized)) {
		return normalized;
	}

	throw new AgentControlPlaneApiError(404, 'Unknown review command.', {
		code: 'review_command_not_found',
		suggestedNextCommands: ['manifest --resource review'],
		details: { command }
	});
}

function latestRunForTask(data: ControlPlaneData, taskId: string) {
	return (
		data.runs
			.filter((run) => run.taskId === taskId)
			.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null
	);
}

function summarizeTask(task: Task) {
	return {
		id: task.id,
		title: task.title,
		status: task.status,
		projectId: task.projectId,
		goalId: task.goalId,
		reviewRequirement: task.reviewRequirement,
		approvalMode: task.approvalMode,
		requiresReview: task.requiresReview
	};
}

function summarizeRun(run: Run | null) {
	return run
		? {
				id: run.id,
				taskId: run.taskId,
				status: run.status,
				summary: run.summary,
				resultSummary: run.resultSummary ?? '',
				validationSummary: run.validationSummary ?? '',
				errorSummary: run.errorSummary,
				updatedAt: run.updatedAt
			}
		: null;
}

function summarizeReview(review: Review | null) {
	return review
		? {
				id: review.id,
				taskId: review.taskId,
				runId: review.runId,
				status: review.status,
				summary: review.summary,
				updatedAt: review.updatedAt,
				resolvedAt: review.resolvedAt
			}
		: null;
}

function summarizeApproval(approval: Approval | null) {
	return approval
		? {
				id: approval.id,
				taskId: approval.taskId,
				runId: approval.runId,
				mode: approval.mode,
				status: approval.status,
				summary: approval.summary,
				updatedAt: approval.updatedAt,
				resolvedAt: approval.resolvedAt
			}
		: null;
}

function classifyGate(input: {
	task: Task;
	latestRun: Run | null;
	openReview: Review | null;
	pendingApproval: Approval | null;
}) {
	if (input.pendingApproval) {
		return {
			status: 'approval_required',
			nextCommands: ['task:approve-approval', 'task:reject-approval', 'context:current'],
			reason: `Task ${input.task.id} has pending approval ${input.pendingApproval.id}.`
		};
	}

	if (input.openReview) {
		return {
			status: 'awaiting_review',
			nextCommands: ['task:approve-review', 'task:request-review-changes', 'context:current'],
			reason: `Task ${input.task.id} has open review ${input.openReview.id}.`
		};
	}

	if (input.task.status === 'review') {
		return {
			status: 'review_state_without_open_review',
			nextCommands: ['task:request-review', 'task:get', 'context:current'],
			reason: `Task ${input.task.id} is in review status but has no open review.`
		};
	}

	if (input.latestRun?.status === 'completed') {
		return {
			status: 'completed_without_open_review',
			nextCommands: [
				'run-result:request_review_from_run',
				'task:request-review',
				'context:current'
			],
			reason: `Latest run ${input.latestRun.id} is completed and no open gate exists.`
		};
	}

	return {
		status: 'no_open_gate',
		nextCommands: ['task:get', 'context:current'],
		reason: `Task ${input.task.id} has no open review or pending approval.`
	};
}

function buildTaskReviewStatus(data: ControlPlaneData, task: Task) {
	const latestRun = latestRunForTask(data, task.id);
	const openReview = getOpenReviewForTask(data, task.id);
	const pendingApproval = getPendingApprovalForTask(data, task.id);
	const gate = classifyGate({ task, latestRun, openReview, pendingApproval });

	return {
		task: summarizeTask(task),
		latestRun: summarizeRun(latestRun),
		openReview: summarizeReview(openReview),
		pendingApproval: summarizeApproval(pendingApproval),
		gate,
		recentReviews: data.reviews
			.filter((review) => review.taskId === task.id)
			.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
			.slice(0, 5)
			.map(summarizeReview),
		recentApprovals: data.approvals
			.filter((approval) => approval.taskId === task.id)
			.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
			.slice(0, 5)
			.map(summarizeApproval)
	};
}

export function buildAgentReviewStatusResponse(
	data: ControlPlaneData,
	input: AgentReviewStatusInput
) {
	const command = normalizeCommand(input.command);
	const taskId = normalizeText(input.taskId);
	const goalId = normalizeText(input.goalId);
	const projectId = normalizeText(input.projectId);
	const limit = clampLimit(input.limit);

	if (taskId) {
		const task = data.tasks.find((candidate) => candidate.id === taskId);

		if (!task) {
			throw new AgentControlPlaneApiError(404, 'Task not found.', {
				code: 'task_not_found',
				suggestedNextCommands: ['task:list', 'context:current'],
				details: { taskId }
			});
		}

		const status = buildTaskReviewStatus(data, task);

		return {
			command,
			resolved: { taskId, goalId: task.goalId || null, projectId: task.projectId || null },
			source: {
				domainHelper: 'src/lib/server/agent-review-status.ts',
				route: `/api/agent-reviews/${command}`
			},
			safety: {
				readOnly: true,
				note: 'This endpoint reports review and approval gate state only. Use task decision commands for mutations.'
			},
			...status,
			suggestedNextCommands: status.gate.nextCommands
		};
	}

	const tasks = data.tasks
		.filter((task) => !goalId || task.goalId === goalId)
		.filter((task) => !projectId || task.projectId === projectId)
		.map((task) => buildTaskReviewStatus(data, task))
		.filter(
			(status) =>
				status.openReview ||
				status.pendingApproval ||
				status.task.status === 'review' ||
				status.latestRun?.status === 'completed'
		)
		.sort((left, right) => {
			const leftDate =
				left.openReview?.updatedAt ??
				left.pendingApproval?.updatedAt ??
				left.latestRun?.updatedAt ??
				'';
			const rightDate =
				right.openReview?.updatedAt ??
				right.pendingApproval?.updatedAt ??
				right.latestRun?.updatedAt ??
				'';
			return rightDate.localeCompare(leftDate);
		})
		.slice(0, limit);

	return {
		command,
		resolved: { taskId: null, goalId: goalId || null, projectId: projectId || null },
		source: {
			domainHelper: 'src/lib/server/agent-review-status.ts',
			route: `/api/agent-reviews/${command}`
		},
		safety: {
			readOnly: true,
			note: 'This endpoint reports review and approval gate state only. Use task decision commands for mutations.'
		},
		gates: tasks,
		count: tasks.length,
		suggestedNextCommands: ['review:get_review_status', 'goal-loop:get_awaiting_review']
	};
}
