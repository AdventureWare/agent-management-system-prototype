import {
	buildGoalWorkLoopClassification,
	type GoalWorkLoopRecommendation,
	type GoalWorkLoopRecommendationKind
} from '$lib/server/goal-work-loop';
import {
	buildTaskLoopReport,
	type TaskLoopReport,
	type TaskLoopReportNextAction
} from '$lib/server/task-loop-report';
import type { ControlPlaneData, Goal, Project, Task } from '$lib/types/control-plane';

export type OperatorGoalLoopSurface =
	| 'goal_detail'
	| 'task_detail'
	| 'governance'
	| 'planning'
	| 'autonomous_queue'
	| 'none';

export type OperatorGoalLoopPathKind =
	| 'execute'
	| 'continue_run'
	| 'review'
	| 'approval'
	| 'blocker'
	| 'planning'
	| 'research'
	| 'clarification'
	| 'goal_complete'
	| 'no_action';

export type OperatorGoalLoopConsole = {
	project: Pick<Project, 'id' | 'name'> | null;
	goal: Pick<Goal, 'id' | 'name' | 'status' | 'successSignal'> | null;
	recommendation: GoalWorkLoopRecommendation;
	selectedTask: Pick<Task, 'id' | 'title' | 'status' | 'projectId' | 'goalId'> | null;
	selectedTaskReport: TaskLoopReport | null;
	path: {
		kind: OperatorGoalLoopPathKind;
		surface: OperatorGoalLoopSurface;
		label: string;
		reason: string;
		href: string | null;
		taskId: string | null;
		suggestedCommands: string[];
		continuationPolicy: {
			mode: 'read_only' | 'explicit_validate_first';
			validateOnlyFirst: boolean;
			autoMaterialize: false;
			reason: string;
		};
	};
	source: {
		readOnly: true;
		helpers: string[];
	};
};

export type BuildOperatorGoalLoopConsoleInput = {
	projectId?: string | null;
	goalId?: string | null;
	taskId?: string | null;
};

function summarizeProject(project: Project | null): OperatorGoalLoopConsole['project'] {
	return project ? { id: project.id, name: project.name } : null;
}

function summarizeGoal(goal: Goal | null): OperatorGoalLoopConsole['goal'] {
	return goal
		? {
				id: goal.id,
				name: goal.name,
				status: goal.status,
				successSignal: goal.successSignal
			}
		: null;
}

function summarizeTask(task: Task | null): OperatorGoalLoopConsole['selectedTask'] {
	return task
		? {
				id: task.id,
				title: task.title,
				status: task.status,
				projectId: task.projectId,
				goalId: task.goalId
			}
		: null;
}

function taskHref(taskId: string | null) {
	return taskId ? `/app/tasks/${taskId}` : null;
}

function goalHref(goalId: string | null) {
	return goalId ? `/app/goals/${goalId}` : null;
}

function mapTaskNextAction(action: TaskLoopReportNextAction): OperatorGoalLoopPathKind {
	switch (action) {
		case 'execute_task':
			return 'execute';
		case 'continue_run':
			return 'continue_run';
		case 'review_result':
			return 'review';
		case 'resolve_approval':
			return 'approval';
		case 'resolve_blocker':
			return 'blocker';
		case 'research_task':
			return 'research';
		case 'clarify_task':
			return 'clarification';
		case 'plan_task':
		case 'complete_or_close_out':
		case 'create_follow_up':
			return 'planning';
		case 'no_action':
			return 'no_action';
	}
}

function mapRecommendationKind(kind: GoalWorkLoopRecommendationKind): OperatorGoalLoopPathKind {
	switch (kind) {
		case 'execute_task':
			return 'execute';
		case 'review_result':
			return 'review';
		case 'resolve_approval':
			return 'approval';
		case 'unblock_task':
			return 'blocker';
		case 'research_task':
			return 'research';
		case 'clarify_task':
			return 'clarification';
		case 'plan_revision':
		case 'plan_task':
		case 'create_planning_task':
		case 'request_approval_or_downgrade':
			return 'planning';
		case 'goal_complete':
			return 'goal_complete';
	}
}

function surfaceForPath(kind: OperatorGoalLoopPathKind): OperatorGoalLoopSurface {
	switch (kind) {
		case 'review':
		case 'approval':
			return 'governance';
		case 'blocker':
		case 'execute':
		case 'continue_run':
		case 'research':
		case 'clarification':
			return 'task_detail';
		case 'planning':
			return 'planning';
		case 'goal_complete':
		case 'no_action':
			return 'goal_detail';
	}
}

function labelForPath(kind: OperatorGoalLoopPathKind) {
	switch (kind) {
		case 'execute':
			return 'Execute selected task';
		case 'continue_run':
			return 'Continue or close out active run';
		case 'review':
			return 'Resolve review';
		case 'approval':
			return 'Resolve approval';
		case 'blocker':
			return 'Resolve blocker';
		case 'planning':
			return 'Plan next work';
		case 'research':
			return 'Research before execution';
		case 'clarification':
			return 'Clarify before execution';
		case 'goal_complete':
			return 'Goal loop has no remaining action';
		case 'no_action':
			return 'No operator action';
	}
}

function hrefForSurface(input: {
	surface: OperatorGoalLoopSurface;
	taskId: string | null;
	goalId: string | null;
}) {
	switch (input.surface) {
		case 'task_detail':
			return taskHref(input.taskId);
		case 'governance':
			return '/app/governance';
		case 'planning':
			return input.goalId ? `/app/planning?goalId=${encodeURIComponent(input.goalId)}` : '/app/planning';
		case 'autonomous_queue':
			return '/app/autonomous-queue';
		case 'goal_detail':
			return goalHref(input.goalId);
		case 'none':
			return null;
	}
}

function suggestedCommandsForRecommendation(input: {
	recommendation: GoalWorkLoopRecommendation;
	taskReport: TaskLoopReport | null;
	taskId: string | null;
}) {
	if (input.taskReport) {
		return input.taskReport.nextAction.suggestedCommands;
	}

	if (input.recommendation.suggestedTaskDraft) {
		return ['goal-loop:materialize_suggested_task', 'goal-loop:get_next_recommended_action'];
	}

	if (input.taskId) {
		return ['goal-loop:get_task_loop_report', 'goal-loop:explain_task_eligibility'];
	}

	return ['goal-loop:get_next_recommended_action'];
}

function continuationPolicyForPath(input: {
	recommendation: GoalWorkLoopRecommendation;
	taskReport: TaskLoopReport | null;
}) {
	if (input.taskReport && input.taskReport.nextAction.action !== 'no_action') {
		return {
			mode: 'read_only',
			validateOnlyFirst: false,
			autoMaterialize: false,
			reason: 'This operator path is a read-only task recommendation; use the suggested command explicitly.'
		} as const;
	}

	if (input.recommendation.suggestedTaskDraft) {
		return {
			mode: 'explicit_validate_first',
			validateOnlyFirst: true,
			autoMaterialize: false,
			reason:
				'Materialize the suggested task only through goal-loop:materialize_suggested_task after a validateOnly preview; do not create or launch continuation work automatically.'
		} as const;
	}

	if (input.taskReport?.nextAction.action === 'no_action') {
		return {
			mode: 'read_only',
			validateOnlyFirst: false,
			autoMaterialize: false,
			reason:
				'The selected task has no task-level action. Use the Goal-level recommendation before creating follow-up work.'
		} as const;
	}

	return {
		mode: 'read_only',
		validateOnlyFirst: false,
		autoMaterialize: false,
		reason: 'This operator path is a read-only recommendation; use the suggested command explicitly.'
	} as const;
}

export function buildOperatorGoalLoopConsole(
	data: ControlPlaneData,
	input: BuildOperatorGoalLoopConsoleInput = {}
): OperatorGoalLoopConsole {
	const inputTaskId = input.taskId ?? null;
	const selectedTask = inputTaskId
		? (data.tasks.find((task) => task.id === inputTaskId) ?? null)
		: null;
	const resolvedProjectId = input.projectId ?? selectedTask?.projectId ?? null;
	const resolvedGoalId = input.goalId ?? selectedTask?.goalId ?? null;
	const goalLoop = buildGoalWorkLoopClassification(data, {
		projectId: resolvedProjectId,
		goalId: resolvedGoalId
	});
	const selectedTaskId = inputTaskId ?? goalLoop.recommendation.taskIds[0] ?? null;
	const effectiveSelectedTask = selectedTaskId === inputTaskId
		? selectedTask
		: selectedTaskId
			? (data.tasks.find((task) => task.id === selectedTaskId) ?? null)
			: null;
	const selectedTaskReport = selectedTaskId ? buildTaskLoopReport(data, selectedTaskId) : null;
	const useGoalRecommendationPath = selectedTaskReport?.nextAction.action === 'no_action';
	const pathKind = selectedTaskReport && !useGoalRecommendationPath
		? mapTaskNextAction(selectedTaskReport.nextAction.action)
		: mapRecommendationKind(goalLoop.recommendation.kind);
	const surface = surfaceForPath(pathKind);
	const goalId = goalLoop.goal?.id ?? resolvedGoalId ?? effectiveSelectedTask?.goalId ?? null;
	const pathTaskId = useGoalRecommendationPath
		? (goalLoop.recommendation.taskIds[0] ?? null)
		: selectedTaskId;

	return {
		project: summarizeProject(goalLoop.project),
		goal: summarizeGoal(goalLoop.goal),
		recommendation: goalLoop.recommendation,
		selectedTask: summarizeTask(effectiveSelectedTask),
		selectedTaskReport,
		path: {
			kind: pathKind,
			surface,
			label: labelForPath(pathKind),
			reason:
				selectedTaskReport && !useGoalRecommendationPath
					? selectedTaskReport.nextAction.reason
					: goalLoop.recommendation.reason,
			href: hrefForSurface({ surface, taskId: pathTaskId, goalId }),
			taskId: pathTaskId,
			suggestedCommands: suggestedCommandsForRecommendation({
				recommendation: goalLoop.recommendation,
				taskReport: useGoalRecommendationPath ? null : selectedTaskReport,
				taskId: selectedTaskId
			}),
			continuationPolicy: continuationPolicyForPath({
				recommendation: goalLoop.recommendation,
				taskReport: selectedTaskReport
			})
		},
		source: {
			readOnly: true,
			helpers: [
				'src/lib/server/operator-goal-loop-console.ts',
				'src/lib/server/goal-work-loop.ts',
				'src/lib/server/task-loop-report.ts'
			]
		}
	};
}
