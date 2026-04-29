import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';

const store = vi.hoisted(() => ({
	data: null as ControlPlaneData | null
}));

const updateControlPlaneCollections = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/control-plane', () => ({
	updateControlPlaneCollections
}));

import {
	parseProjectSkillAvailability,
	updateProjectSkillAvailabilityPolicy
} from './skill-management';

function buildData(): ControlPlaneData {
	return {
		providers: [],
		roles: [],
		projects: [
			{
				id: 'project_app',
				name: 'App',
				summary: '',
				projectRootFolder: '/tmp/app',
				defaultArtifactRoot: '',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: 'main'
			}
		],
		goals: [],
		executionSurfaces: [],
		tasks: [],
		runs: [],
		reviews: [],
		approvals: [],
		taskTemplates: [],
		workflows: []
	};
}

describe('parseProjectSkillAvailability', () => {
	it('accepts explicit policy values and defaults unknown input', () => {
		expect(parseProjectSkillAvailability('enabled')).toBe('enabled');
		expect(parseProjectSkillAvailability('disabled')).toBe('disabled');
		expect(parseProjectSkillAvailability('anything-else')).toBe('default');
	});
});

describe('updateProjectSkillAvailabilityPolicy', () => {
	beforeEach(() => {
		store.data = buildData();
		updateControlPlaneCollections.mockReset();
		updateControlPlaneCollections.mockImplementation(async (updater) => {
			const result = await updater(store.data);
			store.data = result.data;
			return result;
		});
	});

	it('writes the current policy and records an audit event', async () => {
		const result = await updateProjectSkillAvailabilityPolicy({
			projectId: 'project_app',
			skillId: 'docs-writer',
			availability: 'disabled',
			notes: 'Use only after docs cleanup.'
		});

		expect(result).toEqual({
			projectId: 'project_app',
			skillId: 'docs-writer',
			availability: 'disabled'
		});
		expect(store.data?.projects[0]?.skillAvailabilityPolicies).toEqual([
			expect.objectContaining({
				skillId: 'docs-writer',
				availability: 'disabled',
				notes: 'Use only after docs cleanup.'
			})
		]);
		expect(store.data?.projects[0]?.skillAvailabilityPolicyEvents).toEqual([
			expect.objectContaining({
				skillId: 'docs-writer',
				availability: 'disabled',
				notes: 'Use only after docs cleanup.'
			})
		]);
	});

	it('removes the active policy for default availability while keeping history', async () => {
		await updateProjectSkillAvailabilityPolicy({
			projectId: 'project_app',
			skillId: 'docs-writer',
			availability: 'enabled',
			notes: 'Explicitly enabled.'
		});
		await updateProjectSkillAvailabilityPolicy({
			projectId: 'project_app',
			skillId: 'docs-writer',
			availability: 'default',
			notes: ''
		});

		expect(store.data?.projects[0]?.skillAvailabilityPolicies).toEqual([]);
		expect(store.data?.projects[0]?.skillAvailabilityPolicyEvents).toHaveLength(2);
		expect(store.data?.projects[0]?.skillAvailabilityPolicyEvents?.[0]).toMatchObject({
			skillId: 'docs-writer',
			availability: 'default',
			notes: ''
		});
	});

	it('throws when the project does not exist', async () => {
		await expect(
			updateProjectSkillAvailabilityPolicy({
				projectId: 'project_missing',
				skillId: 'docs-writer',
				availability: 'enabled',
				notes: ''
			})
		).rejects.toThrow('Project not found.');
	});
});
