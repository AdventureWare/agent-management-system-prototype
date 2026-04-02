import { createHash } from 'node:crypto';
import type { RetrievedSelfImprovementKnowledgeItem } from '$lib/types/self-improvement';

const TASK_THREAD_NAME_PREFIX = 'Task thread';
const LEGACY_TASK_THREAD_NAME_PREFIX = 'Work thread:';
const FALLBACK_SESSION_NAME = 'Untitled session';
const THREAD_NAME_SEPARATOR = ' · ';
const MAX_THREAD_NAME_SEGMENT_LENGTH = 48;

export function buildTaskThreadPrompt(input: {
	taskName: string;
	taskInstructions: string;
	projectName: string;
	projectRootFolder: string;
	defaultArtifactRoot: string;
	availableSkillNames?: string[];
	relevantKnowledgeItems?: Array<
		Pick<
			RetrievedSelfImprovementKnowledgeItem,
			'title' | 'summary' | 'triggerPattern' | 'recommendedResponse' | 'matchReasons'
		>
	>;
}) {
	const contextLines = [
		`Task: ${input.taskName}`,
		`Project: ${input.projectName}`,
		`Project root: ${input.projectRootFolder}`
	];

	if (input.defaultArtifactRoot) {
		contextLines.push(`Default artifact root: ${input.defaultArtifactRoot}`);
	}

	if (input.availableSkillNames?.length) {
		contextLines.push(`Installed skills available: ${input.availableSkillNames.join(', ')}`);
	}

	const knowledgeLines = input.relevantKnowledgeItems?.flatMap((knowledgeItem, index) => [
		`Knowledge ${index + 1}: ${knowledgeItem.title}`,
		`Summary: ${knowledgeItem.summary}`,
		`Trigger pattern: ${knowledgeItem.triggerPattern}`,
		`Recommended response: ${knowledgeItem.recommendedResponse}`,
		knowledgeItem.matchReasons.length > 0
			? `Why it applies: ${knowledgeItem.matchReasons.join(' ')}`
			: '',
		''
	]);

	return [
		'You are executing a queued task from the agent management system.',
		'',
		...contextLines,
		'',
		'Instructions:',
		input.taskInstructions,
		...(knowledgeLines?.length
			? [
					'',
					'Apply this published system knowledge when it is relevant to the work:',
					...knowledgeLines.filter(Boolean)
				]
			: []),
		'',
		'Work from the project root, make the requested changes, and report progress and outcomes clearly.'
	].join('\n');
}

function normalizeThreadNameSegment(value: string, maxLength = MAX_THREAD_NAME_SEGMENT_LENGTH) {
	const normalized = value.replace(/\s+/g, ' ').trim();

	if (!normalized) {
		return '';
	}

	if (normalized.length <= maxLength) {
		return normalized;
	}

	return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function normalizeStoredSessionName(value: string | null | undefined) {
	return value?.replace(/\s+/g, ' ').trim() ?? '';
}

export function buildTaskThreadName(input: {
	projectName: string;
	taskName: string;
	taskId: string;
}) {
	return [
		TASK_THREAD_NAME_PREFIX,
		normalizeThreadNameSegment(input.taskName),
		normalizeThreadNameSegment(input.projectName),
		input.taskId.trim()
	]
		.filter(Boolean)
		.join(THREAD_NAME_SEPARATOR);
}

export function resolveTaskThreadName(input: {
	currentName: string | null | undefined;
	projectName: string | null | undefined;
	taskName: string | null | undefined;
	taskId: string | null | undefined;
}) {
	const currentName = normalizeStoredSessionName(input.currentName);
	const shouldUseStandardizedName =
		!currentName ||
		currentName === FALLBACK_SESSION_NAME ||
		currentName.startsWith(LEGACY_TASK_THREAD_NAME_PREFIX);

	if (
		shouldUseStandardizedName &&
		input.projectName?.trim() &&
		input.taskName?.trim() &&
		input.taskId?.trim()
	) {
		return buildTaskThreadName({
			projectName: input.projectName,
			taskName: input.taskName,
			taskId: input.taskId
		});
	}

	return currentName || FALLBACK_SESSION_NAME;
}

export function buildPromptDigest(prompt: string) {
	return createHash('sha256').update(prompt).digest('hex').slice(0, 16);
}
