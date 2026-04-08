import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	createProjectCodexSkill,
	listInstalledCodexSkills,
	normalizeCodexSkillId
} from './codex-skills';

const tempRoots: string[] = [];

function createTempRoot() {
	const root = mkdtempSync(resolve(tmpdir(), 'codex-skills-'));
	tempRoots.push(root);
	return root;
}

function writeSkill(
	root: string,
	segments: string[],
	frontmatter: { name: string; description: string }
) {
	const directory = resolve(root, ...segments);
	mkdirSync(directory, { recursive: true });
	writeFileSync(
		resolve(directory, 'SKILL.md'),
		`---\nname: ${frontmatter.name}\ndescription: ${frontmatter.description}\n---\n\n# ${frontmatter.name}\n`
	);
}

afterEach(() => {
	for (const root of tempRoots.splice(0)) {
		rmSync(root, { recursive: true, force: true });
	}
});

describe('listInstalledCodexSkills', () => {
	it('returns merged project and global skills for a workspace', () => {
		const codexHome = createTempRoot();
		const projectRoot = createTempRoot();

		writeSkill(codexHome, ['skills', 'writing'], {
			name: 'writing',
			description: 'Writing guidance'
		});
		writeSkill(projectRoot, ['.agents', 'skills', 'ios-debugger-agent'], {
			name: 'ios-debugger-agent',
			description: 'Debug iOS apps'
		});
		writeSkill(projectRoot, ['.agents', 'writing'], {
			name: 'writing',
			description: 'Project writing guidance'
		});

		expect(listInstalledCodexSkills(projectRoot, codexHome)).toEqual([
			{
				description: 'Debug iOS apps',
				global: false,
				id: 'ios-debugger-agent',
				project: true,
				sourceLabel: 'Project'
			},
			{
				description: 'Project writing guidance',
				global: true,
				id: 'writing',
				project: true,
				sourceLabel: 'Global + project'
			}
		]);
	});

	it('still returns global skills when no project workspace is configured', () => {
		const codexHome = createTempRoot();

		writeSkill(codexHome, ['skills', 'skill-installer'], {
			name: 'skill-installer',
			description: 'Install skills'
		});

		expect(listInstalledCodexSkills('', codexHome)).toEqual([
			{
				description: 'Install skills',
				global: true,
				id: 'skill-installer',
				project: false,
				sourceLabel: 'Global'
			}
		]);
	});
});

describe('normalizeCodexSkillId', () => {
	it('normalizes free-form labels into repo-safe skill ids', () => {
		expect(normalizeCodexSkillId(' Docs Writer / Internal ')).toBe('docs-writer-internal');
	});
});

describe('createProjectCodexSkill', () => {
	it('creates a project-local skill scaffold and invalidates cached discovery', () => {
		const codexHome = createTempRoot();
		const projectRoot = createTempRoot();

		expect(listInstalledCodexSkills(projectRoot, codexHome)).toEqual([]);

		const createdSkill = createProjectCodexSkill({
			projectRootFolder: projectRoot,
			skillId: 'Docs Writer',
			description: 'Project-specific documentation workflow guidance.'
		});

		expect(createdSkill.skillId).toBe('docs-writer');
		expect(listInstalledCodexSkills(projectRoot, codexHome)).toEqual([
			expect.objectContaining({
				id: 'docs-writer',
				description: 'Project-specific documentation workflow guidance.',
				project: true,
				global: false
			})
		]);
	});

	it('rejects duplicate project-local skills', () => {
		const projectRoot = createTempRoot();

		createProjectCodexSkill({
			projectRootFolder: projectRoot,
			skillId: 'docs-writer',
			description: 'Project-specific documentation workflow guidance.'
		});

		expect(() =>
			createProjectCodexSkill({
				projectRootFolder: projectRoot,
				skillId: 'docs-writer',
				description: 'Another description.'
			})
		).toThrow('Project skill "docs-writer" already exists.');
	});
});
