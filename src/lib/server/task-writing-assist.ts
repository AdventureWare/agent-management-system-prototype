import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type TaskWritingAssistInput = {
	cwd: string;
	projectName?: string | null;
	taskName?: string;
	goalLabel?: string | null;
	parentTaskTitle?: string | null;
	existingInstructions: string;
	successCriteria?: string;
	readyCondition?: string;
	expectedOutcome?: string;
	delegationObjective?: string;
	delegationInputContext?: string;
	delegationExpectedDeliverable?: string;
	delegationDoneCondition?: string;
	delegationIntegrationNotes?: string;
	blockedReason?: string;
	requiredPromptSkillNames?: string[];
	requiredCapabilityNames?: string[];
	requiredToolNames?: string[];
	availableSkillNames?: string[];
};

export type TaskWritingAssistResult = {
	instructions: string;
	changeSummary: string;
};

type TaskWritingAssistResponse = {
	instructions?: unknown;
	changeSummary?: unknown;
};

const OUTPUT_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['instructions', 'changeSummary'],
	properties: {
		instructions: {
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

function buildTaskWritingAssistPrompt(input: TaskWritingAssistInput) {
	const sections = [
		'You are improving a task draft for an execution agent in an agent management system.',
		'Rewrite the task instructions so they are clearer, better structured, and more likely to produce a successful execution.',
		'Requirements:',
		'- Preserve the user intent and every concrete fact already present.',
		'- Do not invent scope, files, requirements, or decisions that are not supported by the draft or metadata.',
		'- Make the objective, expected deliverable, important constraints, and review posture easier to follow.',
		'- If information is missing, keep that uncertainty explicit instead of guessing.',
		'- Write concise execution-ready markdown that an agent can act on immediately.',
		'- Use the structured metadata as supporting context. Do not duplicate it mechanically if it is already captured elsewhere.',
		'Task context:',
		`Project: ${input.projectName?.trim() || 'Unspecified'}`,
		`Task name: ${input.taskName?.trim() || 'Unspecified'}`,
		`Goal: ${input.goalLabel?.trim() || 'None linked'}`,
		`Parent task: ${input.parentTaskTitle?.trim() || 'None'}`,
		`Success criteria: ${input.successCriteria?.trim() || 'None provided'}`,
		`Ready condition: ${input.readyCondition?.trim() || 'None provided'}`,
		`Expected outcome: ${input.expectedOutcome?.trim() || 'None provided'}`,
		`Delegation objective: ${input.delegationObjective?.trim() || 'None provided'}`,
		`Delegation input context: ${input.delegationInputContext?.trim() || 'None provided'}`,
		`Delegation expected deliverable: ${input.delegationExpectedDeliverable?.trim() || 'None provided'}`,
		`Delegation done condition: ${input.delegationDoneCondition?.trim() || 'None provided'}`,
		`Delegation integration notes: ${input.delegationIntegrationNotes?.trim() || 'None provided'}`,
		`Blocked reason: ${input.blockedReason?.trim() || 'None provided'}`,
		`Requested prompt skills: ${compactList(input.requiredPromptSkillNames, 'None listed')}`,
		`Required capabilities: ${compactList(input.requiredCapabilityNames, 'None listed')}`,
		`Required tools: ${compactList(input.requiredToolNames, 'None listed')}`,
		`Installed skills in workspace: ${compactList(input.availableSkillNames, 'None listed')}`,
		'Current instructions:',
		input.existingInstructions.trim(),
		'Return JSON matching the schema. `instructions` must contain only the rewritten task instructions. `changeSummary` must be 1-2 sentences summarizing what improved.'
	];

	return sections.join('\n\n');
}

function getConfiguredCodexBin() {
	return process.env.CODEX_BIN?.trim() || 'codex';
}

async function runCodexTaskWritingAssist(
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

function parseTaskWritingAssistResponse(raw: string): TaskWritingAssistResult {
	let parsed: TaskWritingAssistResponse;

	try {
		parsed = JSON.parse(raw) as TaskWritingAssistResponse;
	} catch {
		throw new Error('The writing assistant returned an unreadable response.');
	}

	const instructions = typeof parsed.instructions === 'string' ? parsed.instructions.trim() : '';
	const changeSummary = typeof parsed.changeSummary === 'string' ? parsed.changeSummary.trim() : '';

	if (!instructions) {
		throw new Error('The writing assistant did not return rewritten instructions.');
	}

	if (!changeSummary) {
		throw new Error('The writing assistant did not explain the rewrite.');
	}

	return {
		instructions,
		changeSummary
	};
}

export async function assistTaskWriting(
	input: TaskWritingAssistInput
): Promise<TaskWritingAssistResult> {
	const prompt = buildTaskWritingAssistPrompt(input);
	const tempRoot = await mkdtemp(join(tmpdir(), 'ams-task-writing-assist-'));
	const schemaPath = join(tempRoot, 'schema.json');
	const outputPath = join(tempRoot, 'output.json');

	try {
		await writeFile(schemaPath, JSON.stringify(OUTPUT_SCHEMA, null, 2), 'utf8');
		await runCodexTaskWritingAssist(input.cwd, prompt, schemaPath, outputPath);
		const rawOutput = await readFile(outputPath, 'utf8');
		return parseTaskWritingAssistResponse(rawOutput);
	} finally {
		await rm(tempRoot, { recursive: true, force: true });
	}
}
