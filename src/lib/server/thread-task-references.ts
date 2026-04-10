const TASK_THREAD_NAME_PREFIX = 'Task thread · ';
const THREAD_NAME_SEPARATOR = ' · ';

export type ThreadTaskReference = {
	taskId: string;
	taskTitle: string;
	projectName: string | null;
};

export function extractThreadTaskReference(threadName: string): ThreadTaskReference | null {
	const normalizedName = threadName.replace(/\s+/g, ' ').trim();

	if (!normalizedName.startsWith(TASK_THREAD_NAME_PREFIX)) {
		return null;
	}

	const lastSeparatorIndex = normalizedName.lastIndexOf(THREAD_NAME_SEPARATOR);

	if (lastSeparatorIndex <= TASK_THREAD_NAME_PREFIX.length) {
		return null;
	}

	const taskId = normalizedName.slice(lastSeparatorIndex + THREAD_NAME_SEPARATOR.length).trim();

	if (!/^task_[a-z0-9-]+$/i.test(taskId)) {
		return null;
	}

	const taskAndProjectSegment = normalizedName
		.slice(TASK_THREAD_NAME_PREFIX.length, lastSeparatorIndex)
		.trim();
	const projectSeparatorIndex = taskAndProjectSegment.lastIndexOf(THREAD_NAME_SEPARATOR);

	if (projectSeparatorIndex < 0) {
		return {
			taskId,
			taskTitle: taskAndProjectSegment,
			projectName: null
		};
	}

	return {
		taskId,
		taskTitle: taskAndProjectSegment.slice(0, projectSeparatorIndex).trim(),
		projectName: taskAndProjectSegment.slice(projectSeparatorIndex + THREAD_NAME_SEPARATOR.length).trim()
	};
}
