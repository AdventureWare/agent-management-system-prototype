import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AGENT_SANDBOX_OPTIONS } from '$lib/types/agent-thread';
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

type ThreadTaskResponseAction = {
	taskId: string;
	taskTitle: string;
	taskProjectId: string;
	taskStatus: Task['status'];
	taskGoalId: string;
	taskArea: Task['area'];
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

type ThreadResponseContextArtifact = {
	path: string;
	label: string;
	href: string;
	sourceLabel: string;
	actionLabel: string;
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

function resolveThreadTask(data: ControlPlaneData, threadId: string) {
	const latestThreadRun =
		[...data.runs]
			.filter((run) => run.agentThreadId === threadId)
			.sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;

	if (latestThreadRun) {
		const task = data.tasks.find((candidate) => candidate.id === latestThreadRun.taskId) ?? null;

		if (task) {
			return task;
		}
	}

	const assignedTasks = [...data.tasks]
		.filter((task) => task.agentThreadId === threadId)
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
				.filter((run) => run.agentThreadId === threadId)
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
	threadId: string;
	thread: Awaited<ReturnType<typeof getAgentThread>>;
	data: ControlPlaneData;
}): ThreadTaskResponseAction | null {
	const task = resolveThreadTask(input.data, input.threadId);

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
	} else if (input.thread?.hasActiveRun) {
		disabledReason = 'Wait for the active run to finish before approving this response.';
	} else if (!input.thread?.latestRun) {
		disabledReason = 'No thread output is available yet.';
	} else if (!input.thread.latestRun.lastMessage && input.thread.latestRunStatus !== 'completed') {
		disabledReason = 'This thread has not captured a response yet.';
	}

	return {
		taskId: task.id,
		taskTitle: task.title,
		taskProjectId: task.projectId,
		taskStatus: task.status,
		taskGoalId: task.goalId,
		taskArea: task.area,
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

function buildThreadResponseContextArtifacts(input: {
	threadId: string;
	thread: NonNullable<Awaited<ReturnType<typeof getAgentThread>>>;
	data: ControlPlaneData;
}) {
	const tasksById = new Map(input.data.tasks.map((task) => [task.id, task]));
	const relatedTaskIds = [
		resolveThreadTask(input.data, input.threadId)?.id ?? null,
		...input.thread.relatedTasks.map((task) => task.id)
	].filter(
		(taskId, index, taskIds): taskId is string =>
			Boolean(taskId) && taskIds.indexOf(taskId) === index
	);

	const contextArtifacts = relatedTaskIds.flatMap((taskId): ThreadResponseContextArtifact[] => {
		const task = tasksById.get(taskId);

		if (!task) {
			return [];
		}

		const taskHref = `/app/tasks/${task.id}#resources`;
		const artifacts: ThreadResponseContextArtifact[] = [];

		if (task.artifactPath.trim().length > 0) {
			artifacts.push({
				path: task.artifactPath,
				label: task.title,
				href: taskHref,
				sourceLabel: 'Task outputs',
				actionLabel: 'Open task'
			});
		}

		for (const attachment of task.attachments) {
			artifacts.push({
				path: attachment.path,
				label: attachment.name,
				href: taskHref,
				sourceLabel: 'Task attachment',
				actionLabel: 'Open task'
			});
		}

		return artifacts;
	});

	return contextArtifacts.filter(
		(artifact, index, artifacts) =>
			artifacts.findIndex((candidate) => candidate.path === artifact.path) === index
	);
}

function getLatestThreadPrompt(thread: NonNullable<Awaited<ReturnType<typeof getAgentThread>>>) {
	const prompt = thread.latestRun?.prompt?.trim() ?? '';

	if (!prompt) {
		throw new Error('No saved request is available to replay from this thread.');
	}

	return prompt;
}

function getTasksToCarryForward(data: ControlPlaneData, threadId: string) {
	const directlyAssignedTasks = data.tasks.filter(
		(task) => task.agentThreadId === threadId && task.status !== 'done'
	);

	if (directlyAssignedTasks.length > 0) {
		return directlyAssignedTasks;
	}

	const resolvedTask = resolveThreadTask(data, threadId);

	if (!resolvedTask || resolvedTask.status === 'done') {
		return [];
	}

	return [resolvedTask];
}

function reopenTasksForThreadRetry(input: {
	data: ControlPlaneData;
	sourceThreadId: string;
	targetThreadId: string;
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
			agentThreadId: input.targetThreadId,
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
				agentThreadId: input.targetThreadId,
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
							input.targetThreadId === input.sourceThreadId
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
							input.targetThreadId === input.sourceThreadId
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
	const controlPlanePromise = loadControlPlane();
	const [data, thread] = await Promise.all([
		controlPlanePromise,
		getAgentThread(params.threadId, { controlPlane: controlPlanePromise })
	]);

	if (!thread) {
		throw error(404, 'Thread not found.');
	}

	return {
		thread,
		sandboxOptions: AGENT_SANDBOX_OPTIONS,
		taskResponseAction: buildTaskResponseAction({
			threadId: params.threadId,
			thread,
			data
		}),
		responseContextArtifacts: buildThreadResponseContextArtifacts({
			threadId: params.threadId,
			thread,
			data
		})
	};
};

export const actions: Actions = {
	updateThreadSandbox: async ({ params, request }) => {
		const form = await request.formData();
		const nextSandbox = parseAgentSandbox(form.get('sandbox')?.toString(), 'workspace-write');
		const thread = await getAgentThread(params.threadId);

		if (!thread) {
			return fail(404, { message: 'Thread not found.' });
		}

		await updateAgentThreadSandbox(params.threadId, nextSandbox);

		return {
			ok: true,
			successAction: 'updateThreadSandbox',
			threadId: params.threadId
		};
	},

	recoverThread: async ({ params }) => {
		const thread = await getAgentThread(params.threadId);

		if (!thread) {
			return fail(404, { message: 'Thread not found.' });
		}

		let prompt = '';

		try {
			prompt = getLatestThreadPrompt(thread);
		} catch (err) {
			return fail(409, {
				message: err instanceof Error ? err.message : 'No saved request is available to recover.'
			});
		}

		if (thread.hasActiveRun) {
			if (thread.origin !== 'managed') {
				return fail(409, {
					message:
						'Imported Codex threads with an active run cannot be force-recovered yet. Move the latest request to a new thread instead.'
				});
			}

			try {
				await recoverAgentThread(params.threadId);
			} catch (err) {
				return fail(400, {
					message: err instanceof Error ? err.message : 'Could not recover the active work thread.'
				});
			}
		}

		const refreshed = await getAgentThread(params.threadId);

		if (!refreshed?.canResume || !refreshed.threadId) {
			return fail(409, {
				message:
					'This thread cannot be recovered in place because no resumable Codex thread id is available. Move the latest request to a new thread instead.'
			});
		}

		try {
			await sendAgentThreadMessage(params.threadId, prompt);
		} catch (err) {
			return fail(400, {
				message:
					err instanceof Error
						? err.message
						: 'Could not re-queue the latest request in this thread.'
			});
		}

		const current = await loadControlPlane();
		const tasksToCarryForward = getTasksToCarryForward(current, params.threadId);

		if (tasksToCarryForward.length > 0) {
			await updateControlPlane((data) =>
				reopenTasksForThreadRetry({
					data,
					sourceThreadId: params.threadId,
					targetThreadId: params.threadId,
					threadId: refreshed.threadId,
					prompt,
					tasks: getTasksToCarryForward(data, params.threadId),
					runSummary: 'Recovered the work thread and re-queued the latest request.',
					decisionSummary: (task) =>
						`Recovered thread ${params.threadId} from the thread detail page and re-queued the latest request for ${task.title}.`
				})
			);
		}

		return {
			ok: true,
			successAction: 'recoverThread',
			threadId: params.threadId
		};
	},

	moveLatestRequestToNewThread: async ({ params }) => {
		const thread = await getAgentThread(params.threadId);

		if (!thread) {
			return fail(404, { message: 'Thread not found.' });
		}

		let prompt = '';

		try {
			prompt = getLatestThreadPrompt(thread);
		} catch (err) {
			return fail(409, {
				message: err instanceof Error ? err.message : 'No saved request is available to move.'
			});
		}

		if (thread.hasActiveRun) {
			if (thread.origin !== 'managed') {
				return fail(409, {
					message:
						'Imported Codex threads with an active run cannot be force-recovered yet. Wait for the run to finish or cancel it before moving work.'
				});
			}

			try {
				await recoverAgentThread(params.threadId);
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
				name: thread.name,
				cwd: thread.cwd,
				additionalWritableRoots: thread.additionalWritableRoots ?? [],
				prompt,
				sandbox: thread.sandbox,
				model: thread.model
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
		const tasksToCarryForward = getTasksToCarryForward(current, params.threadId);

		if (tasksToCarryForward.length > 0) {
			await updateControlPlane((data) =>
				reopenTasksForThreadRetry({
					data,
					sourceThreadId: params.threadId,
					targetThreadId: nextThread.agentThreadId,
					threadId: null,
					prompt,
					tasks: getTasksToCarryForward(data, params.threadId),
					runSummary: 'Moved the latest request into a new work thread.',
					decisionSummary: (task) =>
						`Moved the latest request from thread ${params.threadId} to fresh thread ${nextThread.agentThreadId} from the thread detail page for ${task.title}.`
				})
			);
		}

		return {
			ok: true,
			successAction: 'moveLatestRequestToNewThread',
			threadId: nextThread.agentThreadId,
			previousThreadId: params.threadId
		};
	},

	approveTaskResponse: async ({ params }) => {
		const [thread, current] = await Promise.all([
			getAgentThread(params.threadId),
			loadControlPlane()
		]);

		if (!thread) {
			return fail(404, { message: 'Thread not found.' });
		}

		const task = resolveThreadTask(current, params.threadId);

		if (!task) {
			return fail(404, { message: 'No task response is linked to this thread.' });
		}

		if (task.status === 'done') {
			return fail(409, { message: 'This task is already complete.' });
		}

		if (thread.hasActiveRun) {
			return fail(409, {
				message: 'Wait for the active run to finish before approving this thread response.'
			});
		}

		if (
			!thread.latestRun ||
			(!thread.latestRun.lastMessage && thread.latestRunStatus !== 'completed')
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
