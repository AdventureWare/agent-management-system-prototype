import { buildTaskThreadSuggestions } from '$lib/server/task-thread-suggestions';
import {
	isTaskThreadCompatibleWithProject,
	selectProjectTaskThreadContext
} from '$lib/server/task-thread-compatibility';
import { buildTaskFreshness } from '$lib/server/task-work-items';
import type { AgentThreadDetail } from '$lib/types/agent-thread';
import type { Project, Run, Task } from '$lib/types/control-plane';
import type { RelatedRunView } from './task-detail-load-data';

const ACTIVE_TASK_RUN_STATUSES = new Set<Run['status']>(['queued', 'starting', 'running']);

export function buildStalledRecoveryState(input: {
	task: Task;
	activeRun: Run | null;
	statusThread: AgentThreadDetail | null;
}) {
	if (!input.activeRun) {
		return null;
	}

	const freshness = buildTaskFreshness({
		task: input.task,
		latestRun: input.activeRun,
		statusThread: input.statusThread
	});
	const staleDetails: string[] = [];

	if (freshness.noRecentRunActivity) {
		staleDetails.push(`No run heartbeat for ${freshness.runActivityAgeLabel}.`);
	}

	if (freshness.activeThreadNoRecentOutput) {
		staleDetails.push(`No thread output for ${freshness.threadActivityAgeLabel}.`);
	}

	if (staleDetails.length === 0) {
		return null;
	}

	return {
		eligible: true,
		headline: 'This task appears stalled.',
		detail: `${staleDetails.join(' ')} Recovering will retire the current run and queue fresh work.`
	};
}

export function buildTaskDetailRuntimeContext(input: {
	task: Task;
	project: Project | null;
	sessions: AgentThreadDetail[];
	relatedRuns: RelatedRunView[];
}) {
	const { task, project, sessions, relatedRuns } = input;
	const sessionMap = new Map(sessions.map((session) => [session.id, session]));
	const assignedThread = task.agentThreadId
		? (sessions.find((session) => session.id === task.agentThreadId) ?? null)
		: null;
	const latestRun = task.latestRunId
		? (relatedRuns.find((run) => run.id === task.latestRunId) ?? null)
		: null;
	const activeRun = relatedRuns.find((run) => ACTIVE_TASK_RUN_STATUSES.has(run.status)) ?? null;
	const latestRunThread = latestRun?.agentThreadId
		? (sessionMap.get(latestRun.agentThreadId) ?? null)
		: null;
	const threadContext = selectProjectTaskThreadContext(project, {
		assignedThread,
		latestRunThread
	});
	const threadScopedSessions = sessions.filter((session) => {
		if (!project) {
			return false;
		}

		return isTaskThreadCompatibleWithProject(project, session);
	});
	const { candidateThreads, suggestedThread } = buildTaskThreadSuggestions({
		task,
		assignedThreadId: assignedThread?.id ?? null,
		threads: threadScopedSessions
	});
	const stalledRecovery = buildStalledRecoveryState({
		task,
		activeRun,
		statusThread: threadContext.statusThread
	});

	return {
		latestRun,
		activeRun,
		threadContext,
		candidateThreads,
		suggestedThread,
		stalledRecovery
	};
}
