#!/usr/bin/env node
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { AGENT_CAPABILITY_COMMANDS } from '../src/lib/server/agent-capability-commands.js';
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

const CLI_MANIFEST_COMMAND_KEYS = new Set([
	'context:current',
	'context:get_relevant_prior_runs',
	'intent:interpret_intent',
	'intent:prepare_task_for_review',
	'intent:prepare_task_for_approval',
	'intent:reject_task_approval',
	'intent:accept_child_handoff',
	'intent:request_child_handoff_changes',
	'goal-loop:list_active_goals',
	'goal-loop:get_goal_context',
	'goal-loop:get_goal_progress',
	'goal-loop:get_goal_success_criteria',
	'goal-loop:get_goal_blockers',
	'goal-loop:get_actionable_work',
	'goal-loop:get_blocked_work',
	'goal-loop:get_awaiting_review',
	'goal-loop:get_next_recommended_action',
	'goal-loop:explain_task_eligibility',
	'work-packet:get_agent_work_packet',
	'run-result:record_run_result',
	'run-result:record_validation_result',
	'run-result:record_blocker',
	'run-result:record_followup_recommendations',
	'run-result:create_followup_task',
	'run-result:request_review_from_run',
	'run-result:mark_task_blocked_from_run',
	'run-result:preview_progress_updates',
	'run-result:apply_progress_updates',
	'review:get_review_status',
	'intent:coordinate_with_another_thread',
	'task:list',
	'task:get',
	'task:create',
	'task:update',
	'task:attach',
	'task:remove-attachment',
	'task:request-review',
	'task:approve-review',
	'task:request-review-changes',
	'task:request-approval',
	'task:approve-approval',
	'task:reject-approval',
	'task:decompose',
	'task:accept-child-handoff',
	'task:request-child-handoff-changes',
	'task:launch-session',
	'task:recover-session',
	'goal:list',
	'goal:get',
	'goal:create',
	'goal:update',
	'project:list',
	'project:get',
	'project:create',
	'project:update',
	'thread:start',
	'thread:get',
	'thread:panel',
	'thread:set-handle-alias',
	'thread:cancel',
	'thread:archive',
	'thread:status',
	'thread:best-target',
	'thread:list',
	'thread:resolve',
	'thread:contact',
	'thread:contacts',
	'thread:contact-targets',
	'thread:attachment-read'
]);

export function getCliManifestCommandKeys() {
	return [...CLI_MANIFEST_COMMAND_KEYS].sort();
}

function getManifestCommandsForResource(resource) {
	return new Set(
		AGENT_CAPABILITY_COMMANDS.filter((entry) => entry.resource === resource).map(
			(entry) => entry.command
		)
	);
}

function printHelp() {
	process.stdout.write(
		[
			'Usage: node scripts/ams-cli.mjs <resource> <command> [options]',
			'',
			'Discovery:',
			'  doctor',
			'  manifest [--resource <context|intent|goal-loop|work-packet|run-result|review|task|goal|project|thread>] [--command <name>]',
			'  context current [--thread <threadId>] [--task <taskId>] [--run <runId>]',
			'  context get_relevant_prior_runs [--task <taskId>] [--goal <goalId>] [--project <projectId>] [--status <status>] [--limit <n>]',
			'  goal-loop <command> [--goal <goalId>] [--project <projectId>] [--task <taskId>] [--limit <n>]',
			'  work-packet get_agent_work_packet [--goal <goalId>] [--project <projectId>] [--task <taskId>]',
			'  run-result <record_run_result|record_validation_result|record_blocker|record_followup_recommendations|create_followup_task|request_review_from_run|mark_task_blocked_from_run|preview_progress_updates|apply_progress_updates> --json <payload> | --file <path>',
			'  review get_review_status [--task <taskId>] [--goal <goalId>] [--project <projectId>] [--limit <n>]',
			'  telemetry summary [--thread <threadId>] [--task <taskId>] [--run <runId>] [--tool <toolName>] [--outcome <success|error>] [--since <1h|24h|7d|30d>]',
			'  intent interpret_intent --json <payload> | --file <path>',
			'  intent prepare_task_for_review --json <payload> | --file <path>',
			'  intent prepare_task_for_approval --json <payload> | --file <path>',
			'  intent reject_task_approval --json <payload> | --file <path>',
			'  intent accept_child_handoff --json <payload> | --file <path>',
			'  intent request_child_handoff_changes --json <payload> | --file <path>',
			'  intent coordinate_with_another_thread --json <payload> | --file <path>',
			'',
			'Resources:',
			'  task list [--q <text>] [--project <projectId>] [--goal <goalId>] [--status <status>] [--limit <n>]',
			'  task get [taskId]',
			'  task create --json <payload> | --file <path>',
			'  task update [taskId] --json <payload> | --file <path>',
			'  task attach [taskId] --json <payload> | --file <path>',
			'  task remove-attachment <taskId> <attachmentId>',
			'  task request-review [taskId] --json <payload> | --file <path>',
			'  task request-approval [taskId] --json <payload> | --file <path>',
			'  task approve-review [taskId] [--validate-only true]',
			'  task request-review-changes [taskId] [--validate-only true]',
			'  task approve-approval [taskId] [--validate-only true]',
			'  task reject-approval [taskId] [--validate-only true]',
			'  task accept-child-handoff [parentTaskId] --json <payload> | --file <path>',
			'  task request-child-handoff-changes [parentTaskId] --json <payload> | --file <path>',
			'  task launch-session [taskId]',
			'  task recover-session [taskId]',
			'  task decompose [taskId] --json <payload> | --file <path>',
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
			'  Use payload.validateOnly=true on supported approval, decomposition, and coordination commands to preview checks without mutating state.',
			'  In managed runs, current-task commands can omit [taskId] when AMS_AGENT_THREAD_ID or AMS_AGENT_RUN_ID is available. The CLI resolves the canonical task first and errors clearly if no task can be inferred.'
		].join('\n') + '\n'
	);
}

async function fetchJsonForDoctor(path) {
	const requestUrl = new URL(path, apiBaseUrl);
	const startedAt = Date.now();
	let response;

	try {
		response = await fetch(requestUrl, {
			headers: apiToken ? { authorization: `Bearer ${apiToken}` } : {}
		});
	} catch (error) {
		return {
			ok: false,
			url: requestUrl.href,
			durationMs: Date.now() - startedAt,
			error: error instanceof Error ? error.message : 'Unable to reach the AMS operator API.'
		};
	}

	const payload = await response.json().catch(() => ({}));

	return {
		ok: response.ok,
		url: requestUrl.href,
		status: response.status,
		durationMs: Date.now() - startedAt,
		payload
	};
}

function isLocalApiBaseUrl() {
	try {
		const parsed = new URL(apiBaseUrl);
		return ['127.0.0.1', 'localhost', '::1', '0.0.0.0'].includes(parsed.hostname);
	} catch {
		return false;
	}
}

async function probeLocalListenerPermission() {
	return new Promise((resolvePromise) => {
		const server = net.createServer();
		let settled = false;

		const finish = (result) => {
			if (settled) {
				return;
			}

			settled = true;
			resolvePromise(result);
		};

		server.once('error', (error) => {
			finish({
				ok: false,
				code: error?.code ?? 'UNKNOWN',
				message: error instanceof Error ? error.message : String(error)
			});
		});

		server.listen({ host: '127.0.0.1', port: 0 }, () => {
			server.close(() => {
				finish({ ok: true });
			});
		});
	});
}

async function runDoctor() {
	const checks = [
		{
			name: 'api_base_url',
			ok: Boolean(apiBaseUrl),
			detail: `Using ${apiBaseUrl}.`
		},
		{
			name: 'api_token',
			ok: Boolean(apiToken),
			detail: apiToken
				? 'AMS API token is available from the environment.'
				: 'AMS_AGENT_API_TOKEN, AMS_OPERATOR_SESSION_SECRET, or AMS_OPERATOR_PASSWORD is required for agent API calls.'
		}
	];

	const suggestedNextCommands = [];

	if (!apiToken) {
		suggestedNextCommands.push('export AMS_AGENT_API_TOKEN=<token>');
	}

	if (apiToken) {
		let apiReachabilityBlocked = false;
		const manifestResult = await fetchJsonForDoctor('/api/agent-capabilities');

		if (manifestResult.ok) {
			checks.push({
				name: 'manifest',
				ok: true,
				detail: `Capability manifest reachable in ${manifestResult.durationMs}ms.`,
				version: manifestResult.payload?.version,
				commandCount: Array.isArray(manifestResult.payload?.commands)
					? manifestResult.payload.commands.length
					: null
			});
		} else {
			let localListenerProbe = null;

			if (isLocalApiBaseUrl()) {
				localListenerProbe = await probeLocalListenerPermission();
			}

			checks.push({
				name: 'manifest',
				ok: false,
				detail:
					manifestResult.error ??
					manifestResult.payload?.error ??
					`Capability manifest request failed with HTTP ${manifestResult.status}.`,
				status: manifestResult.status ?? null
			});

			if (localListenerProbe && !localListenerProbe.ok) {
				checks.push({
					name: 'local_listener_permission',
					ok: false,
					detail: `This environment cannot bind a local operator listener (${localListenerProbe.code}: ${localListenerProbe.message}).`,
					errorCode: localListenerProbe.code
				});
				apiReachabilityBlocked = true;
				suggestedNextCommands.push(
					'Run the AMS CLI from an environment that permits local listeners, or set AMS_AGENT_API_BASE_URL to an already-running operator.'
				);
			} else {
				suggestedNextCommands.push('npm run app:server:start');
			}
		}

		const managedContextParams = buildManagedContextParams();
		const hasManagedContext = managedContextParams.size > 0;

		if (apiReachabilityBlocked) {
			checks.push({
				name: 'current_context',
				ok: false,
				skipped: true,
				detail:
					'Current context check skipped because the local operator API is unreachable from this environment.'
			});
		} else if (hasManagedContext) {
			const contextResult = await fetchJsonForDoctor(
				`/api/agent-context/current?${managedContextParams.toString()}`
			);

			checks.push({
				name: 'current_context',
				ok: contextResult.ok,
				detail: contextResult.ok
					? 'Current managed-run context resolved.'
					: (contextResult.error ??
						contextResult.payload?.error ??
						`Current context request failed with HTTP ${contextResult.status}.`),
				status: contextResult.status ?? null,
				resolved: contextResult.payload?.resolved ?? null
			});

			if (!contextResult.ok) {
				suggestedNextCommands.push('node scripts/ams-cli.mjs context current');
			}
		} else {
			checks.push({
				name: 'current_context',
				ok: true,
				skipped: true,
				detail:
					'No AMS_AGENT_THREAD_ID, AMS_AGENT_TASK_ID, or AMS_AGENT_RUN_ID is set, so managed-run context resolution was skipped.'
			});
		}
	} else {
		checks.push({
			name: 'manifest',
			ok: false,
			skipped: true,
			detail: 'Capability manifest check skipped because no AMS API token is available.'
		});
		checks.push({
			name: 'current_context',
			ok: true,
			skipped: true,
			detail: 'Current context check skipped because no AMS API token is available.'
		});
	}

	if (suggestedNextCommands.length === 0) {
		suggestedNextCommands.push('node scripts/ams-cli.mjs manifest');
	}

	printJson({
		ok: checks.every((check) => check.ok),
		apiBaseUrl,
		checks,
		suggestedNextCommands: [...new Set(suggestedNextCommands)]
	});
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
			if (isLocalApiBaseUrl()) {
				const localListenerProbe = await probeLocalListenerPermission();

				if (!localListenerProbe.ok) {
					throw new Error(
						`Unable to reach the AMS operator API at ${requestUrl.href}, and this environment cannot bind a local operator listener (${localListenerProbe.code}: ${localListenerProbe.message}). Run \`node scripts/ams-cli.mjs doctor\` for details. Do not retry \`npm run app:server:start\` from this worker; use an already-running operator via AMS_AGENT_API_BASE_URL or report that AMS state could not be updated.`,
						{ cause: error }
					);
				}
			}

			throw new Error(
				`Unable to reach the AMS operator API at ${requestUrl.href}. Run \`node scripts/ams-cli.mjs doctor\` to check operator reachability before retrying \`npm run app:server:start\`.`,
				{ cause: error }
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

function buildManagedContextParams(overrides = {}) {
	const params = new URLSearchParams();
	const threadId = overrides.threadId?.trim() || process.env.AMS_AGENT_THREAD_ID?.trim() || '';
	const taskId = overrides.taskId?.trim() || process.env.AMS_AGENT_TASK_ID?.trim() || '';
	const runId = overrides.runId?.trim() || process.env.AMS_AGENT_RUN_ID?.trim() || '';

	if (threadId) {
		params.set('threadId', threadId);
	}

	if (taskId) {
		params.set('taskId', taskId);
	}

	if (runId) {
		params.set('runId', runId);
	}

	return params;
}

async function loadManagedContext(overrides = {}) {
	const params = buildManagedContextParams(overrides);
	return request(`/api/agent-context/current${params.size > 0 ? `?${params.toString()}` : ''}`);
}

async function resolveManagedTaskId(explicitTaskId, label = 'task id') {
	const normalizedTaskId = explicitTaskId?.trim() ?? '';

	if (normalizedTaskId) {
		return normalizedTaskId;
	}

	const context = await loadManagedContext();
	const resolvedTaskId =
		typeof context?.resolved?.taskId === 'string' ? context.resolved.taskId.trim() : '';

	if (resolvedTaskId) {
		return resolvedTaskId;
	}

	throw new Error(
		`A ${label} is required. No task could be resolved from the current managed-run context. Run \`node scripts/ams-cli.mjs context current\` to inspect the available thread/task/run ids or pass the id explicitly.`
	);
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

export async function runCli(argvInput = process.argv.slice(2)) {
	const [resource, command, ...argv] = argvInput;

	if (!resource || resource === 'help' || resource === '--help' || resource === '-h') {
		printHelp();
		return;
	}

	if (resource === 'doctor') {
		await runDoctor();
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
		if (command !== 'current' && command !== 'get_relevant_prior_runs') {
			throw new Error(`Unknown context command: ${command ?? '<missing>'}`);
		}

		const { options } = parseArgs(argv);

		if (command === 'get_relevant_prior_runs') {
			const params = new URLSearchParams();

			if (options.project) {
				params.set('projectId', options.project);
			}

			if (options.goal) {
				params.set('goalId', options.goal);
			}

			if (options.task) {
				params.set('taskId', options.task);
			}

			if (options.status) {
				params.set('status', options.status);
			}

			if (options.limit) {
				params.set('limit', options.limit);
			}

			printJson(
				await request(
					`/api/agent-context/relevant-prior-runs${params.size > 0 ? `?${params.toString()}` : ''}`
				)
			);
			return;
		}

		const params = buildManagedContextParams({
			threadId: options.thread,
			taskId: options.task,
			runId: options.run
		});

		printJson(
			await request(`/api/agent-context/current${params.size > 0 ? `?${params.toString()}` : ''}`)
		);
		return;
	}

	if (resource === 'goal-loop') {
		const supportedGoalLoopCommands = getManifestCommandsForResource('goal-loop');

		if (!supportedGoalLoopCommands.has(command)) {
			throw new Error(`Unknown goal-loop command: ${command ?? '<missing>'}`);
		}

		const { options } = parseArgs(argv);
		const params = new URLSearchParams();

		if (options.project) {
			params.set('projectId', options.project);
		}

		if (options.goal) {
			params.set('goalId', options.goal);
		}

		if (options.task) {
			params.set('taskId', options.task);
		}

		if (options.limit) {
			params.set('limit', options.limit);
		}

		printJson(
			await request(
				`/api/agent-goal-loop/${encodeURIComponent(command)}${params.size > 0 ? `?${params.toString()}` : ''}`
			)
		);
		return;
	}

	if (resource === 'work-packet') {
		if (command !== 'get_agent_work_packet') {
			throw new Error(`Unknown work-packet command: ${command ?? '<missing>'}`);
		}

		const { options } = parseArgs(argv);
		const params = new URLSearchParams();

		if (options.project) {
			params.set('projectId', options.project);
		}

		if (options.goal) {
			params.set('goalId', options.goal);
		}

		if (options.task) {
			params.set('taskId', options.task);
		}

		printJson(
			await request(
				`/api/agent-work-packets/${encodeURIComponent(command)}${params.size > 0 ? `?${params.toString()}` : ''}`
			)
		);
		return;
	}

	if (resource === 'run-result') {
		const supportedRunResultCommands = getManifestCommandsForResource('run-result');

		if (!supportedRunResultCommands.has(command)) {
			throw new Error(`Unknown run-result command: ${command ?? '<missing>'}`);
		}

		const payload = await readPayload(parseArgs(argv).options);
		printJson(
			await request(`/api/agent-run-results/${encodeURIComponent(command)}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			})
		);
		return;
	}

	if (resource === 'review') {
		if (command !== 'get_review_status') {
			throw new Error(`Unknown review command: ${command ?? '<missing>'}`);
		}

		const { options } = parseArgs(argv);
		const params = new URLSearchParams();

		if (options.project) {
			params.set('projectId', options.project);
		}

		if (options.goal) {
			params.set('goalId', options.goal);
		}

		if (options.task) {
			params.set('taskId', options.task);
		}

		if (options.limit) {
			params.set('limit', options.limit);
		}

		printJson(
			await request(
				`/api/agent-reviews/${encodeURIComponent(command)}${params.size > 0 ? `?${params.toString()}` : ''}`
			)
		);
		return;
	}

	if (resource === 'intent') {
		const supportedIntents = getManifestCommandsForResource('intent');

		if (!supportedIntents.has(command)) {
			throw new Error(`Unknown intent command: ${command ?? '<missing>'}`);
		}

		const payload = await readPayload(parseArgs(argv).options);
		const intentEndpoint =
			command === 'interpret_intent'
				? `/api/agent-intent-interpretation/${encodeURIComponent(command)}`
				: `/api/agent-intents/${encodeURIComponent(command)}`;
		printJson(
			await request(intentEndpoint, {
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
			const taskId = await resolveManagedTaskId(positionals[0], 'task id');

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
			const taskId = await resolveManagedTaskId(positionals[0], 'task id');

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
			const taskId = await resolveManagedTaskId(positionals[0], 'task id');

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
			const taskId = await resolveManagedTaskId(positionals[0], 'task id');

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
			const taskId = await resolveManagedTaskId(positionals[0], 'task id');

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
			const taskId = await resolveManagedTaskId(positionals[0], 'task id');

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
			const taskId = await resolveManagedTaskId(positionals[0], 'task id');

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
			const taskId = await resolveManagedTaskId(positionals[0], 'task id');

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
			const taskId = await resolveManagedTaskId(positionals[0], 'task id');

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
			const taskId = await resolveManagedTaskId(positionals[0], 'parent task id');

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
			const taskId = await resolveManagedTaskId(positionals[0], 'parent task id');

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
			const taskId = await resolveManagedTaskId(positionals[0], 'task id');

			printJson(
				await request(`/api/tasks/${encodeURIComponent(taskId)}/session-launch`, {
					method: 'POST'
				})
			);
			return;
		}

		case 'task:recover-session': {
			const taskId = await resolveManagedTaskId(positionals[0], 'task id');

			printJson(
				await request(`/api/tasks/${encodeURIComponent(taskId)}/session-recover`, {
					method: 'POST'
				})
			);
			return;
		}

		case 'task:decompose': {
			const taskId = await resolveManagedTaskId(positionals[0], 'task id');

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

const isDirectExecution =
	process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
	runCli().catch((error) => {
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		process.exit(1);
	});
}
