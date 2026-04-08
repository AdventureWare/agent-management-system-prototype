import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
	mergeStoredExecutionSurfaceRecord,
	executionSurfaceRecordStore
} from '$lib/client/execution-surface-record-store';

describe('executionSurfaceRecordStore', () => {
	beforeEach(() => {
		executionSurfaceRecordStore.reset();
	});

	it('keeps the newest worker fields across list and detail snapshots', () => {
		executionSurfaceRecordStore.seedExecutionSurfaces([
			{
				id: 'worker-1',
				name: 'Original worker',
				status: 'idle'
			}
		]);

		executionSurfaceRecordStore.seedExecutionSurface({
			id: 'worker-1',
			name: 'Updated worker',
			status: 'busy',
			note: 'Handling a long-running task'
		});

		expect(get(executionSurfaceRecordStore).byId['worker-1']).toMatchObject({
			id: 'worker-1',
			name: 'Updated worker',
			status: 'busy',
			note: 'Handling a long-running task'
		});
	});

	it('overlays stored worker fields onto page-local worker shapes', () => {
		executionSurfaceRecordStore.seedExecutionSurface({
			id: 'worker-7',
			status: 'offline',
			providerName: 'Local shell'
		});

		expect(
			mergeStoredExecutionSurfaceRecord(
				{
					id: 'worker-7',
					status: 'idle',
					name: 'ExecutionSurface Seven'
				},
				get(executionSurfaceRecordStore).byId
			)
		).toMatchObject({
			id: 'worker-7',
			status: 'offline',
			name: 'ExecutionSurface Seven',
			providerName: 'Local shell'
		});
	});
});
