import { describe, expect, it } from 'vitest';
import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { buildAgentWorkPacketResponse } from '$lib/server/agent-work-packets';
import type { ControlPlaneData, Goal, Project, Task } from '$lib/types/control-plane';

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
});
