import { describe, expect, it } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';
import {
	applyGoalRelationships,
	getGoalLinkedProjectIds,
	getGoalLinkedTaskIds,
	suggestGoalArtifactPath,
	wouldCreateGoalCycle
} from './goal-relationships';

function buildFixture(): ControlPlaneData {
	return {
		providers: [],
		roles: [],
		projects: [
			{
				id: 'project_1',
				name: 'Project One',
				summary: 'Primary project',
				projectRootFolder: '/tmp/project-one',
				defaultArtifactRoot: '/tmp/project-one/agent_output',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: ''
			},
			{
				id: 'project_2',
				name: 'Project Two',
				summary: 'Secondary project',
				projectRootFolder: '/tmp/project-two',
				defaultArtifactRoot: '',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: ''
			}
		],
		goals: [
			{
				id: 'goal_parent',
				name: 'Parent goal',
				lane: 'product',
				status: 'running',
				summary: 'Parent summary',
				artifactPath: '/tmp/goals/parent',
				horizon: '',
				successSignal: '',
				parentGoalId: null,
				projectIds: ['project_1'],
				taskIds: ['task_1']
			},
			{
				id: 'goal_child',
				name: 'Child goal',
				lane: 'product',
				status: 'ready',
				summary: 'Child summary',
				artifactPath: '/tmp/goals/child',
				horizon: '',
				successSignal: '',
				parentGoalId: 'goal_parent',
				projectIds: [],
				taskIds: []
			}
		],
		workers: [],
		tasks: [
			{
				id: 'task_1',
				title: 'Goal-owned task',
				summary: 'Already assigned by goalId',
				projectId: 'project_1',
				lane: 'product',
				goalId: 'goal_parent',
				priority: 'medium',
				status: 'ready',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: true,
				desiredRoleId: 'role_coordinator',
				assigneeWorkerId: null,
				threadSessionId: null,
				blockedReason: '',
				dependencyTaskIds: [],
				runCount: 0,
				latestRunId: null,
				artifactPath: '/tmp/project-one/agent_output',
				attachments: [],
				createdAt: '2026-03-31T00:00:00.000Z',
				updatedAt: '2026-03-31T00:00:00.000Z'
			},
			{
				id: 'task_2',
				title: 'Unassigned task',
				summary: 'Available to move',
				projectId: 'project_2',
				lane: 'product',
				goalId: '',
				priority: 'medium',
				status: 'ready',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: true,
				desiredRoleId: 'role_coordinator',
				assigneeWorkerId: null,
				threadSessionId: null,
				blockedReason: '',
				dependencyTaskIds: [],
				runCount: 0,
				latestRunId: null,
				artifactPath: '/tmp/project-two',
				attachments: [],
				createdAt: '2026-03-31T00:00:00.000Z',
				updatedAt: '2026-03-31T00:00:00.000Z'
			}
		],
		runs: [],
		reviews: [],
		approvals: []
	};
}

describe('goal relationship helpers', () => {
	it('derives task and project links from both goal records and task goal ownership', () => {
		const data = buildFixture();
		const goal = data.goals[0];

		expect(getGoalLinkedTaskIds(data, goal)).toEqual(['task_1']);
		expect(getGoalLinkedProjectIds(data, goal)).toEqual(['project_1']);
	});

	it('moves task ownership and removes stale task links from other goals', () => {
		const data = buildFixture();
		const updated = applyGoalRelationships({
			data,
			goalId: 'goal_child',
			parentGoalId: 'goal_parent',
			projectIds: ['project_2'],
			taskIds: ['task_2']
		});

		expect(updated.tasks.find((task) => task.id === 'task_2')?.goalId).toBe('goal_child');
		expect(updated.tasks.find((task) => task.id === 'task_1')?.goalId).toBe('goal_parent');
		expect(updated.goals.find((goal) => goal.id === 'goal_child')?.taskIds).toEqual(['task_2']);
		expect(updated.goals.find((goal) => goal.id === 'goal_child')?.projectIds).toEqual([
			'project_2'
		]);
	});

	it('suggests a workspace from linked project context before falling back to parent goals', () => {
		const data = buildFixture();

		expect(
			suggestGoalArtifactPath({
				data,
				parentGoalId: null,
				projectIds: ['project_1'],
				taskIds: []
			})
		).toBe('/tmp/project-one/agent_output');

		expect(
			suggestGoalArtifactPath({
				data,
				parentGoalId: 'goal_parent',
				projectIds: [],
				taskIds: []
			})
		).toBe('/tmp/goals/parent');
	});

	it('prevents cyclic parent goal relationships', () => {
		const data = buildFixture();

		expect(wouldCreateGoalCycle(data, 'goal_parent', 'goal_child')).toBe(true);
		expect(wouldCreateGoalCycle(data, 'goal_child', 'goal_parent')).toBe(false);
	});
});
