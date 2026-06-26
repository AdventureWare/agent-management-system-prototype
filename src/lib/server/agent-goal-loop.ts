import { buildGoalWorkLoopClassification } from '$lib/server/goal-work-loop';
import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import type {
	ControlPlaneData,
	Goal,
	Project,
	Task,
	Run,
	Review,
	Approval
} from '$lib/types/control-plane';

export const AGENT_GOAL_LOOP_COMMANDS = [
	'list_active_goals',
	'get_goal_context',
	'get_goal_progress',
	'get_goal_success_criteria',
	'get_goal_blockers',
	'get_actionable_work',
	'get_blocked_work',
	'get_awaiting_review',
	'get_next_recommended_action',
	'explain_task_eligibility'
] as const;

export type AgentGoalLoopCommand = (typeof AGENT_GOAL_LOOP_COMMANDS)[number];

export type AgentGoalLoopInput = {
	command: string;
	projectId?: string | null;
	goalId?: string | null;
	taskId?: string | null;
	limit?: number | null;
};

function normalizeText(value: string | null | undefined) {
	return value?.trim() ?? '';
}

function clampLimit(value: number | null | undefined, fallback = 25) {
	if (!Number.isFinite(value) || !value || value <= 0) {
		return fallback;
	}

	return Math.min(Math.max(1, Math.trunc(value)), 100);
}

function normalizeCommand(command: string): AgentGoalLoopCommand {
	const normalized = command.trim() as AgentGoalLoopCommand;

	if (!AGENT_GOAL_LOOP_COMMANDS.includes(normalized)) {
		throw new AgentControlPlaneApiError(404, 'Unknown goal-loop command.', {
			code: 'goal_loop_command_not_found',
			suggestedNextCommands: ['manifest --resource goal-loop'],
			details: { command }
		});
	}

	return normalized;
}

function summarizeProject(project: Project | null) {
	return project
		? {
				id: project.id,
				name: project.name,
				summary: project.summary,
				currentStateMemo: project.currentStateMemo ?? '',
				agentInstructionsPath: project.agentInstructionsPath ?? '',
				validationCommands: project.validationCommands ?? [],
				constraints: project.constraints ?? '',
				nonGoals: project.nonGoals ?? ''
			}
		: null;
}

function summarizeGoal(goal: Goal | null) {
	return goal
		? {
				id: goal.id,
				name: goal.name,
				status: goal.status,
				summary: goal.summary,
				successSignal: goal.successSignal ?? '',
				projectIds: goal.projectIds ?? [],
				taskIds: goal.taskIds ?? [],
				planningPriority: goal.planningPriority ?? null,
				confidence: goal.confidence ?? null,
				targetDate: goal.targetDate ?? null
			}
		: null;
}

function summarizeTask(task: Task | null) {
	return task
		? {
				id: task.id,
				title: task.title,
				summary: task.summary,
				status: task.status,
				projectId: task.projectId,
				goalId: task.goalId,
				readinessLevel: task.readinessLevel,
				autonomyLevel: task.autonomyLevel,
				riskLevel: task.riskLevel,
				reviewRequirement: task.reviewRequirement,
				approvalMode: task.approvalMode,
				blockedReason: task.blockedReason,
				dependencyTaskIds: task.dependencyTaskIds,
				expectedOutcome: task.expectedOutcome ?? '',
				successCriteria: task.successCriteria ?? '',
				readyCondition: task.readyCondition ?? '',
				validationSteps: task.validationSteps ?? ''
			}
		: null;
}

function latestRunForTask(data: Pick<ControlPlaneData, 'runs'>, taskId: string) {
	return (
		data.runs
			.filter((run) => run.taskId === taskId)
			.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null
	);
}

function summarizeRun(run: Run | null) {
	return run
		? {
				id: run.id,
				taskId: run.taskId,
				status: run.status,
				summary: run.summary,
				resultSummary: run.resultSummary ?? '',
				validationSummary: run.validationSummary ?? '',
				errorSummary: run.errorSummary,
				updatedAt: run.updatedAt
			}
		: null;
}

function summarizeReview(review: Review) {
	return {
		id: review.id,
		taskId: review.taskId,
		runId: review.runId,
		status: review.status,
		summary: review.summary,
		updatedAt: review.updatedAt
	};
}

function summarizeApproval(approval: Approval) {
	return {
		id: approval.id,
		taskId: approval.taskId,
		runId: approval.runId,
		mode: approval.mode,
		status: approval.status,
		summary: approval.summary,
		updatedAt: approval.updatedAt
	};
}

function countByClassification(tasks: ReturnType<typeof buildGoalWorkLoopClassification>['tasks']) {
	return tasks.reduce<Record<string, number>>((counts, task) => {
		counts[task.classification] = (counts[task.classification] ?? 0) + 1;
		return counts;
	}, {});
}

function taskWithGoalLoopFields(
	data: ControlPlaneData,
	task: ReturnType<typeof buildGoalWorkLoopClassification>['tasks'][number]
) {
	const rawTask = data.tasks.find((candidate) => candidate.id === task.id) ?? null;
	const latestRun = latestRunForTask(data, task.id);

	return {
		...task,
		task: summarizeTask(rawTask),
		latestRun: summarizeRun(latestRun)
	};
}

function baseResponse(input: {
	command: AgentGoalLoopCommand;
	goalLoop: ReturnType<typeof buildGoalWorkLoopClassification>;
}) {
	return {
		command: input.command,
		resolved: {
			projectId: input.goalLoop.project?.id ?? null,
			goalId: input.goalLoop.goal?.id ?? null
		},
		source: {
			domainHelper: 'src/lib/server/goal-work-loop.ts',
			route: `/api/agent-goal-loop/${input.command}`
		},
		safety: {
			readOnly: true,
			note: 'This endpoint classifies existing AMS state only. Use task, review, approval, or intent operations for mutations.'
		},
		suggestedReadbackCommands: ['goal-loop:get_next_recommended_action', 'context:current']
	};
}

function buildGoalLoop(data: ControlPlaneData, input: AgentGoalLoopInput) {
	return buildGoalWorkLoopClassification(data, {
		projectId: normalizeText(input.projectId) || null,
		goalId: normalizeText(input.goalId) || null
	});
}

function listActiveGoals(data: ControlPlaneData, input: AgentGoalLoopInput) {
	const projectId = normalizeText(input.projectId);
	const limit = clampLimit(input.limit);
	const activeStatuses = new Set(['ready', 'running', 'review']);
	const goals = data.goals
		.filter((goal) => activeStatuses.has(goal.status))
		.filter((goal) => !projectId || (goal.projectIds ?? []).includes(projectId))
		.sort((left, right) => {
			const priorityDelta = (right.planningPriority ?? 0) - (left.planningPriority ?? 0);
			return priorityDelta !== 0 ? priorityDelta : left.name.localeCompare(right.name);
		})
		.slice(0, limit)
		.map((goal) => {
			const linkedTasks = data.tasks.filter(
				(task) =>
					task.goalId === goal.id ||
					(goal.taskIds ?? []).includes(task.id) ||
					(goal.projectIds ?? []).includes(task.projectId)
			);
			return {
				...summarizeGoal(goal),
				projectNames: (goal.projectIds ?? [])
					.map((id) => data.projects.find((project) => project.id === id)?.name ?? '')
					.filter(Boolean),
				taskCount: linkedTasks.length,
				openTaskCount: linkedTasks.filter((task) => task.status !== 'done').length
			};
		});

	return {
		command: 'list_active_goals' as const,
		resolved: {
			projectId: projectId || null,
			goalId: null
		},
		source: {
			route: '/api/agent-goal-loop/list_active_goals'
		},
		safety: {
			readOnly: true,
			note: 'This endpoint lists active goal records only.'
		},
		goals,
		suggestedReadbackCommands: [
			'goal-loop:get_goal_context',
			'goal-loop:get_next_recommended_action'
		]
	};
}

export function buildAgentGoalLoopResponse(data: ControlPlaneData, input: AgentGoalLoopInput) {
	const command = normalizeCommand(input.command);

	if (command === 'list_active_goals') {
		return listActiveGoals(data, input);
	}

	const goalLoop = buildGoalLoop(data, input);
	const base = baseResponse({ command, goalLoop });
	const limit = clampLimit(input.limit);

	if (!goalLoop.project) {
		throw new AgentControlPlaneApiError(404, 'Project could not be resolved for goal-loop query.', {
			code: 'goal_loop_project_not_found',
			suggestedNextCommands: ['project:list', 'goal-loop:list_active_goals'],
			details: { projectId: input.projectId ?? null, goalId: input.goalId ?? null }
		});
	}

	if (command === 'get_goal_context') {
		const taskIds = new Set(goalLoop.tasks.map((task) => task.id));
		return {
			...base,
			project: summarizeProject(goalLoop.project),
			goal: summarizeGoal(goalLoop.goal),
			progress: {
				totalTasks: goalLoop.tasks.length,
				byClassification: countByClassification(goalLoop.tasks),
				recommendation: goalLoop.recommendation
			},
			tasks: goalLoop.tasks.slice(0, limit).map((task) => taskWithGoalLoopFields(data, task)),
			openReviews: data.reviews
				.filter((review) => review.status === 'open' && taskIds.has(review.taskId))
				.map(summarizeReview),
			pendingApprovals: data.approvals
				.filter((approval) => approval.status === 'pending' && taskIds.has(approval.taskId))
				.map(summarizeApproval)
		};
	}

	if (command === 'get_goal_progress') {
		return {
			...base,
			goal: summarizeGoal(goalLoop.goal),
			progress: {
				totalTasks: goalLoop.tasks.length,
				byClassification: countByClassification(goalLoop.tasks),
				actionableTaskCount: goalLoop.actionableTasks.length,
				nonActionableTaskCount: goalLoop.nonActionableTasks.length,
				acceptedOrDoneTaskCount: goalLoop.byClassification.accepted_done.length,
				blockedTaskCount: goalLoop.byClassification.blocked.length,
				awaitingReviewTaskCount: goalLoop.byClassification.awaiting_review.length,
				approvalRequiredTaskCount: goalLoop.byClassification.approval_required.length,
				recommendation: goalLoop.recommendation
			}
		};
	}

	if (command === 'get_goal_success_criteria') {
		return {
			...base,
			goal: summarizeGoal(goalLoop.goal),
			success: {
				successSignal: goalLoop.goal?.successSignal ?? '',
				taskCriteria: goalLoop.tasks
					.map((classifiedTask) => data.tasks.find((task) => task.id === classifiedTask.id) ?? null)
					.filter((task): task is Task => Boolean(task))
					.filter(
						(task) =>
							normalizeText(task.expectedOutcome) ||
							normalizeText(task.successCriteria) ||
							normalizeText(task.validationSteps)
					)
					.slice(0, limit)
					.map((task) => ({
						taskId: task.id,
						title: task.title,
						status: task.status,
						expectedOutcome: task.expectedOutcome ?? '',
						successCriteria: task.successCriteria ?? '',
						validationSteps: task.validationSteps ?? ''
					}))
			}
		};
	}

	if (command === 'get_goal_blockers' || command === 'get_blocked_work') {
		const blockedClassifications = new Set([
			'blocked',
			'needs_clarification',
			'needs_research',
			'needs_planning',
			'approval_required',
			'unsafe_out_of_scope'
		]);
		const blocked = goalLoop.tasks
			.filter((task) => blockedClassifications.has(task.classification))
			.slice(0, limit)
			.map((task) => taskWithGoalLoopFields(data, task));

		return {
			...base,
			blocked
		};
	}

	if (command === 'get_actionable_work') {
		return {
			...base,
			actionable: goalLoop.actionableTasks
				.slice(0, limit)
				.map((task) => taskWithGoalLoopFields(data, task)),
			parallelTaskIds: goalLoop.recommendation.parallelTaskIds
		};
	}

	if (command === 'get_awaiting_review') {
		const awaiting = [
			...goalLoop.byClassification.awaiting_review,
			...goalLoop.byClassification.approval_required
		]
			.slice(0, limit)
			.map((task) => taskWithGoalLoopFields(data, task));
		const taskIds = new Set(awaiting.map((task) => task.id));

		return {
			...base,
			awaiting,
			openReviews: data.reviews
				.filter((review) => review.status === 'open' && taskIds.has(review.taskId))
				.map(summarizeReview),
			pendingApprovals: data.approvals
				.filter((approval) => approval.status === 'pending' && taskIds.has(approval.taskId))
				.map(summarizeApproval)
		};
	}

	if (command === 'get_next_recommended_action') {
		return {
			...base,
			recommendation: goalLoop.recommendation,
			selectedTasks: goalLoop.recommendation.taskIds
				.map((taskId) => goalLoop.tasks.find((task) => task.id === taskId) ?? null)
				.filter((task): task is NonNullable<typeof task> => Boolean(task))
				.map((task) => taskWithGoalLoopFields(data, task))
		};
	}

	if (command === 'explain_task_eligibility') {
		const taskId = normalizeText(input.taskId);

		if (!taskId) {
			throw new AgentControlPlaneApiError(400, 'Task id is required for eligibility explanation.', {
				code: 'goal_loop_task_id_required',
				suggestedNextCommands: ['task:list', 'goal-loop:get_actionable_work']
			});
		}

		const classifiedTask = goalLoop.tasks.find((task) => task.id === taskId);
		const rawTask = data.tasks.find((task) => task.id === taskId) ?? null;

		if (!classifiedTask || !rawTask) {
			throw new AgentControlPlaneApiError(404, 'Task not found in the resolved goal-loop scope.', {
				code: 'goal_loop_task_not_found',
				suggestedNextCommands: ['task:get', 'goal-loop:get_goal_context'],
				details: {
					taskId,
					projectId: goalLoop.project?.id ?? null,
					goalId: goalLoop.goal?.id ?? null
				}
			});
		}

		return {
			...base,
			eligibility: taskWithGoalLoopFields(data, classifiedTask)
		};
	}

	return base;
}
