/**
 * @param {'read-only' | 'workspace-write' | 'danger-full-access'} sandbox
 */
function buildResumeSandboxArgs(sandbox) {
	if (sandbox === 'workspace-write') {
		return ['--full-auto'];
	}

	if (sandbox === 'danger-full-access') {
		return ['--dangerously-bypass-approvals-and-sandbox'];
	}

	return [];
}

/**
 * @param {{
 *   mode: 'start' | 'message';
 *   cwd?: string;
 *   sandbox: 'read-only' | 'workspace-write' | 'danger-full-access';
 *   model?: string | null;
 *   threadId?: string | null;
 *   messagePath: string;
 *   prompt: string;
 * }} config
 */
export function buildCodexArgs(config) {
	const args = [];

	if (config.mode === 'message') {
		args.push('exec', 'resume', '--json', '--skip-git-repo-check');
		args.push(...buildResumeSandboxArgs(config.sandbox));

		if (config.model) {
			args.push('-m', config.model);
		}

		args.push(config.threadId, '-o', config.messagePath, config.prompt);
		return args;
	}

	args.push(
		'exec',
		'--json',
		'--skip-git-repo-check',
		'-C',
		config.cwd,
		'--sandbox',
		config.sandbox
	);

	if (config.model) {
		args.push('-m', config.model);
	}

	args.push('-o', config.messagePath, config.prompt);

	return args;
}
