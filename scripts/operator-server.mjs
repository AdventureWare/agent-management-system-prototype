/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { closeSync, existsSync, openSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import net from 'node:net';

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const OUTPUT_DIR = resolve(REPO_ROOT, 'agent_output', 'operator-server');
const STATUS_PATH = resolve(OUTPUT_DIR, 'status.json');
const LOG_PATH = resolve(OUTPUT_DIR, 'server.log');
const LAUNCHD_LOG_PATH = resolve(OUTPUT_DIR, 'launchd.log');
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

export function processIsAlive(pid) {
	if (!pid) {
		return false;
	}

	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		if (error?.code === 'EPERM') {
			return true;
		}

		return false;
	}
}

function resolveProbeHost(hostname) {
	return hostname === '0.0.0.0' ? '127.0.0.1' : hostname;
}

function createLocalUrl(hostname, port) {
	return `http://${hostname}:${port}`;
}

function isPermissionDeniedBindError(error) {
	return error?.code === 'EPERM' || error?.code === 'EACCES';
}

function formatBindTarget(hostname, port) {
	return `${hostname}:${port}`;
}

function formatAlternatePortCommand(port) {
	return `AMS_APP_PORT=${port} npm run app:server:start`;
}

function chooseAlternatePort(port) {
	if (!Number.isInteger(port) || port < 0 || port >= 65_535) {
		return 0;
	}

	return port + 1;
}

export async function probeListenTarget(hostname, port) {
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
				error: {
					code: error?.code ?? 'UNKNOWN',
					message: error instanceof Error ? error.message : String(error),
					errno: error?.errno ?? null,
					syscall: error?.syscall ?? 'listen',
					address: error?.address ?? hostname,
					port: error?.port ?? port
				}
			});
		});

		server.listen({ host: hostname, port }, () => {
			server.close(() => {
				finish({ ok: true });
			});
		});
	});
}

export function formatBindFailureMessage(
	hostname,
	port,
	bindResult,
	alternatePort,
	alternateResult
) {
	const target = formatBindTarget(hostname, port);
	const code = bindResult?.error?.code ?? 'UNKNOWN';

	if (code === 'EADDRINUSE') {
		const alternateHint =
			alternatePort > 0
				? ` If you want a second local instance, try \`${formatAlternatePortCommand(alternatePort)}\`.`
				: '';
		return `Port ${target} is already in use.${alternateHint}`;
	}

	if (isPermissionDeniedBindError(bindResult?.error)) {
		if (alternateResult?.ok && alternatePort > 0) {
			return `Binding to ${target} is not permitted (${code}), but ${formatBindTarget(hostname, alternatePort)} is available. Restart on an alternate port with \`${formatAlternatePortCommand(alternatePort)}\`.`;
		}

		if (isPermissionDeniedBindError(alternateResult?.error) && alternatePort > 0) {
			return `Binding to ${target} is not permitted (${code}). Probing ${formatBindTarget(hostname, alternatePort)} failed with the same restriction, which suggests this environment blocks local listeners for the operator.`;
		}

		if (alternateResult?.error?.code === 'EADDRINUSE' && alternatePort > 0) {
			return `Binding to ${target} is not permitted (${code}). ${formatBindTarget(hostname, alternatePort)} is already in use, so pick another \`AMS_APP_PORT\` or run the operator in a less restricted environment.`;
		}

		return `Binding to ${target} is not permitted (${code}). ${bindResult?.error?.message ?? 'The local listener could not be created.'}`;
	}

	return `Could not bind the operator server to ${target}. ${bindResult?.error?.message ?? 'The local listener probe failed.'}`;
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

function resolveBuildPaths(repoRoot = REPO_ROOT) {
	const buildRoot = resolve(repoRoot, 'build');
	return {
		repoRoot,
		buildRoot,
		buildClientRoot: resolve(buildRoot, 'client'),
		buildEntryPath: resolve(buildRoot, 'index.js'),
		buildHandlerPath: resolve(buildRoot, 'handler.js'),
		buildServerIndexPath: resolve(buildRoot, 'server', 'index.js'),
		buildManifestPath: resolve(buildRoot, 'server', 'manifest.js')
	};
}

const BUILD_PATHS = resolveBuildPaths();
const { buildEntryPath: BUILD_ENTRY_PATH } = BUILD_PATHS;

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

async function readText(path) {
	try {
		return await readFile(path, 'utf8');
	} catch {
		return '';
	}
}

async function readRuntimeLogText() {
	const [serverLogText, launchdLogText] = await Promise.all([
		readText(LOG_PATH),
		readText(LAUNCHD_LOG_PATH)
	]);

	return `${serverLogText}\n${launchdLogText}`;
}

function readCommandOutput(command, args) {
	try {
		return execFileSync(command, args, {
			cwd: REPO_ROOT,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore']
		}).trim();
	} catch {
		return '';
	}
}

function findListeningPids(port) {
	if (process.platform === 'win32') {
		return [];
	}

	const output = readCommandOutput('lsof', ['-tiTCP:' + String(port), '-sTCP:LISTEN', '-n', '-P']);

	return output
		.split('\n')
		.map((value) => Number.parseInt(value.trim(), 10))
		.filter((value) => Number.isInteger(value) && value > 0);
}

function readProcessArgs(pid) {
	if (!pid || process.platform === 'win32') {
		return '';
	}

	return readCommandOutput('ps', ['-p', String(pid), '-o', 'args=']);
}

function isExpectedOperatorProcess(pid) {
	const args = readProcessArgs(pid);
	return args.includes(BUILD_ENTRY_PATH);
}

export function hasMissingBuildChunkError(logText) {
	const latestStartupIndex = logText.lastIndexOf('Listening on ');
	const latestRuntimeLog = latestStartupIndex >= 0 ? logText.slice(latestStartupIndex) : logText;
	return /Cannot find module '.+\/build\/server\/chunks\/[^']+'/.test(latestRuntimeLog);
}

function formatBuildValidationError(error) {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}

function formatErrorMessage(error) {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}

export function isNativeModuleVersionMismatch(error) {
	const message = formatErrorMessage(error);

	return (
		message.includes('NODE_MODULE_VERSION') &&
		message.includes('compiled against a different Node.js version')
	);
}

export function formatNativeDependencyRecoveryMessage(validation, options = {}) {
	const rebuildAttempted = options.rebuildAttempted === true;
	const runtimeDescription = `Node ${validation.nodeVersion} (NODE_MODULE_VERSION ${validation.nodeModuleVersion})`;
	const rebuildCommand = 'npm rebuild better-sqlite3';
	const installCommand = 'npm install';
	const reason = validation.reason ?? 'better-sqlite3 could not be loaded.';

	if (validation.kind === 'node_module_version_mismatch') {
		const prefix = rebuildAttempted
			? 'better-sqlite3 is still incompatible after an automatic rebuild.'
			: 'better-sqlite3 was built for a different Node runtime.';
		return `${prefix} Current runtime: ${runtimeDescription}. ${reason} Run \`${rebuildCommand}\` from ${REPO_ROOT}, or run \`${installCommand}\` to reinstall dependencies for the active Node version, then retry \`npm run app:server:start\`.`;
	}

	return `better-sqlite3 failed runtime validation before operator startup. Current runtime: ${runtimeDescription}. ${reason} Run \`${rebuildCommand}\` from ${REPO_ROOT}, or run \`${installCommand}\` if dependencies were installed under another Node version, then retry \`npm run app:server:start\`.`;
}

export async function validateBetterSqliteRuntime(options = {}) {
	const importBetterSqlite = options.importBetterSqlite ?? (() => import('better-sqlite3'));
	const nodeVersion = options.nodeVersion ?? process.version;
	const nodeModuleVersion = options.nodeModuleVersion ?? process.versions.modules ?? 'unknown';

	try {
		const module = await importBetterSqlite();
		const Database = module.default ?? module;
		const db = new Database(':memory:');

		try {
			const row = db.prepare('select 1 as value').get();

			if (row?.value !== 1) {
				return {
					ok: false,
					kind: 'validation_failed',
					nodeVersion,
					nodeModuleVersion,
					reason: 'In-memory sqlite validation query returned an unexpected result.'
				};
			}
		} finally {
			db.close();
		}

		return {
			ok: true,
			nodeVersion,
			nodeModuleVersion
		};
	} catch (error) {
		return {
			ok: false,
			kind: isNativeModuleVersionMismatch(error) ? 'node_module_version_mismatch' : 'load_failed',
			nodeVersion,
			nodeModuleVersion,
			reason: formatErrorMessage(error)
		};
	}
}

function findMissingBuildArtifact(...paths) {
	return paths.find((path) => !existsSync(path)) ?? null;
}

function collectManifestClientAssets(manifest) {
	const client = manifest?._?.client;
	const assetPaths = [
		client?.start,
		client?.app,
		...(Array.isArray(client?.imports) ? client.imports : []),
		...(Array.isArray(client?.stylesheets) ? client.stylesheets : []),
		...(Array.isArray(client?.fonts) ? client.fonts : [])
	];

	return [...new Set(assetPaths.filter((value) => typeof value === 'string' && value.length > 0))];
}

async function importBuildModule(path) {
	return import(createModuleUrl(path));
}

async function writeStatus(status) {
	await writeFile(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`);
}

async function resolveLiveOperatorStatus(hostname, port) {
	const logText = await readRuntimeLogText();

	if (hasMissingBuildChunkError(logText)) {
		return null;
	}

	const probeHost = resolveProbeHost(hostname);
	const localUrl = createLocalUrl(probeHost, port);
	const livePids = findListeningPids(port);

	for (const pid of livePids) {
		if (isExpectedOperatorProcess(pid)) {
			const status = {
				startedAt: new Date().toISOString(),
				pid,
				host: hostname,
				port,
				localUrl,
				logPath: LOG_PATH,
				source: 'recovered'
			};
			await writeStatus(status);
			return status;
		}
	}

	return null;
}

async function readCurrentOrRecoveredStatus(hostname, port) {
	const storedStatus = await readJson(STATUS_PATH);

	if (storedStatus && processIsAlive(storedStatus.pid)) {
		return storedStatus;
	}

	const recoveredStatus = await resolveLiveOperatorStatus(hostname, port);

	if (recoveredStatus) {
		return recoveredStatus;
	}

	if (storedStatus) {
		await rm(STATUS_PATH, { force: true });
	}

	return null;
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

async function stopUnhealthyOperatorIfNeeded(port) {
	const logText = await readRuntimeLogText();

	if (!hasMissingBuildChunkError(logText)) {
		return false;
	}

	let stopped = false;

	for (const pid of findListeningPids(port)) {
		if (!isExpectedOperatorProcess(pid)) {
			continue;
		}

		await stopProcessGroup(pid);
		stopped = true;
	}

	if (stopped) {
		await rm(STATUS_PATH, { force: true });
		await sleep(1000);
	}

	return stopped;
}

export async function validateBuildArtifacts(buildPaths = BUILD_PATHS) {
	const {
		buildClientRoot,
		buildEntryPath,
		buildHandlerPath,
		buildServerIndexPath,
		buildManifestPath
	} = buildPaths;

	const missingArtifact = findMissingBuildArtifact(
		buildEntryPath,
		buildHandlerPath,
		buildServerIndexPath,
		buildManifestPath
	);

	if (missingArtifact) {
		return {
			ok: false,
			reason: `Missing build artifact at ${missingArtifact}.`
		};
	}

	try {
		await importBuildModule(buildHandlerPath);
	} catch (error) {
		return {
			ok: false,
			reason: `Build startup imports are invalid: ${formatBuildValidationError(error)}`
		};
	}

	let manifest;
	try {
		({ manifest } = await importBuildModule(buildManifestPath));
	} catch (error) {
		return {
			ok: false,
			reason: `Failed to import the server manifest: ${formatBuildValidationError(error)}`
		};
	}

	for (const clientAssetPath of collectManifestClientAssets(manifest)) {
		const resolvedClientAssetPath = resolve(buildClientRoot, clientAssetPath);
		if (!existsSync(resolvedClientAssetPath)) {
			return {
				ok: false,
				reason: `Server manifest references a missing client asset at ${resolvedClientAssetPath}.`
			};
		}
	}

	try {
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
			reason: `Server manifest imports are invalid: ${formatBuildValidationError(error)}`
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

async function rebuildBetterSqlite() {
	await runCommand(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['rebuild', 'better-sqlite3']);
}

export async function recoverBetterSqliteRuntime(options = {}) {
	const validateRuntime = options.validateRuntime ?? validateBetterSqliteRuntime;
	const rebuildNativeDependency = options.rebuildNativeDependency ?? rebuildBetterSqlite;
	const validation = await validateRuntime();

	if (validation.ok) {
		return { ok: true, recovered: false, validation };
	}

	if (validation.kind !== 'node_module_version_mismatch') {
		return { ok: false, rebuildAttempted: false, validation };
	}

	await rebuildNativeDependency();
	const revalidated = await validateRuntime();

	if (revalidated.ok) {
		return {
			ok: true,
			recovered: true,
			validation: revalidated,
			initialValidation: validation
		};
	}

	return {
		ok: false,
		rebuildAttempted: true,
		validation: revalidated,
		initialValidation: validation
	};
}

async function ensureNativeDependenciesReady() {
	const result = await recoverBetterSqliteRuntime();

	if (result.ok) {
		if (result.recovered) {
			printHeader('Rebuilt native database dependency');
			process.stdout.write('better-sqlite3 now matches the active Node runtime.\n');
		}

		return;
	}

	failWithMessage(
		formatNativeDependencyRecoveryMessage(result.validation, {
			rebuildAttempted: result.rebuildAttempted
		})
	);
}

async function startServer() {
	await ensureNativeDependenciesReady();
	await ensureBuildReady();
	await ensureOutputDir();

	const hostname = DEFAULT_HOST;
	const port = DEFAULT_PORT;
	const probeHost = resolveProbeHost(hostname);
	const localUrl = createLocalUrl(probeHost, port);
	await stopUnhealthyOperatorIfNeeded(port);
	const currentStatus = await readJson(STATUS_PATH);

	if (currentStatus && processIsAlive(currentStatus.pid)) {
		if (currentStatus.host !== hostname || currentStatus.port !== port) {
			failWithMessage(
				`Operator server is already running on ${currentStatus.localUrl}. Stop it before starting a different bind target at ${localUrl}.`
			);
		}

		printHeader('Operator server already running');
		process.stdout.write(`Local: ${currentStatus.localUrl}\n`);
		process.stdout.write(`Log: ${currentStatus.logPath}\n`);
		return;
	}

	if (currentStatus) {
		await rm(STATUS_PATH, { force: true });
	}

	const recoveredStatus = await resolveLiveOperatorStatus(hostname, port);

	if (recoveredStatus) {
		printHeader('Operator server already running');
		process.stdout.write(`Local: ${recoveredStatus.localUrl}\n`);
		process.stdout.write(`Log: ${recoveredStatus.logPath}\n`);
		return;
	}

	const bindProbe = await probeListenTarget(hostname, port);

	if (!bindProbe.ok) {
		const alternatePort = chooseAlternatePort(port);
		const alternateProbe =
			alternatePort !== port ? await probeListenTarget(hostname, alternatePort) : null;
		failWithMessage(
			formatBindFailureMessage(hostname, port, bindProbe, alternatePort, alternateProbe)
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

	await writeStatus(status);
	child.unref();

	printHeader('Operator server started');
	process.stdout.write(`Local: ${localUrl}\n`);
	process.stdout.write(`Log: ${LOG_PATH}\n`);
}

async function stopServer() {
	const status = await readCurrentOrRecoveredStatus(DEFAULT_HOST, DEFAULT_PORT);

	if (!status) {
		process.stdout.write('Operator server is not running.\n');
		return;
	}

	if (!processIsAlive(status.pid)) {
		await rm(STATUS_PATH, { force: true });
		process.stdout.write('Operator server is not running.\n');
		return;
	}

	await stopProcessGroup(status.pid);
	await rm(STATUS_PATH, { force: true });
	process.stdout.write('Operator server stopped.\n');
}

async function showStatus() {
	const status = await readCurrentOrRecoveredStatus(DEFAULT_HOST, DEFAULT_PORT);

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
	if (status.source === 'recovered') {
		process.stdout.write('Source: recovered from live listener\n');
	}
}

async function runForegroundServer() {
	await ensureNativeDependenciesReady();
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

async function main() {
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
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;

if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
	await main();
}
