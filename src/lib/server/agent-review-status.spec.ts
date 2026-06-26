import { describe, expect, it } from 'vitest';
import { buildAgentReviewStatusResponse } from '$lib/server/agent-review-status';
import type { Approval, ControlPlaneData, Review, Run, Task } from '$lib/types/control-plane';

function createTask(overrides: Partial<Task> = {}): Task {
	return {
		id: overrides.id ?? 'task_1',
		title: overrides.title ?? 'Review task',
		summary: overrides.summary ?? 'Task summary.',
		successCriteria: overrides.successCriteria ?? '',
		readyCondition: overrides.readyCondition ?? '',
		expectedOutcome: overrides.expectedOutcome ?? '',
		scope: overrides.scope ?? '',
		nonGoals: overrides.nonGoals ?? '',
		validationSteps: overrides.validationSteps ?? '',
		rigorProfile: overrides.rigorProfile ?? null,
		readinessLevel: overrides.readinessLevel ?? 'R1_FRAMED',
		autonomyLevel: overrides.autonomyLevel ?? 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE',
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
		status: overrides.status ?? 'review',
		riskLevel: overrides.riskLevel ?? 'medium',
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
		runCount: overrides.runCount ?? 1,
		latestRunId: overrides.latestRunId ?? 'run_1',
		closeoutState: overrides.closeoutState ?? null,
		closeoutSummary: overrides.closeoutSummary ?? '',
		closeoutChanged: overrides.closeoutChanged ?? '',
		closeoutValidation: overrides.closeoutValidation ?? '',
		closeoutRemainingIssues: overrides.closeoutRemainingIssues ?? '',
		closeoutFollowUps: overrides.closeoutFollowUps ?? [],
		closeoutShouldUpdateMemory: overrides.closeoutShouldUpdateMemory ?? false,
		closeoutRecordedAt: overrides.closeoutRecordedAt ?? null,
		artifactPath: overrides.artifactPath ?? '',
		attachments: overrides.attachments ?? [],
		createdAt: overrides.createdAt ?? '2026-06-01T12:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-01T12:00:00.000Z'
	};
}

function createRun(overrides: Partial<Run> = {}): Run {
	return {
		id: overrides.id ?? 'run_1',
		taskId: overrides.taskId ?? 'task_1',
		executionSurfaceId: overrides.executionSurfaceId ?? null,
		providerId: overrides.providerId ?? null,
		status: overrides.status ?? 'completed',
		createdAt: overrides.createdAt ?? '2026-06-01T12:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-01T12:05:00.000Z',
		startedAt: overrides.startedAt ?? '2026-06-01T12:00:00.000Z',
		endedAt: overrides.endedAt ?? '2026-06-01T12:05:00.000Z',
		threadId: overrides.threadId ?? null,
		agentThreadId: overrides.agentThreadId ?? null,
		promptDigest: overrides.promptDigest ?? '',
		artifactPaths: overrides.artifactPaths ?? [],
		summary: overrides.summary ?? 'Completed run.',
		lastHeartbeatAt: overrides.lastHeartbeatAt ?? null,
		errorSummary: overrides.errorSummary ?? '',
		resultSummary: overrides.resultSummary ?? '',
		validationSummary: overrides.validationSummary ?? ''
	};
}

function createReview(overrides: Partial<Review> = {}): Review {
	return {
		id: overrides.id ?? 'review_1',
		taskId: overrides.taskId ?? 'task_1',
		runId: overrides.runId ?? 'run_1',
		status: overrides.status ?? 'open',
		createdAt: overrides.createdAt ?? '2026-06-01T12:05:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-01T12:05:00.000Z',
		resolvedAt: overrides.resolvedAt ?? null,
		requestedByExecutionSurfaceId: overrides.requestedByExecutionSurfaceId ?? null,
		reviewerExecutionSurfaceId: overrides.reviewerExecutionSurfaceId ?? null,
		summary: overrides.summary ?? 'Ready for review.'
	};
}

function createApproval(overrides: Partial<Approval> = {}): Approval {
	return {
		id: overrides.id ?? 'approval_1',
		taskId: overrides.taskId ?? 'task_1',
		runId: overrides.runId ?? 'run_1',
		mode: overrides.mode ?? 'before_complete',
		status: overrides.status ?? 'pending',
		createdAt: overrides.createdAt ?? '2026-06-01T12:06:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-01T12:06:00.000Z',
		resolvedAt: overrides.resolvedAt ?? null,
		requestedByExecutionSurfaceId: overrides.requestedByExecutionSurfaceId ?? null,
		approverExecutionSurfaceId: overrides.approverExecutionSurfaceId ?? null,
		summary: overrides.summary ?? 'Approval required.'
	};
}

function createData(overrides: Partial<ControlPlaneData> = {}): ControlPlaneData {
	return {
		providers: [],
		roles: [],
		projects: [],
		goals: [],
		executionSurfaces: [],
		tasks: [createTask()],
		runs: [createRun()],
		reviews: [createReview()],
		approvals: [],
		decisions: [],
		planningSessions: [],
		...overrides
	};
}

describe('agent review status', () => {
	it('returns task-scoped open review status and next commands', () => {
		const result = buildAgentReviewStatusResponse(createData(), {
			command: 'get_review_status',
			taskId: 'task_1'
		});

		expect(result).toEqual(
			expect.objectContaining({
				command: 'get_review_status',
				openReview: expect.objectContaining({ id: 'review_1', status: 'open' }),
				pendingApproval: null,
				gate: expect.objectContaining({
					status: 'awaiting_review',
					nextCommands: expect.arrayContaining(['task:approve-review'])
				})
			})
		);
	});

	it('prioritizes pending approval over open review', () => {
		const result = buildAgentReviewStatusResponse(
			createData({
				approvals: [createApproval()]
			}),
			{
				command: 'get_review_status',
				taskId: 'task_1'
			}
		);

		expect(result).toEqual(
			expect.objectContaining({
				gate: expect.objectContaining({
					status: 'approval_required',
					nextCommands: expect.arrayContaining(['task:approve-approval'])
				})
			})
		);
	});

	it('lists goal-scoped review and completed-run gates', () => {
		const secondTask = createTask({
			id: 'task_2',
			status: 'ready',
			latestRunId: 'run_2'
		});
		const result = buildAgentReviewStatusResponse(
			createData({
				tasks: [createTask(), secondTask],
				runs: [createRun(), createRun({ id: 'run_2', taskId: 'task_2', status: 'completed' })],
				reviews: [createReview()]
			}),
			{
				command: 'get_review_status',
				goalId: 'goal_1'
			}
		);

		const gates = 'gates' in result ? result.gates : null;

		if (!gates) {
			throw new Error('Expected goal-scoped review status list.');
		}

		expect(gates).toHaveLength(2);
		expect(gates.map((entry) => entry.gate.status)).toEqual(
			expect.arrayContaining(['awaiting_review', 'completed_without_open_review'])
		);
	});
});
