import { writable } from 'svelte/store';

type WorkerRecord = {
	id: string;
} & Record<string, unknown>;

type WorkerRecordStoreState = {
	byId: Record<string, WorkerRecord>;
};

const initialState: WorkerRecordStoreState = {
	byId: {}
};

function mergeWorkerRecord(current: Record<string, WorkerRecord>, worker: WorkerRecord) {
	return {
		...current,
		[worker.id]: {
			...(current[worker.id] ?? {}),
			...worker
		}
	};
}

function createWorkerRecordStore() {
	const { subscribe, update } = writable<WorkerRecordStoreState>(initialState);

	return {
		subscribe,
		reset() {
			update(() => initialState);
		},
		seedWorker(worker: WorkerRecord) {
			update((state) => ({
				byId: mergeWorkerRecord(state.byId, worker)
			}));
		},
		seedWorkers(workers: WorkerRecord[]) {
			update((state) => {
				let nextById = state.byId;

				for (const worker of workers) {
					nextById = mergeWorkerRecord(nextById, worker);
				}

				return {
					byId: nextById
				};
			});
		}
	};
}

export const workerRecordStore = createWorkerRecordStore();

export function mergeStoredWorkerRecord<T extends { id: string }>(
	worker: T,
	workersById: WorkerRecordStoreState['byId']
): T {
	const storedWorker = workersById[worker.id];

	if (!storedWorker) {
		return worker;
	}

	return {
		...worker,
		...storedWorker
	} as T;
}
