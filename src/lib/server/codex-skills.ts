import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	renameSync,
	writeFileSync
} from 'node:fs';
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
	skillDirectory: string;
	skillFilePath: string;
};

export type InstalledCodexSkillInstallation = InstalledCodexSkill & {
	skillDirectory: string;
	skillFilePath: string;
};

export type CreatedProjectCodexSkill = {
	skillId: string;
	skillDirectory: string;
	skillFilePath: string;
	openAIYamlPath: string;
	referenceFilePaths: string[];
	scriptFilePaths: string[];
};

export type ProjectCodexSkillRecord = CreatedProjectCodexSkill & {
	content: string;
};

export type ProjectCodexReferenceFile = {
	path: string;
	content: string;
};

export type ProjectCodexScriptFile = {
	path: string;
	content: string;
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
			description: parseYamlScalar(frontmatter, 'description'),
			skillDirectory: resolve(skillFilePath, '..'),
			skillFilePath
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

export function invalidateProjectCodexSkillCache(projectRootFolder: string) {
	const projectAgentsRoot = resolve(projectRootFolder, '.agents');
	const projectSkillsRoot = resolve(projectAgentsRoot, 'skills');
	const fallbackAgentsRoot = resolve(projectRootFolder, 'agents');
	const fallbackSkillsRoot = resolve(fallbackAgentsRoot, 'skills');
	invalidateSkillMetadataCache([
		projectAgentsRoot,
		projectSkillsRoot,
		fallbackAgentsRoot,
		fallbackSkillsRoot
	]);
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

function buildProjectSkillFileContent(input: {
	skillId: string;
	description: string;
	bodyMarkdown: string;
}) {
	return [
		'---',
		`name: ${input.skillId}`,
		`description: ${input.description}`,
		'---',
		'',
		input.bodyMarkdown.trim()
	].join('\n');
}

const DISPLAY_NAME_ACRONYMS = new Set([
	'ai',
	'api',
	'ci',
	'cli',
	'css',
	'csv',
	'html',
	'ios',
	'json',
	'llm',
	'mcp',
	'pdf',
	'pr',
	'sql',
	'svg',
	'ts',
	'tsx',
	'ui',
	'url',
	'ux',
	'yaml'
]);

function titleCaseSkillId(skillId: string) {
	return skillId
		.split('-')
		.filter(Boolean)
		.map((segment) => {
			const lower = segment.toLowerCase();

			if (DISPLAY_NAME_ACRONYMS.has(lower)) {
				return lower.toUpperCase();
			}

			return lower.charAt(0).toUpperCase() + lower.slice(1);
		})
		.join(' ');
}

function trimDescriptionForUI(description: string, displayName: string) {
	const cleaned = description.trim().replace(/\s+/g, ' ').replace(/\.$/, '');

	if (cleaned.length >= 25 && cleaned.length <= 64) {
		return cleaned;
	}

	const fallback = `Help with ${displayName} tasks`;

	if (fallback.length >= 25 && fallback.length <= 64) {
		return fallback;
	}

	if (cleaned.length > 64) {
		return `${cleaned.slice(0, 61).trimEnd()}...`;
	}

	return `${fallback.slice(0, 61).trimEnd()}...`;
}

function buildDefaultPrompt(skillId: string, description: string, shortDescription: string) {
	const cleanedDescription = description
		.trim()
		.replace(/^use\s+(for|when)\s+/i, '')
		.replace(/^project-specific\s+/i, '')
		.replace(/\.$/, '');
	const promptTail = cleanedDescription || shortDescription.toLowerCase();

	return `Use $${skillId} to ${promptTail}.`;
}

function yamlQuote(value: string) {
	return JSON.stringify(value);
}

function buildProjectSkillOpenAIYaml(input: { skillId: string; description: string }) {
	const displayName = titleCaseSkillId(input.skillId);
	const shortDescription = trimDescriptionForUI(input.description, displayName);
	const defaultPrompt = buildDefaultPrompt(input.skillId, input.description, shortDescription);

	return [
		'interface:',
		`  display_name: ${yamlQuote(displayName)}`,
		`  short_description: ${yamlQuote(shortDescription)}`,
		`  default_prompt: ${yamlQuote(defaultPrompt)}`
	].join('\n');
}

function resolveProjectSkillReferencePaths(
	skillDirectory: string,
	referenceFiles: ProjectCodexReferenceFile[]
) {
	return referenceFiles.map((referenceFile) => {
		const normalizedPath = referenceFile.path.trim().replace(/\\/g, '/');

		if (!normalizedPath.startsWith('references/') || normalizedPath.includes('..')) {
			throw new Error(`Reference file path "${referenceFile.path}" must stay under references/.`);
		}

		if (!normalizedPath.endsWith('.md')) {
			throw new Error(`Reference file "${referenceFile.path}" must be a markdown file.`);
		}

		return {
			path: normalizedPath,
			content: referenceFile.content.trim(),
			filePath: resolve(skillDirectory, normalizedPath)
		};
	});
}

function resolveProjectSkillScriptPaths(
	skillDirectory: string,
	scriptFiles: ProjectCodexScriptFile[]
) {
	return scriptFiles.map((scriptFile) => {
		const normalizedPath = scriptFile.path.trim().replace(/\\/g, '/');

		if (!normalizedPath.startsWith('scripts/') || normalizedPath.includes('..')) {
			throw new Error(`Script file path "${scriptFile.path}" must stay under scripts/.`);
		}

		if (!/\.(sh|py|js|mjs|ts)$/i.test(normalizedPath)) {
			throw new Error(
				`Script file "${scriptFile.path}" must use a supported extension (.sh, .py, .js, .mjs, .ts).`
			);
		}

		return {
			path: normalizedPath,
			content: scriptFile.content.trim(),
			filePath: resolve(skillDirectory, normalizedPath)
		};
	});
}

function getProjectCodexSkillPaths(projectRootFolder: string, skillId: string) {
	const projectAgentsRoot = resolve(projectRootFolder, '.agents');
	const projectSkillsRoot = resolve(projectAgentsRoot, 'skills');
	const skillDirectory = resolve(projectSkillsRoot, skillId);
	const skillFilePath = resolve(skillDirectory, 'SKILL.md');
	const agentsDirectory = resolve(skillDirectory, 'agents');
	const openAIYamlPath = resolve(agentsDirectory, 'openai.yaml');

	return {
		projectAgentsRoot,
		projectSkillsRoot,
		skillDirectory,
		skillFilePath,
		agentsDirectory,
		openAIYamlPath
	};
}

export function getProjectCodexSkillFilePath(projectRootFolder: string, skillId: string) {
	const normalizedSkillId = normalizeCodexSkillId(skillId);

	if (!projectRootFolder.trim()) {
		throw new Error('Project root folder is required to resolve a project skill path.');
	}

	if (!normalizedSkillId) {
		throw new Error('Skill ID is required.');
	}

	return getProjectCodexSkillPaths(projectRootFolder.trim(), normalizedSkillId).skillFilePath;
}

function saveProjectCodexSkill(
	input: {
		projectRootFolder: string;
		skillId: string;
		description: string;
		bodyMarkdown: string;
		referenceFiles?: ProjectCodexReferenceFile[];
		scriptFiles?: ProjectCodexScriptFile[];
	},
	mode: 'create' | 'update'
) {
	const projectRootFolder = input.projectRootFolder.trim();
	const skillId = normalizeCodexSkillId(input.skillId);
	const description = input.description.trim();
	const bodyMarkdown = input.bodyMarkdown.trim();
	const referenceFiles = input.referenceFiles ?? [];
	const scriptFiles = input.scriptFiles ?? [];

	if (!projectRootFolder) {
		throw new Error('Project root folder is required to write a project skill.');
	}

	if (!skillId) {
		throw new Error('Skill ID is required.');
	}

	if (!description) {
		throw new Error('Skill description is required.');
	}

	if (!bodyMarkdown) {
		throw new Error('Skill body is required.');
	}

	const { skillDirectory, skillFilePath, agentsDirectory, openAIYamlPath } =
		getProjectCodexSkillPaths(projectRootFolder, skillId);
	const resolvedReferenceFiles = resolveProjectSkillReferencePaths(skillDirectory, referenceFiles);
	const resolvedScriptFiles = resolveProjectSkillScriptPaths(skillDirectory, scriptFiles);
	const skillExists = existsSync(skillFilePath);

	if (mode === 'create' && skillExists) {
		throw new Error(`Project skill "${skillId}" already exists.`);
	}

	if (mode === 'update' && !skillExists) {
		throw new Error(`Project skill "${skillId}" does not exist.`);
	}

	mkdirSync(skillDirectory, { recursive: true });
	mkdirSync(agentsDirectory, { recursive: true });
	writeFileSync(
		skillFilePath,
		buildProjectSkillFileContent({
			skillId,
			description,
			bodyMarkdown
		}),
		'utf8'
	);
	writeFileSync(
		openAIYamlPath,
		`${buildProjectSkillOpenAIYaml({
			skillId,
			description
		})}\n`,
		'utf8'
	);
	for (const referenceFile of resolvedReferenceFiles) {
		mkdirSync(resolve(referenceFile.filePath, '..'), { recursive: true });
		writeFileSync(referenceFile.filePath, `${referenceFile.content}\n`, 'utf8');
	}
	for (const scriptFile of resolvedScriptFiles) {
		mkdirSync(resolve(scriptFile.filePath, '..'), { recursive: true });
		writeFileSync(scriptFile.filePath, `${scriptFile.content}\n`, 'utf8');
	}
	invalidateProjectCodexSkillCache(projectRootFolder);

	return {
		skillId,
		skillDirectory,
		skillFilePath,
		openAIYamlPath,
		referenceFilePaths: resolvedReferenceFiles.map((referenceFile) => referenceFile.filePath),
		scriptFilePaths: resolvedScriptFiles.map((scriptFile) => scriptFile.filePath)
	} satisfies CreatedProjectCodexSkill;
}

export function readProjectCodexSkill(input: { projectRootFolder: string; skillId: string }) {
	const projectRootFolder = input.projectRootFolder.trim();
	const skillId = normalizeCodexSkillId(input.skillId);

	if (!projectRootFolder) {
		throw new Error('Project root folder is required to read a project skill.');
	}

	if (!skillId) {
		throw new Error('Skill ID is required.');
	}

	const { skillDirectory, skillFilePath, openAIYamlPath } = getProjectCodexSkillPaths(
		projectRootFolder,
		skillId
	);

	if (!existsSync(skillFilePath)) {
		throw new Error(`Project skill "${skillId}" does not exist.`);
	}

	return {
		skillId,
		skillDirectory,
		skillFilePath,
		openAIYamlPath,
		referenceFilePaths: [],
		scriptFilePaths: [],
		content: readFileSync(skillFilePath, 'utf8')
	} satisfies ProjectCodexSkillRecord;
}

export function writeProjectCodexSkill(input: {
	projectRootFolder: string;
	skillId: string;
	description: string;
	bodyMarkdown: string;
	referenceFiles?: ProjectCodexReferenceFile[];
	scriptFiles?: ProjectCodexScriptFile[];
}) {
	return saveProjectCodexSkill(input, 'create');
}

export function updateProjectCodexSkill(input: {
	projectRootFolder: string;
	skillId: string;
	description: string;
	bodyMarkdown: string;
	referenceFiles?: ProjectCodexReferenceFile[];
	scriptFiles?: ProjectCodexScriptFile[];
}) {
	return saveProjectCodexSkill(input, 'update');
}

export function archiveProjectCodexSkill(input: { projectRootFolder: string; skillId: string }) {
	const projectRootFolder = input.projectRootFolder.trim();
	const skillId = normalizeCodexSkillId(input.skillId);

	if (!projectRootFolder) {
		throw new Error('Project root folder is required to archive a project skill.');
	}

	if (!skillId) {
		throw new Error('Skill ID is required.');
	}

	const { projectAgentsRoot, skillDirectory, skillFilePath } = getProjectCodexSkillPaths(
		projectRootFolder,
		skillId
	);

	if (!existsSync(skillFilePath)) {
		throw new Error(`Project skill "${skillId}" does not exist.`);
	}

	const archiveRoot = resolve(projectAgentsRoot, 'skills-archive');
	const archivedAt = new Date().toISOString().replace(/[:.]/g, '-');
	const archiveDirectory = resolve(archiveRoot, `${skillId}-${archivedAt}`);
	mkdirSync(archiveRoot, { recursive: true });
	renameSync(skillDirectory, archiveDirectory);
	invalidateProjectCodexSkillCache(projectRootFolder);

	return {
		skillId,
		skillDirectory,
		archiveDirectory
	};
}

export function createProjectCodexSkill(input: {
	projectRootFolder: string;
	skillId: string;
	description: string;
}) {
	const skillId = normalizeCodexSkillId(input.skillId);
	const description = input.description.trim();

	return writeProjectCodexSkill({
		projectRootFolder: input.projectRootFolder,
		skillId,
		description,
		bodyMarkdown: buildProjectSkillTemplate({
			skillId,
			description
		})
	});
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
			global: false,
			project: Boolean(cwd),
			root: cwd ? resolve(cwd, 'agents') : ''
		},
		{
			global: false,
			project: Boolean(cwd),
			root: cwd ? resolve(cwd, 'agents', 'skills') : ''
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

export function listInstalledCodexSkillInstallations(
	cwd: string | null | undefined,
	codexHome = process.env.CODEX_HOME?.trim() || resolve(homedir(), '.codex')
) {
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
			global: false,
			project: Boolean(cwd),
			root: cwd ? resolve(cwd, 'agents') : ''
		},
		{
			global: false,
			project: Boolean(cwd),
			root: cwd ? resolve(cwd, 'agents', 'skills') : ''
		},
		{
			global: true,
			project: false,
			root: resolve(codexHome, 'skills')
		}
	];
	const installations: InstalledCodexSkillInstallation[] = [];
	const seenFilePaths = new Set<string>();

	for (const source of sources) {
		for (const metadata of listSkillMetadata(source.root)) {
			if (seenFilePaths.has(metadata.skillFilePath)) {
				continue;
			}

			seenFilePaths.add(metadata.skillFilePath);
			installations.push({
				id: metadata.id,
				description: metadata.description,
				global: source.global,
				project: source.project,
				sourceLabel: source.project ? 'Project' : 'Global',
				skillDirectory: metadata.skillDirectory,
				skillFilePath: metadata.skillFilePath
			});
		}
	}

	return installations.sort(
		(left, right) =>
			left.id.localeCompare(right.id) ||
			left.sourceLabel.localeCompare(right.sourceLabel) ||
			left.skillFilePath.localeCompare(right.skillFilePath)
	);
}
