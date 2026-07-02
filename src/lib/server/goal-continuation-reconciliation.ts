import { createDecision, createTask } from '$lib/server/control-plane';
import { getGoalDescendantGoalIds, getGoalLinkedTaskIds } from '$lib/server/goal-relationships';
import type { ControlPlaneData, Goal, Task } from '$lib/types/control-plane';

export const CONTINUATION_PLANNING_TASK_TITLE =
	'Continue goal: assess remaining gap and create next work';

const ELIGIBLE_GOAL_STATUSES = new Set<Goal['status']>(['ready', 'running']);
const OPEN_TASK_STATUSES = new Set<Task['status']>([
	'in_draft',
	'ready',
	'in_progress',
	'review',
	'blocked'
]);

export type GoalContinuationReconciliationResult = {
	goalId: string;
	checked: boolean;
	createdTaskId: string | null;
	existingTaskId: string | null;
	reason: string;
};

export type GoalContinuationReconciliationPlan = {
	data: ControlPlaneData;
	results: GoalContinuationReconciliationResult[];
	createdTaskIds: string[];
};

function uniqueIds(ids: Iterable<string | null | undefined>) {
	return [...new Set([...ids].map((id) => id?.trim() ?? '').filter(Boolean))];
}

function getGoalAncestorIds(data: ControlPlaneData, goalId: string) {
	const ancestors: string[] = [];
	const seen = new Set<string>();
	let parentGoalId = data.goals.find((goal) => goal.id === goalId)?.parentGoalId ?? null;

	while (parentGoalId && !seen.has(parentGoalId)) {
		seen.add(parentGoalId);
		ancestors.push(parentGoalId);
		parentGoalId = data.goals.find((goal) => goal.id === parentGoalId)?.parentGoalId ?? null;
	}

	return ancestors;
}

export function getGoalIdsAffectedByTaskChange(input: {
	data: ControlPlaneData;
	previousTask?: Task | null;
	nextTask?: Task | null;
	deletedTaskIds?: readonly string[];
}) {
	const changedTaskIds = uniqueIds([
		input.previousTask?.id,
		input.nextTask?.id,
		...(input.deletedTaskIds ?? [])
	]);
	const directlyRelatedGoalIds = uniqueIds([
		input.previousTask?.goalId,
		input.nextTask?.goalId,
		...input.data.goals
			.filter((goal) => (goal.taskIds ?? []).some((taskId) => changedTaskIds.includes(taskId)))
			.map((goal) => goal.id)
	]);

	return uniqueIds(
		directlyRelatedGoalIds.flatMap((goalId) => [goalId, ...getGoalAncestorIds(input.data, goalId)])
	);
}

function getGoalScopeTaskIds(data: ControlPlaneData, goal: Goal) {
	const goalIds = [goal.id, ...getGoalDescendantGoalIds(data, goal.id)];
	return uniqueIds(
		goalIds.flatMap((goalId) => {
			const scopedGoal = data.goals.find((candidate) => candidate.id === goalId);
			return scopedGoal ? getGoalLinkedTaskIds(data, scopedGoal) : [];
		})
	);
}

function getGoalScopeTasks(data: ControlPlaneData, goal: Goal) {
	const taskIds = new Set(getGoalScopeTaskIds(data, goal));
	return data.tasks.filter((task) => taskIds.has(task.id));
}

export function isContinuationPlanningTask(task: Pick<Task, 'title'>) {
	return task.title.trim().toLowerCase() === CONTINUATION_PLANNING_TASK_TITLE.toLowerCase();
}

function isOpenTask(task: Task) {
	return OPEN_TASK_STATUSES.has(task.status) && task.closeoutState !== 'accepted';
}

function getTaskActivityTime(task: Task) {
	const timestamp = task.updatedAt || task.createdAt;
	const time = Date.parse(timestamp);
	return Number.isFinite(time) ? time : 0;
}

function resolveContinuationProjectId(data: ControlPlaneData, goal: Goal, scopedTasks: Task[]) {
	return (
		goal.projectIds?.find((projectId) =>
			data.projects.some((project) => project.id === projectId)
		) ??
		scopedTasks.find((task) => data.projects.some((project) => project.id === task.projectId))
			?.projectId ??
		null
	);
}

function buildContinuationSummary(goal: Goal, openTaskCount: number) {
	return [
		'Assess the current state of this goal against its completion criteria or intended outcome.',
		'Review the goal, linked tasks, completed work, remaining open or blocked work, artifacts, notes, and current context.',
		'Determine whether the goal is complete, blocked, needs user review, needs clarification, or needs additional work.',
		'If additional work is needed, propose or create the next concrete task or tasks required to close the remaining gap.',
		'',
		`Reconciliation rationale: goal "${goal.name}" is ${goal.status}, is not complete or blocked, and had ${openTaskCount} open scoped task(s) when continuation reconciliation ran.`
	].join('\n');
}

function createContinuationTask(input: {
	data: ControlPlaneData;
	goal: Goal;
	projectId: string;
	openTaskCount: number;
	now: string;
}) {
	const project = input.data.projects.find((candidate) => candidate.id === input.projectId) ?? null;

	return createTask({
		title: CONTINUATION_PLANNING_TASK_TITLE,
		summary: buildContinuationSummary(input.goal, input.openTaskCount),
		successCriteria:
			'The output states current goal status, whether the goal appears complete, remaining gap, blockers or missing context, recommended next tasks, whether review or clarification is needed, and a recommendation to continue, review, block, pause, or close.',
		readyCondition:
			'The goal has no other open scoped work and is not blocked, in review, or done.',
		expectedOutcome:
			'A concrete continuation recommendation exists and, when appropriate, the next bounded AMS task or tasks are proposed or created.',
		scope: 'Planning and reconciliation for the linked goal only.',
		nonGoals: 'Do not implement new product work inside this continuation-planning task.',
		validationSteps:
			'Review the goal detail or goal-loop recommendation and verify the next work, blocker, review need, or close recommendation is explicit.',
		readinessLevel: 'R3_EXECUTABLE',
		autonomyLevel: 'A2_AGENT_MAY_DRAFT_ARTIFACTS',
		reviewRequirement: 'SUMMARY_REVIEW',
		projectId: input.projectId,
		goalId: input.goal.id,
		area: input.goal.area,
		priority: 'medium',
		riskLevel: 'low',
		approvalMode: 'none',
		requiresReview: true,
		desiredRoleId: '',
		artifactPath:
			project?.defaultArtifactRoot || project?.projectRootFolder || input.goal.artifactPath,
		status: 'ready',
		createdAt: input.now,
		updatedAt: input.now
	});
}

export function reconcileGoalContinuationInData(
	data: ControlPlaneData,
	goalId: string
): GoalContinuationReconciliationPlan {
	const goal = data.goals.find((candidate) => candidate.id === goalId) ?? null;

	if (!goal) {
		return {
			data,
			results: [
				{
					goalId,
					checked: false,
					createdTaskId: null,
					existingTaskId: null,
					reason: 'Goal not found.'
				}
			],
			createdTaskIds: []
		};
	}

	if (!ELIGIBLE_GOAL_STATUSES.has(goal.status)) {
		return {
			data,
			results: [
				{
					goalId,
					checked: true,
					createdTaskId: null,
					existingTaskId: null,
					reason: `Goal status ${goal.status} is not eligible for continuation planning.`
				}
			],
			createdTaskIds: []
		};
	}

	const scopedTasks = getGoalScopeTasks(data, goal);
	const openTasks = scopedTasks.filter(isOpenTask);
	const existingContinuationTask = openTasks.find(isContinuationPlanningTask) ?? null;

	if (existingContinuationTask) {
		return {
			data,
			results: [
				{
					goalId,
					checked: true,
					createdTaskId: null,
					existingTaskId: existingContinuationTask.id,
					reason: 'Open continuation-planning task already exists.'
				}
			],
			createdTaskIds: []
		};
	}

	if (openTasks.length > 0) {
		return {
			data,
			results: [
				{
					goalId,
					checked: true,
					createdTaskId: null,
					existingTaskId: null,
					reason: `Goal already has ${openTasks.length} open scoped task(s).`
				}
			],
			createdTaskIds: []
		};
	}

	const continuationTasks = scopedTasks
		.filter(isContinuationPlanningTask)
		.sort((left, right) => getTaskActivityTime(right) - getTaskActivityTime(left));
	const latestContinuationTask = continuationTasks[0] ?? null;

	if (latestContinuationTask) {
		const latestContinuationTime = getTaskActivityTime(latestContinuationTask);
		const hasNewerClosedNonContinuationWork = scopedTasks.some(
			(task) =>
				!isContinuationPlanningTask(task) &&
				(task.status === 'done' || task.closeoutState === 'accepted') &&
				getTaskActivityTime(task) > latestContinuationTime
		);

		if (!hasNewerClosedNonContinuationWork) {
			return {
				data,
				results: [
					{
						goalId,
						checked: true,
						createdTaskId: null,
						existingTaskId: latestContinuationTask.id,
						reason:
							'Continuation-planning task already reached a terminal state and no newer scoped work changed the goal.'
					}
				],
				createdTaskIds: []
			};
		}
	}

	const projectId = resolveContinuationProjectId(data, goal, scopedTasks);

	if (!projectId) {
		return {
			data,
			results: [
				{
					goalId,
					checked: true,
					createdTaskId: null,
					existingTaskId: null,
					reason: 'Goal has no linked project for a continuation-planning task.'
				}
			],
			createdTaskIds: []
		};
	}

	const now = new Date().toISOString();
	const continuationTask = createContinuationTask({
		data,
		goal,
		projectId,
		openTaskCount: openTasks.length,
		now
	});
	const nextGoal = {
		...goal,
		projectIds: uniqueIds([...(goal.projectIds ?? []), projectId]),
		taskIds: uniqueIds([...(goal.taskIds ?? []), continuationTask.id])
	};
	const nextData: ControlPlaneData = {
		...data,
		tasks: [continuationTask, ...data.tasks],
		goals: data.goals.map((candidate) => (candidate.id === goal.id ? nextGoal : candidate)),
		decisions: [
			createDecision({
				goalId: goal.id,
				taskId: continuationTask.id,
				decisionType: 'goal_plan_updated',
				summary: 'Created continuation-planning task because active goal had no open scoped work.',
				createdAt: now
			}),
			...(data.decisions ?? [])
		]
	};

	return {
		data: nextData,
		results: [
			{
				goalId,
				checked: true,
				createdTaskId: continuationTask.id,
				existingTaskId: null,
				reason: 'Created continuation-planning task because no open scoped work remained.'
			}
		],
		createdTaskIds: [continuationTask.id]
	};
}

export function reconcileGoalsContinuationInData(
	data: ControlPlaneData,
	goalIds: Iterable<string>
): GoalContinuationReconciliationPlan {
	let nextData = data;
	const results: GoalContinuationReconciliationResult[] = [];
	const createdTaskIds: string[] = [];

	for (const goalId of uniqueIds(goalIds)) {
		const plan = reconcileGoalContinuationInData(nextData, goalId);
		nextData = plan.data;
		results.push(...plan.results);
		createdTaskIds.push(...plan.createdTaskIds);
	}

	return {
		data: nextData,
		results,
		createdTaskIds
	};
}

export function reconcileAllActiveGoalsInData(
	data: ControlPlaneData
): GoalContinuationReconciliationPlan {
	return reconcileGoalsContinuationInData(
		data,
		data.goals.filter((goal) => ELIGIBLE_GOAL_STATUSES.has(goal.status)).map((goal) => goal.id)
	);
}
