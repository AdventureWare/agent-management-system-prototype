import { describe, expect, it } from 'vitest';
import type { Goal } from '$lib/types/control-plane';
import { buildTaskGoalOptions } from './task-goal-options';

function createGoal(overrides: Partial<Goal>): Goal {
	return {
		id: 'goal',
		name: 'Goal',
		summary: '',
		status: 'ready',
		artifactPath: '/tmp/goal',
		parentGoalId: null,
		projectIds: [],
		taskIds: [],
		area: 'product',
		targetDate: null,
		...overrides
	};
}

describe('task-goal-options', () => {
	it('orders nested goals by parent relationship and name', () => {
		const result = buildTaskGoalOptions([
			createGoal({ id: 'goal_child_b', name: 'Beta child', parentGoalId: 'goal_root' }),
			createGoal({ id: 'goal_root', name: 'Root goal' }),
			createGoal({ id: 'goal_child_a', name: 'Alpha child', parentGoalId: 'goal_root' })
		]);

		expect(result.map((goal) => goal.label)).toEqual([
			'Root goal',
			'  - Alpha child',
			'  - Beta child'
		]);
	});

	it('falls back to top-level ordering when the parent reference is missing', () => {
		const result = buildTaskGoalOptions([
			createGoal({ id: 'goal_orphan', name: 'Orphan goal', parentGoalId: 'goal_missing' }),
			createGoal({ id: 'goal_root', name: 'Root goal' })
		]);

		expect(result.map((goal) => goal.label)).toEqual(['Orphan goal', 'Root goal']);
		expect(result[0]?.depth).toBe(0);
	});
});
