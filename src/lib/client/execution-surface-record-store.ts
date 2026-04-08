import { writable } from 'svelte/store';

type ExecutionSurfaceRecord = {
	id: string;
} & Record<string, unknown>;

type ExecutionSurfaceRecordStoreState = {
	byId: Record<string, ExecutionSurfaceRecord>;
};

const initialState: ExecutionSurfaceRecordStoreState = {
	byId: {}
};

function mergeExecutionSurfaceRecord(
	current: Record<string, ExecutionSurfaceRecord>,
	worker: ExecutionSurfaceRecord
) {
	return {
		...current,
		[worker.id]: {
			...(current[worker.id] ?? {}),
			...worker
		}
	};
}

function createExecutionSurfaceRecordStore() {
	const { subscribe, update } = writable<ExecutionSurfaceRecordStoreState>(initialState);

	return {
		subscribe,
		reset() {
			update(() => initialState);
		},
		seedExecutionSurface(worker: ExecutionSurfaceRecord) {
			update((state) => ({
				byId: mergeExecutionSurfaceRecord(state.byId, worker)
			}));
		},
		seedExecutionSurfaces(executionSurfaces: ExecutionSurfaceRecord[]) {
			update((state) => {
				let nextById = state.byId;

				for (const worker of executionSurfaces) {
					nextById = mergeExecutionSurfaceRecord(nextById, worker);
				}

				return {
					byId: nextById
				};
			});
		}
	};
}

export const executionSurfaceRecordStore = createExecutionSurfaceRecordStore();

export function mergeStoredExecutionSurfaceRecord<T extends { id: string }>(
	worker: T,
	workersById: ExecutionSurfaceRecordStoreState['byId']
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
