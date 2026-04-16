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

describe('workflows page server', () => {
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
			workflows: [
				{
					id: 'workflow_1',
					name: 'Feature development',
					summary: 'Reusable feature delivery process.',
					projectId: 'project_1',
					status: 'draft',
					templateKey: null,
					createdAt: '2026-04-15T09:00:00.000Z',
					updatedAt: '2026-04-15T09:00:00.000Z'
				}
			],
			workflowSteps: [
				{
					id: 'workflow_step_1',
					workflowId: 'workflow_1',
					title: 'Requirements gathering',
					summary: 'Clarify scope.',
					desiredRoleId: 'role_product',
					position: 1,
					createdAt: '2026-04-15T09:00:00.000Z',
					updatedAt: '2026-04-15T09:00:00.000Z'
				},
				{
					id: 'workflow_step_2',
					workflowId: 'workflow_1',
					title: 'Technical implementation',
					summary: 'Build the feature.',
					desiredRoleId: 'role_engineer',
					dependsOnStepIds: ['workflow_step_1'],
					position: 2,
					createdAt: '2026-04-15T09:00:00.000Z',
					updatedAt: '2026-04-15T09:00:00.000Z'
				},
				{
					id: 'workflow_step_3',
					workflowId: 'workflow_1',
					title: 'Documentation',
					summary: 'Document the shipped behavior.',
					desiredRoleId: 'role_product',
					dependsOnStepIds: ['workflow_step_1'],
					position: 3,
					createdAt: '2026-04-15T09:00:00.000Z',
					updatedAt: '2026-04-15T09:00:00.000Z'
				}
			],
			executionSurfaces: [],
			tasks: [
				{
					id: 'task_1',
					title: 'Build dark mode: Requirements gathering',
					summary: 'Clarify scope.',
					projectId: 'project_1',
					area: 'product',
					goalId: 'goal_1',
					workflowId: 'workflow_1',
					parentTaskId: null,
					delegationPacket: null,
					delegationAcceptance: null,
					priority: 'medium',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiredThreadSandbox: null,
					requiresReview: true,
					desiredRoleId: 'role_product',
					assigneeExecutionSurfaceId: null,
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					targetDate: null,
					requiredCapabilityNames: [],
					requiredToolNames: [],
					runCount: 0,
					latestRunId: null,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-04-15T09:00:00.000Z',
					updatedAt: '2026-04-15T09:00:00.000Z'
				}
			],
			runs: [],
			decisions: [],
			reviews: [],
			approvals: []
		};
		controlPlaneState.saved = null;
	});

	it('loads workflow templates with ordered steps and task previews', async () => {
		const result = await load({} as never);
		expect(result).toBeTruthy();

		if (!result) {
			return;
		}

		expect(result.workflows).toHaveLength(1);
		expect(result.workflows[0]).toMatchObject({
			name: 'Feature development',
			projectName: 'Agent Management System Prototype',
			steps: [
				{
					title: 'Requirements gathering',
					desiredRoleName: 'Product strategist',
					position: 1
				},
				{
					title: 'Technical implementation',
					desiredRoleName: 'Engineer',
					position: 2
				},
				{
					title: 'Documentation',
					desiredRoleName: 'Product strategist',
					position: 3
				}
			],
			taskPreview: [{ id: 'task_1', title: 'Build dark mode: Requirements gathering' }]
		});
	});

	it('creates a workflow template with step definitions', async () => {
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

		const result = await actions.createWorkflow({
			request: new Request('http://localhost/app/workflows', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'createWorkflow'
			})
		);
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

	it('updates workflow template metadata and replaces step definitions', async () => {
		const form = new FormData();
		form.set('workflowId', 'workflow_1');
		form.set('name', 'Feature delivery');
		form.set('summary', 'Updated workflow template.');
		form.set('projectId', 'project_1');
		form.append('stepTitle', 'Design draft');
		form.append('stepDesiredRoleId', 'role_product');
		form.append('stepSummary', 'Draft the design.');
		form.append('stepDependsOnStepPositions', '');
		form.append('stepTitle', 'Implementation');
		form.append('stepDesiredRoleId', 'role_engineer');
		form.append('stepSummary', 'Build it.');
		form.append('stepDependsOnStepPositions', '1');

		const result = await actions.updateWorkflow({
			request: new Request('http://localhost/app/workflows', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'updateWorkflow',
				workflowId: 'workflow_1'
			})
		);
		expect(controlPlaneState.saved?.workflows?.[0]).toEqual(
			expect.objectContaining({
				name: 'Feature delivery',
				summary: 'Updated workflow template.'
			})
		);
		expect(
			controlPlaneState.saved?.workflowSteps?.filter((step) => step.workflowId === 'workflow_1')
		).toHaveLength(2);
		expect(controlPlaneState.saved?.workflowSteps?.[0]?.title).toBe('Design draft');
		expect(controlPlaneState.saved?.workflowSteps?.[1]?.dependsOnStepIds).toEqual([
			controlPlaneState.saved?.workflowSteps?.[0]?.id
		]);
	});

	it('instantiates a workflow template into a parent task plus child tasks', async () => {
		const form = new FormData();
		form.set('workflowId', 'workflow_1');
		form.set('taskName', 'Build dark mode');
		form.set('taskSummary', 'Ship the first dark mode version.');

		const result = await actions.instantiateWorkflow({
			request: new Request('http://localhost/app/workflows', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'instantiateWorkflow',
				createdTaskCount: 4
			})
		);

		const createdParentTask = controlPlaneState.saved?.tasks.find(
			(task) => task.title === 'Build dark mode'
		);
		const createdChildTasks =
			controlPlaneState.saved?.tasks.filter(
				(task) => task.parentTaskId === createdParentTask?.id
			) ?? [];

		expect(createdParentTask).toBeTruthy();
		expect(createdChildTasks.map((task) => task.title)).toEqual([
			'Build dark mode: Requirements gathering',
			'Build dark mode: Technical implementation',
			'Build dark mode: Documentation'
		]);
		expect(createdChildTasks[1]?.dependencyTaskIds).toEqual([createdChildTasks[0]?.id]);
		expect(createdChildTasks[2]?.dependencyTaskIds).toEqual([createdChildTasks[0]?.id]);
	});

	it('blocks deleting templates that still have generated tasks linked', async () => {
		const form = new FormData();
		form.set('workflowId', 'workflow_1');

		const result = await actions.deleteWorkflow({
			request: new Request('http://localhost/app/workflows', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: {
				message: 'Workflow cannot be deleted while generated tasks still point to it.'
			}
		});
	});
});
