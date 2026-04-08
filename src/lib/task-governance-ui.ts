import { formatReviewStatusLabel, formatTaskApprovalModeLabel } from '$lib/types/control-plane';

export function getTaskApprovalPolicyLabel(approvalMode: string) {
	return `Approval ${formatTaskApprovalModeLabel(approvalMode as never)}`;
}

export function getTaskReviewRequirementLabel(requiresReview: boolean) {
	return requiresReview ? 'Review required' : 'Review optional';
}

export function getTaskReviewBadgeLabel(status: string) {
	return `Review ${formatReviewStatusLabel(status as never)}`;
}

export function getTaskPendingApprovalBadgeLabel(mode: string) {
	return `Approval ${formatTaskApprovalModeLabel(mode as never)}`;
}

export function getTaskReviewSummary(summary: string | null | undefined) {
	return summary?.trim() || 'Waiting on reviewer decision.';
}

export function getTaskApprovalSummary(mode: string, summary: string | null | undefined) {
	return summary?.trim() || `Waiting on ${formatTaskApprovalModeLabel(mode as never)} approval.`;
}
