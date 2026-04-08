import { describe, expect, it } from 'vitest';
import {
	getTaskApprovalPolicyLabel,
	getTaskApprovalSummary,
	getTaskPendingApprovalBadgeLabel,
	getTaskReviewBadgeLabel,
	getTaskReviewRequirementLabel,
	getTaskReviewSummary
} from './task-governance-ui';

describe('task-governance-ui helpers', () => {
	it('builds shared governance badge labels', () => {
		expect(getTaskApprovalPolicyLabel('before_complete')).toBe('Approval Before Complete');
		expect(getTaskReviewRequirementLabel(true)).toBe('Review required');
		expect(getTaskReviewRequirementLabel(false)).toBe('Review optional');
		expect(getTaskReviewBadgeLabel('open')).toBe('Review Open');
		expect(getTaskPendingApprovalBadgeLabel('before_run')).toBe('Approval Before Run');
	});

	it('builds shared fallback summaries', () => {
		expect(getTaskReviewSummary('')).toBe('Waiting on reviewer decision.');
		expect(getTaskReviewSummary('Needs a final pass.')).toBe('Needs a final pass.');
		expect(getTaskApprovalSummary('before_complete', '')).toBe(
			'Waiting on Before Complete approval.'
		);
		expect(getTaskApprovalSummary('before_run', 'Need approval now.')).toBe('Need approval now.');
	});
});
