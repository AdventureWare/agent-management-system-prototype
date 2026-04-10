import { createHash } from 'node:crypto';
import type { RetrievedSelfImprovementKnowledgeItem } from '$lib/types/self-improvement';
import type { DelegationPacket } from '$lib/types/control-plane';
import { buildTaskExecutionContractStatus } from '$lib/task-execution-contract';
import type { TaskRolePromptContext } from './task-role-context';

const TASK_THREAD_NAME_PREFIX = 'Task thread';
const LEGACY_TASK_THREAD_NAME_PREFIX = 'Work thread:';
const FALLBACK_SESSION_NAME = 'Untitled session';
const THREAD_NAME_SEPARATOR = ' · ';
const MAX_THREAD_NAME_SEGMENT_LENGTH = 48;

export function buildTaskThreadPrompt(input: {
	taskName: string;
	taskInstructions: string;
	successCriteria?: string;
	readyCondition?: string;
	expectedOutcome?: string;
	delegationPacket?: DelegationPacket | null;
	projectName: string;
	projectRootFolder: string;
	defaultArtifactRoot: string;
	additionalWritableRoots?: string[];
	availableSkillNames?: string[];
	requiredPromptSkillNames?: string[];
	preferredRole?: TaskRolePromptContext;
	relevantKnowledgeItems?: Array<
		Pick<
			RetrievedSelfImprovementKnowledgeItem,
			'title' | 'summary' | 'triggerPattern' | 'recommendedResponse' | 'matchReasons'
		>
	>;
}) {
	const executionContract = buildTaskExecutionContractStatus({
		successCriteria: input.successCriteria,
		readyCondition: input.readyCondition,
		expectedOutcome: input.expectedOutcome
	});
	const readyCondition = executionContract.readyCondition || 'None recorded.';
	const expectedOutcome = executionContract.expectedOutcome || 'None recorded.';
	const successCriteria = executionContract.successCriteria || 'None recorded.';
	const contextLines = [
		`Task: ${input.taskName}`,
		`Project: ${input.projectName}`,
		`Project root: ${input.projectRootFolder}`
	];
	const coordinationLines = [
		'Thread coordination:',
		'If you need instructions, context, or assignment from another thread, you can contact it directly from the shell in this managed run.',
		'When you list threads, use each thread handle and contact label to infer the right target before sending a message.',
		'Prefer filtered thread lookup first so you only inspect contactable threads that best match your current thread and task context.',
		'Managed run environment variables:',
		'- AMS_AGENT_THREAD_ID: the current thread id',
		'- AMS_AGENT_API_BASE_URL: local operator API base URL',
		'- AMS_AGENT_API_TOKEN: bearer token for the thread API',
		'Use the helper CLI from the project root instead of composing raw curl commands:',
		'Resolve the best thread to contact first:',
		'node scripts/agent-thread-cli.mjs best-target',
		'List available threads when you need to inspect multiple options:',
		'node scripts/agent-thread-cli.mjs list --can-contact',
		'Resolve a fuzzy or partial handle into ranked candidates when needed:',
		'node scripts/agent-thread-cli.mjs resolve <query> --can-contact',
		'The contact helper accepts either an exact thread id or an exact handle alias.',
		'You can further narrow routing with q, role, project, taskId, and limit query params.',
		'Contact another thread and ask it to reply back here if needed:',
		'node scripts/agent-thread-cli.mjs contact <targetThreadIdOrHandle> --type <question|request_context|request_assignment|handoff|review_request|status_update> --context "<focused context note>" --prompt "Need <instruction/context/assignment>. Reply back to thread $AMS_AGENT_THREAD_ID if needed."',
		'If you are replying to a prior contact, include --reply-to <contactId> so the original request is marked answered.',
		'Use `node scripts/agent-thread-cli.mjs contacts` to inspect the recent contact log for the current thread.'
	];

	if (input.defaultArtifactRoot) {
		contextLines.push(`Default artifact root: ${input.defaultArtifactRoot}`);
	}

	if (input.additionalWritableRoots?.length) {
		contextLines.push(`Additional writable roots: ${input.additionalWritableRoots.join(', ')}`);
	}

	if (input.availableSkillNames?.length) {
		contextLines.push(`Installed skills available: ${input.availableSkillNames.join(', ')}`);
	}

	if (input.requiredPromptSkillNames?.length) {
		contextLines.push(
			`Prefer installed skills for this task: ${input.requiredPromptSkillNames.join(', ')}`
		);
	}

	const roleLines = input.preferredRole
		? [
				'Preferred role:',
				`Role: ${input.preferredRole.name}`,
				...(input.preferredRole.description.trim()
					? [`Role description: ${input.preferredRole.description.trim()}`]
					: []),
				...(input.preferredRole.systemPrompt.trim()
					? [`Role instructions: ${input.preferredRole.systemPrompt.trim()}`]
					: []),
				...(input.preferredRole.skillIds.length > 0
					? [`Role skills: ${input.preferredRole.skillIds.join(', ')}`]
					: []),
				...(input.preferredRole.toolIds.length > 0
					? [`Role tools: ${input.preferredRole.toolIds.join(', ')}`]
					: []),
				...(input.preferredRole.mcpIds.length > 0
					? [`Role MCPs: ${input.preferredRole.mcpIds.join(', ')}`]
					: [])
			]
		: [];

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
		'Execution contract:',
		'Ready condition:',
		readyCondition,
		'',
		'Expected outcome:',
		expectedOutcome,
		'',
		'Success criteria:',
		successCriteria,
		'',
		'Completion standard:',
		'- Do not claim completion unless the expected outcome exists and the success criteria are met.',
		'- If the ready condition is false or becomes false, stop and report the mismatch instead of pushing ahead.',
		'- In the completion update, state what changed, which criteria were satisfied, and which gaps remain.',
		...(input.delegationPacket
			? [
					'',
					'Delegation packet:',
					...(input.delegationPacket.objective
						? [`Objective: ${input.delegationPacket.objective}`]
						: []),
					...(input.delegationPacket.inputContext
						? [`Input context: ${input.delegationPacket.inputContext}`]
						: []),
					...(input.delegationPacket.expectedDeliverable
						? [`Expected deliverable: ${input.delegationPacket.expectedDeliverable}`]
						: []),
					...(input.delegationPacket.doneCondition
						? [`Done condition: ${input.delegationPacket.doneCondition}`]
						: []),
					...(input.delegationPacket.integrationNotes
						? [`Integration notes: ${input.delegationPacket.integrationNotes}`]
						: [])
				]
			: []),
		...(roleLines.length > 0 ? ['', ...roleLines] : []),
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
		...coordinationLines,
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
