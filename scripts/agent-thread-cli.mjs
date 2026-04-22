#!/usr/bin/env node

const appPort = process.env.AMS_APP_PORT?.trim() || '3000';
const apiBaseUrl = process.env.AMS_AGENT_API_BASE_URL?.trim() || `http://127.0.0.1:${appPort}`;
const apiToken =
	process.env.AMS_AGENT_API_TOKEN?.trim() ||
	process.env.AMS_OPERATOR_SESSION_SECRET?.trim() ||
	process.env.AMS_OPERATOR_PASSWORD?.trim() ||
	'';
const currentThreadId = process.env.AMS_AGENT_THREAD_ID?.trim() || '';

function printHelp() {
	process.stdout.write(
		[
			'Usage: node scripts/agent-thread-cli.mjs <command> [options]',
			'',
			'Commands:',
			'  best-target [--q <text>] [--role <role>] [--project <project>] [--task-id <taskId>] [--source-thread <threadId>] [--include-unavailable] [--include-archived]',
			'  list [--q <text>] [--role <role>] [--project <project>] [--task-id <taskId>] [--source-thread <threadId>] [--can-contact] [--include-archived] [--limit <n>]',
			'  resolve <query> [--source-thread <threadId>] [--can-contact] [--include-archived] [--limit <n>]',
			'  contact <targetThreadIdOrHandle> --prompt <text> [--type <kind>] [--context <text>] [--source-thread <threadId>] [--reply-to <contactId>] [--no-reply-requested]',
			'  contacts [threadIdOrHandle] [--limit <n>]',
			'',
			'Environment:',
			'  AMS_AGENT_API_BASE_URL  Operator API base URL',
			'  AMS_AGENT_API_TOKEN     Bearer token for the thread API',
			'  AMS_AGENT_THREAD_ID     Current thread id for managed runs'
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

		if (token === '--no-reply-requested') {
			options.replyRequested = false;
			continue;
		}

		if (token === '--include-unavailable') {
			options.includeUnavailable = true;
			continue;
		}

		if (token === '--include-archived') {
			options.includeArchived = true;
			continue;
		}

		if (token === '--can-contact') {
			options.canContact = true;
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

function requireApiToken() {
	if (!apiToken) {
		throw new Error('AMS_AGENT_API_TOKEN is required.');
	}
}

function requireThreadId(threadId) {
	if (!threadId) {
		throw new Error(
			'Thread id is required. Set AMS_AGENT_THREAD_ID or pass --source-thread / [threadId].'
		);
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
		throw new Error(payload.error ?? `Request failed: ${response.status} ${response.statusText}`);
	}

	return payload;
}

async function resolveThreadCandidates(identifier, input = {}) {
	const normalizedIdentifier = identifier?.trim();
	const params = buildSearchParams(
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

async function printResolvedThreads(identifier, input = {}) {
	const params = buildSearchParams({ limit: input.limit ?? '10' }, input);
	const threads = await resolveThreadCandidates(identifier, {
		...input,
		limit: params.get('limit') ?? '10'
	});
	process.stdout.write(`${JSON.stringify(threads, null, 2)}\n`);
}

function buildSearchParams(options, input = {}) {
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

	if (options['task-id']) {
		params.set('taskId', options['task-id']);
	}

	if (options['source-thread'] ?? input.sourceThreadId) {
		params.set('sourceThreadId', options['source-thread'] ?? input.sourceThreadId);
	}

	if (options.includeArchived) {
		params.set('includeArchived', '1');
	}

	if (options.canContact || input.canContact) {
		params.set('canContact', '1');
	}

	if (options.limit) {
		params.set('limit', options.limit);
	}

	return params;
}

async function run() {
	const [, , command, ...argv] = process.argv;

	if (!command || command === 'help' || command === '--help' || command === '-h') {
		printHelp();
		return;
	}

	const { options, positionals } = parseArgs(argv);

	switch (command) {
		case 'best-target': {
			const sourceThreadId = options['source-thread'] ?? currentThreadId;
			requireThreadId(sourceThreadId);
			const params = buildSearchParams(options, {
				sourceThreadId,
				canContact: !options.includeUnavailable
			});
			const payload = await request(`/api/agents/threads/best-target?${params.toString()}`);
			process.stdout.write(
				`${JSON.stringify(payload.target ?? payload.thread ?? null, null, 2)}\n`
			);
			return;
		}

		case 'list': {
			const params = buildSearchParams(options, {
				sourceThreadId: options['source-thread'] ?? currentThreadId,
				canContact: options.canContact
			});
			const payload = await request(`/api/agents/threads?${params.toString()}`);
			process.stdout.write(
				`${JSON.stringify(payload.targets ?? payload.threads ?? [], null, 2)}\n`
			);
			return;
		}

		case 'resolve': {
			const query = positionals[0] ?? options.q;

			if (!query?.trim()) {
				throw new Error('A query is required for resolve.');
			}

			await printResolvedThreads(query, {
				sourceThreadId: options['source-thread'] ?? currentThreadId,
				canContact: options.canContact,
				includeArchived: options.includeArchived,
				limit: options.limit
			});
			return;
		}

		case 'contact': {
			const targetThreadId = await resolveThreadIdentifier(positionals[0] ?? options.target, {
				sourceThreadId: options['source-thread'] ?? currentThreadId,
				canContact: true
			});
			const prompt = options.prompt?.trim() ?? '';
			const sourceThreadId = options['source-thread'] ?? currentThreadId;
			requireThreadId(sourceThreadId);

			if (!prompt) {
				throw new Error('A non-empty --prompt is required.');
			}

			const payload = await request(
				`/api/agents/threads/${encodeURIComponent(targetThreadId)}/messages`,
				{
					method: 'POST',
					headers: {
						'content-type': 'application/json'
					},
					body: JSON.stringify({
						sourceThreadId,
						prompt,
						contactType: options.type ?? 'question',
						contextSummary: options.context ?? '',
						replyRequested: options.replyRequested !== false,
						replyToContactId: options['reply-to'] ?? null
					})
				}
			);
			process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
			return;
		}

		case 'contacts': {
			const threadId = positionals[0]
				? await resolveThreadIdentifier(positionals[0], {
						includeArchived: true
					})
				: options.thread
					? await resolveThreadIdentifier(options.thread, {
							includeArchived: true
						})
					: currentThreadId;
			requireThreadId(threadId);
			const params = new URLSearchParams();

			if (options.limit) {
				params.set('limit', options.limit);
			}

			const payload = await request(
				`/api/agents/threads/${encodeURIComponent(threadId)}/contacts${params.size > 0 ? `?${params.toString()}` : ''}`
			);
			process.stdout.write(`${JSON.stringify(payload.contacts ?? [], null, 2)}\n`);
			return;
		}

		default:
			throw new Error(`Unknown command: ${command}`);
	}
}

run().catch((error) => {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
	process.exit(1);
});
