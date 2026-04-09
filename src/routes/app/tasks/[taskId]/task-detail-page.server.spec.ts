import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';
import type { RetrievedSelfImprovementKnowledgeItem } from '$lib/types/self-improvement';

const existsSync = vi.hoisted(() => vi.fn(() => true));

const { mkdir, writeFile } = vi.hoisted(() => ({
	mkdir: vi.fn(),
	writeFile: vi.fn()
}));

const createRun = vi.hoisted(() =>
	vi.fn(
		(input: {
			taskId: string;
			executionSurfaceId: string | null;
			providerId: string | null;
			status: string;
			threadId: string | null;
			agentThreadId: string | null;
			promptDigest: string;
			artifactPaths: string[];
			summary: string;
			lastHeartbeatAt: string;
			startedAt: string;
		}) => ({
			id: 'run_test',
			taskId: input.taskId,
			executionSurfaceId: input.executionSurfaceId,
			providerId: input.providerId,
			status: input.status,
			createdAt: input.startedAt,
			updatedAt: input.startedAt,
			startedAt: input.startedAt,
			endedAt: null,
			threadId: input.threadId,
			agentThreadId: input.agentThreadId,
			promptDigest: input.promptDigest,
			artifactPaths: input.artifactPaths,
			summary: input.summary,
			lastHeartbeatAt: input.lastHeartbeatAt,
			errorSummary: ''
		})
	)
);
const createTaskState = vi.hoisted(() => ({ nextId: 1 }));
const createTask = vi.hoisted(() =>
	vi.fn(
		(input: {
			title: string;
			summary: string;
			successCriteria?: string;
			readyCondition?: string;
			expectedOutcome?: string;
			projectId: string;
			area?: string;
			goalId: string;
			parentTaskId?: string | null;
			delegationPacket?: {
				objective: string;
				inputContext: string;
				expectedDeliverable: string;
				doneCondition: string;
				integrationNotes: string;
			} | null;
			delegationAcceptance?: {
				summary: string;
				acceptedAt: string;
			} | null;
			priority: string;
			status?: string;
			riskLevel: string;
			approvalMode: string;
			requiredThreadSandbox?: string | null;
			requiresReview: boolean;
			desiredRoleId: string;
			requiredPromptSkillNames?: string[];
			requiredCapabilityNames?: string[];
			requiredToolNames?: string[];
			blockedReason?: string;
			dependencyTaskIds?: string[];
			targetDate?: string | null;
			artifactPath: string;
		}) => ({
			id: `task_created_${createTaskState.nextId++}`,
			title: input.title,
			summary: input.summary,
			successCriteria: input.successCriteria ?? '',
			readyCondition: input.readyCondition ?? '',
			expectedOutcome: input.expectedOutcome ?? '',
			projectId: input.projectId,
			area: input.area ?? 'product',
			goalId: input.goalId,
			parentTaskId: input.parentTaskId ?? null,
			delegationPacket: input.delegationPacket ?? null,
			delegationAcceptance: input.delegationAcceptance ?? null,
			priority: input.priority,
			status: input.status ?? 'ready',
			riskLevel: input.riskLevel,
			approvalMode: input.approvalMode,
			requiredThreadSandbox: input.requiredThreadSandbox ?? null,
			requiresReview: input.requiresReview,
			desiredRoleId: input.desiredRoleId,
			assigneeExecutionSurfaceId: null,
			agentThreadId: null,
			requiredPromptSkillNames: input.requiredPromptSkillNames ?? [],
			requiredCapabilityNames: input.requiredCapabilityNames ?? [],
			requiredToolNames: input.requiredToolNames ?? [],
			blockedReason: input.blockedReason ?? '',
			dependencyTaskIds: input.dependencyTaskIds ?? [],
			targetDate: input.targetDate ?? null,
			runCount: 0,
			latestRunId: null,
			artifactPath: input.artifactPath,
			attachments: [],
			createdAt: '2026-03-30T12:00:00.000Z',
			updatedAt: '2026-03-30T12:00:00.000Z'
		})
	)
);

const projectMatchesPath = vi.hoisted(() => vi.fn(() => true));
const getWorkspaceExecutionIssue = vi.hoisted(() =>
	vi.fn<
		(_: {
			cwd: string;
			additionalWritableRoots?: string[];
			sandbox: string;
			scopeLabel?: string;
		}) => string | null
	>(() => null)
);
const getAgentThread = vi.hoisted(() => vi.fn());
const recoverAgentThread = vi.hoisted(() => vi.fn());
const sendAgentThreadMessage = vi.hoisted(() => vi.fn());
const loadRelevantSelfImprovementKnowledgeItems = vi.hoisted(() =>
	vi.fn<() => Promise<RetrievedSelfImprovementKnowledgeItem[]>>(async () => [])
);
const startAgentThread = vi.hoisted(() =>
	vi.fn(async () => ({
		agentThreadId: 'session_new',
		runId: 'run_new'
	}))
);
const listInstalledCodexSkills = vi.hoisted(() =>
	vi.fn(() => [
		{
			id: 'skill-installer',
			description: 'Install Codex skills',
			global: true,
			project: false,
			sourceLabel: 'Global'
		}
	])
);
const buildTaskThreadPromptMock = vi.hoisted(() => vi.fn(() => 'run the task'));

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
				agentThreadId: task.agentThreadId,
				runCount: taskRuns.length,
				latestRunId: taskRuns[0]?.id ?? null
			};
		})
	};
}

vi.mock('node:fs', () => ({
	existsSync
}));

vi.mock('node:fs/promises', () => ({
	mkdir,
	writeFile
}));

vi.mock('$lib/server/control-plane', () => ({
	createDecision: vi.fn(
		(input: {
			taskId?: string | null;
			decisionType: string;
			summary: string;
			createdAt?: string;
		}) => ({
			id: 'decision_test',
			taskId: input.taskId ?? null,
			goalId: null,
			runId: null,
			reviewId: null,
			approvalId: null,
			planningSessionId: null,
			decisionType: input.decisionType,
			summary: input.summary,
			createdAt: input.createdAt ?? '2026-03-30T12:00:00.000Z',
			decidedByExecutionSurfaceId: null
		})
	),
	createTask,
	createTaskAttachmentId: vi.fn(() => 'attachment_test'),
	createRun,
	deleteTask: vi.fn(),
	formatRelativeTime: vi.fn(() => 'just now'),
	getOpenReviewForTask: vi.fn(() => null),
	getPendingApprovalForTask: vi.fn(() => null),
	loadControlPlane: vi.fn(async () => controlPlaneState.current),
	parseTaskStatus: vi.fn((_value: string, fallback: string) => fallback),
	projectMatchesPath,
	resolveThreadSandbox: vi.fn(
		(input: {
			task?: { requiredThreadSandbox?: string | null } | null;
			executionSurface?: { threadSandboxOverride: string | null } | null;
			project?: { defaultThreadSandbox?: string | null } | null;
			provider?: { defaultThreadSandbox: string } | null;
		}) =>
			input.task?.requiredThreadSandbox ??
			input.executionSurface?.threadSandboxOverride ??
			input.project?.defaultThreadSandbox ??
			input.provider?.defaultThreadSandbox ??
			'workspace-write'
	),
	selectExecutionProvider: vi.fn(
		(data: ControlPlaneData, executionSurface?: { providerId: string } | null) =>
			(executionSurface?.providerId
				? data.providers.find((provider) => provider.id === executionSurface.providerId)
				: null) ??
			data.providers.find((provider) => provider.kind === 'local' && provider.enabled) ??
			data.providers[0] ??
			null
	),
	getExecutionSurfaces: vi.fn(
		(data: Pick<ControlPlaneData, 'executionSurfaces' | 'executionSurfaces'>) =>
			data.executionSurfaces ?? data.executionSurfaces
	),
	updateControlPlane: vi.fn(async (updater: (data: ControlPlaneData) => ControlPlaneData) => {
		controlPlaneState.saved = syncTaskExecutionStateLike(
			updater(controlPlaneState.current as ControlPlaneData)
		);
		controlPlaneState.current = controlPlaneState.saved;
		return controlPlaneState.saved;
	})
}));

vi.mock('$lib/server/agent-threads', () => ({
	cancelAgentThread: vi.fn(),
	getAgentThread,
	listAgentThreads: vi.fn(async () => []),
	recoverAgentThread,
	sendAgentThreadMessage,
	startAgentThread
}));

vi.mock('$lib/server/task-threads', () => ({
	buildPromptDigest: vi.fn(() => 'digest_test'),
	buildTaskThreadName: vi.fn(
		(input: { projectName: string; taskName: string; taskId: string }) =>
			`Task thread · ${input.taskName} · ${input.projectName} · ${input.taskId}`
	),
	buildTaskThreadPrompt: buildTaskThreadPromptMock
}));

vi.mock('$lib/server/codex-skills', () => ({
	listInstalledCodexSkills
}));

vi.mock('$lib/server/self-improvement-knowledge', () => ({
	loadRelevantSelfImprovementKnowledgeItems
}));

vi.mock('$lib/server/task-execution-workspace', () => ({
	getWorkspaceExecutionIssue
}));

vi.mock('$lib/task-thread-context', () => ({
	isActiveTaskThread: vi.fn((thread: { threadState?: string } | null | undefined) =>
		Boolean(thread && ['starting', 'waiting', 'working'].includes(thread.threadState ?? ''))
	),
	selectTaskThreadContext: vi.fn(
		(input: {
			assignedThread: { id: string; threadState?: string } | null;
			latestRunThread: { id: string; threadState?: string } | null;
		}) => {
			const isActive = (thread: { threadState?: string } | null | undefined) =>
				Boolean(thread && ['starting', 'waiting', 'working'].includes(thread.threadState ?? ''));
			const statusThread =
				[input.assignedThread, input.latestRunThread].find((thread) => isActive(thread)) ??
				input.assignedThread ??
				input.latestRunThread ??
				null;

			return {
				assignedThread: input.assignedThread,
				latestRunThread: input.latestRunThread,
				statusThread,
				linkThread: statusThread,
				linkThreadKind: statusThread
					? statusThread.id === input.assignedThread?.id
						? 'assigned'
						: 'latest'
					: null
			};
		}
	)
}));

import { actions } from './+page.server';

describe('task detail page server actions', () => {
	beforeEach(() => {
		existsSync.mockReset();
		existsSync.mockReturnValue(true);
		mkdir.mockReset();
		writeFile.mockReset();
		createTaskState.nextId = 1;
		createTask.mockClear();
		createRun.mockClear();
		projectMatchesPath.mockReset();
		projectMatchesPath.mockReturnValue(true);
		getWorkspaceExecutionIssue.mockReset();
		getWorkspaceExecutionIssue.mockReturnValue(null);
		getAgentThread.mockReset();
		getAgentThread.mockResolvedValue(null);
		recoverAgentThread.mockReset();
		sendAgentThreadMessage.mockReset();
		loadRelevantSelfImprovementKnowledgeItems.mockReset();
		loadRelevantSelfImprovementKnowledgeItems.mockResolvedValue([]);
		startAgentThread.mockReset();
		buildTaskThreadPromptMock.mockClear();
		listInstalledCodexSkills.mockClear();
		startAgentThread.mockResolvedValue({
			agentThreadId: 'session_new',
			runId: 'run_new'
		});
		controlPlaneState.current = {
			providers: [
				{
					id: 'provider_local_codex',
					name: 'Local Codex ExecutionSurface',
					service: 'OpenAI',
					kind: 'local',
					description: 'local',
					enabled: true,
					setupStatus: 'connected',
					authMode: 'local_cli',
					defaultModel: '',
					baseUrl: '',
					launcher: 'codex',
					envVars: [],
					capabilities: [],
					defaultThreadSandbox: 'workspace-write',
					notes: ''
				}
			],
			roles: [
				{
					id: 'role_coordinator',
					name: 'Coordinator',
					area: 'shared',
					description: 'Coordinates task execution'
				},
				{
					id: 'role_reviewer',
					name: 'Reviewer',
					area: 'product',
					description: 'Reviews and governs higher-risk work'
				}
			],
			projects: [
				{
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				}
			],
			goals: [
				{
					id: 'goal_launch',
					name: 'Improve goal UX',
					area: 'product',
					status: 'running',
					summary: 'Make goal creation clearer and more useful.',
					artifactPath: '/tmp/project/agent_output/goals',
					parentGoalId: null,
					projectIds: ['project_1'],
					taskIds: [],
					targetDate: null
				}
			],
			executionSurfaces: [],
			tasks: [
				{
					id: 'task_1',
					title: 'Attach a brief',
					summary: 'Need source documents',
					projectId: 'project_1',
					area: 'product',
					goalId: '',
					priority: 'medium',
					status: 'ready',
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
					latestRunId: null,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z'
				}
			],
			runs: [],
			reviews: [],
			approvals: []
		};
		controlPlaneState.saved = null;
	});

	it('updates the task target date from the detail form', async () => {
		const form = new FormData();
		form.set('name', 'Attach a brief');
		form.set('instructions', 'Need source documents');
		form.set('projectId', 'project_1');
		form.set('targetDate', '2026-04-22');

		const result = await actions.updateTask({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'updateTask',
				taskId: 'task_1'
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				targetDate: '2026-04-22'
			})
		);
		expect(controlPlaneState.saved?.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_1',
				decisionType: 'task_plan_updated'
			})
		);
	});

	it('updates the task sandbox requirement from the detail form', async () => {
		const form = new FormData();
		form.set('name', 'Attach a brief');
		form.set('instructions', 'Need source documents');
		form.set('projectId', 'project_1');
		form.set('requiredThreadSandbox', 'danger-full-access');

		const result = await actions.updateTask({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'updateTask',
				taskId: 'task_1'
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				requiredThreadSandbox: 'danger-full-access'
			})
		);
		expect(controlPlaneState.saved?.decisions?.[0]?.summary).toContain(
			'Danger Full Access sandbox'
		);
	});

	it('updates the task goal link from the detail form', async () => {
		const form = new FormData();
		form.set('name', 'Attach a brief');
		form.set('instructions', 'Need source documents');
		form.set('projectId', 'project_1');
		form.set('goalId', 'goal_launch');

		const result = await actions.updateTask({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'updateTask',
				taskId: 'task_1'
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				goalId: 'goal_launch'
			})
		);
		expect(controlPlaneState.saved?.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_1',
				decisionType: 'task_plan_updated',
				summary: expect.stringContaining('linked the task to goal "Improve goal UX"')
			})
		);
	});

	it('updates routing and governance fields from the detail form', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			tasks: [
				...(controlPlaneState.current as ControlPlaneData).tasks,
				{
					id: 'task_2',
					title: 'Unblock API contract',
					summary: 'Finalize the downstream API shape',
					projectId: 'project_1',
					area: 'product',
					goalId: '',
					priority: 'high',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeExecutionSurfaceId: null,
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					targetDate: null,
					runCount: 0,
					latestRunId: null,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z'
				}
			]
		};

		const form = new FormData();
		form.set('name', 'Attach a brief');
		form.set('instructions', 'Need source documents');
		form.set('projectId', 'project_1');
		form.set('priority', 'urgent');
		form.set('riskLevel', 'high');
		form.set('approvalMode', 'before_apply');
		form.set('requiresReview', 'false');
		form.set('desiredRoleId', 'role_reviewer');
		form.set('blockedReason', 'Waiting on API contract');
		form.set('dependencyTaskSelection', 'true');
		form.append('dependencyTaskIds', 'task_2');

		const result = await actions.updateTask({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'updateTask',
				taskId: 'task_1'
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				priority: 'urgent',
				riskLevel: 'high',
				approvalMode: 'before_apply',
				requiresReview: false,
				desiredRoleId: 'role_reviewer',
				blockedReason: 'Waiting on API contract',
				dependencyTaskIds: ['task_2']
			})
		);
		expect(controlPlaneState.saved?.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_1',
				decisionType: 'task_plan_updated',
				summary: expect.stringContaining('set priority to Urgent')
			})
		);
		expect(controlPlaneState.saved?.decisions?.[0]?.summary).toContain(
			'set approval mode to Before Apply'
		);
		expect(controlPlaneState.saved?.decisions?.[0]?.summary).toContain(
			'set desired role to Reviewer'
		);
		expect(controlPlaneState.saved?.decisions?.[0]?.summary).toContain('"Unblock API contract"');
	});

	it('accepts a completed child handoff into the parent task', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			tasks: [
				...(controlPlaneState.current as ControlPlaneData).tasks,
				{
					id: 'task_child',
					title: 'Delegated child task',
					summary: 'Produce the specialized handoff.',
					projectId: 'project_1',
					area: 'product',
					goalId: '',
					parentTaskId: 'task_1',
					delegationPacket: {
						objective: 'Own the specialized packet work.',
						inputContext: '',
						expectedDeliverable: 'A concrete child artifact.',
						doneCondition: 'The parent can accept the handoff.',
						integrationNotes: ''
					},
					priority: 'medium',
					status: 'done',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeExecutionSurfaceId: null,
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					targetDate: null,
					runCount: 0,
					latestRunId: null,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z'
				}
			]
		};

		const form = new FormData();
		form.set('childTaskId', 'task_child');

		const result = await actions.acceptChildHandoff({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'acceptChildHandoff',
				taskId: 'task_1',
				childTaskId: 'task_child'
			})
		);
		expect(controlPlaneState.saved?.tasks.find((task) => task.id === 'task_child')).toEqual(
			expect.objectContaining({
				delegationAcceptance: expect.objectContaining({
					summary: 'Accepted child handoff into parent task "Attach a brief".'
				})
			})
		);
		expect(controlPlaneState.saved?.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_child',
				decisionType: 'delegation_handoff_accepted'
			})
		);
	});

	it('requests follow-up on a child handoff and moves the child back into blocked state', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			tasks: [
				...(controlPlaneState.current as ControlPlaneData).tasks,
				{
					id: 'task_child',
					title: 'Delegated child task',
					summary: 'Produce the specialized handoff.',
					projectId: 'project_1',
					area: 'product',
					goalId: '',
					parentTaskId: 'task_1',
					delegationPacket: {
						objective: 'Own the specialized packet work.',
						inputContext: '',
						expectedDeliverable: 'A concrete child artifact.',
						doneCondition: 'The parent can accept the handoff.',
						integrationNotes: ''
					},
					priority: 'medium',
					status: 'done',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeExecutionSurfaceId: null,
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					targetDate: null,
					runCount: 0,
					latestRunId: null,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z'
				}
			]
		};

		const form = new FormData();
		form.set('childTaskId', 'task_child');

		const result = await actions.requestChildHandoffChanges({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'requestChildHandoffChanges',
				taskId: 'task_1',
				childTaskId: 'task_child'
			})
		);
		expect(controlPlaneState.saved?.tasks.find((task) => task.id === 'task_child')).toEqual(
			expect.objectContaining({
				status: 'blocked',
				blockedReason: 'Parent task requested follow-up before accepting this child handoff.',
				delegationAcceptance: null
			})
		);
		expect(controlPlaneState.saved?.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_child',
				decisionType: 'delegation_handoff_changes_requested'
			})
		);
	});

	it('decomposes a task into delegated child tasks within the fan-out limit', async () => {
		const form = new FormData();
		form.set('decompositionEnabled0', 'true');
		form.set('decompositionTitle0', 'Research current execution-surface constraints');
		form.set(
			'decompositionInstructions0',
			'Audit the current execution-surface capacity and concurrency constraints.'
		);
		form.set('decompositionDesiredRoleId0', 'role_reviewer');
		form.set(
			'decompositionObjective0',
			'Produce a bounded analysis of execution-surface constraints.'
		);
		form.set(
			'decompositionExpectedDeliverable0',
			'A short design note with the current limits and gaps.'
		);
		form.set(
			'decompositionDoneCondition0',
			'The parent can decide whether execution-surface routing changes are needed.'
		);
		form.set('decompositionEnabled1', 'true');
		form.set('decompositionTitle1', 'Draft orchestration UI copy');
		form.set(
			'decompositionInstructions1',
			'Prepare the copy needed for the operator-facing decomposition flow.'
		);
		form.set('decompositionDesiredRoleId1', 'role_coordinator');
		form.set('decompositionObjective1', 'Define the parent-facing orchestration prompts.');
		form.set(
			'decompositionExpectedDeliverable1',
			'UI-ready copy for decomposition labels and guidance.'
		);
		form.set(
			'decompositionDoneCondition1',
			'The parent can incorporate the copy without additional clarification.'
		);

		const result = await actions.decomposeTask({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'decomposeTask',
				taskId: 'task_1',
				createdChildCount: 2
			})
		);
		expect(controlPlaneState.saved?.tasks.filter((task) => task.parentTaskId === 'task_1')).toEqual(
			[
				expect.objectContaining({
					title: 'Research current execution-surface constraints',
					desiredRoleId: 'role_reviewer',
					parentTaskId: 'task_1',
					successCriteria:
						'The parent can decide whether execution-surface routing changes are needed.',
					expectedOutcome: 'A short design note with the current limits and gaps.',
					delegationPacket: expect.objectContaining({
						objective: 'Produce a bounded analysis of execution-surface constraints.',
						doneCondition:
							'The parent can decide whether execution-surface routing changes are needed.',
						inputContext: expect.stringContaining('Parent task: Attach a brief')
					})
				}),
				expect.objectContaining({
					title: 'Draft orchestration UI copy',
					desiredRoleId: 'role_coordinator',
					parentTaskId: 'task_1',
					delegationPacket: expect.objectContaining({
						objective: 'Define the parent-facing orchestration prompts.'
					})
				})
			]
		);
		expect(controlPlaneState.saved?.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_1',
				decisionType: 'task_decomposed',
				summary: expect.stringContaining('Research current execution-surface constraints')
			})
		);
	});

	it('rejects decomposition that would exceed the child fan-out limit', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			tasks: [
				...(controlPlaneState.current as ControlPlaneData).tasks,
				{
					id: 'task_child_a',
					title: 'Existing child A',
					summary: 'First delegated child task.',
					projectId: 'project_1',
					area: 'product',
					goalId: '',
					parentTaskId: 'task_1',
					priority: 'medium',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeExecutionSurfaceId: null,
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					targetDate: null,
					runCount: 0,
					latestRunId: null,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z'
				},
				{
					id: 'task_child_b',
					title: 'Existing child B',
					summary: 'Second delegated child task.',
					projectId: 'project_1',
					area: 'product',
					goalId: '',
					parentTaskId: 'task_1',
					priority: 'medium',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_reviewer',
					assigneeExecutionSurfaceId: null,
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					targetDate: null,
					runCount: 0,
					latestRunId: null,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z'
				}
			]
		};

		const form = new FormData();
		form.set('decompositionEnabled0', 'true');
		form.set('decompositionTitle0', 'Third child');
		form.set('decompositionInstructions0', 'Create the third child.');
		form.set('decompositionDesiredRoleId0', 'role_coordinator');
		form.set('decompositionObjective0', 'Own the third child outcome.');
		form.set('decompositionDoneCondition0', 'Third child is ready.');
		form.set('decompositionEnabled1', 'true');
		form.set('decompositionTitle1', 'Fourth child');
		form.set('decompositionInstructions1', 'Create the fourth child.');
		form.set('decompositionDesiredRoleId1', 'role_reviewer');
		form.set('decompositionObjective1', 'Own the fourth child outcome.');
		form.set('decompositionDoneCondition1', 'Fourth child is ready.');

		const result = await actions.decomposeTask({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toMatchObject({
			status: 409,
			data: {
				message: expect.stringContaining('fan-out limit is 3')
			}
		});
		expect(controlPlaneState.saved).toBeNull();
	});

	it('rejects an invalid task target date from the detail form', async () => {
		const form = new FormData();
		form.set('name', 'Attach a brief');
		form.set('instructions', 'Need source documents');
		form.set('projectId', 'project_1');
		form.set('targetDate', '04/22/2026');

		const result = await actions.updateTask({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: {
				message: 'Target date must use YYYY-MM-DD format.'
			}
		});
		expect(controlPlaneState.saved).toBeNull();
	});

	it('attaches an uploaded file to the task artifact area', async () => {
		const form = new FormData();
		form.set('attachment', new File(['hello task'], 'brief.md', { type: 'text/markdown' }));

		const result = await actions.attachTaskFile({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'attachTaskFile',
				taskId: 'task_1',
				attachmentId: 'attachment_test'
			})
		);
		expect(mkdir).toHaveBeenCalledWith('/tmp/project/agent_output/task-attachments/task_1', {
			recursive: true
		});
		expect(writeFile).toHaveBeenCalledWith(
			'/tmp/project/agent_output/task-attachments/task_1/attachment_test-brief.md',
			expect.any(Buffer)
		);
		expect(controlPlaneState.saved?.tasks[0]?.attachments).toEqual([
			expect.objectContaining({
				id: 'attachment_test',
				name: 'brief.md',
				path: '/tmp/project/agent_output/task-attachments/task_1/attachment_test-brief.md',
				contentType: 'text/markdown',
				sizeBytes: 10
			})
		]);
	});

	it('starts a fresh task thread when the assigned thread no longer matches the project', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			tasks: [
				{
					...(controlPlaneState.current as ControlPlaneData).tasks[0]!,
					agentThreadId: 'session_stale',
					latestRunId: 'run_previous'
				}
			]
		};
		projectMatchesPath.mockReturnValue(false);
		getAgentThread.mockResolvedValue({
			id: 'session_stale',
			name: 'Work thread: Wrong Project',
			cwd: '/tmp/other-project',
			sandbox: 'workspace-write',
			model: null,
			threadId: 'thread_stale',
			archivedAt: null,
			createdAt: '2026-03-30T12:00:00.000Z',
			updatedAt: '2026-03-30T12:05:00.000Z',
			origin: 'managed',
			threadState: 'ready',
			latestRunStatus: 'completed',
			hasActiveRun: false,
			canResume: true,
			runCount: 1,
			lastActivityAt: '2026-03-30T12:05:00.000Z',
			lastActivityLabel: 'just now',
			threadSummary: 'The thread is idle and available for the next instruction.',
			lastExitCode: 0,
			runTimeline: [],
			relatedTasks: [],
			latestRun: null,
			runs: []
		});

		const result = await actions.launchTaskSession({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: new FormData()
			})
		} as never);

		expect(sendAgentThreadMessage).not.toHaveBeenCalled();
		expect(startAgentThread).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'Task thread · Attach a brief · Agent Management System Prototype · task_1',
				cwd: '/tmp/project',
				additionalWritableRoots: [],
				prompt: 'run the task'
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				agentThreadId: 'session_new',
				status: 'in_progress',
				latestRunId: 'run_test'
			})
		);
		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'launchTaskSession',
				taskId: 'task_1',
				threadId: 'session_new'
			})
		);
	});

	it('injects retrieved published knowledge into the launch prompt context', async () => {
		loadRelevantSelfImprovementKnowledgeItems.mockResolvedValue([
			{
				id: 'knowledge_1',
				status: 'published',
				title: 'Failure recovery pattern',
				summary: 'Capture repeated launch failures as a reusable play.',
				category: 'reliability',
				projectId: 'project_1',
				projectName: 'Agent Management System Prototype',
				sourceOpportunityId: 'failed_runs:task_1',
				sourceTaskIds: ['task_1'],
				sourceRunIds: [],
				sourceThreadIds: [],
				sourceSignalIds: [],
				triggerPattern: 'Repeated launch or retry failures for the same task.',
				recommendedResponse: 'Add a preflight check before retrying the failing step.',
				applicabilityScope: ['Agent Management System Prototype'],
				createdAt: '2026-03-30T12:00:00.000Z',
				updatedAt: '2026-03-31T12:00:00.000Z',
				publishedAt: '2026-03-31T12:00:00.000Z',
				archivedAt: null,
				matchScore: 97,
				matchReasons: ['Matches this project.']
			}
		]);

		await actions.launchTaskSession({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: new FormData()
			})
		} as never);

		expect(buildTaskThreadPromptMock).toHaveBeenCalledWith(
			expect.objectContaining({
				relevantKnowledgeItems: [
					expect.objectContaining({
						id: 'knowledge_1',
						title: 'Failure recovery pattern'
					})
				]
			})
		);
	});

	it('reuses the latest compatible thread when no explicit thread is assigned', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			tasks: [
				{
					...(controlPlaneState.current as ControlPlaneData).tasks[0]!,
					agentThreadId: null,
					latestRunId: 'run_previous'
				}
			],
			runs: [
				{
					id: 'run_previous',
					taskId: 'task_1',
					executionSurfaceId: null,
					providerId: 'provider_local_codex',
					status: 'completed',
					createdAt: '2026-03-30T12:10:00.000Z',
					updatedAt: '2026-03-30T12:15:00.000Z',
					startedAt: '2026-03-30T12:10:00.000Z',
					endedAt: '2026-03-30T12:15:00.000Z',
					threadId: 'thread_previous',
					agentThreadId: 'session_previous',
					promptDigest: 'digest_previous',
					artifactPaths: ['/tmp/project/agent_output'],
					summary: 'Completed previous run.',
					lastHeartbeatAt: '2026-03-30T12:15:00.000Z',
					errorSummary: ''
				}
			]
		};
		getAgentThread.mockResolvedValue({
			id: 'session_previous',
			name: 'Work thread: Previous Run',
			cwd: '/tmp/project',
			sandbox: 'workspace-write',
			model: null,
			threadId: 'thread_previous',
			archivedAt: null,
			createdAt: '2026-03-30T12:10:00.000Z',
			updatedAt: '2026-03-30T12:15:00.000Z',
			origin: 'managed',
			threadState: 'ready',
			latestRunStatus: 'completed',
			hasActiveRun: false,
			canResume: true,
			runCount: 1,
			lastActivityAt: '2026-03-30T12:15:00.000Z',
			lastActivityLabel: 'just now',
			threadSummary: 'The thread is idle and available for the next instruction.',
			lastExitCode: 0,
			runTimeline: [],
			relatedTasks: [],
			latestRun: null,
			runs: []
		});

		const result = await actions.launchTaskSession({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: new FormData()
			})
		} as never);

		expect(sendAgentThreadMessage).toHaveBeenCalledWith('session_previous', 'run the task');
		expect(startAgentThread).not.toHaveBeenCalled();
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				agentThreadId: 'session_previous',
				status: 'in_progress',
				latestRunId: 'run_test'
			})
		);
		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'launchTaskSession',
				taskId: 'task_1',
				threadId: 'session_previous'
			})
		);
	});

	it('rejects launching a task when it already has an active run', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			runs: [
				{
					id: 'run_active',
					taskId: 'task_1',
					executionSurfaceId: null,
					providerId: 'provider_local_codex',
					status: 'running',
					createdAt: '2026-03-30T12:10:00.000Z',
					updatedAt: '2026-03-30T12:10:00.000Z',
					startedAt: '2026-03-30T12:10:00.000Z',
					endedAt: null,
					threadId: 'thread_active',
					agentThreadId: 'session_active',
					promptDigest: 'digest_active',
					artifactPaths: ['/tmp/project/agent_output'],
					summary: 'Already running.',
					lastHeartbeatAt: '2026-03-30T12:10:00.000Z',
					errorSummary: ''
				}
			]
		};

		const result = await actions.launchTaskSession({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: new FormData()
			})
		} as never);

		expect(result).toMatchObject({
			status: 409,
			data: {
				message:
					'This task already has an active run. Open the current work thread or wait for it to finish before starting another run.'
			}
		});
		expect(createRun).not.toHaveBeenCalled();
		expect(sendAgentThreadMessage).not.toHaveBeenCalled();
		expect(startAgentThread).not.toHaveBeenCalled();
		expect(controlPlaneState.saved).toBeNull();
	});

	it('recovers a stale active run and requeues the task in the existing thread', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			tasks: [
				{
					...(controlPlaneState.current as ControlPlaneData).tasks[0]!,
					status: 'in_progress',
					agentThreadId: 'session_active',
					latestRunId: 'run_active',
					updatedAt: '2026-03-30T12:00:00.000Z'
				}
			],
			runs: [
				{
					id: 'run_active',
					taskId: 'task_1',
					executionSurfaceId: null,
					providerId: 'provider_local_codex',
					status: 'running',
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z',
					startedAt: '2026-03-30T12:00:00.000Z',
					endedAt: null,
					threadId: 'thread_active',
					agentThreadId: 'session_active',
					promptDigest: 'digest_active',
					artifactPaths: ['/tmp/project/agent_output'],
					summary: 'Already running.',
					lastHeartbeatAt: '2026-03-30T12:00:00.000Z',
					errorSummary: ''
				}
			]
		};
		getAgentThread.mockResolvedValue({
			id: 'session_active',
			name: 'Task thread continuity',
			cwd: '/tmp/project',
			sandbox: 'workspace-write',
			model: null,
			threadId: 'thread_active',
			archivedAt: null,
			createdAt: '2026-03-30T11:55:00.000Z',
			updatedAt: '2026-03-30T12:00:00.000Z',
			origin: 'managed',
			threadState: 'working',
			latestRunStatus: 'running',
			hasActiveRun: false,
			canResume: true,
			runCount: 1,
			lastActivityAt: '2026-03-30T12:00:00.000Z',
			lastActivityLabel: '30m ago',
			threadSummary: 'Thread appears stalled.',
			lastExitCode: null,
			runTimeline: [],
			relatedTasks: [],
			latestRun: null,
			runs: []
		});
		recoverAgentThread.mockImplementation(async () => {
			controlPlaneState.current = {
				...(controlPlaneState.current as ControlPlaneData),
				tasks: [
					{
						...(controlPlaneState.current as ControlPlaneData).tasks[0]!,
						status: 'in_progress',
						blockedReason: '',
						updatedAt: '2026-03-30T12:45:00.000Z'
					}
				],
				runs: (controlPlaneState.current as ControlPlaneData).runs.map((run) =>
					run.id === 'run_active'
						? {
								...run,
								status: 'failed',
								endedAt: '2026-03-30T12:45:00.000Z',
								updatedAt: '2026-03-30T12:45:00.000Z',
								errorSummary: 'Recovered stalled run.'
							}
						: run
				)
			};

			return {
				agentThreadId: 'session_active',
				runId: 'run_active',
				status: 'failed',
				signal: null,
				recoveredAt: '2026-03-30T12:45:00.000Z'
			};
		});

		const result = await actions.recoverTaskSession({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: new FormData()
			})
		} as never);

		expect(recoverAgentThread).toHaveBeenCalledWith('session_active');
		expect(sendAgentThreadMessage).toHaveBeenCalledWith('session_active', 'run the task');
		expect(startAgentThread).not.toHaveBeenCalled();
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				status: 'in_progress',
				blockedReason: '',
				agentThreadId: 'session_active',
				latestRunId: 'run_test'
			})
		);
		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'recoverTaskSession',
				taskId: 'task_1',
				threadId: 'session_active'
			})
		);
	});

	it('rejects launching a task when the submitted status is not ready', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			tasks: [
				{
					...(controlPlaneState.current as ControlPlaneData).tasks[0]!,
					status: 'blocked'
				}
			]
		};

		const result = await actions.launchTaskSession({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: new FormData()
			})
		} as never);

		expect(result).toMatchObject({
			status: 409,
			data: {
				message: 'Only tasks in the Ready state can be run. Set the task status to Ready first.'
			}
		});
		expect(createRun).not.toHaveBeenCalled();
		expect(sendAgentThreadMessage).not.toHaveBeenCalled();
		expect(startAgentThread).not.toHaveBeenCalled();
		expect(controlPlaneState.saved).toBeNull();
	});

	it('rejects launching a task when the project root is not writable in the sandbox', async () => {
		getWorkspaceExecutionIssue.mockReturnValue(
			'Project root cannot be used with the workspace-write sandbox: /tmp/project. Operation not permitted (EPERM).'
		);

		const result = await actions.launchTaskSession({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: new FormData()
			})
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: {
				message:
					'Project root cannot be used with the workspace-write sandbox: /tmp/project. Operation not permitted (EPERM).'
			}
		});
		expect(startAgentThread).not.toHaveBeenCalled();
		expect(sendAgentThreadMessage).not.toHaveBeenCalled();
		expect(createRun).not.toHaveBeenCalled();
		expect(controlPlaneState.saved).toBeNull();
	});

	it('uses an execution-surface thread sandbox override when starting a new task thread', async () => {
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			roles: [
				{
					id: 'role_coordinator',
					name: 'Coordinator',
					area: 'shared',
					description: 'Coordinates work'
				}
			],
			executionSurfaces: [
				{
					id: 'worker_1',
					name: 'Local operator',
					providerId: 'provider_local_codex',
					supportedRoleIds: [],
					location: 'local',
					status: 'idle',
					capacity: 1,
					registeredAt: '2026-03-30T12:00:00.000Z',
					lastSeenAt: '2026-03-30T12:00:00.000Z',
					note: '',
					tags: [],
					threadSandboxOverride: 'danger-full-access',
					authTokenHash: ''
				}
			],
			tasks: [
				{
					...(controlPlaneState.current as ControlPlaneData).tasks[0]!,
					assigneeExecutionSurfaceId: 'worker_1'
				}
			]
		};

		const form = new FormData();
		form.set('assigneeExecutionSurfaceId', 'worker_1');

		await actions.launchTaskSession({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(startAgentThread).toHaveBeenCalledWith(
			expect.objectContaining({
				sandbox: 'danger-full-access'
			})
		);
	});

	it('prefers the project default sandbox over the provider default on the task detail page', async () => {
		(controlPlaneState.current as ControlPlaneData).projects[0]!.defaultThreadSandbox =
			'danger-full-access';
		(controlPlaneState.current as ControlPlaneData).providers[0]!.defaultThreadSandbox =
			'read-only';

		await actions.launchTaskSession({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: new FormData()
			})
		} as never);

		expect(startAgentThread).toHaveBeenCalledWith(
			expect.objectContaining({
				sandbox: 'danger-full-access'
			})
		);
	});

	it('uses the task sandbox requirement over execution-surface and project defaults on the task detail page', async () => {
		(controlPlaneState.current as ControlPlaneData).projects[0]!.defaultThreadSandbox =
			'danger-full-access';
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			executionSurfaces: [
				{
					id: 'worker_1',
					name: 'Local operator',
					providerId: 'provider_local_codex',
					supportedRoleIds: [],
					location: 'local',
					status: 'idle',
					capacity: 1,
					registeredAt: '2026-03-30T12:00:00.000Z',
					lastSeenAt: '2026-03-30T12:00:00.000Z',
					note: '',
					tags: [],
					threadSandboxOverride: 'read-only',
					authTokenHash: ''
				}
			],
			tasks: [
				{
					...(controlPlaneState.current as ControlPlaneData).tasks[0]!,
					assigneeExecutionSurfaceId: 'worker_1'
				}
			]
		};

		const form = new FormData();
		form.set('assigneeExecutionSurfaceId', 'worker_1');
		form.set('requiredThreadSandbox', 'workspace-write');

		await actions.launchTaskSession({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(startAgentThread).toHaveBeenCalledWith(
			expect.objectContaining({
				sandbox: 'workspace-write'
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				requiredThreadSandbox: 'workspace-write'
			})
		);
	});

	it('starts a fresh thread when the project now requires extra writable roots', async () => {
		(controlPlaneState.current as ControlPlaneData).projects[0]!.additionalWritableRoots = [
			'/Users/test/Library/Mobile Documents/com~apple~CloudDocs/Shared'
		];
		controlPlaneState.current = {
			...(controlPlaneState.current as ControlPlaneData),
			tasks: [
				{
					...(controlPlaneState.current as ControlPlaneData).tasks[0]!,
					agentThreadId: null,
					latestRunId: 'run_previous'
				}
			],
			runs: [
				{
					id: 'run_previous',
					taskId: 'task_1',
					executionSurfaceId: null,
					providerId: 'provider_local_codex',
					status: 'completed',
					createdAt: '2026-03-30T12:10:00.000Z',
					updatedAt: '2026-03-30T12:15:00.000Z',
					startedAt: '2026-03-30T12:10:00.000Z',
					endedAt: '2026-03-30T12:15:00.000Z',
					threadId: 'thread_previous',
					agentThreadId: 'session_previous',
					promptDigest: 'digest_previous',
					artifactPaths: ['/tmp/project/agent_output'],
					summary: 'Completed previous run.',
					lastHeartbeatAt: '2026-03-30T12:15:00.000Z',
					errorSummary: ''
				}
			]
		};
		getAgentThread.mockResolvedValue({
			id: 'session_previous',
			name: 'Work thread: Previous Run',
			cwd: '/tmp/project',
			additionalWritableRoots: [],
			sandbox: 'workspace-write',
			model: null,
			threadId: 'thread_previous',
			archivedAt: null,
			createdAt: '2026-03-30T12:10:00.000Z',
			updatedAt: '2026-03-30T12:15:00.000Z',
			origin: 'managed',
			threadState: 'ready',
			latestRunStatus: 'completed',
			hasActiveRun: false,
			canResume: true,
			runCount: 1,
			lastActivityAt: '2026-03-30T12:15:00.000Z',
			lastActivityLabel: 'just now',
			threadSummary: 'The thread is idle and available for the next instruction.',
			lastExitCode: 0,
			runTimeline: [],
			relatedTasks: [],
			latestRun: null,
			runs: []
		});

		await actions.launchTaskSession({
			params: { taskId: 'task_1' },
			request: new Request('http://localhost/app/tasks/task_1', {
				method: 'POST',
				body: new FormData()
			})
		} as never);

		expect(sendAgentThreadMessage).not.toHaveBeenCalled();
		expect(startAgentThread).toHaveBeenCalledWith(
			expect.objectContaining({
				additionalWritableRoots: ['/Users/test/Library/Mobile Documents/com~apple~CloudDocs/Shared']
			})
		);
	});
});
