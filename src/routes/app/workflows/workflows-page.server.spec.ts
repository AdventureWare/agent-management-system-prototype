import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';

const controlPlaneState = vi.hoisted(() => ({
	current: null as ControlPlaneData | null,
	saved: null as ControlPlaneData | null
}));

const createWorkflowMock = vi.hoisted(() =>
	vi.fn(
		(input: {
			name: string;
			summary: string;
			projectId: string;
			goalId?: string | null;
			kind?: string;
			targetDate?: string | null;
		}) => ({
			id: `workflow_${input.name.toLowerCase().replace(/\s+/g, '_')}`,
			name: input.name,
			summary: input.summary,
			projectId: input.projectId,
			goalId: input.goalId ?? null,
			kind: input.kind ?? 'ad_hoc',
			status: 'draft',
			templateKey: null,
			targetDate: input.targetDate ?? null,
			createdAt: '2026-04-14T10:00:00.000Z',
			updatedAt: '2026-04-14T10:00:00.000Z'
		})
	)
);

vi.mock('$lib/server/control-plane', () => ({
	createWorkflow: createWorkflowMock,
	getOpenReviewForTask: vi.fn(() => null),
	getPendingApprovalForTask: vi.fn(() => null),
	loadControlPlane: vi.fn(async () => controlPlaneState.current),
	taskHasUnmetDependencies: vi.fn(() => false),
	updateControlPlaneCollections: vi.fn(
		async (
			updater: (
				data: ControlPlaneData
			) => { data: ControlPlaneData } | Promise<{ data: ControlPlaneData }>
		) => {
			controlPlaneState.saved = (await updater(controlPlaneState.current as ControlPlaneData)).data;
			controlPlaneState.current = controlPlaneState.saved;
			return controlPlaneState.saved;
		}
	)
}));

import { actions, load } from './+page.server';

describe('workflows page server', () => {
	beforeEach(() => {
		createWorkflowMock.mockClear();
		controlPlaneState.current = {
			providers: [],
			roles: [],
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
			goals: [
				{
					id: 'goal_1',
					name: 'Release confidence',
					summary: 'Improve release confidence.',
					status: 'running',
					artifactPath: '/tmp/project/goals/release-confidence',
					parentGoalId: null,
					projectIds: ['project_1'],
					taskIds: ['task_1'],
					area: 'product',
					targetDate: null
				}
			],
			workflows: [
				{
					id: 'workflow_1',
					name: 'Release flow',
					summary: 'Coordinate release work.',
					projectId: 'project_1',
					goalId: 'goal_1',
					kind: 'repeatable',
					status: 'active',
					templateKey: null,
					targetDate: '2026-04-20',
					createdAt: '2026-04-14T09:00:00.000Z',
					updatedAt: '2026-04-14T09:00:00.000Z'
				}
			],
			executionSurfaces: [],
			tasks: [
				{
					id: 'task_1',
					title: 'Draft release notes',
					summary: 'Prepare the release notes.',
					projectId: 'project_1',
					area: 'product',
					goalId: 'goal_1',
					workflowId: 'workflow_1',
					parentTaskId: null,
					delegationPacket: null,
					priority: 'medium',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiredThreadSandbox: null,
					requiresReview: true,
					desiredRoleId: '',
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
					createdAt: '2026-04-14T09:00:00.000Z',
					updatedAt: '2026-04-14T09:00:00.000Z'
				}
			],
			runs: [],
			decisions: [],
			reviews: [],
			approvals: []
		};
		controlPlaneState.saved = null;
	});

	it('loads workflows with task rollups and task previews', async () => {
		const result = await load({} as never);
		expect(result).toBeTruthy();

		if (!result) {
			return;
		}

		expect(result.workflows).toHaveLength(1);
		expect(result.workflows[0]).toMatchObject({
			name: 'Release flow',
			projectName: 'Agent Management System Prototype',
			goalName: 'Release confidence',
			rollup: {
				taskCount: 1,
				runnableTaskCount: 1,
				derivedStatus: 'active'
			},
			taskPreview: [{ id: 'task_1', title: 'Draft release notes' }]
		});
	});

	it('creates a workflow from the create action', async () => {
		const form = new FormData();
		form.set('name', 'QA flow');
		form.set('summary', 'Coordinate QA tasks.');
		form.set('projectId', 'project_1');
		form.set('goalId', 'goal_1');
		form.set('kind', 'repeatable');
		form.set('targetDate', '2026-04-25');

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
		expect(createWorkflowMock).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'QA flow',
				projectId: 'project_1',
				goalId: 'goal_1',
				kind: 'repeatable'
			})
		);
		expect(controlPlaneState.saved?.workflows?.[0]).toEqual(
			expect.objectContaining({
				name: 'QA flow'
			})
		);
	});

	it('updates workflow metadata while keeping the project fixed', async () => {
		const form = new FormData();
		form.set('workflowId', 'workflow_1');
		form.set('name', 'Release coordination');
		form.set('summary', 'Coordinate release tasks and reviews.');
		form.set('projectId', 'project_1');
		form.set('goalId', 'goal_1');
		form.set('kind', 'ad_hoc');
		form.set('targetDate', '2026-04-28');

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
				id: 'workflow_1',
				name: 'Release coordination',
				summary: 'Coordinate release tasks and reviews.',
				kind: 'ad_hoc',
				targetDate: '2026-04-28'
			})
		);
	});

	it('updates workflow lifecycle status when the requested transition is allowed', async () => {
		const form = new FormData();
		form.set('workflowId', 'workflow_1');
		form.set('status', 'canceled');

		const result = await actions.setWorkflowStatus({
			request: new Request('http://localhost/app/workflows', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'setWorkflowStatus',
				workflowId: 'workflow_1',
				status: 'canceled'
			})
		);
		expect(controlPlaneState.saved?.workflows?.[0]?.status).toBe('canceled');
	});

	it('blocks deleting workflows that still have linked tasks', async () => {
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
				message: 'Workflow cannot be deleted while linked tasks still point to it.'
			}
		});
		expect(controlPlaneState.current?.workflows).toHaveLength(1);
	});

	it('deletes workflows after all linked tasks are removed', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			tasks: []
		};

		const form = new FormData();
		form.set('workflowId', 'workflow_1');

		const result = await actions.deleteWorkflow({
			request: new Request('http://localhost/app/workflows', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'deleteWorkflow',
				workflowId: 'workflow_1'
			})
		);
		expect(controlPlaneState.saved?.workflows).toHaveLength(0);
	});
});
