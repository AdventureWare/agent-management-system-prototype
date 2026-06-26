import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { RUN_STATUS_OPTIONS } from '$lib/types/control-plane';
import type { ControlPlaneData, Run, RunStatus, Task } from '$lib/types/control-plane';

export type AgentPriorRunsInput = {
	taskId?: string | null;
	goalId?: string | null;
	projectId?: string | null;
	limit?: number | null;
	status?: string | null;
};

type PriorRunCandidate = {
	run: Run;
	task: Task;
	score: number;
	inclusionReason: string;
};

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

function normalizeText(value: string | null | undefined) {
	return value?.trim() ?? '';
}

function clampLimit(value: number | null | undefined) {
	if (!Number.isFinite(value) || !value || value <= 0) {
		return DEFAULT_LIMIT;
	}

	return Math.min(Math.max(1, Math.trunc(value)), MAX_LIMIT);
}

function isRunStatus(value: string): value is RunStatus {
	return (RUN_STATUS_OPTIONS as readonly string[]).includes(value);
}

function resolveScope(data: ControlPlaneData, input: AgentPriorRunsInput) {
	const taskId = normalizeText(input.taskId);
	const goalId = normalizeText(input.goalId);
	const projectId = normalizeText(input.projectId);

	const task = taskId ? (data.tasks.find((candidate) => candidate.id === taskId) ?? null) : null;
	const goal = goalId ? (data.goals.find((candidate) => candidate.id === goalId) ?? null) : null;
	const resolvedGoalId = goal?.id ?? task?.goalId ?? goalId;
	const resolvedProjectId =
		projectId ||
		task?.projectId ||
		goal?.projectIds?.[0] ||
		(resolvedGoalId
			? data.goals.find((candidate) => candidate.id === resolvedGoalId)?.projectIds?.[0]
			: '') ||
		'';

	if (taskId && !task) {
		throw new AgentControlPlaneApiError(404, 'Task not found for prior-run context query.', {
			code: 'prior_runs_task_not_found',
			suggestedNextCommands: ['task:list', 'context:current'],
			details: { taskId }
		});
	}

	if (goalId && !goal) {
		throw new AgentControlPlaneApiError(404, 'Goal not found for prior-run context query.', {
			code: 'prior_runs_goal_not_found',
			suggestedNextCommands: ['goal:list', 'goal-loop:list_active_goals'],
			details: { goalId }
		});
	}

	if (!taskId && !goalId && !projectId) {
		throw new AgentControlPlaneApiError(400, 'Task, goal, or project id is required.', {
			code: 'prior_runs_scope_required',
			suggestedNextCommands: ['context:current', 'task:list', 'goal-loop:list_active_goals']
		});
	}

	return {
		task,
		goal,
		taskId,
		goalId: resolvedGoalId,
		projectId: resolvedProjectId
	};
}

function getGoalTaskIds(data: ControlPlaneData, goalId: string) {
	const goal = data.goals.find((candidate) => candidate.id === goalId) ?? null;
	const explicitTaskIds = new Set(goal?.taskIds ?? []);

	return new Set(
		data.tasks
			.filter((task) => task.goalId === goalId || explicitTaskIds.has(task.id))
			.map((task) => task.id)
	);
}

function scoreRunCandidate(input: {
	run: Run;
	task: Task;
	scopeTaskId: string;
	scopeGoalId: string;
	scopeProjectId: string;
	goalTaskIds: Set<string>;
}) {
	if (input.scopeTaskId && input.run.taskId === input.scopeTaskId) {
		return {
			score: 100,
			inclusionReason: 'same_task: run is attached to the requested task.'
		};
	}

	if (input.scopeGoalId && input.goalTaskIds.has(input.run.taskId)) {
		return {
			score: input.task.goalId === input.scopeGoalId ? 85 : 75,
			inclusionReason: 'same_goal: run is attached to a task in the requested goal scope.'
		};
	}

	if (input.scopeProjectId && input.task.projectId === input.scopeProjectId) {
		return {
			score: 50,
			inclusionReason: 'same_project: run is attached to a task in the requested project.'
		};
	}

	return null;
}

function summarizeCandidate(candidate: PriorRunCandidate) {
	return {
		id: candidate.run.id,
		taskId: candidate.task.id,
		taskTitle: candidate.task.title,
		status: candidate.run.status,
		summary: candidate.run.summary,
		resultSummary: candidate.run.resultSummary ?? '',
		validationSummary: candidate.run.validationSummary ?? '',
		artifactPaths: candidate.run.artifactPaths ?? [],
		updatedAt: candidate.run.updatedAt,
		inclusionReason: candidate.inclusionReason
	};
}

export function getRelevantPriorRuns(data: ControlPlaneData, input: AgentPriorRunsInput) {
	const limit = clampLimit(input.limit);
	const status = normalizeText(input.status);

	if (status && !isRunStatus(status)) {
		throw new AgentControlPlaneApiError(400, 'Unsupported run status filter.', {
			code: 'prior_runs_invalid_status',
			suggestedNextCommands: ['context:get_relevant_prior_runs'],
			details: { status }
		});
	}

	const scope = resolveScope(data, input);
	const taskMap = new Map(data.tasks.map((task) => [task.id, task]));
	const goalTaskIds = scope.goalId ? getGoalTaskIds(data, scope.goalId) : new Set<string>();

	const candidates = data.runs
		.filter((run) => !status || run.status === status)
		.map((run) => {
			const task = taskMap.get(run.taskId);

			if (!task) {
				return null;
			}

			const score = scoreRunCandidate({
				run,
				task,
				scopeTaskId: scope.taskId,
				scopeGoalId: scope.goalId,
				scopeProjectId: scope.projectId,
				goalTaskIds
			});

			return score ? { run, task, ...score } : null;
		})
		.filter((candidate): candidate is PriorRunCandidate => Boolean(candidate))
		.sort((left, right) => {
			const scoreDelta = right.score - left.score;
			return scoreDelta !== 0 ? scoreDelta : right.run.updatedAt.localeCompare(left.run.updatedAt);
		})
		.slice(0, limit)
		.map(summarizeCandidate);

	return {
		command: 'get_relevant_prior_runs' as const,
		resolved: {
			taskId: scope.task?.id ?? scope.taskId ?? null,
			goalId: scope.goal?.id ?? scope.goalId ?? null,
			projectId: scope.projectId || null
		},
		source: {
			domainHelper: 'src/lib/server/agent-prior-runs.ts',
			route: '/api/agent-context/relevant-prior-runs'
		},
		safety: {
			readOnly: true,
			note: 'This endpoint ranks existing AMS run records only. It does not mutate tasks, runs, reviews, approvals, projects, or goals.'
		},
		limit,
		status: status || null,
		runs: candidates,
		suggestedReadbackCommands: ['context:current', 'goal-loop:get_goal_context']
	};
}
