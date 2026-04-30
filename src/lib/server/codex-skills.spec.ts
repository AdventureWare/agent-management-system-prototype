import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	archiveProjectCodexSkill,
	createProjectCodexSkill,
	listInstalledCodexSkills,
	normalizeCodexSkillId,
	writeProjectCodexSkill
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

	it('also reads project-local skills from the non-hidden agents fallback path', () => {
		const projectRoot = createTempRoot();

		writeSkill(projectRoot, ['agents', 'skills', 'role-creator'], {
			name: 'role-creator',
			description: 'Create and refine role definitions'
		});

		expect(listInstalledCodexSkills(projectRoot, createTempRoot())).toEqual([
			{
				description: 'Create and refine role definitions',
				global: false,
				id: 'role-creator',
				project: true,
				sourceLabel: 'Project'
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
		expect(readFileSync(createdSkill.openAIYamlPath, 'utf8')).toContain(
			'display_name: "Docs Writer"'
		);
		expect(readFileSync(createdSkill.openAIYamlPath, 'utf8')).toContain(
			'default_prompt: "Use $docs-writer'
		);
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

	it('writes companion reference files under references/', () => {
		const projectRoot = createTempRoot();

		const createdSkill = writeProjectCodexSkill({
			projectRootFolder: projectRoot,
			skillId: 'launch-context',
			description: 'Guide task launch context and prompt-skill handoff.',
			bodyMarkdown: '# launch-context\n\n## When to use this skill\n',
			referenceFiles: [
				{
					path: 'references/context.md',
					content: '# Context\n\nLaunch details.'
				}
			],
			scriptFiles: [
				{
					path: 'scripts/check-context.sh',
					content: '#!/usr/bin/env bash\necho "checking context"'
				}
			]
		});

		expect(createdSkill.referenceFilePaths).toHaveLength(1);
		expect(readFileSync(createdSkill.referenceFilePaths[0], 'utf8')).toContain('Launch details.');
		expect(createdSkill.scriptFilePaths).toHaveLength(1);
		expect(readFileSync(createdSkill.scriptFilePaths[0], 'utf8')).toContain('checking context');
	});

	it('archives a project-local skill and invalidates discovery', () => {
		const codexHome = createTempRoot();
		const projectRoot = createTempRoot();

		createProjectCodexSkill({
			projectRootFolder: projectRoot,
			skillId: 'docs-writer',
			description: 'Project-specific documentation workflow guidance.'
		});

		expect(listInstalledCodexSkills(projectRoot, codexHome)).toHaveLength(1);

		const archived = archiveProjectCodexSkill({
			projectRootFolder: projectRoot,
			skillId: 'docs-writer'
		});

		expect(archived.archiveDirectory).toContain('skills-archive/docs-writer-');
		expect(readFileSync(resolve(archived.archiveDirectory, 'SKILL.md'), 'utf8')).toContain(
			'name: docs-writer'
		);
		expect(listInstalledCodexSkills(projectRoot, codexHome)).toEqual([]);
	});
});
