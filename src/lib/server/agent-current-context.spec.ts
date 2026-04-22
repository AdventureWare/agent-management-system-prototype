import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();
const tempDirs: string[] = [];

function createTempDir() {
	const path = mkdtempSync(join(tmpdir(), 'ams-agent-context-'));
	tempDirs.push(path);
	return path;
}

async function importControlPlaneModule() {
	vi.resetModules();
	return import('./control-plane');
}

async function importAgentCurrentContextModule() {
	return import('./agent-current-context');
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

describe('agent-current-context', () => {
	it('resolves task, run, project, goal, and pending approval context from a task id', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const currentContextModule = await importAgentCurrentContextModule();
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
				name: 'Make AMS agent-usable',
				summary: 'Improve agent comprehension',
				status: 'running',
				artifactPath: resolve(root, 'app', 'agent_output'),
				projectIds: [project.id]
			}),
			id: 'goal_agent'
		};
		const task = {
			...controlPlaneModule.createTask({
				id: 'task_agent',
				title: 'Prepare approval flow',
				summary: 'Get the task ready for approval',
				projectId: project.id,
				goalId: goal.id,
				priority: 'high',
				riskLevel: 'medium',
				approvalMode: 'before_complete',
				requiresReview: false,
				desiredRoleId: '',
				artifactPath: project.defaultArtifactRoot,
				status: 'done'
			}),
			latestRunId: 'run_agent'
		};
		const run = {
			...controlPlaneModule.createRun({
				id: 'run_agent',
				taskId: task.id,
				status: 'completed',
				summary: 'Finished implementation.'
			})
		};
		const approval = {
			...controlPlaneModule.createApproval({
				taskId: task.id,
				runId: run.id,
				mode: 'before_complete',
				summary: 'Awaiting approver sign-off.'
			}),
			id: 'approval_agent'
		};

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project],
			goals: [goal],
			tasks: [task],
			runs: [run],
			approvals: [approval]
		}));

		const context = await currentContextModule.loadAgentCurrentContext({ taskId: task.id });

		expect(context.resolved).toEqual({
			threadId: null,
			taskId: task.id,
			runId: run.id,
			projectId: project.id,
			goalId: goal.id
		});
		expect(context.summary.currentState).toContain('Prepare approval flow');
		expect(context.summary.openGates).toContain('Pending approval: Awaiting approver sign-off.');
		expect(context.summary.recommendedNextActions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					resource: 'context',
					command: 'current',
					stateSignals: expect.any(Array),
					expectedOutcome: expect.stringContaining('canonical current task'),
					suggestedReadbackCommands: ['context:current']
				}),
				expect.objectContaining({
					resource: 'task',
					command: 'approve-approval',
					stateSignals: expect.arrayContaining([
						expect.stringContaining('pending approval'),
						expect.stringContaining('before_complete')
					]),
					expectedOutcome: expect.stringContaining('Resolve the pending approval'),
					suggestedReadbackCommands: expect.arrayContaining(['task:get', 'context:current']),
					shouldValidateFirst: true,
					validationMode: 'validateOnly',
					validationReason: expect.stringContaining('Preview')
				}),
				expect.objectContaining({
					resource: 'task',
					command: 'reject-approval',
					suggestedReadbackCommands: expect.arrayContaining(['task:get', 'context:current']),
					shouldValidateFirst: true,
					validationMode: 'validateOnly'
				})
			])
		);
	});

	it('returns state-specific coordination guidance for in-progress tasks', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const currentContextModule = await importAgentCurrentContextModule();
		const project = {
			...controlPlaneModule.createProject({
				name: 'Agent App',
				summary: 'App project',
				projectRootFolder: resolve(root, 'app'),
				defaultArtifactRoot: resolve(root, 'app', 'agent_output')
			}),
			id: 'project_app'
		};
		const task = {
			...controlPlaneModule.createTask({
				id: 'task_progress',
				title: 'Coordinate thread work',
				summary: 'Need another thread to help',
				projectId: project.id,
				goalId: '',
				priority: 'medium',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: false,
				desiredRoleId: '',
				artifactPath: project.defaultArtifactRoot,
				status: 'in_progress'
			}),
			agentThreadId: 'thread_coordination'
		};

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project],
			tasks: [task]
		}));

		const getAgentThreadSpy = vi
			.spyOn(await import('./agent-threads'), 'getAgentThread')
			.mockResolvedValue({
				id: 'thread_coordination',
				name: 'Coordination thread',
				handle: 'coordination',
				contactLabel: '@coordination',
				threadState: 'working',
				latestRunStatus: 'running',
				hasActiveRun: true,
				canResume: false,
				lastActivityAt: '2026-04-22T13:00:00.000Z'
			} as never);

		const context = await currentContextModule.loadAgentCurrentContext({ taskId: task.id });
		const coordinationAction = context.summary.recommendedNextActions.find(
			(action: { resource: string; command: string }) =>
				action.resource === 'intent' && action.command === 'coordinate_with_another_thread'
		);

		expect(getAgentThreadSpy).toHaveBeenCalled();
		expect(coordinationAction).toEqual(
			expect.objectContaining({
				stateSignals: expect.arrayContaining([
					expect.stringContaining('in_progress'),
					expect.stringContaining('thread_coordination')
				]),
				expectedOutcome: expect.stringContaining('Resolve a target thread'),
				suggestedReadbackCommands: ['thread:contacts', 'context:current'],
				shouldValidateFirst: true,
				validationMode: 'validateOnly',
				validationReason: expect.stringContaining('Cross-thread routing')
			})
		);
	});

	it('returns a structured not-found error for unknown run ids', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');

		const currentContextModule = await importAgentCurrentContextModule();

		await expect(
			currentContextModule.loadAgentCurrentContext({ runId: 'run_missing' })
		).rejects.toMatchObject({
			status: 404,
			message: 'Run not found.',
			code: 'run_not_found',
			suggestedNextCommands: ['task:get', 'context:current'],
			details: { runId: 'run_missing' }
		});
	});

	it('builds a primary guidance hint from risky current-context recommendations', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const currentContextModule = await importAgentCurrentContextModule();
		const project = {
			...controlPlaneModule.createProject({
				name: 'Agent App',
				summary: 'App project',
				projectRootFolder: resolve(root, 'app'),
				defaultArtifactRoot: resolve(root, 'app', 'agent_output')
			}),
			id: 'project_app'
		};
		const task = {
			...controlPlaneModule.createTask({
				id: 'task_hint',
				title: 'Prepare approval flow',
				summary: 'Get the task ready for approval',
				projectId: project.id,
				goalId: '',
				priority: 'high',
				riskLevel: 'medium',
				approvalMode: 'before_complete',
				requiresReview: false,
				desiredRoleId: '',
				artifactPath: project.defaultArtifactRoot,
				status: 'done'
			})
		};
		const run = controlPlaneModule.createRun({
			id: 'run_hint',
			taskId: task.id,
			status: 'completed',
			summary: 'Finished implementation.'
		});
		const approval = {
			...controlPlaneModule.createApproval({
				taskId: task.id,
				runId: run.id,
				mode: 'before_complete',
				summary: 'Awaiting sign-off.'
			}),
			id: 'approval_hint'
		};

		const hint = currentContextModule.buildAgentGuidanceHint({
			task,
			run,
			openReview: null,
			pendingApproval: approval,
			threadId: null
		});

		expect(hint).toMatchObject({
			resource: 'task',
			command: 'approve-approval',
			shouldValidateFirst: true,
			validationMode: 'validateOnly'
		});
	});
});
