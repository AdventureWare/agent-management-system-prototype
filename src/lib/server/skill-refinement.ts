import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type SkillRefinementInput = {
	cwd: string;
	projectName: string;
	projectSummary?: string | null;
	skillId: string;
	currentSkillContent: string;
	improvementGoal: string;
	installedSkillNames?: string[];
	relatedTasks?: Array<{
		title: string;
		summary: string;
		requiredPromptSkillNames?: string[];
		requiredToolNames?: string[];
	}>;
};

export type SkillRefinementResult = {
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

type SkillRefinementResponse = {
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

function compactList(values: string[] | undefined, fallback: string) {
	return values && values.length > 0 ? values.join(', ') : fallback;
}

function buildSkillRefinementPrompt(input: SkillRefinementInput) {
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
		'You are refining an existing project-local Codex skill.',
		'Improve it so it is more useful, more precise, and better grounded in the supplied project context.',
		'Requirements:',
		'- Preserve strong existing content when it is already good.',
		'- Remove fluff, generic filler, and duplicated guidance.',
		'- Do not invent repo-specific files, scripts, or conventions that are not supported by the provided context.',
		'- The skill body must be markdown only. Do not include YAML frontmatter.',
		'- Keep the title heading using the current skill id.',
		'- Keep or improve these sections: `## When to use this skill`, `## Workflow`, and `## Project notes`.',
		'- Make the trigger language more selective when needed.',
		'- Make the workflow more procedural and execution-oriented.',
		'- If secondary detail would clutter the main skill, prefer up to two markdown files under `references/` and mention them from the main skill body.',
		'- If a deterministic helper would materially improve reuse, you may add or revise one small script under `scripts/` and mention it from the main skill body.',
		'Refinement context:',
		`Project: ${input.projectName}`,
		`Project summary: ${input.projectSummary?.trim() || 'None provided'}`,
		`Skill id: ${input.skillId}`,
		`Improvement goal: ${input.improvementGoal}`,
		`Installed skills in project: ${compactList(input.installedSkillNames, 'None listed')}`,
		'Related tasks:',
		...relatedTaskLines,
		'Current skill content:',
		input.currentSkillContent.trim(),
		'Return JSON matching the schema.',
		'`description` should be the improved frontmatter description.',
		'`bodyMarkdown` should be the refined body without frontmatter.',
		'`changeSummary` should explain what improved in 1-2 sentences.',
		'`referenceFiles` may be empty, but when used they must stay under `references/` and the main skill should point to them explicitly.',
		'`scriptFiles` may be empty, but when used they must stay under `scripts/` and be limited to one small script.'
	].join('\n\n');
}

function getConfiguredCodexBin() {
	return process.env.CODEX_BIN?.trim() || 'codex';
}

async function runCodexSkillRefinement(
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

function parseSkillRefinementResponse(raw: string): SkillRefinementResult {
	let parsed: SkillRefinementResponse;

	try {
		parsed = JSON.parse(raw) as SkillRefinementResponse;
	} catch {
		throw new Error('The skill refiner returned an unreadable response.');
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
		throw new Error('The skill refiner returned an incomplete draft.');
	}

	return {
		description,
		bodyMarkdown,
		changeSummary,
		referenceFiles,
		scriptFiles
	};
}

export async function refineProjectSkill(
	input: SkillRefinementInput
): Promise<SkillRefinementResult> {
	const prompt = buildSkillRefinementPrompt(input);
	const tempRoot = await mkdtemp(join(tmpdir(), 'ams-skill-refine-'));
	const schemaPath = join(tempRoot, 'schema.json');
	const outputPath = join(tempRoot, 'output.json');

	try {
		await writeFile(schemaPath, JSON.stringify(OUTPUT_SCHEMA, null, 2), 'utf8');
		await runCodexSkillRefinement(input.cwd, prompt, schemaPath, outputPath);
		const rawOutput = await readFile(outputPath, 'utf8');
		return parseSkillRefinementResponse(rawOutput);
	} finally {
		await rm(tempRoot, { recursive: true, force: true });
	}
}
