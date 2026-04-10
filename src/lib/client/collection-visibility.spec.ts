import { describe, expect, it } from 'vitest';
import { getHiddenCollapsedRowCount, getHiddenTaskViewNotice } from './collection-visibility';

describe('collection visibility helpers', () => {
	it('reports rows hidden by collapsed goal branches', () => {
		expect(
			getHiddenCollapsedRowCount({
				matchingRowCount: 5,
				visibleRowCount: 3
			})
		).toBe(2);
		expect(
			getHiddenCollapsedRowCount({
				matchingRowCount: 2,
				visibleRowCount: 4
			})
		).toBe(0);
	});

	it('surfaces when matching tasks are hidden in the completed tab', () => {
		expect(
			getHiddenTaskViewNotice({
				selectedTaskView: 'active',
				visibleTaskCount: 0,
				activeCount: 0,
				completedCount: 3
			})
		).toEqual({
			count: 3,
			targetView: 'completed',
			label: 'Completed work',
			description: 'Matching tasks are currently in the completed queue.'
		});
	});

	it('surfaces when matching tasks are hidden in the active tab', () => {
		expect(
			getHiddenTaskViewNotice({
				selectedTaskView: 'completed',
				visibleTaskCount: 0,
				activeCount: 2,
				completedCount: 0
			})
		).toEqual({
			count: 2,
			targetView: 'active',
			label: 'Active queue',
			description: 'Matching tasks are currently in the active queue.'
		});
	});

	it('returns null when the current tab already shows matching tasks', () => {
		expect(
			getHiddenTaskViewNotice({
				selectedTaskView: 'active',
				visibleTaskCount: 1,
				activeCount: 1,
				completedCount: 4
			})
		).toBeNull();
	});
});
