import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AGENT_SANDBOX_OPTIONS } from '$lib/types/agent-session';
import {
	getAgentThread,
	parseAgentSandbox,
	recoverAgentThread,
	sendAgentThreadMessage,
	startAgentThread,
	updateAgentThreadSandbox
} from '$lib/server/agent-threads';
import {
	createApproval,
	createDecision,
	createRun,
	createReview,
	getOpenReviewForTask,
	getPendingApprovalForTask,
	loadControlPlane,
	updateControlPlane
} from '$lib/server/control-plane';
import { buildPromptDigest } from '$lib/server/task-threads';
import type { Approval, ControlPlaneData, Review, Run, Task } from '$lib/types/control-plane';

type SessionTaskResponseAction = {
	taskId: string;
	taskTitle: string;
	taskProjectId: string;
	taskStatus: Task['status'];
	taskGoalId: string;
	taskLane: Task['lane'];
	taskPriority: Task['priority'];
	taskRiskLevel: Task['riskLevel'];
	taskApprovalMode: Task['approvalMode'];
	taskRequiresReview: boolean;
	taskDesiredRoleId: string;
	taskAssigneeWorkerId: string;
	taskTargetDate: string;
	taskRequiredCapabilityNames: string[];
	taskRequiredToolNames: string[];
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
		taskProjectId: task.projectId,
		taskStatus: task.status,
		taskGoalId: task.goalId,
		taskLane: task.lane,
		taskPriority: task.priority,
		taskRiskLevel: task.riskLevel,
		taskApprovalMode: task.approvalMode,
		taskRequiresReview: task.requiresReview,
		taskDesiredRoleId: task.desiredRoleId,
		taskAssigneeWorkerId: task.assigneeWorkerId ?? '',
		taskTargetDate: task.targetDate ?? '',
		taskRequiredCapabilityNames: task.requiredCapabilityNames ?? [],
		taskRequiredToolNames: task.requiredToolNames ?? [],
		openReview,
		pendingApproval,
		canApproveAndComplete: disabledReason.length === 0,
		helperText,
		disabledReason
	};
}

function getLatestThreadPrompt(session: NonNullable<Awaited<ReturnType<typeof getAgentThread>>>) {
	const prompt = session.latestRun?.prompt?.trim() ?? '';

	if (!prompt) {
		throw new Error('No saved request is available to replay from this thread.');
	}

	return prompt;
}

function getTasksToCarryForward(data: ControlPlaneData, sessionId: string) {
	const directlyAssignedTasks = data.tasks.filter(
		(task) => task.threadSessionId === sessionId && task.status !== 'done'
	);

	if (directlyAssignedTasks.length > 0) {
		return directlyAssignedTasks;
	}

	const resolvedTask = resolveSessionTask(data, sessionId);

	if (!resolvedTask || resolvedTask.status === 'done') {
		return [];
	}

	return [resolvedTask];
}

function reopenTasksForThreadRetry(input: {
	data: ControlPlaneData;
	sourceSessionId: string;
	targetSessionId: string;
	threadId: string | null;
	prompt: string;
	tasks: Task[];
	runSummary: string;
	decisionSummary: (task: Task) => string;
}) {
	if (input.tasks.length === 0) {
		return input.data;
	}

	const now = new Date().toISOString();
	const existingRunsById = new Map(input.data.runs.map((run) => [run.id, run]));
	const nextRuns = input.tasks.map((task) => {
		const latestRun = task.latestRunId ? (existingRunsById.get(task.latestRunId) ?? null) : null;

		return createRun({
			taskId: task.id,
			workerId: latestRun?.workerId ?? null,
			providerId: latestRun?.providerId ?? null,
			status: 'running',
			startedAt: now,
			threadId: input.threadId,
			sessionId: input.targetSessionId,
			promptDigest: buildPromptDigest(input.prompt),
			artifactPaths: latestRun?.artifactPaths.length
				? latestRun.artifactPaths
				: task.artifactPath
					? [task.artifactPath]
					: [],
			summary: input.runSummary,
			lastHeartbeatAt: now
		});
	});
	const nextRunByTaskId = new Map(nextRuns.map((run) => [run.taskId, run]));
	const taskIds = new Set(input.tasks.map((task) => task.id));

	return {
		...input.data,
		tasks: input.data.tasks.map((task) => {
			if (!taskIds.has(task.id)) {
				return task;
			}

			const nextRun = nextRunByTaskId.get(task.id);

			if (!nextRun) {
				return task;
			}

			return {
				...task,
				threadSessionId: input.targetSessionId,
				latestRunId: nextRun.id,
				runCount: task.runCount + 1,
				status: 'in_progress' as const,
				blockedReason: '',
				updatedAt: now
			};
		}),
		runs: [...nextRuns, ...input.data.runs],
		reviews: input.data.reviews.map((review) =>
			taskIds.has(review.taskId) && review.status === 'open'
				? {
						...review,
						status: 'dismissed' as const,
						updatedAt: now,
						resolvedAt: now,
						summary:
							input.targetSessionId === input.sourceSessionId
								? 'Dismissed after the thread was recovered and re-queued from the thread detail page.'
								: 'Dismissed after work moved to a new thread from the thread detail page.'
					}
				: review
		),
		approvals: input.data.approvals.map((approval) =>
			taskIds.has(approval.taskId) &&
			approval.mode === 'before_complete' &&
			approval.status === 'pending'
				? {
						...approval,
						status: 'canceled' as const,
						updatedAt: now,
						resolvedAt: now,
						summary:
							input.targetSessionId === input.sourceSessionId
								? 'Canceled after the thread was recovered and re-queued from the thread detail page.'
								: 'Canceled after work moved to a new thread from the thread detail page.'
					}
				: approval
		),
		decisions: [
			...input.tasks.map((task) =>
				createDecision({
					taskId: task.id,
					runId: nextRunByTaskId.get(task.id)?.id ?? null,
					decisionType: 'task_recovered',
					summary: input.decisionSummary(task),
					createdAt: now
				})
			),
			...(input.data.decisions ?? [])
		]
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

	recoverSessionThread: async ({ params }) => {
		const session = await getAgentThread(params.sessionId);

		if (!session) {
			return fail(404, { message: 'Thread not found.' });
		}

		let prompt = '';

		try {
			prompt = getLatestThreadPrompt(session);
		} catch (err) {
			return fail(409, {
				message: err instanceof Error ? err.message : 'No saved request is available to recover.'
			});
		}

		if (session.hasActiveRun) {
			if (session.origin !== 'managed') {
				return fail(409, {
					message:
						'Imported Codex threads with an active run cannot be force-recovered yet. Move the latest request to a new thread instead.'
				});
			}

			try {
				await recoverAgentThread(params.sessionId);
			} catch (err) {
				return fail(400, {
					message: err instanceof Error ? err.message : 'Could not recover the active work thread.'
				});
			}
		}

		const refreshed = await getAgentThread(params.sessionId);

		if (!refreshed?.canResume || !refreshed.threadId) {
			return fail(409, {
				message:
					'This thread cannot be recovered in place because no resumable Codex thread id is available. Move the latest request to a new thread instead.'
			});
		}

		try {
			await sendAgentThreadMessage(params.sessionId, prompt);
		} catch (err) {
			return fail(400, {
				message:
					err instanceof Error
						? err.message
						: 'Could not re-queue the latest request in this thread.'
			});
		}

		const current = await loadControlPlane();
		const tasksToCarryForward = getTasksToCarryForward(current, params.sessionId);

		if (tasksToCarryForward.length > 0) {
			await updateControlPlane((data) =>
				reopenTasksForThreadRetry({
					data,
					sourceSessionId: params.sessionId,
					targetSessionId: params.sessionId,
					threadId: refreshed.threadId,
					prompt,
					tasks: getTasksToCarryForward(data, params.sessionId),
					runSummary: 'Recovered the work thread and re-queued the latest request.',
					decisionSummary: (task) =>
						`Recovered thread ${params.sessionId} from the thread detail page and re-queued the latest request for ${task.title}.`
				})
			);
		}

		return {
			ok: true,
			successAction: 'recoverSessionThread',
			sessionId: params.sessionId
		};
	},

	moveLatestRequestToNewThread: async ({ params }) => {
		const session = await getAgentThread(params.sessionId);

		if (!session) {
			return fail(404, { message: 'Thread not found.' });
		}

		let prompt = '';

		try {
			prompt = getLatestThreadPrompt(session);
		} catch (err) {
			return fail(409, {
				message: err instanceof Error ? err.message : 'No saved request is available to move.'
			});
		}

		if (session.hasActiveRun) {
			if (session.origin !== 'managed') {
				return fail(409, {
					message:
						'Imported Codex threads with an active run cannot be force-recovered yet. Wait for the run to finish or cancel it before moving work.'
				});
			}

			try {
				await recoverAgentThread(params.sessionId);
			} catch (err) {
				return fail(400, {
					message:
						err instanceof Error
							? err.message
							: 'Could not retire the current run before moving work.'
				});
			}
		}

		let nextThread: Awaited<ReturnType<typeof startAgentThread>>;

		try {
			nextThread = await startAgentThread({
				name: session.name,
				cwd: session.cwd,
				prompt,
				sandbox: session.sandbox,
				model: session.model
			});
		} catch (err) {
			return fail(400, {
				message:
					err instanceof Error
						? err.message
						: 'Could not start a new thread for the latest request.'
			});
		}

		const current = await loadControlPlane();
		const tasksToCarryForward = getTasksToCarryForward(current, params.sessionId);

		if (tasksToCarryForward.length > 0) {
			await updateControlPlane((data) =>
				reopenTasksForThreadRetry({
					data,
					sourceSessionId: params.sessionId,
					targetSessionId: nextThread.sessionId,
					threadId: null,
					prompt,
					tasks: getTasksToCarryForward(data, params.sessionId),
					runSummary: 'Moved the latest request into a new work thread.',
					decisionSummary: (task) =>
						`Moved the latest request from thread ${params.sessionId} to fresh thread ${nextThread.sessionId} from the thread detail page for ${task.title}.`
				})
			);
		}

		return {
			ok: true,
			successAction: 'moveLatestRequestToNewThread',
			sessionId: nextThread.sessionId,
			previousSessionId: params.sessionId
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
