import { describe, expect, it } from 'vitest';
import { buildRunResultPreview } from './goal-run-result-preview';
import type { Approval, ControlPlaneData, Review, Run, Task, TaskTemplate } from '$lib/types/control-plane';

function createTask(overrides: Partial<Task> = {}): Task {
	return {
		id: overrides.id ?? 'task_1',
		title: overrides.title ?? `${overrides.id ?? 'task_1'} title`,
		summary: overrides.summary ?? 'Do the work.',
		successCriteria: overrides.successCriteria ?? 'Done criteria are met.',
		readyCondition: overrides.readyCondition ?? 'Ready.',
		expectedOutcome: overrides.expectedOutcome ?? 'A reviewable result exists.',
		scope: overrides.scope ?? 'Bounded scope.',
		nonGoals: overrides.nonGoals ?? '',
		validationSteps: overrides.validationSteps ?? 'Run checks.',
		rigorProfile: overrides.rigorProfile ?? null,
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
		updatedAt: overrides.updatedAt ?? '2026-06-01T12:30:00.000Z',
		startedAt: overrides.startedAt ?? '2026-06-01T12:00:00.000Z',
		endedAt: overrides.endedAt ?? '2026-06-01T12:30:00.000Z',
		threadId: overrides.threadId ?? null,
		agentThreadId: overrides.agentThreadId ?? null,
		promptDigest: overrides.promptDigest ?? '',
		artifactPaths: overrides.artifactPaths ?? [],
		summary: overrides.summary ?? 'Completed implementation.',
		validationSummary: overrides.validationSummary ?? 'Checks passed.',
		resultSummary: overrides.resultSummary ?? 'Feature is ready.',
		blockersFound: overrides.blockersFound ?? [],
		followUpTaskIds: overrides.followUpTaskIds ?? [],
		lastHeartbeatAt: overrides.lastHeartbeatAt ?? null,
		errorSummary: overrides.errorSummary ?? ''
	};
}

function createReview(overrides: Partial<Review> = {}): Review {
	return {
		id: overrides.id ?? 'review_1',
		taskId: overrides.taskId ?? 'task_1',
		runId: overrides.runId ?? 'run_1',
		status: overrides.status ?? 'open',
		createdAt: overrides.createdAt ?? '2026-06-01T12:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-01T12:00:00.000Z',
		resolvedAt: overrides.resolvedAt ?? null,
		requestedByExecutionSurfaceId: overrides.requestedByExecutionSurfaceId ?? null,
		reviewerExecutionSurfaceId: overrides.reviewerExecutionSurfaceId ?? null,
		summary: overrides.summary ?? 'Review.'
	};
}

function createApproval(overrides: Partial<Approval> = {}): Approval {
	return {
		id: overrides.id ?? 'approval_1',
		taskId: overrides.taskId ?? 'task_1',
		runId: overrides.runId ?? 'run_1',
		mode: overrides.mode ?? 'before_complete',
		status: overrides.status ?? 'pending',
		createdAt: overrides.createdAt ?? '2026-06-01T12:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-01T12:00:00.000Z',
		resolvedAt: overrides.resolvedAt ?? null,
		requestedByExecutionSurfaceId: overrides.requestedByExecutionSurfaceId ?? null,
		approverExecutionSurfaceId: overrides.approverExecutionSurfaceId ?? null,
		summary: overrides.summary ?? 'Approval.'
	};
}

function createTemplate(overrides: Partial<TaskTemplate> = {}): TaskTemplate {
	return {
		id: overrides.id ?? 'template_1',
		name: overrides.name ?? 'Template',
		summary: overrides.summary ?? '',
		projectId: overrides.projectId ?? 'project_1',
		lifecycleStatus: overrides.lifecycleStatus ?? 'active',
		sourceTaskTemplateId: overrides.sourceTaskTemplateId ?? null,
		forkReason: overrides.forkReason ?? '',
		supersededByTaskTemplateId: overrides.supersededByTaskTemplateId ?? null,
		goalId: overrides.goalId ?? 'goal_1',
		workflowId: overrides.workflowId ?? null,
		taskTitle: overrides.taskTitle ?? 'Task',
		taskSummary: overrides.taskSummary ?? '',
		successCriteria: overrides.successCriteria ?? '',
		readyCondition: overrides.readyCondition ?? '',
		expectedOutcome: overrides.expectedOutcome ?? '',
		validationSteps: overrides.validationSteps ?? '',
		area: overrides.area ?? 'product',
		priority: overrides.priority ?? 'medium',
		riskLevel: overrides.riskLevel ?? 'low',
		approvalMode: overrides.approvalMode ?? 'none',
		requiredThreadSandbox: overrides.requiredThreadSandbox ?? null,
		requiresReview: overrides.requiresReview ?? true,
		desiredRoleId: overrides.desiredRoleId ?? '',
		assigneeExecutionSurfaceId: overrides.assigneeExecutionSurfaceId ?? null,
		requiredPromptSkillNames: overrides.requiredPromptSkillNames ?? [],
		requiredCapabilityNames: overrides.requiredCapabilityNames ?? [],
		requiredToolNames: overrides.requiredToolNames ?? [],
		createdAt: overrides.createdAt ?? '2026-06-01T12:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-01T12:00:00.000Z'
	};
}

function createControlPlane(input: {
	task?: Task;
	run?: Run;
	reviews?: Review[];
	approvals?: Approval[];
	templates?: TaskTemplate[];
}): ControlPlaneData {
	const task = input.task ?? createTask();
	const run = input.run ?? createRun({ taskId: task.id });

	return {
		providers: [],
		roles: [],
		projects: [
			{
				id: 'project_1',
				name: 'AMS',
				summary: '',
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
				name: 'Goal loop',
				area: 'product',
				status: 'running',
				summary: '',
				artifactPath: '',
				projectIds: ['project_1'],
				taskIds: [task.id]
			}
		],
		workflows: [],
		workflowSteps: [],
		taskTemplates: input.templates ?? [],
		executionSurfaces: [],
		tasks: [task],
		runs: [run],
		reviews: input.reviews ?? [],
		approvals: input.approvals ?? [],
		planningSessions: [],
		decisions: []
	};
}

describe('buildRunResultPreview', () => {
	it('previews accepted completion updates when the linked task is done', () => {
		const task = createTask({ status: 'done', closeoutState: 'accepted' });
		const preview = buildRunResultPreview(createControlPlane({ task }), { runId: 'run_1' });

		expect(preview).toEqual(
			expect.objectContaining({
				classification: 'completed_accepted',
				nextAction: 'accept_or_close_task'
			})
		);
		expect(preview?.proposedUpdates).toContainEqual(
			expect.objectContaining({ resource: 'task', fields: expect.objectContaining({ status: 'done' }) })
		);
	});

	it('previews review creation for completed runs that require review', () => {
		const preview = buildRunResultPreview(createControlPlane({}), { runId: 'run_1' });

		expect(preview?.classification).toBe('completed_awaiting_review');
		expect(preview?.nextAction).toBe('request_review');
		expect(preview?.proposedUpdates).toContainEqual(
			expect.objectContaining({ resource: 'review', fields: expect.objectContaining({ status: 'open' }) })
		);
	});

	it('detects changes requested as revision work', () => {
		const preview = buildRunResultPreview(
			createControlPlane({
				reviews: [createReview({ status: 'changes_requested', summary: 'Needs smaller scope.' })]
			}),
			{ runId: 'run_1' }
		);

		expect(preview?.classification).toBe('needs_revision');
		expect(preview?.nextAction).toBe('plan_revision');
	});

	it('detects blockers from run evidence', () => {
		const preview = buildRunResultPreview(
			createControlPlane({
				run: createRun({ status: 'blocked', blockersFound: ['Missing credentials.'] })
			}),
			{ runId: 'run_1' }
		);

		expect(preview?.classification).toBe('blocked');
		expect(preview?.proposedUpdates).toContainEqual(
			expect.objectContaining({
				resource: 'task',
				fields: expect.objectContaining({ status: 'blocked' })
			})
		);
	});

	it('detects failed runs', () => {
		const preview = buildRunResultPreview(
			createControlPlane({
				run: createRun({ status: 'failed', errorSummary: 'Tests crashed.' })
			}),
			{ runId: 'run_1' }
		);

		expect(preview?.classification).toBe('failed');
		expect(preview?.nextAction).toBe('diagnose_failure');
	});

	it('detects out-of-scope follow-up discoveries', () => {
		const preview = buildRunResultPreview(
			createControlPlane({
				run: createRun({
					resultSummary: 'Completed the task, but found a separate follow-up outside scope.',
					followUpTaskIds: ['task_followup']
				})
			}),
			{ runId: 'run_1' }
		);

		expect(preview?.classification).toBe('out_of_scope_follow_up');
		expect(preview?.nextAction).toBe('create_follow_up_task');
		expect(preview?.followUpTaskIds).toEqual(['task_followup']);
	});

	it('detects duplicate or superseded task context', () => {
		const task = createTask({ taskTemplateId: 'template_old' });
		const preview = buildRunResultPreview(
			createControlPlane({
				task,
				templates: [
					createTemplate({
						id: 'template_old',
						lifecycleStatus: 'superseded',
						supersededByTaskTemplateId: 'template_new'
					})
				]
			}),
			{ runId: 'run_1' }
		);

		expect(preview?.classification).toBe('duplicate_superseded');
		expect(preview?.nextAction).toBe('resolve_duplicate');
	});

	it('detects pending approvals as user decisions', () => {
		const preview = buildRunResultPreview(
			createControlPlane({
				approvals: [createApproval()]
			}),
			{ runId: 'run_1' }
		);

		expect(preview?.classification).toBe('requires_user_decision');
		expect(preview?.nextAction).toBe('request_user_decision');
	});
});
