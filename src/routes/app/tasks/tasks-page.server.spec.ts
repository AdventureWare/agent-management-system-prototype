import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlPlaneData } from '$lib/types/control-plane';

const { mkdir, writeFile } = vi.hoisted(() => ({
	mkdir: vi.fn(),
	writeFile: vi.fn()
}));

const controlPlaneState = vi.hoisted(() => ({
	current: null as ControlPlaneData | null,
	saved: null as ControlPlaneData | null
}));

const createRunMock = vi.hoisted(() =>
	vi.fn((input: { taskId: string; agentThreadId?: string | null; status?: string }) => ({
		id: `run_${input.taskId}`,
		taskId: input.taskId,
		executionSurfaceId: null,
		providerId: null,
		status: input.status ?? 'queued',
		createdAt: '2026-03-31T10:00:00.000Z',
		updatedAt: '2026-03-31T10:00:00.000Z',
		startedAt: '2026-03-31T10:00:00.000Z',
		endedAt: null,
		threadId: null,
		agentThreadId: input.agentThreadId ?? null,
		promptDigest: 'digest_create_and_run',
		artifactPaths: ['/tmp/project/agent_output'],
		summary: 'Started a new work thread during task creation.',
		lastHeartbeatAt: '2026-03-31T10:00:00.000Z',
		errorSummary: ''
	}))
);

const createRunIdMock = vi.hoisted(() => vi.fn(() => 'run_generated'));

const createTaskMock = vi.hoisted(() =>
	vi.fn(
		(input: {
			title: string;
			summary: string;
			successCriteria?: string;
			readyCondition?: string;
			expectedOutcome?: string;
			projectId: string;
			goalId: string;
			taskTemplateId?: string | null;
			workflowId?: string | null;
			parentTaskId?: string | null;
			delegationPacket?: {
				objective: string;
				inputContext: string;
				expectedDeliverable: string;
				doneCondition: string;
				integrationNotes: string;
			} | null;
			priority?: string;
			riskLevel?: string;
			approvalMode?: string;
			requiredThreadSandbox?: string | null;
			requiresReview?: boolean;
			desiredRoleId: string;
			blockedReason?: string;
			dependencyTaskIds?: string[];
			artifactPath: string;
			targetDate?: string | null;
			requiredPromptSkillNames?: string[];
			requiredCapabilityNames?: string[];
			requiredToolNames?: string[];
			status?: string;
		}) => ({
			id: `task_${input.title.toLowerCase().replace(/\s+/g, '_')}`,
			title: input.title,
			summary: input.summary,
			successCriteria: input.successCriteria ?? '',
			readyCondition: input.readyCondition ?? '',
			expectedOutcome: input.expectedOutcome ?? '',
			projectId: input.projectId,
			area: 'product',
			goalId: input.goalId,
			taskTemplateId: input.taskTemplateId ?? null,
			workflowId: input.workflowId ?? null,
			parentTaskId: input.parentTaskId ?? null,
			delegationPacket: input.delegationPacket ?? null,
			priority: input.priority ?? 'medium',
			status: input.status ?? 'ready',
			riskLevel: input.riskLevel ?? 'medium',
			approvalMode: input.approvalMode ?? 'none',
			requiredThreadSandbox: input.requiredThreadSandbox ?? null,
			requiresReview: input.requiresReview ?? true,
			desiredRoleId: input.desiredRoleId,
			assigneeExecutionSurfaceId: null,
			agentThreadId: null,
			requiredPromptSkillNames: input.requiredPromptSkillNames ?? [],
			blockedReason: input.blockedReason ?? '',
			dependencyTaskIds: input.dependencyTaskIds ?? [],
			targetDate: input.targetDate ?? null,
			requiredCapabilityNames: input.requiredCapabilityNames ?? [],
			requiredToolNames: input.requiredToolNames ?? [],
			runCount: 0,
			latestRunId: null,
			artifactPath: input.artifactPath,
			attachments: [],
			createdAt: '2026-03-30T12:00:00.000Z',
			updatedAt: '2026-03-30T12:00:00.000Z'
		})
	)
);

const createTaskTemplateMock = vi.hoisted(() =>
	vi.fn(
		(input: {
			name: string;
			summary?: string;
			projectId: string;
			goalId?: string | null;
			workflowId?: string | null;
			taskTitle?: string;
			taskSummary?: string;
			successCriteria?: string;
			readyCondition?: string;
			expectedOutcome?: string;
			area?: string;
			priority?: string;
			riskLevel?: string;
			approvalMode?: string;
			requiredThreadSandbox?: string | null;
			requiresReview?: boolean;
			desiredRoleId?: string;
			assigneeExecutionSurfaceId?: string | null;
			requiredPromptSkillNames?: string[];
			requiredCapabilityNames?: string[];
			requiredToolNames?: string[];
		}) => ({
			id: `task_template_${input.name.toLowerCase().replace(/\s+/g, '_')}`,
			name: input.name,
			summary: input.summary ?? '',
			projectId: input.projectId,
			goalId: input.goalId ?? null,
			workflowId: input.workflowId ?? null,
			taskTitle: input.taskTitle ?? '',
			taskSummary: input.taskSummary ?? '',
			successCriteria: input.successCriteria ?? '',
			readyCondition: input.readyCondition ?? '',
			expectedOutcome: input.expectedOutcome ?? '',
			area: input.area ?? 'product',
			priority: input.priority ?? 'medium',
			riskLevel: input.riskLevel ?? 'medium',
			approvalMode: input.approvalMode ?? 'none',
			requiredThreadSandbox: input.requiredThreadSandbox ?? null,
			requiresReview: input.requiresReview ?? true,
			desiredRoleId: input.desiredRoleId ?? '',
			assigneeExecutionSurfaceId: input.assigneeExecutionSurfaceId ?? null,
			requiredPromptSkillNames: input.requiredPromptSkillNames ?? [],
			requiredCapabilityNames: input.requiredCapabilityNames ?? [],
			requiredToolNames: input.requiredToolNames ?? [],
			createdAt: '2026-03-30T12:00:00.000Z',
			updatedAt: '2026-03-30T12:00:00.000Z'
		})
	)
);

const startAgentThreadMock = vi.hoisted(() =>
	vi.fn(async () => ({
		agentThreadId: 'session_created',
		runId: 'runner_created'
	}))
);
const getWorkspaceExecutionIssueMock = vi.hoisted(() =>
	vi.fn<
		(_: {
			cwd: string;
			additionalWritableRoots?: string[];
			sandbox: string;
			scopeLabel?: string;
		}) => string | null
	>(() => null)
);

const buildPromptDigestMock = vi.hoisted(() => vi.fn(() => 'digest_create_and_run'));
const buildTaskThreadNameMock = vi.hoisted(() =>
	vi.fn(
		(input: { projectName: string; taskName: string; taskId: string }) =>
			`Task thread · ${input.taskName} · ${input.projectName} · ${input.taskId}`
	)
);
const buildTaskThreadPromptMock = vi.hoisted(() => vi.fn(() => 'task prompt'));
const listInstalledCodexSkillsMock = vi.hoisted(() =>
	vi.fn(() => [
		{
			id: 'skill-installer',
			description: 'Install Codex skills',
			global: true,
			project: false,
			sourceLabel: 'Global'
		},
		{
			id: 'web-design-guidelines',
			description: 'Review UI against guidelines',
			global: false,
			project: true,
			sourceLabel: 'Project'
		}
	])
);
const assistTaskWritingMock = vi.hoisted(() =>
	vi.fn(async () => ({
		instructions:
			'## Objective\nShip a clearer task brief.\n\n## Deliverable\nRewrite the operator-facing instructions so execution is easier.\n\n## Constraints\nPreserve the original intent and do not invent requirements.',
		changeSummary:
			'Rewrote the draft into a clearer execution brief with explicit deliverable and constraints.'
	}))
);

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

vi.mock('$lib/server/control-plane', () => ({
	createTaskAttachmentId: vi.fn(() => 'attachment_created'),
	createRun: createRunMock,
	createRunId: createRunIdMock,
	createTask: createTaskMock,
	createTaskTemplate: createTaskTemplateMock,
	deleteTask: vi.fn(),
	formatRelativeTime: vi.fn(() => 'just now'),
	getOpenReviewForTask: vi.fn(() => null),
	getPendingApprovalForTask: vi.fn(() => null),
	loadControlPlane: vi.fn(async () => controlPlaneState.current),
	parseTaskStatus: vi.fn((_value: string, fallback: string) => fallback),
	projectMatchesPath: vi.fn(
		(
			project: { defaultArtifactRoot?: string; projectRootFolder?: string },
			artifactPath: string
		) => {
			const normalizedPath = artifactPath.trim();
			return Boolean(
				normalizedPath &&
				(project.defaultArtifactRoot === normalizedPath ||
					project.projectRootFolder === normalizedPath)
			);
		}
	),
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
	taskHasUnmetDependencies: vi.fn(() => false),
	updateControlPlaneCollections: vi.fn(
		async (
			updater: (
				data: ControlPlaneData
			) => { data: ControlPlaneData } | Promise<{ data: ControlPlaneData }>
		) => {
			controlPlaneState.saved = syncTaskExecutionStateLike(
				(await updater(controlPlaneState.current as ControlPlaneData)).data
			);
			controlPlaneState.current = controlPlaneState.saved;
			return controlPlaneState.saved;
		}
	)
}));

vi.mock('$lib/server/control-plane-repository', () => ({
	createTaskRecord: vi.fn(
		async (input: {
			task: Record<string, unknown>;
			goalId?: string | null;
			prependRuns?: Array<Record<string, unknown>>;
		}) => {
			const current = controlPlaneState.current as ControlPlaneData;
			const goalId = input.goalId?.trim() ?? '';
			const nextTasks = [input.task as never, ...current.tasks];
			const nextGoals = goalId
				? current.goals.map((goal) =>
						goal.id === goalId
							? {
									...goal,
									taskIds: [...(goal.taskIds ?? []), String((input.task as { id: string }).id)]
								}
							: goal
					)
				: current.goals;
			controlPlaneState.saved = syncTaskExecutionStateLike({
				...current,
				goals: nextGoals,
				tasks: nextTasks,
				runs: [...(input.prependRuns ?? []), ...current.runs] as ControlPlaneData['runs']
			});
			controlPlaneState.current = controlPlaneState.saved;
		}
	),
	updateTaskRecord: vi.fn(
		async (input: {
			taskId: string;
			update: (task: any, data: ControlPlaneData) => any;
			prependRuns?: Array<Record<string, unknown>>;
		}) => {
			const current = controlPlaneState.current as ControlPlaneData;
			const existingTask = current.tasks.find((task) => task.id === input.taskId) ?? null;

			if (!existingTask) {
				return null;
			}

			const nextTask = input.update(existingTask, current);
			controlPlaneState.saved = syncTaskExecutionStateLike({
				...current,
				tasks: current.tasks.map((task) => (task.id === input.taskId ? nextTask : task)),
				runs: [...(input.prependRuns ?? []), ...current.runs] as ControlPlaneData['runs']
			});
			controlPlaneState.current = controlPlaneState.saved;
			return nextTask;
		}
	),
	deleteTaskRecords: vi.fn(async (taskIds: string[]) => {
		const current = controlPlaneState.current as ControlPlaneData;
		controlPlaneState.saved = syncTaskExecutionStateLike({
			...current,
			tasks: current.tasks.filter((task) => !taskIds.includes(task.id)),
			runs: current.runs.filter((run) => !taskIds.includes(run.taskId))
		});
		controlPlaneState.current = controlPlaneState.saved;
		return taskIds;
	})
}));

vi.mock('node:fs/promises', () => ({
	mkdir,
	writeFile
}));

vi.mock('$lib/server/agent-threads', () => ({
	cancelAgentThread: vi.fn(),
	getAgentThread: vi.fn(async () => null),
	listAgentThreads: vi.fn(async () => []),
	sendAgentThreadMessage: vi.fn(),
	startAgentThread: startAgentThreadMock
}));

vi.mock('$lib/task-thread-context', () => ({
	selectTaskThreadContext: vi.fn(() => ({
		linkThread: null,
		linkThreadKind: 'assigned',
		statusThread: null
	}))
}));

vi.mock('$lib/server/task-threads', () => ({
	buildPromptDigest: buildPromptDigestMock,
	buildTaskThreadName: buildTaskThreadNameMock,
	buildTaskThreadPrompt: buildTaskThreadPromptMock
}));

vi.mock('$lib/server/codex-skills', () => ({
	listInstalledCodexSkills: listInstalledCodexSkillsMock
}));

vi.mock('$lib/server/task-writing-assist', () => ({
	assistTaskWriting: assistTaskWritingMock
}));

vi.mock('$lib/server/task-execution-workspace', () => ({
	getWorkspaceExecutionIssue: getWorkspaceExecutionIssueMock
}));

import { actions } from './+page.server';

describe('tasks page server actions', () => {
	beforeEach(() => {
		mkdir.mockReset();
		writeFile.mockReset();
		buildPromptDigestMock.mockClear();
		buildTaskThreadNameMock.mockClear();
		buildTaskThreadPromptMock.mockClear();
		listInstalledCodexSkillsMock.mockClear();
		assistTaskWritingMock.mockClear();
		createRunMock.mockClear();
		createRunIdMock.mockClear();
		createTaskMock.mockClear();
		createTaskTemplateMock.mockClear();
		startAgentThreadMock.mockClear();
		getWorkspaceExecutionIssueMock.mockReset();
		getWorkspaceExecutionIssueMock.mockReturnValue(null);
		controlPlaneState.current = {
			providers: [
				{
					id: 'provider_local',
					name: 'Local Codex',
					service: 'codex',
					kind: 'local',
					description: 'Local provider',
					enabled: true,
					setupStatus: 'connected',
					authMode: 'local_cli',
					defaultModel: 'gpt-5',
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
					description: 'Routes work'
				},
				{
					id: 'role_reviewer',
					name: 'Reviewer',
					area: 'shared',
					description: 'Reviews and verifies work'
				}
			],
			projects: [
				{
					id: 'project_ams',
					name: 'Agent Management System Prototype',
					summary: 'project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				},
				{
					id: 'project_docs',
					name: 'Documentation Site',
					summary: 'docs',
					projectRootFolder: '/tmp/docs',
					defaultArtifactRoot: '/tmp/docs/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				}
			],
			goals: [
				{
					id: 'goal_queue_quality',
					name: 'Reduce task intake friction',
					area: 'product',
					status: 'running',
					summary: 'Improve task intake and routing quality.',
					artifactPath: '/tmp/project/goals/queue-quality',
					successSignal: 'Operators can link work to goals during intake.',
					parentGoalId: null,
					projectIds: ['project_ams'],
					taskIds: ['task_existing']
				}
			],
			workflows: [
				{
					id: 'workflow_release',
					name: 'Release flow',
					summary: 'Coordinate release work.',
					projectId: 'project_ams',
					status: 'active',
					templateKey: null,
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z'
				},
				{
					id: 'workflow_docs_review',
					name: 'Docs review flow',
					summary: 'Coordinate documentation review work.',
					projectId: 'project_docs',
					status: 'active',
					templateKey: null,
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z'
				}
			],
			workflowSteps: [
				{
					id: 'workflow_step_requirements',
					workflowId: 'workflow_release',
					title: 'Requirements gathering',
					summary: 'Clarify the feature need and success criteria.',
					desiredRoleId: 'role_coordinator',
					dependsOnStepIds: [],
					position: 1,
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z'
				},
				{
					id: 'workflow_step_implementation',
					workflowId: 'workflow_release',
					title: 'Implementation',
					summary: 'Build the feature slice.',
					desiredRoleId: 'role_reviewer',
					dependsOnStepIds: ['workflow_step_requirements'],
					position: 2,
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z'
				},
				{
					id: 'workflow_step_docs_review',
					workflowId: 'workflow_docs_review',
					title: 'Editorial review',
					summary: 'Review the draft for clarity and accuracy.',
					desiredRoleId: 'role_reviewer',
					dependsOnStepIds: [],
					position: 1,
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z'
				}
			],
			taskTemplates: [
				{
					id: 'task_template_research_brief',
					name: 'Research brief',
					summary: 'Reusable defaults for repeatable research requests.',
					projectId: 'project_ams',
					goalId: 'goal_queue_quality',
					workflowId: null,
					taskTitle: 'Run research brief',
					taskSummary: 'Investigate adjacent marketplace UX patterns and summarize findings.',
					successCriteria: '',
					readyCondition: '',
					expectedOutcome: '',
					area: 'product',
					priority: 'medium',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiredThreadSandbox: null,
					requiresReview: true,
					desiredRoleId: 'role_reviewer',
					assigneeExecutionSurfaceId: null,
					requiredPromptSkillNames: [],
					requiredCapabilityNames: ['planning', 'citations'],
					requiredToolNames: [],
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z'
				}
			],
			executionSurfaces: [],
			tasks: [
				{
					id: 'task_existing',
					title: 'Existing task already in queue',
					summary: 'Existing task already in queue.',
					projectId: 'project_ams',
					area: 'product',
					goalId: 'goal_queue_quality',
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
					runCount: 0,
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

	it('creates a queued task without launching a work thread by default', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('name', 'Add create and run button');
		form.set('instructions', 'Add a second action in the create task form.');
		form.set('targetDate', '2026-04-18');
		form.set('requiredCapabilityNames', 'planning, citations');
		form.set('requiredToolNames', 'codex, playwright');

		const result = await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'createTask'
			})
		);
		expect(startAgentThreadMock).not.toHaveBeenCalled();
		expect(createRunMock).not.toHaveBeenCalled();
		expect(createTaskMock).toHaveBeenCalledWith(
			expect.objectContaining({
				requiredCapabilityNames: ['planning', 'citations'],
				requiredToolNames: ['codex', 'playwright']
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				title: 'Add create and run button',
				status: 'ready',
				targetDate: '2026-04-18',
				requiredCapabilityNames: ['planning', 'citations'],
				requiredToolNames: ['codex', 'playwright'],
				agentThreadId: null,
				runCount: 0
			})
		);
	});

	it('records the selected task template as the task provenance source', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('taskTemplateId', 'task_template_research_brief');
		form.set('name', 'Follow the research brief');
		form.set('instructions', 'Use the saved template defaults as the starting point.');

		const result = await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'createTask'
			})
		);
		expect(createTaskMock).toHaveBeenCalledWith(
			expect.objectContaining({
				taskTemplateId: 'task_template_research_brief'
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				title: 'Follow the research brief',
				taskTemplateId: 'task_template_research_brief'
			})
		);
	});

	it('applies the selected workflow when creating a task and instantiates the task set', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('workflowId', 'workflow_release');
		form.set('name', 'Prepare release notes');
		form.set('instructions', 'Draft the notes needed for the next release.');

		const result = await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'createTaskWithWorkflow',
				createdTaskCount: 3,
				parentTaskId: 'task_prepare_release_notes'
			})
		);
		expect(controlPlaneState.saved?.tasks.slice(0, 3)).toEqual([
			expect.objectContaining({
				id: 'task_prepare_release_notes',
				title: 'Prepare release notes',
				parentTaskId: null,
				workflowId: 'workflow_release',
				goalId: ''
			}),
			expect.objectContaining({
				id: 'task_prepare_release_notes:_requirements_gathering',
				title: 'Prepare release notes: Requirements gathering',
				parentTaskId: 'task_prepare_release_notes',
				workflowId: 'workflow_release',
				desiredRoleId: 'role_coordinator'
			}),
			expect.objectContaining({
				id: 'task_prepare_release_notes:_implementation',
				title: 'Prepare release notes: Implementation',
				parentTaskId: 'task_prepare_release_notes',
				workflowId: 'workflow_release',
				desiredRoleId: 'role_reviewer',
				dependencyTaskIds: ['task_prepare_release_notes:_requirements_gathering']
			})
		]);
	});

	it('allows creating a task from a workflow owned by another project', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('workflowId', 'workflow_docs_review');
		form.set('name', 'Review operator docs');
		form.set('instructions', 'Run the standard docs review sequence for the operator guide.');

		const result = await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'createTaskWithWorkflow',
				createdTaskCount: 2,
				parentTaskId: 'task_review_operator_docs'
			})
		);
		expect(controlPlaneState.saved?.tasks.slice(0, 2)).toEqual([
			expect.objectContaining({
				id: 'task_review_operator_docs',
				projectId: 'project_ams',
				workflowId: 'workflow_docs_review'
			}),
			expect.objectContaining({
				title: 'Review operator docs: Editorial review',
				projectId: 'project_ams',
				parentTaskId: 'task_review_operator_docs',
				workflowId: 'workflow_docs_review'
			})
		]);
	});

	it('rejects create and run when a workflow template is selected', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('workflowId', 'workflow_release');
		form.set('name', 'Ship release notes');
		form.set('instructions', 'Use the release workflow.');
		form.set('submitMode', 'createAndRun');

		const result = await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: expect.objectContaining({
				formContext: 'taskCreate',
				workflowId: 'workflow_release',
				submitMode: 'createAndRun'
			})
		});
		expect(createTaskMock).not.toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Ship release notes',
				workflowId: 'workflow_release'
			})
		);
	});

	it('saves a task template from the current create-task draft', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('goalId', 'goal_queue_quality');
		form.set('workflowId', 'workflow_release');
		form.set('name', 'Research competitive marketplace patterns');
		form.set(
			'instructions',
			'Investigate adjacent marketplace UX patterns and summarize findings.'
		);
		form.set('desiredRoleId', 'role_reviewer');
		form.set('requiredCapabilityNames', 'planning, citations');
		form.set('taskTemplateName', 'Research brief');
		form.set('taskTemplateSummary', 'Reusable defaults for repeatable research requests.');

		const result = await actions.saveTaskTemplate({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				formContext: 'taskCreate',
				reopenCreateModal: true,
				successAction: 'saveTaskTemplate',
				taskTemplateId: 'task_template_research_brief'
			})
		);
		expect(createTaskTemplateMock).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'Research brief',
				projectId: 'project_ams',
				goalId: 'goal_queue_quality',
				workflowId: 'workflow_release',
				taskTitle: 'Research competitive marketplace patterns',
				desiredRoleId: 'role_reviewer',
				requiredCapabilityNames: ['planning', 'citations']
			})
		);
		expect(controlPlaneState.saved?.taskTemplates?.[0]).toEqual(
			expect.objectContaining({
				id: 'task_template_research_brief',
				name: 'Research brief',
				projectId: 'project_ams',
				workflowId: 'workflow_release'
			})
		);
	});

	it('keeps desired role empty when the user does not choose one', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('name', 'Optional role task');
		form.set('instructions', 'Do not force a role onto this task.');

		await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(createTaskMock).toHaveBeenCalledWith(
			expect.objectContaining({
				desiredRoleId: ''
			})
		);
	});

	it('rewrites task instructions in place without creating a task', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('goalId', 'goal_queue_quality');
		form.set('parentTaskId', 'task_existing');
		form.set('name', 'Tighten task draft');
		form.set('instructions', 'make this clearer for the agent');
		form.set('successCriteria', 'The rewritten brief is easier to execute.');
		form.set('requiredToolNames', 'codex, playwright');

		const result = await actions.assistTaskWriting({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(assistTaskWritingMock).toHaveBeenCalledWith({
			cwd: '/tmp/project',
			projectName: 'Agent Management System Prototype',
			taskName: 'Tighten task draft',
			goalLabel: 'Reduce task intake friction',
			parentTaskTitle: 'Existing task already in queue',
			existingInstructions: 'make this clearer for the agent',
			successCriteria: 'The rewritten brief is easier to execute.',
			readyCondition: '',
			expectedOutcome: '',
			delegationObjective: '',
			delegationInputContext: '',
			delegationExpectedDeliverable: '',
			delegationDoneCondition: '',
			delegationIntegrationNotes: '',
			blockedReason: '',
			requiredPromptSkillNames: [],
			requiredCapabilityNames: [],
			requiredToolNames: ['codex', 'playwright'],
			availableSkillNames: ['skill-installer', 'web-design-guidelines']
		});
		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				formContext: 'taskCreate',
				successAction: 'assistTaskWriting',
				reopenCreateModal: true,
				name: 'Tighten task draft',
				projectId: 'project_ams',
				instructions:
					'## Objective\nShip a clearer task brief.\n\n## Deliverable\nRewrite the operator-facing instructions so execution is easier.\n\n## Constraints\nPreserve the original intent and do not invent requirements.',
				assistChangeSummary:
					'Rewrote the draft into a clearer execution brief with explicit deliverable and constraints.'
			})
		);
		expect(createTaskMock).not.toHaveBeenCalled();
		expect(createRunMock).not.toHaveBeenCalled();
		expect(controlPlaneState.saved).toBeNull();
	});

	it('rejects writing assist requests that do not include instructions', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('name', 'Tighten task draft');

		const result = await actions.assistTaskWriting({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: {
				formContext: 'taskCreate',
				message: 'Add draft instructions before requesting writing assist.',
				name: 'Tighten task draft',
				projectId: 'project_ams'
			}
		});
		expect(assistTaskWritingMock).not.toHaveBeenCalled();
	});

	it('creates a queued task with advanced routing and governance metadata', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('name', 'Escalate a blocked migration');
		form.set('instructions', 'Capture the risk and route this through the right gate at intake.');
		form.set('priority', 'urgent');
		form.set('riskLevel', 'high');
		form.set('approvalMode', 'before_apply');
		form.set('requiresReview', 'false');
		form.set('desiredRoleId', 'role_reviewer');
		form.set('blockedReason', 'Waiting on a schema decision.');
		form.append('dependencyTaskIds', 'task_existing');

		const result = await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'createTask'
			})
		);
		expect(createTaskMock).toHaveBeenCalledWith(
			expect.objectContaining({
				priority: 'urgent',
				riskLevel: 'high',
				approvalMode: 'before_apply',
				requiresReview: false,
				desiredRoleId: 'role_reviewer',
				blockedReason: 'Waiting on a schema decision.',
				dependencyTaskIds: ['task_existing']
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				title: 'Escalate a blocked migration',
				priority: 'urgent',
				riskLevel: 'high',
				approvalMode: 'before_apply',
				requiresReview: false,
				desiredRoleId: 'role_reviewer',
				blockedReason: 'Waiting on a schema decision.',
				dependencyTaskIds: ['task_existing']
			})
		);
	});

	it('links a newly created task to the selected goal', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('goalId', 'goal_queue_quality');
		form.set('name', 'Link new task to goal');
		form.set('instructions', 'Create a task directly under the queue-quality goal.');

		const result = await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'createTask'
			})
		);
		expect(createTaskMock).toHaveBeenCalledWith(
			expect.objectContaining({
				goalId: 'goal_queue_quality'
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				title: 'Link new task to goal',
				goalId: 'goal_queue_quality'
			})
		);
		expect(
			controlPlaneState.saved?.goals.find((goal) => goal.id === 'goal_queue_quality')?.taskIds
		).toEqual(['task_existing', 'task_link_new_task_to_goal']);
	});

	it('creates a delegated child task when a parent task is provided', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('parentTaskId', 'task_existing');
		form.set('name', 'Split out delegation contract');
		form.set('instructions', 'Create a child task for the specialized contract work.');
		form.set('delegationObjective', 'Own the delegation packet schema and validation.');
		form.set('delegationDoneCondition', 'The parent task can see and trust the child contract.');
		form.set('delegationExpectedDeliverable', 'Schema updates and create-form validation.');

		const result = await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'createTask'
			})
		);
		expect(createTaskMock).toHaveBeenCalledWith(
			expect.objectContaining({
				parentTaskId: 'task_existing',
				delegationPacket: {
					objective: 'Own the delegation packet schema and validation.',
					inputContext: '',
					expectedDeliverable: 'Schema updates and create-form validation.',
					doneCondition: 'The parent task can see and trust the child contract.',
					integrationNotes: ''
				}
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				title: 'Split out delegation contract',
				parentTaskId: 'task_existing',
				delegationPacket: {
					objective: 'Own the delegation packet schema and validation.',
					inputContext: '',
					expectedDeliverable: 'Schema updates and create-form validation.',
					doneCondition: 'The parent task can see and trust the child contract.',
					integrationNotes: ''
				}
			})
		);
	});

	it('rejects delegated child tasks that do not include an objective and done condition', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('parentTaskId', 'task_existing');
		form.set('name', 'Split out delegation contract');
		form.set('instructions', 'Create a child task for the specialized contract work.');

		const result = await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: {
				message: 'Delegated child tasks need a clear delegation objective.'
			}
		});
		expect(createTaskMock).not.toHaveBeenCalledWith(
			expect.objectContaining({
				parentTaskId: 'task_existing'
			})
		);
	});

	it('rejects an invalid target date during task creation', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('name', 'Add create and run button');
		form.set('instructions', 'Add a second action in the create task form.');
		form.set('targetDate', '04/18/2026');

		const result = await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: {
				message: 'Target date must use YYYY-MM-DD format.',
				targetDate: '04/18/2026'
			}
		});
		expect(createTaskMock).not.toHaveBeenCalledWith(
			expect.objectContaining({
				targetDate: '04/18/2026'
			})
		);
		expect(controlPlaneState.saved).toBeNull();
	});

	it('attaches uploaded files while creating a queued task', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('name', 'Create task with source files');
		form.set('instructions', 'Save the uploaded brief files during creation.');
		form.append('attachments', new File(['brief'], 'brief.md', { type: 'text/markdown' }));
		form.append('attachments', new File(['diagram'], 'diagram.png', { type: 'image/png' }));

		const result = await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'createTask',
				attachmentCount: 2
			})
		);
		expect(mkdir).toHaveBeenCalledWith(
			'/tmp/project/agent_output/task-attachments/task_create_task_with_source_files',
			{ recursive: true }
		);
		expect(writeFile).toHaveBeenCalledTimes(2);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				title: 'Create task with source files',
				attachments: [
					expect.objectContaining({
						id: 'attachment_created',
						name: 'brief.md',
						path: '/tmp/project/agent_output/task-attachments/task_create_task_with_source_files/attachment_created-brief.md',
						contentType: 'text/markdown',
						sizeBytes: 5
					}),
					expect.objectContaining({
						id: 'attachment_created',
						name: 'diagram.png',
						path: '/tmp/project/agent_output/task-attachments/task_create_task_with_source_files/attachment_created-diagram.png',
						contentType: 'image/png',
						sizeBytes: 7
					})
				]
			})
		);
	});

	it('creates and launches a task when the create-and-run submit mode is used', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('name', 'Create and run from the task form');
		form.set('instructions', 'Create the task and immediately start its work thread.');
		form.set(
			'successCriteria',
			'A reviewer can confirm the task launched with the right contract.'
		);
		form.set('readyCondition', 'The task brief and launch contract are filled in.');
		form.set('expectedOutcome', 'A new worker thread starts with the stronger execution contract.');
		form.set('submitMode', 'createAndRun');

		const result = await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'createTaskAndRun',
				taskId: 'task_create_and_run_from_the_task_form',
				threadId: 'session_created'
			})
		);
		expect(buildTaskThreadPromptMock).toHaveBeenCalledWith(
			expect.objectContaining({
				taskName: 'Create and run from the task form',
				taskInstructions: 'Create the task and immediately start its work thread.',
				projectName: 'Agent Management System Prototype',
				projectRootFolder: '/tmp/project',
				defaultArtifactRoot: '/tmp/project/agent_output',
				additionalWritableRoots: [],
				availableSkillNames: ['skill-installer', 'web-design-guidelines']
			})
		);
		expect(startAgentThreadMock).toHaveBeenCalledWith({
			name: 'Task thread · Create and run from the task form · Agent Management System Prototype · task_create_and_run_from_the_task_form',
			cwd: '/tmp/project',
			additionalWritableRoots: [],
			prompt: 'task prompt',
			sandbox: 'workspace-write',
			model: 'gpt-5',
			launchContext: {
				controlPlaneRunId: 'run_generated',
				taskId: 'task_create_and_run_from_the_task_form'
			}
		});
		expect(buildTaskThreadNameMock).toHaveBeenCalledWith({
			projectName: 'Agent Management System Prototype',
			taskName: 'Create and run from the task form',
			taskId: 'task_create_and_run_from_the_task_form'
		});
		expect(createRunMock).toHaveBeenCalledWith(
			expect.objectContaining({
				taskId: 'task_create_and_run_from_the_task_form',
				providerId: 'provider_local',
				status: 'running',
				agentThreadId: 'session_created',
				modelUsed: 'gpt-5',
				modelSource: 'provider_default',
				promptDigest: 'digest_create_and_run',
				artifactPaths: ['/tmp/project/agent_output']
			})
		);
		expect(controlPlaneState.saved?.tasks[0]).toEqual(
			expect.objectContaining({
				title: 'Create and run from the task form',
				status: 'in_progress',
				agentThreadId: 'session_created',
				runCount: 1,
				latestRunId: 'run_task_create_and_run_from_the_task_form'
			})
		);
		expect(controlPlaneState.saved?.runs[0]).toEqual(
			expect.objectContaining({
				id: 'run_task_create_and_run_from_the_task_form',
				taskId: 'task_create_and_run_from_the_task_form',
				agentThreadId: 'session_created'
			})
		);
	});

	it('allows create-and-run with only the basic task brief filled out', async () => {
		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('name', 'Quick launch task');
		form.set('instructions', 'Launch directly from the quick create flow.');
		form.set('submitMode', 'createAndRun');

		const result = await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				successAction: 'createTaskAndRun',
				taskId: 'task_quick_launch_task',
				threadId: 'session_created'
			})
		);
		expect(startAgentThreadMock).toHaveBeenCalled();
	});

	it('prefers the project default sandbox over the provider default during create-and-run', async () => {
		(controlPlaneState.current as ControlPlaneData).projects[0]!.defaultThreadSandbox =
			'danger-full-access';
		(controlPlaneState.current as ControlPlaneData).providers[0]!.defaultThreadSandbox =
			'read-only';

		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('name', 'Launch with project sandbox');
		form.set('instructions', 'Use the project sandbox preference.');
		form.set('successCriteria', 'A reviewer can verify the chosen sandbox.');
		form.set('readyCondition', 'The sandbox metadata is available for launch.');
		form.set('expectedOutcome', 'A work thread starts with the project sandbox.');
		form.set('submitMode', 'createAndRun');

		await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(startAgentThreadMock).toHaveBeenCalledWith(
			expect.objectContaining({
				sandbox: 'danger-full-access'
			})
		);
	});

	it('uses the provider thread sandbox default when launching from create-and-run', async () => {
		(controlPlaneState.current as ControlPlaneData).providers[0]!.defaultThreadSandbox =
			'read-only';

		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('name', 'Launch with provider sandbox');
		form.set('instructions', 'Use the provider default thread sandbox.');
		form.set('successCriteria', 'A reviewer can verify the inherited provider sandbox.');
		form.set('readyCondition', 'The provider sandbox default is configured.');
		form.set('expectedOutcome', 'A work thread starts with the provider sandbox.');
		form.set('submitMode', 'createAndRun');

		await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(startAgentThreadMock).toHaveBeenCalledWith(
			expect.objectContaining({
				sandbox: 'read-only'
			})
		);
	});

	it('uses the task sandbox requirement over inherited defaults during create-and-run', async () => {
		(controlPlaneState.current as ControlPlaneData).projects[0]!.defaultThreadSandbox = 'read-only';
		(controlPlaneState.current as ControlPlaneData).providers[0]!.defaultThreadSandbox =
			'danger-full-access';

		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('name', 'Launch with task sandbox');
		form.set('instructions', 'Use the task sandbox preference.');
		form.set('successCriteria', 'A reviewer can verify the task sandbox override.');
		form.set('readyCondition', 'The task sandbox override is recorded before launch.');
		form.set('expectedOutcome', 'A work thread starts with the task sandbox override.');
		form.set('requiredThreadSandbox', 'workspace-write');
		form.set('submitMode', 'createAndRun');

		await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(startAgentThreadMock).toHaveBeenCalledWith(
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

	it('rejects create-and-run when the project root is not writable in the sandbox', async () => {
		getWorkspaceExecutionIssueMock.mockReturnValue(
			'Project root cannot be used with the workspace-write sandbox: /tmp/project. Operation not permitted (EPERM).'
		);

		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('name', 'Create and run from the task form');
		form.set('instructions', 'Create the task and immediately start its work thread.');
		form.set('successCriteria', 'A reviewer can verify the launch attempt was correctly blocked.');
		form.set('readyCondition', 'The launch contract is complete before sandbox validation runs.');
		form.set('expectedOutcome', 'The action fails with the workspace execution issue.');
		form.set('submitMode', 'createAndRun');

		const result = await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(result).toMatchObject({
			status: 400,
			data: {
				message:
					'Project root cannot be used with the workspace-write sandbox: /tmp/project. Operation not permitted (EPERM).'
			}
		});
		expect(startAgentThreadMock).not.toHaveBeenCalled();
		expect(createRunMock).not.toHaveBeenCalled();
		expect(controlPlaneState.saved).toBeNull();
	});

	it('passes project storage roots into new task launches', async () => {
		(controlPlaneState.current as ControlPlaneData).projects[0]!.additionalWritableRoots = [
			'/Users/test/Library/Mobile Documents/com~apple~CloudDocs/Shared'
		];

		const form = new FormData();
		form.set('projectId', 'project_ams');
		form.set('name', 'Create and run with iCloud');
		form.set('instructions', 'Use files from iCloud Drive.');
		form.set(
			'successCriteria',
			'A reviewer can verify the writable roots passed through to launch.'
		);
		form.set('readyCondition', 'The project writable roots are configured.');
		form.set('expectedOutcome', 'The launch uses the project writable roots.');
		form.set('submitMode', 'createAndRun');

		await actions.createTask({
			request: new Request('http://localhost/app/tasks', {
				method: 'POST',
				body: form
			})
		} as never);

		expect(getWorkspaceExecutionIssueMock).toHaveBeenCalledWith(
			expect.objectContaining({
				cwd: '/tmp/project',
				additionalWritableRoots: ['/Users/test/Library/Mobile Documents/com~apple~CloudDocs/Shared']
			})
		);
		expect(startAgentThreadMock).toHaveBeenCalledWith(
			expect.objectContaining({
				additionalWritableRoots: ['/Users/test/Library/Mobile Documents/com~apple~CloudDocs/Shared']
			})
		);
	});
});
