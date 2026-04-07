import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { mergeStoredWorkerRecord, workerRecordStore } from '$lib/client/worker-record-store';

describe('workerRecordStore', () => {
	beforeEach(() => {
		workerRecordStore.reset();
	});

	it('keeps the newest worker fields across list and detail snapshots', () => {
		workerRecordStore.seedWorkers([
			{
				id: 'worker-1',
				name: 'Original worker',
				status: 'idle'
			}
		]);

		workerRecordStore.seedWorker({
			id: 'worker-1',
			name: 'Updated worker',
			status: 'busy',
			note: 'Handling a long-running task'
		});

		expect(get(workerRecordStore).byId['worker-1']).toMatchObject({
			id: 'worker-1',
			name: 'Updated worker',
			status: 'busy',
			note: 'Handling a long-running task'
		});
	});

	it('overlays stored worker fields onto page-local worker shapes', () => {
		workerRecordStore.seedWorker({
			id: 'worker-7',
			status: 'offline',
			providerName: 'Local shell'
		});

		expect(
			mergeStoredWorkerRecord(
				{
					id: 'worker-7',
					status: 'idle',
					name: 'Worker Seven'
				},
				get(workerRecordStore).byId
			)
		).toMatchObject({
			id: 'worker-7',
			status: 'offline',
			name: 'Worker Seven',
			providerName: 'Local shell'
		});
	});
});
