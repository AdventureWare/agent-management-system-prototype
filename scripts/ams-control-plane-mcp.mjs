#!/usr/bin/env node
// @ts-nocheck

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { AGENT_CAPABILITY_COMMANDS } from '../src/lib/server/agent-capability-commands.js';
import { recordAgentToolUseBestEffort } from '../src/lib/server/agent-use-telemetry.js';
import { createThreadContactMcpHandlers } from '../src/lib/server/thread-contact-mcp-helpers.js';
import { formatAgentApiErrorMessage } from './agent-api-errors.mjs';

const appPort = process.env.AMS_APP_PORT?.trim() || '3000';
const apiBaseUrl = process.env.AMS_AGENT_API_BASE_URL?.trim() || `http://127.0.0.1:${appPort}`;
const apiToken = process.env.AMS_AGENT_API_TOKEN?.trim() || '';
const currentThreadId = process.env.AMS_AGENT_THREAD_ID?.trim() || '';

const SPECIAL_TOOLS = [
	{
		name: 'ams_manifest',
		description:
			'Inspect the AMS capability manifest to discover supported control-plane operations.',
		inputSchema: {
			type: 'object',
			properties: {
				resource: {
					type: 'string',
					enum: ['context', 'intent', 'task', 'goal', 'project', 'thread']
				},
				command: {
					type: 'string'
				}
			},
			additionalProperties: false
		}
	}
];

function buildObjectSchema(properties, required = []) {
	return {
		type: 'object',
		properties,
		...(required.length > 0 ? { required } : {}),
		additionalProperties: false
	};
}

const MANIFEST_BACKED_TOOL_SCHEMAS = {
	'context:current': buildObjectSchema({
		threadId: { type: 'string' },
		taskId: { type: 'string' },
		runId: { type: 'string' }
	}),
	'intent:prepare_task_for_review': buildObjectSchema({
		taskId: { type: 'string' },
		attachment: { type: 'object' },
		review: { type: 'object' },
		validateOnly: { type: 'boolean' }
	}),
	'intent:prepare_task_for_approval': buildObjectSchema({
		taskId: { type: 'string' },
		attachment: { type: 'object' },
		approval: { type: 'object' },
		validateOnly: { type: 'boolean' }
	}),
	'intent:reject_task_approval': buildObjectSchema({
		taskId: { type: 'string' },
		validateOnly: { type: 'boolean' }
	}),
	'intent:accept_child_handoff': buildObjectSchema({
		parentTaskId: { type: 'string' },
		childTaskId: { type: 'string' },
		summary: { type: 'string' },
		validateOnly: { type: 'boolean' }
	}),
	'intent:request_child_handoff_changes': buildObjectSchema({
		parentTaskId: { type: 'string' },
		childTaskId: { type: 'string' },
		summary: { type: 'string' },
		validateOnly: { type: 'boolean' }
	}),
	'intent:coordinate_with_another_thread': buildObjectSchema({
		sourceThreadId: { type: 'string' },
		targetThreadIdOrHandle: { type: 'string' },
		q: { type: 'string' },
		role: { type: 'string' },
		project: { type: 'string' },
		taskId: { type: 'string' },
		prompt: { type: 'string' },
		type: { type: 'string' },
		context: { type: 'string' },
		validateOnly: { type: 'boolean' },
		replyRequested: { type: 'boolean' },
		replyToContactId: { type: 'string' }
	}),
	'thread:start': buildObjectSchema({ payload: { type: 'object' } }, ['payload']),
	'thread:get': buildObjectSchema({ threadId: { type: 'string' } }, ['threadId']),
	'thread:panel': buildObjectSchema({ threadId: { type: 'string' } }, ['threadId']),
	'thread:set-handle-alias': buildObjectSchema(
		{ threadId: { type: 'string' }, handleAlias: { type: 'string' } },
		['threadId']
	),
	'thread:cancel': buildObjectSchema({ threadId: { type: 'string' } }, ['threadId']),
	'thread:archive': buildObjectSchema(
		{
			threadIds: {
				type: 'array',
				items: { type: 'string' }
			},
			archived: { type: 'boolean' }
		},
		['threadIds']
	),
	'thread:status': buildObjectSchema({
		threadIds: {
			type: 'array',
			items: { type: 'string' }
		}
	}),
	'thread:best-target': buildObjectSchema({
		q: { type: 'string' },
		role: { type: 'string' },
		project: { type: 'string' },
		taskId: { type: 'string' },
		sourceThreadId: { type: 'string' },
		includeUnavailable: { type: 'boolean' },
		includeArchived: { type: 'boolean' }
	}),
	'thread:list': buildObjectSchema({
		q: { type: 'string' },
		role: { type: 'string' },
		project: { type: 'string' },
		taskId: { type: 'string' },
		sourceThreadId: { type: 'string' },
		canContact: { type: 'boolean' },
		includeArchived: { type: 'boolean' },
		limit: { type: 'number' }
	}),
	'thread:resolve': buildObjectSchema(
		{
			query: { type: 'string' },
			sourceThreadId: { type: 'string' },
			canContact: { type: 'boolean' },
			includeArchived: { type: 'boolean' },
			limit: { type: 'number' }
		},
		['query']
	),
	'thread:contact': buildObjectSchema(
		{
			targetThreadIdOrHandle: { type: 'string' },
			prompt: { type: 'string' },
			type: { type: 'string' },
			context: { type: 'string' },
			sourceThreadId: { type: 'string' },
			replyToContactId: { type: 'string' },
			replyRequested: { type: 'boolean' }
		},
		['targetThreadIdOrHandle', 'prompt']
	),
	'thread:contacts': buildObjectSchema({
		threadIdOrHandle: { type: 'string' },
		limit: { type: 'number' }
	}),
	'thread:contact-targets': buildObjectSchema({
		sourceThreadId: { type: 'string' }
	}),
	'thread:attachment-read': buildObjectSchema(
		{ threadId: { type: 'string' }, attachmentId: { type: 'string' } },
		['threadId', 'attachmentId']
	),
	'task:list': buildObjectSchema({
		q: { type: 'string' },
		projectId: { type: 'string' },
		goalId: { type: 'string' },
		status: { type: 'string' },
		limit: { type: 'number' }
	}),
	'task:get': buildObjectSchema({ taskId: { type: 'string' } }, ['taskId']),
	'task:create': buildObjectSchema({ payload: { type: 'object' } }, ['payload']),
	'task:update': buildObjectSchema({ taskId: { type: 'string' }, payload: { type: 'object' } }, [
		'taskId',
		'payload'
	]),
	'task:attach': buildObjectSchema({ taskId: { type: 'string' }, payload: { type: 'object' } }, [
		'taskId',
		'payload'
	]),
	'task:remove-attachment': buildObjectSchema(
		{ taskId: { type: 'string' }, attachmentId: { type: 'string' } },
		['taskId', 'attachmentId']
	),
	'task:request-review': buildObjectSchema(
		{ taskId: { type: 'string' }, payload: { type: 'object' } },
		['taskId', 'payload']
	),
	'task:approve-review': buildObjectSchema(
		{ taskId: { type: 'string' }, validateOnly: { type: 'boolean' } },
		['taskId']
	),
	'task:request-review-changes': buildObjectSchema(
		{ taskId: { type: 'string' }, validateOnly: { type: 'boolean' } },
		['taskId']
	),
	'task:request-approval': buildObjectSchema(
		{ taskId: { type: 'string' }, payload: { type: 'object' } },
		['taskId', 'payload']
	),
	'task:approve-approval': buildObjectSchema(
		{ taskId: { type: 'string' }, validateOnly: { type: 'boolean' } },
		['taskId']
	),
	'task:reject-approval': buildObjectSchema(
		{ taskId: { type: 'string' }, validateOnly: { type: 'boolean' } },
		['taskId']
	),
	'task:decompose': buildObjectSchema({ taskId: { type: 'string' }, payload: { type: 'object' } }, [
		'taskId',
		'payload'
	]),
	'task:accept-child-handoff': buildObjectSchema(
		{ parentTaskId: { type: 'string' }, payload: { type: 'object' } },
		['parentTaskId', 'payload']
	),
	'task:request-child-handoff-changes': buildObjectSchema(
		{ parentTaskId: { type: 'string' }, payload: { type: 'object' } },
		['parentTaskId', 'payload']
	),
	'task:launch-session': buildObjectSchema({ taskId: { type: 'string' } }, ['taskId']),
	'task:recover-session': buildObjectSchema({ taskId: { type: 'string' } }, ['taskId']),
	'goal:list': buildObjectSchema({
		q: { type: 'string' },
		projectId: { type: 'string' },
		status: { type: 'string' },
		limit: { type: 'number' }
	}),
	'goal:get': buildObjectSchema({ goalId: { type: 'string' } }, ['goalId']),
	'goal:create': buildObjectSchema({ payload: { type: 'object' } }, ['payload']),
	'goal:update': buildObjectSchema({ goalId: { type: 'string' }, payload: { type: 'object' } }, [
		'goalId',
		'payload'
	]),
	'project:list': buildObjectSchema({
		q: { type: 'string' },
		limit: { type: 'number' }
	}),
	'project:get': buildObjectSchema({ projectId: { type: 'string' } }, ['projectId']),
	'project:create': buildObjectSchema({ payload: { type: 'object' } }, ['payload']),
	'project:update': buildObjectSchema(
		{ projectId: { type: 'string' }, payload: { type: 'object' } },
		['projectId', 'payload']
	)
};

function buildManifestToolKey(resource, command) {
	return `${resource}:${command}`;
}

function buildManifestToolName(resource, command) {
	return `ams_${resource}_${command.replaceAll('-', '_')}`;
}

function buildManifestBackedTools() {
	return AGENT_CAPABILITY_COMMANDS.map((command) => {
		const inputSchema =
			MANIFEST_BACKED_TOOL_SCHEMAS[buildManifestToolKey(command.resource, command.command)];

		if (!inputSchema) {
			throw new Error(
				`Missing MCP input schema for manifest-backed tool ${command.resource}:${command.command}`
			);
		}

		return {
			name: buildManifestToolName(command.resource, command.command),
			description: command.summary,
			inputSchema
		};
	});
}

const TOOLS = [...SPECIAL_TOOLS, ...buildManifestBackedTools()];

export function getTools() {
	return TOOLS;
}

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

async function request(path, init = {}) {
	const response = await requestRaw(path, init);
	return response.json().catch(() => ({}));
}

async function requestRaw(path, init = {}) {
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
	if (!response.ok) {
		const payload = await response.json().catch(() => ({}));
		throw new Error(
			formatAgentApiErrorMessage({
				error: payload.error ?? `Request failed: ${response.status} ${response.statusText}`,
				errorCode: payload.errorCode,
				suggestedNextCommands: payload.suggestedNextCommands
			})
		);
	}

	return response;
}

function requireThreadId(threadId) {
	if (!threadId) {
		throw new Error(
			'Thread id is required. Set AMS_AGENT_THREAD_ID or pass sourceThreadId/threadIdOrHandle.'
		);
	}
}

const threadContactHandlers = createThreadContactMcpHandlers({
	request,
	currentThreadId,
	requireThreadId,
	readRequiredString
});

const MANUAL_TOOL_HANDLERS = {
	ams_manifest: async (args) => {
		const params = buildSearchParams({
			resource: args.resource,
			command: args.command
		});
		return request(`/api/agent-capabilities${params.size > 0 ? `?${params.toString()}` : ''}`);
	},
	...threadContactHandlers,
	ams_thread_attachment_read: async (args) =>
		readDownloadedAttachment(
			`/api/agents/threads/${encodeURIComponent(readRequiredString(args.threadId, 'threadId'))}/attachments/${encodeURIComponent(readRequiredString(args.attachmentId, 'attachmentId'))}`
		),
	ams_task_attachment_read: async (args) =>
		readDownloadedAttachment(
			`/api/tasks/${encodeURIComponent(readRequiredString(args.taskId, 'taskId'))}/attachments/${encodeURIComponent(readRequiredString(args.attachmentId, 'attachmentId'))}`
		)
};

const GENERATED_TOOL_COMMANDS = new Map(
	AGENT_CAPABILITY_COMMANDS.map((command) => [
		buildManifestToolName(command.resource, command.command),
		command
	]).filter(([toolName]) => !(toolName in MANUAL_TOOL_HANDLERS))
);

function buildCommandKey(resource, command) {
	return `${resource}:${command}`;
}

function resolveCommandMetadataValue(spec = {}, args = {}, label = 'value') {
	const sourceArg = spec.arg ?? label;
	let value = sourceArg in args ? args[sourceArg] : undefined;

	if (value === undefined && spec.fallback === 'currentThreadId') {
		value = currentThreadId;
	}

	if (spec.transform === 'invert_true_missing_true') {
		value = value === undefined ? true : value !== true;
	}

	if (spec.normalize === 'optionalString') {
		value = value === undefined ? undefined : normalizeOptionalString(value);
	}

	if (value === undefined && Object.hasOwn(spec, 'default')) {
		value = spec.default;
	}

	if (spec.required) {
		if (Array.isArray(value)) {
			if (value.length === 0) {
				throw new Error(`${sourceArg} is required.`);
			}
		} else if (typeof value === 'string') {
			if (!value.trim()) {
				throw new Error(`${sourceArg} is required.`);
			}
		} else if (value === undefined || value === null) {
			throw new Error(`${sourceArg} is required.`);
		}
	}

	return value;
}

function consumePathArgs(pathTemplate, args, command = null) {
	const remainingArgs = { ...args };
	const aliases = command?.mcp?.pathArgAliases ?? {};
	const defaults = command?.mcp?.pathArgDefaults ?? {};
	const path = pathTemplate.replaceAll(/:([A-Za-z0-9_]+)/g, (_match, rawParamName) => {
		const paramName = String(rawParamName);
		const argName = aliases[paramName] ?? paramName;
		const value =
			argName in remainingArgs
				? remainingArgs[argName]
				: resolveCommandMetadataValue(defaults[paramName] ?? {}, remainingArgs, argName);

		if (typeof value !== 'string' || !value.trim()) {
			throw new Error(`${argName} is required.`);
		}

		delete remainingArgs[argName];
		return encodeURIComponent(value.trim());
	});

	return { path, remainingArgs };
}

function appendSearchParam(params, key, value, spec = {}) {
	if (value === undefined || value === null || value === '') {
		return;
	}

	if (Array.isArray(value)) {
		for (const entry of value) {
			appendSearchParam(params, key, entry);
		}
		return;
	}

	if (typeof value === 'boolean') {
		params.append(key, spec.booleanMode === 'one_zero' ? (value ? '1' : '0') : String(value));
		return;
	}

	params.append(key, String(value));
}

function buildQueryString(args, command = null) {
	const params = new URLSearchParams();
	const querySpecs = command?.mcp?.query?.params ?? null;

	if (querySpecs) {
		for (const [queryKey, spec] of Object.entries(querySpecs)) {
			appendSearchParam(params, queryKey, resolveCommandMetadataValue(spec, args, queryKey), spec);
		}

		return params;
	}

	for (const [key, value] of Object.entries(args)) {
		appendSearchParam(params, key, value);
	}

	return params;
}

function buildGeneratedRequestInit(command, args) {
	const bodyMetadata = command?.mcp?.body ?? null;
	let body = null;

	if (bodyMetadata?.fields) {
		body = Object.fromEntries(
			Object.entries(bodyMetadata.fields).map(([fieldName, spec]) => [
				fieldName,
				resolveCommandMetadataValue(spec, args, fieldName)
			])
		);
	} else if (bodyMetadata?.mergePayload) {
		body = {
			...readRequiredObject(args.payload),
			...(bodyMetadata.defaults ?? {})
		};
	} else if ('payload' in args) {
		body = readRequiredObject(args.payload);
	} else if (bodyMetadata?.defaults || Object.keys(args).length > 0) {
		body = {
			...(bodyMetadata?.defaults ?? {}),
			...args
		};
	}

	if (!body) {
		return { method: command.method };
	}

	return {
		method: command.method,
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	};
}

function shapeGeneratedResponse(command, payload) {
	const responseFields = command?.mcp?.responseFields ?? null;

	if (!responseFields || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
		return payload;
	}

	for (const fieldName of responseFields) {
		if (fieldName in payload) {
			return payload[fieldName];
		}
	}

	return null;
}

async function invokeGeneratedTool(command, args = {}) {
	if (!command.path || !command.method) {
		throw new Error(
			`Generated MCP command ${command.resource}:${command.command} is missing path or method metadata.`
		);
	}

	const { path, remainingArgs } = consumePathArgs(command.path, args, command);
	const method = command.method.toUpperCase();

	if (method === 'GET') {
		const params = buildQueryString(remainingArgs, command);
		const payload = await request(`${path}${params.size > 0 ? `?${params.toString()}` : ''}`);
		return shapeGeneratedResponse(command, payload);
	}

	const payload = await request(path, buildGeneratedRequestInit(command, remainingArgs));
	return shapeGeneratedResponse(command, payload);
}

export async function invokeTool(name, args = {}) {
	try {
		const manualHandler = MANUAL_TOOL_HANDLERS[name];

		if (typeof manualHandler === 'function') {
			const result = await manualHandler(args);
			await recordAgentToolUseBestEffort({
				threadId: currentThreadId,
				toolName: name,
				args,
				outcome: 'success'
			});
			return result;
		}

		const command = GENERATED_TOOL_COMMANDS.get(name);

		if (command) {
			const result = await invokeGeneratedTool(command, args);
			await recordAgentToolUseBestEffort({
				threadId: currentThreadId,
				toolName: name,
				args,
				outcome: 'success'
			});
			return result;
		}

		throw new Error(`Unknown tool: ${name}`);
	} catch (error) {
		await recordAgentToolUseBestEffort({
			threadId: currentThreadId,
			toolName: name,
			args,
			outcome: 'error',
			errorMessage: error instanceof Error ? error.message : String(error)
		});
		throw error;
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

async function readDownloadedAttachment(pathname) {
	const response = await requestRaw(pathname);
	const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
	const name = parseContentDispositionFilename(response.headers.get('content-disposition'));

	if (isTextContentType(contentType)) {
		return {
			attachment: {
				name,
				contentType,
				encoding: 'text',
				content: await response.text()
			}
		};
	}

	return {
		attachment: {
			name,
			contentType,
			encoding: 'base64',
			content: Buffer.from(await response.arrayBuffer()).toString('base64')
		}
	};
}

function parseContentDispositionFilename(contentDisposition) {
	if (!contentDisposition) {
		return null;
	}

	const match = contentDisposition.match(/filename="?([^";]+)"?/i);
	return match?.[1] ?? null;
}

function isTextContentType(contentType) {
	return (
		contentType.startsWith('text/') ||
		contentType.includes('json') ||
		contentType.includes('xml') ||
		contentType.includes('javascript') ||
		contentType.includes('svg')
	);
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
