import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { loadAgentCurrentContext } from '$lib/server/agent-current-context';
import {
	acceptAgentApiTaskChildHandoff,
	attachAgentApiTaskFile,
	rejectAgentApiTaskApproval,
	requestAgentApiTaskApproval,
	requestAgentApiTaskChildHandoffChanges,
	requestAgentApiTaskReview
} from '$lib/server/agent-control-plane-api';

export const AGENT_INTENT_NAMES = [
	'prepare_task_for_review',
	'prepare_task_for_approval',
	'reject_task_approval',
	'accept_child_handoff',
	'request_child_handoff_changes'
] as const;

export type AgentIntentName = (typeof AGENT_INTENT_NAMES)[number];

function readTrimmedString(value: unknown) {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readOptionalString(value: unknown) {
	return typeof value === 'string' ? value : undefined;
}

function readOptionalNullableString(value: unknown) {
	return typeof value === 'string' || value === null ? (value as string | null) : undefined;
}

function readIntentName(value: string): AgentIntentName {
	if (AGENT_INTENT_NAMES.includes(value as AgentIntentName)) {
		return value as AgentIntentName;
	}

	throw new AgentControlPlaneApiError(404, 'Intent not found.', {
		code: 'intent_not_found',
		suggestedNextCommands: ['manifest'],
		details: {
			intent: value,
			supportedIntents: [...AGENT_INTENT_NAMES]
		}
	});
}

function requireId(
	value: unknown,
	fieldName: 'taskId' | 'parentTaskId' | 'childTaskId',
	intent: AgentIntentName
) {
	const normalized = readTrimmedString(value);

	if (normalized) {
		return normalized;
	}

	throw new AgentControlPlaneApiError(400, `${fieldName} is required.`, {
		code: `missing_${fieldName}`,
		suggestedNextCommands: [`intent:${intent}`, 'context:current'],
		details: {
			field: fieldName,
			intent
		}
	});
}

function readTaskAttachmentInput(value: unknown, intent: AgentIntentName) {
	if (value === undefined) {
		return null;
	}

	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new AgentControlPlaneApiError(400, 'attachment must be an object when provided.', {
			code: 'invalid_attachment_payload',
			suggestedNextCommands: [`intent:${intent}`],
			details: { intent }
		});
	}

	const attachment = value as Record<string, unknown>;
	const path = readTrimmedString(attachment.path);

	if (!path) {
		throw new AgentControlPlaneApiError(
			400,
			'attachment.path is required when attachment is provided.',
			{
				code: 'missing_attachment_path',
				suggestedNextCommands: [`intent:${intent}`],
				details: { intent }
			}
		);
	}

	return {
		path,
		name: readOptionalString(attachment.name),
		contentType: readOptionalString(attachment.contentType)
	};
}

type AgentIntentResult = {
	intent: AgentIntentName;
	executedCommands: string[];
	beforeContext: Awaited<ReturnType<typeof loadAgentCurrentContext>>;
	afterContext: Awaited<ReturnType<typeof loadAgentCurrentContext>>;
	attachment?: unknown;
	result?: unknown;
};

async function prepareTaskForReview(input: Record<string, unknown>): Promise<AgentIntentResult> {
	const taskId = requireId(input.taskId, 'taskId', 'prepare_task_for_review');
	const attachmentInput = readTaskAttachmentInput(input.attachment, 'prepare_task_for_review');
	const review =
		input.review && typeof input.review === 'object' && !Array.isArray(input.review)
			? (input.review as Record<string, unknown>)
			: {};
	const executedCommands = ['context:current'];
	const beforeContext = await loadAgentCurrentContext({ taskId });
	let attachment: unknown;

	if (attachmentInput) {
		attachment = await attachAgentApiTaskFile(taskId, attachmentInput);
		executedCommands.push('task:attach');
	}

	const result = await requestAgentApiTaskReview(taskId, {
		summary: readOptionalString(review.summary),
		requestedByExecutionSurfaceId: readOptionalNullableString(review.requestedByExecutionSurfaceId),
		reviewerExecutionSurfaceId: readOptionalNullableString(review.reviewerExecutionSurfaceId)
	});
	executedCommands.push('task:request-review', 'context:current');
	const afterContext = await loadAgentCurrentContext({ taskId });

	return {
		intent: 'prepare_task_for_review',
		executedCommands,
		beforeContext,
		afterContext,
		...(attachment ? { attachment } : {}),
		result
	};
}

async function prepareTaskForApproval(input: Record<string, unknown>): Promise<AgentIntentResult> {
	const taskId = requireId(input.taskId, 'taskId', 'prepare_task_for_approval');
	const attachmentInput = readTaskAttachmentInput(input.attachment, 'prepare_task_for_approval');
	const approval =
		input.approval && typeof input.approval === 'object' && !Array.isArray(input.approval)
			? (input.approval as Record<string, unknown>)
			: {};
	const executedCommands = ['context:current'];
	const beforeContext = await loadAgentCurrentContext({ taskId });
	let attachment: unknown;

	if (attachmentInput) {
		attachment = await attachAgentApiTaskFile(taskId, attachmentInput);
		executedCommands.push('task:attach');
	}

	const result = await requestAgentApiTaskApproval(taskId, {
		mode: readOptionalNullableString(approval.mode),
		summary: readOptionalString(approval.summary),
		requestedByExecutionSurfaceId: readOptionalNullableString(
			approval.requestedByExecutionSurfaceId
		),
		approverExecutionSurfaceId: readOptionalNullableString(approval.approverExecutionSurfaceId)
	});
	executedCommands.push('task:request-approval', 'context:current');
	const afterContext = await loadAgentCurrentContext({ taskId });

	return {
		intent: 'prepare_task_for_approval',
		executedCommands,
		beforeContext,
		afterContext,
		...(attachment ? { attachment } : {}),
		result
	};
}

async function rejectTaskApproval(input: Record<string, unknown>): Promise<AgentIntentResult> {
	const taskId = requireId(input.taskId, 'taskId', 'reject_task_approval');
	const executedCommands = ['context:current'];
	const beforeContext = await loadAgentCurrentContext({ taskId });
	const result = await rejectAgentApiTaskApproval(taskId);
	executedCommands.push('task:reject-approval', 'context:current');
	const afterContext = await loadAgentCurrentContext({ taskId });

	return {
		intent: 'reject_task_approval',
		executedCommands,
		beforeContext,
		afterContext,
		result
	};
}

async function acceptChildHandoff(input: Record<string, unknown>): Promise<AgentIntentResult> {
	const parentTaskId = requireId(input.parentTaskId, 'parentTaskId', 'accept_child_handoff');
	const childTaskId = requireId(input.childTaskId, 'childTaskId', 'accept_child_handoff');
	const executedCommands = ['context:current'];
	const beforeContext = await loadAgentCurrentContext({ taskId: parentTaskId });
	const result = await acceptAgentApiTaskChildHandoff(parentTaskId, { childTaskId });
	executedCommands.push('task:accept-child-handoff', 'context:current');
	const afterContext = await loadAgentCurrentContext({ taskId: parentTaskId });

	return {
		intent: 'accept_child_handoff',
		executedCommands,
		beforeContext,
		afterContext,
		result
	};
}

async function requestChildHandoffChanges(
	input: Record<string, unknown>
): Promise<AgentIntentResult> {
	const parentTaskId = requireId(
		input.parentTaskId,
		'parentTaskId',
		'request_child_handoff_changes'
	);
	const childTaskId = requireId(input.childTaskId, 'childTaskId', 'request_child_handoff_changes');
	const executedCommands = ['context:current'];
	const beforeContext = await loadAgentCurrentContext({ taskId: parentTaskId });
	const result = await requestAgentApiTaskChildHandoffChanges(parentTaskId, {
		childTaskId,
		summary: readOptionalString(input.summary)
	});
	executedCommands.push('task:request-child-handoff-changes', 'context:current');
	const afterContext = await loadAgentCurrentContext({ taskId: parentTaskId });

	return {
		intent: 'request_child_handoff_changes',
		executedCommands,
		beforeContext,
		afterContext,
		result
	};
}

export async function runAgentIntent(intentValue: string, input: Record<string, unknown> = {}) {
	const intent = readIntentName(intentValue);

	switch (intent) {
		case 'prepare_task_for_review':
			return prepareTaskForReview(input);
		case 'prepare_task_for_approval':
			return prepareTaskForApproval(input);
		case 'reject_task_approval':
			return rejectTaskApproval(input);
		case 'accept_child_handoff':
			return acceptChildHandoff(input);
		case 'request_child_handoff_changes':
			return requestChildHandoffChanges(input);
	}
}
