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
	updateControlPlane: vi.fn(async (updater: (data: ControlPlaneData) => ControlPlaneData) => {
		controlPlaneState.saved = updater(controlPlaneState.current as ControlPlaneData);
		controlPlaneState.current = controlPlaneState.saved;
		return controlPlaneState.saved;
	})
}));

import { actions } from './+page.server';

describe('goal detail page server actions', () => {
	beforeEach(() => {
		deleteGoalMock.mockClear();
		controlPlaneState.current = {
			providers: [],
			roles: [],
			projects: [],
			goals: [
				{
					id: 'goal_1',
					name: 'Allow deletion',
					area: 'product',
					status: 'running',
					summary: 'Goal summary',
					artifactPath: '/tmp/project/agent_output/goals/goal_1',
					parentGoalId: null,
					projectIds: [],
					taskIds: [],
					targetDate: null,
					planningPriority: 0,
					confidence: 'medium'
				}
			],
			workers: [],
			tasks: [],
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
});
