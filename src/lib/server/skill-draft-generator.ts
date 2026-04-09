import { spawn } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export type SkillDraftGenerationInput = {
	cwd: string;
	projectName: string;
	projectSummary?: string | null;
	skillId: string;
	intendedUse: string;
	installedSkillNames?: string[];
	relatedTasks?: Array<{
		title: string;
		summary: string;
		requiredPromptSkillNames?: string[];
		requiredToolNames?: string[];
	}>;
};

export type ProjectContextSignals = {
	topLevelEntries: string[];
	packageSummary: string[];
	referenceExcerpts: Array<{
		label: string;
		content: string;
	}>;
	skillExamples: Array<{
		id: string;
		description: string;
		excerpt: string;
	}>;
};

export type SkillDraftPromptInput = SkillDraftGenerationInput & {
	projectContextSignals: ProjectContextSignals;
};

export type SkillDraftGenerationResult = {
	description: string;
	bodyMarkdown: string;
	changeSummary: string;
	referenceFiles: Array<{
		path: string;
		content: string;
	}>;
	scriptFiles: Array<{
		path: string;
		content: string;
	}>;
};

type SkillDraftGenerationResponse = {
	description?: unknown;
	bodyMarkdown?: unknown;
	changeSummary?: unknown;
	referenceFiles?: unknown;
	scriptFiles?: unknown;
};

const OUTPUT_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['description', 'bodyMarkdown', 'changeSummary'],
	properties: {
		description: {
			type: 'string',
			minLength: 1
		},
		bodyMarkdown: {
			type: 'string',
			minLength: 1
		},
		changeSummary: {
			type: 'string',
			minLength: 1
		},
		referenceFiles: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['path', 'content'],
				properties: {
					path: {
						type: 'string',
						minLength: 1
					},
					content: {
						type: 'string',
						minLength: 1
					}
				}
			}
		},
		scriptFiles: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['path', 'content'],
				properties: {
					path: {
						type: 'string',
						minLength: 1
					},
					content: {
						type: 'string',
						minLength: 1
					}
				}
			}
		}
	}
} as const;

const REQUIRED_SECTION_HEADINGS = [
	'## When to use this skill',
	'## Workflow',
	'## Project notes'
] as const;

const GENERIC_DRAFT_PHRASES = [
	'inspect the relevant project files and current task context before making changes',
	'apply the project-specific constraints, patterns, or review checklist captured here',
	'keep this file concise and move large references into sibling files only when needed',
	'use this skill when the task repeatedly needs project-specific guidance in this area'
];

function compactList(values: string[] | undefined, fallback: string) {
	return values && values.length > 0 ? values.join(', ') : fallback;
}

function tokenize(value: string) {
	return value
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.map((token) => token.trim())
		.filter((token) => token.length >= 4);
}

async function safeReadTextFile(path: string, maxChars = 2_400) {
	try {
		const content = await readFile(path, 'utf8');
		return content.slice(0, maxChars).trim();
	} catch {
		return '';
	}
}

async function loadProjectContextSignals(
	cwd: string,
	requestContext: { skillId: string; intendedUse: string }
): Promise<ProjectContextSignals> {
	const topLevelEntries = await readdir(cwd, { withFileTypes: true })
		.then((entries) =>
			entries
				.map((entry) => `${entry.isDirectory() ? 'dir' : 'file'}:${entry.name}`)
				.sort((left, right) => left.localeCompare(right))
				.slice(0, 18)
		)
		.catch(() => []);

	const packageSummary: string[] = [];
	const packageJsonRaw = await safeReadTextFile(resolve(cwd, 'package.json'), 12_000);

	if (packageJsonRaw) {
		try {
			const parsed = JSON.parse(packageJsonRaw) as {
				name?: unknown;
				scripts?: Record<string, unknown>;
				dependencies?: Record<string, unknown>;
				devDependencies?: Record<string, unknown>;
			};

			if (typeof parsed.name === 'string' && parsed.name.trim()) {
				packageSummary.push(`package name: ${parsed.name.trim()}`);
			}

			const scriptNames = Object.keys(parsed.scripts ?? {}).slice(0, 10);
			if (scriptNames.length > 0) {
				packageSummary.push(`scripts: ${scriptNames.join(', ')}`);
			}

			const dependencyNames = [
				...Object.keys(parsed.dependencies ?? {}),
				...Object.keys(parsed.devDependencies ?? {})
			].slice(0, 12);
			if (dependencyNames.length > 0) {
				packageSummary.push(`dependencies: ${dependencyNames.join(', ')}`);
			}
		} catch {
			packageSummary.push('package.json exists but could not be summarized.');
		}
	}

	const referenceFiles = ['AGENTS.md', 'README.md', 'README.txt', 'README'];
	const referenceExcerpts: ProjectContextSignals['referenceExcerpts'] = [];

	for (const name of referenceFiles) {
		const path = resolve(cwd, name);
		const exists = await stat(path)
			.then(() => true)
			.catch(() => false);

		if (!exists) {
			continue;
		}

		const content = await safeReadTextFile(path);
		if (content) {
			referenceExcerpts.push({
				label: name,
				content
			});
		}
	}

	const skillExamples: ProjectContextSignals['skillExamples'] = [];
	const skillRoots = [resolve(cwd, '.agents'), resolve(cwd, '.agents', 'skills')];

	for (const root of skillRoots) {
		const entries = await readdir(root, { withFileTypes: true }).catch(() => []);

		for (const entry of entries) {
			if (!entry.isDirectory()) {
				continue;
			}

			const skillFilePath = resolve(root, entry.name, 'SKILL.md');
			const content = await safeReadTextFile(skillFilePath, 4_000);

			if (!content) {
				continue;
			}

			const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
			const frontmatter = frontmatterMatch?.[1] ?? '';
			const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
			const descriptionMatch = frontmatter.match(/^description:\s*(.+)$/m);
			const id = nameMatch?.[1]?.trim().replace(/^['"]|['"]$/g, '') || entry.name;
			const description =
				descriptionMatch?.[1]?.trim().replace(/^['"]|['"]$/g, '') || 'No description provided.';
			const excerpt = content
				.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '')
				.trim()
				.slice(0, 1_600);

			if (!excerpt) {
				continue;
			}

			skillExamples.push({
				id,
				description,
				excerpt
			});
		}
	}

	const requestTokens = new Set([
		...tokenize(requestContext.skillId),
		...tokenize(requestContext.intendedUse)
	]);
	skillExamples.sort((left, right) => {
		const leftScore = [...requestTokens].filter((token) =>
			`${left.id} ${left.description} ${left.excerpt}`.toLowerCase().includes(token)
		).length;
		const rightScore = [...requestTokens].filter((token) =>
			`${right.id} ${right.description} ${right.excerpt}`.toLowerCase().includes(token)
		).length;

		return rightScore - leftScore || left.id.localeCompare(right.id);
	});

	return {
		topLevelEntries,
		packageSummary,
		referenceExcerpts,
		skillExamples
	};
}

function buildProjectContextLines(signals: ProjectContextSignals) {
	return [
		`Top-level entries: ${compactList(signals.topLevelEntries, 'None listed')}`,
		`Package summary: ${compactList(signals.packageSummary, 'No package.json summary available')}`,
		...signals.referenceExcerpts.flatMap((excerpt) => [
			`${excerpt.label} excerpt:`,
			excerpt.content,
			''
		]),
		...signals.skillExamples
			.slice(0, 2)
			.flatMap((example, index) => [
				`Local skill example ${index + 1}: ${example.id}`,
				`Description: ${example.description}`,
				'Follow this example for specificity and structure, not for domain content.',
				example.excerpt,
				''
			])
	];
}

function buildSkillDraftPrompt(input: SkillDraftPromptInput) {
	const relatedTaskLines =
		input.relatedTasks && input.relatedTasks.length > 0
			? input.relatedTasks.flatMap((task, index) => [
					`Task ${index + 1}: ${task.title}`,
					`Summary: ${task.summary}`,
					`Requested prompt skills: ${compactList(task.requiredPromptSkillNames, 'None listed')}`,
					`Required tools: ${compactList(task.requiredToolNames, 'None listed')}`,
					''
				])
			: ['No related tasks were provided.'];

	return [
		'You are drafting a high-signal custom Codex skill for a real software project.',
		'Create a first iteration that is genuinely useful, concise, and grounded in the supplied project context.',
		'The draft must feel like a skill written by someone who actually inspected the project, not a generic template.',
		'Requirements:',
		'- Do not invent repo-specific files, scripts, APIs, or conventions that are not supported by the provided context.',
		'- Optimize for execution quality over completeness. Keep it short and practical.',
		'- The skill body must be markdown only. Do not include YAML frontmatter.',
		'- Include a title heading using the skill id.',
		'- Include at least these sections: `## When to use this skill`, `## Workflow`, and `## Project notes`.',
		'- The trigger language should be specific enough that the skill only loads when it materially helps.',
		'- The workflow should be procedural, not generic advice.',
		'- Avoid placeholder guidance such as "inspect relevant files" unless you immediately name the relevant files, folders, or project surfaces from the supplied context.',
		'- Prefer concrete nouns from the project and related tasks over abstract phrases like "this area" or "project-specific guidance".',
		'- Make the workflow steps actionable enough that another agent could follow them during execution.',
		'- If project details are unclear, keep that uncertainty explicit instead of fabricating specifics.',
		'- If a secondary detail would clutter the main skill body, prefer up to two small markdown files under `references/` and mention them from the main skill.',
		'- If the skill clearly benefits from a deterministic helper, you may add one small script under `scripts/` and mention how to use it from the main skill.',
		'Skill request context:',
		`Project: ${input.projectName}`,
		`Project summary: ${input.projectSummary?.trim() || 'None provided'}`,
		`Skill id: ${input.skillId}`,
		`Intended use: ${input.intendedUse}`,
		`Installed skills in project: ${compactList(input.installedSkillNames, 'None listed')}`,
		'Repository signals:',
		...buildProjectContextLines(input.projectContextSignals),
		'Related tasks:',
		...relatedTaskLines,
		'Return JSON matching the schema.',
		'`description` should be a concise trigger description suitable for skill frontmatter.',
		'`bodyMarkdown` should be the body of the SKILL.md file without frontmatter.',
		'`changeSummary` should be 1-2 sentences explaining what makes this first draft useful.',
		'`referenceFiles` may be empty, but when used they must stay under `references/` and the main skill should point to them explicitly.',
		'`scriptFiles` may be empty, but when used they must stay under `scripts/` and be limited to one small script.'
	].join('\n\n');
}

function getSkillDraftQualityIssues(
	input: SkillDraftPromptInput,
	result: SkillDraftGenerationResult
) {
	const issues: string[] = [];
	const normalizedBody = result.bodyMarkdown.toLowerCase();

	for (const heading of REQUIRED_SECTION_HEADINGS) {
		if (!result.bodyMarkdown.includes(heading)) {
			issues.push(`Missing required section heading: ${heading}`);
		}
	}

	const workflowStepCount = result.bodyMarkdown.match(/^\d+\.\s+/gm)?.length ?? 0;
	if (workflowStepCount < 2) {
		issues.push('Workflow section does not contain enough concrete numbered steps.');
	}

	for (const phrase of GENERIC_DRAFT_PHRASES) {
		if (normalizedBody.includes(phrase)) {
			issues.push(`Draft still contains generic placeholder language: "${phrase}"`);
		}
	}

	const groundingTokens = new Set(
		[
			...tokenize(input.skillId),
			...tokenize(input.intendedUse),
			...(input.relatedTasks ?? []).flatMap((task) => [
				...tokenize(task.title),
				...tokenize(task.summary),
				...(task.requiredPromptSkillNames ?? []).flatMap((name) => tokenize(name)),
				...(task.requiredToolNames ?? []).flatMap((name) => tokenize(name))
			]),
			...(input.projectContextSignals.topLevelEntries ?? []).flatMap((entry) => tokenize(entry)),
			...(input.projectContextSignals.packageSummary ?? []).flatMap((entry) => tokenize(entry))
		].filter(Boolean)
	);
	const groundedTokenMatches = [...groundingTokens].filter((token) =>
		normalizedBody.includes(token)
	);

	if (groundedTokenMatches.length < 4) {
		issues.push('Draft does not appear grounded enough in project/task vocabulary.');
	}

	return issues;
}

function buildSkillDraftRevisionPrompt(
	input: SkillDraftPromptInput,
	initialDraft: SkillDraftGenerationResult,
	issues: string[]
) {
	const relatedTaskLines =
		input.relatedTasks && input.relatedTasks.length > 0
			? input.relatedTasks.flatMap((task, index) => [
					`Task ${index + 1}: ${task.title}`,
					`Summary: ${task.summary}`,
					`Requested prompt skills: ${compactList(task.requiredPromptSkillNames, 'None listed')}`,
					`Required tools: ${compactList(task.requiredToolNames, 'None listed')}`,
					''
				])
			: ['No related tasks were provided.'];

	return [
		'You are revising a custom Codex skill draft because the first draft was too generic or insufficiently grounded.',
		'Replace it with a sharper draft that fixes the listed issues.',
		'Revision goals:',
		...issues.map((issue) => `- ${issue}`),
		'Requirements:',
		'- Keep the output concise and practical.',
		'- Keep the title heading using the skill id.',
		'- Keep the required sections: `## When to use this skill`, `## Workflow`, and `## Project notes`.',
		'- Make the workflow steps concrete and project-aware.',
		'- Do not fabricate repository details that are not supported by the provided context.',
		'- Avoid placeholder lines that could apply to any project.',
		'- If the draft would benefit from progressive disclosure, create or update up to two markdown files under `references/` and mention them from the main skill body.',
		'- If the workflow would genuinely benefit from deterministic reuse, you may add or revise one small helper script under `scripts/` and mention it from the main skill body.',
		'Skill request context:',
		`Project: ${input.projectName}`,
		`Project summary: ${input.projectSummary?.trim() || 'None provided'}`,
		`Skill id: ${input.skillId}`,
		`Intended use: ${input.intendedUse}`,
		`Installed skills in project: ${compactList(input.installedSkillNames, 'None listed')}`,
		'Repository signals:',
		...buildProjectContextLines(input.projectContextSignals),
		'Related tasks:',
		...relatedTaskLines,
		'First draft to improve:',
		initialDraft.bodyMarkdown,
		'Return JSON matching the schema.',
		'`description` should be a concise trigger description suitable for skill frontmatter.',
		'`bodyMarkdown` should be the revised body of the SKILL.md file without frontmatter.',
		'`changeSummary` should explain what was improved in 1-2 sentences.',
		'`referenceFiles` may be empty, but when used they must stay under `references/` and the main skill should point to them explicitly.',
		'`scriptFiles` may be empty, but when used they must stay under `scripts/` and be limited to one small script.'
	].join('\n\n');
}

function getConfiguredCodexBin() {
	return process.env.CODEX_BIN?.trim() || 'codex';
}

async function runCodexSkillDraftGeneration(
	cwd: string,
	prompt: string,
	schemaPath: string,
	outputPath: string
) {
	const args = [
		'exec',
		'--skip-git-repo-check',
		'--sandbox',
		'read-only',
		'--color',
		'never',
		'--disable',
		'apps',
		'-c',
		'mcp_servers.supabase.enabled=false',
		'--ephemeral',
		'--output-schema',
		schemaPath,
		'-o',
		outputPath,
		'-C',
		cwd,
		prompt
	];

	await new Promise<void>((resolve, reject) => {
		const child = spawn(getConfiguredCodexBin(), args, {
			cwd,
			env: {
				...process.env,
				NO_COLOR: '1'
			},
			stdio: ['ignore', 'pipe', 'pipe']
		});

		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (chunk) => {
			stdout += chunk.toString('utf8');
		});

		child.stderr.on('data', (chunk) => {
			stderr += chunk.toString('utf8');
		});

		child.on('error', (error) => {
			reject(error);
		});

		child.on('close', (code) => {
			if (code === 0) {
				resolve();
				return;
			}

			const detail = stderr.trim() || stdout.trim();
			reject(new Error(detail || `Codex exited with code ${code ?? 'null'}.`));
		});
	});
}

function parseSkillDraftGenerationResponse(raw: string): SkillDraftGenerationResult {
	let parsed: SkillDraftGenerationResponse;

	try {
		parsed = JSON.parse(raw) as SkillDraftGenerationResponse;
	} catch {
		throw new Error('The skill generator returned an unreadable response.');
	}

	const description = typeof parsed.description === 'string' ? parsed.description.trim() : '';
	const bodyMarkdown = typeof parsed.bodyMarkdown === 'string' ? parsed.bodyMarkdown.trim() : '';
	const changeSummary = typeof parsed.changeSummary === 'string' ? parsed.changeSummary.trim() : '';
	const referenceFiles = Array.isArray(parsed.referenceFiles)
		? parsed.referenceFiles
				.filter(
					(referenceFile): referenceFile is { path: string; content: string } =>
						Boolean(referenceFile) &&
						typeof referenceFile === 'object' &&
						'path' in referenceFile &&
						typeof referenceFile.path === 'string' &&
						referenceFile.path.trim().startsWith('references/') &&
						'content' in referenceFile &&
						typeof referenceFile.content === 'string' &&
						referenceFile.content.trim().length > 0
				)
				.map((referenceFile) => ({
					path: referenceFile.path.trim(),
					content: referenceFile.content.trim()
				}))
		: [];
	const scriptFiles = Array.isArray(parsed.scriptFiles)
		? parsed.scriptFiles
				.filter(
					(scriptFile): scriptFile is { path: string; content: string } =>
						Boolean(scriptFile) &&
						typeof scriptFile === 'object' &&
						'path' in scriptFile &&
						typeof scriptFile.path === 'string' &&
						scriptFile.path.trim().startsWith('scripts/') &&
						'content' in scriptFile &&
						typeof scriptFile.content === 'string' &&
						scriptFile.content.trim().length > 0
				)
				.map((scriptFile) => ({
					path: scriptFile.path.trim(),
					content: scriptFile.content.trim()
				}))
				.slice(0, 1)
		: [];

	if (!description || !bodyMarkdown || !changeSummary) {
		throw new Error('The skill generator returned an incomplete draft.');
	}

	return {
		description,
		bodyMarkdown,
		changeSummary,
		referenceFiles,
		scriptFiles
	};
}

export async function generateProjectSkillDraft(
	input: SkillDraftGenerationInput
): Promise<SkillDraftGenerationResult> {
	const projectContextSignals = await loadProjectContextSignals(input.cwd, {
		skillId: input.skillId,
		intendedUse: input.intendedUse
	});
	const prompt = buildSkillDraftPrompt({
		...input,
		projectContextSignals
	});
	const tempRoot = await mkdtemp(join(tmpdir(), 'ams-skill-draft-'));
	const schemaPath = join(tempRoot, 'schema.json');
	const outputPath = join(tempRoot, 'output.json');

	try {
		await writeFile(schemaPath, JSON.stringify(OUTPUT_SCHEMA, null, 2), 'utf8');
		await runCodexSkillDraftGeneration(input.cwd, prompt, schemaPath, outputPath);
		const rawOutput = await readFile(outputPath, 'utf8');
		const initialDraft = parseSkillDraftGenerationResponse(rawOutput);
		const issues = getSkillDraftQualityIssues(
			{
				...input,
				projectContextSignals
			},
			initialDraft
		);

		if (issues.length === 0) {
			return initialDraft;
		}

		const revisionPrompt = buildSkillDraftRevisionPrompt(
			{
				...input,
				projectContextSignals
			},
			initialDraft,
			issues
		);
		await runCodexSkillDraftGeneration(input.cwd, revisionPrompt, schemaPath, outputPath);
		const revisedRawOutput = await readFile(outputPath, 'utf8');
		return parseSkillDraftGenerationResponse(revisedRawOutput);
	} finally {
		await rm(tempRoot, { recursive: true, force: true });
	}
}

export { getSkillDraftQualityIssues };
