import { getOpenReviewForTask } from '$lib/server/control-plane';
import {
	buildGoalWorkLoopClassification,
	type GoalWorkLoopRecommendationKind
} from '$lib/server/goal-work-loop';
import {
	buildExecutorPrompt,
	buildPlannerPrompt,
	buildResearchPrompt,
	buildReviewerPrompt
} from '$lib/workflow-prompts';
import type { ControlPlaneData, Goal, Project, Run, Task } from '$lib/types/control-plane';

export type GoalLoopWorkPacketMode = 'executor' | 'planner' | 'research' | 'reviewer';

export type GoalLoopWorkPacket = {
	mode: GoalLoopWorkPacketMode;
	recommendationKind: GoalWorkLoopRecommendationKind;
	projectId: string;
	goalId: string;
	taskId: string | null;
	taskTitle: string | null;
	selectionReason: string;
	includedTaskIds: string[];
	relevantRunIds: string[];
	stoppingConditions: string[];
	validationExpectations: string[];
	expectedResultShape: string[];
	prompt: string;
};

export type BuildGoalLoopWorkPacketInput = {
	projectId?: string | null;
	goalId?: string | null;
	taskId?: string | null;
};

function latestRunsForTask(data: ControlPlaneData, taskId: string) {
	return data.runs
		.filter((run) => run.taskId === taskId)
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
		.slice(0, 3);
}

function resolveMode(kind: GoalWorkLoopRecommendationKind): GoalLoopWorkPacketMode {
	if (kind === 'execute_task') {
		return 'executor';
	}

	if (kind === 'review_result') {
		return 'reviewer';
	}

	if (kind === 'research_task') {
		return 'research';
	}

	return 'planner';
}

function recommendationKindForClassification(
	classification: ReturnType<
		typeof buildGoalWorkLoopClassification
	>['tasks'][number]['classification']
): GoalWorkLoopRecommendationKind {
	switch (classification) {
		case 'actionable_now':
			return 'execute_task';
		case 'awaiting_review':
			return 'review_result';
		case 'needs_research':
			return 'research_task';
		case 'approval_required':
			return 'request_approval_or_downgrade';
		case 'needs_revision':
			return 'plan_revision';
		case 'needs_planning':
			return 'plan_task';
		case 'needs_clarification':
			return 'clarify_task';
		case 'blocked':
			return 'unblock_task';
		case 'unsafe_out_of_scope':
			return 'request_approval_or_downgrade';
		case 'accepted_done':
			return 'goal_complete';
		case 'duplicate_superseded':
			return 'create_planning_task';
		case 'in_progress':
			return 'create_planning_task';
	}
}

function defaultStoppingConditions(mode: GoalLoopWorkPacketMode) {
	const common = [
		'Stop if readiness, autonomy, risk, approval, sandbox, or review constraints no longer permit this work.',
		'Stop before deployment, merge, destructive data changes, credential changes, or external-state changes unless explicitly allowed.',
		'Stop if the work expands beyond the selected task, goal, or stated non-goals.'
	];

	if (mode === 'planner' || mode === 'research') {
		return [
			...common,
			'Do not mutate task, run, review, approval, project, or goal state from this packet.'
		];
	}

	return [
		...common,
		'Stop and report if validation cannot be run or fails for reasons that cannot be addressed safely.'
	];
}

function expectedResultShape(mode: GoalLoopWorkPacketMode) {
	if (mode === 'reviewer') {
		return [
			'Decision: accept, reject, or needs revision',
			'Evidence reviewed',
			'Acceptance criteria status',
			'Validation credibility',
			'Follow-up tasks or blockers'
		];
	}

	if (mode === 'research') {
		return [
			'Findings',
			'Evidence checked',
			'Remaining uncertainty',
			'Recommended next task mode',
			'Suggested task or blocker updates'
		];
	}

	if (mode === 'planner') {
		return [
			'Recommended task contract updates',
			'Remaining gaps',
			'Dependencies and blockers',
			'Risk, autonomy, readiness, and review recommendation',
			'Validation plan'
		];
	}

	return [
		'What changed',
		'Acceptance criteria satisfied',
		'Validation commands and results',
		'Risks or follow-up tasks',
		'Whether the result is ready for review'
	];
}

function wrapPrompt(input: {
	basePrompt: string;
	mode: GoalLoopWorkPacketMode;
	goal: Goal | null;
	project: Project;
	task: Task | null;
	selectionReason: string;
	stoppingConditions: string[];
	expectedResultShape: string[];
}) {
	return [
		'# Goal Loop Selected Work Packet',
		'',
		`Mode: ${input.mode}`,
		`Project: ${input.project.name} (${input.project.id})`,
		input.goal
			? `Goal: ${input.goal.name} (${input.goal.id}, ${input.goal.status})`
			: 'Goal: Not resolved',
		input.task ? `Selected task: ${input.task.title} (${input.task.id})` : 'Selected task: None',
		`Selection reason: ${input.selectionReason}`,
		'',
		'## Goal-Loop Stopping Conditions',
		input.stoppingConditions.map((condition) => `- ${condition}`).join('\n'),
		'',
		'## Expected Result Shape',
		input.expectedResultShape.map((item) => `- ${item}`).join('\n'),
		'',
		'## Base Work Packet',
		input.basePrompt
	].join('\n');
}

export function buildGoalLoopWorkPacket(
	data: ControlPlaneData,
	input: BuildGoalLoopWorkPacketInput = {}
): GoalLoopWorkPacket | null {
	const goalLoop = buildGoalWorkLoopClassification(data, {
		projectId: input.projectId,
		goalId: input.goalId
	});
	const selectedClassifiedTask = input.taskId
		? (goalLoop.tasks.find((task) => task.id === input.taskId) ?? null)
		: null;
	const recommendation = goalLoop.recommendation;
	const selectedTaskId = selectedClassifiedTask?.id ?? recommendation.taskIds[0] ?? null;
	const task = selectedTaskId
		? (data.tasks.find((candidate) => candidate.id === selectedTaskId) ?? null)
		: null;
	const project =
		(task
			? data.projects.find((candidate) => candidate.id === task.projectId)
			: goalLoop.project) ??
		goalLoop.project ??
		null;
	const goal =
		(task && task.goalId
			? data.goals.find((candidate) => candidate.id === task.goalId)
			: goalLoop.goal) ??
		goalLoop.goal ??
		null;

	if (!project) {
		return null;
	}

	const recommendationKind = selectedClassifiedTask
		? recommendationKindForClassification(selectedClassifiedTask.classification)
		: recommendation.kind;
	const mode = resolveMode(recommendationKind);
	const runs = task ? latestRunsForTask(data, task.id) : [];
	const review = task ? getOpenReviewForTask(data, task.id) : null;
	const selectionReason = selectedClassifiedTask
		? selectedClassifiedTask.reasons.map((reason) => reason.message).join(' ')
		: recommendation.reason;
	const validationExpectations = task?.validationSteps?.trim()
		? [task.validationSteps.trim()]
		: [
				'Use the smallest checks that can validate the selected work and report if validation is unavailable.'
			];
	const stoppingConditions = defaultStoppingConditions(mode);
	const resultShape = expectedResultShape(mode);

	let basePrompt: string;

	if (mode === 'executor' && task) {
		basePrompt = buildExecutorPrompt({ project, task, goal, recentRuns: runs });
	} else if (mode === 'reviewer' && task) {
		basePrompt = buildReviewerPrompt({ project, task, run: runs[0] ?? null, review });
	} else if (mode === 'research' && task) {
		basePrompt = buildResearchPrompt({ project, task, goal });
	} else {
		basePrompt = buildPlannerPrompt({
			project,
			goals: goal ? [goal] : [],
			tasks: task ? [task] : []
		});
	}

	return {
		mode,
		recommendationKind,
		projectId: project.id,
		goalId: goal?.id ?? task?.goalId ?? '',
		taskId: task?.id ?? null,
		taskTitle: task?.title ?? null,
		selectionReason,
		includedTaskIds: task ? [task.id] : [],
		relevantRunIds: runs.map((run) => run.id),
		stoppingConditions,
		validationExpectations,
		expectedResultShape: resultShape,
		prompt: wrapPrompt({
			basePrompt,
			mode,
			goal,
			project,
			task,
			selectionReason,
			stoppingConditions,
			expectedResultShape: resultShape
		})
	};
}
