import { beforeEach, describe, expect, it } from 'vitest';
import { mergeStoredTaskRecord, taskRecordStore } from '$lib/client/task-record-store';
import { get } from 'svelte/store';

describe('taskRecordStore', () => {
	beforeEach(() => {
		taskRecordStore.reset();
	});

	it('merges newer task fields over older snapshots', () => {
		taskRecordStore.seedTasks([
			{
				id: 'task-1',
				title: 'Original title',
				status: 'ready',
				summary: 'Original summary'
			}
		]);

		taskRecordStore.seedTask({
			id: 'task-1',
			title: 'Updated title',
			status: 'in_progress'
		});

		expect(get(taskRecordStore).byId['task-1']).toMatchObject({
			id: 'task-1',
			title: 'Updated title',
			status: 'in_progress',
			summary: 'Original summary'
		});
	});

	it('overlays stored task fields onto page-local task shapes', () => {
		taskRecordStore.seedTask({
			id: 'task-7',
			title: 'Fresh task title',
			status: 'blocked',
			openReview: {
				id: 'review-1'
			}
		});

		const merged = mergeStoredTaskRecord(
			{
				id: 'task-7',
				title: 'Stale title',
				status: 'ready',
				projectName: 'AMS'
			},
			get(taskRecordStore).byId
		);

		expect(merged).toMatchObject({
			id: 'task-7',
			title: 'Fresh task title',
			status: 'blocked',
			projectName: 'AMS'
		});
	});
});
