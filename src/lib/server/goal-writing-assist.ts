import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type GoalWritingAssistInput = {
	cwd: string;
	name?: string;
	summary?: string;
	successSignal?: string;
	area: string;
	status: string;
	targetDate?: string;
	parentGoalName?: string | null;
	artifactPath?: string;
	linkedProjectNames?: string[];
	linkedTaskTitles?: string[];
};

export type GoalWritingAssistResult = {
	name: string;
	summary: string;
	successSignal: string;
	changeSummary: string;
};

type GoalWritingAssistResponse = {
	name?: unknown;
	summary?: unknown;
	successSignal?: unknown;
	changeSummary?: unknown;
};

const OUTPUT_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['name', 'summary', 'successSignal', 'changeSummary'],
	properties: {
		name: {
			type: 'string',
			minLength: 1
		},
		summary: {
			type: 'string',
			minLength: 1
		},
		successSignal: {
			type: 'string',
			minLength: 1
		},
		changeSummary: {
			type: 'string',
			minLength: 1
		}
	}
} as const;

function compactList(values: string[] | undefined, fallback: string) {
	return values && values.length > 0 ? values.join(', ') : fallback;
}

function buildGoalWritingAssistPrompt(input: GoalWritingAssistInput) {
	const sections = [
		'You are improving a goal draft for an agent management system.',
		'Rewrite the goal so it is clearer, more outcome-oriented, and easier to plan against.',
		'Requirements:',
		'- Preserve the user intent and all concrete facts already present.',
		'- Do not invent projects, tasks, deadlines, metrics, or commitments that are not supported by the draft.',
		'- `name` should describe the desired outcome, not the implementation work.',
		'- `summary` should explain what changes, who it helps, and why it matters in 2-4 plain sentences.',
		'- `successSignal` should describe observable evidence that the goal is working.',
		'- If a field is blank, you may draft it from the available context, but keep it grounded and avoid fabricated specifics.',
		'Goal context:',
		`Area: ${input.area || 'product'}`,
		`Status: ${input.status || 'ready'}`,
		`Target date: ${input.targetDate?.trim() || 'None provided'}`,
		`Parent goal: ${input.parentGoalName?.trim() || 'None'}`,
		`Workspace: ${input.artifactPath?.trim() || 'None provided'}`,
		`Linked projects: ${compactList(input.linkedProjectNames, 'None linked')}`,
		`Linked tasks: ${compactList(input.linkedTaskTitles, 'None linked')}`,
		'Current draft:',
		`Name: ${input.name?.trim() || 'None provided'}`,
		`Summary: ${input.summary?.trim() || 'None provided'}`,
		`Success signal: ${input.successSignal?.trim() || 'None provided'}`,
		'Return JSON matching the schema. Keep `changeSummary` to 1-2 sentences.'
	];

	return sections.join('\n\n');
}

function getConfiguredCodexBin() {
	return process.env.CODEX_BIN?.trim() || 'codex';
}

async function runCodexGoalWritingAssist(
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

function parseGoalWritingAssistResponse(raw: string): GoalWritingAssistResult {
	let parsed: GoalWritingAssistResponse;

	try {
		parsed = JSON.parse(raw) as GoalWritingAssistResponse;
	} catch {
		throw new Error('The goal-writing assistant returned an unreadable response.');
	}

	const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
	const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
	const successSignal = typeof parsed.successSignal === 'string' ? parsed.successSignal.trim() : '';
	const changeSummary = typeof parsed.changeSummary === 'string' ? parsed.changeSummary.trim() : '';

	if (!name || !summary || !successSignal || !changeSummary) {
		throw new Error('The goal-writing assistant returned an incomplete rewrite.');
	}

	return {
		name,
		summary,
		successSignal,
		changeSummary
	};
}

export async function assistGoalWriting(
	input: GoalWritingAssistInput
): Promise<GoalWritingAssistResult> {
	const prompt = buildGoalWritingAssistPrompt(input);
	const tempRoot = await mkdtemp(join(tmpdir(), 'ams-goal-writing-assist-'));
	const schemaPath = join(tempRoot, 'schema.json');
	const outputPath = join(tempRoot, 'output.json');

	try {
		await writeFile(schemaPath, JSON.stringify(OUTPUT_SCHEMA, null, 2), 'utf8');
		await runCodexGoalWritingAssist(input.cwd, prompt, schemaPath, outputPath);
		const rawOutput = await readFile(outputPath, 'utf8');
		return parseGoalWritingAssistResponse(rawOutput);
	} finally {
		await rm(tempRoot, { recursive: true, force: true });
	}
}
