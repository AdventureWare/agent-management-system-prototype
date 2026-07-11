import {
	getOpenReviewForTask,
	getPendingApprovalForTask,
	taskHasUnmetDependencies
} from '$lib/server/control-plane';
import {
	buildGoalWorkLoopClassification,
	type ClassifiedGoalWorkTask,
	type GoalWorkClassification,
	type GoalWorkLoopRecommendationKind
} from '$lib/server/goal-work-loop';
import {
	buildGoalLoopWorkPacket,
	type GoalLoopWorkPacketMode
} from '$lib/server/goal-work-packets';
import type {
	Approval,
	ControlPlaneData,
	Decision,
	Goal,
	Project,
	Review,
	Run,
	Task,
	Workflow
} from '$lib/types/control-plane';

export type TaskLoopReportNextAction =
	| 'execute_task'
	| 'continue_run'
	| 'review_result'
	| 'resolve_approval'
	| 'resolve_blocker'
	| 'complete_or_close_out'
	| 'plan_task'
	| 'research_task'
	| 'clarify_task'
	| 'create_follow_up'
	| 'no_action';

export type TaskLoopReport = {
	task: TaskLoopReportTaskSummary;
	project: TaskLoopReportProjectSummary | null;
	goal: TaskLoopReportGoalSummary | null;
	classification: TaskLoopReportClassification;
	readiness: TaskLoopReportReadiness;
	latestRun: TaskLoopReportRunSummary | null;
	openReview: TaskLoopReportReviewSummary | null;
	pendingApproval: TaskLoopReportApprovalSummary | null;
	associations: TaskLoopReportAssociationSummary;
	dependencies: TaskLoopReportDependencySummary;
	followUps: TaskLoopReportFollowUpSummary;
	artifacts: TaskLoopReportArtifactSummary;
	decisions: TaskLoopReportDecisionSummary[];
	workPacket: TaskLoopReportWorkPacketSummary | null;
	nextAction: TaskLoopReportNextActionSummary;
	source: {
		readOnly: true;
		helpers: string[];
	};
};

export type TaskLoopReportTaskSummary = Pick<
	Task,
	| 'id'
	| 'title'
	| 'summary'
	| 'status'
	| 'projectId'
	| 'goalId'
	| 'priority'
	| 'readinessLevel'
	| 'autonomyLevel'
	| 'riskLevel'
	| 'reviewRequirement'
	| 'approvalMode'
	| 'requiresReview'
	| 'workflowId'
	| 'agentThreadId'
	| 'blockedReason'
	| 'dependencyTaskIds'
	| 'runCount'
	| 'latestRunId'
	| 'closeoutState'
	| 'artifactPath'
	| 'attachments'
>;

export type TaskLoopReportAssociationSummary = {
	workflow: (Pick<Workflow, 'id' | 'name' | 'status'> & { stepCount: number }) | null;
	thread: {
		taskAgentThreadId: string | null;
		runAgentThreadId: string | null;
		runThreadId: string | null;
		agentThreadRunId: string | null;
		idsAgree: boolean;
	};
};

export type TaskLoopReportProjectSummary = Pick<
	Project,
	'id' | 'name' | 'summary' | 'projectRootFolder' | 'defaultArtifactRoot'
>;

export type TaskLoopReportGoalSummary = Pick<
	Goal,
	'id' | 'name' | 'status' | 'summary' | 'successSignal' | 'projectIds' | 'taskIds'
>;

export type TaskLoopReportClassification = {
	value: GoalWorkClassification;
	actionable: boolean;
	reasons: ClassifiedGoalWorkTask['reasons'];
	recommendationKind: GoalWorkLoopRecommendationKind;
	recommendationReason: string;
};

export type TaskLoopReportReadiness = {
	readinessMode: ClassifiedGoalWorkTask['readinessMode'];
	readinessLevel: Task['readinessLevel'];
	autonomyLevel: Task['autonomyLevel'];
	riskLevel: Task['riskLevel'];
	effectiveRigorProfile: ClassifiedGoalWorkTask['effectiveRigorProfile'];
	hasUnmetDependencies: boolean;
	hasOpenReview: boolean;
	hasPendingApproval: boolean;
	isTerminal: boolean;
};

export type TaskLoopReportRunSummary = Pick<
	Run,
	| 'id'
	| 'taskId'
	| 'status'
	| 'promptDigest'
	| 'contextSummary'
	| 'summary'
	| 'actionsTaken'
	| 'validationSummary'
	| 'resultSummary'
	| 'errorSummary'
	| 'blockersFound'
	| 'followUpTaskIds'
	| 'artifactPaths'
	| 'updatedAt'
>;

export type TaskLoopReportReviewSummary = Pick<
	Review,
	'id' | 'taskId' | 'runId' | 'status' | 'summary' | 'createdAt' | 'updatedAt' | 'resolvedAt'
>;

export type TaskLoopReportApprovalSummary = Pick<
	Approval,
	| 'id'
	| 'taskId'
	| 'runId'
	| 'mode'
	| 'status'
	| 'summary'
	| 'createdAt'
	| 'updatedAt'
	| 'resolvedAt'
>;

export type TaskLoopReportDependencySummary = {
	all: Array<Pick<Task, 'id' | 'title' | 'status' | 'closeoutState'>>;
	open: Array<Pick<Task, 'id' | 'title' | 'status' | 'closeoutState'>>;
	missingTaskIds: string[];
};

export type TaskLoopReportFollowUpSummary = {
	fromLatestRunTaskIds: string[];
	tasks: Array<Pick<Task, 'id' | 'title' | 'status' | 'projectId' | 'goalId'>>;
	openCount: number;
};

export type TaskLoopReportArtifactSummary = {
	taskArtifactPath: string;
	attachmentPaths: string[];
	latestRunArtifactPaths: string[];
	allPaths: string[];
};

export type TaskLoopReportDecisionSummary = Pick<
	Decision,
	| 'id'
	| 'taskId'
	| 'goalId'
	| 'runId'
	| 'reviewId'
	| 'approvalId'
	| 'decisionType'
	| 'summary'
	| 'createdAt'
>;

export type TaskLoopReportWorkPacketSummary = {
	mode: GoalLoopWorkPacketMode;
	recommendationKind: GoalWorkLoopRecommendationKind;
	includedTaskIds: string[];
	relevantRunIds: string[];
	command: string;
};

export type TaskLoopReportNextActionSummary = {
	action: TaskLoopReportNextAction;
	reason: string;
	suggestedCommands: string[];
};

function latestByUpdatedAt<T extends { updatedAt: string }>(items: T[]) {
	return [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
}

function latestRunForTask(data: ControlPlaneData, task: Task) {
	const linkedRun = task.latestRunId
		? (data.runs.find((run) => run.id === task.latestRunId && run.taskId === task.id) ?? null)
		: null;

	return linkedRun ?? latestByUpdatedAt(data.runs.filter((run) => run.taskId === task.id));
}

function summarizeTask(task: Task): TaskLoopReportTaskSummary {
	return {
		id: task.id,
		title: task.title,
		summary: task.summary,
		status: task.status,
		projectId: task.projectId,
		goalId: task.goalId,
		priority: task.priority,
		readinessLevel: task.readinessLevel,
		autonomyLevel: task.autonomyLevel,
		riskLevel: task.riskLevel,
		reviewRequirement: task.reviewRequirement,
		approvalMode: task.approvalMode,
		requiresReview: task.requiresReview,
		workflowId: task.workflowId ?? null,
		agentThreadId: task.agentThreadId,
		blockedReason: task.blockedReason,
		dependencyTaskIds: task.dependencyTaskIds,
		runCount: task.runCount,
		latestRunId: task.latestRunId,
		closeoutState: task.closeoutState,
		artifactPath: task.artifactPath,
		attachments: task.attachments
	};
}

function buildAssociationSummary(
	data: ControlPlaneData,
	task: Task,
	latestRun: Run | null
): TaskLoopReportAssociationSummary {
	const workflow = task.workflowId
		? ((data.workflows ?? []).find((candidate) => candidate.id === task.workflowId) ?? null)
		: null;
	const workflowSteps = workflow
		? (data.workflowSteps ?? []).filter((step) => step.workflowId === workflow.id)
		: [];
	const taskAgentThreadId = task.agentThreadId || null;
	const runAgentThreadId = latestRun?.agentThreadId || null;

	return {
		workflow: workflow
			? {
					id: workflow.id,
					name: workflow.name,
					status: workflow.status,
					stepCount: workflowSteps.length
				}
			: null,
		thread: {
			taskAgentThreadId,
			runAgentThreadId,
			runThreadId: latestRun?.threadId || null,
			agentThreadRunId: latestRun?.agentThreadRunId || null,
			idsAgree: Boolean(taskAgentThreadId && runAgentThreadId && taskAgentThreadId === runAgentThreadId)
		}
	};
}

function summarizeProject(project: Project | null): TaskLoopReportProjectSummary | null {
	return project
		? {
				id: project.id,
				name: project.name,
				summary: project.summary,
				projectRootFolder: project.projectRootFolder,
				defaultArtifactRoot: project.defaultArtifactRoot
			}
		: null;
}

function summarizeGoal(goal: Goal | null): TaskLoopReportGoalSummary | null {
	return goal
		? {
				id: goal.id,
				name: goal.name,
				status: goal.status,
				summary: goal.summary,
				successSignal: goal.successSignal,
				projectIds: goal.projectIds,
				taskIds: goal.taskIds
			}
		: null;
}

function summarizeRun(run: Run | null): TaskLoopReportRunSummary | null {
	return run
		? {
				id: run.id,
				taskId: run.taskId,
				status: run.status,
				promptDigest: run.promptDigest,
				contextSummary: run.contextSummary,
				summary: run.summary,
				actionsTaken: run.actionsTaken,
				validationSummary: run.validationSummary,
				resultSummary: run.resultSummary,
				errorSummary: run.errorSummary,
				blockersFound: run.blockersFound,
				followUpTaskIds: run.followUpTaskIds,
				artifactPaths: run.artifactPaths,
				updatedAt: run.updatedAt
			}
		: null;
}

function summarizeReview(review: Review | null): TaskLoopReportReviewSummary | null {
	return review
		? {
				id: review.id,
				taskId: review.taskId,
				runId: review.runId,
				status: review.status,
				summary: review.summary,
				createdAt: review.createdAt,
				updatedAt: review.updatedAt,
				resolvedAt: review.resolvedAt
			}
		: null;
}

function summarizeApproval(approval: Approval | null): TaskLoopReportApprovalSummary | null {
	return approval
		? {
				id: approval.id,
				taskId: approval.taskId,
				runId: approval.runId,
				mode: approval.mode,
				status: approval.status,
				summary: approval.summary,
				createdAt: approval.createdAt,
				updatedAt: approval.updatedAt,
				resolvedAt: approval.resolvedAt
			}
		: null;
}

function buildDependencySummary(
	data: ControlPlaneData,
	task: Task
): TaskLoopReportDependencySummary {
	const dependencyTasks = task.dependencyTaskIds
		.map(
			(dependencyTaskId) =>
				data.tasks.find((candidate) => candidate.id === dependencyTaskId) ?? null
		)
		.filter((dependency): dependency is Task => Boolean(dependency));
	const foundTaskIds = new Set(dependencyTasks.map((dependency) => dependency.id));
	const missingTaskIds = task.dependencyTaskIds.filter(
		(dependencyTaskId) => !foundTaskIds.has(dependencyTaskId)
	);
	const open = dependencyTasks.filter(
		(dependency) => dependency.status !== 'done' && dependency.closeoutState !== 'accepted'
	);

	return {
		all: dependencyTasks.map(({ id, title, status, closeoutState }) => ({
			id,
			title,
			status,
			closeoutState
		})),
		open: open.map(({ id, title, status, closeoutState }) => ({
			id,
			title,
			status,
			closeoutState
		})),
		missingTaskIds
	};
}

function buildFollowUpSummary(
	data: ControlPlaneData,
	latestRun: Run | null
): TaskLoopReportFollowUpSummary {
	const fromLatestRunTaskIds = latestRun?.followUpTaskIds ?? [];
	const tasks = fromLatestRunTaskIds
		.map((taskId) => data.tasks.find((task) => task.id === taskId) ?? null)
		.filter((task): task is Task => Boolean(task))
		.map(({ id, title, status, projectId, goalId }) => ({
			id,
			title,
			status,
			projectId,
			goalId
		}));

	return {
		fromLatestRunTaskIds,
		tasks,
		openCount: tasks.filter((task) => task.status !== 'done' && task.status !== 'canceled').length
	};
}

function buildArtifactSummary(task: Task, latestRun: Run | null): TaskLoopReportArtifactSummary {
	const taskArtifactPath = task.artifactPath.trim();
	const attachmentPaths = task.attachments.map((attachment) => attachment.path).filter(Boolean);
	const latestRunArtifactPaths = latestRun?.artifactPaths ?? [];

	return {
		taskArtifactPath,
		attachmentPaths,
		latestRunArtifactPaths,
		allPaths: [
			...new Set([taskArtifactPath, ...attachmentPaths, ...latestRunArtifactPaths].filter(Boolean))
		]
	};
}

function buildDecisionSummaries(
	data: ControlPlaneData,
	task: Task
): TaskLoopReportDecisionSummary[] {
	return (data.decisions ?? [])
		.filter((decision) => decision.taskId === task.id || decision.runId === task.latestRunId)
		.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
		.slice(0, 5)
		.map((decision) => ({
			id: decision.id,
			taskId: decision.taskId,
			goalId: decision.goalId,
			runId: decision.runId,
			reviewId: decision.reviewId,
			approvalId: decision.approvalId,
			decisionType: decision.decisionType,
			summary: decision.summary,
			createdAt: decision.createdAt
		}));
}

function resolveNextAction(input: {
	task: Task;
	classifiedTask: ClassifiedGoalWorkTask;
	latestRun: Run | null;
	openReview: Review | null;
	pendingApproval: Approval | null;
	followUps: TaskLoopReportFollowUpSummary;
}): TaskLoopReportNextActionSummary {
	const { task, classifiedTask, latestRun, openReview, pendingApproval, followUps } = input;

	if (pendingApproval) {
		return {
			action: 'resolve_approval',
			reason: 'A pending approval gate must be resolved before this task can advance.',
			suggestedCommands: [
				'review:get_review_status',
				'task:approve-approval',
				'task:reject-approval',
				'context:current'
			]
		};
	}

	if (openReview || classifiedTask.classification === 'awaiting_review') {
		return {
			action: 'review_result',
			reason: 'The task has open or implied review work before it can be accepted or revised.',
			suggestedCommands: ['goal-loop:explain_task_eligibility', 'work-packet:get_agent_work_packet']
		};
	}

	if (
		task.status === 'in_progress' ||
		latestRun?.status === 'running' ||
		latestRun?.status === 'starting'
	) {
		return {
			action: 'continue_run',
			reason: 'The task already has in-progress execution evidence.',
			suggestedCommands: ['run-result:record_run_result', 'context:current']
		};
	}

	if (task.status === 'blocked' || classifiedTask.classification === 'blocked') {
		return {
			action: 'resolve_blocker',
			reason:
				classifiedTask.reasons.find((reason) => reason.code === 'blocked')?.message ??
				'The task is blocked.',
			suggestedCommands: ['goal-loop:explain_task_eligibility', 'run-result:record_blocker']
		};
	}

	if (classifiedTask.classification === 'needs_research') {
		return {
			action: 'research_task',
			reason: 'The task needs research before execution.',
			suggestedCommands: ['work-packet:get_agent_work_packet']
		};
	}

	if (classifiedTask.classification === 'needs_clarification') {
		return {
			action: 'clarify_task',
			reason: 'The task needs clarification before execution.',
			suggestedCommands: ['goal-loop:explain_task_eligibility']
		};
	}

	if (classifiedTask.classification === 'needs_planning') {
		return {
			action: 'plan_task',
			reason: 'The task needs a clearer contract before execution.',
			suggestedCommands: ['work-packet:get_agent_work_packet', 'goal-loop:explain_task_eligibility']
		};
	}

	if (classifiedTask.classification === 'accepted_done' || task.status === 'done') {
		return {
			action: followUps.openCount > 0 ? 'create_follow_up' : 'no_action',
			reason:
				followUps.openCount > 0
					? 'The task is done and has open follow-up work linked from the latest run.'
					: 'The task is already done or accepted.',
			suggestedCommands: ['goal-loop:get_next_recommended_action']
		};
	}

	if (latestRun?.status === 'completed' && task.requiresReview) {
		return {
			action: 'review_result',
			reason: 'The latest run completed and the task requires review.',
			suggestedCommands: ['run-result:request_review_from_run']
		};
	}

	if (classifiedTask.actionable) {
		return {
			action: 'execute_task',
			reason:
				'The task is ready, in scope, unblocked, within risk/autonomy limits, and reviewable.',
			suggestedCommands: ['work-packet:get_agent_work_packet', 'run-result:record_run_result']
		};
	}

	return {
		action: 'plan_task',
		reason: classifiedTask.reasons[0]?.message ?? 'No executable next action is available.',
		suggestedCommands: ['goal-loop:explain_task_eligibility']
	};
}

export function buildTaskLoopReport(data: ControlPlaneData, taskId: string): TaskLoopReport | null {
	const task = data.tasks.find((candidate) => candidate.id === taskId) ?? null;

	if (!task) {
		return null;
	}

	const project = data.projects.find((candidate) => candidate.id === task.projectId) ?? null;
	const goal = task.goalId
		? (data.goals.find((candidate) => candidate.id === task.goalId) ?? null)
		: null;
	const goalLoop = buildGoalWorkLoopClassification(data, {
		projectId: task.projectId,
		goalId: task.goalId || null
	});
	const classifiedTask =
		goalLoop.tasks.find((candidate) => candidate.id === task.id) ??
		buildGoalWorkLoopClassification(data, { projectId: task.projectId }).tasks.find(
			(candidate) => candidate.id === task.id
		);

	if (!classifiedTask) {
		return null;
	}

	const latestRun = latestRunForTask(data, task);
	const openReview = getOpenReviewForTask(data, task.id);
	const pendingApproval = getPendingApprovalForTask(data, task.id);
	const dependencies = buildDependencySummary(data, task);
	const followUps = buildFollowUpSummary(data, latestRun);
	const workPacket = buildGoalLoopWorkPacket(data, {
		projectId: task.projectId,
		goalId: task.goalId || null,
		taskId: task.id
	});
	const nextAction = resolveNextAction({
		task,
		classifiedTask,
		latestRun,
		openReview,
		pendingApproval,
		followUps
	});

	return {
		task: summarizeTask(task),
		project: summarizeProject(project),
		goal: summarizeGoal(goal),
		classification: {
			value: classifiedTask.classification,
			actionable: classifiedTask.actionable,
			reasons: classifiedTask.reasons,
			recommendationKind: workPacket?.recommendationKind ?? goalLoop.recommendation.kind,
			recommendationReason: workPacket?.selectionReason ?? goalLoop.recommendation.reason
		},
		readiness: {
			readinessMode: classifiedTask.readinessMode,
			readinessLevel: classifiedTask.readinessLevel,
			autonomyLevel: classifiedTask.autonomyLevel,
			riskLevel: classifiedTask.riskLevel,
			effectiveRigorProfile: classifiedTask.effectiveRigorProfile,
			hasUnmetDependencies: taskHasUnmetDependencies(data, task) || dependencies.open.length > 0,
			hasOpenReview: Boolean(openReview),
			hasPendingApproval: Boolean(pendingApproval),
			isTerminal:
				task.status === 'done' || task.status === 'canceled' || task.closeoutState === 'accepted'
		},
		latestRun: summarizeRun(latestRun),
		openReview: summarizeReview(openReview),
		pendingApproval: summarizeApproval(pendingApproval),
		associations: buildAssociationSummary(data, task, latestRun),
		dependencies,
		followUps,
		artifacts: buildArtifactSummary(task, latestRun),
		decisions: buildDecisionSummaries(data, task),
		workPacket: workPacket
			? {
					mode: workPacket.mode,
					recommendationKind: workPacket.recommendationKind,
					includedTaskIds: workPacket.includedTaskIds,
					relevantRunIds: workPacket.relevantRunIds,
					command: `work-packet:get_agent_work_packet --task ${task.id}`
				}
			: null,
		nextAction,
		source: {
			readOnly: true,
			helpers: [
				'src/lib/server/task-loop-report.ts',
				'src/lib/server/goal-work-loop.ts',
				'src/lib/server/goal-work-packets.ts',
				'src/lib/server/control-plane.ts'
			]
		}
	};
}
