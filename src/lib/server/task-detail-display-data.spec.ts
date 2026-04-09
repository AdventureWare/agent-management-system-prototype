import { describe, expect, it } from 'vitest';
import type { Decision, Project, Task, ExecutionSurface } from '$lib/types/control-plane';
import type { InstalledCodexSkill } from '$lib/server/codex-skills';
import {
	buildRecentTaskDecisionViews,
	buildTaskDetailTaskView,
	summarizeInstalledSkills
} from './task-detail-display-data';

const project: Project = {
	id: 'project_1',
	name: 'Agent Management System Prototype',
	summary: 'project',
	projectRootFolder: '/tmp/project',
	defaultArtifactRoot: '/tmp/project/agent_output',
	defaultRepoPath: '',
	defaultRepoUrl: '',
	defaultBranch: ''
};

const worker: ExecutionSurface = {
	id: 'worker_1',
	name: 'Planner',
	providerId: 'provider_local',
	supportedRoleIds: [],
	location: 'local',
	status: 'idle',
	capacity: 1,
	registeredAt: '2026-04-01T08:00:00.000Z',
	lastSeenAt: '2026-04-01T08:00:00.000Z',
	note: '',
	tags: [],
	threadSandboxOverride: null,
	authTokenHash: ''
};

const task: Task = {
	id: 'task_1',
	title: 'Task',
	summary: 'Summary',
	projectId: 'project_1',
	area: 'product',
	goalId: 'goal_cleanup',
	parentTaskId: null,
	delegationPacket: null,
	delegationAcceptance: {
		summary: 'Accepted',
		acceptedAt: '2026-04-02T12:00:00.000Z'
	},
	priority: 'medium',
	status: 'ready',
	riskLevel: 'medium',
	approvalMode: 'none',
	requiredThreadSandbox: null,
	requiresReview: true,
	desiredRoleId: 'role_reviewer',
	assigneeExecutionSurfaceId: 'worker_1',
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
	createdAt: '2026-04-01T10:00:00.000Z',
	updatedAt: '2026-04-01T11:00:00.000Z'
};

describe('task-detail-display-data', () => {
	it('builds recent decision labels and task display metadata', () => {
		const decisions: Decision[] = [
			{
				id: 'decision_older',
				taskId: 'task_1',
				goalId: null,
				runId: null,
				reviewId: null,
				approvalId: null,
				planningSessionId: null,
				decisionType: 'task_plan_updated',
				summary: 'Older',
				createdAt: '2026-04-01T10:00:00.000Z',
				decidedByExecutionSurfaceId: null
			},
			{
				id: 'decision_newer',
				taskId: 'task_1',
				goalId: null,
				runId: null,
				reviewId: null,
				approvalId: null,
				planningSessionId: null,
				decisionType: 'task_plan_updated',
				summary: 'Newer',
				createdAt: '2026-04-02T10:00:00.000Z',
				decidedByExecutionSurfaceId: null
			}
		];

		const recentDecisions = buildRecentTaskDecisionViews(
			decisions,
			'task_1',
			(value) => `relative:${value}`
		);
		const taskView = buildTaskDetailTaskView({
			task,
			projectMap: new Map([[project.id, project]]),
			goalMap: new Map([['goal_cleanup', { name: 'Cleanup' }]]),
			roleMap: new Map([['role_reviewer', { name: 'Reviewer' }]]),
			executionSurfaceMap: new Map([[worker.id, worker]]),
			latestRun: null,
			activeRun: null,
			threadContext: {
				assignedThread: null,
				latestRunThread: null,
				statusThread: null,
				linkThread: null,
				linkThreadKind: null
			},
			openReview: null,
			pendingApproval: null,
			formatRelativeTime: (value) => `relative:${value}`
		});

		expect(recentDecisions.map((decision) => decision.id)).toEqual([
			'decision_newer',
			'decision_older'
		]);
		expect(taskView).toMatchObject({
			projectName: 'Agent Management System Prototype',
			goalName: 'Cleanup',
			desiredRoleName: 'Reviewer',
			assigneeName: 'Planner',
			hasActiveRun: false,
			updatedAtLabel: 'relative:2026-04-01T11:00:00.000Z'
		});
		expect(taskView.delegationAcceptance).toMatchObject({
			acceptedAtLabel: 'relative:2026-04-02T12:00:00.000Z'
		});
	});

	it('summarizes installed skills', () => {
		const skills: InstalledCodexSkill[] = [
			{ id: 'a', description: 'a', global: true, project: false, sourceLabel: 'Global' },
			{ id: 'b', description: 'b', global: false, project: true, sourceLabel: 'Project' }
		];

		expect(summarizeInstalledSkills(skills)).toMatchObject({
			totalCount: 2,
			globalCount: 1,
			projectCount: 1
		});
	});
});
