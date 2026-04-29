import { spawn } from 'node:child_process';
import {
	invalidateProjectCodexSkillCache,
	listInstalledCodexSkillInstallations,
	listInstalledCodexSkills
} from '$lib/server/codex-skills';

export type ExternalSkillSearchResult = {
	packageSpec: string;
	url: string | null;
	installCountLabel: string | null;
};

export type InstalledExternalSkillResult = {
	id: string;
	description: string;
	sourceLabel: string;
	global: boolean;
	project: boolean;
	skillFilePath: string;
};

const ANSI_ESCAPE_PATTERN =
	// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI stripping needs control codes.
	/\u001b\[[0-9;?]*[ -/]*[@-~]/g;

function getSkillsCliInvocation(args: string[]) {
	const configured = process.env.SKILLS_BIN?.trim();

	if (configured) {
		const [command, ...prefixArgs] = configured.split(/\s+/).filter(Boolean);

		if (!command) {
			throw new Error('SKILLS_BIN is configured but empty.');
		}

		return {
			command,
			args: [...prefixArgs, ...args]
		};
	}

	return {
		command: 'npx',
		args: ['skills', ...args]
	};
}

async function runSkillsCli(args: string[], cwd: string) {
	const invocation = getSkillsCliInvocation(args);

	return await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
		const child = spawn(invocation.command, invocation.args, {
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
				resolve({ stdout, stderr });
				return;
			}

			const detail = stderr.trim() || stdout.trim();
			reject(new Error(detail || `skills CLI exited with code ${code ?? 'null'}.`));
		});
	});
}

export function parseExternalSkillSearchOutput(output: string): ExternalSkillSearchResult[] {
	const results: ExternalSkillSearchResult[] = [];
	let pendingResult: ExternalSkillSearchResult | null = null;

	for (const rawLine of output.split(/\r?\n/)) {
		const line = rawLine.trim();

		if (!line) {
			continue;
		}

		const packageSpecMatch = line.match(/([^\s/]+\/[^\s@]+@[^\s]+)/);

		if (
			packageSpecMatch &&
			!/^https?:\/\//i.test(packageSpecMatch[1]) &&
			!packageSpecMatch[1].includes('<') &&
			!packageSpecMatch[1].includes('>')
		) {
			if (pendingResult) {
				results.push(pendingResult);
			}

			pendingResult = {
				packageSpec: packageSpecMatch[1],
				url: null,
				installCountLabel: line.match(/([0-9][0-9.,]*[KMB]?)\s+installs/i)?.[1] ?? null
			};
			continue;
		}

		if (pendingResult) {
			const urlMatch = line.match(/https?:\/\/\S+/i);

			if (urlMatch) {
				pendingResult.url = urlMatch[0];
			}
		}
	}

	if (pendingResult) {
		results.push(pendingResult);
	}

	return results;
}

export function sanitizeExternalSkillsOutput(output: string) {
	return output
		.replace(ANSI_ESCAPE_PATTERN, '')
		.split(/\r?\n/)
		.map((line) => line.replace(/\s+/g, ' ').trimEnd())
		.join('\n')
		.trim();
}

export function inferExternalSkillIdFromPackageSpec(packageSpec: string) {
	const normalizedPackageSpec = packageSpec.trim();
	const skillSegment = normalizedPackageSpec.match(/@([^@\s/]+)$/)?.[1]?.trim() ?? '';

	return skillSegment || null;
}

export async function searchExternalSkills(query: string, cwd: string) {
	const normalizedQuery = query.trim();

	if (!normalizedQuery) {
		throw new Error('Search query is required.');
	}

	const { stdout, stderr } = await runSkillsCli(['find', normalizedQuery], cwd);
	const rawOutput = sanitizeExternalSkillsOutput([stdout, stderr].filter(Boolean).join('\n'));

	return {
		results: parseExternalSkillSearchOutput(rawOutput),
		rawOutput
	};
}

export async function installExternalSkillToProject(input: {
	projectRootFolder: string;
	packageSpec: string;
}) {
	const projectRootFolder = input.projectRootFolder.trim();
	const packageSpec = input.packageSpec.trim();

	if (!projectRootFolder) {
		throw new Error('Project root folder is required for external skill install.');
	}

	if (!packageSpec) {
		throw new Error('Package spec is required.');
	}

	const installedBefore = listInstalledCodexSkills(projectRootFolder);
	const installedBeforeIds = new Set(installedBefore.map((skill) => skill.id));
	const requestedSkillId = inferExternalSkillIdFromPackageSpec(packageSpec);

	if (requestedSkillId && installedBeforeIds.has(requestedSkillId)) {
		throw new Error(
			`Skill "${requestedSkillId}" is already installed for this project. Review the existing skill before installing a package with the same skill ID.`
		);
	}

	await runSkillsCli(['add', packageSpec, '-y'], projectRootFolder);
	invalidateProjectCodexSkillCache(projectRootFolder);
	const installedAfter = listInstalledCodexSkills(projectRootFolder);
	const installedAfterInstallations = listInstalledCodexSkillInstallations(projectRootFolder);
	const installedSkillIds = installedAfter
		.map((skill) => skill.id)
		.filter((skillId) => !installedBeforeIds.has(skillId));

	return {
		installedSkillIds,
		installedSkills: installedAfterInstallations
			.filter((skill) => installedSkillIds.includes(skill.id))
			.map(
				(skill): InstalledExternalSkillResult => ({
					id: skill.id,
					description: skill.description,
					sourceLabel: skill.sourceLabel,
					global: skill.global,
					project: skill.project,
					skillFilePath: skill.skillFilePath
				})
			)
	};
}
