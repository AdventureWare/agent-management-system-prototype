import { describe, expect, it } from 'vitest';
import {
	createProject,
	createTask,
	summarizeControlPlane,
	taskHasUnmetDependencies
} from './control-plane';
import type { ControlPlaneData } from '$lib/types/control-plane';

function buildFixture(): ControlPlaneData {
	return {
		providers: [],
		roles: [],
		projects: [],
		goals: [],
		workers: [],
		tasks: [
			{
				id: 'task_done',
				title: 'Done task',
				summary: 'finished dependency',
				lane: 'product',
				goalId: 'goal_1',
				priority: 'medium',
				status: 'done',
				riskLevel: 'low',
				approvalMode: 'none',
				requiresReview: false,
				desiredRoleId: 'role_app_worker',
				assigneeWorkerId: null,
				blockedReason: '',
				dependencyTaskIds: [],
				artifactPath: '/tmp/done',
				createdAt: '2026-03-26T00:00:00.000Z',
				updatedAt: '2026-03-26T00:00:00.000Z'
			},
			{
				id: 'task_review',
				title: 'Review task',
				summary: 'needs review',
				lane: 'product',
				goalId: 'goal_1',
				priority: 'high',
				status: 'review',
				riskLevel: 'high',
				approvalMode: 'before_complete',
				requiresReview: true,
				desiredRoleId: 'role_app_worker',
				assigneeWorkerId: null,
				blockedReason: '',
				dependencyTaskIds: ['task_done'],
				artifactPath: '/tmp/review',
				createdAt: '2026-03-26T00:00:00.000Z',
				updatedAt: '2026-03-26T00:00:00.000Z'
			},
			{
				id: 'task_waiting',
				title: 'Waiting task',
				summary: 'dependency is not done',
				lane: 'growth',
				goalId: 'goal_2',
				priority: 'urgent',
				status: 'ready',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: true,
				desiredRoleId: 'role_researcher',
				assigneeWorkerId: null,
				blockedReason: '',
				dependencyTaskIds: ['task_review'],
				artifactPath: '/tmp/waiting',
				createdAt: '2026-03-26T00:00:00.000Z',
				updatedAt: '2026-03-26T00:00:00.000Z'
			}
		]
	};
}

describe('control-plane helpers', () => {
	it('creates tasks with explicit governance fields', () => {
		const task = createTask({
			title: 'Governed task',
			summary: 'has review and approval settings',
			lane: 'ops',
			goalId: 'goal_1',
			priority: 'high',
			riskLevel: 'high',
			approvalMode: 'before_apply',
			requiresReview: true,
			desiredRoleId: 'role_reviewer',
			artifactPath: '/tmp/output',
			dependencyTaskIds: ['task_alpha']
		});

		expect(task.riskLevel).toBe('high');
		expect(task.approvalMode).toBe('before_apply');
		expect(task.requiresReview).toBe(true);
		expect(task.dependencyTaskIds).toEqual(['task_alpha']);
		expect(task.blockedReason).toBe('');
	});

	it('detects unmet dependencies', () => {
		const data = buildFixture();

		expect(taskHasUnmetDependencies(data, data.tasks[1]!)).toBe(false);
		expect(taskHasUnmetDependencies(data, data.tasks[2]!)).toBe(true);
	});

	it('summarizes review, dependency, and risk counts', () => {
		const summary = summarizeControlPlane(buildFixture());

		expect(summary.taskCount).toBe(3);
		expect(summary.projectCount).toBe(0);
		expect(summary.readyTaskCount).toBe(1);
		expect(summary.reviewTaskCount).toBe(1);
		expect(summary.reviewRequiredTaskCount).toBe(1);
		expect(summary.dependencyBlockedTaskCount).toBe(1);
		expect(summary.highRiskTaskCount).toBe(1);
	});

	it('creates projects with blank config defaults when omitted', () => {
		const project = createProject({
			name: 'Prototype',
			summary: 'holds reusable paths and repo defaults',
			lane: 'product'
		});

		expect(project.id).toMatch(/^project_/);
		expect(project.defaultCoordinationFolder).toBe('');
		expect(project.defaultArtifactRoot).toBe('');
		expect(project.defaultRepoPath).toBe('');
		expect(project.defaultRepoUrl).toBe('');
		expect(project.defaultBranch).toBe('');
	});
});
