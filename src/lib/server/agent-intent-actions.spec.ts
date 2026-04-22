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
});
