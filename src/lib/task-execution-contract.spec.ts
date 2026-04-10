import { describe, expect, it } from 'vitest';
import {
	buildTaskExecutionContractStatus,
	getTaskLaunchContractBlockerMessage,
	getTaskReviewContractGapMessage
} from './task-execution-contract';

describe('task-execution-contract', () => {
	it('marks launch as blocked until all execution contract fields are present', () => {
		const contract = buildTaskExecutionContractStatus({
			successCriteria: 'Ship the change with clear acceptance criteria.',
			readyCondition: '',
			expectedOutcome: ''
		});

		expect(contract).toMatchObject({
			canLaunch: false,
			canReviewAgainstContract: false,
			missingLaunchFieldLabels: ['ready condition', 'expected outcome'],
			missingReviewFieldLabels: ['expected outcome']
		});
		expect(getTaskLaunchContractBlockerMessage(contract)).toContain('ready condition and expected outcome');
		expect(getTaskReviewContractGapMessage(contract)).toContain('expected outcome');
	});

	it('clears launch and review blockers once the contract is explicit', () => {
		const contract = buildTaskExecutionContractStatus({
			successCriteria: 'The result passes review.',
			readyCondition: 'Dependencies are complete.',
			expectedOutcome: 'The task ships with the expected artifact.'
		});

		expect(contract.canLaunch).toBe(true);
		expect(contract.canReviewAgainstContract).toBe(true);
		expect(getTaskLaunchContractBlockerMessage(contract)).toBeNull();
		expect(getTaskReviewContractGapMessage(contract)).toBeNull();
	});
});
