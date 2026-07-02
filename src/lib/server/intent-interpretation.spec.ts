import { describe, expect, it } from 'vitest';
import { interpretIntent } from '$lib/server/intent-interpretation';
import type { ControlPlaneData, Goal, Project, Task } from '$lib/types/control-plane';

function createProject(overrides: Partial<Project> = {}): Project {
	return {
		id: 'project_ams',
		name: 'AMS Prototype',
		summary: 'Agent Management System prototype.',
		projectBrief: 'Keep AMS centered on durable structured state.',
		constraints: 'Reuse existing Goal, Task, Run, Review, Approval, and Decision concepts.',
		nonGoals: 'Do not add duplicate planning systems.',
		approvalRequirements: 'Use explicit approval for external-state changes.',
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
		successSignal: 'Operators can review assumptions and candidate mappings first.',
		projectIds: ['project_ams'],
		taskIds: [],
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
		runCount: 0,
		latestRunId: null,
		closeoutState: null,
		artifactPath: '/tmp/ams/agent_output',
		attachments: [],
		createdAt: '2026-06-29T00:00:00.000Z',
		updatedAt: '2026-06-29T00:00:00.000Z',
		...overrides
	};
}

function baseData(): ControlPlaneData {
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
		runs: [],
		reviews: [],
		planningSessions: [],
		approvals: [],
		decisions: []
	};
}

describe('interpretIntent', () => {
	it('preserves ambiguous input and routes to clarification', () => {
		const proposal = interpretIntent({
			rawIntent: 'Fix this thing when you can.',
			data: { ...baseData(), projects: [], goals: [], tasks: [] }
		});

		expect(proposal.source.rawIntent).toBe('Fix this thing when you can.');
		expect(proposal.interpretation.statedIntent).toBe('Fix this thing when you can.');
		expect(proposal.routing.recommendedNextAction).toBe('ask_clarification');
		expect(proposal.routing.workPacketMode).toBe('clarification');
		expect(proposal.interpretation.openQuestions[0]?.question).toContain(
			'Which existing AMS object'
		);
		expect(proposal.candidateMappings.candidateTasks).toHaveLength(0);
	});

	it('proposes an execution-ready task without creating one', () => {
		const data = baseData();
		const beforeTaskCount = data.tasks.length;
		const proposal = interpretIntent({
			rawIntent:
				'Implement the read-only intent helper with focused tests. Validate with the helper spec.',
			context: { projectId: 'project_ams', goalId: 'goal_intent' },
			data
		});

		expect(proposal.routing.recommendedNextAction).toBe('create_task');
		expect(proposal.routing.readinessLevel).toBe('R3_EXECUTABLE');
		expect(proposal.routing.workPacketMode).toBe('executor');
		expect(proposal.candidateMappings.candidateTasks[0]).toMatchObject({
			projectId: 'project_ams',
			goalId: 'goal_intent',
			readinessLevel: 'R3_EXECUTABLE',
			reviewRequirement: 'SUMMARY_REVIEW'
		});
		expect(data.tasks).toHaveLength(beforeTaskCount);
	});

	it('routes uncertainty reduction to research mode', () => {
		const proposal = interpretIntent({
			rawIntent:
				'Research whether the manifest should expose intent interpretation and compare the existing goal-loop helpers.',
			context: { projectId: 'project_ams', goalId: 'goal_intent' },
			data: baseData()
		});

		expect(proposal.routing.recommendedNextAction).toBe('research');
		expect(proposal.routing.workPacketMode).toBe('research');
		expect(proposal.candidateMappings.candidateTasks[0]?.title).toContain('Research');
		expect(proposal.candidateMappings.candidateBlockers[0]?.recommendedResolution).toBe('research');
	});

	it('keeps clarification-needed input out of candidate mutations', () => {
		const proposal = interpretIntent({
			rawIntent: 'Maybe update it, but I am not sure what the acceptance criteria should be.',
			data: { ...baseData(), projects: [], goals: [], tasks: [] }
		});

		expect(proposal.routing.recommendedNextAction).toBe('ask_clarification');
		expect(proposal.interpretation.uncertainties.length).toBeGreaterThan(0);
		expect(proposal.candidateMappings.candidateTasks).toEqual([]);
		expect(proposal.reviewState.status).toBe('draft');
	});

	it('routes approval-gated input to approval with decision and blocker proposals', () => {
		const proposal = interpretIntent({
			rawIntent:
				'Deploy this to production after deleting the old data; get approval before applying.',
			context: { projectId: 'project_ams', goalId: 'goal_intent', taskId: 'task_existing' },
			data: baseData()
		});

		expect(proposal.routing.recommendedNextAction).toBe('request_approval');
		expect(proposal.routing.reviewRequirement).toBe('EXPLICIT_APPROVAL_REQUIRED');
		expect(proposal.routing.riskLevel).toBe('high');
		expect(proposal.candidateMappings.candidateDecisions[0]?.decisionNeeded).toContain('approve');
		expect(proposal.candidateMappings.candidateBlockers).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					blockedEntityKind: 'approval',
					recommendedResolution: 'request_approval'
				})
			])
		);
	});

	it('returns a minimal bounded draft with empty context', () => {
		const proposal = interpretIntent({ rawIntent: '', data: baseData() });

		expect(proposal.source.rawIntent).toBe('');
		expect(proposal.routing.recommendedNextAction).toBe('no_action');
		expect(proposal.routing.readinessLevel).toBe('R0_IDEA');
		expect(proposal.interpretation.openQuestions[0]?.question).toContain('What intent');
		expect(proposal.safety.readOnly).toBe(true);
	});

	it('does not mutate supplied control-plane data', () => {
		const data = baseData();
		const before = structuredClone(data);

		const proposal = interpretIntent({
			rawIntent:
				'Create a task to implement a bounded intent interpretation helper. Validate with tests.',
			context: { projectId: 'project_ams', goalId: 'goal_intent' },
			data
		});

		expect(proposal.safety).toMatchObject({ readOnly: true, mutationCount: 0 });
		expect(data).toEqual(before);
	});
});
