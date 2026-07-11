import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
	vi.resetModules();
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('ams-cli', () => {
	it('routes task loop reports through the goal-loop endpoint', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				command: 'get_task_loop_report',
				report: { task: { id: 'task_123' } }
			})
		});
		vi.stubGlobal('fetch', fetchMock);
		const stdoutWrite = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

		const { runCli } = await import('../../../scripts/ams-cli.mjs');
		await runCli(['goal-loop', 'get_task_loop_report', '--task', 'task_123']);

		expect(fetchMock).toHaveBeenCalledWith(
			new URL('http://127.0.0.1:3000/api/agent-goal-loop/get_task_loop_report?taskId=task_123'),
			expect.objectContaining({
				headers: expect.objectContaining({
					authorization: 'Bearer test-token'
				})
			})
		);
		expect(stdoutWrite).toHaveBeenCalled();
	});

	it('routes operator console reads through the goal-loop endpoint', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				command: 'get_operator_console',
				console: { path: { taskId: 'task_123' } }
			})
		});
		vi.stubGlobal('fetch', fetchMock);
		const stdoutWrite = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

		const { runCli } = await import('../../../scripts/ams-cli.mjs');
		await runCli([
			'goal-loop',
			'get_operator_console',
			'--goal',
			'goal_123',
			'--task',
			'task_123'
		]);

		expect(fetchMock).toHaveBeenCalledWith(
			new URL(
				'http://127.0.0.1:3000/api/agent-goal-loop/get_operator_console?goalId=goal_123&taskId=task_123'
			),
			expect.objectContaining({
				headers: expect.objectContaining({
					authorization: 'Bearer test-token'
				})
			})
		);
		expect(stdoutWrite).toHaveBeenCalled();
	});

	it('resolves operator console scope from managed-run context when no ids are passed', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		vi.stubEnv('AMS_AGENT_RUN_ID', 'run_current');
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					resolved: {
						projectId: 'project_current',
						goalId: 'goal_current',
						taskId: 'task_current',
						runId: 'run_current'
					}
				})
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					command: 'get_operator_console',
					resolved: {
						projectId: 'project_current',
						goalId: 'goal_current',
						taskId: 'task_current'
					},
					console: { path: { taskId: 'task_current' } }
				})
			});
		vi.stubGlobal('fetch', fetchMock);
		const stdoutWrite = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

		const { runCli } = await import('../../../scripts/ams-cli.mjs');
		await runCli(['goal-loop', 'get_operator_console']);

		expect(fetchMock).toHaveBeenNthCalledWith(
			1,
			new URL('http://127.0.0.1:3000/api/agent-context/current?runId=run_current'),
			expect.objectContaining({
				headers: expect.objectContaining({
					authorization: 'Bearer test-token'
				})
			})
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			new URL(
				'http://127.0.0.1:3000/api/agent-goal-loop/get_operator_console?projectId=project_current&goalId=goal_current&taskId=task_current'
			),
			expect.objectContaining({
				headers: expect.objectContaining({
					authorization: 'Bearer test-token'
				})
			})
		);
		expect(stdoutWrite).toHaveBeenCalled();
	});

	it('fails clearly when managed-run context cannot resolve operator console scope', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		vi.stubEnv('AMS_AGENT_RUN_ID', 'run_current');
		const fetchMock = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				resolved: {
					projectId: null,
					goalId: null,
					taskId: null,
					runId: null
				}
			})
		});
		vi.stubGlobal('fetch', fetchMock);

		const { runCli } = await import('../../../scripts/ams-cli.mjs');

		await expect(runCli(['goal-loop', 'get_operator_console'])).rejects.toThrow(
			'No project, goal, or task could be resolved from the current managed-run context. Run `node scripts/ams-cli.mjs context current` to inspect the available thread/task/run ids or pass --goal, --project, or --task explicitly.'
		);
	});

	it('routes goal-loop suggested task materialization through a POST endpoint', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const payload = { goalId: 'goal_123', validateOnly: true };
		const fetchMock = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				command: 'materialize_suggested_task',
				validationOnly: true,
				wouldCreateTask: true
			})
		});
		vi.stubGlobal('fetch', fetchMock);
		const stdoutWrite = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

		const { runCli } = await import('../../../scripts/ams-cli.mjs');
		await runCli([
			'goal-loop',
			'materialize_suggested_task',
			'--json',
			JSON.stringify(payload)
		]);

		expect(fetchMock).toHaveBeenCalledWith(
			new URL('http://127.0.0.1:3000/api/agent-goal-loop/materialize_suggested_task'),
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					authorization: 'Bearer test-token',
					'content-type': 'application/json'
				}),
				body: JSON.stringify(payload)
			})
		);
		expect(stdoutWrite).toHaveBeenCalled();
	});

	it('resolves materialize suggested task scope from managed-run context when payload omits ids', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		vi.stubEnv('AMS_AGENT_RUN_ID', 'run_current');
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					resolved: {
						projectId: 'project_current',
						goalId: 'goal_current',
						taskId: 'task_current',
						runId: 'run_current'
					}
				})
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					command: 'materialize_suggested_task',
					validationOnly: true,
					wouldCreateTask: true
				})
			});
		vi.stubGlobal('fetch', fetchMock);
		const stdoutWrite = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

		const { runCli } = await import('../../../scripts/ams-cli.mjs');
		await runCli([
			'goal-loop',
			'materialize_suggested_task',
			'--json',
			JSON.stringify({ validateOnly: true })
		]);

		expect(fetchMock).toHaveBeenNthCalledWith(
			1,
			new URL('http://127.0.0.1:3000/api/agent-context/current?runId=run_current'),
			expect.objectContaining({
				headers: expect.objectContaining({
					authorization: 'Bearer test-token'
				})
			})
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			new URL('http://127.0.0.1:3000/api/agent-goal-loop/materialize_suggested_task'),
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					authorization: 'Bearer test-token',
					'content-type': 'application/json'
				}),
				body: JSON.stringify({
					validateOnly: true,
					projectId: 'project_current',
					goalId: 'goal_current'
				})
			})
		);
		expect(stdoutWrite).toHaveBeenCalled();
	});

	it('resolves managed continuation runner scope from managed-run context when payload omits ids', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		vi.stubEnv('AMS_AGENT_RUN_ID', 'run_current');
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					resolved: {
						projectId: 'project_current',
						goalId: 'goal_current',
						taskId: 'task_current',
						runId: 'run_current'
					}
				})
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					command: 'managed_continuation_runner',
					mode: 'preview',
					stop: { mustStop: true }
				})
			});
		vi.stubGlobal('fetch', fetchMock);
		const stdoutWrite = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

		const { runCli } = await import('../../../scripts/ams-cli.mjs');
		await runCli([
			'goal-loop',
			'managed_continuation_runner',
			'--json',
			JSON.stringify({ mode: 'preview' })
		]);

		expect(fetchMock).toHaveBeenNthCalledWith(
			1,
			new URL('http://127.0.0.1:3000/api/agent-context/current?runId=run_current'),
			expect.objectContaining({
				headers: expect.objectContaining({
					authorization: 'Bearer test-token'
				})
			})
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			new URL('http://127.0.0.1:3000/api/agent-goal-loop/managed_continuation_runner'),
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					authorization: 'Bearer test-token',
					'content-type': 'application/json'
				}),
				body: JSON.stringify({
					mode: 'preview',
					projectId: 'project_current',
					goalId: 'goal_current',
					taskId: 'task_current'
				})
			})
		);
		expect(stdoutWrite).toHaveBeenCalled();
	});

	it('routes read-only intent interpretation to the dedicated endpoint', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				source: { rawIntent: 'Create a task.', projectId: 'project_123' },
				safety: { readOnly: true, mutationCount: 0 }
			})
		});
		vi.stubGlobal('fetch', fetchMock);
		const stdoutWrite = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

		const { runCli } = await import('../../../scripts/ams-cli.mjs');
		await runCli([
			'intent',
			'interpret_intent',
			'--json',
			JSON.stringify({ rawIntent: 'Create a task.', projectId: 'project_123' })
		]);

		expect(fetchMock).toHaveBeenCalledWith(
			new URL('http://127.0.0.1:3000/api/agent-intent-interpretation/interpret_intent'),
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					authorization: 'Bearer test-token',
					'content-type': 'application/json'
				}),
				body: JSON.stringify({ rawIntent: 'Create a task.', projectId: 'project_123' })
			})
		);
		expect(stdoutWrite).toHaveBeenCalled();
	});

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
