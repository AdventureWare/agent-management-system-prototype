import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AGENT_SANDBOX_OPTIONS } from '$lib/types/agent-session';
import {
	getAgentThread,
	parseAgentSandbox,
	updateAgentThreadSandbox
} from '$lib/server/agent-threads';
import {
	createApproval,
	createDecision,
	createReview,
	getOpenReviewForTask,
	getPendingApprovalForTask,
	loadControlPlane,
	updateControlPlane
} from '$lib/server/control-plane';
import type { Approval, ControlPlaneData, Review, Run, Task } from '$lib/types/control-plane';

type SessionTaskResponseAction = {
	taskId: string;
	taskTitle: string;
	taskStatus: Task['status'];
	openReview: Review | null;
	pendingApproval: Approval | null;
	canApproveAndComplete: boolean;
	helperText: string;
	disabledReason: string;
};

function updateLatestRunForTask(runId: string | null, summary: string) {
	const now = new Date().toISOString();

	return (run: Run): Run =>
		runId && run.id === runId
			? {
					...run,
					status: 'completed',
					summary,
					updatedAt: now,
					endedAt: run.endedAt ?? now,
					errorSummary: ''
				}
			: run;
}

function resolveSessionTask(data: ControlPlaneData, sessionId: string) {
	const latestSessionRun =
		[...data.runs]
			.filter((run) => run.sessionId === sessionId)
			.sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;

	if (latestSessionRun) {
		const task = data.tasks.find((candidate) => candidate.id === latestSessionRun.taskId) ?? null;

		if (task) {
			return task;
		}
	}

	const assignedTasks = [...data.tasks]
		.filter((task) => task.threadSessionId === sessionId)
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

	if (assignedTasks.length === 1) {
		return assignedTasks[0] ?? null;
	}

	if (assignedTasks.length > 1) {
		return null;
	}

	const relatedTaskIds = [
		...new Set(
			data.runs
				.filter((run) => run.sessionId === sessionId)
				.map((run) => run.taskId)
				.filter(Boolean)
		)
	];

	if (relatedTaskIds.length !== 1) {
		return null;
	}

	return data.tasks.find((task) => task.id === relatedTaskIds[0]) ?? null;
}

function buildTaskResponseAction(input: {
	sessionId: string;
	session: Awaited<ReturnType<typeof getAgentThread>>;
	data: ControlPlaneData;
}): SessionTaskResponseAction | null {
	const task = resolveSessionTask(input.data, input.sessionId);

	if (!task) {
		return null;
	}

	const openReview = getOpenReviewForTask(input.data, task.id);
	const pendingApproval = getPendingApprovalForTask(input.data, task.id);
	let helperText = 'Approve the response captured in this thread and mark the task complete.';
	let disabledReason = '';

	if (openReview && pendingApproval) {
		helperText =
			'Approving here will close the open review, approve the pending gate, and mark the task complete.';
	} else if (openReview) {
		helperText =
			'Approving here will close the open review and mark the task complete from this thread.';
	} else if (pendingApproval) {
		helperText =
			'Approving here will approve the pending gate and mark the task complete from this thread.';
	}

	if (task.status === 'done') {
		disabledReason = 'This task is already complete.';
	} else if (input.session?.hasActiveRun) {
		disabledReason = 'Wait for the active run to finish before approving this response.';
	} else if (!input.session?.latestRun) {
		disabledReason = 'No thread output is available yet.';
	} else if (
		!input.session.latestRun.lastMessage &&
		input.session.latestRunStatus !== 'completed'
	) {
		disabledReason = 'This thread has not captured a response yet.';
	}

	return {
		taskId: task.id,
		taskTitle: task.title,
		taskStatus: task.status,
		openReview,
		pendingApproval,
		canApproveAndComplete: disabledReason.length === 0,
		helperText,
		disabledReason
	};
}

export const load: PageServerLoad = async ({ params }) => {
	const [session, data] = await Promise.all([getAgentThread(params.sessionId), loadControlPlane()]);

	if (!session) {
		throw error(404, 'Thread not found.');
	}

	return {
		session,
		sandboxOptions: AGENT_SANDBOX_OPTIONS,
		taskResponseAction: buildTaskResponseAction({
			sessionId: params.sessionId,
			session,
			data
		})
	};
};

export const actions: Actions = {
	updateSessionSandbox: async ({ params, request }) => {
		const form = await request.formData();
		const nextSandbox = parseAgentSandbox(form.get('sandbox')?.toString(), 'workspace-write');
		const session = await getAgentThread(params.sessionId);

		if (!session) {
			return fail(404, { message: 'Thread not found.' });
		}

		await updateAgentThreadSandbox(params.sessionId, nextSandbox);

		return {
			ok: true,
			successAction: 'updateSessionSandbox',
			sessionId: params.sessionId
		};
	},

	approveTaskResponse: async ({ params }) => {
		const [session, current] = await Promise.all([
			getAgentThread(params.sessionId),
			loadControlPlane()
		]);

		if (!session) {
			return fail(404, { message: 'Thread not found.' });
		}

		const task = resolveSessionTask(current, params.sessionId);

		if (!task) {
			return fail(404, { message: 'No task response is linked to this thread.' });
		}

		if (task.status === 'done') {
			return fail(409, { message: 'This task is already complete.' });
		}

		if (session.hasActiveRun) {
			return fail(409, {
				message: 'Wait for the active run to finish before approving this thread response.'
			});
		}

		if (
			!session.latestRun ||
			(!session.latestRun.lastMessage && session.latestRunStatus !== 'completed')
		) {
			return fail(409, { message: 'No saved thread response is available to approve yet.' });
		}

		const openReview = getOpenReviewForTask(current, task.id);
		const pendingApproval = getPendingApprovalForTask(current, task.id);
		const now = new Date().toISOString();
		const hasCurrentRunReview = current.reviews.some(
			(review) => review.taskId === task.id && review.runId === task.latestRunId
		);
		const hasCurrentRunCompletionApproval = current.approvals.some(
			(approval) =>
				approval.taskId === task.id &&
				approval.mode === 'before_complete' &&
				approval.runId === task.latestRunId
		);

		await updateControlPlane((data) => ({
			...data,
			reviews: (() => {
				const nextReviews = data.reviews.map((review) =>
					review.id === openReview?.id
						? {
								...review,
								status: 'approved' as const,
								updatedAt: now,
								resolvedAt: now,
								summary: 'Approved from the thread detail page while completing the task.'
							}
						: review
				);

				if (!openReview && task.requiresReview && !hasCurrentRunReview) {
					nextReviews.unshift(
						createReview({
							taskId: task.id,
							runId: task.latestRunId,
							status: 'approved',
							resolvedAt: now,
							summary: 'Approved from the thread detail page while completing the task.'
						})
					);
				}

				return nextReviews;
			})(),
			approvals: (() => {
				const nextApprovals = data.approvals.map((approval) =>
					approval.id === pendingApproval?.id
						? {
								...approval,
								status: 'approved' as const,
								updatedAt: now,
								resolvedAt: now,
								summary: 'Approved from the thread detail page while completing the task.'
							}
						: approval
				);

				if (
					!pendingApproval &&
					task.approvalMode === 'before_complete' &&
					!hasCurrentRunCompletionApproval
				) {
					nextApprovals.unshift(
						createApproval({
							taskId: task.id,
							runId: task.latestRunId,
							mode: 'before_complete',
							status: 'approved',
							resolvedAt: now,
							summary: 'Approved from the thread detail page while completing the task.'
						})
					);
				}

				return nextApprovals;
			})(),
			runs: data.runs.map(
				updateLatestRunForTask(
					task.latestRunId,
					'Task approved and completed from the thread detail page.'
				)
			),
			tasks: data.tasks.map((candidate) =>
				candidate.id === task.id
					? {
							...candidate,
							status: 'done',
							blockedReason: '',
							updatedAt: now
						}
					: candidate
			),
			decisions: [
				createDecision({
					taskId: task.id,
					runId: task.latestRunId,
					decisionType: 'task_completed',
					summary:
						'Approved the thread response and completed the task from the thread detail page.',
					createdAt: now
				}),
				...(data.decisions ?? [])
			]
		}));

		return {
			ok: true,
			successAction: 'approveTaskResponse',
			taskId: task.id
		};
	}
};
