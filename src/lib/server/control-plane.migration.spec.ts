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
	});

	it('maps legacy defaultCoordinationFolder into projectRootFolder', async () => {
		readFile.mockResolvedValue(
			JSON.stringify({
				providers: [
					{
						id: 'provider_local_codex',
						name: 'Local Codex Worker',
						kind: 'local',
						description: 'Runs on the Mac and can access local repos.'
					}
				],
				roles: [],
				projects: [
					{
						id: 'project_legacy',
						name: 'Legacy project',
						lane: 'product',
						summary: 'older saved shape',
						defaultCoordinationFolder: '/tmp/legacy-root',
						defaultArtifactRoot: '/tmp/artifacts',
						defaultRepoPath: '/tmp/repo',
						defaultRepoUrl: 'git@github.com:org/repo.git',
						defaultBranch: 'main'
					}
				],
				goals: [],
				workers: [],
				tasks: []
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
				launcher: 'codex'
			})
		]);
	});
});
