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
	executionSurface: ExecutionSurfaceRecord
) {
	return {
		...current,
		[executionSurface.id]: {
			...(current[executionSurface.id] ?? {}),
			...executionSurface
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
		seedExecutionSurface(executionSurface: ExecutionSurfaceRecord) {
			update((state) => ({
				byId: mergeExecutionSurfaceRecord(state.byId, executionSurface)
			}));
		},
		seedExecutionSurfaces(executionSurfaces: ExecutionSurfaceRecord[]) {
			update((state) => {
				let nextById = state.byId;

				for (const executionSurface of executionSurfaces) {
					nextById = mergeExecutionSurfaceRecord(nextById, executionSurface);
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
	executionSurface: T,
	executionSurfacesById: ExecutionSurfaceRecordStoreState['byId']
): T {
	const storedExecutionSurface = executionSurfacesById[executionSurface.id];

	if (!storedExecutionSurface) {
		return executionSurface;
	}

	return {
		...executionSurface,
		...storedExecutionSurface
	} as T;
}
