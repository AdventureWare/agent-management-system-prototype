import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();
const tempDirs: string[] = [];

function createTempDir() {
	const path = mkdtempSync(join(tmpdir(), 'ams-agent-intents-'));
	tempDirs.push(path);
	return path;
}

async function importControlPlaneModule() {
	vi.resetModules();
	return import('./control-plane');
}

async function importIntentModule() {
	return import('./agent-intent-actions');
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

describe('agent-intent-actions', () => {
	it('prepares a task for approval with readback context in one call', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const intentModule = await importIntentModule();
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
				id: 'task_intent',
				title: 'Prepare approval packet',
				summary: 'Need final sign-off',
				projectId: project.id,
				goalId: '',
				priority: 'high',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: false,
				desiredRoleId: '',
				artifactPath: project.defaultArtifactRoot,
				status: 'done'
			})
		};

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project],
			tasks: [task]
		}));

		const result = await intentModule.runAgentIntent('prepare_task_for_approval', {
			taskId: task.id,
			approval: {
				mode: 'before_complete',
				summary: 'Ready for final sign-off.'
			}
		});

		if ('validationOnly' in result) {
			throw new Error('Expected a real mutation result, received validation preview.');
		}

		expect(result.intent).toBe('prepare_task_for_approval');
		expect(result.executedCommands).toEqual([
			'context:current',
			'task:request-approval',
			'context:current'
		]);
		expect(result.beforeContext.governance.pendingApproval).toBeFalsy();
		expect(result.afterContext.governance.pendingApproval).toEqual(
			expect.objectContaining({
				status: 'pending',
				summary: 'Ready for final sign-off.'
			})
		);
	});

	it('returns a structured error for unknown intents', async () => {
		const intentModule = await importIntentModule();

		await expect(intentModule.runAgentIntent('not_a_real_intent', {})).rejects.toMatchObject({
			status: 404,
			code: 'intent_not_found'
		});
	});

	it('previews task review preparation without creating a review', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const intentModule = await importIntentModule();
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
				id: 'task_review_preview',
				title: 'Prepare review packet',
				summary: 'Need review soon',
				projectId: project.id,
				goalId: '',
				priority: 'high',
				riskLevel: 'medium',
				approvalMode: 'none',
				requiresReview: true,
				desiredRoleId: '',
				artifactPath: project.defaultArtifactRoot
			})
		};

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project],
			tasks: [task]
		}));

		const result = await intentModule.runAgentIntent(
			'prepare_task_for_review',
			{
				taskId: task.id,
				review: { summary: 'Ready for review.' }
			},
			{ validateOnly: true }
		);
		const loaded = await controlPlaneModule.loadControlPlane();

		expect(result).toEqual(
			expect.objectContaining({
				intent: 'prepare_task_for_review',
				validationOnly: true,
				valid: true,
				wouldExecuteCommands: ['context:current', 'task:request-review', 'context:current']
			})
		);
		expect(loaded.reviews).toEqual([]);
	});

	it('coordinates with another thread through one intent call', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		vi.stubEnv('AMS_AGENT_THREAD_ID', 'thread_source');

		const intentModule = await importIntentModule();
		const agentThreadsModule = await import('./agent-threads');
		const loadAgentCurrentContext = vi
			.spyOn(await import('./agent-current-context'), 'loadAgentCurrentContext')
			.mockResolvedValue({
				resolved: { threadId: 'thread_source', taskId: null, runId: null },
				task: null,
				run: null,
				project: null,
				goal: null,
				thread: null,
				governance: { openReview: null, pendingApproval: null },
				summary: { recommendedNextActions: [] }
			} as never);
		const listThreadsSpy = vi.spyOn(agentThreadsModule, 'listAgentThreads').mockResolvedValue([
			{
				id: 'thread_source',
				name: 'Source thread',
				handle: 'source',
				canResume: true,
				hasActiveRun: false
			},
			{
				id: 'thread_target',
				name: 'Target thread',
				handle: 'target',
				canResume: true,
				hasActiveRun: false,
				routingReason: 'Matches role researcher'
			}
		] as never);
		const contactSpy = vi.spyOn(agentThreadsModule, 'contactAgentThread').mockResolvedValue({
			agentThreadId: 'thread_target',
			runId: 'run_contact',
			contactId: 'contact_123'
		} as never);
		const contactsSpy = vi
			.spyOn(agentThreadsModule, 'listAgentThreadContacts')
			.mockResolvedValue([
				{
					id: 'contact_123',
					sourceAgentThreadId: 'thread_source',
					targetAgentThreadId: 'thread_target'
				}
			] as never);

		const result = await intentModule.runAgentIntent('coordinate_with_another_thread', {
			targetThreadIdOrHandle: 'target',
			prompt: 'Need a review pass on the latest artifact.',
			type: 'review_request',
			context: 'Focus on correctness and risk.'
		});

		if ('validationOnly' in result) {
			throw new Error('Expected a real mutation result, received validation preview.');
		}

		expect(result.intent).toBe('coordinate_with_another_thread');
		expect(result.executedCommands).toEqual([
			'context:current',
			'thread:contact',
			'thread:contacts',
			'context:current'
		]);
		expect(listThreadsSpy).toHaveBeenCalled();
		expect(contactSpy).toHaveBeenCalledWith('thread_source', {
			targetAgentThreadId: 'thread_target',
			prompt: 'Need a review pass on the latest artifact.',
			contactType: 'review_request',
			contextSummary: 'Focus on correctness and risk.',
			replyRequested: undefined,
			replyToContactId: undefined
		});
		expect(contactsSpy).toHaveBeenCalledWith({ threadId: 'thread_source', limit: 10 });
		expect(loadAgentCurrentContext).toHaveBeenCalledTimes(2);
		expect(result.result).toEqual(
			expect.objectContaining({
				target: expect.objectContaining({
					id: 'thread_target',
					handle: 'target'
				}),
				contact: expect.objectContaining({
					contactId: 'contact_123'
				}),
				contacts: expect.any(Array)
			})
		);
	});

	it('previews thread coordination without sending the contact', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		vi.stubEnv('AMS_AGENT_THREAD_ID', 'thread_source');

		const intentModule = await importIntentModule();
		const agentThreadsModule = await import('./agent-threads');
		vi.spyOn(await import('./agent-current-context'), 'loadAgentCurrentContext').mockResolvedValue({
			resolved: { threadId: 'thread_source', taskId: null, runId: null },
			task: null,
			run: null,
			project: null,
			goal: null,
			thread: null,
			governance: { openReview: null, pendingApproval: null },
			summary: { recommendedNextActions: [] }
		} as never);
		vi.spyOn(agentThreadsModule, 'listAgentThreads').mockResolvedValue([
			{
				id: 'thread_source',
				name: 'Source thread',
				handle: 'source',
				canResume: true,
				hasActiveRun: false
			},
			{
				id: 'thread_target',
				name: 'Target thread',
				handle: 'target',
				canResume: true,
				hasActiveRun: false,
				archivedAt: null,
				routingReason: 'Matches role researcher'
			}
		] as never);
		const contactSpy = vi.spyOn(agentThreadsModule, 'contactAgentThread');
		vi.spyOn(agentThreadsModule, 'getAgentThread').mockImplementation(async (threadId: string) => {
			if (threadId === 'thread_source') {
				return {
					id: 'thread_source',
					name: 'Source thread',
					handle: 'source'
				} as never;
			}

			return {
				id: 'thread_target',
				name: 'Target thread',
				handle: 'target',
				hasActiveRun: false,
				canResume: true,
				archivedAt: null
			} as never;
		});

		const result = await intentModule.runAgentIntent(
			'coordinate_with_another_thread',
			{
				targetThreadIdOrHandle: 'target',
				prompt: 'Need a review pass on the latest artifact.'
			},
			{ validateOnly: true }
		);

		expect(result).toEqual(
			expect.objectContaining({
				intent: 'coordinate_with_another_thread',
				validationOnly: true,
				valid: true,
				wouldExecuteCommands: [
					'context:current',
					'thread:contact',
					'thread:contacts',
					'context:current'
				]
			})
		);
		expect(contactSpy).not.toHaveBeenCalled();
	});

	it('previews child handoff acceptance without changing the child task', async () => {
		const root = createTempDir();
		process.chdir(root);
		vi.stubEnv('APP_STORAGE_BACKEND', 'sqlite');
		mkdirSync(resolve(root, 'app', 'agent_output'), { recursive: true });

		const controlPlaneModule = await importControlPlaneModule();
		const intentModule = await importIntentModule();
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
			id: 'task_parent',
			title: 'Parent task',
			summary: 'Collect delegated work',
			projectId: project.id,
			goalId: '',
			priority: 'medium',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiresReview: false,
			desiredRoleId: '',
			artifactPath: project.defaultArtifactRoot
		});
		const childTask = controlPlaneModule.createTask({
			id: 'task_child',
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

		await applyControlPlaneUpdate(controlPlaneModule, (data) => ({
			...data,
			projects: [project],
			tasks: [parentTask, childTask]
		}));

		const result = await intentModule.runAgentIntent(
			'accept_child_handoff',
			{
				parentTaskId: parentTask.id,
				childTaskId: childTask.id
			},
			{ validateOnly: true }
		);
		const loaded = await controlPlaneModule.loadControlPlane();
		const reloadedChildTask = loaded.tasks.find((candidate) => candidate.id === childTask.id);

		expect(result).toEqual(
			expect.objectContaining({
				intent: 'accept_child_handoff',
				validationOnly: true,
				valid: true,
				wouldExecuteCommands: ['context:current', 'task:accept-child-handoff', 'context:current']
			})
		);
		expect(reloadedChildTask?.delegationAcceptance).toBeNull();
	});
});
