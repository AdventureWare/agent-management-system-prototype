import { describe, expect, it } from 'vitest';
import { buildTaskExecutionPreflight } from './task-execution-preflight';

describe('buildTaskExecutionPreflight', () => {
	it('summarizes uncovered requirements and current-assignee gaps', () => {
		const preflight = buildTaskExecutionPreflight(
			{
				requiredCapabilityNames: ['planning', 'citations'],
				requiredToolNames: ['codex', 'playwright'],
				assigneeWorkerId: 'worker_local'
			},
			[
				{
					workerId: 'worker_local',
					workerName: 'Local worker',
					roleId: 'role_coordinator',
					providerId: 'provider_local',
					status: 'idle',
					eligible: false,
					exactRoleMatch: true,
					assignedOpenTaskCount: 0,
					activeRunCount: 1,
					availableRunCapacity: 0,
					withinConcurrencyLimit: false,
					missingCapabilityNames: ['citations'],
					missingToolNames: ['playwright']
				},
				{
					workerId: 'worker_cloud',
					workerName: 'Cloud worker',
					roleId: 'role_coordinator',
					providerId: 'provider_cloud',
					status: 'idle',
					eligible: true,
					exactRoleMatch: true,
					assignedOpenTaskCount: 0,
					activeRunCount: 0,
					availableRunCapacity: 1,
					withinConcurrencyLimit: true,
					missingCapabilityNames: [],
					missingToolNames: ['playwright']
				}
			]
		);

		expect(preflight).toMatchObject({
			hasDeclaredRequirements: true,
			eligibleWorkerCount: 1,
			fullCoverageWorkerCount: 0,
			uncoveredCapabilityNames: [],
			uncoveredToolNames: ['playwright'],
			currentAssignee: {
				workerId: 'worker_local',
				withinConcurrencyLimit: false,
				missingCapabilityNames: ['citations'],
				missingToolNames: ['playwright'],
				hasFullCoverage: false
			}
		});
	});

	it('handles tasks without declared requirements', () => {
		const preflight = buildTaskExecutionPreflight(
			{
				requiredCapabilityNames: [],
				requiredToolNames: [],
				assigneeWorkerId: null
			},
			[]
		);

		expect(preflight).toMatchObject({
			hasDeclaredRequirements: false,
			eligibleWorkerCount: 0,
			fullCoverageWorkerCount: 0,
			uncoveredCapabilityNames: [],
			uncoveredToolNames: [],
			currentAssignee: null
		});
	});
});
