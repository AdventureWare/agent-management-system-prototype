import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';

const controlPlaneState = vi.hoisted(() => ({
	current: null as ControlPlaneData | null,
	saved: null as ControlPlaneData | null
}));

const deleteGoalMock = vi.hoisted(() =>
	vi.fn((data: ControlPlaneData, goalId: string) => ({
		...data,
		goals: data.goals.filter((goal) => goal.id !== goalId)
	}))
);
const assistGoalWritingMock = vi.hoisted(() =>
	vi.fn(async () => ({
		name: 'Clarify goal creation before operators structure work',
		summary:
			'This goal makes the drafting step clearer so operators can define the intended outcome before linking tasks and projects. It matters because unclear goals create planning churn.',
		successSignal:
			'New goals are saved with a concrete outcome and a visible review condition before linked execution begins.',
		changeSummary:
			'Rewrote the goal draft into a more concrete outcome with a clearer summary and proof point.'
	}))
);
const updateControlPlaneMock = vi.hoisted(() =>
	vi.fn(
		async (updater: (data: ControlPlaneData) => { data: ControlPlaneData } | ControlPlaneData) => {
			const result = updater(controlPlaneState.current as ControlPlaneData);
			controlPlaneState.saved =
				result && typeof result === 'object' && 'data' in result
					? (result.data as ControlPlaneData)
					: (result as ControlPlaneData);
			controlPlaneState.current = controlPlaneState.saved;
			return controlPlaneState.saved;
		}
	)
);

vi.mock('$lib/server/artifact-browser', () => ({
	buildArtifactBrowser: vi.fn(async () => ({
		rootPath: '',
		rootKind: 'directory',
		browsePath: '',
		inspectingParentDirectory: false,
		directoryEntries: [],
		directoryEntriesTruncated: false,
		knownOutputs: [],
		errorMessage: ''
	}))
}));

vi.mock('$lib/server/goal-relationships', () => ({
	applyGoalRelationships: vi.fn((input: { data: ControlPlaneData }) => input.data),
	getGoalChildGoals: vi.fn(() => []),
	getGoalLinkedProjectIds: vi.fn(() => []),
	getGoalLinkedTaskIds: vi.fn(() => []),
	sortGoalsByName: vi.fn((goals: unknown[]) => goals),
	sortProjectsByName: vi.fn((projects: unknown[]) => projects),
	sortTasksByTitle: vi.fn((tasks: unknown[]) => tasks),
	suggestGoalArtifactPath: vi.fn(() => ''),
	wouldCreateGoalCycle: vi.fn(() => false)
}));

vi.mock('$lib/server/control-plane', () => ({
	deleteGoal: deleteGoalMock,
	loadControlPlane: vi.fn(async () => controlPlaneState.current),
	parseArea: vi.fn((_value: string, fallback: string) => fallback),
	parseGoalStatus: vi.fn((_value: string, fallback: string) => fallback),
	updateControlPlaneCollections: updateControlPlaneMock
}));

vi.mock('$lib/server/goal-writing-assist', () => ({
	assistGoalWriting: assistGoalWritingMock
}));

import { actions } from './+page.server';

describe('goal detail page server actions', () => {
	beforeEach(() => {
		assistGoalWritingMock.mockClear();
		deleteGoalMock.mockClear();
		updateControlPlaneMock.mockClear();
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
					name: 'Allow deletion',
					area: 'product',
					status: 'running',
					summary: 'Goal summary',
					artifactPath: '/tmp/project/agent_output/goals/goal_1',
					parentGoalId: null,
					projectIds: ['project_1'],
					taskIds: ['task_1'],
					targetDate: null,
					planningPriority: 0,
					confidence: 'medium'
				}
			],
			executionSurfaces: [],
			tasks: [
				{
					id: 'task_1',
					title: 'Audit goal quality checks',
					summary: 'Review the quality checks in the goal editor.',
					projectId: 'project_1',
					area: 'product',
					goalId: 'goal_1',
					priority: 'medium',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: '',
					assigneeExecutionSurfaceId: null,
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 0,
					latestRunId: null,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-04-01T09:00:00.000Z',
					updatedAt: '2026-04-01T09:00:00.000Z'
				}
			],
			runs: [],
			reviews: [],
			approvals: []
		};
		controlPlaneState.saved = null;
	});

	it('redirects after deleting a goal', async () => {
		await expect(
			actions.deleteGoal({
				params: { goalId: 'goal_1' }
			} as never)
		).rejects.toMatchObject({
			status: 303,
			location: '/app/goals?deleted=1'
		});

		expect(deleteGoalMock).toHaveBeenCalledWith(
			expect.objectContaining({
				goals: expect.arrayContaining([expect.objectContaining({ id: 'goal_1' })])
			}),
			'goal_1'
		);
		expect(controlPlaneState.saved?.goals).toEqual([]);
	});

	it('returns not found when deleting an unknown goal', async () => {
		const result = await actions.deleteGoal({
			params: { goalId: 'goal_missing' }
		} as never);

		expect(result).toMatchObject({
			status: 404,
			data: {
				message: 'Goal not found.'
			}
		});
		expect(deleteGoalMock).not.toHaveBeenCalled();
	});

	it('rewrites an existing goal draft without saving the goal', async () => {
		const form = new FormData();
		form.set('goalId', 'goal_1');
		form.set('name', 'make this goal clearer');
		form.set('summary', 'help operators define the goal better');
		form.set('successSignal', 'goals are easier to review');
		form.set('projectIds', 'project_1');
		form.set('taskIds', 'task_1');

		const result = await actions.assistGoalWriting({
			params: { goalId: 'goal_1' },
			request: new Request('http://localhost/app/goals/goal_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(assistGoalWritingMock).toHaveBeenCalledWith({
			cwd: '/tmp/project',
			name: 'make this goal clearer',
			summary: 'help operators define the goal better',
			successSignal: 'goals are easier to review',
			area: 'product',
			status: 'ready',
			targetDate: '',
			parentGoalName: null,
			artifactPath: '',
			linkedProjectNames: ['Agent Management System Prototype'],
			linkedTaskTitles: ['Audit goal quality checks']
		});
		expect(result).toEqual({
			ok: true,
			successAction: 'assistGoalWriting',
			assistChangeSummary:
				'Rewrote the goal draft into a more concrete outcome with a clearer summary and proof point.',
			values: {
				goalId: 'goal_1',
				name: 'Clarify goal creation before operators structure work',
				summary:
					'This goal makes the drafting step clearer so operators can define the intended outcome before linking tasks and projects. It matters because unclear goals create planning churn.',
				successSignal:
					'New goals are saved with a concrete outcome and a visible review condition before linked execution begins.',
				targetDate: '',
				artifactPath: '',
				parentGoalId: '',
				projectIds: ['project_1'],
				taskIds: ['task_1'],
				area: 'product',
				status: 'ready'
			}
		});
		expect(updateControlPlaneMock).not.toHaveBeenCalled();
	});
});
