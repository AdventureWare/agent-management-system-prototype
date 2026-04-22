import { mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const OUTPUT_DIR = resolve(REPO_ROOT, 'agent_output', 'operator-server');
const PLIST_LABEL =
	process.env.AMS_LAUNCHD_LABEL?.trim() ||
	'com.colinfreed.agent-management-system-prototype.operator-server';
const LAUNCH_AGENTS_DIR = resolve(homedir(), 'Library', 'LaunchAgents');
const PLIST_PATH = resolve(LAUNCH_AGENTS_DIR, `${PLIST_LABEL}.plist`);
const UID = String(process.getuid());
const NODE_BINARY_PATH = process.execPath;

function escapePlistValue(value) {
	return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function failWithMessage(message) {
	process.stderr.write(`${message}\n`);
	process.exit(1);
}

function runLaunchctl(args, { allowFailure = false } = {}) {
	const result = spawnSync('launchctl', args, { encoding: 'utf8' });

	if (result.status !== 0 && !allowFailure) {
		failWithMessage(result.stderr.trim() || result.stdout.trim() || 'launchctl command failed.');
	}

	return result;
}

function renderPlist() {
	const stdoutPath = resolve(OUTPUT_DIR, 'launchd.log');
	const escapedRepoRoot = escapePlistValue(REPO_ROOT);
	const escapedStdout = escapePlistValue(stdoutPath);
	const escapedNodeBinary = escapePlistValue(NODE_BINARY_PATH);

	return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>${PLIST_LABEL}</string>
	<key>WorkingDirectory</key>
	<string>${escapedRepoRoot}</string>
	<key>ProgramArguments</key>
	<array>
		<string>${escapedNodeBinary}</string>
		<string>--env-file-if-exists=.env.local</string>
		<string>scripts/operator-server.mjs</string>
		<string>run</string>
	</array>
	<key>RunAtLoad</key>
	<true/>
	<key>KeepAlive</key>
	<true/>
	<key>StandardOutPath</key>
	<string>${escapedStdout}</string>
	<key>StandardErrorPath</key>
	<string>${escapedStdout}</string>
</dict>
</plist>
`;
}

async function installLaunchAgent() {
	await mkdir(LAUNCH_AGENTS_DIR, { recursive: true });
	await mkdir(OUTPUT_DIR, { recursive: true });
	await writeFile(PLIST_PATH, renderPlist());

	runLaunchctl(['bootout', `gui/${UID}`, PLIST_PATH], { allowFailure: true });
	runLaunchctl(['bootstrap', `gui/${UID}`, PLIST_PATH]);

	process.stdout.write(`Installed launch agent at ${PLIST_PATH}.\n`);
	process.stdout.write(`Label: ${PLIST_LABEL}\n`);
}

async function uninstallLaunchAgent() {
	if (existsSync(PLIST_PATH)) {
		runLaunchctl(['bootout', `gui/${UID}`, PLIST_PATH], { allowFailure: true });
		await rm(PLIST_PATH, { force: true });
		process.stdout.write(`Removed launch agent ${PLIST_LABEL}.\n`);
		return;
	}

	process.stdout.write('Launch agent is not installed.\n');
}

async function showLaunchAgentStatus() {
	process.stdout.write(`Label: ${PLIST_LABEL}\n`);
	process.stdout.write(`Plist: ${PLIST_PATH}\n`);

	if (!existsSync(PLIST_PATH)) {
		process.stdout.write('State: not installed\n');
		return;
	}

	const result = runLaunchctl(['print', `gui/${UID}/${PLIST_LABEL}`], { allowFailure: true });

	if (result.status !== 0) {
		process.stdout.write('State: installed but not loaded\n');
		return;
	}

	process.stdout.write(result.stdout);
}

const command = process.argv[2] ?? 'status';

switch (command) {
	case 'install':
		await installLaunchAgent();
		break;
	case 'uninstall':
		await uninstallLaunchAgent();
		break;
	case 'status':
		await showLaunchAgentStatus();
		break;
	default:
		failWithMessage('Unknown command. Use install, uninstall, or status.');
}
