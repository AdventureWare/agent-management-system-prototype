import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
	vi.resetModules();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('ams-control-plane-mcp', () => {
	it('builds manifest-backed MCP tools from the shared capability registry', async () => {
		const { getTools } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const tools = getTools();

		expect(tools).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: 'ams_context_current',
					description:
						'Resolve the current thread, task, run, project, and goal context from explicit ids or managed-run defaults.'
				}),
				expect.objectContaining({
					name: 'ams_intent_prepare_task_for_review',
					description:
						'Prepare a task for review by optionally attaching support material, opening the review gate, and returning readback context.',
					inputSchema: expect.objectContaining({
						properties: expect.objectContaining({
							validateOnly: expect.objectContaining({ type: 'boolean' })
						})
					})
				}),
				expect.objectContaining({
					name: 'ams_intent_prepare_task_for_approval',
					description:
						'Prepare a task for approval by optionally attaching support material, opening the approval gate, and returning readback context.',
					inputSchema: expect.objectContaining({
						properties: expect.objectContaining({
							validateOnly: expect.objectContaining({ type: 'boolean' })
						})
					})
				}),
				expect.objectContaining({
					name: 'ams_intent_reject_task_approval',
					inputSchema: expect.objectContaining({
						properties: expect.objectContaining({
							validateOnly: expect.objectContaining({ type: 'boolean' })
						})
					})
				}),
				expect.objectContaining({
					name: 'ams_intent_accept_child_handoff',
					inputSchema: expect.objectContaining({
						properties: expect.objectContaining({
							validateOnly: expect.objectContaining({ type: 'boolean' })
						})
					})
				}),
				expect.objectContaining({
					name: 'ams_intent_request_child_handoff_changes',
					inputSchema: expect.objectContaining({
						properties: expect.objectContaining({
							validateOnly: expect.objectContaining({ type: 'boolean' })
						})
					})
				}),
				expect.objectContaining({
					name: 'ams_intent_coordinate_with_another_thread',
					description:
						'Resolve the best target thread or handle, send a cross-thread contact, and return readback contact state in one AMS operation.',
					inputSchema: expect.objectContaining({
						properties: expect.objectContaining({
							validateOnly: expect.objectContaining({ type: 'boolean' })
						})
					})
				}),
				expect.objectContaining({
					name: 'ams_task_decompose',
					description: 'Create child tasks from a parent task delegation template.'
				}),
				expect.objectContaining({
					name: 'ams_task_approve_review',
					inputSchema: expect.objectContaining({
						properties: expect.objectContaining({
							validateOnly: expect.objectContaining({ type: 'boolean' })
						})
					})
				}),
				expect.objectContaining({
					name: 'ams_task_reject_approval',
					inputSchema: expect.objectContaining({
						properties: expect.objectContaining({
							validateOnly: expect.objectContaining({ type: 'boolean' })
						})
					})
				}),
				expect.objectContaining({
					name: 'ams_goal_update',
					description: 'Update goal planning, hierarchy, or status fields.'
				}),
				expect.objectContaining({
					name: 'ams_thread_panel'
				})
			])
		);
	});

	it('routes current-context tool calls to the current context endpoint', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({
				resolved: { taskId: 'task_123', runId: 'run_123' }
			})
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const result = await invokeTool('ams_context_current', {
			taskId: 'task_123',
			runId: 'run_123'
		});

		expect(result).toEqual({
			resolved: { taskId: 'task_123', runId: 'run_123' }
		});
		expect(fetchMock).toHaveBeenCalledWith(
			new URL('http://127.0.0.1:3000/api/agent-context/current?taskId=task_123&runId=run_123'),
			expect.any(Object)
		);
	});

	it('formats structured agent API errors for MCP callers', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi.fn(async () => ({
			ok: false,
			status: 404,
			statusText: 'Not Found',
			json: async () => ({
				error: 'Run not found.',
				errorCode: 'run_not_found',
				suggestedNextCommands: ['task:get', 'context:current']
			})
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');

		await expect(invokeTool('ams_context_current', { runId: 'run_missing' })).rejects.toThrow(
			'Run not found. [run_not_found] Next: task:get, context:current.'
		);
	});

	it('routes intent tools through the generic agent-intent endpoint', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({
				intent: 'prepare_task_for_approval',
				executedCommands: ['context:current', 'task:request-approval', 'context:current']
			})
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const result = await invokeTool('ams_intent_prepare_task_for_approval', {
			taskId: 'task_123',
			approval: { summary: 'Ready for approval.' }
		});

		expect(result).toEqual({
			intent: 'prepare_task_for_approval',
			executedCommands: ['context:current', 'task:request-approval', 'context:current']
		});
		expect(fetchMock).toHaveBeenCalledWith(
			new URL('http://127.0.0.1:3000/api/agent-intents/prepare_task_for_approval'),
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({
					taskId: 'task_123',
					approval: { summary: 'Ready for approval.' }
				})
			})
		);
	});

	it('routes thread coordination intent tools through the generic agent-intent endpoint', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({
				intent: 'coordinate_with_another_thread',
				executedCommands: [
					'context:current',
					'thread:contact',
					'thread:contacts',
					'context:current'
				]
			})
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const result = await invokeTool('ams_intent_coordinate_with_another_thread', {
			targetThreadIdOrHandle: 'researcher',
			prompt: 'Need context on the latest blocker.'
		});

		expect(result).toEqual({
			intent: 'coordinate_with_another_thread',
			executedCommands: ['context:current', 'thread:contact', 'thread:contacts', 'context:current']
		});
		expect(fetchMock).toHaveBeenCalledWith(
			new URL('http://127.0.0.1:3000/api/agent-intents/coordinate_with_another_thread'),
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({
					targetThreadIdOrHandle: 'researcher',
					prompt: 'Need context on the latest blocker.'
				})
			})
		);
	});

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

	it('routes thread panel tool calls to the thread panel endpoint', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({
				thread: { id: 'thread_123' },
				contacts: [{ id: 'contact_123' }]
			})
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const result = await invokeTool('ams_thread_panel', {
			threadId: 'thread_123'
		});

		expect(result).toEqual({
			thread: { id: 'thread_123' },
			contacts: [{ id: 'contact_123' }]
		});
		expect(fetchMock).toHaveBeenCalledWith(
			new URL('http://127.0.0.1:3000/api/agents/threads/thread_123/panel'),
			expect.any(Object)
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
				method: 'POST'
			})
		);
		const archiveCall = fetchMock.mock.calls.at(0);
		const archiveRequest = (archiveCall as unknown[] | undefined)?.[1] as
			| ({ body?: string } & Record<string, unknown>)
			| undefined;
		expect(archiveRequest?.body).toBeTruthy();
		expect(JSON.parse(String(archiveRequest?.body))).toEqual({
			threadIds: ['thread_123'],
			archived: true
		});
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

	it('reads text task attachments through the attachment download endpoint', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi.fn(async () => ({
			ok: true,
			headers: new Headers({
				'content-type': 'text/markdown',
				'content-disposition': 'attachment; filename="notes.md"'
			}),
			text: async () => '# Notes',
			arrayBuffer: async () => new TextEncoder().encode('# Notes').buffer,
			json: async () => ({})
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const result = await invokeTool('ams_task_attachment_read', {
			taskId: 'task_123',
			attachmentId: 'attachment_123'
		});

		expect(result).toEqual({
			attachment: {
				name: 'notes.md',
				contentType: 'text/markdown',
				encoding: 'text',
				content: '# Notes'
			}
		});
		expect(fetchMock).toHaveBeenCalledWith(
			new URL('http://127.0.0.1:3000/api/tasks/task_123/attachments/attachment_123'),
			expect.any(Object)
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

	it('routes child handoff acceptance through the generated parent task path alias', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({ handoff: { status: 'accepted' } })
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const result = await invokeTool('ams_task_accept_child_handoff', {
			parentTaskId: 'task_parent',
			payload: { childTaskId: 'task_child' }
		});

		expect(result).toEqual({ handoff: { status: 'accepted' } });
		expect(fetchMock).toHaveBeenCalledWith(
			new URL('http://127.0.0.1:3000/api/tasks/task_parent/child-handoff'),
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({
					childTaskId: 'task_child',
					decision: 'accept'
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

	it('lists contact targets for the current thread by default', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		vi.stubEnv('AMS_AGENT_THREAD_ID', 'thread_source');
		const fetchMock = vi.fn(async () => ({
			ok: true,
			json: async () => ({
				targets: [{ id: 'thread_target', contactLabel: 'Frontend · ready' }]
			})
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const result = await invokeTool('ams_thread_contact_targets');

		expect(result).toEqual([{ id: 'thread_target', contactLabel: 'Frontend · ready' }]);
		expect(fetchMock).toHaveBeenCalledWith(
			new URL('http://127.0.0.1:3000/api/agents/threads/thread_source/contact-targets'),
			expect.any(Object)
		);
	});

	it('reads text thread attachments through the thread attachment endpoint', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi.fn(async () => ({
			ok: true,
			headers: new Headers({
				'content-type': 'text/plain',
				'content-disposition': 'attachment; filename="thread-notes.txt"'
			}),
			text: async () => 'Thread notes',
			arrayBuffer: async () => new TextEncoder().encode('Thread notes').buffer,
			json: async () => ({})
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
		const result = await invokeTool('ams_thread_attachment_read', {
			threadId: 'thread_123',
			attachmentId: 'attachment_456'
		});

		expect(result).toEqual({
			attachment: {
				name: 'thread-notes.txt',
				contentType: 'text/plain',
				encoding: 'text',
				content: 'Thread notes'
			}
		});
		expect(fetchMock).toHaveBeenCalledWith(
			new URL('http://127.0.0.1:3000/api/agents/threads/thread_123/attachments/attachment_456'),
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
