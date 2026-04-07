import { accessSync, constants, existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, relative, resolve } from 'node:path';
import { normalizePathListInput } from '$lib/server/path-tools';
import type { AgentSandbox } from '$lib/types/agent-thread';

type WorkspaceCheckInput = {
	cwd: string;
	sandbox: AgentSandbox;
	scopeLabel?: string;
	additionalWritableRoots?: string[];
};

export type LocalPathAccessMode = 'read' | 'read_write';
export type LocalPathAccessStatus =
	| 'not_configured'
	| 'ready'
	| 'missing'
	| 'needs_host_access'
	| 'macos_cloud_probe_blocked';
export type LocalPathSandboxCoverage =
	| 'not_configured'
	| 'project_root'
	| 'additional_writable_root'
	| 'danger_full_access'
	| 'outside_sandbox';

export type LocalPathAccessReport = {
	path: string;
	status: LocalPathAccessStatus;
	message: string;
	guidance: string | null;
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

function formatHostAccessGuidance(path: string) {
	if (process.platform === 'darwin' && path.includes('/Library/Mobile Documents/')) {
		return 'Grant Files and Folders or iCloud Drive access to the app or terminal running Codex, or move the workspace to a locally accessible folder.';
	}

	return 'This is a host OS permission problem, not a Codex sandbox restriction.';
}

function isInconclusiveMacCloudPermissionError(path: string, error: unknown) {
	const code = typeof error === 'object' && error && 'code' in error ? error.code : null;

	return (
		process.platform === 'darwin' &&
		path.includes('/Library/Mobile Documents/') &&
		(code === 'EPERM' || code === 'EACCES')
	);
}

function getAccessMode(mode: LocalPathAccessMode) {
	return mode === 'read_write' ? constants.R_OK | constants.W_OK : constants.R_OK;
}

function isPathWithinRoot(path: string, root: string) {
	const normalizedPath = resolve(path);
	const normalizedRoot = resolve(root);

	if (normalizedPath === normalizedRoot) {
		return true;
	}

	const relativePath = relative(normalizedRoot, normalizedPath);
	return Boolean(relativePath) && !relativePath.startsWith('..') && !isAbsolute(relativePath);
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

export function normalizeAdditionalWritableRoots(
	cwd: string,
	additionalWritableRoots: string[] | null | undefined
) {
	const normalizedCwd = cwd.trim();
	return normalizePathListInput(additionalWritableRoots).filter((path) => path !== normalizedCwd);
}

export function probeLocalPathAccess(input: {
	path: string;
	mode?: LocalPathAccessMode;
	allowMacCloudProbeFailure?: boolean;
}) {
	const path = input.path.trim();

	if (!path) {
		return {
			path,
			status: 'not_configured',
			message: 'No path configured yet.',
			guidance: 'Add an absolute folder path to manage access here.'
		} satisfies LocalPathAccessReport;
	}

	if (!existsSync(path)) {
		return {
			path,
			status: 'missing',
			message: 'This path does not exist.',
			guidance: 'Create the folder or update the project path before launching work.'
		} satisfies LocalPathAccessReport;
	}

	try {
		accessSync(path, getAccessMode(input.mode ?? 'read'));
		return {
			path,
			status: 'ready',
			message: 'Accessible to the current app process.',
			guidance: null
		} satisfies LocalPathAccessReport;
	} catch (error) {
		if (input.allowMacCloudProbeFailure && isInconclusiveMacCloudPermissionError(path, error)) {
			return {
				path,
				status: 'macos_cloud_probe_blocked',
				message: 'macOS blocked the direct access probe for this cloud-synced folder.',
				guidance:
					'AMS will still let a danger-full-access run try the real Codex launch path, but Files and Folders or iCloud Drive approval may still be required.'
			} satisfies LocalPathAccessReport;
		}

		return {
			path,
			status: 'needs_host_access',
			message: formatWorkspaceAccessFailure(error),
			guidance: formatHostAccessGuidance(path)
		} satisfies LocalPathAccessReport;
	}
}

export function getLocalPathSandboxCoverage(input: {
	cwd: string;
	path: string;
	sandbox: AgentSandbox;
	additionalWritableRoots?: string[] | null | undefined;
}): LocalPathSandboxCoverage {
	const path = input.path.trim();

	if (!path) {
		return 'not_configured';
	}

	if (input.sandbox === 'danger-full-access') {
		return 'danger_full_access';
	}

	if (!input.cwd.trim()) {
		return 'outside_sandbox';
	}

	if (isPathWithinRoot(path, input.cwd)) {
		return 'project_root';
	}

	for (const root of normalizeAdditionalWritableRoots(input.cwd, input.additionalWritableRoots)) {
		if (isPathWithinRoot(path, root)) {
			return 'additional_writable_root';
		}
	}

	return 'outside_sandbox';
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

	const accessTargets = [
		{ label: input.scopeLabel ?? 'Workspace', path: cwd },
		...normalizeAdditionalWritableRoots(cwd, input.additionalWritableRoots).map((path, index) => ({
			label: `Additional writable root ${index + 1}`,
			path
		}))
	];

	if (input.sandbox === 'danger-full-access') {
		for (const target of accessTargets) {
			const report = probeLocalPathAccess({
				path: target.path,
				mode: 'read',
				allowMacCloudProbeFailure: true
			});

			if (report.status === 'missing') {
				return `${target.label} does not exist: ${target.path}.`;
			}

			if (report.status === 'macos_cloud_probe_blocked') {
				continue;
			}

			if (report.status === 'needs_host_access') {
				return `${target.label} exists but the current app process cannot access it: ${target.path}. ${report.message} ${report.guidance}`;
			}
		}

		return null;
	}

	for (const target of accessTargets) {
		const report = probeLocalPathAccess({
			path: target.path,
			mode: input.sandbox === 'read-only' ? 'read' : 'read_write'
		});

		if (report.status === 'missing') {
			return `${target.label} does not exist: ${target.path}.`;
		}

		if (report.status !== 'ready') {
			return `${target.label} cannot be used with the ${input.sandbox} sandbox: ${target.path}. ${report.message}`;
		}
	}

	return null;
}
