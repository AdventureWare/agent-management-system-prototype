import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();
const tempDirs: string[] = [];

function createTempDir() {
	const path = mkdtempSync(join(tmpdir(), 'ams-agent-api-'));
	tempDirs.push(path);
	return path;
}

async function importControlPlaneModule() {
	vi.resetModules();
	return import('./control-plane');
}

async function importAgentApiModule() {
	return import('./agent-control-plane-api');
}

const ALL_CONTROL_PLANE_COLLECTIONS = [
	'providers',
	'roles',
	'projects',
	'goals',
	'executionSurfaces',
	'tasks',
	'runs',
	'reviews',
	'planningSessions',
	'approvals',
	'decisions'
] as const;

async function applyControlPlaneUpdate(
	controlPlaneModule: Awaited<ReturnType<typeof importControlPlaneModule>>,
	updater: (
		data: Awaited<ReturnType<typeof controlPlaneModule.loadControlPlane>>
	) => unknown | Promise<unknown>
) {
	return controlPlaneModule.updateControlPlaneCollections(async (data) => ({
		data: (await updater(data)) as typeof data,
		changedCollections: [...ALL_CONTROL_PLANE_COLLECTIONS]
	}));
}

afterEach(() => {
	process.chdir(originalCwd);
	vi.unstubAllEnvs();
	vi.resetModules();

	while (tempDirs.length > 0) {
		const path = tempDirs.pop();

		if (path) {
			rmSync(path, { recursive: true, force: true });
		}
	}
});

describe('agent-control-plane-api', () => {
	it('lists tasks, goals, and projects through agent-facing filters', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const agentApiModule = await importAgentApiModule();
		const project = {
			...controlPlaneModule.createProject({
				name: 'Agent App',
				summary: 'App project',
				projectRootFolder: resolve(root, 'app'),
				defaultArtifactRoot: resolve(root, 'app', 'agent_output')
			}),
			id: 'project_app'
		};
		const goal = {
			...controlPlaneModule.createGoal({
				name: 'Improve agent tooling',
				summary: 'Make AMS more agent-usable',
				status: 'ready',
				artifactPath: resolve(root, 'app', 'agent_output'),
				projectIds: [project.id]
			}),
			id: 'goal_agent'
		};
		const task = controlPlaneModule.createTask({
			id: 'task_agent_api',
			title: 'Add task API',
			summary: 'Expose machine-readable task routes',
			projectId: project.id,
			goalId: goal.id,
			priority: 'high',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiresReview: true,
			desiredRoleId: '',
			artifactPath: project.defaultArtifactRoot
		});

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project],
			goals: [goal],
			tasks: [task]
		}));

		const loaded = await controlPlaneModule.loadControlPlane();

		expect(
			agentApiModule.listAgentApiProjects(loaded, {
				q: 'agent'
			})
		).toEqual([
			expect.objectContaining({
				id: 'project_app',
				taskCount: 1,
				goalCount: 1
			})
		]);
		expect(
			agentApiModule.listAgentApiGoals(loaded, {
				projectId: 'project_app'
			})
		).toEqual([
			expect.objectContaining({
				id: 'goal_agent',
				projectNames: ['Agent App']
			})
		]);
		expect(
			agentApiModule.listAgentApiTasks(loaded, {
				projectId: 'project_app',
				q: 'machine-readable'
			})
		).toEqual([
			expect.objectContaining({
				id: 'task_agent_api',
				projectName: 'Agent App',
				goalName: 'Improve agent tooling'
			})
		]);
	}, 15_000);

	it('creates agent API tasks with sensible defaults', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const agentApiModule = await importAgentApiModule();
		const project = {
			...controlPlaneModule.createProject({
				name: 'Agent App',
				summary: 'App project',
				projectRootFolder: resolve(root, 'app'),
				defaultArtifactRoot: resolve(root, 'app', 'agent_output')
			}),
			id: 'project_app'
		};

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project]
		}));

		const createdTask = await agentApiModule.createAgentApiTask({
			title: 'Create an agent-usable task API',
			summary: 'Add a machine path for task creation',
			projectId: project.id
		});
		const loaded = await controlPlaneModule.loadControlPlane();

		expect(createdTask).toEqual(
			expect.objectContaining({
				title: 'Create an agent-usable task API',
				projectId: 'project_app',
				status: 'ready',
				requiresReview: true,
				artifactPath: resolve(root, 'app', 'agent_output')
			})
		);
		expect(loaded.tasks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: createdTask.id,
					title: 'Create an agent-usable task API'
				})
			])
		);
	});

	it('updates tasks and records a plan-update decision', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const agentApiModule = await importAgentApiModule();
		const project = {
			...controlPlaneModule.createProject({
				name: 'Agent App',
				summary: 'App project',
				projectRootFolder: resolve(root, 'app'),
				defaultArtifactRoot: resolve(root, 'app', 'agent_output')
			}),
			id: 'project_app'
		};
		const dependencyTask = controlPlaneModule.createTask({
			id: 'task_dep',
			title: 'Dependency',
			summary: 'Dependency task',
			projectId: project.id,
			goalId: '',
			priority: 'medium',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiresReview: true,
			desiredRoleId: '',
			artifactPath: project.defaultArtifactRoot
		});
		const task = controlPlaneModule.createTask({
			id: 'task_primary',
			title: 'Primary task',
			summary: 'Primary summary',
			projectId: project.id,
			goalId: '',
			priority: 'medium',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiresReview: true,
			desiredRoleId: '',
			artifactPath: project.defaultArtifactRoot
		});

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project],
			tasks: [task, dependencyTask]
		}));

		await agentApiModule.updateAgentApiTask('task_primary', {
			status: 'blocked',
			blockedReason: 'Waiting on fixture',
			dependencyTaskIds: ['task_dep'],
			targetDate: '2026-04-25'
		});
		const loaded = await controlPlaneModule.loadControlPlane();
		const updatedTask = loaded.tasks.find((candidate) => candidate.id === 'task_primary');

		expect(updatedTask).toEqual(
			expect.objectContaining({
				status: 'blocked',
				blockedReason: 'Waiting on fixture',
				dependencyTaskIds: ['task_dep'],
				targetDate: '2026-04-25'
			})
		);
		expect(loaded.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: 'task_primary',
				decisionType: 'task_plan_updated',
				summary: expect.stringContaining('status')
			})
		);
	});

	it('clears stale blocker text when the agent API moves a task out of blocked', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const agentApiModule = await importAgentApiModule();
		const project = {
			...controlPlaneModule.createProject({
				name: 'Agent App',
				summary: 'App project',
				projectRootFolder: resolve(root, 'app'),
				defaultArtifactRoot: resolve(root, 'app', 'agent_output')
			}),
			id: 'project_app'
		};
		const task = controlPlaneModule.createTask({
			id: 'task_blocked',
			title: 'Blocked task',
			summary: 'Primary summary',
			projectId: project.id,
			goalId: '',
			priority: 'medium',
			status: 'blocked',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiresReview: true,
			desiredRoleId: '',
			blockedReason: 'The linked work thread exited with code -1.',
			artifactPath: project.defaultArtifactRoot
		});

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project],
			tasks: [task]
		}));

		await agentApiModule.updateAgentApiTask('task_blocked', {
			status: 'ready'
		});
		const loaded = await controlPlaneModule.loadControlPlane();

		expect(loaded.tasks.find((candidate) => candidate.id === 'task_blocked')).toEqual(
			expect.objectContaining({
				status: 'ready',
				blockedReason: ''
			})
		);
	});

	it('creates and updates goals with linked relationships', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const agentApiModule = await importAgentApiModule();
		const project = {
			...controlPlaneModule.createProject({
				name: 'Agent App',
				summary: 'App project',
				projectRootFolder: resolve(root, 'app'),
				defaultArtifactRoot: resolve(root, 'app', 'agent_output')
			}),
			id: 'project_app'
		};
		const task = controlPlaneModule.createTask({
			id: 'task_linked',
			title: 'Linked task',
			summary: 'Attach this task to a goal',
			projectId: project.id,
			goalId: '',
			priority: 'medium',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiresReview: true,
			desiredRoleId: '',
			artifactPath: project.defaultArtifactRoot
		});

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project],
			tasks: [task]
		}));

		const createdGoal = await agentApiModule.createAgentApiGoal({
			name: 'Improve goal API',
			summary: 'Expose goal mutations to managed runs',
			projectIds: [project.id],
			taskIds: [task.id]
		});

		expect(createdGoal).toEqual(
			expect.objectContaining({
				name: 'Improve goal API',
				projectIds: [project.id],
				taskIds: [task.id],
				artifactPath: resolve(root, 'app', 'agent_output')
			})
		);

		const updatedGoal = await agentApiModule.updateAgentApiGoal(createdGoal.id, {
			status: 'running',
			successSignal: 'Agents can create and maintain goals through AMS',
			targetDate: '2026-05-01'
		});
		const loaded = await controlPlaneModule.loadControlPlane();
		const linkedTask = loaded.tasks.find((candidate) => candidate.id === task.id);

		expect(updatedGoal).toEqual(
			expect.objectContaining({
				id: createdGoal.id,
				status: 'running',
				successSignal: 'Agents can create and maintain goals through AMS',
				targetDate: '2026-05-01'
			})
		);
		expect(linkedTask).toEqual(
			expect.objectContaining({
				id: 'task_linked',
				goalId: createdGoal.id
			})
		);
		expect(loaded.decisions?.[0]).toEqual(
			expect.objectContaining({
				goalId: createdGoal.id,
				decisionType: 'goal_plan_updated'
			})
		);
	});

	it('creates and updates projects for agent control-plane access', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });
		mkdirSync(resolve(root, 'app', 'repo'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const agentApiModule = await importAgentApiModule();
		const parentProject = {
			...controlPlaneModule.createProject({
				name: 'Platform',
				summary: 'Parent project'
			}),
			id: 'project_platform'
		};

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [parentProject]
		}));

		const createdProject = await agentApiModule.createAgentApiProject({
			name: 'Agent App',
			summary: 'Child project',
			parentProjectId: parentProject.id,
			projectRootFolder: resolve(root, 'app'),
			defaultArtifactRoot: resolve(root, 'app', 'agent_output'),
			defaultRepoPath: resolve(root, 'app', 'repo'),
			additionalWritableRoots: [resolve(root, 'shared')],
			defaultThreadSandbox: 'danger-full-access',
			defaultModel: ' gpt-5.4 '
		});

		expect(createdProject).toEqual(
			expect.objectContaining({
				name: 'Agent App',
				parentProjectId: 'project_platform',
				defaultThreadSandbox: 'danger-full-access',
				defaultModel: 'gpt-5.4'
			})
		);

		const updatedProject = await agentApiModule.updateAgentApiProject(createdProject.id, {
			defaultBranch: 'main',
			defaultRepoUrl: 'https://example.com/agent-app.git',
			defaultThreadSandbox: null,
			defaultModel: null
		});
		const loaded = await controlPlaneModule.loadControlPlane();

		expect(updatedProject).toEqual(
			expect.objectContaining({
				id: createdProject.id,
				defaultBranch: 'main',
				defaultRepoUrl: 'https://example.com/agent-app.git',
				defaultThreadSandbox: null,
				defaultModel: null
			})
		);
		expect(loaded.projects).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: createdProject.id,
					defaultBranch: 'main'
				})
			])
		);
	});

	it('attaches files and opens reviews for tasks through the agent API', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const agentApiModule = await importAgentApiModule();
		const project = {
			...controlPlaneModule.createProject({
				name: 'Agent App',
				summary: 'App project',
				projectRootFolder: resolve(root, 'app'),
				defaultArtifactRoot: resolve(root, 'app', 'agent_output')
			}),
			id: 'project_app'
		};
		const task = controlPlaneModule.createTask({
			id: 'task_attach_review',
			title: 'Prepare reviewable output',
			summary: 'Create an artifact and request review',
			projectId: project.id,
			goalId: '',
			priority: 'medium',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiresReview: true,
			desiredRoleId: '',
			artifactPath: project.defaultArtifactRoot
		});
		const sourcePath = resolve(root, 'notes.md');
		writeFileSync(sourcePath, '# Artifact\n');

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project],
			tasks: [task]
		}));

		const attachResult = await agentApiModule.attachAgentApiTaskFile(task.id, {
			path: sourcePath
		});

		expect(attachResult).toEqual(
			expect.objectContaining({
				taskId: task.id,
				attachmentId: expect.any(String),
				attachment: expect.objectContaining({
					name: 'notes.md',
					sizeBytes: 11
				})
			})
		);

		const reviewResult = await agentApiModule.requestAgentApiTaskReview(task.id, {
			summary: 'Artifact is ready for operator review.'
		});
		const loaded = await controlPlaneModule.loadControlPlane();
		const updatedTask = loaded.tasks.find((candidate) => candidate.id === task.id);

		expect(reviewResult).toEqual(
			expect.objectContaining({
				taskId: task.id,
				reviewId: expect.any(String)
			})
		);
		expect(updatedTask).toEqual(
			expect.objectContaining({
				id: task.id,
				status: 'review'
			})
		);
		expect(updatedTask?.attachments).toEqual([
			expect.objectContaining({
				id: attachResult.attachmentId
			})
		]);
	});

	it('decomposes tasks into delegated child tasks through the agent API', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const agentApiModule = await importAgentApiModule();
		const project = {
			...controlPlaneModule.createProject({
				name: 'Agent App',
				summary: 'App project',
				projectRootFolder: resolve(root, 'app'),
				defaultArtifactRoot: resolve(root, 'app', 'agent_output')
			}),
			id: 'project_app'
		};
		const role = {
			...controlPlaneModule.createRole({
				name: 'Implementer',
				description: 'Handles implementation work'
			}),
			id: 'role_impl'
		};
		const task = controlPlaneModule.createTask({
			id: 'task_parent',
			title: 'Deliver feature',
			summary: 'Ship the next feature slice',
			projectId: project.id,
			goalId: '',
			priority: 'high',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiresReview: true,
			desiredRoleId: role.id,
			artifactPath: project.defaultArtifactRoot
		});

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project],
			roles: [role],
			tasks: [task]
		}));

		const result = await agentApiModule.decomposeAgentApiTask(task.id, {
			children: [
				{
					title: 'Implement API route',
					instructions: 'Build the machine-readable route.',
					desiredRoleId: role.id,
					delegationObjective: 'Implement the route cleanly.',
					delegationExpectedDeliverable: 'Merged route implementation.',
					delegationDoneCondition: 'Route exists with tests.'
				},
				{
					title: 'Verify behavior',
					instructions: 'Add or update tests.',
					desiredRoleId: role.id,
					delegationObjective: 'Verify the route behavior.',
					delegationExpectedDeliverable: 'Passing verification.',
					delegationDoneCondition: 'Relevant tests pass.'
				}
			]
		});
		const loaded = await controlPlaneModule.loadControlPlane();
		const childTasks = loaded.tasks.filter((candidate) => candidate.parentTaskId === task.id);

		expect(result).toEqual(
			expect.objectContaining({
				taskId: task.id,
				createdChildCount: 2
			})
		);
		expect(childTasks).toHaveLength(2);
		expect(loaded.decisions?.[0]).toEqual(
			expect.objectContaining({
				taskId: task.id,
				decisionType: 'task_decomposed'
			})
		);
	});

	it('removes task attachments and requests approval through the agent API', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const agentApiModule = await importAgentApiModule();
		const project = {
			...controlPlaneModule.createProject({
				name: 'Agent App',
				summary: 'App project',
				projectRootFolder: resolve(root, 'app'),
				defaultArtifactRoot: resolve(root, 'app', 'agent_output')
			}),
			id: 'project_app'
		};
		const task = controlPlaneModule.createTask({
			id: 'task_approval',
			title: 'Prepare approval package',
			summary: 'Attach output and request approval',
			projectId: project.id,
			goalId: '',
			priority: 'medium',
			riskLevel: 'medium',
			approvalMode: 'before_complete',
			requiresReview: true,
			desiredRoleId: '',
			artifactPath: project.defaultArtifactRoot
		});
		const sourcePath = resolve(root, 'approval-notes.md');
		writeFileSync(sourcePath, 'approval');

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project],
			tasks: [task]
		}));

		const attachResult = await agentApiModule.attachAgentApiTaskFile(task.id, {
			path: sourcePath
		});
		const removeResult = await agentApiModule.removeAgentApiTaskAttachment(
			task.id,
			attachResult.attachmentId
		);
		const approvalResult = await agentApiModule.requestAgentApiTaskApproval(task.id, {
			summary: 'Ready for before-complete approval.'
		});
		const loaded = await controlPlaneModule.loadControlPlane();
		const updatedTask = loaded.tasks.find((candidate) => candidate.id === task.id);

		expect(attachResult).toEqual(
			expect.objectContaining({
				taskId: task.id,
				attachmentId: expect.any(String),
				attachmentCount: 1,
				attachments: [
					expect.objectContaining({
						id: attachResult.attachmentId
					})
				]
			})
		);
		expect(removeResult).toEqual(
			expect.objectContaining({
				taskId: task.id,
				attachmentId: attachResult.attachmentId,
				attachmentCount: 0,
				attachments: []
			})
		);
		expect(updatedTask?.attachments).toEqual([]);
		expect(approvalResult).toEqual(
			expect.objectContaining({
				taskId: task.id,
				approvalId: expect.any(String)
			})
		);
		expect(loaded.approvals?.[0]).toEqual(
			expect.objectContaining({
				taskId: task.id,
				mode: 'before_complete',
				status: 'pending'
			})
		);
	});

	it('previews approval requests and decomposition without mutating control-plane state', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const agentApiModule = await importAgentApiModule();
		const project = {
			...controlPlaneModule.createProject({
				name: 'Agent App',
				summary: 'App project',
				projectRootFolder: resolve(root, 'app'),
				defaultArtifactRoot: resolve(root, 'app', 'agent_output')
			}),
			id: 'project_app'
		};
		const role = {
			...controlPlaneModule.createRole({
				name: 'Implementer',
				description: 'Handles implementation work'
			}),
			id: 'role_impl'
		};
		const task = controlPlaneModule.createTask({
			id: 'task_preview',
			title: 'Preview me',
			summary: 'Validate approval and decomposition first',
			projectId: project.id,
			goalId: '',
			priority: 'medium',
			riskLevel: 'medium',
			approvalMode: 'before_complete',
			requiresReview: true,
			desiredRoleId: role.id,
			artifactPath: project.defaultArtifactRoot
		});

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project],
			roles: [role],
			tasks: [task]
		}));

		const reviewPreview = await agentApiModule.previewAgentApiTaskReviewRequest(task.id, {
			summary: 'Ready for review.'
		});
		const approvalPreview = await agentApiModule.previewAgentApiTaskApprovalRequest(task.id, {
			summary: 'Ready for approval.'
		});
		const decompositionPreview = await agentApiModule.previewAgentApiTaskDecomposition(task.id, {
			children: [
				{
					title: 'Implement API route',
					instructions: 'Build the machine-readable route.',
					desiredRoleId: role.id,
					delegationObjective: 'Implement the route cleanly.',
					delegationExpectedDeliverable: 'Merged route implementation.',
					delegationDoneCondition: 'Route exists with tests.'
				}
			]
		});
		const loaded = await controlPlaneModule.loadControlPlane();

		expect(reviewPreview).toEqual(
			expect.objectContaining({
				validationOnly: true,
				valid: true,
				action: 'requestReview',
				taskId: task.id,
				suggestedNextCommands: expect.arrayContaining(['task:request-review'])
			})
		);
		expect(approvalPreview).toEqual(
			expect.objectContaining({
				validationOnly: true,
				valid: true,
				action: 'requestApproval',
				taskId: task.id,
				suggestedNextCommands: expect.arrayContaining(['task:request-approval'])
			})
		);
		expect(decompositionPreview).toEqual(
			expect.objectContaining({
				validationOnly: true,
				valid: true,
				action: 'decomposeTask',
				taskId: task.id
			})
		);
		expect(loaded.reviews).toEqual([]);
		expect(loaded.approvals).toEqual([]);
		expect(loaded.tasks.filter((candidate) => candidate.parentTaskId === task.id)).toEqual([]);
	});

	it('previews review, approval, and child-handoff decisions without mutating state', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const agentApiModule = await importAgentApiModule();
		const project = {
			...controlPlaneModule.createProject({
				name: 'Agent App',
				summary: 'App project',
				projectRootFolder: resolve(root, 'app'),
				defaultArtifactRoot: resolve(root, 'app', 'agent_output')
			}),
			id: 'project_app'
		};
		const parentTask = controlPlaneModule.createTask({
			id: 'task_parent_preview',
			title: 'Parent task',
			summary: 'Owns delegated work',
			projectId: project.id,
			goalId: '',
			priority: 'medium',
			riskLevel: 'medium',
			approvalMode: 'before_complete',
			requiresReview: true,
			desiredRoleId: '',
			artifactPath: project.defaultArtifactRoot
		});
		const childTask = controlPlaneModule.createTask({
			id: 'task_child_preview',
			title: 'Child task',
			summary: 'Delegated work',
			projectId: project.id,
			goalId: '',
			parentTaskId: parentTask.id,
			priority: 'medium',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiresReview: false,
			desiredRoleId: '',
			status: 'done',
			artifactPath: project.defaultArtifactRoot
		});
		const now = new Date().toISOString();
		const review = controlPlaneModule.createReview({
			taskId: parentTask.id,
			runId: null,
			summary: 'Review pending.'
		});
		const approval = controlPlaneModule.createApproval({
			taskId: parentTask.id,
			runId: null,
			mode: 'before_complete',
			summary: 'Approval pending.'
		});

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project],
			tasks: [parentTask, childTask],
			reviews: [{ ...review, createdAt: now, updatedAt: now }],
			approvals: [{ ...approval, createdAt: now, updatedAt: now }]
		}));

		const reviewDecisionPreview = await agentApiModule.previewAgentApiTaskReviewDecision(
			parentTask.id,
			'approve'
		);
		const approvalDecisionPreview = await agentApiModule.previewAgentApiTaskApprovalDecision(
			parentTask.id,
			'reject'
		);
		const childHandoffPreview = await agentApiModule.previewAgentApiTaskChildHandoffDecision(
			parentTask.id,
			{ childTaskId: childTask.id },
			'accept'
		);
		const loaded = await controlPlaneModule.loadControlPlane();

		expect(reviewDecisionPreview).toEqual(
			expect.objectContaining({
				validationOnly: true,
				valid: true,
				action: 'approveReview',
				taskId: parentTask.id
			})
		);
		expect(approvalDecisionPreview).toEqual(
			expect.objectContaining({
				validationOnly: true,
				valid: true,
				action: 'rejectApproval',
				taskId: parentTask.id
			})
		);
		expect(childHandoffPreview).toEqual(
			expect.objectContaining({
				validationOnly: true,
				valid: true,
				action: 'acceptChildHandoff',
				taskId: parentTask.id
			})
		);
		expect(loaded.reviews[0]?.status).toBe('open');
		expect(loaded.approvals[0]?.status).toBe('pending');
		expect(
			loaded.tasks.find((candidate) => candidate.id === childTask.id)?.delegationAcceptance
		).toBeNull();
	});

	it('approves open reviews through the agent API', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const agentApiModule = await importAgentApiModule();
		const project = {
			...controlPlaneModule.createProject({
				name: 'Agent App',
				summary: 'App project',
				projectRootFolder: resolve(root, 'app'),
				defaultArtifactRoot: resolve(root, 'app', 'agent_output')
			}),
			id: 'project_app'
		};
		const task = controlPlaneModule.createTask({
			id: 'task_review_approve',
			title: 'Review me',
			summary: 'Needs a review decision',
			projectId: project.id,
			goalId: '',
			priority: 'medium',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiresReview: true,
			desiredRoleId: '',
			artifactPath: project.defaultArtifactRoot
		});

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project],
			tasks: [task]
		}));

		await agentApiModule.requestAgentApiTaskReview(task.id, {
			summary: 'Please review this task.'
		});
		const result = await agentApiModule.approveAgentApiTaskReview(task.id);
		const loaded = await controlPlaneModule.loadControlPlane();
		const updatedTask = loaded.tasks.find((candidate) => candidate.id === task.id);

		expect(result).toEqual(
			expect.objectContaining({
				taskId: task.id,
				successAction: 'approveReview'
			})
		);
		expect(updatedTask).toEqual(
			expect.objectContaining({
				id: task.id,
				status: 'done'
			})
		);
		expect(loaded.reviews?.[0]).toEqual(
			expect.objectContaining({
				taskId: task.id,
				status: 'approved'
			})
		);
	});

	it('rejects pending approvals through the agent API', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const agentApiModule = await importAgentApiModule();
		const project = {
			...controlPlaneModule.createProject({
				name: 'Agent App',
				summary: 'App project',
				projectRootFolder: resolve(root, 'app'),
				defaultArtifactRoot: resolve(root, 'app', 'agent_output')
			}),
			id: 'project_app'
		};
		const task = controlPlaneModule.createTask({
			id: 'task_approval_reject',
			title: 'Approval needed',
			summary: 'Needs an approval decision',
			projectId: project.id,
			goalId: '',
			priority: 'medium',
			riskLevel: 'medium',
			approvalMode: 'before_complete',
			requiresReview: true,
			desiredRoleId: '',
			artifactPath: project.defaultArtifactRoot
		});

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project],
			tasks: [task]
		}));

		await agentApiModule.requestAgentApiTaskApproval(task.id, {
			summary: 'Please approve completion.'
		});
		const result = await agentApiModule.rejectAgentApiTaskApproval(task.id);
		const loaded = await controlPlaneModule.loadControlPlane();
		const updatedTask = loaded.tasks.find((candidate) => candidate.id === task.id);

		expect(result).toEqual(
			expect.objectContaining({
				taskId: task.id,
				successAction: 'rejectApproval'
			})
		);
		expect(updatedTask).toEqual(
			expect.objectContaining({
				id: task.id,
				status: 'blocked'
			})
		);
		expect(loaded.approvals?.[0]).toEqual(
			expect.objectContaining({
				taskId: task.id,
				status: 'rejected'
			})
		);
	});

	it('accepts delegated child handoffs through the agent API', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const agentApiModule = await importAgentApiModule();
		const project = {
			...controlPlaneModule.createProject({
				name: 'Agent App',
				summary: 'App project',
				projectRootFolder: resolve(root, 'app'),
				defaultArtifactRoot: resolve(root, 'app', 'agent_output')
			}),
			id: 'project_app'
		};
		const parentTask = controlPlaneModule.createTask({
			id: 'task_parent_handoff',
			title: 'Parent task',
			summary: 'Receives child handoff',
			projectId: project.id,
			goalId: '',
			priority: 'medium',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiresReview: true,
			desiredRoleId: '',
			artifactPath: project.defaultArtifactRoot
		});
		const childTask = {
			...controlPlaneModule.createTask({
				id: 'task_child_handoff',
				title: 'Child task',
				summary: 'Completed delegated work',
				projectId: project.id,
				goalId: '',
				parentTaskId: parentTask.id,
				priority: 'medium',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: true,
				desiredRoleId: '',
				artifactPath: project.defaultArtifactRoot
			}),
			status: 'done' as const
		};

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project],
			tasks: [parentTask, childTask]
		}));

		const result = await agentApiModule.acceptAgentApiTaskChildHandoff(parentTask.id, {
			childTaskId: childTask.id
		});
		const loaded = await controlPlaneModule.loadControlPlane();
		const updatedChildTask = loaded.tasks.find((candidate) => candidate.id === childTask.id);

		expect(result).toEqual(
			expect.objectContaining({
				taskId: parentTask.id,
				childTaskId: childTask.id,
				successAction: 'acceptChildHandoff'
			})
		);
		expect(updatedChildTask?.delegationAcceptance).toEqual(
			expect.objectContaining({
				summary: expect.stringContaining('Accepted child handoff')
			})
		);
	});

	it('requests child handoff follow-up through the agent API', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const agentApiModule = await importAgentApiModule();
		const project = {
			...controlPlaneModule.createProject({
				name: 'Agent App',
				summary: 'App project',
				projectRootFolder: resolve(root, 'app'),
				defaultArtifactRoot: resolve(root, 'app', 'agent_output')
			}),
			id: 'project_app'
		};
		const parentTask = controlPlaneModule.createTask({
			id: 'task_parent_followup',
			title: 'Parent task',
			summary: 'Requests more work',
			projectId: project.id,
			goalId: '',
			priority: 'medium',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiresReview: true,
			desiredRoleId: '',
			artifactPath: project.defaultArtifactRoot
		});
		const childTask = {
			...controlPlaneModule.createTask({
				id: 'task_child_followup',
				title: 'Child task',
				summary: 'Needs follow-up',
				projectId: project.id,
				goalId: '',
				parentTaskId: parentTask.id,
				priority: 'medium',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: true,
				desiredRoleId: '',
				artifactPath: project.defaultArtifactRoot
			}),
			status: 'done' as const
		};

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project],
			tasks: [parentTask, childTask]
		}));

		const result = await agentApiModule.requestAgentApiTaskChildHandoffChanges(parentTask.id, {
			childTaskId: childTask.id,
			summary: 'Please address the missing integration detail.'
		});
		const loaded = await controlPlaneModule.loadControlPlane();
		const updatedChildTask = loaded.tasks.find((candidate) => candidate.id === childTask.id);

		expect(result).toEqual(
			expect.objectContaining({
				taskId: parentTask.id,
				childTaskId: childTask.id,
				successAction: 'requestChildHandoffChanges'
			})
		);
		expect(updatedChildTask).toEqual(
			expect.objectContaining({
				id: childTask.id,
				status: 'blocked',
				blockedReason: 'Please address the missing integration detail.'
			})
		);
	});
});
