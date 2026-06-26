import { describe, expect, it } from 'vitest';
import { buildAutonomousQueue } from './autonomous-queue';
import type { ControlPlaneData, Task } from '$lib/types/control-plane';

function createTask(overrides: Partial<Task> = {}): Task {
	return {
		id: overrides.id ?? 'task_default',
		title: overrides.title ?? 'Default task',
		summary: overrides.summary ?? 'Do the work.',
		successCriteria: overrides.successCriteria ?? 'The result meets the acceptance criteria.',
		readyCondition: overrides.readyCondition ?? 'The repo is available.',
		expectedOutcome: overrides.expectedOutcome ?? 'A reviewed implementation is ready.',
		scope: overrides.scope ?? 'Bounded implementation.',
		nonGoals: overrides.nonGoals ?? 'Do not deploy.',
		validationSteps: overrides.validationSteps ?? 'Run unit tests.',
		readinessLevel: overrides.readinessLevel ?? 'R3_EXECUTABLE',
		autonomyLevel: overrides.autonomyLevel ?? 'A3_AGENT_MAY_EDIT_IN_ISOLATED_BRANCH_OR_WORKTREE',
		allowedActionNames: overrides.allowedActionNames ?? [],
		reviewRequirement: overrides.reviewRequirement ?? 'SUMMARY_REVIEW',
		projectId: overrides.projectId ?? 'project_1',
		area: overrides.area ?? 'product',
		goalId: overrides.goalId ?? 'goal_1',
		taskTemplateId: overrides.taskTemplateId ?? null,
		workflowId: overrides.workflowId ?? null,
		parentTaskId: overrides.parentTaskId ?? null,
		delegationPacket: overrides.delegationPacket ?? null,
		delegationAcceptance: overrides.delegationAcceptance ?? null,
		priority: overrides.priority ?? 'medium',
		status: overrides.status ?? 'ready',
		riskLevel: overrides.riskLevel ?? 'low',
		approvalMode: overrides.approvalMode ?? 'none',
		requiredThreadSandbox: overrides.requiredThreadSandbox ?? null,
		requiresReview: overrides.requiresReview ?? true,
		desiredRoleId: overrides.desiredRoleId ?? '',
		assigneeExecutionSurfaceId: overrides.assigneeExecutionSurfaceId ?? null,
		agentThreadId: overrides.agentThreadId ?? null,
		requiredPromptSkillNames: overrides.requiredPromptSkillNames ?? [],
		requiredCapabilityNames: overrides.requiredCapabilityNames ?? [],
		requiredToolNames: overrides.requiredToolNames ?? [],
		blockedReason: overrides.blockedReason ?? '',
		dependencyTaskIds: overrides.dependencyTaskIds ?? [],
		estimateHours: overrides.estimateHours ?? null,
		targetDate: overrides.targetDate ?? null,
		runCount: overrides.runCount ?? 0,
		latestRunId: overrides.latestRunId ?? null,
		artifactPath: overrides.artifactPath ?? '/tmp/out',
		attachments: overrides.attachments ?? [],
		createdAt: overrides.createdAt ?? '2026-06-01T12:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-01T12:00:00.000Z'
	};
}

function createControlPlane(tasks: Task[]): ControlPlaneData {
	return {
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
				name: 'Ship autonomous progress loop',
				area: 'product',
				status: 'running',
				summary: 'Improve agent task selection.',
				artifactPath: '',
				projectIds: ['project_1'],
				taskIds: [],
				planningPriority: 4
			}
		],
		workflows: [],
		workflowSteps: [],
		taskTemplates: [],
		executionSurfaces: [],
		tasks,
		runs: [],
		reviews: [],
		approvals: [],
		planningSessions: [],
		decisions: []
	};
}

describe('buildAutonomousQueue', () => {
	it('ranks R3/R4 low-risk unblocked tasks above weaker ready work', () => {
		const queue = buildAutonomousQueue(
			createControlPlane([
				createTask({
					id: 'task_r4',
					title: 'Reviewable high value task',
					priority: 'high',
					readinessLevel: 'R4_REVIEWABLE',
					estimateHours: 2
				}),
				createTask({
					id: 'task_r3',
					title: 'Executable medium task',
					priority: 'medium',
					readinessLevel: 'R3_EXECUTABLE',
					estimateHours: 6
				}),
				createTask({
					id: 'task_r2',
					title: 'Specified but not executable task',
					readinessLevel: 'R2_SPECIFIED'
				})
			])
		);

		expect(queue.recommendedTasks.map((task) => task.id)).toEqual(['task_r4', 'task_r3']);
		expect(queue.recommendedTasks[0]?.recommendationReason).toContain('R4_REVIEWABLE');
	});

	it('keeps blocked, high-risk, A5, and unvalidated tasks out of recommendations', () => {
		const queue = buildAutonomousQueue(
			createControlPlane([
				createTask({
					id: 'task_blocked',
					title: 'Blocked task',
					status: 'blocked',
					blockedReason: 'Waiting on access.'
				}),
				createTask({
					id: 'task_high_risk',
					title: 'High risk task',
					riskLevel: 'high'
				}),
				createTask({
					id: 'task_a5',
					title: 'External state task',
					autonomyLevel: 'A5_AGENT_MAY_MERGE_DEPLOY_OR_CHANGE_EXTERNAL_STATE'
				}),
				createTask({
					id: 'task_no_validation',
					title: 'No validation task',
					successCriteria: '',
					expectedOutcome: '',
					validationSteps: ''
				})
			])
		);

		expect(queue.recommendedTasks).toHaveLength(0);
		expect(queue.blockedTasks.map((task) => task.id)).toContain('task_blocked');
		expect(queue.highRiskReviewTasks.map((task) => task.id)).toContain('task_high_risk');
	});

	it('surfaces high-priority underspecified tasks as planning work', () => {
		const queue = buildAutonomousQueue(
			createControlPlane([
				createTask({
					id: 'task_planning',
					title: 'Important vague task',
					priority: 'urgent',
					readinessLevel: 'R1_FRAMED',
					successCriteria: '',
					expectedOutcome: '',
					validationSteps: ''
				})
			])
		);

		expect(queue.recommendedTasks).toHaveLength(0);
		expect(queue.needsPlanningTasks).toHaveLength(1);
		expect(queue.needsPlanningTasks[0]?.readyReason).toContain('needs more specification');
	});
});
