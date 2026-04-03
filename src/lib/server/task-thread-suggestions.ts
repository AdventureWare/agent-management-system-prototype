import type { AgentSessionDetail, AgentSessionTaskLink } from '$lib/types/agent-session';
import type { Task } from '$lib/types/control-plane';
import type { ThreadCategorization, ThreadCategorizationMatch } from '$lib/types/thread-categorization';
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
	sessionState: AgentSessionDetail['sessionState'];
	canResume: boolean;
	hasActiveRun: boolean;
	relatedTasks: AgentSessionTaskLink[];
	previewText: string;
	isSuggested: boolean;
	suggestionReason: string | null;
};

type TaskThreadSuggestionResult = {
	candidateThreads: TaskThreadAssignmentCandidate[];
	suggestedThread: TaskThreadAssignmentCandidate | null;
};

type BuildTaskThreadSuggestionInput = {
	task: Task;
	assignedThreadId: string | null;
	sessions: AgentSessionDetail[];
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

function buildCandidatePreviewText(session: AgentSessionDetail) {
	return session.latestRun?.lastMessage ?? session.sessionSummary;
}

function getRelatedTaskScore(task: Task, session: AgentSessionDetail) {
	const relatedTaskIds = new Set(session.relatedTasks.map((relatedTask) => relatedTask.id));

	if (relatedTaskIds.has(task.id)) {
		return 70;
	}

	const dependencyMatches = task.dependencyTaskIds.filter((dependencyId) =>
		relatedTaskIds.has(dependencyId)
	).length;

	return dependencyMatches > 0 ? dependencyMatches * 35 : session.relatedTasks.length > 0 ? 8 : 0;
}

function getThreadStateScore(session: AgentSessionDetail) {
	switch (session.sessionState) {
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

function getKeywordOverlapScore(taskTokens: string[], session: AgentSessionDetail) {
	if (taskTokens.length === 0) {
		return 0;
	}

	const sessionTokens = new Set(
		tokenizeSearchText(
			[
				session.name,
				buildCandidatePreviewText(session),
				...session.relatedTasks.map((relatedTask) => relatedTask.title)
			].join(' ')
		)
	);

	return taskTokens.filter((token) => sessionTokens.has(token)).length * 10;
}

function getSharedTopicLabels(taskTopicLabels: string[], session: AgentSessionDetail) {
	const sessionTopicLabels = new Set((session.topicLabels ?? []).map(normalizeTopicLabel));

	return taskTopicLabels.filter((label) => sessionTopicLabels.has(normalizeTopicLabel(label)));
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
				labels.findIndex((candidate) => normalizeTopicLabel(candidate) === normalizeTopicLabel(label)) ===
				index
		);
}

function getCategorizationOverlap(
	taskCategorization: ThreadCategorization,
	session: AgentSessionDetail
): ThreadCategorizationMatch {
	const sessionCategorization = session.categorization;
	const projectLabels = collectSharedLabels(
		taskCategorization.projectLabels,
		sessionCategorization?.projectLabels ?? []
	);
	const goalLabels = collectSharedLabels(taskCategorization.goalLabels, sessionCategorization?.goalLabels ?? []);
	const laneLabels = collectSharedLabels(taskCategorization.laneLabels, sessionCategorization?.laneLabels ?? []);
	const focusLabels = collectSharedLabels(
		taskCategorization.focusLabels,
		sessionCategorization?.focusLabels ?? []
	);
	const entityLabels = collectSharedLabels(
		taskCategorization.entityLabels,
		sessionCategorization?.entityLabels ?? []
	);
	const roleLabels = collectSharedLabels(taskCategorization.roleLabels, sessionCategorization?.roleLabels ?? []);
	const capabilityLabels = collectSharedLabels(
		taskCategorization.capabilityLabels,
		sessionCategorization?.capabilityLabels ?? []
	);
	const toolLabels = collectSharedLabels(taskCategorization.toolLabels, sessionCategorization?.toolLabels ?? []);
	const keywordLabels = collectSharedLabels(
		taskCategorization.keywordLabels,
		sessionCategorization?.keywordLabels ?? []
	);
	const labels = mergeSharedLabels(
		projectLabels,
		goalLabels,
		laneLabels,
		focusLabels,
		entityLabels,
		roleLabels,
		capabilityLabels,
		toolLabels,
		keywordLabels,
		getSharedTopicLabels(taskCategorization.labels, session)
	);

	return {
		projectLabels,
		goalLabels,
		laneLabels,
		focusLabels,
		entityLabels,
		roleLabels,
		capabilityLabels,
		toolLabels,
		keywordLabels,
		labels
	};
}

function getScopeOverlap(task: Task, session: AgentSessionDetail): ThreadCategorizationMatch {
	const sessionCategorization = session.categorization;
	const projectLabels =
		task.projectId &&
		sessionCategorization?.projectIds.includes(task.projectId) &&
		sessionCategorization.projectLabels.length > 0
			? sessionCategorization.projectLabels
			: [];
	const goalLabels =
		task.goalId &&
		sessionCategorization?.goalIds.includes(task.goalId) &&
		sessionCategorization.goalLabels.length > 0
			? sessionCategorization.goalLabels
			: [];

	return {
		projectLabels,
		goalLabels,
		laneLabels: [],
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
		laneLabels: mergeSharedLabels(...matches.map((match) => match.laneLabels)),
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
		match.laneLabels.length * 18 +
		match.focusLabels.length * 16 +
		match.entityLabels.length * 14 +
		match.roleLabels.length * 14 +
		match.capabilityLabels.length * 12 +
		match.toolLabels.length * 12 +
		match.keywordLabels.length * 10
	);
}

function buildSuggestionReason(
	task: Task,
	session: AgentSessionDetail,
	keywordOverlapScore: number,
	sharedContext: ThreadCategorizationMatch
) {
	if (session.relatedTasks.some((relatedTask) => relatedTask.id === task.id)) {
		return 'Already linked to this task and available for follow-up.';
	}

	if (
		task.dependencyTaskIds.some((dependencyId) =>
			session.relatedTasks.some((relatedTask) => relatedTask.id === dependencyId)
		)
	) {
		return 'Linked to a dependency for this task and available to continue the work.';
	}

	const overlapParts = [
		sharedContext.goalLabels.length > 0 ? `goal ${sharedContext.goalLabels.join(', ')}` : null,
		sharedContext.projectLabels.length > 0
			? `project ${sharedContext.projectLabels.join(', ')}`
			: null,
		sharedContext.laneLabels.length > 0 ? `area ${sharedContext.laneLabels.join(', ')}` : null,
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

	if (session.relatedTasks.length > 0) {
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
	const candidates = input.sessions.map((session) => {
		const previewText = buildCandidatePreviewText(session);
		const availableScore = session.canResume && !session.hasActiveRun ? 100 : 0;
		const keywordOverlapScore = getKeywordOverlapScore(taskTokens, session);
		const sharedContext = mergeCategorizationMatches(
			getCategorizationOverlap(taskCategorization, session),
			getScopeOverlap(input.task, session)
		);
		const sharedTopicLabels = sharedContext.labels.length
			? sharedContext.labels
			: getSharedTopicLabels(taskTopicLabels, session);
		const score =
			availableScore +
			getThreadStateScore(session) +
			getRelatedTaskScore(input.task, session) +
			getCategorizationScore(sharedContext) +
			sharedTopicLabels.length * 6 +
			keywordOverlapScore;

		return {
			id: session.id,
			name: session.name,
			topicLabels: session.topicLabels ?? [],
			categorization: session.categorization,
			matchedContext: sharedContext,
			sessionState: session.sessionState,
			canResume: session.canResume,
			hasActiveRun: session.hasActiveRun,
			relatedTasks: session.relatedTasks,
			previewText,
			isSuggested: false,
			suggestionReason: null,
			score,
			isAssigned: session.id === input.assignedThreadId,
			availableForAssignment: session.canResume && !session.hasActiveRun,
			keywordOverlapScore,
			sharedTopicLabels,
			session
		};
	});
	const suggestedCandidate = [...candidates]
		.filter((candidate) => candidate.availableForAssignment)
		.sort(compareCandidateThreads)
		.at(0);

	const candidateThreads = candidates
		.map((candidate) => {
			const isSuggested = candidate.id === suggestedCandidate?.id;

			return {
				id: candidate.id,
				name: candidate.name,
				topicLabels: candidate.topicLabels,
				categorization: candidate.categorization,
				matchedContext: candidate.matchedContext,
				sessionState: candidate.sessionState,
				canResume: candidate.canResume,
				hasActiveRun: candidate.hasActiveRun,
				relatedTasks: candidate.relatedTasks,
				previewText: candidate.previewText,
				isSuggested,
				suggestionReason: isSuggested
						? buildSuggestionReason(
								input.task,
								candidate.session,
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
