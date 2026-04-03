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

type SkillMetadata = {
	id: string;
	description: string;
};

const SKILL_METADATA_CACHE_TTL_MS = 10_000;
const skillMetadataCache = new Map<
	string,
	{
		expiresAt: number;
		skills: SkillMetadata[];
	}
>();

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

function listSkillMetadata(root: string) {
	if (!root || !existsSync(root)) {
		skillMetadataCache.delete(root);
		return [];
	}

	const now = Date.now();
	const cached = skillMetadataCache.get(root);

	if (cached && cached.expiresAt > now) {
		return cached.skills;
	}

	const skills = listSkillFiles(root)
		.map((skillFilePath) => readSkillMetadata(skillFilePath))
		.filter((metadata): metadata is SkillMetadata => Boolean(metadata?.id));

	skillMetadataCache.set(root, {
		expiresAt: now + SKILL_METADATA_CACHE_TTL_MS,
		skills
	});

	return skills;
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
		for (const metadata of listSkillMetadata(source.root)) {
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
