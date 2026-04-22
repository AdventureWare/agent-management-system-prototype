import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { closeSync, existsSync, openSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import net from 'node:net';

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const OUTPUT_DIR = resolve(REPO_ROOT, 'agent_output', 'operator-server');
const STATUS_PATH = resolve(OUTPUT_DIR, 'status.json');
const LOG_PATH = resolve(OUTPUT_DIR, 'server.log');
const BUILD_ENTRY_PATH = resolve(REPO_ROOT, 'build', 'index.js');
const BUILD_MANIFEST_PATH = resolve(REPO_ROOT, 'build', 'server', 'manifest.js');
const DEFAULT_HOST = process.env.AMS_APP_HOST?.trim() || '127.0.0.1';
const DEFAULT_PORT = Number.parseInt(process.env.AMS_APP_PORT ?? '3000', 10);

function failWithMessage(message) {
	process.stderr.write(`${message}\n`);
	process.exit(1);
}

function printHeader(label) {
	process.stdout.write(`\n${label}\n`);
}

function sleep(ms) {
	return new Promise((resolvePromise) => {
		setTimeout(resolvePromise, ms);
	});
}

function processIsAlive(pid) {
	if (!pid) {
		return false;
	}

	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

function resolveProbeHost(hostname) {
	return hostname === '0.0.0.0' ? '127.0.0.1' : hostname;
}

function createLocalUrl(hostname, port) {
	return `http://${hostname}:${port}`;
}

function isPortReachable(hostname, port) {
	return new Promise((resolvePromise) => {
		const socket = net.createConnection({ host: hostname, port });

		socket.once('connect', () => {
			socket.destroy();
			resolvePromise(true);
		});
		socket.once('error', () => {
			resolvePromise(false);
		});
	});
}

function createServerEnv(hostname, port) {
	const env = {
		...process.env,
		NODE_ENV: 'production',
		HOST: hostname,
		PORT: String(port)
	};

	const origin =
		process.env.AMS_APP_ORIGIN?.trim() ||
		process.env.AMS_PUBLIC_BASE_URL?.trim() ||
		process.env.ORIGIN?.trim();

	if (origin) {
		env.ORIGIN = origin;
	}

	const optionalForwardingEnv = {
		PROTOCOL_HEADER: process.env.AMS_APP_PROTOCOL_HEADER?.trim(),
		HOST_HEADER: process.env.AMS_APP_HOST_HEADER?.trim(),
		PORT_HEADER: process.env.AMS_APP_PORT_HEADER?.trim(),
		ADDRESS_HEADER: process.env.AMS_APP_ADDRESS_HEADER?.trim(),
		XFF_DEPTH: process.env.AMS_APP_XFF_DEPTH?.trim(),
		BODY_SIZE_LIMIT: process.env.AMS_APP_BODY_SIZE_LIMIT?.trim()
	};

	for (const [key, value] of Object.entries(optionalForwardingEnv)) {
		if (value) {
			env[key] = value;
		}
	}

	return env;
}

function createModuleUrl(path) {
	return `${pathToFileURL(path).href}?t=${Date.now()}`;
}

async function ensureOutputDir() {
	await mkdir(OUTPUT_DIR, { recursive: true });
}

async function readJson(path) {
	try {
		return JSON.parse(await readFile(path, 'utf8'));
	} catch {
		return null;
	}
}

async function waitForServer(url, attempts = 40) {
	for (let index = 0; index < attempts; index += 1) {
		try {
			const response = await fetch(url, { redirect: 'manual' });

			if (response.ok || response.status === 302 || response.status === 303) {
				return true;
			}
		} catch {
			// Keep retrying while the app server starts.
		}

		await sleep(500);
	}

	return false;
}

async function runCommand(command, args) {
	await new Promise((resolvePromise, reject) => {
		const child = spawn(command, args, {
			cwd: REPO_ROOT,
			env: process.env,
			stdio: 'inherit'
		});

		child.on('error', reject);
		child.on('close', (code) => {
			if ((code ?? 1) === 0) {
				resolvePromise();
				return;
			}

			reject(new Error(`Command exited with code ${code ?? 'null'}: ${command} ${args.join(' ')}`));
		});
	});
}

async function stopProcessGroup(pid) {
	if (!pid) {
		return;
	}

	try {
		process.kill(-pid, 'SIGTERM');
	} catch {
		try {
			process.kill(pid, 'SIGTERM');
		} catch {
			// Ignore already-stopped processes.
		}
	}
}

async function validateBuildArtifacts() {
	if (!existsSync(BUILD_ENTRY_PATH) || !existsSync(BUILD_MANIFEST_PATH)) {
		return {
			ok: false,
			reason: `Missing build artifacts at ${BUILD_ENTRY_PATH} or ${BUILD_MANIFEST_PATH}.`
		};
	}

	try {
		const { manifest } = await import(createModuleUrl(BUILD_MANIFEST_PATH));
		const nodeLoaders = Array.isArray(manifest?._?.nodes) ? manifest._.nodes : [];
		const endpointLoaders = Array.isArray(manifest?._?.routes)
			? manifest._.routes
					.map((route) => route?.endpoint)
					.filter((loadEndpoint) => typeof loadEndpoint === 'function')
			: [];

		for (const loadNode of nodeLoaders) {
			await loadNode();
		}

		for (const loadEndpoint of endpointLoaders) {
			await loadEndpoint();
		}

		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			reason: error instanceof Error ? error.message : String(error)
		};
	}
}

async function ensureBuildReady() {
	const validation = await validateBuildArtifacts();

	if (validation.ok) {
		return;
	}

	printHeader('Rebuilding operator app');
	process.stdout.write(`Reason: ${validation.reason}\n`);
	await runCommand(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build']);

	const revalidatedBuild = await validateBuildArtifacts();

	if (revalidatedBuild.ok) {
		return;
	}

	failWithMessage(`Operator build is still invalid after rebuild: ${revalidatedBuild.reason}`);
}

async function startServer() {
	await ensureBuildReady();
	await ensureOutputDir();

	const hostname = DEFAULT_HOST;
	const port = DEFAULT_PORT;
	const probeHost = resolveProbeHost(hostname);
	const localUrl = createLocalUrl(probeHost, port);
	const currentStatus = await readJson(STATUS_PATH);

	if (currentStatus && processIsAlive(currentStatus.pid)) {
		printHeader('Operator server already running');
		process.stdout.write(`Local: ${currentStatus.localUrl}\n`);
		process.stdout.write(`Log: ${currentStatus.logPath}\n`);
		return;
	}

	if (currentStatus) {
		await rm(STATUS_PATH, { force: true });
	}

	if (await isPortReachable(probeHost, port)) {
		failWithMessage(
			`Port ${probeHost}:${port} is already in use by another process. Stop that process before starting the operator server.`
		);
	}

	const logFd = openSync(LOG_PATH, 'a');

	const child = spawn(process.execPath, [BUILD_ENTRY_PATH], {
		cwd: REPO_ROOT,
		detached: true,
		env: createServerEnv(hostname, port),
		stdio: ['ignore', logFd, logFd]
	});
	closeSync(logFd);
	let childExitCode = null;
	let childExitSignal = null;

	child.on('exit', (code, signal) => {
		childExitCode = code;
		childExitSignal = signal;
	});

	const ready = await waitForServer(localUrl);

	if (childExitCode !== null || childExitSignal !== null) {
		failWithMessage(
			`Operator server exited before startup completed (code: ${childExitCode ?? 'null'}, signal: ${childExitSignal ?? 'none'}). Check ${LOG_PATH}.`
		);
	}

	if (!ready) {
		await stopProcessGroup(child.pid);
		failWithMessage(`Operator server did not start on ${localUrl}. Check ${LOG_PATH}.`);
	}

	const status = {
		startedAt: new Date().toISOString(),
		pid: child.pid ?? null,
		host: hostname,
		port,
		localUrl,
		logPath: LOG_PATH
	};

	await writeFile(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`);
	child.unref();

	printHeader('Operator server started');
	process.stdout.write(`Local: ${localUrl}\n`);
	process.stdout.write(`Log: ${LOG_PATH}\n`);
}

async function stopServer() {
	const status = await readJson(STATUS_PATH);

	if (!status) {
		process.stdout.write('Operator server is not running.\n');
		return;
	}

	await stopProcessGroup(status.pid);
	await rm(STATUS_PATH, { force: true });
	process.stdout.write('Operator server stopped.\n');
}

async function showStatus() {
	const status = await readJson(STATUS_PATH);

	if (!status) {
		process.stdout.write('Operator server is not running.\n');
		return;
	}

	const running = processIsAlive(status.pid);

	printHeader('Operator server status');
	process.stdout.write(`State: ${running ? 'running' : 'stopped'}\n`);
	process.stdout.write(`Local: ${status.localUrl}\n`);
	process.stdout.write(`PID: ${status.pid ?? 'unknown'}\n`);
	process.stdout.write(`Log: ${status.logPath}\n`);
}

async function runForegroundServer() {
	await ensureBuildReady();
	await ensureOutputDir();

	const child = spawn(process.execPath, [BUILD_ENTRY_PATH], {
		cwd: REPO_ROOT,
		env: createServerEnv(DEFAULT_HOST, DEFAULT_PORT),
		stdio: 'inherit'
	});

	child.on('exit', (code, signal) => {
		if (signal) {
			process.kill(process.pid, signal);
			return;
		}

		process.exit(code ?? 0);
	});
}

const command = process.argv[2] ?? 'status';

switch (command) {
	case 'run':
		await runForegroundServer();
		break;
	case 'start':
		await startServer();
		break;
	case 'stop':
		await stopServer();
		break;
	case 'status':
		await showStatus();
		break;
	default:
		failWithMessage('Unknown command. Use run, start, stop, or status.');
}
