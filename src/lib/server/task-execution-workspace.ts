import { accessSync, constants, existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import type { AgentSandbox } from '$lib/types/agent-session';

type WorkspaceCheckInput = {
	cwd: string;
	sandbox: AgentSandbox;
	scopeLabel?: string;
};

function formatWorkspaceAccessFailure(error: unknown) {
	const code = typeof error === 'object' && error && 'code' in error ? error.code : null;

	switch (code) {
		case 'EPERM':
			return 'Operation not permitted (EPERM).';
		case 'EACCES':
			return 'Permission denied (EACCES).';
		case 'ENOENT':
			return 'The path no longer exists.';
		default:
			if (error instanceof Error) {
				return error.message;
			}

			return 'The workspace could not be accessed.';
	}
}

function formatHostAccessIssue(input: WorkspaceCheckInput, error: unknown) {
	const base = `${
		input.scopeLabel ?? 'Workspace'
	} exists but the current app process cannot access it: ${input.cwd}. ${formatWorkspaceAccessFailure(error)}`;

	if (process.platform === 'darwin' && input.cwd.includes('/Library/Mobile Documents/')) {
		return `${base} Grant Files and Folders or iCloud Drive access to the app or terminal running Codex, or move the workspace to a locally accessible folder.`;
	}

	return `${base} This is a host OS permission problem, not a Codex sandbox restriction.`;
}

function formatSkillValidationFailure(error: unknown) {
	if (error instanceof Error && error.message.trim()) {
		return error.message.trim();
	}

	return 'The skill file could not be read.';
}

function hasYamlFrontmatter(content: string) {
	return /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content);
}

function listSkillFiles(root: string) {
	if (!existsSync(root)) {
		return [];
	}

	try {
		return readdirSync(root, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => resolve(root, entry.name, 'SKILL.md'))
			.filter((skillPath) => existsSync(skillPath));
	} catch {
		return [];
	}
}

export function getCodexSkillExecutionIssue(
	cwd: string,
	codexHome = process.env.CODEX_HOME?.trim() || resolve(homedir(), '.codex')
) {
	const skillRoots = [
		{
			label: 'Global Codex skill',
			root: resolve(codexHome, 'skills')
		},
		{
			label: 'Project Codex skill',
			root: resolve(cwd, '.agents')
		},
		{
			label: 'Project Codex skill',
			root: resolve(cwd, '.agents', 'skills')
		}
	];

	for (const source of skillRoots) {
		for (const skillPath of listSkillFiles(source.root)) {
			try {
				const content = readFileSync(skillPath, 'utf8');

				if (!hasYamlFrontmatter(content)) {
					return `${source.label} is invalid: ${skillPath}. Add YAML frontmatter delimited by --- at the top of the file or remove the broken skill before launching a work thread.`;
				}
			} catch (error) {
				return `${source.label} could not be read: ${skillPath}. ${formatSkillValidationFailure(error)}`;
			}
		}
	}

	return null;
}

export function getWorkspaceExecutionIssue(input: WorkspaceCheckInput) {
	const cwd = input.cwd.trim();

	if (!cwd) {
		return `${input.scopeLabel ?? 'Workspace'} is not configured.`;
	}

	if (!existsSync(cwd)) {
		return `${input.scopeLabel ?? 'Workspace'} does not exist: ${cwd}.`;
	}

	if (input.sandbox === 'danger-full-access') {
		try {
			accessSync(cwd, constants.R_OK);
			return null;
		} catch (error) {
			return formatHostAccessIssue({ ...input, cwd }, error);
		}
	}

	const mode = input.sandbox === 'read-only' ? constants.R_OK : constants.R_OK | constants.W_OK;

	try {
		accessSync(cwd, mode);
		return null;
	} catch (error) {
		return `${
			input.scopeLabel ?? 'Workspace'
		} cannot be used with the ${input.sandbox} sandbox: ${cwd}. ${formatWorkspaceAccessFailure(error)}`;
	}
}
