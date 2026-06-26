import { describe, expect, it } from 'vitest';
import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { applyAgentRunResultToData } from '$lib/server/agent-run-results';
import type { ControlPlaneData, Goal, Project, Run, Task } from '$lib/types/control-plane';

function createProject(overrides: Partial<Project> = {}): Project {
	return {
		id: overrides.id ?? 'project_1',
		name: overrides.name ?? 'Agent Project',
		summary: overrides.summary ?? 'Project summary.',
		projectRootFolder: overrides.projectRootFolder ?? '/tmp/project',
		defaultArtifactRoot: overrides.defaultArtifactRoot ?? '/tmp/project/agent_output',
		defaultRepoPath: overrides.defaultRepoPath ?? '',
		defaultRepoUrl: overrides.defaultRepoUrl ?? '',
		defaultBranch: overrides.defaultBranch ?? ''
	};
}

function createGoal(overrides: Partial<Goal> = {}): Goal {
	return {
		id: overrides.id ?? 'goal_1',
		name: overrides.name ?? 'Agent-facing AMS',
		area: overrides.area ?? 'product',
		status: overrides.status ?? 'running',
		summary: overrides.summary ?? 'Make AMS usable by agents.',
		successSignal: overrides.successSignal ?? 'Agents can record run evidence.',
		artifactPath: overrides.artifactPath ?? '',
		parentGoalId: overrides.parentGoalId ?? null,
		projectIds: overrides.projectIds ?? ['project_1'],
		taskIds: overrides.taskIds ?? ['task_1'],
		targetDate: overrides.targetDate ?? null,
		planningPriority: overrides.planningPriority ?? 5,
		confidence: overrides.confidence ?? 'medium'
	};
}

function createTask(overrides: Partial<Task> = {}): Task {
	return {
		id: overrides.id ?? 'task_1',
		title: overrides.title ?? 'Implement task',
		summary: overrides.summary ?? 'Implement the bounded change.',
		successCriteria: overrides.successCriteria ?? 'Acceptance criteria are met.',
		readyCondition: overrides.readyCondition ?? 'Ready.',
		expectedOutcome: overrides.expectedOutcome ?? 'A reviewed result exists.',
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
		status: overrides.status ?? 'in_progress',
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
		assumedRoleId: overrides.assumedRoleId ?? null,
		providerId: overrides.providerId ?? null,
		agentThreadRunId: overrides.agentThreadRunId ?? null,
		status: overrides.status ?? 'running',
		createdAt: overrides.createdAt ?? '2026-06-01T12:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-01T12:00:00.000Z',
		startedAt: overrides.startedAt ?? '2026-06-01T12:00:00.000Z',
		endedAt: overrides.endedAt ?? null,
		threadId: overrides.threadId ?? null,
		agentThreadId: overrides.agentThreadId ?? null,
		promptDigest: overrides.promptDigest ?? '',
		artifactPaths: overrides.artifactPaths ?? [],
		summary: overrides.summary ?? '',
		inputPrompt: overrides.inputPrompt ?? '',
		contextSummary: overrides.contextSummary ?? '',
		actionsTaken: overrides.actionsTaken ?? '',
		validationSummary: overrides.validationSummary ?? '',
		resultSummary: overrides.resultSummary ?? '',
		blockersFound: overrides.blockersFound ?? [],
		followUpTaskIds: overrides.followUpTaskIds ?? [],
		effectiveRigorProfile: overrides.effectiveRigorProfile ?? null,
		lastHeartbeatAt: overrides.lastHeartbeatAt ?? null,
		errorSummary: overrides.errorSummary ?? '',
		modelUsed: overrides.modelUsed ?? null,
		modelSource: overrides.modelSource ?? 'unknown',
		observedModelUsed: overrides.observedModelUsed ?? null,
		modelMismatchSummary: overrides.modelMismatchSummary ?? null,
		usageSource: overrides.usageSource ?? 'missing',
		inputTokens: overrides.inputTokens ?? null,
		cachedInputTokens: overrides.cachedInputTokens ?? null,
		outputTokens: overrides.outputTokens ?? null,
		uncachedInputTokens: overrides.uncachedInputTokens ?? null,
		usageCapturedAt: overrides.usageCapturedAt ?? null,
		estimatedCostUsd: overrides.estimatedCostUsd ?? null,
		costSource: overrides.costSource ?? 'missing_usage',
		pricingVersion: overrides.pricingVersion ?? null
	};
}

function createControlPlane(input: { task?: Task; run?: Run } = {}): ControlPlaneData {
	const task = input.task ?? createTask();
	const run = input.run ?? createRun({ taskId: task.id });

	return {
		providers: [],
		roles: [],
		projects: [createProject()],
		goals: [createGoal({ taskIds: [task.id] })],
		workflows: [],
		workflowSteps: [],
		taskTemplates: [],
		executionSurfaces: [],
		tasks: [task],
		runs: [run],
		reviews: [],
		planningSessions: [],
		approvals: [],
		decisions: []
	};
}

describe('applyAgentRunResultToData', () => {
	it('records completed run evidence and returns a review preview without changing task state', () => {
		const task = createTask({ status: 'in_progress', requiresReview: true });
		const data = createControlPlane({ task, run: createRun({ taskId: task.id }) });
		const result = applyAgentRunResultToData(data, {
			command: 'record_run_result',
			runId: 'run_1',
			status: 'completed',
			resultSummary: 'Implemented the API.',
			validationSummary: 'Unit tests passed.',
			artifactPaths: ['/tmp/artifact.md']
		});

		expect(result.record.run).toEqual(
			expect.objectContaining({
				status: 'completed',
				resultSummary: 'Implemented the API.',
				validationSummary: 'Unit tests passed.',
				artifactPaths: ['/tmp/artifact.md']
			})
		);
		expect(result.data.tasks[0]?.status).toBe('in_progress');
		expect(result.record.preview).toEqual(
			expect.objectContaining({
				classification: 'completed_awaiting_review',
				nextAction: 'request_review'
			})
		);
		expect(result.record.safety).toEqual(
			expect.objectContaining({
				mutation: 'run_evidence_only',
				taskStateChanged: false,
				reviewStateChanged: false,
				approvalStateChanged: false
			})
		);
	});

	it('records blockers on the run without setting the task blocked', () => {
		const data = createControlPlane();
		const result = applyAgentRunResultToData(data, {
			command: 'record_blocker',
			runId: 'run_1',
			blocker: 'Missing credentials.'
		});

		expect(result.record.run.status).toBe('blocked');
		expect(result.record.run.blockersFound).toEqual(['Missing credentials.']);
		expect(result.data.tasks[0]?.status).toBe('in_progress');
		expect(result.record.suggestedNextCommands).toEqual(expect.arrayContaining(['task:update']));
	});

	it('requires validation summary for validation result command', () => {
		const data = createControlPlane();

		expect(() =>
			applyAgentRunResultToData(data, {
				command: 'record_validation_result',
				runId: 'run_1'
			})
		).toThrow(AgentControlPlaneApiError);
	});

	it('records follow-up task ids without creating tasks', () => {
		const data = createControlPlane();
		const result = applyAgentRunResultToData(data, {
			command: 'record_followup_recommendations',
			runId: 'run_1',
			followUpTaskIds: ['task_followup'],
			resultSummary: 'Follow-up task captures remaining work.'
		});

		expect(result.record.run.followUpTaskIds).toEqual(['task_followup']);
		expect(result.data.tasks).toHaveLength(1);
		expect(result.record.suggestedNextCommands).toEqual(expect.arrayContaining(['task:create']));
	});

	it('creates a draft follow-up task from run evidence and links it to the run', () => {
		const data = createControlPlane({
			run: createRun({
				resultSummary: 'Completed main work; docs remain out of scope.',
				validationSummary: 'Tests passed.'
			})
		});
		const result = applyAgentRunResultToData(data, {
			command: 'create_followup_task',
			runId: 'run_1',
			title: 'Document run-result API',
			summary: 'Document the new run-result API surface.'
		});

		expect(result.record.task).toEqual(
			expect.objectContaining({
				title: 'Document run-result API',
				status: 'in_draft',
				readinessLevel: 'R1_FRAMED',
				autonomyLevel: 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE',
				projectId: 'project_1',
				goalId: 'goal_1'
			})
		);
		expect(result.record.createdTask).toBe(true);
		expect(result.record.safety).toEqual(
			expect.objectContaining({
				mutation: 'run_evidence_and_draft_task',
				taskStateChanged: true,
				reviewStateChanged: false
			})
		);
		expect(result.record.run.followUpTaskIds).toEqual([result.record.task?.id]);
		expect(result.data.tasks).toHaveLength(2);
		expect(result.data.goals[0]?.taskIds).toEqual(
			expect.arrayContaining(['task_1', result.record.task?.id])
		);
	});

	it('dedupes follow-up creation against existing open task titles in the same goal', () => {
		const existingFollowup = createTask({
			id: 'task_existing',
			title: 'Document run-result API',
			status: 'ready'
		});
		const sourceTask = createTask();
		const run = createRun({ taskId: sourceTask.id });
		const data = {
			...createControlPlane({ task: sourceTask, run }),
			tasks: [sourceTask, existingFollowup]
		};
		const result = applyAgentRunResultToData(data, {
			command: 'create_followup_task',
			runId: 'run_1',
			title: ' document   run-result api '
		});

		expect(result.record.task?.id).toBe('task_existing');
		expect(result.record.createdTask).toBe(false);
		expect(result.record.dedupedExistingTask).toBe(true);
		expect(result.data.tasks).toHaveLength(2);
		expect(result.record.run.followUpTaskIds).toEqual(['task_existing']);
	});

	it('previews requesting review from a completed run without mutating state', () => {
		const data = createControlPlane({
			run: createRun({
				status: 'completed',
				resultSummary: 'Ready for review.'
			})
		});
		const result = applyAgentRunResultToData(data, {
			command: 'request_review_from_run',
			runId: 'run_1',
			validateOnly: true
		});

		expect(result.record.validationOnly).toBe(true);
		expect(result.record.safety).toEqual(
			expect.objectContaining({
				mutation: 'task_review_request',
				taskStateChanged: false,
				reviewStateChanged: false
			})
		);
		expect(result.data.reviews).toHaveLength(0);
		expect(result.data.tasks[0]?.status).toBe('in_progress');
		expect(result.changedCollections).toEqual([]);
	});

	it('requests review from a completed run without accepting the task', () => {
		const data = createControlPlane({
			run: createRun({
				status: 'completed',
				resultSummary: 'Ready for review.'
			})
		});
		const result = applyAgentRunResultToData(data, {
			command: 'request_review_from_run',
			runId: 'run_1',
			summary: 'Review the completed run.'
		});

		expect(result.data.reviews).toEqual([
			expect.objectContaining({
				taskId: 'task_1',
				runId: 'run_1',
				status: 'open',
				summary: 'Review the completed run.'
			})
		]);
		expect(result.record.task).toEqual(
			expect.objectContaining({
				id: 'task_1',
				status: 'review'
			})
		);
		expect(result.record.safety.approvalStateChanged).toBe(false);
		expect(result.changedCollections).toEqual(['tasks', 'reviews', 'decisions']);
	});

	it('previews marking the task blocked from run evidence', () => {
		const data = createControlPlane({
			run: createRun({
				status: 'blocked',
				blockersFound: ['Missing access.']
			})
		});
		const result = applyAgentRunResultToData(data, {
			command: 'mark_task_blocked_from_run',
			runId: 'run_1',
			validateOnly: true
		});

		expect(result.record.validationOnly).toBe(true);
		expect(result.record.safety).toEqual(
			expect.objectContaining({
				mutation: 'task_blocked_update',
				taskStateChanged: false
			})
		);
		expect(result.data.tasks[0]?.status).toBe('in_progress');
		expect(result.changedCollections).toEqual([]);
	});

	it('marks the linked task blocked from run blocker evidence', () => {
		const data = createControlPlane({
			run: createRun({
				status: 'blocked',
				blockersFound: ['Missing access.']
			})
		});
		const result = applyAgentRunResultToData(data, {
			command: 'mark_task_blocked_from_run',
			runId: 'run_1'
		});

		expect(result.record.task).toEqual(
			expect.objectContaining({
				id: 'task_1',
				status: 'blocked',
				blockedReason: 'Missing access.'
			})
		);
		expect(result.record.safety).toEqual(
			expect.objectContaining({
				mutation: 'task_blocked_update',
				taskStateChanged: true,
				reviewStateChanged: false
			})
		);
		expect(result.changedCollections).toEqual(['tasks', 'runs', 'decisions']);
	});
});
