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

import { getCodexSkillExecutionIssue, getWorkspaceExecutionIssue } from './task-execution-workspace';

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

	it('reports host access issues under danger-full-access without blaming the sandbox', () => {
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
		).toBe(
			'Project root exists but the current app process cannot access it: /Users/test/Library/Mobile Documents/iCloud~md~obsidian/Documents/My Vault. Operation not permitted (EPERM). Grant Files and Folders or iCloud Drive access to the app or terminal running Codex, or move the workspace to a locally accessible folder.'
		);
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

	it('accepts valid skill files with YAML frontmatter', () => {
		existsSync.mockImplementation((path: string) =>
			new Set(['/fake/.codex/skills', '/fake/.codex/skills/writing/SKILL.md']).has(path)
		);
		readdirSync.mockImplementation((path: string) =>
			path === '/fake/.codex/skills'
				? [{ name: 'writing', isDirectory: () => true }]
				: []
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
			path === '/fake/.codex/skills'
				? [{ name: 'writing', isDirectory: () => true }]
				: []
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
			path === '/tmp/project/.agents'
				? [{ name: 'docs-writer', isDirectory: () => true }]
				: []
		);
		readFileSync.mockReturnValue('# docs writer');

		expect(getCodexSkillExecutionIssue('/tmp/project', '/fake/.codex')).toBe(
			'Project Codex skill is invalid: /tmp/project/.agents/docs-writer/SKILL.md. Add YAML frontmatter delimited by --- at the top of the file or remove the broken skill before launching a work thread.'
		);
	});
});
