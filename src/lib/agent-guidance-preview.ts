import type { AgentGuidanceHint } from '$lib/server/agent-current-context';

export type AgentGuidancePreviewRequest = {
	label: string;
	title: string;
	description: string;
	path: string;
	body: Record<string, unknown>;
};

export function buildTaskGuidancePreviewRequest(
	taskId: string,
	hint: AgentGuidanceHint | null | undefined,
	options: {
		parentTaskId?: string | null;
	} = {}
): AgentGuidancePreviewRequest | null {
	if (!hint?.shouldValidateFirst) {
		return null;
	}

	switch (hint.command) {
		case 'approve-review':
			return {
				label: 'Run preview',
				title: 'Preview review approval',
				description: 'Validate the current review state before approving the review gate.',
				path: `/api/tasks/${taskId}/review-decision`,
				body: {
					decision: 'approve',
					validateOnly: true
				}
			};
		case 'request-review-changes':
			return {
				label: 'Run preview',
				title: 'Preview review changes request',
				description: 'Validate the review state before returning the task for changes.',
				path: `/api/tasks/${taskId}/review-decision`,
				body: {
					decision: 'changes_requested',
					validateOnly: true
				}
			};
		case 'approve-approval':
			return {
				label: 'Run preview',
				title: 'Preview approval gate approval',
				description: 'Validate the approval gate outcome before approving the task output.',
				path: `/api/tasks/${taskId}/approval-decision`,
				body: {
					decision: 'approve',
					validateOnly: true
				}
			};
		case 'reject-approval':
			return {
				label: 'Run preview',
				title: 'Preview approval gate rejection',
				description: 'Validate the blocked-state outcome before rejecting the approval gate.',
				path: `/api/tasks/${taskId}/approval-decision`,
				body: {
					decision: 'reject',
					validateOnly: true
				}
			};
		case 'accept_child_handoff':
			if (!options.parentTaskId) {
				return null;
			}

			return {
				label: 'Run preview',
				title: 'Preview child handoff acceptance',
				description:
					'Validate the parent-child handoff checks before accepting the delegated work.',
				path: '/api/agent-intents/accept_child_handoff',
				body: {
					parentTaskId: options.parentTaskId,
					childTaskId: taskId,
					validateOnly: true
				}
			};
		case 'request_child_handoff_changes':
			if (!options.parentTaskId) {
				return null;
			}

			return {
				label: 'Run preview',
				title: 'Preview child handoff follow-up request',
				description:
					'Validate the parent-child handoff checks before returning the delegated work for follow-up.',
				path: '/api/agent-intents/request_child_handoff_changes',
				body: {
					parentTaskId: options.parentTaskId,
					childTaskId: taskId,
					validateOnly: true
				}
			};
		default:
			return null;
	}
}
