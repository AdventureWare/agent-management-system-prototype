import { describe, expect, it } from 'vitest';
import {
	buildProjectTaskIdeationPrompt,
	buildProjectTaskIdeationThreadName,
	findProjectForTaskIdeationThread,
	findProjectTaskIdeationThread,
	getProjectTaskIdeationWorkspace,
	parseIdeationTaskSuggestions
} from './task-ideation';
import type { AgentSessionDetail } from '$lib/types/agent-session';
import type { ControlPlaneData, Project } from '$lib/types/control-plane';

function buildProject(overrides: Partial<Project> = {}): Project {
	return {
		id: 'project_ams',
		name: 'Agent Management System Prototype',
		summary: 'A control plane for queued agent work.',
		projectRootFolder: '/workspace/ams',
		defaultArtifactRoot: '/workspace/ams/agent_output',
		defaultRepoPath: '/workspace/ams',
		defaultRepoUrl: 'git@github.com:example/ams.git',
		defaultBranch: 'main',
		...overrides
	};
}

function buildFixture(): ControlPlaneData {
	return {
		providers: [],
		roles: [],
		projects: [
			buildProject(),
			buildProject({
				id: 'project_kwipoo',
				name: 'Kwipoo',
				summary: 'Product work in a separate codebase.',
				projectRootFolder: '/workspace/kwipoo',
				defaultArtifactRoot: '/workspace/kwipoo/agent_output',
				defaultRepoPath: '/workspace/kwipoo',
				defaultRepoUrl: '',
				defaultBranch: 'main'
			})
		],
		goals: [
			{
				id: 'goal_1',
				name: 'Improve operator workflow',
				lane: 'product',
				status: 'running',
				summary: 'Make task execution easier to manage.',
				artifactPath: '/workspace/ams/agent_output'
			}
		],
		workers: [],
		tasks: [
			{
				id: 'task_active',
				title: 'Add task board filtering',
				summary: 'Improve how operators narrow a large queue.',
				projectId: 'project_ams',
				lane: 'product',
				goalId: 'goal_1',
				priority: 'high',
				status: 'in_progress',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: true,
				desiredRoleId: 'role_product',
				assigneeWorkerId: null,
				agentThreadId: 'session_thread',
				blockedReason: '',
				dependencyTaskIds: [],
				runCount: 2,
				latestRunId: 'run_active',
				artifactPath: '/workspace/ams/agent_output',
				attachments: [],
				createdAt: '2026-03-28T10:00:00.000Z',
				updatedAt: '2026-03-30T10:00:00.000Z'
			},
			{
				id: 'task_done',
				title: 'Add project detail page',
				summary: 'Ship the first project drill-down view.',
				projectId: 'project_ams',
				lane: 'product',
				goalId: '',
				priority: 'medium',
				status: 'done',
				riskLevel: 'low',
				approvalMode: 'none',
				requiresReview: false,
				desiredRoleId: 'role_product',
				assigneeWorkerId: null,
				agentThreadId: null,
				blockedReason: '',
				dependencyTaskIds: [],
				runCount: 1,
				latestRunId: 'run_done',
				artifactPath: '/workspace/ams/agent_output',
				attachments: [],
				createdAt: '2026-03-20T10:00:00.000Z',
				updatedAt: '2026-03-24T10:00:00.000Z'
			},
			{
				id: 'task_other_project',
				title: 'Export user data',
				summary: 'Plan data export for the product.',
				projectId: 'project_kwipoo',
				lane: 'product',
				goalId: '',
				priority: 'high',
				status: 'ready',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: true,
				desiredRoleId: 'role_product',
				assigneeWorkerId: null,
				agentThreadId: null,
				blockedReason: '',
				dependencyTaskIds: [],
				runCount: 0,
				latestRunId: null,
				artifactPath: '/workspace/kwipoo/agent_output',
				attachments: [],
				createdAt: '2026-03-29T10:00:00.000Z',
				updatedAt: '2026-03-29T10:00:00.000Z'
			}
		],
		runs: [
			{
				id: 'run_active',
				taskId: 'task_active',
				workerId: null,
				providerId: null,
				status: 'running',
				createdAt: '2026-03-30T10:00:00.000Z',
				updatedAt: '2026-03-30T10:30:00.000Z',
				startedAt: '2026-03-30T10:00:00.000Z',
				endedAt: null,
				threadId: 'thread_active',
				agentThreadId: 'session_thread',
				promptDigest: 'active123',
				artifactPaths: ['/workspace/ams/agent_output'],
				summary: 'Currently improving queue filtering.',
				lastHeartbeatAt: '2026-03-30T10:20:00.000Z',
				errorSummary: ''
			},
			{
				id: 'run_done',
				taskId: 'task_done',
				workerId: null,
				providerId: null,
				status: 'completed',
				createdAt: '2026-03-24T10:00:00.000Z',
				updatedAt: '2026-03-24T12:00:00.000Z',
				startedAt: '2026-03-24T10:00:00.000Z',
				endedAt: '2026-03-24T12:00:00.000Z',
				threadId: 'thread_done',
				agentThreadId: 'session_done',
				promptDigest: 'done123',
				artifactPaths: ['/workspace/ams/agent_output'],
				summary: 'Finished the project detail page.',
				lastHeartbeatAt: '2026-03-24T11:30:00.000Z',
				errorSummary: ''
			}
		],
		reviews: [],
		approvals: []
	};
}

function buildSession(overrides: Partial<AgentSessionDetail> = {}): AgentSessionDetail {
	return {
		id: 'session_thread',
		name: buildProjectTaskIdeationThreadName('Agent Management System Prototype'),
		cwd: '/workspace/ams',
		sandbox: 'workspace-write',
		model: null,
		threadId: 'thread_1',
		archivedAt: null,
		createdAt: '2026-03-30T09:00:00.000Z',
		updatedAt: '2026-03-30T10:00:00.000Z',
		origin: 'managed',
		sessionState: 'ready',
		latestRunStatus: 'completed',
		hasActiveRun: false,
		canResume: true,
		runCount: 1,
		lastActivityAt: '2026-03-30T10:00:00.000Z',
		lastActivityLabel: 'just now',
		sessionSummary: 'Suggested the next tasks for the queue.',
		lastExitCode: 0,
		runTimeline: [],
		relatedTasks: [],
		latestRun: null,
		runs: [],
		...overrides
	};
}

describe('task ideation helpers', () => {
	it('builds a prompt with project context and task history', () => {
		const prompt = buildProjectTaskIdeationPrompt({
			data: buildFixture(),
			project: buildProject()
		});

		expect(prompt).toContain('You are the task ideation assistant');
		expect(prompt).toContain('Agent Management System Prototype');
		expect(prompt).toContain('Kwipoo');
		expect(prompt).toContain('Add task board filtering');
		expect(prompt).toContain('Add project detail page');
		expect(prompt).toContain('Status counts: In Progress 1, Done 1');
		expect(prompt).toContain('Suggested instructions: <copy-ready task brief>');
		expect(prompt).not.toContain('Export user data (');
	});

	it('prefers the configured workspace root over fallback paths', () => {
		expect(getProjectTaskIdeationWorkspace(buildProject())).toBe('/workspace/ams');
		expect(
			getProjectTaskIdeationWorkspace(
				buildProject({
					projectRootFolder: '',
					defaultRepoPath: '/workspace/ams-repo'
				})
			)
		).toBe('/workspace/ams-repo');
	});

	it('finds the latest matching ideation thread for a project', () => {
		const project = buildProject();
		const sessions = [
			buildSession({
				id: 'session_old',
				updatedAt: '2026-03-29T10:00:00.000Z'
			}),
			buildSession({
				id: 'session_new',
				updatedAt: '2026-03-30T10:00:00.000Z'
			}),
			buildSession({
				id: 'session_wrong_name',
				name: 'Work thread: Agent Management System Prototype',
				updatedAt: '2026-03-31T10:00:00.000Z'
			}),
			buildSession({
				id: 'session_wrong_path',
				cwd: '/workspace/other',
				updatedAt: '2026-03-31T10:00:00.000Z'
			})
		];

		expect(findProjectTaskIdeationThread(project, sessions)?.id).toBe('session_new');
	});

	it('maps an ideation thread back to its project and parses saved suggestions', () => {
		const project = buildProject();
		const session = buildSession({
			latestRun: {
				id: 'run_1',
				sessionId: 'session_thread',
				mode: 'start',
				prompt: 'prompt',
				requestedThreadId: null,
				createdAt: '2026-03-30T09:00:00.000Z',
				updatedAt: '2026-03-30T10:00:00.000Z',
				logPath: '/tmp/log',
				statePath: '/tmp/state',
				messagePath: '/tmp/message',
				configPath: '/tmp/config',
				state: {
					status: 'completed',
					pid: null,
					startedAt: '2026-03-30T09:00:00.000Z',
					finishedAt: '2026-03-30T10:00:00.000Z',
					exitCode: 0,
					signal: null,
					codexThreadId: 'thread_1'
				},
				lastMessage: `Gaps noticed

- Operators can run ideation but still have to retype every task.

Suggested tasks

Title: Create draft tasks directly from ideation output
Why it matters: The operator should be able to turn vetted suggestions into queued work quickly.
Suggested instructions: Add a review flow on the task board that parses ideation output and creates selected tasks as drafts.
Signals from history/context: The existing task board only links back to the ideation thread after a run finishes.
Confidence: high

Title: Show routing defaults beside ideation suggestions
Why it matters: Operators need to know where new drafts will land before creating them.
Suggested instructions: Display the target project, default role, and artifact root beside each parsed suggestion.
Signals from history/context: Task creation already derives default routing from the selected project and coordinator role.
Confidence: medium`,
				logTail: [],
				activityAt: '2026-03-30T10:00:00.000Z'
			},
			runs: []
		});

		expect(findProjectForTaskIdeationThread(session, buildFixture().projects)?.id).toBe(project.id);
		expect(parseIdeationTaskSuggestions(session.latestRun?.lastMessage ?? '')).toEqual([
			{
				index: 0,
				title: 'Create draft tasks directly from ideation output',
				whyItMatters:
					'The operator should be able to turn vetted suggestions into queued work quickly.',
				suggestedInstructions:
					'Add a review flow on the task board that parses ideation output and creates selected tasks as drafts.',
				signals:
					'The existing task board only links back to the ideation thread after a run finishes.',
				confidence: 'high'
			},
			{
				index: 1,
				title: 'Show routing defaults beside ideation suggestions',
				whyItMatters: 'Operators need to know where new drafts will land before creating them.',
				suggestedInstructions:
					'Display the target project, default role, and artifact root beside each parsed suggestion.',
				signals:
					'Task creation already derives default routing from the selected project and coordinator role.',
				confidence: 'medium'
			}
		]);
	});
});
