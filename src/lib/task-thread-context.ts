import type { AgentSessionDetail } from '$lib/types/agent-session';

const ACTIVE_TASK_THREAD_STATES = new Set<AgentSessionDetail['sessionState']>([
	'starting',
	'waiting',
	'working'
]);

type TaskThreadSelectionInput = {
	assignedThread: AgentSessionDetail | null;
	latestRunThread: AgentSessionDetail | null;
};

export type TaskThreadSelection = TaskThreadSelectionInput & {
	statusThread: AgentSessionDetail | null;
	linkThread: AgentSessionDetail | null;
	linkThreadKind: 'assigned' | 'latest' | null;
};

export function isActiveTaskThread(thread: AgentSessionDetail | null | undefined) {
	return Boolean(thread && ACTIVE_TASK_THREAD_STATES.has(thread.sessionState));
}

export function selectTaskThreadContext(input: TaskThreadSelectionInput): TaskThreadSelection {
	const activeThread = [input.assignedThread, input.latestRunThread].find((thread) =>
		isActiveTaskThread(thread)
	);
	const statusThread = activeThread ?? input.assignedThread ?? input.latestRunThread ?? null;
	const linkThread = statusThread;

	return {
		assignedThread: input.assignedThread,
		latestRunThread: input.latestRunThread,
		statusThread,
		linkThread,
		linkThreadKind: linkThread
			? linkThread.id === input.assignedThread?.id
				? 'assigned'
				: 'latest'
			: null
	};
}
