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

function buildManagedRunFeatureArgs() {
	// Background task runs do not need ChatGPT app discovery. Disabling Apps avoids
	// startup failures when the connector directory endpoint returns non-JSON auth pages.
	return ['--disable', 'apps'];
}

function buildManagedRunConfigArgs() {
	// Managed background runs should not fail just because a developer's personal MCP
	// server auth state is stale. The Supabase MCP is configured globally on this machine
	// but is unrelated to local repo task execution in this prototype.
	return ['-c', 'mcp_servers.supabase.enabled=false'];
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
		args.push(...buildManagedRunFeatureArgs());
		args.push(...buildManagedRunConfigArgs());
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
		...buildManagedRunFeatureArgs(),
		...buildManagedRunConfigArgs(),
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
