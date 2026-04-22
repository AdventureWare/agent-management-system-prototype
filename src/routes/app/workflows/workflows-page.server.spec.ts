import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';

const controlPlaneState = vi.hoisted(() => ({
	current: null as ControlPlaneData | null,
	saved: null as ControlPlaneData | null
}));

vi.mock('$lib/server/control-plane', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/control-plane')>(
		'$lib/server/control-plane'
	);

	return {
		...actual,
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

import { load } from './+page.server';

describe('workflows page server', () => {
	beforeEach(() => {
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
		const result = await load({
			url: new URL('http://localhost/app/workflows')
		} as never);
		expect(result).toBeTruthy();

		if (!result) {
			return;
		}

		expect(result.workflows).toHaveLength(1);
		expect(result.deleteSuccess).toBe(false);
		expect(result.workflows[0]).toMatchObject({
			name: 'Feature development',
			projectName: 'Agent Management System Prototype',
			parallelizableStepCount: 0,
			defaultRoleCount: 3,
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
});
