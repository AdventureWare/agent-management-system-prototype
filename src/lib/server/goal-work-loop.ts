import {
	getOpenReviewForTask,
	getPendingApprovalForTask,
	taskHasUnmetDependencies
} from '$lib/server/control-plane';
import { buildDelegationReadinessAssessment } from '$lib/server/delegation-readiness';
import { resolveEffectiveRigorProfile } from '$lib/rigor-profiles';
import type { ControlPlaneData, Goal, Project, Run, Task } from '$lib/types/control-plane';

export const GOAL_WORK_CLASSIFICATION_OPTIONS = [
	'actionable_now',
	'in_progress',
	'awaiting_review',
	'accepted_done',
	'needs_revision',
	'blocked',
	'needs_clarification',
	'needs_research',
	'needs_planning',
	'approval_required',
	'unsafe_out_of_scope',
	'duplicate_superseded'
] as const;

export type GoalWorkClassification = (typeof GOAL_WORK_CLASSIFICATION_OPTIONS)[number];

export type GoalWorkClassificationReasonCode =
	| 'accepted_or_done'
	| 'already_in_progress'
	| 'awaiting_review'
	| 'approval_required'
	| 'blocked'
	| 'dependency_not_complete'
	| 'missing_clarification'
	| 'missing_research'
	| 'needs_planning'
	| 'needs_revision'
	| 'too_risky'
	| 'autonomy_not_allowed'
	| 'missing_context_or_capability'
	| 'insufficient_validation'
	| 'out_of_scope'
	| 'duplicate_or_superseded'
	| 'actionable';

export type GoalWorkClassificationReason = {
	code: GoalWorkClassificationReasonCode;
	message: string;
};

export type ClassifiedGoalWorkTask = {
	id: string;
	title: string;
	projectId: string;
	goalId: string;
	status: Task['status'];
	classification: GoalWorkClassification;
	actionable: boolean;
	reasons: GoalWorkClassificationReason[];
	dependencyTaskIds: string[];
	openDependencyTaskIds: string[];
	readinessMode: ReturnType<typeof buildDelegationReadinessAssessment>['recommendedMode'];
	readinessLevel: Task['readinessLevel'];
	autonomyLevel: Task['autonomyLevel'];
	riskLevel: Task['riskLevel'];
	effectiveRigorProfile: ReturnType<typeof resolveEffectiveRigorProfile>;
};

export type GoalWorkLoopClassification = {
	project: Project | null;
	goal: Goal | null;
	tasks: ClassifiedGoalWorkTask[];
	byClassification: Record<GoalWorkClassification, ClassifiedGoalWorkTask[]>;
	actionableTasks: ClassifiedGoalWorkTask[];
	nonActionableTasks: ClassifiedGoalWorkTask[];
	recommendation: GoalWorkLoopRecommendation;
};

export type GoalWorkLoopRecommendationKind =
	| 'resolve_approval'
	| 'review_result'
	| 'execute_task'
	| 'plan_revision'
	| 'plan_task'
	| 'research_task'
	| 'clarify_task'
	| 'unblock_task'
	| 'request_approval_or_downgrade'
	| 'create_planning_task'
	| 'goal_complete';

export type GoalWorkLoopRecommendation = {
	kind: GoalWorkLoopRecommendationKind;
	taskIds: string[];
	parallelTaskIds: string[];
	reason: string;
	suggestedTaskDraft: GoalWorkLoopTaskDraft | null;
};

export type GoalWorkLoopTaskDraft = {
	title: string;
	summary: string;
	projectId: string;
	goalId: string;
	readinessLevel: Task['readinessLevel'];
	autonomyLevel: Task['autonomyLevel'];
	riskLevel: Task['riskLevel'];
	reviewRequirement: Task['reviewRequirement'];
	expectedOutcome: string;
	scope: string;
	nonGoals: string;
	successCriteria: string;
	validationSteps: string;
	dependencyTaskIds: string[];
};

export type BuildGoalWorkLoopClassificationInput = {
	projectId?: string | null;
	goalId?: string | null;
};

function hasText(value: string | null | undefined) {
	return Boolean(value?.trim());
}

function latestRunForTask(data: Pick<ControlPlaneData, 'runs'>, task: Task): Run | null {
	const latestLinkedRun = task.latestRunId
		? (data.runs.find((run) => run.id === task.latestRunId) ?? null)
		: null;

	return (
		latestLinkedRun ??
		data.runs
			.filter((run) => run.taskId === task.id)
			.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ??
		null
	);
}

function resolveProject(data: ControlPlaneData, input: BuildGoalWorkLoopClassificationInput) {
	if (input.projectId) {
		return data.projects.find((project) => project.id === input.projectId) ?? null;
	}

	if (input.goalId) {
		const goal = data.goals.find((candidate) => candidate.id === input.goalId) ?? null;
		const projectId = goal?.projectIds?.[0] ?? null;
		return projectId ? (data.projects.find((project) => project.id === projectId) ?? null) : null;
	}

	return data.projects[0] ?? null;
}

function resolveGoal(
	data: ControlPlaneData,
	input: BuildGoalWorkLoopClassificationInput,
	project: Project | null
) {
	if (input.goalId) {
		return data.goals.find((goal) => goal.id === input.goalId) ?? null;
	}

	return (
		data.goals.find(
			(goal) =>
				goal.status === 'running' && (!project || (goal.projectIds ?? []).includes(project.id))
		) ?? null
	);
}

function isTaskInScope(task: Task, project: Project | null, goal: Goal | null) {
	if (goal) {
		const goalTaskIds = goal.taskIds ?? [];

		if (task.goalId === goal.id || goalTaskIds.includes(task.id)) {
			return true;
		}

		if (task.goalId || goalTaskIds.length > 0) {
			return false;
		}

		return (
			(goal.projectIds ?? []).includes(task.projectId) && (!project || task.projectId === project.id)
		);
	}

	return project ? task.projectId === project.id : true;
}

function getOpenDependencyTaskIds(data: ControlPlaneData, task: Task) {
	const doneTaskIds = new Set(
		data.tasks
			.filter((candidate) => candidate.status === 'done' || candidate.closeoutState === 'accepted')
			.map((candidate) => candidate.id)
	);

	return task.dependencyTaskIds.filter((dependencyTaskId) => !doneTaskIds.has(dependencyTaskId));
}

function detectDuplicateOrSuperseded(data: ControlPlaneData, task: Task) {
	if (task.taskTemplateId) {
		const template = (data.taskTemplates ?? []).find(
			(candidate) => candidate.id === task.taskTemplateId
		);
		if (template?.lifecycleStatus === 'superseded' || template?.supersededByTaskTemplateId) {
			return 'Task uses a superseded task template.';
		}
	}

	const normalizedTitle = task.title.trim().toLowerCase();
	if (!normalizedTitle) {
		return '';
	}

	const duplicate = data.tasks.find(
		(candidate) =>
			candidate.id !== task.id &&
			candidate.projectId === task.projectId &&
			candidate.goalId === task.goalId &&
			candidate.title.trim().toLowerCase() === normalizedTitle &&
			candidate.status !== 'done'
	);

	return duplicate ? `Possible duplicate of ${duplicate.id}.` : '';
}

function classifyTask(input: {
	data: ControlPlaneData;
	task: Task;
	project: Project | null;
	inScope: boolean;
}) {
	const { data, task, project, inScope } = input;
	const reasons: GoalWorkClassificationReason[] = [];
	const openDependencyTaskIds = getOpenDependencyTaskIds(data, task);
	const pendingApproval = getPendingApprovalForTask(data, task.id);
	const openReview = getOpenReviewForTask(data, task.id);
	const latestRun = latestRunForTask(data, task);
	const readiness = buildDelegationReadinessAssessment(data, task);
	const effectiveRigorProfile = resolveEffectiveRigorProfile({ task, project });
	const duplicateOrSuperseded = detectDuplicateOrSuperseded(data, task);

	if (!inScope) {
		reasons.push({
			code: 'out_of_scope',
			message: 'Task is not connected to the active goal or in-scope project.'
		});
	}

	if (task.status === 'done' || task.closeoutState === 'accepted') {
		reasons.push({
			code: 'accepted_or_done',
			message:
				task.closeoutState === 'accepted'
					? 'Task has accepted closeout.'
					: 'Task status is done.'
		});
	}

	if (task.status === 'in_progress' || latestRun?.status === 'running' || latestRun?.status === 'starting') {
		reasons.push({
			code: 'already_in_progress',
			message: 'Task already has in-progress work.'
		});
	}

	if (pendingApproval) {
		reasons.push({
			code: 'approval_required',
			message: `Pending ${pendingApproval.mode.replace(/_/g, ' ')} approval.`
		});
	}

	if (
		openReview ||
		task.status === 'review' ||
		(latestRun?.status === 'completed' &&
			task.status !== 'done' &&
			task.closeoutState !== 'accepted' &&
			task.requiresReview)
	) {
		reasons.push({
			code: 'awaiting_review',
			message: openReview ? 'Open review must resolve first.' : 'Task result is awaiting review.'
		});
	}

	if (
		task.closeoutState === 'needs_revision' ||
		task.closeoutState === 'rejected' ||
		/changes requested|needs revision|rejected/i.test(task.blockedReason)
	) {
		reasons.push({
			code: 'needs_revision',
			message: task.closeoutRemainingIssues || task.blockedReason || 'Task needs revision.'
		});
	}

	if (task.status === 'blocked' || hasText(task.blockedReason)) {
		reasons.push({
			code: 'blocked',
			message: task.blockedReason.trim() || 'Task is blocked.'
		});
	}

	if (taskHasUnmetDependencies(data, task) || openDependencyTaskIds.length > 0) {
		reasons.push({
			code: 'dependency_not_complete',
			message: `Waiting on ${openDependencyTaskIds.slice(0, 3).join(', ')}.`
		});
	}

	if (readiness.recommendedMode === 'NEEDS_CLARIFICATION') {
		reasons.push({
			code: 'missing_clarification',
			message: 'Task needs user clarification before execution.'
		});
	}

	if (readiness.recommendedMode === 'NEEDS_RESEARCH') {
		reasons.push({
			code: 'missing_research',
			message: 'Task needs research before execution.'
		});
	}

	if (readiness.recommendedMode === 'CAPTURED' || readiness.recommendedMode === 'NEEDS_PLANNING') {
		reasons.push({
			code: 'needs_planning',
			message: 'Task needs a clearer execution contract before execution.'
		});
	}

	if (task.riskLevel === 'high' || task.riskLevel === 'critical' || effectiveRigorProfile === 'HIGH_STAKES') {
		reasons.push({
			code: 'too_risky',
			message:
				effectiveRigorProfile === 'HIGH_STAKES'
					? 'High-stakes work requires explicit human approval before execution.'
					: `${task.riskLevel} risk requires human review before execution.`
		});
	}

	if (
		task.autonomyLevel === 'A0_HUMAN_ONLY' ||
		task.autonomyLevel === 'A5_AGENT_MAY_MERGE_DEPLOY_OR_CHANGE_EXTERNAL_STATE'
	) {
		reasons.push({
			code: 'autonomy_not_allowed',
			message:
				task.autonomyLevel === 'A0_HUMAN_ONLY'
					? 'A0 autonomy is human-only.'
					: 'A5 autonomy can change external state and is excluded from autonomous recommendations.'
		});
	}

	for (const missing of readiness.missingInformation) {
		if (/skill|capability|tool|coverage|install/i.test(missing)) {
			reasons.push({
				code: 'missing_context_or_capability',
				message: missing
			});
		}
	}

	if (!hasText(task.successCriteria) && !hasText(task.validationSteps) && !hasText(task.expectedOutcome)) {
		reasons.push({
			code: 'insufficient_validation',
			message: 'No expected outcome, acceptance criteria, or validation steps are recorded.'
		});
	}

	if (duplicateOrSuperseded) {
		reasons.push({
			code: 'duplicate_or_superseded',
			message: duplicateOrSuperseded
		});
	}

	const blockingCodes = new Set<GoalWorkClassificationReasonCode>(
		reasons.map((reason) => reason.code).filter((code) => code !== 'actionable')
	);
	const actionable =
		inScope &&
		task.status === 'ready' &&
		readiness.canExecute &&
		!openReview &&
		!pendingApproval &&
		openDependencyTaskIds.length === 0 &&
		!blockingCodes.has('too_risky') &&
		!blockingCodes.has('autonomy_not_allowed') &&
		!blockingCodes.has('missing_context_or_capability') &&
		!blockingCodes.has('insufficient_validation') &&
		!blockingCodes.has('duplicate_or_superseded');

	let classification: GoalWorkClassification;

	if (!inScope || blockingCodes.has('too_risky') || blockingCodes.has('autonomy_not_allowed')) {
		classification = 'unsafe_out_of_scope';
	} else if (blockingCodes.has('duplicate_or_superseded')) {
		classification = 'duplicate_superseded';
	} else if (blockingCodes.has('accepted_or_done')) {
		classification = 'accepted_done';
	} else if (blockingCodes.has('approval_required')) {
		classification = 'approval_required';
	} else if (blockingCodes.has('awaiting_review')) {
		classification = 'awaiting_review';
	} else if (blockingCodes.has('needs_revision')) {
		classification = 'needs_revision';
	} else if (blockingCodes.has('already_in_progress')) {
		classification = 'in_progress';
	} else if (blockingCodes.has('missing_clarification')) {
		classification = 'needs_clarification';
	} else if (blockingCodes.has('missing_research')) {
		classification = 'needs_research';
	} else if (blockingCodes.has('blocked') || blockingCodes.has('dependency_not_complete')) {
		classification = 'blocked';
	} else if (blockingCodes.has('needs_planning') || blockingCodes.has('insufficient_validation')) {
		classification = 'needs_planning';
	} else if (actionable) {
		classification = 'actionable_now';
	} else {
		classification = 'needs_planning';
		reasons.push({
			code: 'needs_planning',
			message: 'Task is not executable under current readiness rules.'
		});
	}

	if (actionable) {
		reasons.push({
			code: 'actionable',
			message: 'Task is ready, in scope, unblocked, within risk/autonomy limits, and reviewable.'
		});
	}

	return {
		id: task.id,
		title: task.title,
		projectId: task.projectId,
		goalId: task.goalId,
		status: task.status,
		classification,
		actionable,
		reasons,
		dependencyTaskIds: task.dependencyTaskIds,
		openDependencyTaskIds,
		readinessMode: readiness.recommendedMode,
		readinessLevel: task.readinessLevel,
		autonomyLevel: task.autonomyLevel,
		riskLevel: task.riskLevel,
		effectiveRigorProfile
	} satisfies ClassifiedGoalWorkTask;
}

function sortForRecommendation(tasks: ClassifiedGoalWorkTask[]) {
	return [...tasks].sort((left, right) => {
		const leftHasDependencies = left.dependencyTaskIds.length > 0 ? 1 : 0;
		const rightHasDependencies = right.dependencyTaskIds.length > 0 ? 1 : 0;

		if (leftHasDependencies !== rightHasDependencies) {
			return leftHasDependencies - rightHasDependencies;
		}

		return left.title.localeCompare(right.title);
	});
}

function tasksAreIndependent(left: ClassifiedGoalWorkTask, right: ClassifiedGoalWorkTask) {
	return !left.dependencyTaskIds.includes(right.id) && !right.dependencyTaskIds.includes(left.id);
}

function buildTaskDraft(input: {
	kind: Extract<
		GoalWorkLoopRecommendationKind,
		'plan_task' | 'research_task' | 'clarify_task' | 'create_planning_task'
	>;
	task: ClassifiedGoalWorkTask | null;
	project: Project | null;
	goal: Goal | null;
}): GoalWorkLoopTaskDraft | null {
	const { kind, task, project, goal } = input;
	const projectId = task?.projectId ?? project?.id ?? '';
	const goalId = task?.goalId ?? goal?.id ?? '';

	if (!projectId) {
		return null;
	}

	if (kind === 'clarify_task' && task) {
		return {
			title: `Clarify: ${task.title}`,
			summary: `Ask the specific question needed to unblock "${task.title}", then update the task with the answer and next mode.`,
			projectId,
			goalId,
			readinessLevel: 'R1_FRAMED',
			autonomyLevel: 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE',
			riskLevel: 'low',
			reviewRequirement: 'SUMMARY_REVIEW',
			expectedOutcome: 'A concrete clarification answer is recorded on the blocked task.',
			scope: 'Clarification only; do not implement the blocked task.',
			nonGoals: 'Do not broaden scope or infer user intent from weak evidence.',
			successCriteria:
				'The open question is specific, the answer is captured, and the original task can be reclassified.',
			validationSteps: 'Review the updated blocker/readiness state on the original task.',
			dependencyTaskIds: [task.id]
		};
	}

	if (kind === 'research_task' && task) {
		return {
			title: `Research: ${task.title}`,
			summary: `Reduce uncertainty for "${task.title}" and recommend whether it should proceed to planning, execution, review, or remain blocked.`,
			projectId,
			goalId,
			readinessLevel: 'R2_SPECIFIED',
			autonomyLevel: 'A2_AGENT_MAY_DRAFT_ARTIFACTS',
			riskLevel: task.riskLevel,
			reviewRequirement: 'SUMMARY_REVIEW',
			expectedOutcome: 'Research findings and a next-mode recommendation are recorded.',
			scope: 'Research and evidence capture only.',
			nonGoals: 'Do not implement production changes or mark the original task complete.',
			successCriteria:
				'Findings cite the inspected sources or files, resolve the uncertainty, and update recommended next work.',
			validationSteps: 'Reviewer can trace findings to sources and see a clear next recommendation.',
			dependencyTaskIds: [task.id]
		};
	}

	if (kind === 'plan_task' && task) {
		return {
			title: `Plan: ${task.title}`,
			summary: `Turn "${task.title}" into a bounded execution contract with outcome, scope, non-goals, acceptance criteria, validation, dependencies, and safe autonomy/risk settings.`,
			projectId,
			goalId,
			readinessLevel: 'R2_SPECIFIED',
			autonomyLevel: 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE',
			riskLevel: 'low',
			reviewRequirement: 'SUMMARY_REVIEW',
			expectedOutcome: 'The original task has enough structure to be reclassified for execution or review.',
			scope: 'Planning and task update proposal only.',
			nonGoals: 'Do not implement the task while planning it.',
			successCriteria:
				'The task has clear expected outcome, scope, non-goals, success criteria, validation steps, dependencies, and risk/autonomy recommendation.',
			validationSteps: 'Run the goal-loop classification again and verify the original task is no longer underspecified.',
			dependencyTaskIds: [task.id]
		};
	}

	return {
		title: `Plan next work for ${goal?.name ?? project?.name ?? 'active goal'}`,
		summary:
			'Review the active goal, linked work, accepted results, blockers, open questions, project memory, and remaining gaps; propose the next candidate tasks with dependencies and acceptance criteria.',
		projectId,
		goalId,
		readinessLevel: 'R2_SPECIFIED',
		autonomyLevel: 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE',
		riskLevel: 'low',
		reviewRequirement: 'SUMMARY_REVIEW',
		expectedOutcome: 'A concrete next candidate task is ready for review or creation.',
		scope: 'Planning only across the active goal and in-scope project work.',
		nonGoals: 'Do not create broad new abstractions, launch execution, or mark work complete.',
		successCriteria:
			'The plan identifies remaining gaps, safe agent-executable tasks, dependencies, blockers, approval needs, and validation criteria.',
		validationSteps: 'Review the proposed next tasks against the active goal success criteria.',
		dependencyTaskIds: []
	};
}

function buildRecommendation(input: {
	byClassification: Record<GoalWorkClassification, ClassifiedGoalWorkTask[]>;
	project: Project | null;
	goal: Goal | null;
}): GoalWorkLoopRecommendation {
	const { byClassification, project, goal } = input;
	const revisions = sortForRecommendation(byClassification.needs_revision);
	if (revisions.length > 0) {
		return {
			kind: 'plan_revision',
			taskIds: [revisions[0]!.id],
			parallelTaskIds: [],
			reason: 'Plan or perform the smallest revision needed to satisfy the original task.',
			suggestedTaskDraft: null
		};
	}

	const approval = sortForRecommendation(byClassification.approval_required);
	if (approval.length > 0) {
		return {
			kind: 'resolve_approval',
			taskIds: [approval[0]!.id],
			parallelTaskIds: [],
			reason: 'Resolve pending approval before launching dependent or higher-risk work.',
			suggestedTaskDraft: null
		};
	}

	const review = sortForRecommendation(byClassification.awaiting_review);
	if (review.length > 0) {
		return {
			kind: 'review_result',
			taskIds: [review[0]!.id],
			parallelTaskIds: [],
			reason: 'Review completed or review-state work before continuing the goal loop.',
			suggestedTaskDraft: null
		};
	}

	const actionable = sortForRecommendation(byClassification.actionable_now);
	if (actionable.length > 0) {
		const primaryTask = actionable[0]!;
		const parallelTaskIds = actionable
			.filter((task) => task.id !== primaryTask.id && tasksAreIndependent(primaryTask, task))
			.slice(0, 3)
			.map((task) => task.id);

		return {
			kind: 'execute_task',
			taskIds: [primaryTask.id],
			parallelTaskIds,
			reason:
				parallelTaskIds.length > 0
					? 'Execute the first actionable task; additional independent tasks can run in parallel.'
					: 'Execute the next actionable task.',
			suggestedTaskDraft: null
		};
	}

	const planning = sortForRecommendation(byClassification.needs_planning);
	if (planning.length > 0) {
		return {
			kind: 'plan_task',
			taskIds: [planning[0]!.id],
			parallelTaskIds: [],
			reason: 'Add execution contract, scope, acceptance criteria, or validation before execution.',
			suggestedTaskDraft: buildTaskDraft({
				kind: 'plan_task',
				task: planning[0]!,
				project,
				goal
			})
		};
	}

	const research = sortForRecommendation(byClassification.needs_research);
	if (research.length > 0) {
		return {
			kind: 'research_task',
			taskIds: [research[0]!.id],
			parallelTaskIds: [],
			reason: 'Reduce uncertainty before execution.',
			suggestedTaskDraft: buildTaskDraft({
				kind: 'research_task',
				task: research[0]!,
				project,
				goal
			})
		};
	}

	const clarification = sortForRecommendation(byClassification.needs_clarification);
	if (clarification.length > 0) {
		return {
			kind: 'clarify_task',
			taskIds: [clarification[0]!.id],
			parallelTaskIds: [],
			reason: 'Ask the specific clarification needed before delegation.',
			suggestedTaskDraft: buildTaskDraft({
				kind: 'clarify_task',
				task: clarification[0]!,
				project,
				goal
			})
		};
	}

	const blocked = sortForRecommendation(byClassification.blocked);
	if (blocked.length > 0) {
		return {
			kind: 'unblock_task',
			taskIds: [blocked[0]!.id],
			parallelTaskIds: [],
			reason: 'Resolve dependency, access, or blocker before execution.',
			suggestedTaskDraft: null
		};
	}

	const unsafe = sortForRecommendation(byClassification.unsafe_out_of_scope);
	if (unsafe.length > 0) {
		return {
			kind: 'request_approval_or_downgrade',
			taskIds: [unsafe[0]!.id],
			parallelTaskIds: [],
			reason: 'Work is outside current safety, autonomy, risk, or goal scope; request approval or downgrade mode.',
			suggestedTaskDraft: null
		};
	}

	if (byClassification.accepted_done.length > 0 && byClassification.duplicate_superseded.length === 0) {
		return {
			kind: 'goal_complete',
			taskIds: [],
			parallelTaskIds: [],
			reason: 'No remaining goal-linked work is actionable or blocked.',
			suggestedTaskDraft: null
		};
	}

	return {
		kind: 'create_planning_task',
		taskIds: [],
		parallelTaskIds: [],
		reason: 'Goal is not complete and no execution task is available; create a planning task.',
		suggestedTaskDraft: buildTaskDraft({
			kind: 'create_planning_task',
			task: null,
			project,
			goal
		})
	};
}

export function buildGoalWorkLoopClassification(
	data: ControlPlaneData,
	input: BuildGoalWorkLoopClassificationInput = {}
): GoalWorkLoopClassification {
	const project = resolveProject(data, input);
	const goal = resolveGoal(data, input, project);
	const tasks = data.tasks
		.map((task) =>
			classifyTask({
				data,
				task,
				project: data.projects.find((candidate) => candidate.id === task.projectId) ?? project,
				inScope: isTaskInScope(task, project, goal)
			})
		)
		.filter((task) => !task.reasons.some((reason) => reason.code === 'out_of_scope'));
	const byClassification = GOAL_WORK_CLASSIFICATION_OPTIONS.reduce(
		(accumulator, classification) => {
			accumulator[classification] = tasks.filter((task) => task.classification === classification);
			return accumulator;
		},
		{} as Record<GoalWorkClassification, ClassifiedGoalWorkTask[]>
	);

	return {
		project,
		goal,
		tasks,
		byClassification,
		actionableTasks: byClassification.actionable_now,
		nonActionableTasks: tasks.filter((task) => !task.actionable),
		recommendation: buildRecommendation({ byClassification, project, goal })
	};
}
