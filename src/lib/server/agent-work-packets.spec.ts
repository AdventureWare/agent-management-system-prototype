import { describe, expect, it } from 'vitest';
import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { getAgentCapabilityManifest } from '$lib/server/agent-capability-manifest';
import { buildAgentGoalLoopResponse } from '$lib/server/agent-goal-loop';
import { applyAgentRunResultToData } from '$lib/server/agent-run-results';
import { buildAgentWorkPacketResponse } from '$lib/server/agent-work-packets';
import type { ControlPlaneData, Goal, Project, Run, Task } from '$lib/types/control-plane';

function createProject(overrides: Partial<Project> = {}): Project {
	return {
		id: overrides.id ?? 'project_1',
		name: overrides.name ?? 'AMS',
		summary: overrides.summary ?? 'Agent management prototype.',
		projectBrief: overrides.projectBrief ?? 'Coordinate agent work.',
		currentStateMemo: overrides.currentStateMemo ?? 'Goal loop packets are available.',
		decisionLog: overrides.decisionLog ?? '',
		agentInstructionsPath: overrides.agentInstructionsPath ?? 'AGENTS.md',
		setupNotes: overrides.setupNotes ?? '',
		validationCommands: overrides.validationCommands ?? ['npm run check'],
		codingConventions: overrides.codingConventions ?? '',
		approvalRequirements: overrides.approvalRequirements ?? '',
		defaultAllowedActions: overrides.defaultAllowedActions ?? [],
		defaultDisallowedActions: overrides.defaultDisallowedActions ?? [],
		defaultAutonomyLevel: overrides.defaultAutonomyLevel ?? 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE',
		defaultRiskThreshold: overrides.defaultRiskThreshold ?? 'medium',
		defaultReviewRequirement: overrides.defaultReviewRequirement ?? 'SUMMARY_REVIEW',
		defaultRigorProfile: overrides.defaultRigorProfile ?? 'INTERNAL',
		defaultValidationExpectations: overrides.defaultValidationExpectations ?? 'Run focused checks.',
		importantLinks: overrides.importantLinks ?? [],
		constraints: overrides.constraints ?? 'Use existing concepts.',
		nonGoals: overrides.nonGoals ?? 'No duplicate systems.',
		projectRootFolder: overrides.projectRootFolder ?? '/repo',
		defaultArtifactRoot: overrides.defaultArtifactRoot ?? '/repo/agent_output',
		defaultRepoPath: overrides.defaultRepoPath ?? '/repo',
		defaultRepoUrl: overrides.defaultRepoUrl ?? '',
		defaultBranch: overrides.defaultBranch ?? 'main'
	};
}

function createGoal(overrides: Partial<Goal> = {}): Goal {
	return {
		id: overrides.id ?? 'goal_1',
		name: overrides.name ?? 'Agent-facing AMS',
		area: overrides.area ?? 'product',
		status: overrides.status ?? 'running',
		summary: overrides.summary ?? 'Make AMS usable by agents.',
		successSignal: overrides.successSignal ?? 'A structured packet is available.',
		artifactPath: overrides.artifactPath ?? '',
		projectIds: overrides.projectIds ?? ['project_1'],
		taskIds: overrides.taskIds ?? []
	};
}

function createTask(overrides: Partial<Task> = {}): Task {
	return {
		id: overrides.id ?? 'task_1',
		title: overrides.title ?? 'Build work-packet API',
		summary: overrides.summary ?? 'Expose structured packet data.',
		successCriteria: overrides.successCriteria ?? 'Packet contains structured sections.',
		readyCondition: overrides.readyCondition ?? 'Goal-loop helpers exist.',
		expectedOutcome: overrides.expectedOutcome ?? 'Agents can fetch a packet.',
		scope: overrides.scope ?? 'Read-only endpoint.',
		nonGoals: overrides.nonGoals ?? 'No mutation.',
		validationSteps: overrides.validationSteps ?? 'Run focused tests.',
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
		runCount: overrides.runCount ?? 0,
		latestRunId: overrides.latestRunId ?? null,
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

function createControlPlane(tasks: Task[]): ControlPlaneData {
	return {
		providers: [],
		roles: [],
		projects: [createProject()],
		goals: [createGoal({ taskIds: tasks.map((task) => task.id) })],
		workflows: [],
		workflowSteps: [],
		taskTemplates: [],
		executionSurfaces: [],
		tasks,
		runs: [],
		reviews: [],
		planningSessions: [],
		approvals: [],
		decisions: []
	};
}

function getRecommendation(response: unknown) {
	if (!response || typeof response !== 'object' || !('recommendation' in response)) {
		throw new Error('Expected a goal-loop recommendation response.');
	}

	return (response as { recommendation: unknown }).recommendation;
}

describe('buildAgentWorkPacketResponse', () => {
	it('returns structured sections plus the rendered work packet prompt', () => {
		const data = createControlPlane([createTask({ id: 'task_packet' })]);
		const result = buildAgentWorkPacketResponse(data, {
			command: 'get_agent_work_packet',
			goalId: 'goal_1'
		});

		expect(result).toEqual(
			expect.objectContaining({
				command: 'get_agent_work_packet',
				resolved: expect.objectContaining({
					projectId: 'project_1',
					goalId: 'goal_1',
					taskId: 'task_packet'
				}),
				safety: expect.objectContaining({
					readOnly: true
				}),
				packet: expect.objectContaining({
					mode: 'executor',
					recommendationKind: 'execute_task',
					prompt: expect.stringContaining('Goal Loop Selected Work Packet')
				}),
				structuredSections: expect.objectContaining({
					selection: expect.objectContaining({
						includedTaskIds: ['task_packet']
					}),
					context: expect.objectContaining({
						project: expect.objectContaining({ id: 'project_1' }),
						goal: expect.objectContaining({ id: 'goal_1' }),
						task: expect.objectContaining({ id: 'task_packet' })
					}),
					guardrails: expect.objectContaining({
						stoppingConditions: expect.any(Array),
						validationExpectations: ['Run focused tests.']
					}),
					expectedResult: expect.objectContaining({
						shape: expect.arrayContaining(['What changed'])
					})
				})
			})
		);
	});

	it('throws structured guidance for unknown commands', () => {
		const data = createControlPlane([createTask()]);

		expect(() =>
			buildAgentWorkPacketResponse(data, {
				command: 'unknown'
			})
		).toThrow(AgentControlPlaneApiError);
	});

	it('keeps the goal-loop recommendation, work packet, run result, review, and follow-up task path aligned', () => {
		const task = createTask({ id: 'task_roundtrip' });
		let data = createControlPlane([task]);
		const manifest = getAgentCapabilityManifest();

		expect(manifest.commands).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					resource: 'goal-loop',
					command: 'get_next_recommended_action',
					path: '/api/agent-goal-loop/get_next_recommended_action'
				}),
				expect.objectContaining({
					resource: 'work-packet',
					command: 'get_agent_work_packet',
					path: '/api/agent-work-packets/get_agent_work_packet'
				}),
				expect.objectContaining({
					resource: 'run-result',
					command: 'record_run_result',
					path: '/api/agent-run-results/record_run_result'
				}),
				expect.objectContaining({
					resource: 'run-result',
					command: 'request_review_from_run',
					path: '/api/agent-run-results/request_review_from_run'
				}),
				expect.objectContaining({
					resource: 'run-result',
					command: 'create_followup_task',
					path: '/api/agent-run-results/create_followup_task'
				})
			])
		);

		expect(
			getRecommendation(
				buildAgentGoalLoopResponse(data, {
					command: 'get_next_recommended_action',
					goalId: 'goal_1'
				})
			)
		).toEqual(
			expect.objectContaining({
				kind: 'execute_task',
				taskIds: ['task_roundtrip']
			})
		);

		const packet = buildAgentWorkPacketResponse(data, {
			command: 'get_agent_work_packet',
			goalId: 'goal_1',
			taskId: 'task_roundtrip'
		});
		expect(packet.packet).toEqual(
			expect.objectContaining({
				mode: 'executor',
				recommendationKind: 'execute_task',
				taskId: 'task_roundtrip',
				includedTaskIds: ['task_roundtrip']
			})
		);
		expect(packet.structuredSections.expectedResult.shape).toEqual(
			expect.arrayContaining(['What changed', 'Validation commands and results'])
		);

		const run = createRun({ id: 'run_roundtrip', taskId: task.id });
		data = {
			...data,
			tasks: [
				{
					...task,
					status: 'in_progress',
					runCount: 1,
					latestRunId: run.id
				}
			],
			runs: [run]
		};

		let result = applyAgentRunResultToData(data, {
			command: 'record_run_result',
			runId: run.id,
			status: 'completed',
			resultSummary: 'Implemented the round-trip test.',
			validationSummary: 'Focused Vitest command passed.',
			artifactPaths: ['/repo/agent_output/roundtrip.md']
		});
		expect(result.record.preview).toEqual(
			expect.objectContaining({
				classification: 'completed_awaiting_review',
				nextAction: 'request_review'
			})
		);
		expect(result.record.safety.taskStateChanged).toBe(false);

		result = applyAgentRunResultToData(result.data, {
			command: 'request_review_from_run',
			runId: run.id,
			summary: 'Review the completed round-trip test.'
		});
		expect(result.record.task).toEqual(
			expect.objectContaining({
				id: task.id,
				status: 'review'
			})
		);
		expect(result.data.reviews).toEqual([
			expect.objectContaining({
				taskId: task.id,
				runId: run.id,
				status: 'open'
			})
		]);
		expect(
			getRecommendation(
				buildAgentGoalLoopResponse(result.data, {
					command: 'get_next_recommended_action',
					goalId: 'goal_1'
				})
			)
		).toEqual(
			expect.objectContaining({
				kind: 'review_result',
				taskIds: [task.id]
			})
		);

		const followup = applyAgentRunResultToData(result.data, {
			command: 'create_followup_task',
			runId: run.id,
			title: 'Document round-trip test coverage',
			summary: 'Document what the regression covers.'
		});
		expect(followup.record.task).toEqual(
			expect.objectContaining({
				title: 'Document round-trip test coverage',
				status: 'in_draft',
				projectId: 'project_1',
				goalId: 'goal_1'
			})
		);
		expect(followup.record.run.followUpTaskIds).toEqual([followup.record.task?.id]);
		expect(followup.data.goals[0]?.taskIds).toEqual(
			expect.arrayContaining([task.id, followup.record.task?.id])
		);

		const deduped = applyAgentRunResultToData(followup.data, {
			command: 'create_followup_task',
			runId: run.id,
			title: ' document   round-trip test coverage '
		});
		expect(deduped.record.createdTask).toBe(false);
		expect(deduped.record.dedupedExistingTask).toBe(true);
		expect(deduped.data.tasks).toHaveLength(2);
		expect(deduped.record.run.followUpTaskIds).toEqual([followup.record.task?.id]);
	});
});
