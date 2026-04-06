import type { AgentThreadDetail, AgentThreadTaskLink } from '$lib/types/agent-thread';
import type { Task } from '$lib/types/control-plane';
import type {
	ThreadCategorization,
	ThreadCategorizationMatch
} from '$lib/types/thread-categorization';
import {
	deriveTaskCategorization,
	deriveTaskTopicLabels,
	normalizeTopicLabel
} from '$lib/server/task-thread-topics';

const TASK_THREAD_STOP_WORDS = new Set([
	'a',
	'an',
	'and',
	'are',
	'for',
	'from',
	'into',
	'its',
	'new',
	'that',
	'the',
	'this',
	'to',
	'with'
]);

export type TaskThreadAssignmentCandidate = {
	id: string;
	name: string;
	topicLabels: string[];
	categorization?: ThreadCategorization;
	matchedContext: ThreadCategorizationMatch;
	threadState: AgentThreadDetail['threadState'];
	canResume: boolean;
	hasActiveRun: boolean;
	relatedTasks: AgentThreadTaskLink[];
	previewText: string;
	isSuggested: boolean;
	suggestionReason: string | null;
};

type TaskThreadSuggestionResult = {
	candidateThreads: TaskThreadAssignmentCandidate[];
	suggestedThread: TaskThreadAssignmentCandidate | null;
};

type RankedTaskThreadCandidate = TaskThreadAssignmentCandidate & {
	score: number;
	isAssigned: boolean;
	availableForAssignment: boolean;
	keywordOverlapScore: number;
	sharedTopicLabels: string[];
	thread: AgentThreadDetail;
};

type BuildTaskThreadSuggestionInput = {
	task: Task;
	assignedThreadId: string | null;
	threads: AgentThreadDetail[];
};

function tokenizeSearchText(value: string) {
	return [
		...new Set(
			value
				.toLowerCase()
				.split(/[^a-z0-9]+/g)
				.map((token) => token.trim())
				.filter((token) => token.length >= 3 && !TASK_THREAD_STOP_WORDS.has(token))
		)
	];
}

function buildCandidatePreviewText(thread: AgentThreadDetail) {
	return thread.latestRun?.lastMessage ?? thread.threadSummary ?? '';
}

function getRelatedTaskScore(task: Task, thread: AgentThreadDetail) {
	const relatedTaskIds = new Set(thread.relatedTasks.map((relatedTask) => relatedTask.id));

	if (relatedTaskIds.has(task.id)) {
		return 70;
	}

	const dependencyMatches = task.dependencyTaskIds.filter((dependencyId) =>
		relatedTaskIds.has(dependencyId)
	).length;

	return dependencyMatches > 0 ? dependencyMatches * 35 : thread.relatedTasks.length > 0 ? 8 : 0;
}

function getThreadStateScore(thread: AgentThreadDetail) {
	switch (thread.threadState) {
		case 'ready':
			return 18;
		case 'idle':
			return 14;
		case 'attention':
			return 8;
		default:
			return 0;
	}
}

function getKeywordOverlapScore(taskTokens: string[], thread: AgentThreadDetail) {
	if (taskTokens.length === 0) {
		return 0;
	}

	const nameTokens = new Set(tokenizeSearchText(thread.name));
	const relatedTaskTokens = new Set(
		tokenizeSearchText(thread.relatedTasks.map((relatedTask) => relatedTask.title).join(' '))
	);
	const previewTokens = new Set(tokenizeSearchText(buildCandidatePreviewText(thread)));
	const nameOverlapCount = taskTokens.filter((token) => nameTokens.has(token)).length;
	const relatedTaskOverlapCount = taskTokens.filter((token) => relatedTaskTokens.has(token)).length;
	const previewOverlapCount = taskTokens.filter((token) => previewTokens.has(token)).length;

	return nameOverlapCount * 12 + relatedTaskOverlapCount * 14 + previewOverlapCount * 5;
}

function getSharedTopicLabels(taskTopicLabels: string[], thread: AgentThreadDetail) {
	const threadTopicLabels = new Set((thread.topicLabels ?? []).map(normalizeTopicLabel));

	return taskTopicLabels.filter((label) => threadTopicLabels.has(normalizeTopicLabel(label)));
}

function collectSharedLabels(left: string[], right: string[]) {
	const rightLabels = new Set(right.map((label) => normalizeTopicLabel(label)));
	return left.filter((label) => rightLabels.has(normalizeTopicLabel(label)));
}

function mergeSharedLabels(...labelGroups: string[][]) {
	return labelGroups
		.flat()
		.filter(
			(label, index, labels) =>
				labels.findIndex(
					(candidate) => normalizeTopicLabel(candidate) === normalizeTopicLabel(label)
				) === index
		);
}

function getCategorizationOverlap(
	taskCategorization: ThreadCategorization,
	thread: AgentThreadDetail
): ThreadCategorizationMatch {
	const threadCategorization = thread.categorization;
	const projectLabels = collectSharedLabels(
		taskCategorization.projectLabels,
		threadCategorization?.projectLabels ?? []
	);
	const goalLabels = collectSharedLabels(
		taskCategorization.goalLabels,
		threadCategorization?.goalLabels ?? []
	);
	const areaLabels = collectSharedLabels(
		taskCategorization.areaLabels,
		threadCategorization?.areaLabels ?? []
	);
	const focusLabels = collectSharedLabels(
		taskCategorization.focusLabels,
		threadCategorization?.focusLabels ?? []
	);
	const entityLabels = collectSharedLabels(
		taskCategorization.entityLabels,
		threadCategorization?.entityLabels ?? []
	);
	const roleLabels = collectSharedLabels(
		taskCategorization.roleLabels,
		threadCategorization?.roleLabels ?? []
	);
	const capabilityLabels = collectSharedLabels(
		taskCategorization.capabilityLabels,
		threadCategorization?.capabilityLabels ?? []
	);
	const toolLabels = collectSharedLabels(
		taskCategorization.toolLabels,
		threadCategorization?.toolLabels ?? []
	);
	const keywordLabels = collectSharedLabels(
		taskCategorization.keywordLabels,
		threadCategorization?.keywordLabels ?? []
	);
	const labels = mergeSharedLabels(
		projectLabels,
		goalLabels,
		areaLabels,
		focusLabels,
		entityLabels,
		roleLabels,
		capabilityLabels,
		toolLabels,
		keywordLabels,
		getSharedTopicLabels(taskCategorization.labels, thread)
	);

	return {
		projectLabels,
		goalLabels,
		areaLabels,
		focusLabels,
		entityLabels,
		roleLabels,
		capabilityLabels,
		toolLabels,
		keywordLabels,
		labels
	};
}

function getScopeOverlap(task: Task, thread: AgentThreadDetail): ThreadCategorizationMatch {
	const threadCategorization = thread.categorization;
	const projectLabels =
		task.projectId &&
		threadCategorization?.projectIds.includes(task.projectId) &&
		threadCategorization.projectLabels.length > 0
			? threadCategorization.projectLabels
			: [];
	const goalLabels =
		task.goalId &&
		threadCategorization?.goalIds.includes(task.goalId) &&
		threadCategorization.goalLabels.length > 0
			? threadCategorization.goalLabels
			: [];

	return {
		projectLabels,
		goalLabels,
		areaLabels: [],
		focusLabels: [],
		entityLabels: [],
		roleLabels: [],
		capabilityLabels: [],
		toolLabels: [],
		keywordLabels: [],
		labels: mergeSharedLabels(projectLabels, goalLabels)
	};
}

function mergeCategorizationMatches(
	...matches: ThreadCategorizationMatch[]
): ThreadCategorizationMatch {
	return {
		projectLabels: mergeSharedLabels(...matches.map((match) => match.projectLabels)),
		goalLabels: mergeSharedLabels(...matches.map((match) => match.goalLabels)),
		areaLabels: mergeSharedLabels(...matches.map((match) => match.areaLabels)),
		focusLabels: mergeSharedLabels(...matches.map((match) => match.focusLabels)),
		entityLabels: mergeSharedLabels(...matches.map((match) => match.entityLabels)),
		roleLabels: mergeSharedLabels(...matches.map((match) => match.roleLabels)),
		capabilityLabels: mergeSharedLabels(...matches.map((match) => match.capabilityLabels)),
		toolLabels: mergeSharedLabels(...matches.map((match) => match.toolLabels)),
		keywordLabels: mergeSharedLabels(...matches.map((match) => match.keywordLabels)),
		labels: mergeSharedLabels(...matches.map((match) => match.labels))
	};
}

function getCategorizationScore(match: ThreadCategorizationMatch) {
	return (
		match.projectLabels.length * 18 +
		match.goalLabels.length * 26 +
		(match.areaLabels ?? []).length * 18 +
		match.focusLabels.length * 16 +
		match.entityLabels.length * 14 +
		match.roleLabels.length * 14 +
		match.capabilityLabels.length * 12 +
		match.toolLabels.length * 12 +
		match.keywordLabels.length * 10
	);
}

function getContextContinuityScore(
	taskCategorization: ThreadCategorization,
	thread: AgentThreadDetail,
	sharedContext: ThreadCategorizationMatch
) {
	const threadCategorization = thread.categorization;
	const threadHasScopedContext =
		(threadCategorization?.projectIds.length ?? 0) > 0 ||
		(threadCategorization?.goalIds.length ?? 0) > 0;
	const taskHasSpecificFocus =
		taskCategorization.focusLabels.length > 0 ||
		taskCategorization.capabilityLabels.length > 0 ||
		taskCategorization.toolLabels.length > 0 ||
		taskCategorization.keywordLabels.length > 0;
	let score = 0;

	if (thread.relatedTasks.length > 0 && threadHasScopedContext) {
		score += 10;
	}

	if (taskCategorization.focusLabels.length > 0) {
		score += sharedContext.focusLabels.length * 14;
	}

	if (taskCategorization.capabilityLabels.length > 0) {
		score += sharedContext.capabilityLabels.length * 16;
	}

	if (taskCategorization.toolLabels.length > 0) {
		score += sharedContext.toolLabels.length * 14;
	}

	if (taskCategorization.keywordLabels.length > 0) {
		score += sharedContext.keywordLabels.length * 10;
	}

	if (
		taskHasSpecificFocus &&
		thread.relatedTasks.length === 0 &&
		sharedContext.focusLabels.length === 0 &&
		sharedContext.capabilityLabels.length === 0 &&
		sharedContext.toolLabels.length === 0 &&
		sharedContext.keywordLabels.length === 0
	) {
		score -= 18;
	}

	return score;
}

function buildSuggestionReason(
	task: Task,
	thread: AgentThreadDetail,
	keywordOverlapScore: number,
	sharedContext: ThreadCategorizationMatch
) {
	if (thread.relatedTasks.some((relatedTask) => relatedTask.id === task.id)) {
		return 'Already linked to this task and available for follow-up.';
	}

	if (
		task.dependencyTaskIds.some((dependencyId) =>
			thread.relatedTasks.some((relatedTask) => relatedTask.id === dependencyId)
		)
	) {
		return 'Linked to a dependency for this task and available to continue the work.';
	}

	const overlapParts = [
		sharedContext.goalLabels.length > 0 ? `goal ${sharedContext.goalLabels.join(', ')}` : null,
		sharedContext.projectLabels.length > 0
			? `project ${sharedContext.projectLabels.join(', ')}`
			: null,
		(sharedContext.areaLabels ?? []).length > 0
			? `area ${(sharedContext.areaLabels ?? []).join(', ')}`
			: null,
		sharedContext.focusLabels.length > 0 ? `focus ${sharedContext.focusLabels.join(', ')}` : null,
		sharedContext.entityLabels.length > 0
			? `context ${sharedContext.entityLabels.join(', ')}`
			: null,
		sharedContext.roleLabels.length > 0 ? `role ${sharedContext.roleLabels.join(', ')}` : null,
		sharedContext.capabilityLabels.length > 0
			? `capabilities ${sharedContext.capabilityLabels.join(', ')}`
			: null,
		sharedContext.toolLabels.length > 0 ? `tools ${sharedContext.toolLabels.join(', ')}` : null,
		sharedContext.keywordLabels.length > 0
			? `terms ${sharedContext.keywordLabels.join(', ')}`
			: null
	].filter((value): value is string => Boolean(value));

	if (overlapParts.length > 0) {
		return `Matches this task's ${overlapParts.join('; ')}. This thread is available for follow-up.`;
	}

	if (sharedContext.labels.length > 0) {
		return `Shares topic labels with this task: ${sharedContext.labels.join(', ')}. This thread is available for follow-up.`;
	}

	if (keywordOverlapScore > 0) {
		return 'Matches this task topic and is available for follow-up.';
	}

	if (thread.relatedTasks.length > 0) {
		return 'Already carries nearby task context and is available to continue the work.';
	}

	return 'Available in this project for a new assignment.';
}

function compareCandidateThreads(
	left: TaskThreadAssignmentCandidate & { score: number; isAssigned: boolean },
	right: TaskThreadAssignmentCandidate & { score: number; isAssigned: boolean }
) {
	if (left.isAssigned !== right.isAssigned) {
		return left.isAssigned ? -1 : 1;
	}

	if (left.score !== right.score) {
		return right.score - left.score;
	}

	return left.name.localeCompare(right.name);
}

export function buildTaskThreadSuggestions(
	input: BuildTaskThreadSuggestionInput
): TaskThreadSuggestionResult {
	const taskTokens = tokenizeSearchText(`${input.task.title} ${input.task.summary}`);
	const taskCategorization = deriveTaskCategorization(input.task);
	const taskTopicLabels = deriveTaskTopicLabels(input.task);
	const candidates: RankedTaskThreadCandidate[] = input.threads.map((thread) => {
		const previewText = buildCandidatePreviewText(thread);
		const availableScore = thread.canResume && !thread.hasActiveRun ? 100 : 0;
		const keywordOverlapScore = getKeywordOverlapScore(taskTokens, thread);
		const sharedContext = mergeCategorizationMatches(
			getCategorizationOverlap(taskCategorization, thread),
			getScopeOverlap(input.task, thread)
		);
		const sharedTopicLabels = sharedContext.labels.length
			? sharedContext.labels
			: getSharedTopicLabels(taskTopicLabels, thread);
		const contextContinuityScore = getContextContinuityScore(
			taskCategorization,
			thread,
			sharedContext
		);
		const score =
			availableScore +
			getThreadStateScore(thread) +
			getRelatedTaskScore(input.task, thread) +
			getCategorizationScore(sharedContext) +
			contextContinuityScore +
			sharedTopicLabels.length * 6 +
			keywordOverlapScore;

		return {
			id: thread.id,
			name: thread.name,
			topicLabels: thread.topicLabels ?? [],
			categorization: thread.categorization,
			matchedContext: sharedContext,
			threadState: thread.threadState,
			canResume: thread.canResume,
			hasActiveRun: thread.hasActiveRun,
			relatedTasks: thread.relatedTasks,
			previewText,
			isSuggested: false,
			suggestionReason: null,
			score,
			isAssigned: thread.id === input.assignedThreadId,
			availableForAssignment: thread.canResume && !thread.hasActiveRun,
			keywordOverlapScore,
			sharedTopicLabels,
			thread
		};
	});
	const suggestedCandidate = [...candidates]
		.filter((candidate) => candidate.availableForAssignment)
		.sort(compareCandidateThreads)
		.at(0);

	const candidateThreads = candidates
		.map((candidate): TaskThreadAssignmentCandidate & { score: number; isAssigned: boolean } => {
			const isSuggested = candidate.id === suggestedCandidate?.id;

			return {
				id: candidate.id,
				name: candidate.name,
				topicLabels: candidate.topicLabels,
				categorization: candidate.categorization,
				matchedContext: candidate.matchedContext,
				threadState: candidate.threadState,
				canResume: candidate.canResume,
				hasActiveRun: candidate.hasActiveRun,
				relatedTasks: candidate.relatedTasks,
				previewText: candidate.previewText,
				isSuggested,
				suggestionReason: isSuggested
					? buildSuggestionReason(
							input.task,
							candidate.thread,
							candidate.keywordOverlapScore,
							candidate.matchedContext
						)
					: null,
				score: candidate.score,
				isAssigned: candidate.isAssigned
			};
		})
		.sort(compareCandidateThreads);
	const suggestedThread = candidateThreads.find((candidate) => candidate.isSuggested) ?? null;

	return {
		candidateThreads: candidateThreads.map(
			({ score: _score, isAssigned: _isAssigned, ...candidate }) => candidate
		),
		suggestedThread
	};
}
