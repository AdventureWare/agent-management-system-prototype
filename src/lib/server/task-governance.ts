import { listAgentThreads } from '$lib/server/agent-threads';
import {
	createDecision,
	getOpenReviewForTask,
	getPendingApprovalForTask,
	loadControlPlane,
	updateControlPlane
} from '$lib/server/control-plane';
import { buildTaskWorkItems } from '$lib/server/task-work-items';
import type { Run, Task } from '$lib/types/control-plane';
import type { TaskStaleSignalKey, TaskWorkItem } from '$lib/types/task-work-item';

export type GovernanceInboxItem = TaskWorkItem & {
	goalName: string;
	escalationReasons: string[];
};

export type GovernanceInboxData = {
	reviewItems: GovernanceInboxItem[];
	approvalItems: GovernanceInboxItem[];
	escalationItems: GovernanceInboxItem[];
	summary: {
		reviewCount: number;
		approvalCount: number;
		blockedCount: number;
		dependencyCount: number;
		staleCount: number;
		escalationCount: number;
	};
};

export class TaskGovernanceActionError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

function updateLatestRunForTask(
	runId: string | null,
	taskStatus: 'done' | 'blocked',
	summary: string,
	blockedReason = ''
) {
	const now = new Date().toISOString();

	return (run: Run): Run =>
		runId && run.id === runId
			? {
					...run,
					status: taskStatus === 'done' ? 'completed' : 'blocked',
					summary,
					updatedAt: now,
					endedAt: run.endedAt ?? now,
					errorSummary: taskStatus === 'blocked' ? blockedReason || run.errorSummary : ''
				}
			: run;
}

function compareByUpdatedAtDesc(left: Task, right: Task) {
	return right.updatedAt.localeCompare(left.updatedAt);
}

function buildStaleReason(task: TaskWorkItem, signal: TaskStaleSignalKey) {
	switch (signal) {
		case 'staleInProgress':
			return `In progress with no material task update for ${task.freshness.taskAgeLabel}.`;
		case 'noRecentRunActivity':
			return `Latest run heartbeat has been quiet for ${task.freshness.runActivityAgeLabel}.`;
		case 'activeThreadNoRecentOutput':
			return `Linked thread output has been quiet for ${task.freshness.threadActivityAgeLabel}.`;
		default:
			return 'Task needs operator review.';
	}
}

function buildEscalationReasons(task: TaskWorkItem) {
	const reasons: string[] = [];

	if (task.status === 'review' && !task.openReview && !task.pendingApproval) {
		reasons.push('Task is in review and needs operator follow-up.');
	}

	if (task.status === 'blocked') {
		reasons.push(task.blockedReason || 'Task is blocked and needs operator review.');
	}

	if (task.hasUnmetDependencies) {
		reasons.push(
			task.dependencyTaskNames.length > 0
				? `Waiting on dependencies: ${task.dependencyTaskNames.join(', ')}.`
				: 'Task is waiting on one or more unfinished dependencies.'
		);
	}

	for (const signal of task.freshness.staleSignals) {
		reasons.push(buildStaleReason(task, signal));
	}

	return [...new Set(reasons)];
}

function toGovernanceInboxItem(task: TaskWorkItem, goalNameById: Map<string, string>) {
	return {
		...task,
		goalName: goalNameById.get(task.goalId) ?? 'Unknown goal',
		escalationReasons: buildEscalationReasons(task)
	} satisfies GovernanceInboxItem;
}

export async function loadGovernanceInboxData(): Promise<GovernanceInboxData> {
	const controlPlanePromise = loadControlPlane();
	const [controlPlane, threads] = await Promise.all([
		controlPlanePromise,
		listAgentThreads({ controlPlane: controlPlanePromise, includeCategorization: false })
	]);
	const goalNameById = new Map(controlPlane.goals.map((goal) => [goal.id, goal.name]));
	const governanceItems = buildTaskWorkItems(controlPlane, threads).map((task) =>
		toGovernanceInboxItem(task, goalNameById)
	);

	const reviewItems = governanceItems
		.filter((task) => Boolean(task.openReview))
		.sort(compareByUpdatedAtDesc);
	const approvalItems = governanceItems
		.filter((task) => Boolean(task.pendingApproval))
		.sort(compareByUpdatedAtDesc);
	const escalationItems = governanceItems
		.filter(
			(task) =>
				!task.openReview &&
				!task.pendingApproval &&
				(task.status === 'review' ||
					task.status === 'blocked' ||
					task.hasUnmetDependencies ||
					task.freshness.isStale)
		)
		.sort((left, right) => {
			if (left.escalationReasons.length !== right.escalationReasons.length) {
				return right.escalationReasons.length - left.escalationReasons.length;
			}

			return compareByUpdatedAtDesc(left, right);
		});

	return {
		reviewItems,
		approvalItems,
		escalationItems,
		summary: {
			reviewCount: reviewItems.length,
			approvalCount: approvalItems.length,
			blockedCount: governanceItems.filter((task) => task.status === 'blocked').length,
			dependencyCount: governanceItems.filter((task) => task.hasUnmetDependencies).length,
			staleCount: governanceItems.filter((task) => task.freshness.isStale).length,
			escalationCount: escalationItems.length
		}
	};
}

export async function approveTaskReview(taskId: string, sourceLabel: string) {
	const current = await loadControlPlane();
	const openReview = getOpenReviewForTask(current, taskId);
	const task = current.tasks.find((candidate) => candidate.id === taskId);

	if (!openReview || !task) {
		throw new TaskGovernanceActionError(404, 'No open review found for this task.');
	}

	const pendingApproval = getPendingApprovalForTask(current, taskId);
	const shouldCloseTask = !pendingApproval;
	const now = new Date().toISOString();

	await updateControlPlane((data) => ({
		...data,
		reviews: data.reviews.map((review) =>
			review.id === openReview.id
				? {
						...review,
						status: 'approved',
						updatedAt: now,
						resolvedAt: now,
						summary: `Review approved from the ${sourceLabel}.`
					}
				: review
		),
		runs: shouldCloseTask
			? data.runs.map(
					updateLatestRunForTask(task.latestRunId, 'done', 'Task closed after review approval.')
				)
			: data.runs,
		tasks: data.tasks.map((candidate) =>
			candidate.id === taskId
				? {
						...candidate,
						status: shouldCloseTask ? 'done' : candidate.status,
						blockedReason: '',
						updatedAt: now
					}
				: candidate
		),
		decisions: [
			createDecision({
				taskId,
				runId: task.latestRunId,
				reviewId: openReview.id,
				decisionType: 'review_approved',
				summary: shouldCloseTask
					? 'Approved the open review and closed the task.'
					: 'Approved the open review.',
				createdAt: now
			}),
			...(data.decisions ?? [])
		]
	}));

	return {
		ok: true,
		successAction: 'approveReview',
		taskId
	};
}

export async function requestTaskReviewChanges(taskId: string, sourceLabel: string) {
	const current = await loadControlPlane();
	const openReview = getOpenReviewForTask(current, taskId);
	const task = current.tasks.find((candidate) => candidate.id === taskId);

	if (!openReview || !task) {
		throw new TaskGovernanceActionError(404, 'No open review found for this task.');
	}

	const now = new Date().toISOString();
	const blockedReason = 'Changes requested during review.';

	await updateControlPlane((data) => ({
		...data,
		reviews: data.reviews.map((review) =>
			review.id === openReview.id
				? {
						...review,
						status: 'changes_requested',
						updatedAt: now,
						resolvedAt: now,
						summary: `${blockedReason} Sent from the ${sourceLabel}.`
					}
				: review
		),
		runs: data.runs.map(
			updateLatestRunForTask(task.latestRunId, 'blocked', blockedReason, blockedReason)
		),
		tasks: data.tasks.map((candidate) =>
			candidate.id === taskId
				? {
						...candidate,
						status: 'blocked',
						blockedReason,
						updatedAt: now
					}
				: candidate
		),
		decisions: [
			createDecision({
				taskId,
				runId: task.latestRunId,
				reviewId: openReview.id,
				decisionType: 'review_changes_requested',
				summary: blockedReason,
				createdAt: now
			}),
			...(data.decisions ?? [])
		]
	}));

	return {
		ok: true,
		successAction: 'requestChanges',
		taskId
	};
}

export async function approveTaskApproval(taskId: string, sourceLabel: string) {
	const current = await loadControlPlane();
	const pendingApproval = getPendingApprovalForTask(current, taskId);
	const task = current.tasks.find((candidate) => candidate.id === taskId);

	if (!pendingApproval || !task) {
		throw new TaskGovernanceActionError(404, 'No pending approval found for this task.');
	}

	const now = new Date().toISOString();
	const openReview = getOpenReviewForTask(current, taskId);
	const shouldCloseTask = pendingApproval.mode === 'before_complete' && !openReview;

	await updateControlPlane((data) => ({
		...data,
		approvals: data.approvals.map((approval) =>
			approval.id === pendingApproval.id
				? {
						...approval,
						status: 'approved',
						updatedAt: now,
						resolvedAt: now,
						summary: `Approved ${approval.mode} gate from the ${sourceLabel}.`
					}
				: approval
		),
		runs: shouldCloseTask
			? data.runs.map(
					updateLatestRunForTask(task.latestRunId, 'done', 'Task closed after approval.')
				)
			: data.runs,
		tasks: data.tasks.map((candidate) =>
			candidate.id === taskId
				? {
						...candidate,
						status: shouldCloseTask ? 'done' : candidate.status,
						blockedReason: '',
						updatedAt: now
					}
				: candidate
		),
		decisions: [
			createDecision({
				taskId,
				runId: task.latestRunId,
				approvalId: pendingApproval.id,
				decisionType: 'approval_approved',
				summary: shouldCloseTask
					? `Approved the ${pendingApproval.mode} gate and closed the task.`
					: `Approved the ${pendingApproval.mode} gate.`,
				createdAt: now
			}),
			...(data.decisions ?? [])
		]
	}));

	return {
		ok: true,
		successAction: 'approveApproval',
		taskId
	};
}

export async function rejectTaskApproval(taskId: string) {
	const current = await loadControlPlane();
	const pendingApproval = getPendingApprovalForTask(current, taskId);
	const task = current.tasks.find((candidate) => candidate.id === taskId);

	if (!pendingApproval || !task) {
		throw new TaskGovernanceActionError(404, 'No pending approval found for this task.');
	}

	const now = new Date().toISOString();
	const blockedReason = `${pendingApproval.mode} approval rejected.`;

	await updateControlPlane((data) => ({
		...data,
		approvals: data.approvals.map((approval) =>
			approval.id === pendingApproval.id
				? {
						...approval,
						status: 'rejected',
						updatedAt: now,
						resolvedAt: now,
						summary: blockedReason
					}
				: approval
		),
		runs: data.runs.map(
			updateLatestRunForTask(task.latestRunId, 'blocked', blockedReason, blockedReason)
		),
		tasks: data.tasks.map((candidate) =>
			candidate.id === taskId
				? {
						...candidate,
						status: 'blocked',
						blockedReason,
						updatedAt: now
					}
				: candidate
		),
		decisions: [
			createDecision({
				taskId,
				runId: task.latestRunId,
				approvalId: pendingApproval.id,
				decisionType: 'approval_rejected',
				summary: blockedReason,
				createdAt: now
			}),
			...(data.decisions ?? [])
		]
	}));

	return {
		ok: true,
		successAction: 'rejectApproval',
		taskId
	};
}
