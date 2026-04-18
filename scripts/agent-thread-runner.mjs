import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { buildCodexArgs } from './agent-thread-runner-args.mjs';

const configPath = process.argv[2];
const SUMMARY_LOG_LINE_LIMIT = 12;

if (!configPath) {
	process.stderr.write('Missing config path\n');
	process.exit(1);
}

function parseThreadId(line) {
	try {
		const parsed = JSON.parse(line);
		return parsed.type === 'thread.started' ? (parsed.thread_id ?? null) : null;
	} catch {
		return null;
	}
}

function parseTurnUsage(line) {
	try {
		const parsed = JSON.parse(line);

		if (parsed.type !== 'turn.completed' || !parsed.usage || typeof parsed.usage !== 'object') {
			return null;
		}

		const inputTokens =
			typeof parsed.usage.input_tokens === 'number' ? parsed.usage.input_tokens : null;
		const cachedInputTokens =
			typeof parsed.usage.cached_input_tokens === 'number'
				? parsed.usage.cached_input_tokens
				: null;
		const outputTokens =
			typeof parsed.usage.output_tokens === 'number' ? parsed.usage.output_tokens : null;

		return {
			inputTokens,
			cachedInputTokens,
			outputTokens,
			uncachedInputTokens:
				typeof inputTokens === 'number'
					? Math.max(inputTokens - (cachedInputTokens ?? 0), 0)
					: null,
			usageCapturedAt: new Date().toISOString()
		};
	} catch {
		return null;
	}
}

async function writeState(statePath, patch) {
	let current = {
		status: 'queued',
		pid: null,
		startedAt: null,
		finishedAt: null,
		exitCode: null,
		signal: null,
		codexThreadId: null
	};

	try {
		current = {
			...current,
			...JSON.parse(await readFile(statePath, 'utf8'))
		};
	} catch {
		// Keep the default state if no prior state file exists.
	}

	const next = {
		...current,
		...patch
	};

	await writeFile(statePath, JSON.stringify(next, null, 2));
	return next;
}

async function writeSummary(summaryPath, summary) {
	await writeFile(summaryPath, JSON.stringify(summary, null, 2));
}

const config = JSON.parse(await readFile(configPath, 'utf8'));
const appPort = process.env.AMS_APP_PORT?.trim() || '3000';
const agentApiToken =
	process.env.AMS_AGENT_API_TOKEN?.trim() ||
	process.env.AMS_OPERATOR_SESSION_SECRET?.trim() ||
	process.env.AMS_OPERATOR_PASSWORD?.trim() ||
	'';
const agentApiBaseUrl = process.env.AMS_AGENT_API_BASE_URL?.trim() || `http://127.0.0.1:${appPort}`;
await mkdir(dirname(config.statePath), { recursive: true });
let currentState = await writeState(config.statePath, {
	status: 'queued',
	pid: null,
	startedAt: new Date().toISOString(),
	finishedAt: null,
	exitCode: null,
	signal: null,
	codexThreadId: config.threadId ?? null
});
let currentSummary = {
	state: currentState,
	lastMessage: null,
	logTail: [],
	activityAt: currentState.startedAt ?? new Date().toISOString(),
	modelUsed: config.model ?? null,
	usage: null
};
await writeSummary(config.summaryPath, currentSummary);

const logStream = createWriteStream(config.logPath, { flags: 'a' });
logStream.write(`=== ${new Date().toISOString()} ${config.mode.toUpperCase()} ===\n`);
logStream.write(`cwd=${config.cwd ?? '(resume)'}\n`);
if (Array.isArray(config.additionalWritableRoots) && config.additionalWritableRoots.length > 0) {
	logStream.write(`additionalWritableRoots=${config.additionalWritableRoots.join(', ')}\n`);
}

const child = spawn(config.codexBin, buildCodexArgs(config), {
	// Let Codex change into the target workspace via -C. Some macOS-protected paths
	// such as iCloud Drive can fail when the subprocess itself is launched with that
	// directory as the OS-level cwd, even though Codex can still access the same path.
	cwd: process.cwd(),
	env: {
		...process.env,
		AMS_AGENT_API_BASE_URL: agentApiBaseUrl,
		AMS_AGENT_API_TOKEN: agentApiToken,
		AMS_AGENT_THREAD_ID: config.agentThreadId ?? '',
		NO_COLOR: '1'
	},
	// Managed runs pass the task prompt as argv. If stdin remains as a live pipe,
	// Codex can block forever waiting for extra input in background executions.
	stdio: ['ignore', 'pipe', 'pipe']
});

currentState = await writeState(config.statePath, {
	status: 'running',
	pid: child.pid ?? null
});
currentSummary = {
	...currentSummary,
	state: currentState
};
await writeSummary(config.summaryPath, currentSummary);

let stdoutBuffer = '';
let stderrBuffer = '';

function consumeBuffer(buffer, chunk) {
	let working = `${buffer}${chunk}`;
	let newlineIndex = working.indexOf('\n');

	while (newlineIndex >= 0) {
		const line = working.slice(0, newlineIndex);
		logStream.write(line + '\n');

		const threadId = parseThreadId(line);
		const turnUsage = parseTurnUsage(line);
		const activityAt = new Date().toISOString();
		const nextLogTail = [...currentSummary.logTail, line].slice(-SUMMARY_LOG_LINE_LIMIT);

		currentSummary = {
			...currentSummary,
			logTail: nextLogTail,
			activityAt,
			...(turnUsage ? { usage: turnUsage } : {})
		};

		if (threadId) {
			void (async () => {
				currentState = await writeState(config.statePath, { codexThreadId: threadId });
				currentSummary = {
					...currentSummary,
					state: currentState
				};
				await writeSummary(config.summaryPath, currentSummary);
			})();
		} else {
			void writeSummary(config.summaryPath, currentSummary);
		}

		working = working.slice(newlineIndex + 1);
		newlineIndex = working.indexOf('\n');
	}

	return working;
}

child.stdout.on('data', (chunk) => {
	stdoutBuffer = consumeBuffer(stdoutBuffer, chunk.toString('utf8'));
});

child.stderr.on('data', (chunk) => {
	stderrBuffer = consumeBuffer(stderrBuffer, chunk.toString('utf8'));
});

child.on('error', async (err) => {
	logStream.write(`RUNNER ERROR: ${err.message}\n`);
	currentState = await writeState(config.statePath, {
		status: 'failed',
		finishedAt: new Date().toISOString(),
		exitCode: -1,
		signal: null
	});
	currentSummary = {
		...currentSummary,
		state: currentState,
		logTail: [...currentSummary.logTail, `RUNNER ERROR: ${err.message}`].slice(
			-SUMMARY_LOG_LINE_LIMIT
		),
		activityAt: currentState.finishedAt ?? new Date().toISOString()
	};
	await writeSummary(config.summaryPath, currentSummary);
	logStream.end();
	process.exit(1);
});

child.on('close', async (code, signal) => {
	if (stdoutBuffer) {
		logStream.write(stdoutBuffer + '\n');
	}

	if (stderrBuffer) {
		logStream.write(stderrBuffer + '\n');
	}

	currentState = await writeState(config.statePath, {
		status: signal === 'SIGTERM' ? 'canceled' : code === 0 ? 'completed' : 'failed',
		finishedAt: new Date().toISOString(),
		exitCode: code,
		signal: signal ?? null
	});
	const lastMessage = await readFile(config.messagePath, 'utf8')
		.then((rawMessage) => rawMessage.trim() || null)
		.catch(() => null);

	currentSummary = {
		...currentSummary,
		state: currentState,
		lastMessage,
		activityAt: currentState.finishedAt ?? new Date().toISOString()
	};
	await writeSummary(config.summaryPath, currentSummary);

	logStream.write(`=== EXIT code=${code ?? 'null'} signal=${signal ?? 'null'} ===\n`);
	logStream.end();
	process.exit(code ?? 0);
});
