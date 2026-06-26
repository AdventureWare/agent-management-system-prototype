import { describe, expect, it } from 'vitest';
import {
	buildExecutorPrompt,
	buildPlannerPrompt,
	buildResearchPrompt,
	buildReviewerPrompt
} from '$lib/workflow-prompts';
import type { Goal, Project, Review, Run, Task } from '$lib/types/control-plane';

const project: Project = {
	id: 'project_ams',
	name: 'AMS',
	summary: 'Agent management prototype.',
	projectBrief: 'Coordinate human-reviewed agent work.',
	currentStateMemo: 'The system has tasks, runs, reviews, and project memory.',
	decisionLog: 'Reuse existing task and run concepts.',
	agentInstructionsPath: 'AGENTS.md',
	setupNotes: '',
	validationCommands: ['npm run check', 'npm run test:unit -- --run'],
	codingConventions: 'Follow existing SvelteKit patterns.',
	approvalRequirements: 'Human review before completion.',
	defaultAllowedActions: ['read files', 'edit workspace files', 'run tests'],
	defaultDisallowedActions: ['deploy', 'delete data'],
	defaultAutonomyLevel: 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE',
	defaultRiskThreshold: 'medium',
	defaultReviewRequirement: 'SUMMARY_REVIEW',
	defaultRigorProfile: 'INTERNAL',
	defaultValidationExpectations: 'Run the smallest relevant checks.',
	importantLinks: ['docs/autonomous-progress-loop-v0-audit.md'],
	constraints: 'Do not create duplicate workflow systems.',
	nonGoals: 'No unattended execution in v0.',
	projectRootFolder: '/repo',
	defaultArtifactRoot: '/repo/agent_output',
	defaultRepoPath: '/repo',
	defaultRepoUrl: '',
	defaultBranch: 'main'
};

const task: Task = {
	id: 'task_workflow_prompts',
	title: 'Create planner executor reviewer workflow',
	summary: 'Add minimal workflow prompt scaffolding.',
	successCriteria: 'Prompts exist and include safety boundaries.',
	readyCondition: 'Audit has been read.',
	expectedOutcome: 'Users can prepare planner, executor, and reviewer prompts.',
	scope: 'Prompt generation and copyable UI affordances.',
	nonGoals: 'No unattended Codex launch automation.',
	validationSteps: 'Run unit tests and svelte-check.',
	rigorProfile: 'PROTOTYPE',
	readinessLevel: 'R3_EXECUTABLE',
	autonomyLevel: 'A3_AGENT_MAY_EDIT_IN_ISOLATED_BRANCH_OR_WORKTREE',
	allowedActionNames: ['read files', 'edit workspace files', 'run tests'],
	reviewRequirement: 'SUMMARY_REVIEW',
	projectId: project.id,
	area: 'product',
	goalId: 'goal_loop',
	priority: 'high',
	status: 'ready',
	riskLevel: 'low',
	approvalMode: 'none',
	requiresReview: true,
	desiredRoleId: '',
	assigneeExecutionSurfaceId: null,
	agentThreadId: null,
	requiredPromptSkillNames: ['ams-control-plane-operations'],
	requiredCapabilityNames: ['sveltekit'],
	requiredToolNames: ['vitest'],
	blockedReason: '',
	dependencyTaskIds: [],
	runCount: 1,
	latestRunId: 'run_1',
	artifactPath: '',
	attachments: [],
	createdAt: '2026-06-25T00:00:00.000Z',
	updatedAt: '2026-06-25T00:00:00.000Z'
};

const goal: Goal = {
	id: 'goal_loop',
	name: 'Autonomous Progress Loop v0',
	area: 'product',
	status: 'running',
	summary: 'Prepare safe agent-driven work loops.',
	successSignal: 'Human-reviewed planner, executor, and reviewer flows exist.',
	artifactPath: ''
};

const run: Run = {
	id: 'run_1',
	taskId: task.id,
	executionSurfaceId: null,
	providerId: null,
	status: 'completed',
	createdAt: '2026-06-25T00:00:00.000Z',
	updatedAt: '2026-06-25T01:00:00.000Z',
	startedAt: '2026-06-25T00:10:00.000Z',
	endedAt: '2026-06-25T00:50:00.000Z',
	threadId: 'thread_1',
	agentThreadId: 'thread_1',
	promptDigest: 'digest',
	artifactPaths: ['/repo/agent_output/workflow.md'],
	summary: 'Implemented prompt scaffolding.',
	lastHeartbeatAt: null,
	errorSummary: ''
};

const review: Review = {
	id: 'review_1',
	taskId: task.id,
	runId: run.id,
	status: 'open',
	createdAt: '2026-06-25T01:00:00.000Z',
	updatedAt: '2026-06-25T01:00:00.000Z',
	resolvedAt: null,
	requestedByExecutionSurfaceId: null,
	reviewerExecutionSurfaceId: null,
	summary: 'Ready for review.'
};

describe('workflow prompts', () => {
	it('builds planner prompts with project memory, tasks, outputs, and safety boundaries', () => {
		const prompt = buildPlannerPrompt({ project, goals: [goal], tasks: [task] });

		expect(prompt).toContain('# Planner Mode Work Packet');
		expect(prompt).toContain('Project brief:');
		expect(prompt).toContain('Proposed next tasks');
		expect(prompt).toContain('Create planner executor reviewer workflow');
		expect(prompt).toContain('Planner mode is not permission to edit code');
	});

	it('builds executor prompts with task metadata, validation, allowed actions, and stopping conditions', () => {
		const prompt = buildExecutorPrompt({ project, task, goal, recentRuns: [run] });

		expect(prompt).toContain('# Executor Mode Work Packet');
		expect(prompt).toContain(
			'Expected outcome: Users can prepare planner, executor, and reviewer prompts.'
		);
		expect(prompt).toContain('Validation steps:');
		expect(prompt).toContain('Effective rigor profile: Prototype (PROTOTYPE)');
		expect(prompt).toContain('- read files');
		expect(prompt).toContain('Stopping Conditions');
	});

	it('builds research prompts that reduce uncertainty without implementation changes', () => {
		const prompt = buildResearchPrompt({ project, task, goal });

		expect(prompt).toContain('# Research Mode Work Packet');
		expect(prompt).toContain('Do not make implementation changes');
		expect(prompt).toContain('Findings that answer the uncertainty or blocker');
		expect(prompt).toContain('Recommended next task mode');
	});

	it('builds reviewer prompts with run evidence and accept/reject/needs-revision decision request', () => {
		const prompt = buildReviewerPrompt({ project, task, run, review });

		expect(prompt).toContain('# Reviewer Mode Work Packet');
		expect(prompt).toContain('Run: run_1');
		expect(prompt).toContain('Artifacts: /repo/agent_output/workflow.md');
		expect(prompt).toContain('Decision: accept, reject, or needs revision');
		expect(prompt).toContain('Do not accept work when acceptance criteria');
	});
});
