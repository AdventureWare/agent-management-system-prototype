import { extractThreadTaskReference } from '$lib/server/thread-task-references';

export type ThreadTaskRecoveryDraft = {
	taskId: string;
	title: string;
	projectName: string | null;
	projectRootFolder: string | null;
	artifactRoot: string | null;
	summary: string;
};

function extractPromptField(prompt: string, label: string) {
	const matcher = new RegExp(`^${label}:\\s*(.+)$`, 'mi');
	return prompt.match(matcher)?.[1]?.trim() ?? '';
}

export function extractManagedTaskInstructions(prompt: string) {
	const normalizedPrompt = prompt.replace(/\r\n/g, '\n').trim();

	if (!normalizedPrompt) {
		return '';
	}

	const instructionsStart = normalizedPrompt.indexOf('Instructions:');

	if (instructionsStart < 0) {
		return '';
	}

	const instructionsBody = normalizedPrompt.slice(instructionsStart + 'Instructions:'.length);
	const coordinationStart = instructionsBody.indexOf('\nThread coordination:');
	const trimmedInstructions =
		coordinationStart >= 0 ? instructionsBody.slice(0, coordinationStart) : instructionsBody;

	return trimmedInstructions.trim();
}

export function extractThreadTaskRecoveryDraft(input: {
	threadName: string;
	prompts: string[];
}): ThreadTaskRecoveryDraft | null {
	const reference = extractThreadTaskReference(input.threadName);

	if (!reference) {
		return null;
	}

	const prompt = input.prompts.find((candidate) => candidate.trim().length > 0) ?? '';
	const parsedTitle = extractPromptField(prompt, 'Task');
	const parsedProjectName = extractPromptField(prompt, 'Project');
	const parsedProjectRootFolder = extractPromptField(prompt, 'Project root');
	const parsedArtifactRoot = extractPromptField(prompt, 'Default artifact root');
	const parsedSummary = extractManagedTaskInstructions(prompt);

	return {
		taskId: reference.taskId,
		title: parsedTitle || reference.taskTitle,
		projectName: parsedProjectName || reference.projectName,
		projectRootFolder: parsedProjectRootFolder || null,
		artifactRoot: parsedArtifactRoot || null,
		summary: parsedSummary
	};
}
