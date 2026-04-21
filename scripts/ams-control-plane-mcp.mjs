#!/usr/bin/env node
// @ts-nocheck

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const appPort = process.env.AMS_APP_PORT?.trim() || '3000';
const apiBaseUrl = process.env.AMS_AGENT_API_BASE_URL?.trim() || `http://127.0.0.1:${appPort}`;
const apiToken = process.env.AMS_AGENT_API_TOKEN?.trim() || '';
const currentThreadId = process.env.AMS_AGENT_THREAD_ID?.trim() || '';

const TOOLS = [
	{
		name: 'ams_manifest',
		description:
			'Inspect the AMS capability manifest to discover supported control-plane operations.',
		inputSchema: {
			type: 'object',
			properties: {
				resource: {
					type: 'string',
					enum: ['task', 'goal', 'project', 'thread']
				},
				command: {
					type: 'string'
				}
			},
			additionalProperties: false
		}
	},
	{
		name: 'ams_thread_start',
		description: 'Start a new agent thread from the AMS thread API.',
		inputSchema: {
			type: 'object',
			properties: {
				payload: { type: 'object' }
			},
			required: ['payload'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_thread_get',
		description: 'Fetch one thread by exact thread id.',
		inputSchema: {
			type: 'object',
			properties: {
				threadId: { type: 'string' }
			},
			required: ['threadId'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_thread_set_handle_alias',
		description: 'Update a thread handle alias.',
		inputSchema: {
			type: 'object',
			properties: {
				threadId: { type: 'string' },
				handleAlias: { type: 'string' }
			},
			required: ['threadId'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_thread_cancel',
		description: 'Cancel the active run for a thread.',
		inputSchema: {
			type: 'object',
			properties: {
				threadId: { type: 'string' }
			},
			required: ['threadId'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_thread_archive',
		description: 'Archive or unarchive one or more threads.',
		inputSchema: {
			type: 'object',
			properties: {
				threadIds: {
					type: 'array',
					items: { type: 'string' }
				},
				archived: { type: 'boolean' }
			},
			required: ['threadIds'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_thread_status',
		description: 'Fetch managed status rows for one or more thread ids.',
		inputSchema: {
			type: 'object',
			properties: {
				threadIds: {
					type: 'array',
					items: { type: 'string' }
				}
			},
			additionalProperties: false
		}
	},
	{
		name: 'ams_thread_best_target',
		description:
			'Find the best contactable thread for the current or provided source thread context.',
		inputSchema: {
			type: 'object',
			properties: {
				q: { type: 'string' },
				role: { type: 'string' },
				project: { type: 'string' },
				taskId: { type: 'string' },
				sourceThreadId: { type: 'string' },
				includeUnavailable: { type: 'boolean' },
				includeArchived: { type: 'boolean' }
			},
			additionalProperties: false
		}
	},
	{
		name: 'ams_thread_list',
		description: 'List candidate threads for routing or inspection.',
		inputSchema: {
			type: 'object',
			properties: {
				q: { type: 'string' },
				role: { type: 'string' },
				project: { type: 'string' },
				taskId: { type: 'string' },
				sourceThreadId: { type: 'string' },
				canContact: { type: 'boolean' },
				includeArchived: { type: 'boolean' },
				limit: { type: 'number' }
			},
			additionalProperties: false
		}
	},
	{
		name: 'ams_thread_resolve',
		description: 'Resolve a fuzzy thread handle or query into ranked thread candidates.',
		inputSchema: {
			type: 'object',
			properties: {
				query: { type: 'string' },
				sourceThreadId: { type: 'string' },
				canContact: { type: 'boolean' },
				includeArchived: { type: 'boolean' },
				limit: { type: 'number' }
			},
			required: ['query'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_thread_contact',
		description: 'Contact another thread by exact thread id or resolvable handle.',
		inputSchema: {
			type: 'object',
			properties: {
				targetThreadIdOrHandle: { type: 'string' },
				prompt: { type: 'string' },
				type: { type: 'string' },
				context: { type: 'string' },
				sourceThreadId: { type: 'string' },
				replyToContactId: { type: 'string' },
				replyRequested: { type: 'boolean' }
			},
			required: ['targetThreadIdOrHandle', 'prompt'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_thread_contacts',
		description: 'List recent contacts for the current thread or a specific thread id or handle.',
		inputSchema: {
			type: 'object',
			properties: {
				threadIdOrHandle: { type: 'string' },
				limit: { type: 'number' }
			},
			additionalProperties: false
		}
	},
	{
		name: 'ams_task_list',
		description: 'List tasks with optional project, goal, text, status, and limit filters.',
		inputSchema: {
			type: 'object',
			properties: {
				q: { type: 'string' },
				projectId: { type: 'string' },
				goalId: { type: 'string' },
				status: { type: 'string' },
				limit: { type: 'number' }
			},
			additionalProperties: false
		}
	},
	{
		name: 'ams_task_get',
		description: 'Fetch one AMS task by id.',
		inputSchema: {
			type: 'object',
			properties: {
				taskId: { type: 'string' }
			},
			required: ['taskId'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_task_create',
		description: 'Create a task in AMS.',
		inputSchema: {
			type: 'object',
			properties: {
				payload: { type: 'object' }
			},
			required: ['payload'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_task_update',
		description: 'Update an existing AMS task.',
		inputSchema: {
			type: 'object',
			properties: {
				taskId: { type: 'string' },
				payload: { type: 'object' }
			},
			required: ['taskId', 'payload'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_task_attach',
		description: 'Attach a file path to an AMS task.',
		inputSchema: {
			type: 'object',
			properties: {
				taskId: { type: 'string' },
				payload: { type: 'object' }
			},
			required: ['taskId', 'payload'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_task_remove_attachment',
		description: 'Remove an attachment from an AMS task by attachment id.',
		inputSchema: {
			type: 'object',
			properties: {
				taskId: { type: 'string' },
				attachmentId: { type: 'string' }
			},
			required: ['taskId', 'attachmentId'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_task_request_review',
		description: 'Open a review request for an AMS task.',
		inputSchema: {
			type: 'object',
			properties: {
				taskId: { type: 'string' },
				payload: { type: 'object' }
			},
			required: ['taskId', 'payload'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_task_approve_review',
		description: 'Approve the active review on an AMS task.',
		inputSchema: {
			type: 'object',
			properties: {
				taskId: { type: 'string' }
			},
			required: ['taskId'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_task_request_review_changes',
		description: 'Request review changes on an AMS task.',
		inputSchema: {
			type: 'object',
			properties: {
				taskId: { type: 'string' }
			},
			required: ['taskId'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_task_request_approval',
		description: 'Open an approval request for an AMS task.',
		inputSchema: {
			type: 'object',
			properties: {
				taskId: { type: 'string' },
				payload: { type: 'object' }
			},
			required: ['taskId', 'payload'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_task_approve_approval',
		description: 'Approve the active approval request on an AMS task.',
		inputSchema: {
			type: 'object',
			properties: {
				taskId: { type: 'string' }
			},
			required: ['taskId'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_task_reject_approval',
		description: 'Reject the active approval request on an AMS task.',
		inputSchema: {
			type: 'object',
			properties: {
				taskId: { type: 'string' }
			},
			required: ['taskId'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_task_decompose',
		description: 'Create child tasks from an AMS task delegation template.',
		inputSchema: {
			type: 'object',
			properties: {
				taskId: { type: 'string' },
				payload: { type: 'object' }
			},
			required: ['taskId', 'payload'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_task_accept_child_handoff',
		description: 'Accept a child handoff back into a parent AMS task.',
		inputSchema: {
			type: 'object',
			properties: {
				parentTaskId: { type: 'string' },
				payload: { type: 'object' }
			},
			required: ['parentTaskId', 'payload'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_task_request_child_handoff_changes',
		description: 'Request follow-up changes on a child handoff.',
		inputSchema: {
			type: 'object',
			properties: {
				parentTaskId: { type: 'string' },
				payload: { type: 'object' }
			},
			required: ['parentTaskId', 'payload'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_task_launch_session',
		description: 'Launch an AMS task session.',
		inputSchema: {
			type: 'object',
			properties: {
				taskId: { type: 'string' }
			},
			required: ['taskId'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_task_recover_session',
		description: 'Recover the latest launchable AMS task session.',
		inputSchema: {
			type: 'object',
			properties: {
				taskId: { type: 'string' }
			},
			required: ['taskId'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_goal_list',
		description: 'List goals with optional project, text, status, and limit filters.',
		inputSchema: {
			type: 'object',
			properties: {
				q: { type: 'string' },
				projectId: { type: 'string' },
				status: { type: 'string' },
				limit: { type: 'number' }
			},
			additionalProperties: false
		}
	},
	{
		name: 'ams_goal_get',
		description: 'Fetch one AMS goal by id.',
		inputSchema: {
			type: 'object',
			properties: {
				goalId: { type: 'string' }
			},
			required: ['goalId'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_goal_create',
		description: 'Create a goal in AMS.',
		inputSchema: {
			type: 'object',
			properties: {
				payload: { type: 'object' }
			},
			required: ['payload'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_goal_update',
		description: 'Update an existing AMS goal.',
		inputSchema: {
			type: 'object',
			properties: {
				goalId: { type: 'string' },
				payload: { type: 'object' }
			},
			required: ['goalId', 'payload'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_project_list',
		description: 'List projects with optional text and limit filters.',
		inputSchema: {
			type: 'object',
			properties: {
				q: { type: 'string' },
				limit: { type: 'number' }
			},
			additionalProperties: false
		}
	},
	{
		name: 'ams_project_get',
		description: 'Fetch one AMS project by id.',
		inputSchema: {
			type: 'object',
			properties: {
				projectId: { type: 'string' }
			},
			required: ['projectId'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_project_create',
		description: 'Create a project in AMS.',
		inputSchema: {
			type: 'object',
			properties: {
				payload: { type: 'object' }
			},
			required: ['payload'],
			additionalProperties: false
		}
	},
	{
		name: 'ams_project_update',
		description: 'Update an existing AMS project.',
		inputSchema: {
			type: 'object',
			properties: {
				projectId: { type: 'string' },
				payload: { type: 'object' }
			},
			required: ['projectId', 'payload'],
			additionalProperties: false
		}
	}
];

function buildSearchParams(input = {}) {
	const params = new URLSearchParams();

	for (const [key, value] of Object.entries(input)) {
		if (value === undefined || value === null || value === '') {
			continue;
		}

		params.set(key, String(value));
	}

	return params;
}

function buildThreadSearchParams(options = {}, input = {}) {
	const params = new URLSearchParams();

	if (options.q) {
		params.set('q', options.q);
	}

	if (options.role) {
		params.set('role', options.role);
	}

	if (options.project) {
		params.set('project', options.project);
	}

	if (options.taskId) {
		params.set('taskId', options.taskId);
	}

	if (options.sourceThreadId ?? input.sourceThreadId) {
		params.set('sourceThreadId', options.sourceThreadId ?? input.sourceThreadId);
	}

	if (options.includeArchived) {
		params.set('includeArchived', '1');
	}

	if (options.canContact || input.canContact) {
		params.set('canContact', '1');
	}

	if (options.limit) {
		params.set('limit', String(options.limit));
	}

	return params;
}

async function request(path, init = {}) {
	if (!apiToken) {
		throw new Error('AMS_AGENT_API_TOKEN is required for AMS MCP tools.');
	}

	const response = await fetch(new URL(path, apiBaseUrl), {
		...init,
		headers: {
			authorization: `Bearer ${apiToken}`,
			...(init.headers ?? {})
		}
	});
	const payload = await response.json().catch(() => ({}));

	if (!response.ok) {
		throw new Error(payload.error ?? `Request failed: ${response.status} ${response.statusText}`);
	}

	return payload;
}

function requireThreadId(threadId) {
	if (!threadId) {
		throw new Error(
			'Thread id is required. Set AMS_AGENT_THREAD_ID or pass sourceThreadId/threadIdOrHandle.'
		);
	}
}

async function resolveThreadCandidates(identifier, input = {}) {
	const normalizedIdentifier = identifier?.trim();
	const params = buildThreadSearchParams(
		{
			q: normalizedIdentifier,
			limit: input.limit ?? '25',
			...(input.canContact ? { canContact: true } : {}),
			...(input.includeArchived ? { includeArchived: true } : {})
		},
		{
			sourceThreadId: input.sourceThreadId ?? '',
			canContact: input.canContact
		}
	);
	const payload = await request(`/api/agents/threads?${params.toString()}`);
	return Array.isArray(payload.threads) ? payload.threads : [];
}

async function resolveThreadIdentifier(identifier, input = {}) {
	const normalizedIdentifier = identifier?.trim();

	if (!normalizedIdentifier) {
		throw new Error('Target thread id or handle is required.');
	}

	if (normalizedIdentifier.startsWith('thread_')) {
		return normalizedIdentifier;
	}

	const threads = await resolveThreadCandidates(normalizedIdentifier, input);
	const exactMatch = threads.find(
		(thread) => thread?.id === normalizedIdentifier || thread?.handle === normalizedIdentifier
	);

	if (exactMatch?.id) {
		return exactMatch.id;
	}

	if (threads.length === 1 && threads[0]?.id) {
		return threads[0].id;
	}

	if (threads.length > 1) {
		const suggestions = threads
			.slice(0, 5)
			.map((thread) => `${thread.handle ?? thread.id} (${thread.name})`)
			.join(', ');

		throw new Error(`Handle "${normalizedIdentifier}" is ambiguous. Try one of: ${suggestions}`);
	}

	throw new Error(
		`Could not resolve thread handle "${normalizedIdentifier}". Use an exact handle or thread id.`
	);
}

export async function invokeTool(name, args = {}) {
	switch (name) {
		case 'ams_manifest': {
			const params = buildSearchParams({
				resource: args.resource,
				command: args.command
			});
			return request(`/api/agent-capabilities${params.size > 0 ? `?${params.toString()}` : ''}`);
		}
		case 'ams_thread_start':
			return request('/api/agents/threads', jsonRequest(args.payload));
		case 'ams_thread_get':
			return request(
				`/api/agents/threads/${encodeURIComponent(readRequiredString(args.threadId, 'threadId'))}`
			);
		case 'ams_thread_set_handle_alias':
			return request(
				`/api/agents/threads/${encodeURIComponent(readRequiredString(args.threadId, 'threadId'))}`,
				jsonRequest(
					{
						handleAlias:
							args.handleAlias === undefined ? null : normalizeOptionalString(args.handleAlias)
					},
					'PATCH'
				)
			);
		case 'ams_thread_cancel':
			return request(
				`/api/agents/threads/${encodeURIComponent(readRequiredString(args.threadId, 'threadId'))}/cancel`,
				{
					method: 'POST'
				}
			);
		case 'ams_thread_archive':
			return request(
				'/api/agents/threads/archive',
				jsonRequest({
					threadIds: readRequiredStringList(args.threadIds, 'threadIds'),
					archived: args.archived !== false
				})
			);
		case 'ams_thread_status': {
			const params = new URLSearchParams();

			for (const threadId of readOptionalStringList(args.threadIds)) {
				params.append('threadId', threadId);
			}

			return request(`/api/agents/threads/status${params.size > 0 ? `?${params.toString()}` : ''}`);
		}
		case 'ams_thread_best_target': {
			const sourceThreadId = args.sourceThreadId ?? currentThreadId;
			requireThreadId(sourceThreadId);
			const params = buildThreadSearchParams(
				{
					q: args.q,
					role: args.role,
					project: args.project,
					taskId: args.taskId,
					sourceThreadId,
					includeArchived: args.includeArchived
				},
				{
					sourceThreadId,
					canContact: args.includeUnavailable !== true
				}
			);
			const payload = await request(`/api/agents/threads/best-target?${params.toString()}`);
			return payload.target ?? payload.thread ?? null;
		}
		case 'ams_thread_list': {
			const params = buildThreadSearchParams(
				{
					q: args.q,
					role: args.role,
					project: args.project,
					taskId: args.taskId,
					sourceThreadId: args.sourceThreadId ?? currentThreadId,
					includeArchived: args.includeArchived,
					limit: args.limit
				},
				{
					sourceThreadId: args.sourceThreadId ?? currentThreadId,
					canContact: args.canContact
				}
			);
			const payload = await request(`/api/agents/threads?${params.toString()}`);
			return payload.targets ?? payload.threads ?? [];
		}
		case 'ams_thread_resolve':
			return resolveThreadCandidates(readRequiredString(args.query, 'query'), {
				sourceThreadId: args.sourceThreadId ?? currentThreadId,
				canContact: args.canContact,
				includeArchived: args.includeArchived,
				limit: args.limit
			});
		case 'ams_thread_contact': {
			const sourceThreadId = args.sourceThreadId ?? currentThreadId;
			requireThreadId(sourceThreadId);
			const targetThreadId = await resolveThreadIdentifier(
				readRequiredString(args.targetThreadIdOrHandle, 'targetThreadIdOrHandle'),
				{
					sourceThreadId,
					canContact: true
				}
			);
			const payload = await request(
				`/api/agents/threads/${encodeURIComponent(targetThreadId)}/messages`,
				{
					method: 'POST',
					headers: {
						'content-type': 'application/json'
					},
					body: JSON.stringify({
						sourceThreadId,
						prompt: readRequiredString(args.prompt, 'prompt'),
						contactType: args.type ?? 'question',
						contextSummary: args.context ?? '',
						replyRequested: args.replyRequested !== false,
						replyToContactId: args.replyToContactId ?? null
					})
				}
			);
			return payload;
		}
		case 'ams_thread_contacts': {
			const threadId = args.threadIdOrHandle
				? await resolveThreadIdentifier(args.threadIdOrHandle, {
						includeArchived: true
					})
				: currentThreadId;
			requireThreadId(threadId);
			const params = new URLSearchParams();

			if (args.limit) {
				params.set('limit', String(args.limit));
			}

			const payload = await request(
				`/api/agents/threads/${encodeURIComponent(threadId)}/contacts${params.size > 0 ? `?${params.toString()}` : ''}`
			);
			return payload.contacts ?? [];
		}
		case 'ams_task_list': {
			const params = buildSearchParams({
				q: args.q,
				projectId: args.projectId,
				goalId: args.goalId,
				status: args.status,
				limit: args.limit
			});
			return request(`/api/tasks${params.size > 0 ? `?${params.toString()}` : ''}`);
		}
		case 'ams_task_get':
			return request(`/api/tasks/${encodeURIComponent(readRequiredString(args.taskId, 'taskId'))}`);
		case 'ams_task_create':
			return request('/api/tasks', jsonRequest(args.payload));
		case 'ams_task_update':
			return request(
				`/api/tasks/${encodeURIComponent(readRequiredString(args.taskId, 'taskId'))}`,
				jsonRequest(args.payload, 'PATCH')
			);
		case 'ams_task_attach':
			return request(
				`/api/tasks/${encodeURIComponent(readRequiredString(args.taskId, 'taskId'))}/attachments`,
				jsonRequest(args.payload)
			);
		case 'ams_task_remove_attachment':
			return request(
				`/api/tasks/${encodeURIComponent(readRequiredString(args.taskId, 'taskId'))}/attachments/${encodeURIComponent(readRequiredString(args.attachmentId, 'attachmentId'))}`,
				{
					method: 'DELETE'
				}
			);
		case 'ams_task_request_review':
			return request(
				`/api/tasks/${encodeURIComponent(readRequiredString(args.taskId, 'taskId'))}/review-request`,
				jsonRequest(args.payload)
			);
		case 'ams_task_approve_review':
			return request(
				`/api/tasks/${encodeURIComponent(readRequiredString(args.taskId, 'taskId'))}/review-decision`,
				jsonRequest({ decision: 'approve' })
			);
		case 'ams_task_request_review_changes':
			return request(
				`/api/tasks/${encodeURIComponent(readRequiredString(args.taskId, 'taskId'))}/review-decision`,
				jsonRequest({ decision: 'changes_requested' })
			);
		case 'ams_task_request_approval':
			return request(
				`/api/tasks/${encodeURIComponent(readRequiredString(args.taskId, 'taskId'))}/approval-request`,
				jsonRequest(args.payload)
			);
		case 'ams_task_approve_approval':
			return request(
				`/api/tasks/${encodeURIComponent(readRequiredString(args.taskId, 'taskId'))}/approval-decision`,
				jsonRequest({ decision: 'approve' })
			);
		case 'ams_task_reject_approval':
			return request(
				`/api/tasks/${encodeURIComponent(readRequiredString(args.taskId, 'taskId'))}/approval-decision`,
				jsonRequest({ decision: 'reject' })
			);
		case 'ams_task_decompose':
			return request(
				`/api/tasks/${encodeURIComponent(readRequiredString(args.taskId, 'taskId'))}/decompose`,
				jsonRequest(args.payload)
			);
		case 'ams_task_accept_child_handoff':
			return request(
				`/api/tasks/${encodeURIComponent(readRequiredString(args.parentTaskId, 'parentTaskId'))}/child-handoff`,
				jsonRequest({ ...readRequiredObject(args.payload), decision: 'accept' })
			);
		case 'ams_task_request_child_handoff_changes':
			return request(
				`/api/tasks/${encodeURIComponent(readRequiredString(args.parentTaskId, 'parentTaskId'))}/child-handoff`,
				jsonRequest({ ...readRequiredObject(args.payload), decision: 'changes_requested' })
			);
		case 'ams_task_launch_session':
			return request(
				`/api/tasks/${encodeURIComponent(readRequiredString(args.taskId, 'taskId'))}/session-launch`,
				{
					method: 'POST'
				}
			);
		case 'ams_task_recover_session':
			return request(
				`/api/tasks/${encodeURIComponent(readRequiredString(args.taskId, 'taskId'))}/session-recover`,
				{
					method: 'POST'
				}
			);
		case 'ams_goal_list': {
			const params = buildSearchParams({
				q: args.q,
				projectId: args.projectId,
				status: args.status,
				limit: args.limit
			});
			return request(`/api/goals${params.size > 0 ? `?${params.toString()}` : ''}`);
		}
		case 'ams_goal_get':
			return request(`/api/goals/${encodeURIComponent(readRequiredString(args.goalId, 'goalId'))}`);
		case 'ams_goal_create':
			return request('/api/goals', jsonRequest(args.payload));
		case 'ams_goal_update':
			return request(
				`/api/goals/${encodeURIComponent(readRequiredString(args.goalId, 'goalId'))}`,
				jsonRequest(args.payload, 'PATCH')
			);
		case 'ams_project_list': {
			const params = buildSearchParams({
				q: args.q,
				limit: args.limit
			});
			return request(`/api/projects${params.size > 0 ? `?${params.toString()}` : ''}`);
		}
		case 'ams_project_get':
			return request(
				`/api/projects/${encodeURIComponent(readRequiredString(args.projectId, 'projectId'))}`
			);
		case 'ams_project_create':
			return request('/api/projects', jsonRequest(args.payload));
		case 'ams_project_update':
			return request(
				`/api/projects/${encodeURIComponent(readRequiredString(args.projectId, 'projectId'))}`,
				jsonRequest(args.payload, 'PATCH')
			);
		default:
			throw new Error(`Unknown tool: ${name}`);
	}
}

function jsonRequest(payload, method = 'POST') {
	return {
		method,
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(readRequiredObject(payload))
	};
}

function readRequiredString(value, label) {
	if (typeof value !== 'string' || !value.trim()) {
		throw new Error(`${label} is required.`);
	}

	return value.trim();
}

function readRequiredObject(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error('A JSON object payload is required.');
	}

	return value;
}

function readOptionalStringList(value) {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.filter((entry) => typeof entry === 'string')
		.map((entry) => entry.trim())
		.filter(Boolean);
}

function readRequiredStringList(value, label) {
	const normalized = readOptionalStringList(value);

	if (normalized.length === 0) {
		throw new Error(`${label} is required.`);
	}

	return normalized;
}

function normalizeOptionalString(value) {
	if (typeof value !== 'string') {
		return null;
	}

	const normalized = value.trim();
	return normalized.length > 0 ? normalized : null;
}

function writeMessage(message) {
	const body = Buffer.from(JSON.stringify(message), 'utf8');
	process.stdout.write(`Content-Length: ${body.length}\r\n\r\n`);
	process.stdout.write(body);
}

function writeResult(id, result) {
	writeMessage({ jsonrpc: '2.0', id, result });
}

function writeError(id, error) {
	writeMessage({
		jsonrpc: '2.0',
		id,
		error: {
			code: -32000,
			message: error instanceof Error ? error.message : String(error)
		}
	});
}

function handleRequest(requestMessage) {
	const { id, method, params } = requestMessage;

	if (method === 'initialize') {
		writeResult(id, {
			protocolVersion: '2024-11-05',
			capabilities: { tools: {} },
			serverInfo: {
				name: 'ams-control-plane',
				version: '0.1.0'
			}
		});
		return;
	}

	if (method === 'notifications/initialized') {
		return;
	}

	if (method === 'ping') {
		writeResult(id, {});
		return;
	}

	if (method === 'tools/list') {
		writeResult(id, { tools: TOOLS });
		return;
	}

	if (method === 'tools/call') {
		invokeTool(params?.name, params?.arguments)
			.then((result) => {
				writeResult(id, {
					content: [
						{
							type: 'text',
							text: JSON.stringify(result, null, 2)
						}
					],
					structuredContent: result
				});
			})
			.catch((error) => {
				writeResult(id, {
					content: [
						{
							type: 'text',
							text: error instanceof Error ? error.message : String(error)
						}
					],
					isError: true
				});
			});
		return;
	}

	writeError(id, new Error(`Unsupported method: ${method}`));
}

export function startServer() {
	let buffer = '';

	process.stdin.setEncoding('utf8');
	process.stdin.on('data', (chunk) => {
		buffer += chunk;

		while (true) {
			const headerEnd = buffer.indexOf('\r\n\r\n');

			if (headerEnd === -1) {
				return;
			}

			const headerText = buffer.slice(0, headerEnd);
			const contentLengthMatch = headerText.match(/Content-Length:\s*(\d+)/i);

			if (!contentLengthMatch) {
				buffer = '';
				return;
			}

			const contentLength = Number.parseInt(contentLengthMatch[1], 10);
			const bodyStart = headerEnd + 4;

			if (buffer.length < bodyStart + contentLength) {
				return;
			}

			const body = buffer.slice(bodyStart, bodyStart + contentLength);
			buffer = buffer.slice(bodyStart + contentLength);

			try {
				handleRequest(JSON.parse(body));
			} catch (error) {
				writeError(null, error);
			}
		}
	});

	process.stdin.resume();
}

const isDirectExecution =
	process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
	startServer();
}
