import { describe, expect, it } from 'vitest';
import { buildTaskExecutionPreflight } from './task-execution-preflight';

describe('buildTaskExecutionPreflight', () => {
	it('summarizes uncovered requirements and current-assignee gaps', () => {
		const preflight = buildTaskExecutionPreflight(
			{
				requiredCapabilityNames: ['planning', 'citations'],
				requiredToolNames: ['codex', 'playwright'],
				assigneeExecutionSurfaceId: 'worker_local'
			},
			[
				{
					executionSurfaceId: 'worker_local',
					executionSurfaceName: 'Local execution surface',
					roleId: 'role_coordinator',
					providerId: 'provider_local',
					status: 'idle',
					workloadState: 'saturated',
					eligible: false,
					matchingRequirements: false,
					exactRoleMatch: true,
					assignmentLimit: 1,
					assignedOpenTaskCount: 0,
					projectedAssignedOpenTaskCount: 1,
					availableAssignmentCapacity: 1,
					withinAssignmentLimit: true,
					concurrencyLimit: 1,
					activeRunCount: 1,
					projectedActiveRunCount: 2,
					availableRunCapacity: 0,
					withinConcurrencyLimit: false,
					missingCapabilityNames: ['citations'],
					missingToolNames: ['playwright']
				},
				{
					executionSurfaceId: 'worker_cloud',
					executionSurfaceName: 'Cloud execution surface',
					roleId: 'role_coordinator',
					providerId: 'provider_cloud',
					status: 'idle',
					workloadState: 'idle',
					eligible: true,
					matchingRequirements: true,
					exactRoleMatch: true,
					assignmentLimit: 1,
					assignedOpenTaskCount: 0,
					projectedAssignedOpenTaskCount: 1,
					availableAssignmentCapacity: 1,
					withinAssignmentLimit: true,
					concurrencyLimit: 1,
					activeRunCount: 0,
					projectedActiveRunCount: 1,
					availableRunCapacity: 1,
					withinConcurrencyLimit: true,
					missingCapabilityNames: [],
					missingToolNames: ['playwright']
				}
			]
		);

		expect(preflight).toMatchObject({
			hasDeclaredRequirements: true,
			registeredExecutionSurfaceCount: 2,
			eligibleExecutionSurfaceCount: 1,
			fullCoverageExecutionSurfaceCount: 0,
			uncoveredCapabilityNames: [],
			uncoveredToolNames: ['playwright'],
			directProvider: null,
			currentAssignee: {
				executionSurfaceId: 'worker_local',
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
				assigneeExecutionSurfaceId: null
			},
			[]
		);

		expect(preflight).toMatchObject({
			hasDeclaredRequirements: false,
			registeredExecutionSurfaceCount: 0,
			eligibleExecutionSurfaceCount: 0,
			fullCoverageExecutionSurfaceCount: 0,
			uncoveredCapabilityNames: [],
			uncoveredToolNames: [],
			directProvider: null,
			currentAssignee: null
		});
	});

	it('recognizes a direct provider launch path when no execution surface is registered', () => {
		const preflight = buildTaskExecutionPreflight(
			{
				requiredCapabilityNames: ['planning'],
				requiredToolNames: ['codex'],
				assigneeExecutionSurfaceId: null
			},
			[],
			{
				id: 'provider_local',
				name: 'Local Codex Worker',
				enabled: true,
				launcher: 'codex',
				capabilities: ['planning']
			}
		);

		expect(preflight).toMatchObject({
			hasDeclaredRequirements: true,
			registeredExecutionSurfaceCount: 0,
			eligibleExecutionSurfaceCount: 0,
			fullCoverageExecutionSurfaceCount: 0,
			uncoveredCapabilityNames: ['planning'],
			uncoveredToolNames: ['codex'],
			directProvider: {
				providerId: 'provider_local',
				providerName: 'Local Codex Worker',
				enabled: true,
				canLaunchDirectly: true,
				hasFullCoverage: true,
				missingCapabilityNames: [],
				missingToolNames: []
			},
			currentAssignee: null
		});
	});
});
