import { loadSelfImprovementDb } from '$lib/server/self-improvement-store';
import type { Project, Task } from '$lib/types/control-plane';
import type {
	RetrievedSelfImprovementKnowledgeItem,
	SelfImprovementKnowledgeItem
} from '$lib/types/self-improvement';

const KNOWLEDGE_MATCH_STOP_WORDS = new Set([
	'a',
	'an',
	'and',
	'for',
	'from',
	'in',
	'into',
	'of',
	'on',
	'or',
	'the',
	'this',
	'to',
	'with'
]);

function tokenizeMatchText(value: string) {
	return [
		...new Set(
			value
				.toLowerCase()
				.split(/[^a-z0-9]+/g)
				.map((token) => token.trim())
				.filter((token) => token.length >= 3 && !KNOWLEDGE_MATCH_STOP_WORDS.has(token))
		)
	];
}

function buildTaskKnowledgeSearchText(task: Task, project: Project | null) {
	return [
		task.title,
		task.summary,
		project?.name ?? '',
		task.status,
		task.priority,
		task.blockedReason,
		...(task.requiredCapabilityNames ?? []),
		...(task.requiredToolNames ?? [])
	].join(' ');
}

function buildKnowledgeSearchText(knowledgeItem: SelfImprovementKnowledgeItem) {
	return [
		knowledgeItem.title,
		knowledgeItem.summary,
		knowledgeItem.triggerPattern,
		knowledgeItem.recommendedResponse,
		knowledgeItem.projectName ?? '',
		...knowledgeItem.applicabilityScope
	].join(' ');
}

function getCategoryHintScore(task: Task, knowledgeItem: SelfImprovementKnowledgeItem) {
	switch (knowledgeItem.category) {
		case 'coordination':
			return task.status === 'blocked' || Boolean(task.blockedReason.trim()) ? 14 : 0;
		case 'quality':
			return task.status === 'review' || task.requiresReview ? 14 : 0;
		case 'knowledge':
			return task.threadSessionId ? 6 : 10;
		case 'automation':
			return task.status === 'in_progress' ? 8 : 0;
		case 'reliability':
			return task.riskLevel === 'high' || task.priority === 'high' || task.priority === 'urgent'
				? 10
				: 0;
		default:
			return 0;
	}
}

export function retrieveRelevantSelfImprovementKnowledgeItems(input: {
	task: Task;
	project: Project | null;
	knowledgeItems: SelfImprovementKnowledgeItem[];
	limit?: number;
}): RetrievedSelfImprovementKnowledgeItem[] {
	const taskTokens = tokenizeMatchText(buildTaskKnowledgeSearchText(input.task, input.project));

	return input.knowledgeItems
		.filter((knowledgeItem) => knowledgeItem.status === 'published')
		.flatMap((knowledgeItem) => {
			const matchReasons: string[] = [];
			let matchScore = 0;
			let hasStrongAnchor = false;

			if (knowledgeItem.sourceTaskIds.includes(input.task.id)) {
				matchScore += 80;
				hasStrongAnchor = true;
				matchReasons.push('Captured from this exact task previously.');
			}

			if (input.project?.id && knowledgeItem.projectId === input.project.id) {
				matchScore += 35;
				hasStrongAnchor = true;
				matchReasons.push(`Matches this project (${input.project.name}).`);
			}

			const keywordMatches = taskTokens.filter((token) =>
				tokenizeMatchText(buildKnowledgeSearchText(knowledgeItem)).includes(token)
			);

			if (keywordMatches.length > 0) {
				matchScore += Math.min(keywordMatches.length, 6) * 6;
				hasStrongAnchor = true;
				matchReasons.push(`Shares task language: ${keywordMatches.slice(0, 4).join(', ')}.`);
			}

			const categoryHintScore = getCategoryHintScore(input.task, knowledgeItem);

			if (categoryHintScore > 0) {
				matchScore += categoryHintScore;
				matchReasons.push(`Aligned with ${knowledgeItem.category} guidance for this task state.`);
			}

			if (matchScore <= 0 || !hasStrongAnchor) {
				return [];
			}

			return [
				{
					...knowledgeItem,
					matchScore,
					matchReasons
				}
			];
		})
		.sort((left, right) => {
			if (left.matchScore !== right.matchScore) {
				return right.matchScore - left.matchScore;
			}

			return right.updatedAt.localeCompare(left.updatedAt);
		})
		.slice(0, input.limit ?? 3);
}

export async function loadRelevantSelfImprovementKnowledgeItems(input: {
	task: Task;
	project: Project | null;
	limit?: number;
}) {
	const db = await loadSelfImprovementDb();

	return retrieveRelevantSelfImprovementKnowledgeItems({
		task: input.task,
		project: input.project,
		knowledgeItems: db.knowledgeItems,
		limit: input.limit
	});
}
