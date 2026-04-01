import { formatActivityAge } from '$lib/session-activity';
import { isActiveTaskThread } from '$lib/task-thread-context';
import type { AgentSessionDetail } from '$lib/types/agent-session';
import type { ControlPlaneData, Run, RunStatus, Task } from '$lib/types/control-plane';
import type { TaskFreshness, TaskFreshnessSummary, TaskWorkItem } from '$lib/types/task-work-item';
import {
	formatRelativeTime,
	getOpenReviewForTask,
	getPendingApprovalForTask,
	taskHasUnmetDependencies
} from '$lib/server/control-plane';
import { selectProjectTaskThreadContext } from '$lib/server/task-thread-compatibility';

export const STALE_IN_PROGRESS_TASK_MS = 6 * 60 * 60 * 1000;
export const STALE_RUN_ACTIVITY_MS = 5 * 60 * 1000;
export const STALE_THREAD_ACTIVITY_MS = 15 * 60 * 1000;

const ACTIVE_RUN_STATUSES = new Set<RunStatus>(['starting', 'running']);

function getAgeMs(iso: string | null, now = Date.now()) {
	if (!iso) {
		return null;
	}

	const timestamp = Date.parse(iso);

	if (Number.isNaN(timestamp)) {
		return null;
	}

	return Math.max(0, now - timestamp);
}

function latestIso(values: Array<string | null | undefined>) {
	return (
		values
			.filter((value): value is string => Boolean(value))
			.sort((left, right) => left.localeCompare(right))
			.at(-1) ?? null
	);
}

function getRunActivityAt(run: Run | null) {
	if (!run) {
		return null;
	}

	return latestIso([run.lastHeartbeatAt, run.updatedAt, run.startedAt, run.createdAt]);
}

function buildTaskFreshness(input: {
	task: Task;
	latestRun: Run | null;
	statusThread: AgentSessionDetail | null;
	now?: number;
}): TaskFreshness {
	const now = input.now ?? Date.now();
	const taskAgeMs = getAgeMs(input.task.updatedAt, now);
	const runActivityAt = getRunActivityAt(input.latestRun);
	const runActivityAgeMs = getAgeMs(runActivityAt, now);
	const threadActivityAgeMs = getAgeMs(input.statusThread?.lastActivityAt ?? null, now);
	const staleInProgress =
		input.task.status === 'in_progress' &&
		taskAgeMs !== null &&
		taskAgeMs >= STALE_IN_PROGRESS_TASK_MS;
	const noRecentRunActivity =
		Boolean(input.latestRun && ACTIVE_RUN_STATUSES.has(input.latestRun.status)) &&
		runActivityAgeMs !== null &&
		runActivityAgeMs >= STALE_RUN_ACTIVITY_MS;
	const activeThreadNoRecentOutput =
		isActiveTaskThread(input.statusThread) &&
		threadActivityAgeMs !== null &&
		threadActivityAgeMs >= STALE_THREAD_ACTIVITY_MS;
	const staleSignals = [
		staleInProgress ? 'staleInProgress' : null,
		noRecentRunActivity ? 'noRecentRunActivity' : null,
		activeThreadNoRecentOutput ? 'activeThreadNoRecentOutput' : null
	].filter((value): value is TaskFreshness['staleSignals'][number] => Boolean(value));

	return {
		isStale: staleSignals.length > 0,
		staleSignals,
		staleInProgress,
		noRecentRunActivity,
		activeThreadNoRecentOutput,
		taskAgeMs,
		taskAgeLabel: formatRelativeTime(input.task.updatedAt),
		runActivityAgeMs,
		runActivityAgeLabel: formatActivityAge(runActivityAt, now),
		threadActivityAgeMs,
		threadActivityAgeLabel: formatActivityAge(input.statusThread?.lastActivityAt ?? null, now)
	};
}

function getStalenessRank(task: TaskWorkItem) {
	return Math.max(
		task.freshness.taskAgeMs ?? 0,
		task.freshness.runActivityAgeMs ?? 0,
		task.freshness.threadActivityAgeMs ?? 0
	);
}

export function summarizeTaskFreshness(
	tasks: Array<Pick<TaskWorkItem, 'freshness'>>
): TaskFreshnessSummary {
	return tasks.reduce<TaskFreshnessSummary>(
		(summary, task) => ({
			totalCount: summary.totalCount + (task.freshness.isStale ? 1 : 0),
			staleInProgressCount: summary.staleInProgressCount + (task.freshness.staleInProgress ? 1 : 0),
			noRecentRunActivityCount:
				summary.noRecentRunActivityCount + (task.freshness.noRecentRunActivity ? 1 : 0),
			activeThreadNoRecentOutputCount:
				summary.activeThreadNoRecentOutputCount +
				(task.freshness.activeThreadNoRecentOutput ? 1 : 0)
		}),
		{
			totalCount: 0,
			staleInProgressCount: 0,
			noRecentRunActivityCount: 0,
			activeThreadNoRecentOutputCount: 0
		}
	);
}

export function buildTaskWorkItems(
	data: ControlPlaneData,
	sessions: AgentSessionDetail[],
	options: { now?: number } = {}
): TaskWorkItem[] {
	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const workerMap = new Map(data.workers.map((worker) => [worker.id, worker]));
	const runMap = new Map(data.runs.map((run) => [run.id, run]));
	const sessionMap = new Map(sessions.map((session) => [session.id, session]));

	return [...data.tasks]
		.map((task) => {
			const project = projectMap.get(task.projectId) ?? null;
			const latestRun = task.latestRunId ? (runMap.get(task.latestRunId) ?? null) : null;
			const assignedThread = task.threadSessionId
				? (sessionMap.get(task.threadSessionId) ?? null)
				: null;
			const latestRunThread = latestRun?.sessionId
				? (sessionMap.get(latestRun.sessionId) ?? null)
				: null;
			const threadContext = selectProjectTaskThreadContext(project, {
				assignedThread,
				latestRunThread
			});

			return {
				...task,
				projectName: project?.name ?? 'No project',
				assigneeName: task.assigneeWorkerId
					? (workerMap.get(task.assigneeWorkerId)?.name ?? 'Unknown worker')
					: 'Unassigned',
				latestRun,
				...threadContext,
				updatedAtLabel: formatRelativeTime(task.updatedAt),
				hasUnmetDependencies: taskHasUnmetDependencies(data, task),
				openReview: getOpenReviewForTask(data, task.id),
				pendingApproval: getPendingApprovalForTask(data, task.id),
				freshness: buildTaskFreshness({
					task,
					latestRun,
					statusThread: threadContext.statusThread,
					now: options.now
				})
			} satisfies TaskWorkItem;
		})
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function selectStaleTaskWorkItems<T extends TaskWorkItem>(tasks: T[], limit = 6): T[] {
	return [...tasks]
		.filter((task) => task.freshness.isStale)
		.sort((left, right) => {
			if (left.freshness.staleSignals.length !== right.freshness.staleSignals.length) {
				return right.freshness.staleSignals.length - left.freshness.staleSignals.length;
			}

			return getStalenessRank(right) - getStalenessRank(left);
		})
		.slice(0, limit);
}
