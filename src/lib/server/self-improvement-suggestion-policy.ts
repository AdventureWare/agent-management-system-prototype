import type {
	SelfImprovementAnalysis,
	SelfImprovementConfidence,
	SelfImprovementOpportunity,
	SelfImprovementSeverity,
	SelfImprovementSource
} from '$lib/types/self-improvement';

export const SELF_IMPROVEMENT_SUGGESTION_POLICY_VERSION = 'heuristic_v1';

const SEVERITY_SCORE: Record<SelfImprovementSeverity, number> = {
	high: 45,
	medium: 24,
	low: 10
};

const CONFIDENCE_SCORE: Record<SelfImprovementConfidence, number> = {
	high: 18,
	medium: 10,
	low: 4
};

const SOURCE_SCORE: Record<SelfImprovementSource, number> = {
	failed_runs: 18,
	blocked_tasks: 16,
	stale_tasks: 14,
	review_feedback: 12,
	thread_reuse_gap: 8,
	planning_gaps: 20,
	captured_suggestions: 9
};

type RankingFactor = {
	score: number;
	reason: string;
};

function buildRankingFactors(opportunity: SelfImprovementOpportunity): RankingFactor[] {
	const relatedRecordCount =
		opportunity.relatedTaskIds.length +
		opportunity.relatedRunIds.length +
		opportunity.relatedSessionIds.length;
	const evidenceScore = Math.min(opportunity.signals.length * 4, 16);
	const relatedRecordScore = Math.min(relatedRecordCount * 3, 18);
	const actionabilityScore = opportunity.suggestedTask
		? 12
		: opportunity.suggestedKnowledgeItem
			? 8
			: 2;

	return [
		{
			score: SEVERITY_SCORE[opportunity.severity],
			reason:
				opportunity.severity === 'high'
					? 'High-severity issue with stronger expected operational impact.'
					: opportunity.severity === 'medium'
						? 'Medium-severity issue worth near-term follow-up.'
						: 'Lower-severity issue that can wait behind more urgent work.'
		},
		{
			score: CONFIDENCE_SCORE[opportunity.confidence],
			reason:
				opportunity.confidence === 'high'
					? 'High-confidence evidence based on stronger supporting context.'
					: opportunity.confidence === 'medium'
						? 'Moderate-confidence evidence with some supporting context.'
						: 'Lower-confidence signal that may need review before action.'
		},
		{
			score: SOURCE_SCORE[opportunity.source],
			reason:
				opportunity.source === 'planning_gaps'
					? 'Planning gaps get a stronger boost because they often stall momentum outright.'
					: `Source boost for ${opportunity.source.replaceAll('_', ' ')} patterns.`
		},
		{
			score: evidenceScore,
			reason:
				opportunity.signals.length > 1
					? `Multiple supporting signals are attached (${opportunity.signals.length}).`
					: 'At least one concrete signal supports this suggestion.'
		},
		{
			score: relatedRecordScore,
			reason:
				relatedRecordCount > 0
					? `This suggestion touches ${relatedRecordCount} related task, run, or session record(s).`
					: 'This suggestion is currently narrow in scope.'
		},
		{
			score: actionabilityScore,
			reason: opportunity.suggestedTask
				? 'A follow-up task can be created directly from this suggestion.'
				: opportunity.suggestedKnowledgeItem
					? 'A saved lesson can be captured directly from this suggestion.'
					: 'This suggestion still needs a manual follow-up choice.'
		},
		{
			score: opportunity.projectId ? 4 : 1,
			reason: opportunity.projectId
				? 'Scoped to a known project, which makes follow-up easier to route.'
				: 'Cross-project suggestion with less specific scope.'
		}
	];
}

function rankOpportunity(opportunity: SelfImprovementOpportunity): SelfImprovementOpportunity {
	const factors = buildRankingFactors(opportunity);
	const rankingScore = factors.reduce((total, factor) => total + factor.score, 0);
	const rankingReasons = [...factors]
		.sort((left, right) => right.score - left.score)
		.slice(0, 3)
		.map((factor) => factor.reason);

	return {
		...opportunity,
		rankingPolicyVersion: SELF_IMPROVEMENT_SUGGESTION_POLICY_VERSION,
		rankingScore,
		rankingReasons
	};
}

export function rankSelfImprovementOpportunities(opportunities: SelfImprovementOpportunity[]) {
	return opportunities
		.map(rankOpportunity)
		.sort((left, right) => {
			if ((right.rankingScore ?? 0) !== (left.rankingScore ?? 0)) {
				return (right.rankingScore ?? 0) - (left.rankingScore ?? 0);
			}

			const severityRank = SEVERITY_SCORE[right.severity] - SEVERITY_SCORE[left.severity];

			if (severityRank !== 0) {
				return severityRank;
			}

			return left.title.localeCompare(right.title);
		});
}

export function rankSelfImprovementAnalysis(
	analysis: SelfImprovementAnalysis
): SelfImprovementAnalysis {
	return {
		...analysis,
		opportunities: rankSelfImprovementOpportunities(analysis.opportunities)
	};
}
