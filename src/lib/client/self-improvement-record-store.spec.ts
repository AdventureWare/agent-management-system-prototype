import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
	mergeStoredKnowledgeItemRecord,
	mergeStoredOpportunityRecord,
	selfImprovementRecordStore
} from '$lib/client/self-improvement-record-store';

describe('selfImprovementRecordStore', () => {
	beforeEach(() => {
		selfImprovementRecordStore.reset();
	});

	it('keeps the latest opportunity fields across page snapshots', () => {
		selfImprovementRecordStore.seedOpportunities([
			{
				id: 'opp-1',
				title: 'Original opportunity',
				status: 'open'
			}
		]);

		selfImprovementRecordStore.seedOpportunities([
			{
				id: 'opp-1',
				title: 'Accepted opportunity',
				status: 'accepted',
				createdTaskId: 'task-42'
			}
		]);

		expect(get(selfImprovementRecordStore).opportunitiesById['opp-1']).toMatchObject({
			id: 'opp-1',
			title: 'Accepted opportunity',
			status: 'accepted',
			createdTaskId: 'task-42'
		});
	});

	it('overlays stored opportunity and knowledge item records onto local shapes', () => {
		selfImprovementRecordStore.seedOpportunities([
			{
				id: 'opp-7',
				status: 'dismissed',
				decisionSummary: 'Already handled elsewhere.'
			}
		]);
		selfImprovementRecordStore.seedKnowledgeItems([
			{
				id: 'knowledge-3',
				status: 'published'
			}
		]);

		expect(
			mergeStoredOpportunityRecord(
				{
					id: 'opp-7',
					status: 'open',
					title: 'Keep title'
				},
				get(selfImprovementRecordStore).opportunitiesById
			)
		).toMatchObject({
			id: 'opp-7',
			status: 'dismissed',
			title: 'Keep title'
		});

		expect(
			mergeStoredKnowledgeItemRecord(
				{
					id: 'knowledge-3',
					status: 'draft',
					title: 'Reusable lesson'
				},
				get(selfImprovementRecordStore).knowledgeItemsById
			)
		).toMatchObject({
			id: 'knowledge-3',
			status: 'published',
			title: 'Reusable lesson'
		});
	});
});
