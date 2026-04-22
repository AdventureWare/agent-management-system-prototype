export type TaskCollectionView = 'active' | 'completed';

export type HiddenTaskViewNotice = {
	count: number;
	targetView: TaskCollectionView;
	label: string;
	description: string;
};

export function getHiddenCollapsedRowCount(input: {
	matchingRowCount: number;
	visibleRowCount: number;
}) {
	return Math.max(0, input.matchingRowCount - input.visibleRowCount);
}

export function getHiddenTaskViewNotice(input: {
	selectedTaskView: TaskCollectionView;
	visibleTaskCount: number;
	activeCount: number;
	completedCount: number;
}): HiddenTaskViewNotice | null {
	if (
		input.selectedTaskView === 'active' &&
		input.visibleTaskCount === 0 &&
		input.completedCount > 0
	) {
		return {
			count: input.completedCount,
			targetView: 'completed',
			label: 'Completed',
			description: 'Matching tasks are currently in completed tasks.'
		};
	}

	if (
		input.selectedTaskView === 'completed' &&
		input.visibleTaskCount === 0 &&
		input.activeCount > 0
	) {
		return {
			count: input.activeCount,
			targetView: 'active',
			label: 'Open tasks',
			description: 'Matching tasks are currently in open tasks.'
		};
	}

	return null;
}
