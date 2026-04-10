import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mkdir, readFile, writeFile } = vi.hoisted(() => ({
	mkdir: vi.fn(),
	readFile: vi.fn(),
	writeFile: vi.fn()
}));

vi.mock('node:fs/promises', () => ({
	mkdir,
	readFile,
	writeFile
}));

import { loadControlPlane } from './control-plane';

describe('control-plane project migration', () => {
	beforeEach(() => {
		mkdir.mockReset();
		readFile.mockReset();
		writeFile.mockReset();
		vi.unstubAllEnvs();
		vi.stubEnv('NODE_ENV', 'test');
		vi.stubEnv('APP_STORAGE_BACKEND', 'json');
	});

	it('maps legacy defaultCoordinationFolder into projectRootFolder', async () => {
		readFile.mockResolvedValue(
			JSON.stringify({
				providers: [
					{
						id: 'provider_local_codex',
						name: 'Local Codex ExecutionSurface',
						kind: 'local',
						description: 'Runs on the Mac and can access local repos.'
					}
				],
				roles: [],
				projects: [
					{
						id: 'project_legacy',
						name: 'Legacy project',
						area: 'product',
						summary: 'older saved shape',
						defaultCoordinationFolder: '/tmp/legacy-root',
						defaultArtifactRoot: '/tmp/artifacts',
						defaultRepoPath: '/tmp/repo',
						defaultRepoUrl: 'git@github.com:org/repo.git',
						defaultBranch: 'main'
					}
				],
				goals: [],
				executionSurfaces: [],
				tasks: [],
				runs: []
			})
		);

		const data = await loadControlPlane();

		expect(data.projects).toEqual([
			expect.objectContaining({
				id: 'project_legacy',
				projectRootFolder: '/tmp/legacy-root',
				defaultArtifactRoot: '/tmp/artifacts',
				defaultRepoPath: '/tmp/repo',
				defaultRepoUrl: 'git@github.com:org/repo.git',
				defaultBranch: 'main'
			})
		]);
		expect(data.providers).toEqual([
			expect.objectContaining({
				id: 'provider_local_codex',
				service: 'OpenAI',
				authMode: 'local_cli',
				setupStatus: 'connected',
				enabled: true,
				launcher: 'codex',
				defaultThreadSandbox: 'workspace-write'
			})
		]);
	});

	it('normalizes quoted project paths while loading persisted data', async () => {
		readFile.mockResolvedValue(
			JSON.stringify({
				providers: [],
				roles: [],
				projects: [
					{
						id: 'project_quoted',
						name: 'Quoted project',
						summary: 'saved from copied shell output',
						projectRootFolder: "'/tmp/quoted-root'",
						defaultArtifactRoot: '"/tmp/quoted-root/agent_output"',
						defaultRepoPath: "'/tmp/checkouts/quoted'"
					}
				],
				goals: [],
				executionSurfaces: [],
				tasks: [],
				runs: [],
				reviews: [],
				approvals: []
			})
		);

		const data = await loadControlPlane();

		expect(data.projects).toEqual([
			expect.objectContaining({
				id: 'project_quoted',
				projectRootFolder: '/tmp/quoted-root',
				defaultArtifactRoot: '/tmp/quoted-root/agent_output',
				defaultRepoPath: '/tmp/checkouts/quoted'
			})
		]);
	});

	it('infers task execution state from persisted runs when task fields are stale or missing', async () => {
		readFile.mockResolvedValue(
			JSON.stringify({
				providers: [],
				roles: [],
				projects: [
					{
						id: 'project_1',
						name: 'Prototype',
						summary: 'project',
						projectRootFolder: '/tmp/project'
					}
				],
				goals: [],
				executionSurfaces: [],
				tasks: [
					{
						id: 'task_1',
						title: 'Follow-up work',
						summary: 'continue the same context',
						projectId: 'project_1',
						area: 'product',
						goalId: '',
						priority: 'medium',
						status: 'running',
						riskLevel: 'medium',
						approvalMode: 'none',
						requiresReview: true,
						desiredRoleId: '',
						assigneeExecutionSurfaceId: null,
						blockedReason: '',
						dependencyTaskIds: [],
						runCount: 0,
						latestRunId: null,
						artifactPath: '/tmp/project/out',
						createdAt: '2026-03-26T00:00:00.000Z',
						updatedAt: '2026-03-26T00:00:00.000Z'
					}
				],
				runs: [
					{
						id: 'run_1',
						taskId: 'task_1',
						executionSurfaceId: null,
						providerId: null,
						status: 'completed',
						createdAt: '2026-03-26T00:00:00.000Z',
						updatedAt: '2026-03-26T00:10:00.000Z',
						startedAt: '2026-03-26T00:00:00.000Z',
						endedAt: '2026-03-26T00:10:00.000Z',
						threadId: 'thread_1',
						agentThreadId: 'session_1',
						promptDigest: 'abc123',
						artifactPaths: [],
						summary: 'Completed.',
						lastHeartbeatAt: null,
						errorSummary: ''
					}
				],
				reviews: [],
				approvals: []
			})
		);

		const data = await loadControlPlane();

		expect(data.tasks).toEqual([
			expect.objectContaining({
				id: 'task_1',
				status: 'in_progress',
				agentThreadId: null,
				runCount: 1,
				latestRunId: 'run_1',
				attachments: []
			})
		]);
	});
});
