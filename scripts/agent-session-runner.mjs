import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { buildCodexArgs } from './agent-session-runner-args.mjs';

const configPath = process.argv[2];

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
}

const config = JSON.parse(await readFile(configPath, 'utf8'));
await mkdir(dirname(config.statePath), { recursive: true });
await writeState(config.statePath, {
	status: 'queued',
	pid: null,
	startedAt: new Date().toISOString(),
	finishedAt: null,
	exitCode: null,
	signal: null,
	codexThreadId: config.threadId ?? null
});

const logStream = createWriteStream(config.logPath, { flags: 'a' });
logStream.write(`=== ${new Date().toISOString()} ${config.mode.toUpperCase()} ===\n`);
logStream.write(`cwd=${config.cwd ?? '(resume)'}\n`);

const child = spawn(config.codexBin, buildCodexArgs(config), {
	cwd: config.cwd,
	env: {
		...process.env,
		NO_COLOR: '1'
	}
});

await writeState(config.statePath, {
	status: 'running',
	pid: child.pid ?? null
});

let stdoutBuffer = '';
let stderrBuffer = '';

function consumeBuffer(buffer, chunk) {
	let working = `${buffer}${chunk}`;
	let newlineIndex = working.indexOf('\n');

	while (newlineIndex >= 0) {
		const line = working.slice(0, newlineIndex);
		logStream.write(line + '\n');

		const threadId = parseThreadId(line);
		if (threadId) {
			void writeState(config.statePath, { codexThreadId: threadId });
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
	await writeState(config.statePath, {
		status: 'failed',
		finishedAt: new Date().toISOString(),
		exitCode: -1,
		signal: null
	});
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

	await writeState(config.statePath, {
		status: signal === 'SIGTERM' ? 'canceled' : code === 0 ? 'completed' : 'failed',
		finishedAt: new Date().toISOString(),
		exitCode: code,
		signal: signal ?? null
	});

	logStream.write(`=== EXIT code=${code ?? 'null'} signal=${signal ?? 'null'} ===\n`);
	logStream.end();
	process.exit(code ?? 0);
});
