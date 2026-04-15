import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';
import type { TaskWorkItem } from '$lib/types/task-work-item';

const listAgentThreads = vi.hoisted(() => vi.fn(async () => []));
const buildTaskWorkItems = vi.hoisted(() => vi.fn<() => TaskWorkItem[]>(() => []));

const controlPlaneState = vi.hoisted(() => ({
	current: null as ControlPlaneData | null,
	saved: null as ControlPlaneData | null
}));

function syncTaskExecutionStateLike(data: ControlPlaneData) {
	return {
		...data,
		tasks: data.tasks.map((task) => {
			const taskRuns = data.runs
				.filter((run) => run.taskId === task.id)
				.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

			return {
				...task,
				runCount: taskRuns.length,
				latestRunId: taskRuns[0]?.id ?? null
			};
		})
	};
}

vi.mock('$lib/server/agent-threads', () => ({
	listAgentThreads
}));

vi.mock('$lib/server/task-work-items', () => ({
	buildTaskWorkItems
}));

const mutateTaskCollections = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/control-plane', () => ({
	createDecision: vi.fn(
		(input: {
			taskId?: string | null;
			runId?: string | null;
			reviewId?: string | null;
			approvalId?: string | null;
			decisionType: string;
			summary: string;
			createdAt?: string;
		}) => ({
			id: `decision_${input.decisionType}`,
			taskId: input.taskId ?? null,
			goalId: null,
			runId: input.runId ?? null,
			reviewId: input.reviewId ?? null,
			approvalId: input.approvalId ?? null,
			planningSessionId: null,
			decisionType: input.decisionType,
			summary: input.summary,
			createdAt: input.createdAt ?? '2026-04-07T12:00:00.000Z',
			decidedByExecutionSurfaceId: null
		})
	),
	getOpenReviewForTask: vi.fn((data: ControlPlaneData, taskId: string) => {
		return (
			data.reviews.find((review) => review.taskId === taskId && review.status === 'open') ?? null
		);
	}),
	getPendingApprovalForTask: vi.fn((data: ControlPlaneData, taskId: string) => {
		return (
			data.approvals.find(
				(approval) => approval.taskId === taskId && approval.status === 'pending'
			) ?? null
		);
	}),
	loadControlPlane: vi.fn(async () => controlPlaneState.current)
}));

vi.mock('$lib/server/control-plane-repository', () => ({
	mutateTaskCollections: mutateTaskCollections.mockImplementation(
		async (input: {
			taskId: string;
			mutate: (
				task: any,
				data: ControlPlaneData
			) => {
				data: ControlPlaneData;
				changedCollections: Iterable<string>;
			};
		}) => {
			const current = controlPlaneState.current as ControlPlaneData;
			const existingTask = current.tasks.find((task) => task.id === input.taskId) ?? null;

			if (!existingTask) {
				return null;
			}

			controlPlaneState.saved = syncTaskExecutionStateLike(
				input.mutate(existingTask, current).data
			);
			controlPlaneState.current = controlPlaneState.saved;
			return controlPlaneState.current.tasks.find((task) => task.id === input.taskId) ?? null;
		}
	)
}));

import {
	approveTaskApproval,
	approveTaskReview,
	loadGovernanceInboxData,
	rejectTaskApproval,
	requestTaskReviewChanges,
	TaskGovernanceActionError
} from './task-governance';

function createTaskWorkItem(
	input: Partial<TaskWorkItem> & Pick<TaskWorkItem, 'id' | 'title'>
): TaskWorkItem {
	return {
		id: input.id,
		title: input.title,
		summary: input.summary ?? 'Task summary',
		successCriteria: '',
		readyCondition: '',
		expectedOutcome: '',
		projectId: input.projectId ?? 'project_1',
		projectName: input.projectName ?? 'AMS',
		workflowId: input.workflowId ?? null,
		workflowName: input.workflowName ?? '',
		area: input.area ?? 'product',
		goalId: input.goalId ?? 'goal_1',
		priority: input.priority ?? 'medium',
		status: input.status ?? 'ready',
		riskLevel: input.riskLevel ?? 'medium',
		approvalMode: input.approvalMode ?? 'none',
		requiresReview: input.requiresReview ?? true,
		desiredRoleId: input.desiredRoleId ?? 'role_coordinator',
		desiredRoleName: input.desiredRoleName ?? 'Coordinator',
		assigneeExecutionSurfaceId: input.assigneeExecutionSurfaceId ?? null,
		assigneeName: input.assigneeName ?? 'Unassigned',
		agentThreadId: input.agentThreadId ?? null,
		requiredCapabilityNames: input.requiredCapabilityNames ?? [],
		requiredToolNames: input.requiredToolNames ?? [],
		blockedReason: input.blockedReason ?? '',
		dependencyTaskIds: input.dependencyTaskIds ?? [],
		dependencyTaskNames: input.dependencyTaskNames ?? [],
		targetDate: input.targetDate ?? null,
		runCount: input.runCount ?? 0,
		latestRunId: input.latestRunId ?? null,
		artifactPath: input.artifactPath ?? '/tmp/out',
		attachments: input.attachments ?? [],
		createdAt: input.createdAt ?? '2026-04-07T10:00:00.000Z',
		updatedAt: input.updatedAt ?? '2026-04-07T11:00:00.000Z',
		latestRun: input.latestRun ?? null,
		assignedThread: input.assignedThread ?? null,
		latestRunThread: input.latestRunThread ?? null,
		statusThread: input.statusThread ?? null,
		linkThread: input.linkThread ?? null,
		linkThreadKind: input.linkThreadKind ?? null,
		updatedAtLabel: input.updatedAtLabel ?? '1h ago',
		hasUnmetDependencies: input.hasUnmetDependencies ?? false,
		openReview: input.openReview ?? null,
		pendingApproval: input.pendingApproval ?? null,
		freshness: input.freshness ?? {
			isStale: false,
			staleSignals: [],
			staleInProgress: false,
			noRecentRunActivity: false,
			activeThreadNoRecentOutput: false,
			taskAgeMs: 60 * 60 * 1000,
			taskAgeLabel: '1h ago',
			runActivityAgeMs: null,
			runActivityAgeLabel: 'No activity yet',
			threadActivityAgeMs: null,
			threadActivityAgeLabel: 'No activity yet'
		}
	};
}

describe('task-governance helpers', () => {
	beforeEach(() => {
		listAgentThreads.mockClear();
		buildTaskWorkItems.mockReset();
		mutateTaskCollections.mockClear();
		controlPlaneState.current = {
			providers: [],
			roles: [],
			projects: [
				{
					id: 'project_1',
					name: 'AMS',
					summary: 'project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/out',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				}
			],
			goals: [
				{
					id: 'goal_1',
					name: 'Ship operator tooling',
					area: 'product',
					status: 'running',
					summary: 'goal',
					artifactPath: '/tmp/project/out/goals',
					parentGoalId: null,
					projectIds: ['project_1'],
					taskIds: ['task_review', 'task_approval', 'task_stale'],
					targetDate: null
				}
			],
			executionSurfaces: [],
			tasks: [
				{
					id: 'task_review',
					title: 'Review task',
					summary: 'Review the change.',
					projectId: 'project_1',
					area: 'product',
					goalId: 'goal_1',
					priority: 'medium',
					status: 'review',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeExecutionSurfaceId: null,
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					targetDate: null,
					runCount: 1,
					latestRunId: 'run_review',
					artifactPath: '/tmp/project/out',
					attachments: [],
					createdAt: '2026-04-07T10:00:00.000Z',
					updatedAt: '2026-04-07T11:00:00.000Z'
				},
				{
					id: 'task_approval',
					title: 'Approval task',
					summary: 'Awaiting approval.',
					projectId: 'project_1',
					area: 'product',
					goalId: 'goal_1',
					priority: 'high',
					status: 'review',
					riskLevel: 'high',
					approvalMode: 'before_complete',
					requiresReview: false,
					desiredRoleId: 'role_coordinator',
					assigneeExecutionSurfaceId: null,
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					targetDate: null,
					runCount: 1,
					latestRunId: 'run_approval',
					artifactPath: '/tmp/project/out',
					attachments: [],
					createdAt: '2026-04-07T10:00:00.000Z',
					updatedAt: '2026-04-07T11:05:00.000Z'
				},
				{
					id: 'task_stale',
					title: 'Stale task',
					summary: 'Needs intervention.',
					projectId: 'project_1',
					area: 'product',
					goalId: 'goal_1',
					priority: 'urgent',
					status: 'in_progress',
					riskLevel: 'high',
					approvalMode: 'none',
					requiresReview: false,
					desiredRoleId: 'role_coordinator',
					assigneeExecutionSurfaceId: null,
					agentThreadId: null,
					blockedReason: 'Waiting on operator input.',
					dependencyTaskIds: ['task_review'],
					targetDate: null,
					runCount: 1,
					latestRunId: 'run_stale',
					artifactPath: '/tmp/project/out',
					attachments: [],
					createdAt: '2026-04-07T09:00:00.000Z',
					updatedAt: '2026-04-07T10:00:00.000Z'
				}
			],
			runs: [
				{
					id: 'run_review',
					taskId: 'task_review',
					executionSurfaceId: null,
					providerId: null,
					status: 'completed',
					createdAt: '2026-04-07T10:00:00.000Z',
					updatedAt: '2026-04-07T11:00:00.000Z',
					startedAt: '2026-04-07T10:00:00.000Z',
					endedAt: null,
					threadId: null,
					agentThreadId: null,
					promptDigest: '',
					artifactPaths: [],
					summary: 'ready for review',
					lastHeartbeatAt: '2026-04-07T10:30:00.000Z',
					errorSummary: ''
				},
				{
					id: 'run_approval',
					taskId: 'task_approval',
					executionSurfaceId: null,
					providerId: null,
					status: 'completed',
					createdAt: '2026-04-07T10:05:00.000Z',
					updatedAt: '2026-04-07T11:05:00.000Z',
					startedAt: '2026-04-07T10:05:00.000Z',
					endedAt: null,
					threadId: null,
					agentThreadId: null,
					promptDigest: '',
					artifactPaths: [],
					summary: 'waiting for approval',
					lastHeartbeatAt: '2026-04-07T10:35:00.000Z',
					errorSummary: ''
				},
				{
					id: 'run_stale',
					taskId: 'task_stale',
					executionSurfaceId: null,
					providerId: null,
					status: 'running',
					createdAt: '2026-04-07T09:00:00.000Z',
					updatedAt: '2026-04-07T10:00:00.000Z',
					startedAt: '2026-04-07T09:00:00.000Z',
					endedAt: null,
					threadId: null,
					agentThreadId: null,
					promptDigest: '',
					artifactPaths: [],
					summary: 'stalled',
					lastHeartbeatAt: '2026-04-07T09:10:00.000Z',
					errorSummary: ''
				}
			],
			reviews: [
				{
					id: 'review_1',
					taskId: 'task_review',
					runId: 'run_review',
					status: 'open',
					createdAt: '2026-04-07T11:00:00.000Z',
					updatedAt: '2026-04-07T11:00:00.000Z',
					resolvedAt: null,
					requestedByExecutionSurfaceId: null,
					reviewerExecutionSurfaceId: null,
					summary: 'Please review.'
				}
			],
			approvals: [
				{
					id: 'approval_1',
					taskId: 'task_approval',
					runId: 'run_approval',
					mode: 'before_complete',
					status: 'pending',
					createdAt: '2026-04-07T11:05:00.000Z',
					updatedAt: '2026-04-07T11:05:00.000Z',
					resolvedAt: null,
					requestedByExecutionSurfaceId: null,
					approverExecutionSurfaceId: null,
					summary: 'Needs final approval.'
				}
			]
		};
		controlPlaneState.saved = null;
	});

	it('groups review, approval, and escalation inbox items', async () => {
		buildTaskWorkItems.mockReturnValue([
			createTaskWorkItem({
				id: 'task_review',
				title: 'Review task',
				goalId: 'goal_1',
				status: 'review',
				openReview: {
					id: 'review_1',
					taskId: 'task_review',
					runId: 'run_review',
					status: 'open',
					createdAt: '2026-04-07T11:00:00.000Z',
					updatedAt: '2026-04-07T11:00:00.000Z',
					resolvedAt: null,
					requestedByExecutionSurfaceId: null,
					reviewerExecutionSurfaceId: null,
					summary: 'Please review.'
				}
			}),
			createTaskWorkItem({
				id: 'task_approval',
				title: 'Approval task',
				goalId: 'goal_1',
				status: 'review',
				approvalMode: 'before_complete',
				pendingApproval: {
					id: 'approval_1',
					taskId: 'task_approval',
					runId: 'run_approval',
					mode: 'before_complete',
					status: 'pending',
					createdAt: '2026-04-07T11:05:00.000Z',
					updatedAt: '2026-04-07T11:05:00.000Z',
					resolvedAt: null,
					requestedByExecutionSurfaceId: null,
					approverExecutionSurfaceId: null,
					summary: 'Needs final approval.'
				}
			}),
			createTaskWorkItem({
				id: 'task_stale',
				title: 'Stale task',
				goalId: 'goal_1',
				status: 'blocked',
				blockedReason: 'Waiting on operator input.',
				hasUnmetDependencies: true,
				dependencyTaskNames: ['Review task'],
				freshness: {
					isStale: true,
					staleSignals: ['noRecentRunActivity'],
					staleInProgress: false,
					noRecentRunActivity: true,
					activeThreadNoRecentOutput: false,
					taskAgeMs: 2 * 60 * 60 * 1000,
					taskAgeLabel: '2h ago',
					runActivityAgeMs: 45 * 60 * 1000,
					runActivityAgeLabel: '45m ago',
					threadActivityAgeMs: null,
					threadActivityAgeLabel: 'No activity yet'
				}
			}),
			createTaskWorkItem({
				id: 'task_manual_review',
				title: 'Manual review task',
				goalId: 'goal_1',
				status: 'review',
				requiresReview: true,
				approvalMode: 'none'
			})
		]);

		const result = await loadGovernanceInboxData();

		expect(result.reviewItems.map((item) => item.id)).toEqual(['task_review']);
		expect(result.approvalItems.map((item) => item.id)).toEqual(['task_approval']);
		expect(result.escalationItems.map((item) => item.id)).toEqual([
			'task_stale',
			'task_manual_review'
		]);
		expect(
			result.queueItems.map((item) => ({
				id: item.id,
				primaryQueueKind: item.primaryQueueKind,
				queueKinds: item.queueKinds
			}))
		).toEqual([
			{
				id: 'task_review',
				primaryQueueKind: 'review',
				queueKinds: ['review']
			},
			{
				id: 'task_manual_review',
				primaryQueueKind: 'review',
				queueKinds: ['review', 'escalation']
			},
			{
				id: 'task_approval',
				primaryQueueKind: 'approval',
				queueKinds: ['approval']
			},
			{
				id: 'task_stale',
				primaryQueueKind: 'escalation',
				queueKinds: ['escalation']
			}
		]);
		expect(result.escalationItems[0]?.escalationReasons).toEqual(
			expect.arrayContaining([
				'Waiting on operator input.',
				'Waiting on dependencies: Review task.',
				'Latest run heartbeat has been quiet for 45m ago.'
			])
		);
		expect(result.escalationItems[1]?.escalationReasons).toEqual([
			'Task is in review and needs operator follow-up.'
		]);
		expect(result.summary).toEqual(
			expect.objectContaining({
				queueCount: 4,
				reviewCount: 1,
				reviewFollowUpCount: 2,
				approvalCount: 1,
				blockedCount: 1,
				dependencyCount: 1,
				staleCount: 1,
				escalationCount: 2
			})
		);
	});

	it('approves an open review and closes the task when no approval is pending', async () => {
		const result = await approveTaskReview('task_review', 'governance inbox');

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'approveReview',
				taskId: 'task_review'
			})
		);
		expect(controlPlaneState.saved?.reviews[0]).toEqual(
			expect.objectContaining({
				status: 'approved',
				resolvedAt: expect.any(String),
				summary: 'Review approved from the governance inbox.'
			})
		);
		expect(controlPlaneState.saved?.tasks.find((task) => task.id === 'task_review')).toEqual(
			expect.objectContaining({
				status: 'done',
				blockedReason: ''
			})
		);
		expect(controlPlaneState.saved?.runs.find((run) => run.id === 'run_review')).toEqual(
			expect.objectContaining({
				status: 'completed',
				summary: 'Task closed after review approval.'
			})
		);
		expect(controlPlaneState.saved?.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_review',
				runId: 'run_review',
				reviewId: 'review_1',
				decisionType: 'review_approved',
				summary: 'Approved the open review and closed the task.'
			})
		);
	});

	it('approves a before-complete gate and closes the task when review is already clear', async () => {
		const result = await approveTaskApproval('task_approval', 'governance inbox');

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'approveApproval',
				taskId: 'task_approval'
			})
		);
		expect(controlPlaneState.saved?.approvals[0]).toEqual(
			expect.objectContaining({
				status: 'approved',
				resolvedAt: expect.any(String),
				summary: 'Approved before_complete gate from the governance inbox.'
			})
		);
		expect(controlPlaneState.saved?.tasks.find((task) => task.id === 'task_approval')).toEqual(
			expect.objectContaining({
				status: 'done',
				blockedReason: ''
			})
		);
		expect(controlPlaneState.saved?.runs.find((run) => run.id === 'run_approval')).toEqual(
			expect.objectContaining({
				status: 'completed',
				summary: 'Task closed after approval.'
			})
		);
		expect(controlPlaneState.saved?.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_approval',
				runId: 'run_approval',
				approvalId: 'approval_1',
				decisionType: 'approval_approved',
				summary: 'Approved the before_complete gate and closed the task.'
			})
		);
	});

	it('approves a review without closing the task when approval is still pending', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			approvals: [
				...(controlPlaneState.current?.approvals ?? []),
				{
					id: 'approval_review_gate',
					taskId: 'task_review',
					runId: 'run_review',
					mode: 'before_complete',
					status: 'pending',
					createdAt: '2026-04-07T11:06:00.000Z',
					updatedAt: '2026-04-07T11:06:00.000Z',
					resolvedAt: null,
					requestedByExecutionSurfaceId: null,
					approverExecutionSurfaceId: null,
					summary: 'Still needs approval.'
				}
			]
		};

		await approveTaskReview('task_review', 'task detail page');

		expect(controlPlaneState.saved?.tasks.find((task) => task.id === 'task_review')).toEqual(
			expect.objectContaining({
				status: 'review',
				blockedReason: ''
			})
		);
		expect(controlPlaneState.saved?.runs.find((run) => run.id === 'run_review')).toEqual(
			expect.objectContaining({
				status: 'completed',
				summary: 'ready for review'
			})
		);
		expect(controlPlaneState.saved?.decisions?.[0]).toEqual(
			expect.objectContaining({
				decisionType: 'review_approved',
				summary: 'Approved the open review.'
			})
		);
	});

	it('approves a before-complete gate without closing the task when review is still open', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			reviews: [
				...(controlPlaneState.current?.reviews ?? []),
				{
					id: 'review_approval_gate',
					taskId: 'task_approval',
					runId: 'run_approval',
					status: 'open',
					createdAt: '2026-04-07T11:07:00.000Z',
					updatedAt: '2026-04-07T11:07:00.000Z',
					resolvedAt: null,
					requestedByExecutionSurfaceId: null,
					reviewerExecutionSurfaceId: null,
					summary: 'Review still open.'
				}
			]
		};

		await approveTaskApproval('task_approval', 'task detail page');

		expect(controlPlaneState.saved?.tasks.find((task) => task.id === 'task_approval')).toEqual(
			expect.objectContaining({
				status: 'review',
				blockedReason: ''
			})
		);
		expect(controlPlaneState.saved?.runs.find((run) => run.id === 'run_approval')).toEqual(
			expect.objectContaining({
				status: 'completed',
				summary: 'waiting for approval'
			})
		);
		expect(controlPlaneState.saved?.decisions?.[0]).toEqual(
			expect.objectContaining({
				decisionType: 'approval_approved',
				summary: 'Approved the before_complete gate.'
			})
		);
	});

	it('blocks the task when review changes are requested', async () => {
		const result = await requestTaskReviewChanges('task_review', 'governance inbox');

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'requestChanges',
				taskId: 'task_review'
			})
		);
		expect(controlPlaneState.saved?.reviews[0]).toEqual(
			expect.objectContaining({
				status: 'changes_requested',
				resolvedAt: expect.any(String),
				summary: 'Changes requested during review. Sent from the governance inbox.'
			})
		);
		expect(controlPlaneState.saved?.tasks.find((task) => task.id === 'task_review')).toEqual(
			expect.objectContaining({
				status: 'blocked',
				blockedReason: 'Changes requested during review.'
			})
		);
		expect(controlPlaneState.saved?.runs.find((run) => run.id === 'run_review')).toEqual(
			expect.objectContaining({
				status: 'blocked',
				summary: 'Changes requested during review.',
				errorSummary: 'Changes requested during review.'
			})
		);
		expect(controlPlaneState.saved?.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_review',
				runId: 'run_review',
				reviewId: 'review_1',
				decisionType: 'review_changes_requested',
				summary: 'Changes requested during review.'
			})
		);
	});

	it('blocks the task when a pending approval is rejected', async () => {
		const result = await rejectTaskApproval('task_approval');

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'rejectApproval',
				taskId: 'task_approval'
			})
		);
		expect(controlPlaneState.saved?.approvals[0]).toEqual(
			expect.objectContaining({
				status: 'rejected',
				resolvedAt: expect.any(String),
				summary: 'before_complete approval rejected.'
			})
		);
		expect(controlPlaneState.saved?.tasks.find((task) => task.id === 'task_approval')).toEqual(
			expect.objectContaining({
				status: 'blocked',
				blockedReason: 'before_complete approval rejected.'
			})
		);
		expect(controlPlaneState.saved?.runs.find((run) => run.id === 'run_approval')).toEqual(
			expect.objectContaining({
				status: 'blocked',
				summary: 'before_complete approval rejected.',
				errorSummary: 'before_complete approval rejected.'
			})
		);
		expect(controlPlaneState.saved?.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_approval',
				runId: 'run_approval',
				approvalId: 'approval_1',
				decisionType: 'approval_rejected',
				summary: 'before_complete approval rejected.'
			})
		);
	});

	it('throws a typed error when the requested review is missing', async () => {
		await expect(approveTaskReview('missing_task', 'governance inbox')).rejects.toBeInstanceOf(
			TaskGovernanceActionError
		);
		await expect(
			requestTaskReviewChanges('missing_task', 'governance inbox')
		).rejects.toBeInstanceOf(TaskGovernanceActionError);
	});

	it('throws a typed error when the requested approval is missing', async () => {
		await expect(approveTaskApproval('missing_task', 'governance inbox')).rejects.toBeInstanceOf(
			TaskGovernanceActionError
		);
		await expect(rejectTaskApproval('missing_task')).rejects.toBeInstanceOf(
			TaskGovernanceActionError
		);
	});
});
