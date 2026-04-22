import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';

const controlPlaneState = vi.hoisted(() => ({
	current: null as ControlPlaneData | null,
	saved: null as ControlPlaneData | null
}));

const createWorkflowMock = vi.hoisted(() =>
	vi.fn((input: { name: string; summary: string; projectId: string }) => ({
		id: `workflow_${input.name.toLowerCase().replace(/\s+/g, '_')}`,
		name: input.name,
		summary: input.summary,
		projectId: input.projectId,
		status: 'draft',
		templateKey: null,
		createdAt: '2026-04-15T10:00:00.000Z',
		updatedAt: '2026-04-15T10:00:00.000Z'
	}))
);

const createWorkflowStepMock = vi.hoisted(() =>
	vi.fn(
		(input: {
			workflowId: string;
			title: string;
			summary?: string;
			desiredRoleId?: string;
			dependsOnStepIds?: string[];
			position: number;
		}) => ({
			id: `${input.workflowId}_step_${input.position}`,
			workflowId: input.workflowId,
			title: input.title,
			summary: input.summary ?? '',
			desiredRoleId: input.desiredRoleId ?? '',
			dependsOnStepIds: input.dependsOnStepIds ?? [],
			position: input.position,
			createdAt: '2026-04-15T10:00:00.000Z',
			updatedAt: '2026-04-15T10:00:00.000Z'
		})
	)
);

vi.mock('$lib/server/control-plane', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/control-plane')>(
		'$lib/server/control-plane'
	);

	return {
		...actual,
		createWorkflow: createWorkflowMock,
		createWorkflowStep: createWorkflowStepMock,
		loadControlPlane: vi.fn(async () => controlPlaneState.current),
		updateControlPlaneCollections: vi.fn(
			async (
				updater: (
					data: ControlPlaneData
				) => { data: ControlPlaneData } | Promise<{ data: ControlPlaneData }>
			) => {
				controlPlaneState.saved = (
					await updater(controlPlaneState.current as ControlPlaneData)
				).data;
				controlPlaneState.current = controlPlaneState.saved;
				return controlPlaneState.saved;
			}
		)
	};
});

import { actions, load } from './+page.server';

describe('workflow create page server', () => {
	beforeEach(() => {
		createWorkflowMock.mockClear();
		createWorkflowStepMock.mockClear();
		controlPlaneState.current = {
			providers: [],
			roles: [
				{
					id: 'role_product',
					name: 'Product strategist',
					area: 'shared',
					description: 'Defines product scope'
				},
				{
					id: 'role_engineer',
					name: 'Engineer',
					area: 'shared',
					description: 'Builds the feature'
				}
			],
			projects: [
				{
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'Primary app project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				}
			],
			goals: [],
			workflows: [],
			workflowSteps: [],
			executionSurfaces: [],
			tasks: [],
			runs: [],
			decisions: [],
			reviews: [],
			approvals: []
		};
		controlPlaneState.saved = null;
	});

	it('loads the projects and roles needed to define a new workflow', async () => {
		const result = await load({} as never);

		expect(result).toBeTruthy();

		if (!result) {
			return;
		}

		expect(result.projects).toHaveLength(1);
		expect(result.roles).toHaveLength(2);
		expect(result.projects[0]?.name).toBe('Agent Management System Prototype');
	});

	it('creates a workflow template and redirects into the detail editor', async () => {
		const form = new FormData();
		form.set('name', 'Release flow');
		form.set('summary', 'Reusable release process.');
		form.set('projectId', 'project_1');
		form.append('stepTitle', 'Requirements gathering');
		form.append('stepDesiredRoleId', 'role_product');
		form.append('stepSummary', 'Clarify scope.');
		form.append('stepDependsOnStepPositions', '');
		form.append('stepTitle', 'Technical implementation');
		form.append('stepDesiredRoleId', 'role_engineer');
		form.append('stepSummary', 'Build the feature.');
		form.append('stepDependsOnStepPositions', '1');
		form.append('stepTitle', 'Documentation');
		form.append('stepDesiredRoleId', 'role_product');
		form.append('stepSummary', 'Document the feature.');
		form.append('stepDependsOnStepPositions', '1');

		await expect(
			actions.createWorkflow({
				request: new Request('http://localhost/app/workflows/new', {
					method: 'POST',
					body: form
				})
			} as never)
		).rejects.toMatchObject({
			status: 303,
			location: '/app/workflows/workflow_release_flow?created=1'
		});

		expect(createWorkflowMock).toHaveBeenCalled();
		expect(createWorkflowStepMock).toHaveBeenCalledTimes(3);
		expect(controlPlaneState.saved?.workflowSteps?.[0]).toEqual(
			expect.objectContaining({
				title: 'Requirements gathering'
			})
		);
		expect(
			controlPlaneState.saved?.workflowSteps?.find((step) => step.title === 'Documentation')
		).toEqual(expect.objectContaining({ dependsOnStepIds: ['workflow_release_flow_step_1'] }));
	});
});
