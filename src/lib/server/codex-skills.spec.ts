import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { listInstalledCodexSkills } from './codex-skills';

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
