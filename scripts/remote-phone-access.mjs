import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { closeSync, openSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const REMOTE_DIR = resolve(REPO_ROOT, 'agent_output', 'remote-access');
const STATUS_PATH = resolve(REMOTE_DIR, 'status.json');
const PREVIEW_LOG_PATH = resolve(REMOTE_DIR, 'preview.log');
const TUNNEL_LOG_PATH = resolve(REMOTE_DIR, 'tunnel.log');
const DEFAULT_PORT = Number.parseInt(process.env.AMS_REMOTE_ACCESS_PORT ?? '4173', 10);
const DEFAULT_TUNNEL_TARGET = process.env.AMS_REMOTE_TUNNEL_TARGET?.trim() || 'nokey@localhost.run';
const DEFAULT_TUNNEL_REMOTE_PORT = process.env.AMS_REMOTE_TUNNEL_REMOTE_PORT?.trim() || '80';

function sleep(ms) {
	return new Promise((resolvePromise) => {
		setTimeout(resolvePromise, ms);
	});
}

async function ensureRemoteDir() {
	await mkdir(REMOTE_DIR, { recursive: true });
}

async function readJson(path) {
	try {
		return JSON.parse(await readFile(path, 'utf8'));
	} catch {
		return null;
	}
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

function readFileMatches(path) {
	return readFile(path, 'utf8')
		.then((text) => text.match(/https?:\/\/[^\s)]+/g) ?? [])
		.catch(() => []);
}

async function readTunnelEvents() {
	try {
		const text = await readFile(TUNNEL_LOG_PATH, 'utf8');

		return text
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.startsWith('{') && line.endsWith('}'))
			.map((line) => {
				try {
					return JSON.parse(line);
				} catch {
					return null;
				}
			})
			.filter(Boolean);
	} catch {
		return [];
	}
}

async function deriveTunnelUrl() {
	const events = await readTunnelEvents();
	const openedTunnel = events.findLast(
		(event) =>
			event?.event === 'tcpip-forward' &&
			event?.status === 'success' &&
			typeof event.listen_host === 'string'
	);

	if (openedTunnel?.listen_host) {
		const protocol = openedTunnel.tls_termination === false ? 'http' : 'https';
		return `${protocol}://${openedTunnel.listen_host}`;
	}

	const matches = await readFileMatches(TUNNEL_LOG_PATH);
	return (
		matches.findLast((value) => {
			try {
				const url = new URL(value);
				return !['localhost.run', 'admin.localhost.run', 'twitter.com', 'localhost:3000'].includes(
					url.host
				);
			} catch {
				return false;
			}
		}) ?? null
	);
}

function printHeader(label) {
	process.stdout.write(`\n${label}\n`);
}

function failWithMessage(message) {
	process.stderr.write(`${message}\n`);
	process.exit(1);
}

function runOrFail(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: REPO_ROOT,
		env: process.env,
		stdio: 'inherit',
		...options
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

function deriveAllowedHostsForTunnel(hostname) {
	const parts = hostname.split('.').filter(Boolean);

	if (parts.length < 3) {
		return [hostname];
	}

	return [hostname, `.${parts.slice(1).join('.')}`];
}

async function waitForLocalServer(url, attempts = 40) {
	for (let index = 0; index < attempts; index += 1) {
		try {
			const response = await fetch(url, { redirect: 'manual' });

			if (response.ok || response.status === 302 || response.status === 303) {
				return true;
			}
		} catch {
			// Keep retrying while the preview server starts.
		}

		await sleep(500);
	}

	return false;
}

async function waitForTunnelUrl(attempts = 30) {
	for (let index = 0; index < attempts; index += 1) {
		const events = await readTunnelEvents();
		const openedTunnel = events.findLast(
			(event) =>
				event?.event === 'tcpip-forward' &&
				event?.status === 'success' &&
				typeof event.listen_host === 'string'
		);
		const tunnelUrl = openedTunnel?.listen_host
			? `${openedTunnel.tls_termination === false ? 'http' : 'https'}://${openedTunnel.listen_host}`
			: null;

		if (tunnelUrl) {
			return tunnelUrl;
		}

		await sleep(500);
	}

	return null;
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

async function cleanupStaleStatus(status) {
	if (!status) {
		return;
	}

	await stopProcessGroup(status.tunnelPid);
	await stopProcessGroup(status.previewPid);
	await rm(STATUS_PATH, { force: true });
}

async function startRemoteAccess() {
	if (!process.env.AMS_OPERATOR_PASSWORD?.trim()) {
		failWithMessage(
			'Set AMS_OPERATOR_PASSWORD before starting remote phone access. This password protects the public tunnel.'
		);
	}

	if (spawnSync('ssh', ['-V'], { stdio: 'ignore' }).status !== 0) {
		failWithMessage('OpenSSH is required for remote phone access, but ssh was not found.');
	}

	await ensureRemoteDir();

	const currentStatus = await readJson(STATUS_PATH);

	if (
		currentStatus &&
		processIsAlive(currentStatus.previewPid) &&
		processIsAlive(currentStatus.tunnelPid)
	) {
		const tunnelUrl = (await deriveTunnelUrl()) ?? currentStatus.tunnelUrl ?? null;
		printHeader('Remote access already running');
		process.stdout.write(`Local: ${currentStatus.localUrl}\n`);
		process.stdout.write(`Phone: ${tunnelUrl ?? 'Waiting for tunnel URL'}\n`);
		process.stdout.write('Run `npm run remote:phone:status` for the latest status.\n');
		return;
	}

	if (currentStatus) {
		await cleanupStaleStatus(currentStatus);
	}

	printHeader('Building preview bundle');
	runOrFail('npm', ['run', 'build']);

	const localUrl = `http://127.0.0.1:${DEFAULT_PORT}`;
	const tunnelLogFd = openSync(TUNNEL_LOG_PATH, 'w');
	const tunnelProcess = spawn(
		'ssh',
		[
			'-o',
			'ExitOnForwardFailure=yes',
			'-o',
			'ServerAliveInterval=30',
			'-o',
			'StrictHostKeyChecking=accept-new',
			'-R',
			`${DEFAULT_TUNNEL_REMOTE_PORT}:127.0.0.1:${DEFAULT_PORT}`,
			DEFAULT_TUNNEL_TARGET,
			'--',
			'--output',
			'json'
		],
		{
			cwd: REPO_ROOT,
			detached: true,
			env: process.env,
			stdio: ['ignore', tunnelLogFd, tunnelLogFd]
		}
	);
	closeSync(tunnelLogFd);
	tunnelProcess.unref();

	const tunnelUrl = await waitForTunnelUrl();
	const tunnelHost = tunnelUrl ? new URL(tunnelUrl).host : null;
	const previewAllowedHosts = tunnelHost ? deriveAllowedHostsForTunnel(tunnelHost).join(',') : null;

	if (!tunnelHost) {
		await stopProcessGroup(tunnelProcess.pid);
		failWithMessage(`Tunnel URL was not detected. Check ${TUNNEL_LOG_PATH}.`);
	}

	const previewLogFd = openSync(PREVIEW_LOG_PATH, 'w');
	const previewProcess = spawn(
		'npm',
		['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(DEFAULT_PORT), '--strictPort'],
		{
			cwd: REPO_ROOT,
			detached: true,
			env: {
				...process.env,
				__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS: tunnelHost,
				AMS_REMOTE_PREVIEW_ALLOWED_HOSTS: previewAllowedHosts ?? ''
			},
			stdio: ['ignore', previewLogFd, previewLogFd]
		}
	);
	closeSync(previewLogFd);
	previewProcess.unref();

	const localServerReady = await waitForLocalServer(localUrl);

	if (!localServerReady) {
		await stopProcessGroup(tunnelProcess.pid);
		await stopProcessGroup(previewProcess.pid);
		failWithMessage(`Preview server did not start on ${localUrl}. Check ${PREVIEW_LOG_PATH}.`);
	}

	const status = {
		startedAt: new Date().toISOString(),
		localUrl,
		tunnelUrl,
		previewPid: previewProcess.pid ?? null,
		tunnelPid: tunnelProcess.pid ?? null,
		tunnelTarget: DEFAULT_TUNNEL_TARGET,
		tunnelRemotePort: DEFAULT_TUNNEL_REMOTE_PORT,
		previewLogPath: PREVIEW_LOG_PATH,
		tunnelLogPath: TUNNEL_LOG_PATH
	};

	await writeFile(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`);

	printHeader('Remote phone access started');
	process.stdout.write(`Local: ${localUrl}\n`);
	process.stdout.write(
		`Phone: ${tunnelUrl ?? `Waiting for tunnel URL. Check ${TUNNEL_LOG_PATH} or run npm run remote:phone:status.`}\n`
	);
	process.stdout.write('Login uses AMS_OPERATOR_PASSWORD.\n');
	process.stdout.write(`Preview log: ${PREVIEW_LOG_PATH}\n`);
	process.stdout.write(`Tunnel log: ${TUNNEL_LOG_PATH}\n`);
}

async function stopRemoteAccess() {
	const status = await readJson(STATUS_PATH);

	if (!status) {
		process.stdout.write('Remote phone access is not running.\n');
		return;
	}

	await stopProcessGroup(status.tunnelPid);
	await stopProcessGroup(status.previewPid);
	await rm(STATUS_PATH, { force: true });
	process.stdout.write('Remote phone access stopped.\n');
}

async function showRemoteStatus() {
	const status = await readJson(STATUS_PATH);

	if (!status) {
		process.stdout.write('Remote phone access is not running.\n');
		return;
	}

	const tunnelUrl = (await deriveTunnelUrl()) ?? status.tunnelUrl ?? null;
	const previewAlive = processIsAlive(status.previewPid);
	const tunnelAlive = processIsAlive(status.tunnelPid);

	printHeader('Remote phone access status');
	process.stdout.write(`Started: ${status.startedAt}\n`);
	process.stdout.write(`Preview: ${previewAlive ? 'running' : 'stopped'} (${status.localUrl})\n`);
	process.stdout.write(`Tunnel: ${tunnelAlive ? 'running' : 'stopped'} (${status.tunnelTarget})\n`);
	process.stdout.write(`Phone URL: ${tunnelUrl ?? 'Not detected yet'}\n`);
	process.stdout.write(`Preview log: ${status.previewLogPath}\n`);
	process.stdout.write(`Tunnel log: ${status.tunnelLogPath}\n`);
}

const command = process.argv[2] ?? 'start';

switch (command) {
	case 'start':
		await startRemoteAccess();
		break;
	case 'stop':
		await stopRemoteAccess();
		break;
	case 'status':
		await showRemoteStatus();
		break;
	default:
		failWithMessage('Unknown command. Use start, stop, or status.');
}
