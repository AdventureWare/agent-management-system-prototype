import { describe, expect, it } from 'vitest';
import { AgentControlPlaneApiError } from '$lib/server/agent-api-errors';
import { buildAgentIntentInterpretationResponse } from '$lib/server/agent-intent-interpretation';
import type { ControlPlaneData, Goal, Project, Run, Task } from '$lib/types/control-plane';

function createProject(overrides: Partial<Project> = {}): Project {
	return {
		id: 'project_ams',
		name: 'AMS Prototype',
		summary: 'Agent Management System prototype.',
		projectBrief: 'Keep AMS centered on durable state.',
		constraints: 'Reuse existing Goal, Task, Run, Review, Approval, and Decision concepts.',
		nonGoals: 'Do not add duplicate planning systems.',
		approvalRequirements: 'Use approval for external-state changes.',
		defaultRigorProfile: 'INTERNAL',
		projectRootFolder: '/tmp/ams',
		defaultArtifactRoot: '/tmp/ams/agent_output',
		defaultRepoPath: '',
		defaultRepoUrl: '',
		defaultBranch: 'main',
		additionalWritableRoots: [],
		defaultThreadSandbox: 'workspace-write',
		...overrides
	};
}

function createGoal(overrides: Partial<Goal> = {}): Goal {
	return {
		id: 'goal_intent',
		name: 'Explicit intent interpretation',
		area: 'product',
		status: 'running',
		summary: 'Preserve messy intent before mutating AMS state.',
		artifactPath: '/tmp/ams/agent_output',
		successSignal: 'Operators can review assumptions first.',
		projectIds: ['project_ams'],
		taskIds: ['task_existing'],
		planningPriority: 2,
		confidence: 'medium',
		...overrides
	};
}

function createTask(overrides: Partial<Task> = {}): Task {
	return {
		id: 'task_existing',
		title: 'Existing helper task',
		summary: 'Implement the existing helper.',
		successCriteria: 'Focused tests pass.',
		readyCondition: 'Design accepted.',
		expectedOutcome: 'Helper exists.',
		scope: 'Server helper only.',
		nonGoals: 'No public API exposure.',
		validationSteps: 'Run focused tests.',
		rigorProfile: null,
		readinessLevel: 'R3_EXECUTABLE',
		autonomyLevel: 'A2_AGENT_MAY_DRAFT_ARTIFACTS',
		allowedActionNames: [],
		reviewRequirement: 'SUMMARY_REVIEW',
		projectId: 'project_ams',
		area: 'product',
		goalId: 'goal_intent',
		taskTemplateId: null,
		workflowId: null,
		parentTaskId: null,
		priority: 'high',
		status: 'ready',
		riskLevel: 'medium',
		approvalMode: 'none',
		requiredThreadSandbox: null,
		requiresReview: true,
		desiredRoleId: '',
		assigneeExecutionSurfaceId: null,
		agentThreadId: null,
		requiredPromptSkillNames: [],
		requiredCapabilityNames: [],
		requiredToolNames: [],
		blockedReason: '',
		dependencyTaskIds: [],
		runCount: 1,
		latestRunId: 'run_existing',
		closeoutState: null,
		artifactPath: '/tmp/ams/agent_output',
		attachments: [],
		createdAt: '2026-06-29T00:00:00.000Z',
		updatedAt: '2026-06-29T00:00:00.000Z',
		...overrides
	};
}

function createRun(overrides: Partial<Run> = {}): Run {
	return {
		id: 'run_existing',
		taskId: 'task_existing',
		executionSurfaceId: null,
		providerId: 'provider_local_codex',
		status: 'completed',
		createdAt: '2026-06-29T00:00:00.000Z',
		updatedAt: '2026-06-29T01:00:00.000Z',
		startedAt: '2026-06-29T00:00:00.000Z',
		endedAt: '2026-06-29T01:00:00.000Z',
		threadId: null,
		agentThreadId: null,
		promptDigest: 'abc123',
		artifactPaths: [],
		summary: 'Helper implemented.',
		inputPrompt: '',
		contextSummary: '',
		actionsTaken: '',
		validationSummary: '',
		resultSummary: '',
		blockersFound: [],
		followUpTaskIds: [],
		effectiveRigorProfile: 'INTERNAL',
		lastHeartbeatAt: null,
		errorSummary: '',
		...overrides
	};
}

function createData(): ControlPlaneData {
	return {
		providers: [],
		roles: [],
		projects: [createProject()],
		goals: [createGoal()],
		workflows: [],
		workflowSteps: [],
		taskTemplates: [],
		executionSurfaces: [],
		tasks: [createTask()],
		runs: [createRun()],
		reviews: [],
		planningSessions: [],
		approvals: [],
		decisions: []
	};
}

describe('agent intent interpretation', () => {
	it('returns the accepted read-only proposal shape with flat source context', () => {
		const data = createData();
		const before = structuredClone(data);

		const proposal = buildAgentIntentInterpretationResponse(data, {
			command: 'interpret_intent',
			rawIntent: 'Create a task to expose the intent helper through CLI and MCP.',
			sourceKind: 'assistant_request',
			projectId: 'project_ams',
			goalId: 'goal_intent',
			taskId: 'task_existing',
			runId: 'run_existing'
		});

		expect(proposal.source).toMatchObject({
			rawIntent: 'Create a task to expose the intent helper through CLI and MCP.',
			sourceKind: 'assistant_request',
			projectId: 'project_ams',
			goalId: 'goal_intent',
			taskId: 'task_existing',
			runId: 'run_existing'
		});
		expect(proposal.source.sourceLinks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ kind: 'raw_intent' }),
				expect.objectContaining({ kind: 'project', id: 'project_ams' }),
				expect.objectContaining({ kind: 'goal', id: 'goal_intent' }),
				expect.objectContaining({ kind: 'task', id: 'task_existing' }),
				expect.objectContaining({ kind: 'run', id: 'run_existing' })
			])
		);
		expect(proposal.safety).toMatchObject({ readOnly: true, mutationCount: 0 });
		expect(data).toEqual(before);
	});

	it('accepts nested context and preserves task, goal, review, approval, run, and decision state', () => {
		const data = createData();
		const beforeState = {
			tasks: structuredClone(data.tasks),
			goals: structuredClone(data.goals),
			reviews: structuredClone(data.reviews),
			approvals: structuredClone(data.approvals),
			runs: structuredClone(data.runs),
			decisions: structuredClone(data.decisions)
		};

		const proposal = buildAgentIntentInterpretationResponse(data, {
			command: 'interpret_intent',
			rawIntent: 'Maybe update it, but I am not sure what the acceptance criteria should be.',
			context: {
				projectId: 'project_ams',
				goalId: 'goal_intent',
				taskId: 'task_existing',
				sourceKind: 'task'
			}
		});

		expect(proposal.routing.recommendedNextAction).toBe('update_task');
		expect(proposal.interpretation.openQuestions.length).toBeGreaterThan(0);
		expect({
			tasks: data.tasks,
			goals: data.goals,
			reviews: data.reviews,
			approvals: data.approvals,
			runs: data.runs,
			decisions: data.decisions
		}).toEqual(beforeState);
	});

	it('rejects unknown commands and missing raw intent with agent API guidance', () => {
		expect(() =>
			buildAgentIntentInterpretationResponse(createData(), {
				command: 'unknown',
				rawIntent: 'Create a task.'
			})
		).toThrow(AgentControlPlaneApiError);

		expect(() =>
			buildAgentIntentInterpretationResponse(createData(), {
				command: 'interpret_intent'
			})
		).toThrow('rawIntent is required.');
	});
});
