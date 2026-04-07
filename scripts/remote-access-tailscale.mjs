import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const OUTPUT_DIR = resolve(REPO_ROOT, 'agent_output', 'remote-access');
const STATUS_PATH = resolve(OUTPUT_DIR, 'tailscale-status.json');
const DEFAULT_PORT = Number.parseInt(process.env.AMS_APP_PORT ?? '3000', 10);
const DEFAULT_HTTPS_PORT = Number.parseInt(process.env.AMS_TAILSCALE_HTTPS_PORT ?? '443', 10);

function failWithMessage(message) {
	process.stderr.write(`${message}\n`);
	process.exit(1);
}

function printHeader(label) {
	process.stdout.write(`\n${label}\n`);
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

function runCommand(command, args, { capture = false, allowFailure = false } = {}) {
	const result = spawnSync(command, args, {
		cwd: REPO_ROOT,
		encoding: 'utf8',
		stdio: capture ? 'pipe' : 'inherit',
		env: process.env
	});

	if (result.status !== 0 && !allowFailure) {
		failWithMessage(result.stderr?.trim() || result.stdout?.trim() || `${command} failed.`);
	}

	return result;
}

function requireTailscale() {
	if (spawnSync('tailscale', ['version'], { stdio: 'ignore' }).status !== 0) {
		failWithMessage(
			'Tailscale CLI is required. Install Tailscale, sign in on this Mac, and rerun the command.'
		);
	}
}

function requireOperatorPassword() {
	if (!process.env.AMS_OPERATOR_PASSWORD?.trim()) {
		failWithMessage(
			'Set AMS_OPERATOR_PASSWORD before enabling remote access. The Tailscale path keeps the app private to the tailnet, but the operator UI should still require the shared password until named-user auth exists.'
		);
	}
}

function ensureTailscaleRunning() {
	const result = runCommand('tailscale', ['status', '--json'], {
		capture: true,
		allowFailure: true
	});

	if (result.status !== 0) {
		failWithMessage(
			'Tailscale does not appear to be connected on this Mac. Run `tailscale up` and rerun the command.'
		);
	}

	try {
		const parsed = JSON.parse(result.stdout);

		if (parsed.BackendState !== 'Running') {
			failWithMessage(
				`Tailscale is installed but not ready (BackendState=${parsed.BackendState ?? 'unknown'}). Run \`tailscale up\` and try again.`
			);
		}
	} catch {
		// The CLI succeeded; treat it as good enough if JSON parsing fails.
	}
}

function deriveServeUrlFromText(text) {
	return text.match(/https:\/\/[^\s)]+/g)?.at(-1) ?? null;
}

function deriveServeUrlFromConfig(parsed) {
	const host = Object.keys(parsed?.Web ?? {}).at(0);

	if (!host) {
		return null;
	}

	return `https://${host.replace(/:443$/, '')}`;
}

function getServeStatus() {
	const funnelResult = runCommand('tailscale', ['funnel', 'status', '--json'], {
		capture: true,
		allowFailure: true
	});

	if (funnelResult.status === 0) {
		try {
			const parsed = JSON.parse(funnelResult.stdout);
			const tailnetUrl = deriveServeUrlFromConfig(parsed);
			const configured = Boolean(parsed?.Web && Object.keys(parsed.Web).length > 0);

			return {
				configured,
				tailnetUrl,
				text: funnelResult.stdout.trim(),
				source: 'funnel status --json'
			};
		} catch {
			// Fall through to text-based status commands below.
		}
	}

	const serveResult = runCommand('tailscale', ['serve', 'status'], {
		capture: true,
		allowFailure: true
	});
	const serveText = serveResult.stderr?.trim() || serveResult.stdout?.trim() || '';

	if (serveResult.status !== 0) {
		return {
			configured: false,
			tailnetUrl: null,
			text: serveText,
			source: 'serve status'
		};
	}

	if (serveText === 'No serve config') {
		return {
			configured: false,
			tailnetUrl: null,
			text: serveText,
			source: 'serve status'
		};
	}

	return {
		configured: true,
		tailnetUrl: deriveServeUrlFromText(serveText),
		text: serveText,
		source: 'serve status'
	};
}

function ensureOperatorServer() {
	runCommand('node', ['--env-file-if-exists=.env.local', 'scripts/operator-server.mjs', 'start']);
}

export async function startRemoteAccess() {
	requireOperatorPassword();
	requireTailscale();
	ensureTailscaleRunning();
	await ensureOutputDir();
	ensureOperatorServer();

	const target = `http://127.0.0.1:${DEFAULT_PORT}`;
	runCommand('tailscale', ['serve', '--bg', '--yes', `--https=${DEFAULT_HTTPS_PORT}`, target]);

	const serveStatus = getServeStatus();
	const tailnetUrl = serveStatus.tailnetUrl;

	if (!tailnetUrl) {
		failWithMessage(
			'Tailscale Serve was configured, but the tailnet URL could not be detected. Run `tailscale serve status` to inspect the live config.'
		);
	}

	const status = {
		startedAt: new Date().toISOString(),
		provider: 'tailscale',
		localTarget: target,
		httpsPort: DEFAULT_HTTPS_PORT,
		tailnetUrl
	};

	await writeFile(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`);

	printHeader('Remote access enabled with Tailscale');
	process.stdout.write(`Tailnet URL: ${tailnetUrl}\n`);
	process.stdout.write(`Local target: ${target}\n`);
	process.stdout.write(
		'Tailscale Serve stays active until you run `npm run remote:access:stop`.\n'
	);
}

export async function stopRemoteAccess() {
	requireTailscale();
	runCommand('tailscale', ['serve', 'reset']);
	await rm(STATUS_PATH, { force: true });
	process.stdout.write('Tailscale remote access disabled.\n');
}

export async function showRemoteStatus() {
	requireTailscale();

	const cachedStatus = await readJson(STATUS_PATH);
	const serveStatus = getServeStatus();
	const liveUrl = serveStatus.tailnetUrl;

	printHeader('Remote access status');
	process.stdout.write(`Provider: tailscale\n`);
	process.stdout.write(`State: ${serveStatus.configured ? 'configured' : 'not configured'}\n`);
	process.stdout.write(`Tailnet URL: ${liveUrl ?? cachedStatus?.tailnetUrl ?? 'not detected'}\n`);
	process.stdout.write(
		`Local target: ${cachedStatus?.localTarget ?? `http://127.0.0.1:${DEFAULT_PORT}`}\n`
	);

	if (serveStatus.text) {
		process.stdout.write(`\nCurrent Tailscale status (${serveStatus.source}):\n`);
		process.stdout.write(`${serveStatus.text.trim()}\n`);
	}
}
