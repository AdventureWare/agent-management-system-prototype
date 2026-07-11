import { describe, expect, it } from 'vitest';

import {
	GOAL_LOOP_AUTONOMOUS_QUEUE_ROW_KEYS,
	GOAL_LOOP_OPERATOR_INTERVENTION_ROW_KEYS,
	buildGoalLoopCountRows,
	buildGoalLoopCountsFromClassificationBuckets
} from './goal-loop-readback';

describe('goal-loop readback helpers', () => {
	it('builds canonical classification counts from goal-loop buckets', () => {
		const counts = buildGoalLoopCountsFromClassificationBuckets({
			actionable_now: [{ id: 'task_1' }],
			awaiting_review: [{ id: 'task_2' }, { id: 'task_3' }],
			blocked: [],
			accepted_done: [{ id: 'task_4' }]
		});

		expect(counts.actionableNow).toBe(1);
		expect(counts.awaitingReview).toBe(2);
		expect(counts.blocked).toBe(0);
		expect(counts.acceptedDone).toBe(1);
		expect(counts.needsPlanning).toBe(0);
	});

	it('returns display rows in the canonical operator readback order', () => {
		const rows = buildGoalLoopCountRows({
			actionableNow: 2,
			inProgress: 1,
			approvalRequired: 1,
			acceptedDone: 3
		});

		expect(rows.map((row) => row.label)).toEqual([
			'Actionable now',
			'In progress',
			'Awaiting review',
			'Approval required',
			'Blocked',
			'Needs planning',
			'Needs research',
			'Needs clarification',
			'Needs revision',
			'Unsafe/out of scope',
			'Duplicate/superseded',
			'Accepted/done'
		]);
		expect(rows.find((row) => row.key === 'actionableNow')?.count).toBe(2);
		expect(rows.find((row) => row.key === 'acceptedDone')?.count).toBe(3);
		expect(rows.find((row) => row.key === 'blocked')?.count).toBe(0);
	});

	it('can return a focused subset while preserving canonical order', () => {
		const rows = buildGoalLoopCountRows(
			{
				actionableNow: 2,
				blocked: 1,
				needsPlanning: 3,
				unsafeOutOfScope: 4
			},
			['unsafeOutOfScope', 'actionableNow', 'needsPlanning']
		);

		expect(rows.map((row) => row.key)).toEqual([
			'actionableNow',
			'needsPlanning',
			'unsafeOutOfScope'
		]);
		expect(rows.map((row) => row.count)).toEqual([2, 3, 4]);
	});

	it('defines canonical focused row sets for operator and autonomous queue readback', () => {
		expect(GOAL_LOOP_OPERATOR_INTERVENTION_ROW_KEYS).toEqual([
			'awaitingReview',
			'approvalRequired',
			'blocked'
		]);
		expect(GOAL_LOOP_AUTONOMOUS_QUEUE_ROW_KEYS).toEqual([
			'actionableNow',
			'blocked',
			'needsPlanning',
			'unsafeOutOfScope'
		]);

		expect(
			buildGoalLoopCountRows(
				{
					actionableNow: 1,
					awaitingReview: 2,
					approvalRequired: 3,
					blocked: 4,
					needsPlanning: 5,
					unsafeOutOfScope: 6
				},
				GOAL_LOOP_OPERATOR_INTERVENTION_ROW_KEYS
			).map((row) => row.key)
		).toEqual(['awaitingReview', 'approvalRequired', 'blocked']);
	});
});
