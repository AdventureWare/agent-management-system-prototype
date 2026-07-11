export const GOAL_LOOP_COUNT_ROW_DEFINITIONS = [
	{ key: 'actionableNow', classification: 'actionable_now', label: 'Actionable now' },
	{ key: 'inProgress', classification: 'in_progress', label: 'In progress' },
	{ key: 'awaitingReview', classification: 'awaiting_review', label: 'Awaiting review' },
	{ key: 'approvalRequired', classification: 'approval_required', label: 'Approval required' },
	{ key: 'blocked', classification: 'blocked', label: 'Blocked' },
	{ key: 'needsPlanning', classification: 'needs_planning', label: 'Needs planning' },
	{ key: 'needsResearch', classification: 'needs_research', label: 'Needs research' },
	{ key: 'needsClarification', classification: 'needs_clarification', label: 'Needs clarification' },
	{ key: 'needsRevision', classification: 'needs_revision', label: 'Needs revision' },
	{ key: 'unsafeOutOfScope', classification: 'unsafe_out_of_scope', label: 'Unsafe/out of scope' },
	{
		key: 'duplicateSuperseded',
		classification: 'duplicate_superseded',
		label: 'Duplicate/superseded'
	},
	{ key: 'acceptedDone', classification: 'accepted_done', label: 'Accepted/done' }
] as const;

export type GoalLoopCountKey = (typeof GOAL_LOOP_COUNT_ROW_DEFINITIONS)[number]['key'];

export const GOAL_LOOP_OPERATOR_INTERVENTION_ROW_KEYS = [
	'awaitingReview',
	'approvalRequired',
	'blocked'
] as const satisfies readonly GoalLoopCountKey[];

export const GOAL_LOOP_AUTONOMOUS_QUEUE_ROW_KEYS = [
	'actionableNow',
	'blocked',
	'needsPlanning',
	'unsafeOutOfScope'
] as const satisfies readonly GoalLoopCountKey[];

export type GoalLoopCountMap = Record<GoalLoopCountKey, number>;

export type GoalLoopCountRow = {
	key: GoalLoopCountKey;
	classification: (typeof GOAL_LOOP_COUNT_ROW_DEFINITIONS)[number]['classification'];
	label: string;
	count: number;
};

export function buildGoalLoopCountsFromClassificationBuckets(
	byClassification: Record<string, readonly unknown[] | undefined>
): GoalLoopCountMap {
	return Object.fromEntries(
		GOAL_LOOP_COUNT_ROW_DEFINITIONS.map((definition) => [
			definition.key,
			byClassification[definition.classification]?.length ?? 0
		])
	) as GoalLoopCountMap;
}

export function buildGoalLoopCountRows(
	counts: Partial<Record<GoalLoopCountKey, number>>,
	keys: readonly GoalLoopCountKey[] = GOAL_LOOP_COUNT_ROW_DEFINITIONS.map(
		(definition) => definition.key
	)
): GoalLoopCountRow[] {
	const includedKeys = new Set(keys);

	return GOAL_LOOP_COUNT_ROW_DEFINITIONS.filter((definition) =>
		includedKeys.has(definition.key)
	).map((definition) => {
		return {
			...definition,
			count: counts[definition.key] ?? 0
		};
	});
}
