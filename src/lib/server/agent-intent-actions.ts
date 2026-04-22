import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { loadAgentCurrentContext } from '$lib/server/agent-current-context';
import {
	acceptAgentApiTaskChildHandoff,
	attachAgentApiTaskFile,
	previewAgentApiTaskReviewRequest,
	previewAgentApiTaskApprovalRequest,
	rejectAgentApiTaskApproval,
	requestAgentApiTaskApproval,
	requestAgentApiTaskChildHandoffChanges,
	requestAgentApiTaskReview
} from '$lib/server/agent-control-plane-api';
import { getPendingApprovalForTask, loadControlPlane } from '$lib/server/control-plane';
import {
	contactAgentThread,
	getAgentThread,
	listAgentThreadContacts,
	listAgentThreads,
	rankAgentThreadsForRouting
} from '$lib/server/agent-threads';

export const AGENT_INTENT_NAMES = [
	'prepare_task_for_review',
	'prepare_task_for_approval',
	'reject_task_approval',
	'accept_child_handoff',
	'request_child_handoff_changes',
	'coordinate_with_another_thread'
] as const;

export type AgentIntentName = (typeof AGENT_INTENT_NAMES)[number];

const VALIDATION_SUPPORTED_INTENTS = new Set<AgentIntentName>([
	'prepare_task_for_review',
	'prepare_task_for_approval',
	'reject_task_approval',
	'accept_child_handoff',
	'request_child_handoff_changes',
	'coordinate_with_another_thread'
]);

function readTrimmedString(value: unknown) {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readOptionalString(value: unknown) {
	return typeof value === 'string' ? value : undefined;
}

function readOptionalNullableString(value: unknown) {
	return typeof value === 'string' || value === null ? (value as string | null) : undefined;
}

function readOptionalBoolean(value: unknown) {
	return typeof value === 'boolean' ? value : undefined;
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
	fieldName: 'taskId' | 'parentTaskId' | 'childTaskId' | 'sourceThreadId' | 'prompt',
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

async function resolveCoordinationTarget(args: {
	sourceThreadId: string;
	targetThreadIdOrHandle: string | null;
	q?: string | null;
	role?: string | null;
	project?: string | null;
	taskId?: string | null;
	includeArchived?: boolean;
}) {
	const includeArchived = args.includeArchived === true;
	const threads = await listAgentThreads({ includeArchived });

	if (args.targetThreadIdOrHandle) {
		const normalizedIdentifier = args.targetThreadIdOrHandle.trim();
		const exactThread =
			threads.find(
				(thread) => thread.id === normalizedIdentifier || thread.handle === normalizedIdentifier
			) ?? null;

		if (exactThread) {
			return exactThread;
		}

		if (normalizedIdentifier.startsWith('thread_')) {
			return (
				threads.find((thread) => thread.id === normalizedIdentifier) ?? {
					id: normalizedIdentifier,
					name: normalizedIdentifier,
					handle: normalizedIdentifier
				}
			);
		}

		const rankedMatches = rankAgentThreadsForRouting(threads, {
			q: normalizedIdentifier,
			sourceThreadId: args.sourceThreadId,
			canContact: true,
			limit: 25
		});
		const exactMatch =
			rankedMatches.find(
				(thread) => thread.id === normalizedIdentifier || thread.handle === normalizedIdentifier
			) ?? null;

		if (exactMatch) {
			return exactMatch;
		}

		if (rankedMatches.length === 1) {
			return rankedMatches[0];
		}

		if (rankedMatches.length > 1) {
			const suggestions = rankedMatches
				.slice(0, 5)
				.map((thread) => `${thread.handle ?? thread.id} (${thread.name})`)
				.join(', ');

			throw new AgentControlPlaneApiError(409, 'Target thread handle is ambiguous.', {
				code: 'ambiguous_target_thread',
				suggestedNextCommands: ['thread:resolve', 'thread:list'],
				details: {
					targetThreadIdOrHandle: normalizedIdentifier,
					suggestions
				}
			});
		}

		throw new AgentControlPlaneApiError(404, 'Target thread could not be resolved.', {
			code: 'target_thread_not_found',
			suggestedNextCommands: ['thread:resolve', 'thread:list', 'thread:best-target'],
			details: {
				targetThreadIdOrHandle: normalizedIdentifier
			}
		});
	}

	const bestTarget =
		rankAgentThreadsForRouting(threads, {
			q: args.q,
			role: args.role,
			project: args.project,
			taskId: args.taskId,
			sourceThreadId: args.sourceThreadId,
			canContact: true,
			limit: 1
		})[0] ?? null;

	if (!bestTarget) {
		throw new AgentControlPlaneApiError(
			404,
			'No contactable thread matched the coordination intent.',
			{
				code: 'no_thread_target_found',
				suggestedNextCommands: ['thread:best-target', 'thread:list', 'thread:resolve'],
				details: {
					sourceThreadId: args.sourceThreadId,
					q: args.q ?? null,
					role: args.role ?? null,
					project: args.project ?? null,
					taskId: args.taskId ?? null
				}
			}
		);
	}

	return bestTarget;
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

type AgentIntentValidationResult = {
	intent: AgentIntentName;
	validationOnly: true;
	valid: true;
	wouldExecuteCommands: string[];
	beforeContext: Awaited<ReturnType<typeof loadAgentCurrentContext>>;
	preview: unknown;
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

async function previewPrepareTaskForReview(
	input: Record<string, unknown>
): Promise<AgentIntentValidationResult> {
	const taskId = requireId(input.taskId, 'taskId', 'prepare_task_for_review');
	const beforeContext = await loadAgentCurrentContext({ taskId });
	const review =
		input.review && typeof input.review === 'object' && !Array.isArray(input.review)
			? (input.review as Record<string, unknown>)
			: {};
	const preview = await previewAgentApiTaskReviewRequest(taskId, {
		summary: readOptionalString(review.summary),
		requestedByExecutionSurfaceId: readOptionalNullableString(review.requestedByExecutionSurfaceId),
		reviewerExecutionSurfaceId: readOptionalNullableString(review.reviewerExecutionSurfaceId)
	});

	return {
		intent: 'prepare_task_for_review',
		validationOnly: true,
		valid: true,
		wouldExecuteCommands: ['context:current', 'task:request-review', 'context:current'],
		beforeContext,
		preview: {
			...preview,
			attachment:
				input.attachment && typeof input.attachment === 'object' && !Array.isArray(input.attachment)
					? {
							path: readTrimmedString((input.attachment as Record<string, unknown>).path),
							note: 'Attachment path shape was accepted but file existence was not checked in validation mode.'
						}
					: null
		}
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

async function previewPrepareTaskForApproval(
	input: Record<string, unknown>
): Promise<AgentIntentValidationResult> {
	const taskId = requireId(input.taskId, 'taskId', 'prepare_task_for_approval');
	const beforeContext = await loadAgentCurrentContext({ taskId });
	const approval =
		input.approval && typeof input.approval === 'object' && !Array.isArray(input.approval)
			? (input.approval as Record<string, unknown>)
			: {};
	const preview = await previewAgentApiTaskApprovalRequest(taskId, {
		mode: readOptionalNullableString(approval.mode),
		summary: readOptionalString(approval.summary),
		requestedByExecutionSurfaceId: readOptionalNullableString(
			approval.requestedByExecutionSurfaceId
		),
		approverExecutionSurfaceId: readOptionalNullableString(approval.approverExecutionSurfaceId)
	});

	return {
		intent: 'prepare_task_for_approval',
		validationOnly: true,
		valid: true,
		wouldExecuteCommands: ['context:current', 'task:request-approval', 'context:current'],
		beforeContext,
		preview: {
			...preview,
			attachment:
				input.attachment && typeof input.attachment === 'object' && !Array.isArray(input.attachment)
					? {
							path: readTrimmedString((input.attachment as Record<string, unknown>).path),
							note: 'Attachment path shape was accepted but file existence was not checked in validation mode.'
						}
					: null
		}
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

async function previewRejectTaskApproval(
	input: Record<string, unknown>
): Promise<AgentIntentValidationResult> {
	const taskId = requireId(input.taskId, 'taskId', 'reject_task_approval');
	const beforeContext = await loadAgentCurrentContext({ taskId });
	const current = await loadControlPlane();
	const task = current.tasks.find((candidate) => candidate.id === taskId) ?? null;

	if (!task) {
		throw new AgentControlPlaneApiError(404, 'Task not found.', {
			code: 'task_not_found',
			suggestedNextCommands: ['task:list', 'context:current'],
			details: { taskId }
		});
	}

	const pendingApproval = getPendingApprovalForTask(current, taskId);

	if (!pendingApproval) {
		throw new AgentControlPlaneApiError(409, 'No pending approval exists for this task.', {
			code: 'task_approval_not_pending',
			suggestedNextCommands: ['task:get', 'context:current'],
			details: { taskId }
		});
	}

	return {
		intent: 'reject_task_approval',
		validationOnly: true,
		valid: true,
		wouldExecuteCommands: ['context:current', 'task:reject-approval', 'context:current'],
		beforeContext,
		preview: {
			taskId,
			pendingApproval: {
				id: pendingApproval.id,
				summary: pendingApproval.summary,
				mode: pendingApproval.mode,
				status: pendingApproval.status
			},
			checks: [
				`Task ${taskId} exists.`,
				`Pending approval ${pendingApproval.id} can be rejected now.`
			]
		}
	};
}

async function resolvePreviewChildHandoff(
	parentTaskId: string,
	childTaskId: string,
	intent: 'accept_child_handoff' | 'request_child_handoff_changes'
) {
	const current = await loadControlPlane();
	const parentTask = current.tasks.find((candidate) => candidate.id === parentTaskId) ?? null;
	const childTask = current.tasks.find((candidate) => candidate.id === childTaskId) ?? null;

	if (!parentTask) {
		throw new AgentControlPlaneApiError(404, 'Parent task not found.', {
			code: 'task_not_found',
			suggestedNextCommands: ['task:list', 'context:current'],
			details: { taskId: parentTaskId }
		});
	}

	if (!childTask || childTask.parentTaskId !== parentTask.id) {
		throw new AgentControlPlaneApiError(404, 'Delegated child task not found.', {
			code: 'child_handoff_invalid_child_task',
			suggestedNextCommands: ['task:get', 'context:current'],
			details: { parentTaskId, childTaskId, intent }
		});
	}

	if (childTask.status !== 'done') {
		throw new AgentControlPlaneApiError(
			409,
			intent === 'accept_child_handoff'
				? 'Only completed child tasks can be accepted into the parent.'
				: 'Only completed child tasks can be returned for follow-up.',
			{
				code: 'child_handoff_task_not_done',
				suggestedNextCommands: ['task:get', 'context:current'],
				details: { parentTaskId, childTaskId, status: childTask.status, intent }
			}
		);
	}

	if (childTask.delegationAcceptance) {
		throw new AgentControlPlaneApiError(
			409,
			intent === 'accept_child_handoff'
				? 'This child handoff has already been accepted.'
				: 'Accepted child handoffs cannot be returned for follow-up.',
			{
				code:
					intent === 'accept_child_handoff'
						? 'child_handoff_already_accepted'
						: 'child_handoff_already_accepted',
				suggestedNextCommands: ['task:get', 'context:current'],
				details: { parentTaskId, childTaskId, intent }
			}
		);
	}

	return { parentTask, childTask };
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

async function previewAcceptChildHandoff(
	input: Record<string, unknown>
): Promise<AgentIntentValidationResult> {
	const parentTaskId = requireId(input.parentTaskId, 'parentTaskId', 'accept_child_handoff');
	const childTaskId = requireId(input.childTaskId, 'childTaskId', 'accept_child_handoff');
	const beforeContext = await loadAgentCurrentContext({ taskId: parentTaskId });
	const { parentTask, childTask } = await resolvePreviewChildHandoff(
		parentTaskId,
		childTaskId,
		'accept_child_handoff'
	);

	return {
		intent: 'accept_child_handoff',
		validationOnly: true,
		valid: true,
		wouldExecuteCommands: ['context:current', 'task:accept-child-handoff', 'context:current'],
		beforeContext,
		preview: {
			parentTask: { id: parentTask.id, title: parentTask.title },
			childTask: { id: childTask.id, title: childTask.title, status: childTask.status },
			summary: readOptionalString(input.summary) ?? null,
			checks: [
				`Parent task ${parentTask.id} exists.`,
				`Child task ${childTask.id} belongs to parent task ${parentTask.id}.`,
				`Child task ${childTask.id} is complete and ready to accept.`
			]
		}
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

async function previewRequestChildHandoffChanges(
	input: Record<string, unknown>
): Promise<AgentIntentValidationResult> {
	const parentTaskId = requireId(
		input.parentTaskId,
		'parentTaskId',
		'request_child_handoff_changes'
	);
	const childTaskId = requireId(input.childTaskId, 'childTaskId', 'request_child_handoff_changes');
	const beforeContext = await loadAgentCurrentContext({ taskId: parentTaskId });
	const { parentTask, childTask } = await resolvePreviewChildHandoff(
		parentTaskId,
		childTaskId,
		'request_child_handoff_changes'
	);

	return {
		intent: 'request_child_handoff_changes',
		validationOnly: true,
		valid: true,
		wouldExecuteCommands: [
			'context:current',
			'task:request-child-handoff-changes',
			'context:current'
		],
		beforeContext,
		preview: {
			parentTask: { id: parentTask.id, title: parentTask.title },
			childTask: { id: childTask.id, title: childTask.title, status: childTask.status },
			summary:
				readOptionalString(input.summary) ??
				'Parent task requested follow-up before accepting this child handoff.',
			checks: [
				`Parent task ${parentTask.id} exists.`,
				`Child task ${childTask.id} belongs to parent task ${parentTask.id}.`,
				`Child task ${childTask.id} is complete and can be returned for follow-up.`
			]
		}
	};
}

async function coordinateWithAnotherThread(
	input: Record<string, unknown>
): Promise<AgentIntentResult> {
	const sourceThreadId = requireId(
		input.sourceThreadId ?? process.env.AMS_AGENT_THREAD_ID,
		'sourceThreadId',
		'coordinate_with_another_thread'
	);
	const prompt = requireId(input.prompt, 'prompt', 'coordinate_with_another_thread');
	const target = await resolveCoordinationTarget({
		sourceThreadId,
		targetThreadIdOrHandle: readTrimmedString(input.targetThreadIdOrHandle),
		q: readOptionalString(input.q),
		role: readOptionalString(input.role),
		project: readOptionalString(input.project),
		taskId: readOptionalString(input.taskId),
		includeArchived: readOptionalBoolean(input.includeArchived)
	});
	const executedCommands = ['context:current'];
	const beforeContext = await loadAgentCurrentContext({
		threadId: sourceThreadId,
		taskId: readOptionalString(input.taskId)
	});
	const result = await contactAgentThread(sourceThreadId, {
		targetAgentThreadId: target.id,
		prompt,
		contactType: readOptionalString(input.type) ?? 'question',
		contextSummary: readOptionalNullableString(input.context),
		replyRequested: readOptionalBoolean(input.replyRequested),
		replyToContactId: readOptionalNullableString(input.replyToContactId)
	});
	executedCommands.push('thread:contact');
	const contacts = await listAgentThreadContacts({
		threadId: sourceThreadId,
		limit: 10
	});
	executedCommands.push('thread:contacts', 'context:current');
	const afterContext = await loadAgentCurrentContext({
		threadId: sourceThreadId,
		taskId: readOptionalString(input.taskId)
	});

	return {
		intent: 'coordinate_with_another_thread',
		executedCommands,
		beforeContext,
		afterContext,
		result: {
			target: {
				id: target.id,
				name: target.name,
				handle: target.handle ?? null,
				routingReason: 'routingReason' in target ? (target.routingReason ?? null) : null
			},
			contact: result,
			contacts
		}
	};
}

async function previewCoordinateWithAnotherThread(
	input: Record<string, unknown>
): Promise<AgentIntentValidationResult> {
	const sourceThreadId = requireId(
		input.sourceThreadId ?? process.env.AMS_AGENT_THREAD_ID,
		'sourceThreadId',
		'coordinate_with_another_thread'
	);
	const prompt = requireId(input.prompt, 'prompt', 'coordinate_with_another_thread');
	const target = await resolveCoordinationTarget({
		sourceThreadId,
		targetThreadIdOrHandle: readTrimmedString(input.targetThreadIdOrHandle),
		q: readOptionalString(input.q),
		role: readOptionalString(input.role),
		project: readOptionalString(input.project),
		taskId: readOptionalString(input.taskId),
		includeArchived: readOptionalBoolean(input.includeArchived)
	});
	const beforeContext = await loadAgentCurrentContext({
		threadId: sourceThreadId,
		taskId: readOptionalString(input.taskId)
	});
	const [sourceThread, targetThread] = await Promise.all([
		getAgentThread(sourceThreadId),
		getAgentThread(target.id)
	]);

	if (!sourceThread) {
		throw new AgentControlPlaneApiError(404, 'Source thread not found.', {
			code: 'source_thread_not_found',
			suggestedNextCommands: ['context:current', 'thread:list'],
			details: { sourceThreadId }
		});
	}

	if (!targetThread) {
		throw new AgentControlPlaneApiError(404, 'Target thread not found.', {
			code: 'target_thread_not_found',
			suggestedNextCommands: ['thread:list', 'thread:resolve'],
			details: { targetThreadId: target.id }
		});
	}

	if (targetThread.archivedAt) {
		throw new AgentControlPlaneApiError(
			409,
			'Archived threads cannot receive cross-thread contact requests.',
			{
				code: 'target_thread_archived',
				suggestedNextCommands: ['thread:list', 'thread:best-target'],
				details: { targetThreadId: target.id }
			}
		);
	}

	if (targetThread.hasActiveRun) {
		throw new AgentControlPlaneApiError(
			409,
			`Target thread "${targetThread.name}" already has an active run.`,
			{
				code: 'target_thread_busy',
				suggestedNextCommands: ['thread:best-target', 'thread:list'],
				details: { targetThreadId: target.id }
			}
		);
	}

	if (!targetThread.canResume) {
		throw new AgentControlPlaneApiError(
			409,
			`Target thread "${targetThread.name}" cannot accept a follow-up right now.`,
			{
				code: 'target_thread_unavailable',
				suggestedNextCommands: ['thread:best-target', 'thread:list'],
				details: { targetThreadId: target.id }
			}
		);
	}

	const routingReason =
		'routingReason' in target && typeof target.routingReason === 'string'
			? target.routingReason
			: null;

	return {
		intent: 'coordinate_with_another_thread',
		validationOnly: true,
		valid: true,
		wouldExecuteCommands: [
			'context:current',
			'thread:contact',
			'thread:contacts',
			'context:current'
		],
		beforeContext,
		preview: {
			sourceThread: {
				id: sourceThread.id,
				name: sourceThread.name,
				handle: sourceThread.handle ?? null
			},
			targetThread: {
				id: targetThread.id,
				name: targetThread.name,
				handle: targetThread.handle ?? null,
				routingReason
			},
			contact: {
				prompt,
				contactType: readOptionalString(input.type) ?? 'question',
				contextSummary: readOptionalNullableString(input.context) ?? null,
				replyRequested: readOptionalBoolean(input.replyRequested) ?? true,
				replyToContactId: readOptionalNullableString(input.replyToContactId) ?? null
			},
			checks: [
				`Source thread ${sourceThread.id} exists.`,
				`Target thread ${targetThread.id} resolved successfully.`,
				`Target thread ${targetThread.id} can accept contact now.`
			]
		}
	};
}

export async function runAgentIntent(
	intentValue: string,
	input: Record<string, unknown> = {},
	options: {
		validateOnly?: boolean;
	} = {}
) {
	const intent = readIntentName(intentValue);
	const validateOnly = options.validateOnly === true;

	if (validateOnly && !VALIDATION_SUPPORTED_INTENTS.has(intent)) {
		throw new AgentControlPlaneApiError(
			400,
			`Validation preview is not supported for intent "${intent}" yet.`,
			{
				code: 'intent_validation_not_supported',
				suggestedNextCommands: ['manifest', `intent:${intent}`],
				details: {
					intent,
					supportedIntents: [...VALIDATION_SUPPORTED_INTENTS]
				}
			}
		);
	}

	switch (intent) {
		case 'prepare_task_for_review':
			return validateOnly ? previewPrepareTaskForReview(input) : prepareTaskForReview(input);
		case 'prepare_task_for_approval':
			return validateOnly ? previewPrepareTaskForApproval(input) : prepareTaskForApproval(input);
		case 'reject_task_approval':
			return validateOnly ? previewRejectTaskApproval(input) : rejectTaskApproval(input);
		case 'accept_child_handoff':
			return validateOnly ? previewAcceptChildHandoff(input) : acceptChildHandoff(input);
		case 'request_child_handoff_changes':
			return validateOnly
				? previewRequestChildHandoffChanges(input)
				: requestChildHandoffChanges(input);
		case 'coordinate_with_another_thread':
			return validateOnly
				? previewCoordinateWithAnotherThread(input)
				: coordinateWithAnotherThread(input);
	}
}
