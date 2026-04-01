import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, resolve } from 'node:path';

export type InstalledCodexSkill = {
	id: string;
	description: string;
	global: boolean;
	project: boolean;
	sourceLabel: string;
};

function parseYamlScalar(frontmatter: string, field: 'name' | 'description') {
	const match = frontmatter.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
	const rawValue = match?.[1]?.trim() ?? '';

	if (!rawValue) {
		return '';
	}

	if (
		(rawValue.startsWith('"') && rawValue.endsWith('"')) ||
		(rawValue.startsWith("'") && rawValue.endsWith("'"))
	) {
		return rawValue.slice(1, -1).trim();
	}

	return rawValue;
}

function readSkillMetadata(skillFilePath: string) {
	try {
		const content = readFileSync(skillFilePath, 'utf8');
		const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);

		if (!frontmatterMatch) {
			return null;
		}

		const frontmatter = frontmatterMatch[1] ?? '';
		return {
			id: parseYamlScalar(frontmatter, 'name') || basename(resolve(skillFilePath, '..')),
			description: parseYamlScalar(frontmatter, 'description')
		};
	} catch {
		return null;
	}
}

function listSkillFiles(root: string) {
	if (!root || !existsSync(root)) {
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

export function listInstalledCodexSkills(
	cwd: string | null | undefined,
	codexHome = process.env.CODEX_HOME?.trim() || resolve(homedir(), '.codex')
) {
	const skillMap = new Map<string, InstalledCodexSkill>();
	const sources = [
		{
			global: false,
			project: Boolean(cwd),
			root: cwd ? resolve(cwd, '.agents') : ''
		},
		{
			global: false,
			project: Boolean(cwd),
			root: cwd ? resolve(cwd, '.agents', 'skills') : ''
		},
		{
			global: true,
			project: false,
			root: resolve(codexHome, 'skills')
		}
	];

	for (const source of sources) {
		for (const skillFilePath of listSkillFiles(source.root)) {
			const metadata = readSkillMetadata(skillFilePath);

			if (!metadata?.id) {
				continue;
			}

			const existing = skillMap.get(metadata.id);

			if (existing) {
				existing.global = existing.global || source.global;
				existing.project = existing.project || source.project;
				existing.sourceLabel =
					existing.global && existing.project
						? 'Global + project'
						: existing.project
							? 'Project'
							: 'Global';
				continue;
			}

			skillMap.set(metadata.id, {
				id: metadata.id,
				description: metadata.description,
				global: source.global,
				project: source.project,
				sourceLabel: source.project ? 'Project' : 'Global'
			});
		}
	}

	return [...skillMap.values()].sort((left, right) => left.id.localeCompare(right.id));
}
