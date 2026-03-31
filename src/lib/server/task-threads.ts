import { createHash } from 'node:crypto';

export function buildTaskThreadPrompt(input: {
	taskName: string;
	taskInstructions: string;
	projectName: string;
	projectRootFolder: string;
	defaultArtifactRoot: string;
}) {
	const contextLines = [
		`Task: ${input.taskName}`,
		`Project: ${input.projectName}`,
		`Project root: ${input.projectRootFolder}`
	];

	if (input.defaultArtifactRoot) {
		contextLines.push(`Default artifact root: ${input.defaultArtifactRoot}`);
	}

	return [
		'You are executing a queued task from the agent management system.',
		'',
		...contextLines,
		'',
		'Instructions:',
		input.taskInstructions,
		'',
		'Work from the project root, make the requested changes, and report progress and outcomes clearly.'
	].join('\n');
}

export function buildTaskThreadName(projectName: string) {
	return `Work thread: ${projectName}`;
}

export function buildPromptDigest(prompt: string) {
	return createHash('sha256').update(prompt).digest('hex').slice(0, 16);
}
