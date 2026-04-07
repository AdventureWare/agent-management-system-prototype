import { beforeEach, describe, expect, it, vi } from 'vitest';

const existsSync = vi.hoisted(() => vi.fn());
const accessSync = vi.hoisted(() => vi.fn());
const readdirSync = vi.hoisted(() => vi.fn());
const readFileSync = vi.hoisted(() => vi.fn());

vi.mock('node:fs', async () => {
	const actual = await vi.importActual<typeof import('node:fs')>('node:fs');

	return {
		...actual,
		existsSync,
		accessSync,
		readdirSync,
		readFileSync
	};
});

import {
	getLocalPathSandboxCoverage,
	getCodexSkillExecutionIssue,
	getWorkspaceExecutionIssue,
	normalizeAdditionalWritableRoots,
	probeLocalPathAccess
} from './task-execution-workspace';

describe('task execution workspace checks', () => {
	beforeEach(() => {
		existsSync.mockReset();
		accessSync.mockReset();
		readdirSync.mockReset();
		readFileSync.mockReset();
	});

	it('accepts a writable workspace for workspace-write runs', () => {
		existsSync.mockReturnValue(true);
		accessSync.mockReturnValue(undefined);

		expect(
			getWorkspaceExecutionIssue({
				cwd: '/tmp/project',
				sandbox: 'workspace-write',
				scopeLabel: 'Project root'
			})
		).toBeNull();
	});

	it('reports permission issues with the selected sandbox and path', () => {
		existsSync.mockReturnValue(true);
		accessSync.mockImplementation(() => {
			const error = new Error('operation not permitted') as NodeJS.ErrnoException;
			error.code = 'EPERM';
			throw error;
		});

		expect(
			getWorkspaceExecutionIssue({
				cwd: '/restricted/project',
				sandbox: 'workspace-write',
				scopeLabel: 'Project root'
			})
		).toBe(
			'Project root cannot be used with the workspace-write sandbox: /restricted/project. Operation not permitted (EPERM).'
		);
	});

	it('validates additional writable roots alongside the project root', () => {
		existsSync.mockImplementation((path: string) =>
			new Set(['/tmp/project', '/tmp/iCloud/shared']).has(path)
		);
		accessSync.mockImplementation((path: string) => {
			if (path === '/tmp/iCloud/shared') {
				const error = new Error('operation not permitted') as NodeJS.ErrnoException;
				error.code = 'EPERM';
				throw error;
			}
		});

		expect(
			getWorkspaceExecutionIssue({
				cwd: '/tmp/project',
				additionalWritableRoots: ['/tmp/iCloud/shared'],
				sandbox: 'workspace-write',
				scopeLabel: 'Project root'
			})
		).toBe(
			'Additional writable root 1 cannot be used with the workspace-write sandbox: /tmp/iCloud/shared. Operation not permitted (EPERM).'
		);
	});

	it('requires only read access for read-only runs', () => {
		existsSync.mockReturnValue(true);
		accessSync.mockReturnValue(undefined);

		expect(
			getWorkspaceExecutionIssue({
				cwd: '/tmp/project',
				sandbox: 'read-only',
				scopeLabel: 'Ideation workspace'
			})
		).toBeNull();
	});

	it('does not block existing paths under danger-full-access', () => {
		existsSync.mockReturnValue(true);
		accessSync.mockReturnValue(undefined);

		expect(
			getWorkspaceExecutionIssue({
				cwd: '/restricted/project',
				sandbox: 'danger-full-access',
				scopeLabel: 'Project root'
			})
		).toBeNull();
		expect(accessSync).toHaveBeenCalledTimes(1);
	});

	it('does not block iCloud Drive roots under danger-full-access when app-process access is inconclusive', () => {
		existsSync.mockReturnValue(true);
		accessSync.mockImplementation(() => {
			const error = new Error('operation not permitted') as NodeJS.ErrnoException;
			error.code = 'EPERM';
			throw error;
		});

		expect(
			getWorkspaceExecutionIssue({
				cwd: '/Users/test/Library/Mobile Documents/iCloud~md~obsidian/Documents/My Vault',
				sandbox: 'danger-full-access',
				scopeLabel: 'Project root'
			})
		).toBeNull();
	});

	it('reports macOS cloud probe blocks separately when requested', () => {
		existsSync.mockReturnValue(true);
		accessSync.mockImplementation(() => {
			const error = new Error('operation not permitted') as NodeJS.ErrnoException;
			error.code = 'EPERM';
			throw error;
		});

		expect(
			probeLocalPathAccess({
				path: '/Users/test/Library/Mobile Documents/iCloud~md~obsidian/Documents/My Vault',
				mode: 'read',
				allowMacCloudProbeFailure: true
			})
		).toMatchObject({
			status: 'macos_cloud_probe_blocked'
		});
	});

	it('reports sandbox coverage for project roots, extra roots, and out-of-scope paths', () => {
		expect(
			getLocalPathSandboxCoverage({
				cwd: '/tmp/project',
				path: '/tmp/project/docs',
				sandbox: 'workspace-write',
				additionalWritableRoots: ['/tmp/iCloud/shared']
			})
		).toBe('project_root');
		expect(
			getLocalPathSandboxCoverage({
				cwd: '/tmp/project',
				path: '/tmp/iCloud/shared/client-a',
				sandbox: 'workspace-write',
				additionalWritableRoots: ['/tmp/iCloud/shared']
			})
		).toBe('additional_writable_root');
		expect(
			getLocalPathSandboxCoverage({
				cwd: '/tmp/project',
				path: '/tmp/outside',
				sandbox: 'workspace-write',
				additionalWritableRoots: ['/tmp/iCloud/shared']
			})
		).toBe('outside_sandbox');
		expect(
			getLocalPathSandboxCoverage({
				cwd: '/tmp/project',
				path: '/tmp/outside',
				sandbox: 'danger-full-access',
				additionalWritableRoots: ['/tmp/iCloud/shared']
			})
		).toBe('danger_full_access');
	});

	it('reports missing workspaces clearly', () => {
		existsSync.mockReturnValue(false);

		expect(
			getWorkspaceExecutionIssue({
				cwd: '/missing/project',
				sandbox: 'workspace-write',
				scopeLabel: 'Project root'
			})
		).toBe('Project root does not exist: /missing/project.');
	});

	it('normalizes additional writable roots by trimming, deduplicating, and removing the cwd', () => {
		expect(
			normalizeAdditionalWritableRoots('/tmp/project', [
				'/tmp/project',
				' "/tmp/iCloud/shared" ',
				'/tmp/iCloud/shared',
				'/tmp/dropbox'
			])
		).toEqual(['/tmp/iCloud/shared', '/tmp/dropbox']);
	});

	it('accepts valid skill files with YAML frontmatter', () => {
		existsSync.mockImplementation((path: string) =>
			new Set(['/fake/.codex/skills', '/fake/.codex/skills/writing/SKILL.md']).has(path)
		);
		readdirSync.mockImplementation((path: string) =>
			path === '/fake/.codex/skills' ? [{ name: 'writing', isDirectory: () => true }] : []
		);
		readFileSync.mockReturnValue(
			'---\nname: writing\ndescription: Reusable writing guidance.\n---\n\n# Writing\n'
		);

		expect(getCodexSkillExecutionIssue('/tmp/project', '/fake/.codex')).toBeNull();
	});

	it('reports malformed global skill files before launch', () => {
		existsSync.mockImplementation((path: string) =>
			new Set(['/fake/.codex/skills', '/fake/.codex/skills/writing/SKILL.md']).has(path)
		);
		readdirSync.mockImplementation((path: string) =>
			path === '/fake/.codex/skills' ? [{ name: 'writing', isDirectory: () => true }] : []
		);
		readFileSync.mockReturnValue('# writing');

		expect(getCodexSkillExecutionIssue('/tmp/project', '/fake/.codex')).toBe(
			'Global Codex skill is invalid: /fake/.codex/skills/writing/SKILL.md. Add YAML frontmatter delimited by --- at the top of the file or remove the broken skill before launching a work thread.'
		);
	});

	it('reports malformed project skill files before launch', () => {
		existsSync.mockImplementation((path: string) =>
			new Set(['/tmp/project/.agents', '/tmp/project/.agents/docs-writer/SKILL.md']).has(path)
		);
		readdirSync.mockImplementation((path: string) =>
			path === '/tmp/project/.agents' ? [{ name: 'docs-writer', isDirectory: () => true }] : []
		);
		readFileSync.mockReturnValue('# docs writer');

		expect(getCodexSkillExecutionIssue('/tmp/project', '/fake/.codex')).toBe(
			'Project Codex skill is invalid: /tmp/project/.agents/docs-writer/SKILL.md. Add YAML frontmatter delimited by --- at the top of the file or remove the broken skill before launching a work thread.'
		);
	});
});
