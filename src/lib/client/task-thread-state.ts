import type { AgentThreadDetail, AgentThreadTaskLink } from '$lib/types/agent-thread';
import type {
	ThreadCategorization,
	ThreadCategorizationMatch
} from '$lib/types/thread-categorization';

type ThreadMap = Record<string, AgentThreadDetail>;

type TaskThreadFields = {
	assignedThread?: AgentThreadDetail | null;
	latestRunThread?: AgentThreadDetail | null;
	statusThread?: AgentThreadDetail | null;
	linkThread?: AgentThreadDetail | null;
};

type TaskThreadAssignmentCandidateLike = {
	id: string;
	name: string;
	topicLabels: string[];
	categorization?: ThreadCategorization;
	matchedContext: ThreadCategorizationMatch;
	threadState: AgentThreadDetail['threadState'];
	canResume: boolean;
	hasActiveRun: boolean;
	relatedTasks: AgentThreadTaskLink[];
	previewText: string;
	isSuggested: boolean;
	suggestionReason: string | null;
};

function resolveThreadDetail(
	thread: AgentThreadDetail | null | undefined,
	threadsById: ThreadMap
): AgentThreadDetail | null {
	if (!thread) {
		return null;
	}

	return threadsById[thread.id] ?? thread;
}

export function collectTaskLinkedThreads(task: TaskThreadFields) {
	return [task.assignedThread, task.latestRunThread, task.statusThread, task.linkThread].filter(
		(thread): thread is AgentThreadDetail => Boolean(thread)
	);
}

export function mergeTaskThreadState<T extends TaskThreadFields>(
	task: T,
	threadsById: ThreadMap
): T {
	return {
		...task,
		assignedThread: resolveThreadDetail(task.assignedThread, threadsById),
		latestRunThread: resolveThreadDetail(task.latestRunThread, threadsById),
		statusThread: resolveThreadDetail(task.statusThread, threadsById),
		linkThread: resolveThreadDetail(task.linkThread, threadsById)
	};
}

export function mergeTaskThreadCandidateState<T extends TaskThreadAssignmentCandidateLike>(
	candidate: T,
	threadsById: ThreadMap
): T;
export function mergeTaskThreadCandidateState<T extends TaskThreadAssignmentCandidateLike>(
	candidate: T | null | undefined,
	threadsById: ThreadMap
): T | null;
export function mergeTaskThreadCandidateState<T extends TaskThreadAssignmentCandidateLike>(
	candidate: T | null | undefined,
	threadsById: ThreadMap
): T | null {
	if (!candidate) {
		return null;
	}

	const thread = threadsById[candidate.id];

	if (!thread) {
		return candidate;
	}

	return {
		...candidate,
		name: thread.name,
		topicLabels: thread.topicLabels ?? candidate.topicLabels,
		categorization: thread.categorization ?? candidate.categorization,
		threadState: thread.threadState,
		canResume: thread.canResume,
		hasActiveRun: thread.hasActiveRun,
		relatedTasks: thread.relatedTasks,
		previewText: thread.latestRun?.lastMessage ?? thread.threadSummary ?? candidate.previewText
	};
}

export function collectTaskThreadCandidates<T extends TaskThreadAssignmentCandidateLike>(
	candidates: T[],
	suggestedThread: T | null | undefined,
	threadsById: ThreadMap
) {
	const collected = new Map<string, AgentThreadDetail>();

	for (const candidate of [...candidates, suggestedThread].filter((item): item is T =>
		Boolean(item)
	)) {
		const thread = threadsById[candidate.id];

		if (thread) {
			collected.set(thread.id, thread);
		}
	}

	return [...collected.values()];
}
