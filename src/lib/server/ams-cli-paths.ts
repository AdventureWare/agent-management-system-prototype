import { resolve } from 'node:path';

export const AMS_CONTROL_PLANE_ROOT =
	process.env.AMS_CONTROL_PLANE_PROJECT_ROOT?.trim() || process.cwd();

export const AMS_CLI_SCRIPT_PATH = resolve(AMS_CONTROL_PLANE_ROOT, 'scripts', 'ams-cli.mjs');
export const AMS_THREAD_CLI_SCRIPT_PATH = resolve(
	AMS_CONTROL_PLANE_ROOT,
	'scripts',
	'agent-thread-cli.mjs'
);
export const AMS_CLI_DOCS_PATH = resolve(AMS_CONTROL_PLANE_ROOT, 'docs', 'ams-cli-reference.md');

function quoteShellPath(path: string) {
	return JSON.stringify(path);
}

export function buildAmsCliCommand(args = '') {
	return `node ${quoteShellPath(AMS_CLI_SCRIPT_PATH)}${args ? ` ${args}` : ''}`;
}

export function buildAgentThreadCliCommand(args = '') {
	return `node ${quoteShellPath(AMS_THREAD_CLI_SCRIPT_PATH)}${args ? ` ${args}` : ''}`;
}

export function rewriteManagedRunCliCommand(command: string) {
	return command
		.replace(/^node scripts\/ams-cli\.mjs\b/, `node ${quoteShellPath(AMS_CLI_SCRIPT_PATH)}`)
		.replace(
			/^node scripts\/agent-thread-cli\.mjs\b/,
			`node ${quoteShellPath(AMS_THREAD_CLI_SCRIPT_PATH)}`
		);
}
