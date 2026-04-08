import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
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

export type CreatedProjectCodexSkill = {
	skillId: string;
	skillDirectory: string;
	skillFilePath: string;
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

function invalidateSkillMetadataCache(roots: string[]) {
	for (const root of roots) {
		if (root) {
			skillMetadataCache.delete(root);
		}
	}
}

export function normalizeCodexSkillId(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._/\s-]/g, '')
		.replace(/[\/\s]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

function buildProjectSkillTemplate(input: { skillId: string; description: string }) {
	return [
		'---',
		`name: ${input.skillId}`,
		`description: ${input.description}`,
		'---',
		'',
		`# ${input.skillId}`,
		'',
		'## When to use this skill',
		'',
		'- Use this skill when the task repeatedly needs project-specific guidance in this area.',
		'- Keep the trigger language specific enough that it only loads when it materially improves execution quality.',
		'',
		'## Workflow',
		'',
		'1. Inspect the relevant project files and current task context before making changes.',
		'2. Apply the project-specific constraints, patterns, or review checklist captured here.',
		'3. Validate the result with the narrowest reliable check for the change.',
		'',
		'## Project notes',
		'',
		'- Add the project-specific heuristics, guardrails, and references this skill should enforce.',
		'- Keep this file concise and move large references into sibling files only when needed.'
	].join('\n');
}

export function createProjectCodexSkill(input: {
	projectRootFolder: string;
	skillId: string;
	description: string;
}) {
	const projectRootFolder = input.projectRootFolder.trim();
	const skillId = normalizeCodexSkillId(input.skillId);
	const description = input.description.trim();

	if (!projectRootFolder) {
		throw new Error('Project root folder is required to create a project skill.');
	}

	if (!skillId) {
		throw new Error('Skill ID is required.');
	}

	if (!description) {
		throw new Error('Skill description is required.');
	}

	const projectAgentsRoot = resolve(projectRootFolder, '.agents');
	const projectSkillsRoot = resolve(projectAgentsRoot, 'skills');
	const skillDirectory = resolve(projectSkillsRoot, skillId);
	const skillFilePath = resolve(skillDirectory, 'SKILL.md');

	if (existsSync(skillFilePath)) {
		throw new Error(`Project skill "${skillId}" already exists.`);
	}

	mkdirSync(skillDirectory, { recursive: true });
	writeFileSync(
		skillFilePath,
		buildProjectSkillTemplate({
			skillId,
			description
		}),
		'utf8'
	);
	invalidateSkillMetadataCache([projectAgentsRoot, projectSkillsRoot]);

	return {
		skillId,
		skillDirectory,
		skillFilePath
	} satisfies CreatedProjectCodexSkill;
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
