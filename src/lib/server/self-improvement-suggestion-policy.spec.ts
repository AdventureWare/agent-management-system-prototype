import { describe, expect, it } from 'vitest';
import {
	SELF_IMPROVEMENT_SUGGESTION_POLICY_VERSION,
	rankSelfImprovementOpportunities
} from './self-improvement-suggestion-policy';
import type { SelfImprovementOpportunity } from '$lib/types/self-improvement';

function createOpportunity(
	overrides: Partial<SelfImprovementOpportunity> & Pick<SelfImprovementOpportunity, 'id' | 'title'>
): SelfImprovementOpportunity {
	return {
		id: overrides.id,
		title: overrides.title,
		summary: overrides.summary ?? 'Summary',
		category: overrides.category ?? 'coordination',
		source: overrides.source ?? 'planning_gaps',
		severity: overrides.severity ?? 'medium',
		confidence: overrides.confidence ?? 'medium',
		projectId: overrides.projectId ?? 'project_1',
		projectName: overrides.projectName ?? 'Project One',
		signals: overrides.signals ?? ['One signal'],
		recommendedActions: overrides.recommendedActions ?? ['Do the next thing'],
		relatedTaskIds: overrides.relatedTaskIds ?? [],
		relatedRunIds: overrides.relatedRunIds ?? [],
		relatedThreadIds: overrides.relatedThreadIds ?? [],
		suggestedTask: overrides.suggestedTask ?? null,
		suggestedKnowledgeItem: overrides.suggestedKnowledgeItem ?? null
	};
}

describe('rankSelfImprovementOpportunities', () => {
	it('prioritizes higher-severity, higher-confidence, more actionable opportunities', () => {
		const ranked = rankSelfImprovementOpportunities([
			createOpportunity({
				id: 'captured_suggestions:1',
				title: 'Optional suggestion',
				source: 'captured_suggestions',
				severity: 'low',
				confidence: 'low'
			}),
			createOpportunity({
				id: 'failed_runs:task_1',
				title: 'Stabilize failing path',
				source: 'failed_runs',
				severity: 'high',
				confidence: 'high',
				signals: ['Repeated failures', 'Linked blocker'],
				relatedTaskIds: ['task_1'],
				relatedRunIds: ['run_1', 'run_2'],
				relatedThreadIds: ['session_1'],
				suggestedTask: {
					title: 'Stabilize failing path',
					summary: 'Add the recovery guard.',
					priority: 'high'
				}
			})
		]);

		expect(ranked[0]?.id).toBe('failed_runs:task_1');
		expect(ranked[0]?.rankingScore).toBeGreaterThan(ranked[1]?.rankingScore ?? 0);
		expect(ranked[0]?.rankingPolicyVersion).toBe(SELF_IMPROVEMENT_SUGGESTION_POLICY_VERSION);
	});

	it('attaches short ranking reasons for UI explanation', () => {
		const [ranked] = rankSelfImprovementOpportunities([
			createOpportunity({
				id: 'planning_gaps:goal_1',
				title: 'Generate next steps',
				source: 'planning_gaps',
				severity: 'high',
				confidence: 'medium',
				signals: ['No forward-progress task', 'Blocked prerequisite'],
				relatedTaskIds: ['task_1', 'task_2'],
				suggestedTask: {
					title: 'Plan next step',
					summary: 'Create the next concrete task.',
					priority: 'high'
				}
			})
		]);

		expect(ranked?.rankingReasons).toBeDefined();
		expect(ranked?.rankingReasons?.length).toBeGreaterThan(0);
		expect(ranked?.rankingReasons?.join(' ')).toContain('High-severity');
	});
});
