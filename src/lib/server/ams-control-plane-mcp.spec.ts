import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
	vi.resetModules();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('ams-control-plane-mcp', () => {
	it('routes thread start tool calls to the thread creation endpoint', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({ threadId: 'thread_new' })
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const result = await invokeTool('ams_thread_start', {
			payload: {
				name: 'New thread',
				cwd: '/tmp/project',
				prompt: 'Do the work.'
			}
		});

		expect(result).toEqual({ threadId: 'thread_new' });
		expect(fetchMock).toHaveBeenCalledWith(
			new URL('http://127.0.0.1:3000/api/agents/threads'),
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({
					name: 'New thread',
					cwd: '/tmp/project',
					prompt: 'Do the work.'
				})
			})
		);
	});

	it('routes thread handle alias updates to the thread patch endpoint', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({ thread: { id: 'thread_123', handleAlias: 'frontend' } })
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const result = await invokeTool('ams_thread_set_handle_alias', {
			threadId: 'thread_123',
			handleAlias: 'frontend'
		});

		expect(result).toEqual({ thread: { id: 'thread_123', handleAlias: 'frontend' } });
		expect(fetchMock).toHaveBeenCalledWith(
			new URL('http://127.0.0.1:3000/api/agents/threads/thread_123'),
			expect.objectContaining({
				method: 'PATCH',
				body: JSON.stringify({ handleAlias: 'frontend' })
			})
		);
	});

	it('routes thread archive calls to the archive endpoint', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({ updatedThreadIds: ['thread_123'] })
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const result = await invokeTool('ams_thread_archive', {
			threadIds: ['thread_123']
		});

		expect(result).toEqual({ updatedThreadIds: ['thread_123'] });
		expect(fetchMock).toHaveBeenCalledWith(
			new URL('http://127.0.0.1:3000/api/agents/threads/archive'),
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ threadIds: ['thread_123'], archived: true })
			})
		);
	});

	it('routes best-target thread tool calls to the thread routing endpoint', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		vi.stubEnv('AMS_AGENT_THREAD_ID', 'thread_source');
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({
				target: { id: 'thread_target', handle: 'frontend' }
			})
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const result = await invokeTool('ams_thread_best_target', {
			role: 'frontend'
		});

		expect(result).toEqual({ id: 'thread_target', handle: 'frontend' });
		expect(fetchMock).toHaveBeenCalledWith(
			new URL(
				'http://127.0.0.1:3000/api/agents/threads/best-target?role=frontend&sourceThreadId=thread_source&canContact=1'
			),
			expect.objectContaining({
				headers: expect.objectContaining({
					authorization: 'Bearer test-token'
				})
			})
		);
	});

	it('resolves a thread handle before posting a contact message', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		vi.stubEnv('AMS_AGENT_THREAD_ID', 'thread_source');
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					threads: [{ id: 'thread_target', handle: 'frontend', name: 'Frontend thread' }]
				})
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					contactId: 'contact_123'
				})
			});
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const result = await invokeTool('ams_thread_contact', {
			targetThreadIdOrHandle: 'frontend',
			prompt: 'Need implementation context.',
			type: 'request_context'
		});

		expect(result).toEqual({ contactId: 'contact_123' });
		expect(fetchMock).toHaveBeenNthCalledWith(
			1,
			new URL(
				'http://127.0.0.1:3000/api/agents/threads?q=frontend&sourceThreadId=thread_source&canContact=1&limit=25'
			),
			expect.any(Object)
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			new URL('http://127.0.0.1:3000/api/agents/threads/thread_target/messages'),
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({
					sourceThreadId: 'thread_source',
					prompt: 'Need implementation context.',
					contactType: 'request_context',
					contextSummary: '',
					replyRequested: true,
					replyToContactId: null
				})
			})
		);
	});

	it('routes manifest tool calls to the capability endpoint', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({ ok: true })
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const result = await invokeTool('ams_manifest', { resource: 'task' });

		expect(result).toEqual({ ok: true });
		expect(fetchMock).toHaveBeenCalledWith(
			new URL('http://127.0.0.1:3000/api/agent-capabilities?resource=task'),
			expect.objectContaining({
				headers: expect.objectContaining({
					authorization: 'Bearer test-token'
				})
			})
		);
	});

	it('routes task update tool calls to the task patch endpoint', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({ task: { id: 'task_123' } })
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const result = await invokeTool('ams_task_update', {
			taskId: 'task_123',
			payload: { status: 'in_progress' }
		});

		expect(result).toEqual({ task: { id: 'task_123' } });
		expect(fetchMock).toHaveBeenCalledWith(
			new URL('http://127.0.0.1:3000/api/tasks/task_123'),
			expect.objectContaining({
				method: 'PATCH',
				body: JSON.stringify({ status: 'in_progress' })
			})
		);
	});

	it('routes task attach tool calls to the attachment endpoint', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({ attachment: { id: 'attachment_123' } })
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const result = await invokeTool('ams_task_attach', {
			taskId: 'task_123',
			payload: { path: '/tmp/report.md' }
		});

		expect(result).toEqual({ attachment: { id: 'attachment_123' } });
		expect(fetchMock).toHaveBeenCalledWith(
			new URL('http://127.0.0.1:3000/api/tasks/task_123/attachments'),
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ path: '/tmp/report.md' })
			})
		);
	});

	it('routes review change decisions to the review decision endpoint', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({ review: { status: 'changes_requested' } })
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const result = await invokeTool('ams_task_request_review_changes', {
			taskId: 'task_123'
		});

		expect(result).toEqual({ review: { status: 'changes_requested' } });
		expect(fetchMock).toHaveBeenCalledWith(
			new URL('http://127.0.0.1:3000/api/tasks/task_123/review-decision'),
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ decision: 'changes_requested' })
			})
		);
	});

	it('routes task decomposition tool calls to the decomposition endpoint', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({ children: [{ id: 'task_child' }] })
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const result = await invokeTool('ams_task_decompose', {
			taskId: 'task_123',
			payload: {
				children: [{ title: 'Child task', instructions: 'Do the child task.' }]
			}
		});

		expect(result).toEqual({ children: [{ id: 'task_child' }] });
		expect(fetchMock).toHaveBeenCalledWith(
			new URL('http://127.0.0.1:3000/api/tasks/task_123/decompose'),
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({
					children: [{ title: 'Child task', instructions: 'Do the child task.' }]
				})
			})
		);
	});

	it('lists recent contacts for the current thread by default', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		vi.stubEnv('AMS_AGENT_THREAD_ID', 'thread_source');
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({
				contacts: [{ id: 'contact_123' }]
			})
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const result = await invokeTool('ams_thread_contacts', {
			limit: 5
		});

		expect(result).toEqual([{ id: 'contact_123' }]);
		expect(fetchMock).toHaveBeenCalledWith(
			new URL('http://127.0.0.1:3000/api/agents/threads/thread_source/contacts?limit=5'),
			expect.any(Object)
		);
	});

	it('routes thread status calls to the status endpoint', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({ statuses: [{ threadId: 'thread_123' }] })
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const result = await invokeTool('ams_thread_status', {
			threadIds: ['thread_123', 'thread_456']
		});

		expect(result).toEqual({ statuses: [{ threadId: 'thread_123' }] });
		expect(fetchMock).toHaveBeenCalledWith(
			new URL(
				'http://127.0.0.1:3000/api/agents/threads/status?threadId=thread_123&threadId=thread_456'
			),
			expect.any(Object)
		);
	});
});
