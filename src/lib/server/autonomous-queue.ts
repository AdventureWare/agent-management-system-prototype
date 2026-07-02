import {
	getOpenReviewForTask,
	getPendingApprovalForTask,
	taskHasUnmetDependencies
} from '$lib/server/control-plane';
import type {
	ControlPlaneData,
	Goal,
	Priority,
	Task,
	TaskAutonomyLevel,
	TaskReadinessLevel,
	TaskReviewRequirement,
	TaskRiskLevel
} from '$lib/types/control-plane';

export type AutonomousQueueCategory =
	| 'recommended'
	| 'blocked'
	| 'needs_planning'
	| 'high_risk_review';

export type AutonomousQueueValidationQuality = 'none' | 'partial' | 'strong';

export type AutonomousQueueTask = {
	id: string;
	title: string;
	summary: string;
	projectId: string;
	projectName: string;
	goalId: string;
	goalName: string;
	status: Task['status'];
	priority: Priority;
	score: number;
	riskLevel: TaskRiskLevel;
	readinessLevel: TaskReadinessLevel;
	autonomyLevel: TaskAutonomyLevel;
	reviewRequirement: TaskReviewRequirement;
	estimateHours: number | null;
	targetDate: string | null;
	validationQuality: AutonomousQueueValidationQuality;
	recommendationReason: string;
	readyReason: string;
	riskReviewReason: string;
	validationReason: string;
	projectGoalReason: string;
	constraints: string[];
};

export type AutonomousQueueSection = {
	id: AutonomousQueueCategory;
	title: string;
	description: string;
	items: AutonomousQueueTask[];
};

export type AutonomousQueueData = {
	sections: AutonomousQueueSection[];
	recommendedTasks: AutonomousQueueTask[];
	blockedTasks: AutonomousQueueTask[];
	needsPlanningTasks: AutonomousQueueTask[];
	highRiskReviewTasks: AutonomousQueueTask[];
};

const PRIORITY_SCORE: Record<Priority, number> = {
	low: 0,
	medium: 3,
	high: 8,
	urgent: 12
};

const READINESS_SCORE: Record<TaskReadinessLevel, number> = {
	R0_IDEA: -8,
	R1_FRAMED: -5,
	R2_SPECIFIED: 2,
	R3_EXECUTABLE: 9,
	R4_REVIEWABLE: 8,
	R5_AUTOMATABLE: 10
};

const AUTONOMY_SCORE: Record<TaskAutonomyLevel, number> = {
	A0_HUMAN_ONLY: -10,
	A1_AGENT_MAY_ANALYZE_AND_PROPOSE: 4,
	A2_AGENT_MAY_DRAFT_ARTIFACTS: 6,
	A3_AGENT_MAY_EDIT_IN_ISOLATED_BRANCH_OR_WORKTREE: 8,
	A4_AGENT_MAY_CREATE_REVIEWABLE_DIFF_OR_PR: 7,
	A5_AGENT_MAY_MERGE_DEPLOY_OR_CHANGE_EXTERNAL_STATE: -12
};

const REVIEW_SCORE: Record<TaskReviewRequirement, number> = {
	NONE: 2,
	SUMMARY_REVIEW: 1,
	DIFF_REVIEW: 0,
	EXPLICIT_APPROVAL_REQUIRED: -3
};

const READY_READINESS_LEVELS = new Set<TaskReadinessLevel>([
	'R3_EXECUTABLE',
	'R4_REVIEWABLE',
	'R5_AUTOMATABLE'
]);

const AGENT_AUTONOMY_LEVELS = new Set<TaskAutonomyLevel>([
	'A1_AGENT_MAY_ANALYZE_AND_PROPOSE',
	'A2_AGENT_MAY_DRAFT_ARTIFACTS',
	'A3_AGENT_MAY_EDIT_IN_ISOLATED_BRANCH_OR_WORKTREE',
	'A4_AGENT_MAY_CREATE_REVIEWABLE_DIFF_OR_PR'
]);

function hasText(value: string | null | undefined) {
	return Boolean(value?.trim());
}

function isClosedTask(task: Pick<Task, 'status'>) {
	return task.status === 'done' || task.status === 'canceled';
}

function getTaskReadinessLevel(task: Task): TaskReadinessLevel {
	return task.readinessLevel ?? 'R1_FRAMED';
}

function getTaskAutonomyLevel(task: Task): TaskAutonomyLevel {
	return task.autonomyLevel ?? 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE';
}

function getTaskReviewRequirement(task: Task): TaskReviewRequirement {
	return task.reviewRequirement ?? (task.requiresReview ? 'SUMMARY_REVIEW' : 'NONE');
}

function getValidationQuality(task: Task): AutonomousQueueValidationQuality {
	const hasValidationSteps = hasText(task.validationSteps);
	const hasAcceptanceCriteria = hasText(task.successCriteria);

	if (hasValidationSteps && hasAcceptanceCriteria) {
		return 'strong';
	}

	if (hasValidationSteps || hasAcceptanceCriteria || hasText(task.expectedOutcome)) {
		return 'partial';
	}

	return 'none';
}

function getOpenDependencyNames(data: ControlPlaneData, task: Task) {
	const taskMap = new Map(data.tasks.map((candidate) => [candidate.id, candidate]));

	return task.dependencyTaskIds
		.map((dependencyTaskId) => taskMap.get(dependencyTaskId))
		.filter((dependencyTask): dependencyTask is Task => Boolean(dependencyTask))
		.filter((dependencyTask) => dependencyTask.status !== 'done')
		.map((dependencyTask) => dependencyTask.title);
}

function buildConstraintReasons(data: ControlPlaneData, task: Task) {
	const constraints: string[] = [];
	const readinessLevel = getTaskReadinessLevel(task);
	const autonomyLevel = getTaskAutonomyLevel(task);
	const pendingApproval = getPendingApprovalForTask(data, task.id);
	const openReview = getOpenReviewForTask(data, task.id);
	const openDependencyNames = getOpenDependencyNames(data, task);

	if (task.status !== 'ready') {
		const statusLabel = task.status.replace(/_/g, ' ');
		const blockedDetail = task.status === 'blocked' && task.blockedReason.trim();
		const reason = blockedDetail
			? `Status is blocked: ${task.blockedReason.trim()}.`
			: `Status is ${statusLabel}.`;
		constraints.push(reason);
	}

	if (task.blockedReason.trim()) {
		constraints.push(`Blocked reason: ${task.blockedReason.trim()}.`);
	}

	if (openDependencyNames.length > 0) {
		constraints.push(`Waits on ${openDependencyNames.slice(0, 3).join(', ')}.`);
	}

	if (pendingApproval) {
		constraints.push(`Pending ${pendingApproval.mode.replace(/_/g, ' ')} approval.`);
	}

	if (openReview) {
		constraints.push('Open review must resolve first.');
	}

	if (!READY_READINESS_LEVELS.has(readinessLevel)) {
		constraints.push(`Readiness is ${readinessLevel}, below executable queue threshold.`);
	}

	if (!AGENT_AUTONOMY_LEVELS.has(autonomyLevel)) {
		constraints.push(
			autonomyLevel === 'A5_AGENT_MAY_MERGE_DEPLOY_OR_CHANGE_EXTERNAL_STATE'
				? 'A5 autonomy can change external state and is excluded from unattended recommendations.'
				: 'A0 autonomy is human-only.'
		);
	}

	if (task.riskLevel === 'high' || task.riskLevel === 'critical') {
		constraints.push(`${task.riskLevel} risk requires explicit human review before execution.`);
	}

	if (getValidationQuality(task) === 'none') {
		constraints.push('No acceptance criteria, expected outcome, or validation steps are recorded.');
	}

	return constraints;
}

function buildValidationReason(task: Task) {
	const quality = getValidationQuality(task);

	if (quality === 'strong') {
		return 'Validation is strong: acceptance criteria and validation steps are both present.';
	}

	if (hasText(task.validationSteps)) {
		return 'Validation is partial: validation steps are present, but acceptance criteria are thin.';
	}

	if (hasText(task.successCriteria)) {
		return 'Validation is partial: acceptance criteria are present, but validation steps are missing.';
	}

	if (hasText(task.expectedOutcome)) {
		return 'Validation is partial: expected outcome is present, but checks are missing.';
	}

	return 'Validation is missing.';
}

function buildProjectGoalReason(task: Task, goal: Goal | null, projectName: string) {
	if (goal) {
		return `Linked to ${projectName} and goal ${goal.name} with planning priority ${
			goal.planningPriority ?? 0
		}.`;
	}

	return `Linked to ${projectName}; no goal is attached.`;
}

function scoreTask(input: {
	task: Task;
	goal: Goal | null;
	constraints: string[];
	validationQuality: AutonomousQueueValidationQuality;
}) {
	const { task, goal, constraints, validationQuality } = input;
	const readinessLevel = getTaskReadinessLevel(task);
	const autonomyLevel = getTaskAutonomyLevel(task);
	const reviewRequirement = getTaskReviewRequirement(task);
	let score =
		(PRIORITY_SCORE[task.priority] ?? 0) +
		(READINESS_SCORE[readinessLevel] ?? 0) +
		(AUTONOMY_SCORE[autonomyLevel] ?? 0) +
		(REVIEW_SCORE[reviewRequirement] ?? 0) +
		(goal?.planningPriority ?? 0) * 2;

	if (validationQuality === 'strong') {
		score += 6;
	} else if (validationQuality === 'partial') {
		score += 2;
	} else {
		score -= 6;
	}

	if (task.riskLevel === 'medium') {
		score -= 2;
	} else if (task.riskLevel === 'high') {
		score -= 10;
	} else if (task.riskLevel === 'critical') {
		score -= 16;
	}

	if (task.estimateHours !== null && task.estimateHours !== undefined) {
		score += task.estimateHours <= 2 ? 3 : task.estimateHours <= 8 ? 1 : -1;
	}

	score -= constraints.length * 4;

	return score;
}

function isBlockedForQueue(data: ControlPlaneData, task: Task) {
	return (
		task.status === 'blocked' ||
		task.blockedReason.trim().length > 0 ||
		taskHasUnmetDependencies(data, task)
	);
}

function isUnderSpecified(task: Task) {
	const readinessLevel = getTaskReadinessLevel(task);
	const validationQuality = getValidationQuality(task);
	const hasExecutionContract =
		hasText(task.summary) && hasText(task.expectedOutcome) && hasText(task.successCriteria);

	return (
		readinessLevel === 'R0_IDEA' ||
		readinessLevel === 'R1_FRAMED' ||
		(readinessLevel === 'R2_SPECIFIED' && validationQuality === 'none') ||
		!hasExecutionContract
	);
}

function isRecommended(data: ControlPlaneData, task: Task, constraints: string[]) {
	const readinessLevel = getTaskReadinessLevel(task);
	const autonomyLevel = getTaskAutonomyLevel(task);
	const validationQuality = getValidationQuality(task);

	return (
		task.status === 'ready' &&
		constraints.length === 0 &&
		!isBlockedForQueue(data, task) &&
		!getPendingApprovalForTask(data, task.id) &&
		!getOpenReviewForTask(data, task.id) &&
		READY_READINESS_LEVELS.has(readinessLevel) &&
		AGENT_AUTONOMY_LEVELS.has(autonomyLevel) &&
		task.riskLevel !== 'high' &&
		task.riskLevel !== 'critical' &&
		validationQuality !== 'none'
	);
}

function compareQueueTasks(left: AutonomousQueueTask, right: AutonomousQueueTask) {
	if (right.score !== left.score) {
		return right.score - left.score;
	}

	const leftEstimate = left.estimateHours ?? Number.POSITIVE_INFINITY;
	const rightEstimate = right.estimateHours ?? Number.POSITIVE_INFINITY;

	if (leftEstimate !== rightEstimate) {
		return leftEstimate - rightEstimate;
	}

	return left.title.localeCompare(right.title);
}

export function buildAutonomousQueue(data: ControlPlaneData): AutonomousQueueData {
	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const goalMap = new Map(data.goals.map((goal) => [goal.id, goal]));
	const queueItems = data.tasks
		.filter((task) => !isClosedTask(task))
		.map((task) => {
			const project = projectMap.get(task.projectId);
			const goal = task.goalId ? (goalMap.get(task.goalId) ?? null) : null;
			const projectName = project?.name ?? 'Unknown project';
			const constraints = buildConstraintReasons(data, task);
			const validationQuality = getValidationQuality(task);
			const score = scoreTask({ task, goal, constraints, validationQuality });
			const readinessLevel = getTaskReadinessLevel(task);
			const autonomyLevel = getTaskAutonomyLevel(task);
			const reviewRequirement = getTaskReviewRequirement(task);

			return {
				id: task.id,
				title: task.title,
				summary: task.summary,
				projectId: task.projectId,
				projectName,
				goalId: task.goalId,
				goalName: goal?.name ?? 'No goal',
				status: task.status,
				priority: task.priority,
				score,
				riskLevel: task.riskLevel,
				readinessLevel,
				autonomyLevel,
				reviewRequirement,
				estimateHours: task.estimateHours ?? null,
				targetDate: task.targetDate ?? null,
				validationQuality,
				recommendationReason: `Score ${score}: ${task.priority} priority, ${readinessLevel} readiness, ${autonomyLevel.slice(0, 2)} autonomy.`,
				readyReason: READY_READINESS_LEVELS.has(readinessLevel)
					? `${readinessLevel} is within the executable/reviewable/automatable queue band.`
					: `${readinessLevel} needs more specification before execution.`,
				riskReviewReason:
					task.riskLevel === 'low'
						? `${task.riskLevel} risk with ${reviewRequirement.toLowerCase().replace(/_/g, ' ')}.`
						: `${task.riskLevel} risk requires review controls: ${reviewRequirement.toLowerCase().replace(/_/g, ' ')}.`,
				validationReason: buildValidationReason(task),
				projectGoalReason: buildProjectGoalReason(task, goal, projectName),
				constraints
			} satisfies AutonomousQueueTask;
		});

	const recommendedTasks = queueItems
		.filter((item) => {
			const task = data.tasks.find((candidate) => candidate.id === item.id);
			return task ? isRecommended(data, task, item.constraints) : false;
		})
		.sort(compareQueueTasks);

	const blockedTasks = queueItems
		.filter((item) => {
			const task = data.tasks.find((candidate) => candidate.id === item.id);
			return task ? isBlockedForQueue(data, task) : false;
		})
		.sort(compareQueueTasks);

	const needsPlanningTasks = queueItems
		.filter((item) => {
			const task = data.tasks.find((candidate) => candidate.id === item.id);
			return task
				? (task.priority === 'high' || task.priority === 'urgent') &&
						!isBlockedForQueue(data, task) &&
						isUnderSpecified(task)
				: false;
		})
		.sort(compareQueueTasks);

	const highRiskReviewTasks = queueItems
		.filter((item) => item.riskLevel === 'high' || item.riskLevel === 'critical')
		.sort(compareQueueTasks);

	return {
		sections: [
			{
				id: 'recommended',
				title: 'Recommended for Agent Work',
				description:
					'Unblocked, ready tasks with bounded autonomy, acceptable risk, and at least partial validation.',
				items: recommendedTasks
			},
			{
				id: 'blocked',
				title: 'Blocked Tasks',
				description: 'Tasks that need dependency, blocker, or status changes before agent work.',
				items: blockedTasks
			},
			{
				id: 'needs_planning',
				title: 'High-Priority Needs Planning',
				description:
					'Important work that should be specified before it is treated as autonomous execution.',
				items: needsPlanningTasks
			},
			{
				id: 'high_risk_review',
				title: 'High-Risk Requires Review',
				description:
					'Tasks with high or critical risk are kept out of ready recommendations for v0.',
				items: highRiskReviewTasks
			}
		],
		recommendedTasks,
		blockedTasks,
		needsPlanningTasks,
		highRiskReviewTasks
	};
}
