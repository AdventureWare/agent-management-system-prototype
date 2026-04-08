import { writable } from 'svelte/store';

type TaskRecord = {
	id: string;
} & Record<string, unknown>;

type TaskRecordStoreState = {
	byId: Record<string, TaskRecord>;
};

const initialState: TaskRecordStoreState = {
	byId: {}
};

function mergeTaskRecord(current: Record<string, TaskRecord>, task: TaskRecord) {
	return {
		...current,
		[task.id]: {
			...(current[task.id] ?? {}),
			...task
		}
	};
}

function createTaskRecordStore() {
	const { subscribe, update } = writable<TaskRecordStoreState>(initialState);

	return {
		subscribe,
		reset() {
			update(() => initialState);
		},
		seedTask(task: TaskRecord) {
			update((state) => ({
				byId: mergeTaskRecord(state.byId, task)
			}));
		},
		seedTasks(tasks: TaskRecord[], options: { replace?: boolean } = {}) {
			update((state) => {
				let nextById = options.replace ? {} : state.byId;

				for (const task of tasks) {
					nextById = mergeTaskRecord(nextById, task);
				}

				return {
					byId: nextById
				};
			});
		}
	};
}

export const taskRecordStore = createTaskRecordStore();

export function mergeStoredTaskRecord<T extends { id: string }>(
	task: T,
	tasksById: TaskRecordStoreState['byId']
): T {
	const storedTask = tasksById[task.id];

	if (!storedTask) {
		return task;
	}

	return {
		...task,
		...storedTask
	} as T;
}
