#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { summarizeAgentToolUse } from '../src/lib/server/agent-use-telemetry.js';
import { formatAgentApiErrorMessage } from './agent-api-errors.mjs';

const appPort = process.env.AMS_APP_PORT?.trim() || '3000';
const apiBaseUrl = process.env.AMS_AGENT_API_BASE_URL?.trim() || `http://127.0.0.1:${appPort}`;
const scriptDir = dirname(fileURLToPath(import.meta.url));
const apiToken =
	process.env.AMS_AGENT_API_TOKEN?.trim() ||
	process.env.AMS_OPERATOR_SESSION_SECRET?.trim() ||
	process.env.AMS_OPERATOR_PASSWORD?.trim() ||
	'';

function printHelp() {
	process.stdout.write(
		[
			'Usage: node scripts/ams-cli.mjs <resource> <command> [options]',
			'',
			'Discovery:',
			'  manifest [--resource <context|intent|task|goal|project|thread>] [--command <name>]',
			'  context current [--thread <threadId>] [--task <taskId>] [--run <runId>]',
			'  telemetry summary [--thread <threadId>] [--task <taskId>] [--run <runId>] [--tool <toolName>] [--outcome <success|error>] [--since <1h|24h|7d|30d>]',
			'  intent prepare_task_for_review --json <payload> | --file <path>',
			'  intent prepare_task_for_approval --json <payload> | --file <path>',
			'  intent reject_task_approval --json <payload> | --file <path>',
			'  intent accept_child_handoff --json <payload> | --file <path>',
			'  intent request_child_handoff_changes --json <payload> | --file <path>',
			'  intent coordinate_with_another_thread --json <payload> | --file <path>',
			'',
			'Resources:',
			'  task list [--q <text>] [--project <projectId>] [--goal <goalId>] [--status <status>] [--limit <n>]',
			'  task get <taskId>',
			'  task create --json <payload> | --file <path>',
			'  task update <taskId> --json <payload> | --file <path>',
			'  task attach <taskId> --json <payload> | --file <path>',
			'  task remove-attachment <taskId> <attachmentId>',
			'  task request-review <taskId> --json <payload> | --file <path>',
			'  task request-approval <taskId> --json <payload> | --file <path>',
			'  task approve-review <taskId> [--validate-only true]',
			'  task request-review-changes <taskId> [--validate-only true]',
			'  task approve-approval <taskId> [--validate-only true]',
			'  task reject-approval <taskId> [--validate-only true]',
			'  task accept-child-handoff <parentTaskId> --json <payload> | --file <path>',
			'  task request-child-handoff-changes <parentTaskId> --json <payload> | --file <path>',
			'  task launch-session <taskId>',
			'  task recover-session <taskId>',
			'  task decompose <taskId> --json <payload> | --file <path>',
			'  goal get <goalId>',
			'  goal list [--q <text>] [--project <projectId>] [--status <status>] [--limit <n>]',
			'  goal create --json <payload> | --file <path>',
			'  goal update <goalId> --json <payload> | --file <path>',
			'  project get <projectId>',
			'  project list [--q <text>] [--limit <n>]',
			'  project create --json <payload> | --file <path>',
			'  project update <projectId> --json <payload> | --file <path>',
			'  thread <existing agent-thread-cli args...>',
			'',
			'Environment:',
			'  AMS_AGENT_API_BASE_URL  Operator API base URL',
			'  AMS_AGENT_API_TOKEN     Bearer token for the AMS API',
			'',
			'Notes:',
			'  Use payload.validateOnly=true on supported approval, decomposition, and coordination commands to preview checks without mutating state.'
		].join('\n') + '\n'
	);
}

function parseArgs(argv) {
	const options = {};
	const positionals = [];

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];

		if (!token.startsWith('--')) {
			positionals.push(token);
			continue;
		}

		const next = argv[index + 1];

		if (!next || next.startsWith('--')) {
			throw new Error(`Missing value for ${token}.`);
		}

		options[token.slice(2)] = next;
		index += 1;
	}

	return { options, positionals };
}

function readValidateOnlyOption(options) {
	return options['validate-only'] === 'true';
}

function requireApiToken() {
	if (!apiToken) {
		throw new Error('AMS_AGENT_API_TOKEN is required.');
	}
}

async function request(path, init = {}) {
	requireApiToken();
	const requestUrl = new URL(path, apiBaseUrl);
	let response;

	try {
		response = await fetch(requestUrl, {
			...init,
			headers: {
				authorization: `Bearer ${apiToken}`,
				...(init.headers ?? {})
			}
		});
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(
				`Unable to reach the AMS operator API at ${requestUrl.href}. Start the operator server with \`npm run app:server:start\` and try again.`
			);
		}

		throw error;
	}

	const payload = await response.json().catch(() => ({}));

	if (!response.ok) {
		throw new Error(
			formatAgentApiErrorMessage({
				error: payload.error ?? `Request failed: ${response.status} ${response.statusText}`,
				errorCode: payload.errorCode,
				suggestedNextCommands: payload.suggestedNextCommands
			})
		);
	}

	return payload;
}

function buildSearchParams(options) {
	const params = new URLSearchParams();

	if (options.q) {
		params.set('q', options.q);
	}

	if (options.project) {
		params.set('projectId', options.project);
	}

	if (options.goal) {
		params.set('goalId', options.goal);
	}

	if (options.status) {
		params.set('status', options.status);
	}

	if (options.limit) {
		params.set('limit', options.limit);
	}

	return params;
}

async function readPayload(options) {
	if (options.json && options.file) {
		throw new Error('Use either --json or --file, not both.');
	}

	if (options.file) {
		return JSON.parse(await readFile(resolve(process.cwd(), options.file), 'utf8'));
	}

	if (options.json) {
		return JSON.parse(options.json);
	}

	throw new Error('A payload is required via --json or --file.');
}

function printJson(payload) {
	process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

async function runThreadPassthrough(args) {
	await new Promise((resolvePromise, reject) => {
		const child = spawn(process.execPath, [resolve(scriptDir, 'agent-thread-cli.mjs'), ...args], {
			cwd: process.cwd(),
			env: process.env,
			stdio: 'inherit'
		});

		child.on('error', reject);
		child.on('close', (code) => {
			if ((code ?? 1) === 0) {
				resolvePromise();
				return;
			}

			reject(new Error(`Thread command exited with code ${code ?? 'null'}.`));
		});
	});
}

async function run() {
	const [, , resource, command, ...argv] = process.argv;

	if (!resource || resource === 'help' || resource === '--help' || resource === '-h') {
		printHelp();
		return;
	}

	if (resource === 'thread') {
		await runThreadPassthrough([command, ...argv].filter(Boolean));
		return;
	}

	if (resource === 'manifest') {
		const { options } = parseArgs([command, ...argv].filter(Boolean));
		const params = new URLSearchParams();

		if (options.resource) {
			params.set('resource', options.resource);
		}

		if (options.command) {
			params.set('command', options.command);
		}

		printJson(
			await request(`/api/agent-capabilities${params.size > 0 ? `?${params.toString()}` : ''}`)
		);
		return;
	}

	if (resource === 'telemetry') {
		if (command !== 'summary') {
			throw new Error(`Unknown telemetry command: ${command ?? '<missing>'}`);
		}

		const { options } = parseArgs(argv);
		printJson(
			await summarizeAgentToolUse({
				threadId: options.thread?.trim() || undefined,
				taskId: options.task?.trim() || undefined,
				runId: options.run?.trim() || undefined,
				toolName: options.tool?.trim() || undefined,
				outcome: options.outcome?.trim() || undefined,
				since: options.since?.trim() || undefined
			})
		);
		return;
	}

	if (resource === 'context') {
		if (command !== 'current') {
			throw new Error(`Unknown context command: ${command ?? '<missing>'}`);
		}

		const { options } = parseArgs(argv);
		const params = new URLSearchParams();
		const threadId = options.thread?.trim() || process.env.AMS_AGENT_THREAD_ID?.trim() || '';
		const taskId = options.task?.trim() || process.env.AMS_AGENT_TASK_ID?.trim() || '';
		const runId = options.run?.trim() || process.env.AMS_AGENT_RUN_ID?.trim() || '';

		if (threadId) {
			params.set('threadId', threadId);
		}

		if (taskId) {
			params.set('taskId', taskId);
		}

		if (runId) {
			params.set('runId', runId);
		}

		printJson(
			await request(`/api/agent-context/current${params.size > 0 ? `?${params.toString()}` : ''}`)
		);
		return;
	}

	if (resource === 'intent') {
		const supportedIntents = new Set([
			'prepare_task_for_review',
			'prepare_task_for_approval',
			'reject_task_approval',
			'accept_child_handoff',
			'request_child_handoff_changes',
			'coordinate_with_another_thread'
		]);

		if (!supportedIntents.has(command)) {
			throw new Error(`Unknown intent command: ${command ?? '<missing>'}`);
		}

		const payload = await readPayload(parseArgs(argv).options);
		printJson(
			await request(`/api/agent-intents/${encodeURIComponent(command)}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			})
		);
		return;
	}

	if (!command) {
		printHelp();
		return;
	}

	const { options, positionals } = parseArgs(argv);

	switch (`${resource}:${command}`) {
		case 'task:list': {
			const params = buildSearchParams(options);
			printJson(await request(`/api/tasks${params.size > 0 ? `?${params.toString()}` : ''}`));
			return;
		}

		case 'task:get': {
			const taskId = positionals[0]?.trim();

			if (!taskId) {
				throw new Error('A task id is required.');
			}

			printJson(await request(`/api/tasks/${encodeURIComponent(taskId)}`));
			return;
		}

		case 'task:create': {
			const payload = await readPayload(options);
			printJson(
				await request('/api/tasks', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				})
			);
			return;
		}

		case 'task:update': {
			const taskId = positionals[0]?.trim();

			if (!taskId) {
				throw new Error('A task id is required.');
			}

			const payload = await readPayload(options);
			printJson(
				await request(`/api/tasks/${encodeURIComponent(taskId)}`, {
					method: 'PATCH',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				})
			);
			return;
		}

		case 'task:attach': {
			const taskId = positionals[0]?.trim();

			if (!taskId) {
				throw new Error('A task id is required.');
			}

			const payload = await readPayload(options);
			printJson(
				await request(`/api/tasks/${encodeURIComponent(taskId)}/attachments`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				})
			);
			return;
		}

		case 'task:remove-attachment': {
			const taskId = positionals[0]?.trim();
			const attachmentId = positionals[1]?.trim();

			if (!taskId || !attachmentId) {
				throw new Error('A task id and attachment id are required.');
			}

			printJson(
				await request(
					`/api/tasks/${encodeURIComponent(taskId)}/attachments/${encodeURIComponent(attachmentId)}`,
					{
						method: 'DELETE'
					}
				)
			);
			return;
		}

		case 'task:request-review': {
			const taskId = positionals[0]?.trim();

			if (!taskId) {
				throw new Error('A task id is required.');
			}

			const payload = await readPayload(options);
			printJson(
				await request(`/api/tasks/${encodeURIComponent(taskId)}/review-request`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				})
			);
			return;
		}

		case 'task:request-approval': {
			const taskId = positionals[0]?.trim();

			if (!taskId) {
				throw new Error('A task id is required.');
			}

			const payload = await readPayload(options);
			printJson(
				await request(`/api/tasks/${encodeURIComponent(taskId)}/approval-request`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				})
			);
			return;
		}

		case 'task:approve-review': {
			const taskId = positionals[0]?.trim();

			if (!taskId) {
				throw new Error('A task id is required.');
			}

			printJson(
				await request(`/api/tasks/${encodeURIComponent(taskId)}/review-decision`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						decision: 'approve',
						...(readValidateOnlyOption(options) ? { validateOnly: true } : {})
					})
				})
			);
			return;
		}

		case 'task:request-review-changes': {
			const taskId = positionals[0]?.trim();

			if (!taskId) {
				throw new Error('A task id is required.');
			}

			printJson(
				await request(`/api/tasks/${encodeURIComponent(taskId)}/review-decision`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						decision: 'changes_requested',
						...(readValidateOnlyOption(options) ? { validateOnly: true } : {})
					})
				})
			);
			return;
		}

		case 'task:approve-approval': {
			const taskId = positionals[0]?.trim();

			if (!taskId) {
				throw new Error('A task id is required.');
			}

			printJson(
				await request(`/api/tasks/${encodeURIComponent(taskId)}/approval-decision`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						decision: 'approve',
						...(readValidateOnlyOption(options) ? { validateOnly: true } : {})
					})
				})
			);
			return;
		}

		case 'task:reject-approval': {
			const taskId = positionals[0]?.trim();

			if (!taskId) {
				throw new Error('A task id is required.');
			}

			printJson(
				await request(`/api/tasks/${encodeURIComponent(taskId)}/approval-decision`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						decision: 'reject',
						...(readValidateOnlyOption(options) ? { validateOnly: true } : {})
					})
				})
			);
			return;
		}

		case 'task:accept-child-handoff': {
			const taskId = positionals[0]?.trim();

			if (!taskId) {
				throw new Error('A parent task id is required.');
			}

			const payload = await readPayload(options);
			printJson(
				await request(`/api/tasks/${encodeURIComponent(taskId)}/child-handoff`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ ...payload, decision: 'accept' })
				})
			);
			return;
		}

		case 'task:request-child-handoff-changes': {
			const taskId = positionals[0]?.trim();

			if (!taskId) {
				throw new Error('A parent task id is required.');
			}

			const payload = await readPayload(options);
			printJson(
				await request(`/api/tasks/${encodeURIComponent(taskId)}/child-handoff`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ ...payload, decision: 'changes_requested' })
				})
			);
			return;
		}

		case 'task:launch-session': {
			const taskId = positionals[0]?.trim();

			if (!taskId) {
				throw new Error('A task id is required.');
			}

			printJson(
				await request(`/api/tasks/${encodeURIComponent(taskId)}/session-launch`, {
					method: 'POST'
				})
			);
			return;
		}

		case 'task:recover-session': {
			const taskId = positionals[0]?.trim();

			if (!taskId) {
				throw new Error('A task id is required.');
			}

			printJson(
				await request(`/api/tasks/${encodeURIComponent(taskId)}/session-recover`, {
					method: 'POST'
				})
			);
			return;
		}

		case 'task:decompose': {
			const taskId = positionals[0]?.trim();

			if (!taskId) {
				throw new Error('A task id is required.');
			}

			const payload = await readPayload(options);
			printJson(
				await request(`/api/tasks/${encodeURIComponent(taskId)}/decompose`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				})
			);
			return;
		}

		case 'goal:list': {
			const params = buildSearchParams(options);
			printJson(await request(`/api/goals${params.size > 0 ? `?${params.toString()}` : ''}`));
			return;
		}

		case 'goal:get': {
			const goalId = positionals[0]?.trim();

			if (!goalId) {
				throw new Error('A goal id is required.');
			}

			printJson(await request(`/api/goals/${encodeURIComponent(goalId)}`));
			return;
		}

		case 'goal:create': {
			const payload = await readPayload(options);
			printJson(
				await request('/api/goals', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				})
			);
			return;
		}

		case 'goal:update': {
			const goalId = positionals[0]?.trim();

			if (!goalId) {
				throw new Error('A goal id is required.');
			}

			const payload = await readPayload(options);
			printJson(
				await request(`/api/goals/${encodeURIComponent(goalId)}`, {
					method: 'PATCH',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				})
			);
			return;
		}

		case 'project:list': {
			const params = buildSearchParams(options);
			printJson(await request(`/api/projects${params.size > 0 ? `?${params.toString()}` : ''}`));
			return;
		}

		case 'project:get': {
			const projectId = positionals[0]?.trim();

			if (!projectId) {
				throw new Error('A project id is required.');
			}

			printJson(await request(`/api/projects/${encodeURIComponent(projectId)}`));
			return;
		}

		case 'project:create': {
			const payload = await readPayload(options);
			printJson(
				await request('/api/projects', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				})
			);
			return;
		}

		case 'project:update': {
			const projectId = positionals[0]?.trim();

			if (!projectId) {
				throw new Error('A project id is required.');
			}

			const payload = await readPayload(options);
			printJson(
				await request(`/api/projects/${encodeURIComponent(projectId)}`, {
					method: 'PATCH',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				})
			);
			return;
		}

		default:
			throw new Error(`Unknown command: ${resource} ${command}`);
	}
}

run().catch((error) => {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
	process.exit(1);
});
