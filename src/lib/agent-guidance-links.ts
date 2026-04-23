import type { AgentGuidanceHint } from '$lib/server/agent-current-context';

export type TaskGuidancePanel = 'resources' | 'execution' | 'governance';

export type AgentGuidanceLinkAction = {
	label: string;
	href: string;
};

const GOVERNANCE_COMMANDS = new Set([
	'request-review',
	'approve-review',
	'request-review-changes',
	'request-approval',
	'approve-approval',
	'reject-approval',
	'decompose',
	'accept-child-handoff',
	'request-child-handoff-changes',
	'prepare_task_for_review',
	'prepare_task_for_approval',
	'reject_task_approval',
	'accept_child_handoff',
	'request_child_handoff_changes'
]);

const EXECUTION_COMMANDS = new Set([
	'launch-session',
	'recover-session',
	'coordinate_with_another_thread',
	'contact',
	'best-target',
	'resolve',
	'panel'
]);

const RESOURCE_COMMANDS = new Set(['attach', 'remove-attachment', 'attachment-read']);

function formatPanelActionLabel(panel: TaskGuidancePanel, shouldValidateFirst: boolean) {
	const prefix = shouldValidateFirst ? 'Preview' : 'Open';

	switch (panel) {
		case 'governance':
			return `${prefix} governance`;
		case 'execution':
			return `${prefix} execution`;
		case 'resources':
			return `${prefix} resources`;
	}
}

export function resolveTaskGuidancePanel(
	hint: AgentGuidanceHint | null | undefined
): TaskGuidancePanel | null {
	if (!hint) {
		return null;
	}

	if (RESOURCE_COMMANDS.has(hint.command)) {
		return 'resources';
	}

	if (GOVERNANCE_COMMANDS.has(hint.command)) {
		return 'governance';
	}

	if (hint.resource === 'thread' || EXECUTION_COMMANDS.has(hint.command)) {
		return 'execution';
	}

	return null;
}

export function buildTaskGuidanceHref(taskId: string, hint: AgentGuidanceHint | null | undefined) {
	const panel = resolveTaskGuidancePanel(hint);
	const params = new URLSearchParams();

	if (panel) {
		params.set('panel', panel);
	}

	const query = params.toString();

	return `/app/tasks/${taskId}${query ? `?${query}` : ''}#agent-current-context`;
}

export function buildRunGuidanceHref(runId: string) {
	return `/app/runs/${runId}#agent-current-context`;
}

export function buildTaskGuidanceAction(
	taskId: string,
	hint: AgentGuidanceHint | null | undefined
): AgentGuidanceLinkAction | null {
	if (!hint) {
		return null;
	}

	const panel = resolveTaskGuidancePanel(hint);

	return {
		label: panel ? formatPanelActionLabel(panel, hint.shouldValidateFirst) : 'Open guidance',
		href: buildTaskGuidanceHref(taskId, hint)
	};
}
