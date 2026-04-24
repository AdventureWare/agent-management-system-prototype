import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
	vi.resetModules();
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('ams-cli', () => {
	it('resolves the current task from managed-run context for task writeback commands', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		vi.stubEnv('AMS_AGENT_THREAD_ID', 'thread_source');
		vi.stubEnv('AMS_AGENT_TASK_ID', '');
		vi.stubEnv('AMS_AGENT_RUN_ID', '');
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					resolved: { taskId: 'task_current' }
				})
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					task: { id: 'task_current' },
					review: { status: 'pending' }
				})
			});
		vi.stubGlobal('fetch', fetchMock);
		const stdoutWrite = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

		const { runCli } = await import('../../../scripts/ams-cli.mjs');
		await runCli([
			'task',
			'request-review',
			'--json',
			JSON.stringify({ summary: 'Ready for review.', validateOnly: true })
		]);

		expect(fetchMock).toHaveBeenNthCalledWith(
			1,
			new URL('http://127.0.0.1:3000/api/agent-context/current?threadId=thread_source'),
			expect.objectContaining({
				headers: expect.objectContaining({
					authorization: 'Bearer test-token'
				})
			})
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			new URL('http://127.0.0.1:3000/api/tasks/task_current/review-request'),
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ summary: 'Ready for review.', validateOnly: true })
			})
		);
		expect(stdoutWrite).toHaveBeenCalled();
	});

	it('fails clearly when the managed-run context cannot resolve a current task', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		vi.stubEnv('AMS_AGENT_THREAD_ID', 'thread_source');
		vi.stubEnv('AMS_AGENT_TASK_ID', '');
		vi.stubEnv('AMS_AGENT_RUN_ID', '');
		const fetchMock = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				resolved: { taskId: null }
			})
		});
		vi.stubGlobal('fetch', fetchMock);

		const { runCli } = await import('../../../scripts/ams-cli.mjs');

		await expect(
			runCli([
				'task',
				'request-approval',
				'--json',
				JSON.stringify({ summary: 'Ready for approval.' })
			])
		).rejects.toThrow(
			'No task could be resolved from the current managed-run context. Run `node scripts/ams-cli.mjs context current` to inspect the available thread/task/run ids or pass the id explicitly.'
		);
	});
});
