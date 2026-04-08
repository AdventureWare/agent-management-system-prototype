import type { AgentThreadDetail } from '$lib/types/agent-thread';

const ACTIVE_TASK_THREAD_STATES = new Set<NonNullable<AgentThreadDetail['threadState']>>([
	'starting',
	'waiting',
	'working'
]);

type TaskThreadSelectionInput = {
	assignedThread: AgentThreadDetail | null;
	latestRunThread: AgentThreadDetail | null;
};

export type TaskThreadSelection = TaskThreadSelectionInput & {
	statusThread: AgentThreadDetail | null;
	linkThread: AgentThreadDetail | null;
	linkThreadKind: 'assigned' | 'latest' | null;
};

type TaskThreadActionInput = Pick<
	TaskThreadSelection,
	'statusThread' | 'linkThread' | 'linkThreadKind'
>;

export function isActiveTaskThread(thread: AgentThreadDetail | null | undefined) {
	return Boolean(
		thread && ACTIVE_TASK_THREAD_STATES.has(thread.threadState ?? thread.threadState ?? 'idle')
	);
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

export function getTaskThreadActionLabel(input: TaskThreadActionInput) {
	if (!input.linkThread) {
		return '';
	}

	if (input.statusThread?.id === input.linkThread.id && isActiveTaskThread(input.statusThread)) {
		return 'Review active thread';
	}

	return input.linkThreadKind === 'latest' ? 'Review latest thread' : 'Review assigned thread';
}

export function getTaskThreadReviewHref(threadId: string): `/app/threads/${string}#reply` {
	return `/app/threads/${threadId}#reply`;
}
