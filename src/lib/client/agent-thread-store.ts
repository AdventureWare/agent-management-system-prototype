import { get, writable } from 'svelte/store';
import type { AgentThreadDetail } from '$lib/types/agent-thread';

type AgentThreadStoreState = {
	byId: Record<string, AgentThreadDetail>;
	orderedIds: string[];
};

const initialState: AgentThreadStoreState = {
	byId: {},
	orderedIds: []
};

function mergeThreadRecord(
	current: Record<string, AgentThreadDetail>,
	thread: AgentThreadDetail
): Record<string, AgentThreadDetail> {
	const existing = current[thread.id];
	const nextThread =
		existing && thread.categorization === undefined
			? {
					...thread,
					categorization: existing.categorization,
					topicLabels:
						(thread.topicLabels?.length ?? 0) > 0
							? thread.topicLabels
							: (existing.topicLabels ?? [])
				}
			: thread;

	return {
		...current,
		[thread.id]: nextThread
	};
}

function orderedThreads(state: AgentThreadStoreState) {
	return state.orderedIds
		.map((threadId) => state.byId[threadId])
		.filter((thread): thread is AgentThreadDetail => Boolean(thread));
}

function orderThreadIds(
	currentIds: string[],
	threads: AgentThreadDetail[],
	options: { replace: boolean }
) {
	const nextIds = threads.map((thread) => thread.id);

	if (options.replace) {
		return nextIds;
	}

	const seenIds = new Set(currentIds);
	const appendedIds = nextIds.filter((threadId) => !seenIds.has(threadId));

	return [...currentIds, ...appendedIds];
}

function createAgentThreadStore() {
	const { subscribe, update } = writable<AgentThreadStoreState>(initialState);

	return {
		subscribe,
		reset() {
			update(() => initialState);
		},
		seedThreads(threads: AgentThreadDetail[], options: { replace?: boolean } = {}) {
			update((state) => {
				let nextById = options.replace ? {} : state.byId;

				for (const thread of threads) {
					nextById = mergeThreadRecord(nextById, thread);
				}

				return {
					byId: nextById,
					orderedIds: orderThreadIds(state.orderedIds, threads, {
						replace: options.replace ?? false
					})
				};
			});
		},
		seedThread(thread: AgentThreadDetail) {
			update((state) => ({
				byId: mergeThreadRecord(state.byId, thread),
				orderedIds: state.orderedIds.includes(thread.id)
					? state.orderedIds
					: [thread.id, ...state.orderedIds]
			}));
		},
		patchArchiveState(threadIds: string[], archived: boolean) {
			if (threadIds.length === 0) {
				return;
			}

			const archivedAt = archived ? new Date().toISOString() : null;

			update((state) => {
				let nextById = state.byId;

				for (const threadId of threadIds) {
					const current = nextById[threadId];

					if (!current) {
						continue;
					}

					nextById = mergeThreadRecord(nextById, {
						...current,
						archivedAt
					});
				}

				return {
					...state,
					byId: nextById
				};
			});
		}
	};
}

export const agentThreadStore = createAgentThreadStore();

export function getAgentThreadStoreState() {
	return get(agentThreadStore);
}

export function getStoredAgentThread(threadId: string | null | undefined) {
	if (!threadId) {
		return null;
	}

	return getAgentThreadStoreState().byId[threadId] ?? null;
}

export function getStoredAgentThreads() {
	return orderedThreads(getAgentThreadStoreState());
}

export function summarizeStoredAgentThreads() {
	const threads = getStoredAgentThreads();
	const stateFor = (thread: AgentThreadDetail) =>
		thread.threadState ?? thread.threadState ?? 'idle';

	return {
		totalCount: threads.length,
		activeCount: threads.filter((thread) =>
			['starting', 'waiting', 'working'].includes(stateFor(thread))
		).length,
		readyCount: threads.filter((thread) => stateFor(thread) === 'ready').length,
		unavailableCount: threads.filter((thread) => ['unavailable', 'idle'].includes(stateFor(thread)))
			.length,
		attentionCount: threads.filter((thread) => stateFor(thread) === 'attention').length
	};
}
