import { listAgentThreads } from '$lib/server/agent-threads';
import {
	createDecision,
	getOpenReviewForTask,
	getPendingApprovalForTask,
	loadControlPlane
} from '$lib/server/control-plane';
import { mutateTaskCollections } from '$lib/server/control-plane-repository';
import { buildTaskWorkItems } from '$lib/server/task-work-items';
import type { Run, Task } from '$lib/types/control-plane';
import type { TaskStaleSignalKey, TaskWorkItem } from '$lib/types/task-work-item';

export type GovernanceInboxItem = TaskWorkItem & {
	goalName: string;
	escalationReasons: string[];
};

export type GovernanceInboxQueueKind = 'review' | 'approval' | 'escalation';

export type GovernanceInboxQueueItem = GovernanceInboxItem & {
	queueKinds: GovernanceInboxQueueKind[];
	primaryQueueKind: GovernanceInboxQueueKind;
	queueSummary: string;
};

export type GovernanceInboxData = {
	reviewItems: GovernanceInboxItem[];
	approvalItems: GovernanceInboxItem[];
	escalationItems: GovernanceInboxItem[];
	queueItems: GovernanceInboxQueueItem[];
	summary: {
		queueCount: number;
		reviewCount: number;
		reviewFollowUpCount: number;
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

function isReviewFollowUpTask(task: GovernanceInboxItem) {
	return Boolean(task.openReview) || (task.status === 'review' && !task.pendingApproval);
}

function isEscalationTask(task: GovernanceInboxItem) {
	return (
		!task.openReview &&
		!task.pendingApproval &&
		(task.status === 'review' ||
			task.status === 'blocked' ||
			task.hasUnmetDependencies ||
			task.freshness.isStale)
	);
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

function buildQueueKinds(task: GovernanceInboxItem): GovernanceInboxQueueKind[] {
	const kinds: GovernanceInboxQueueKind[] = [];

	if (isReviewFollowUpTask(task)) {
		kinds.push('review');
	}

	if (task.pendingApproval) {
		kinds.push('approval');
	}

	if (isEscalationTask(task)) {
		kinds.push('escalation');
	}

	return kinds;
}

function buildQueueSummary(task: GovernanceInboxItem) {
	if (task.openReview && task.pendingApproval) {
		return 'Review follow-up and approval gate are both waiting.';
	}

	if (task.openReview) {
		return task.openReview.summary?.trim() || 'Waiting on reviewer decision.';
	}

	if (task.pendingApproval) {
		return task.pendingApproval.summary?.trim() || 'Waiting on approval decision.';
	}

	return task.escalationReasons[0] ?? 'Needs operator follow-up.';
}

function getQueueKindRank(kind: GovernanceInboxQueueKind) {
	switch (kind) {
		case 'review':
			return 3;
		case 'approval':
			return 2;
		case 'escalation':
			return 1;
	}
}

function compareEscalationItems(left: GovernanceInboxItem, right: GovernanceInboxItem) {
	if (left.escalationReasons.length !== right.escalationReasons.length) {
		return right.escalationReasons.length - left.escalationReasons.length;
	}

	return compareByUpdatedAtDesc(left, right);
}

function compareQueueItems(left: GovernanceInboxQueueItem, right: GovernanceInboxQueueItem) {
	const leftRank = getQueueKindRank(left.primaryQueueKind);
	const rightRank = getQueueKindRank(right.primaryQueueKind);

	if (leftRank !== rightRank) {
		return rightRank - leftRank;
	}

	if (left.primaryQueueKind === 'review' && right.primaryQueueKind === 'review') {
		if (Boolean(left.openReview) !== Boolean(right.openReview)) {
			return Number(Boolean(right.openReview)) - Number(Boolean(left.openReview));
		}
	}

	if (left.queueKinds.length !== right.queueKinds.length) {
		return right.queueKinds.length - left.queueKinds.length;
	}

	if (left.primaryQueueKind === 'escalation' && right.primaryQueueKind === 'escalation') {
		return compareEscalationItems(left, right);
	}

	return compareByUpdatedAtDesc(left, right);
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
	const escalationItems = governanceItems.filter(isEscalationTask).sort(compareEscalationItems);
	const queueItems = governanceItems
		.map((task) => {
			const queueKinds = buildQueueKinds(task);

			if (queueKinds.length === 0) {
				return null;
			}

			return {
				...task,
				queueKinds,
				primaryQueueKind: queueKinds[0],
				queueSummary: buildQueueSummary(task)
			} satisfies GovernanceInboxQueueItem;
		})
		.filter((task): task is GovernanceInboxQueueItem => Boolean(task))
		.sort(compareQueueItems);
	const reviewFollowUpCount = governanceItems.filter(isReviewFollowUpTask).length;

	return {
		reviewItems,
		approvalItems,
		escalationItems,
		queueItems,
		summary: {
			queueCount: queueItems.length,
			reviewCount: reviewItems.length,
			reviewFollowUpCount,
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

	if (!openReview || !current.tasks.some((candidate) => candidate.id === taskId)) {
		throw new TaskGovernanceActionError(404, 'No open review found for this task.');
	}

	const now = new Date().toISOString();

	const updatedTask = await mutateTaskCollections({
		taskId,
		mutate: (taskFromData, data) => {
			const reviewFromData = getOpenReviewForTask(data, taskId);
			const pendingApprovalFromData = getPendingApprovalForTask(data, taskId);

			if (!reviewFromData) {
				throw new TaskGovernanceActionError(404, 'No open review found for this task.');
			}

			const shouldCloseTask = !pendingApprovalFromData;

			return {
				data: {
					...data,
					reviews: data.reviews.map((review) =>
						review.id === reviewFromData.id
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
								updateLatestRunForTask(
									taskFromData.latestRunId,
									'done',
									'Task closed after review approval.'
								)
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
							runId: taskFromData.latestRunId,
							reviewId: reviewFromData.id,
							decisionType: 'review_approved',
							summary: shouldCloseTask
								? 'Approved the open review and closed the task.'
								: 'Approved the open review.',
							createdAt: now
						}),
						...(data.decisions ?? [])
					]
				},
				changedCollections: ['reviews', 'runs', 'tasks', 'decisions']
			};
		}
	});

	if (!updatedTask) {
		throw new TaskGovernanceActionError(404, 'No open review found for this task.');
	}

	return {
		ok: true,
		successAction: 'approveReview',
		taskId
	};
}

export async function requestTaskReviewChanges(taskId: string, sourceLabel: string) {
	const current = await loadControlPlane();
	const openReview = getOpenReviewForTask(current, taskId);

	if (!openReview || !current.tasks.some((candidate) => candidate.id === taskId)) {
		throw new TaskGovernanceActionError(404, 'No open review found for this task.');
	}

	const now = new Date().toISOString();
	const blockedReason = 'Changes requested during review.';

	const updatedTask = await mutateTaskCollections({
		taskId,
		mutate: (taskFromData, data) => {
			const reviewFromData = getOpenReviewForTask(data, taskId);

			if (!reviewFromData) {
				throw new TaskGovernanceActionError(404, 'No open review found for this task.');
			}

			return {
				data: {
					...data,
					reviews: data.reviews.map((review) =>
						review.id === reviewFromData.id
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
						updateLatestRunForTask(
							taskFromData.latestRunId,
							'blocked',
							blockedReason,
							blockedReason
						)
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
							runId: taskFromData.latestRunId,
							reviewId: reviewFromData.id,
							decisionType: 'review_changes_requested',
							summary: blockedReason,
							createdAt: now
						}),
						...(data.decisions ?? [])
					]
				},
				changedCollections: ['reviews', 'runs', 'tasks', 'decisions']
			};
		}
	});

	if (!updatedTask) {
		throw new TaskGovernanceActionError(404, 'No open review found for this task.');
	}

	return {
		ok: true,
		successAction: 'requestChanges',
		taskId
	};
}

export async function approveTaskApproval(taskId: string, sourceLabel: string) {
	const current = await loadControlPlane();
	const pendingApproval = getPendingApprovalForTask(current, taskId);

	if (!pendingApproval || !current.tasks.some((candidate) => candidate.id === taskId)) {
		throw new TaskGovernanceActionError(404, 'No pending approval found for this task.');
	}

	const now = new Date().toISOString();

	const updatedTask = await mutateTaskCollections({
		taskId,
		mutate: (taskFromData, data) => {
			const approvalFromData = getPendingApprovalForTask(data, taskId);
			const openReviewFromData = getOpenReviewForTask(data, taskId);

			if (!approvalFromData) {
				throw new TaskGovernanceActionError(404, 'No pending approval found for this task.');
			}

			const shouldCloseTask = approvalFromData.mode === 'before_complete' && !openReviewFromData;

			return {
				data: {
					...data,
					approvals: data.approvals.map((approval) =>
						approval.id === approvalFromData.id
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
								updateLatestRunForTask(
									taskFromData.latestRunId,
									'done',
									'Task closed after approval.'
								)
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
							runId: taskFromData.latestRunId,
							approvalId: approvalFromData.id,
							decisionType: 'approval_approved',
							summary: shouldCloseTask
								? `Approved the ${approvalFromData.mode} gate and closed the task.`
								: `Approved the ${approvalFromData.mode} gate.`,
							createdAt: now
						}),
						...(data.decisions ?? [])
					]
				},
				changedCollections: ['approvals', 'runs', 'tasks', 'decisions']
			};
		}
	});

	if (!updatedTask) {
		throw new TaskGovernanceActionError(404, 'No pending approval found for this task.');
	}

	return {
		ok: true,
		successAction: 'approveApproval',
		taskId
	};
}

export async function rejectTaskApproval(taskId: string) {
	const current = await loadControlPlane();
	const pendingApproval = getPendingApprovalForTask(current, taskId);

	if (!pendingApproval || !current.tasks.some((candidate) => candidate.id === taskId)) {
		throw new TaskGovernanceActionError(404, 'No pending approval found for this task.');
	}

	const now = new Date().toISOString();
	const blockedReason = `${pendingApproval.mode} approval rejected.`;

	const updatedTask = await mutateTaskCollections({
		taskId,
		mutate: (taskFromData, data) => {
			const approvalFromData = getPendingApprovalForTask(data, taskId);

			if (!approvalFromData) {
				throw new TaskGovernanceActionError(404, 'No pending approval found for this task.');
			}

			return {
				data: {
					...data,
					approvals: data.approvals.map((approval) =>
						approval.id === approvalFromData.id
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
						updateLatestRunForTask(
							taskFromData.latestRunId,
							'blocked',
							blockedReason,
							blockedReason
						)
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
							runId: taskFromData.latestRunId,
							approvalId: approvalFromData.id,
							decisionType: 'approval_rejected',
							summary: blockedReason,
							createdAt: now
						}),
						...(data.decisions ?? [])
					]
				},
				changedCollections: ['approvals', 'runs', 'tasks', 'decisions']
			};
		}
	});

	if (!updatedTask) {
		throw new TaskGovernanceActionError(404, 'No pending approval found for this task.');
	}

	return {
		ok: true,
		successAction: 'rejectApproval',
		taskId
	};
}
