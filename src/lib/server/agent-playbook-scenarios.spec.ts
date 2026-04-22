import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAgentCapabilityManifest } from './agent-capability-manifest';

beforeEach(() => {
	vi.resetModules();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

function jsonResponse(payload: unknown) {
	return {
		ok: true,
		json: async () => payload
	};
}

async function executeManifestPlaybook(
	intent: string,
	argsByTool: Record<string, Record<string, unknown>>
) {
	const manifest = getAgentCapabilityManifest();
	const playbook = manifest.guidance.playbooks.find((entry) => entry.intent === intent);

	expect(playbook).toBeTruthy();

	const { invokeTool } = await import('../../../scripts/ams-control-plane-mcp.mjs');
	const results: Array<{ tool: string; result: unknown }> = [];

	for (const step of playbook?.steps ?? []) {
		results.push({
			tool: step.tool,
			result: await invokeTool(step.tool, argsByTool[step.tool] ?? {})
		});
	}

	return results;
}

describe('agent-playbook-scenarios', () => {
	it('executes the prepare_task_for_approval playbook through the MCP bridge', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse({ commands: [] }))
			.mockResolvedValueOnce(jsonResponse({ task: { id: 'task_approval', approvals: [] } }))
			.mockResolvedValueOnce(
				jsonResponse({
					task: { id: 'task_approval' },
					approval: { status: 'pending' }
				})
			)
			.mockResolvedValueOnce(
				jsonResponse({
					task: { id: 'task_approval', approval: { status: 'pending' } }
				})
			);
		vi.stubGlobal('fetch', fetchMock);

		const results = await executeManifestPlaybook('prepare_task_for_approval', {
			ams_manifest: { resource: 'task' },
			ams_task_get: { taskId: 'task_approval' },
			ams_task_request_approval: {
				taskId: 'task_approval',
				payload: { summary: 'Ready for approval.' }
			}
		});

		expect(results.map((entry) => entry.tool)).toEqual([
			'ams_manifest',
			'ams_task_get',
			'ams_task_request_approval',
			'ams_task_get'
		]);
		expect(fetchMock).toHaveBeenNthCalledWith(
			1,
			new URL('http://127.0.0.1:3000/api/agent-capabilities?resource=task'),
			expect.any(Object)
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			new URL('http://127.0.0.1:3000/api/tasks/task_approval'),
			expect.any(Object)
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			3,
			new URL('http://127.0.0.1:3000/api/tasks/task_approval/approval-request'),
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ summary: 'Ready for approval.' })
			})
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			4,
			new URL('http://127.0.0.1:3000/api/tasks/task_approval'),
			expect.any(Object)
		);
	});

	it('executes the request_child_handoff_changes playbook through the MCP bridge', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse({ commands: [] }))
			.mockResolvedValueOnce(
				jsonResponse({
					task: {
						id: 'task_parent',
						childHandoffs: [{ childTaskId: 'task_child', status: 'ready' }]
					}
				})
			)
			.mockResolvedValueOnce(
				jsonResponse({
					task: { id: 'task_parent' },
					childHandoff: { childTaskId: 'task_child', decision: 'changes_requested' }
				})
			)
			.mockResolvedValueOnce(
				jsonResponse({
					task: {
						id: 'task_parent',
						childHandoffs: [{ childTaskId: 'task_child', decision: 'changes_requested' }]
					}
				})
			);
		vi.stubGlobal('fetch', fetchMock);

		const results = await executeManifestPlaybook('request_child_handoff_changes', {
			ams_manifest: { resource: 'task', command: 'request-child-handoff-changes' },
			ams_task_get: { taskId: 'task_parent' },
			ams_task_request_child_handoff_changes: {
				parentTaskId: 'task_parent',
				payload: {
					childTaskId: 'task_child',
					summary: 'Please address the missing recovery notes.'
				}
			}
		});

		expect(results.map((entry) => entry.tool)).toEqual([
			'ams_manifest',
			'ams_task_get',
			'ams_task_request_child_handoff_changes',
			'ams_task_get'
		]);
		expect(fetchMock).toHaveBeenNthCalledWith(
			1,
			new URL(
				'http://127.0.0.1:3000/api/agent-capabilities?resource=task&command=request-child-handoff-changes'
			),
			expect.any(Object)
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			new URL('http://127.0.0.1:3000/api/tasks/task_parent'),
			expect.any(Object)
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			3,
			new URL('http://127.0.0.1:3000/api/tasks/task_parent/child-handoff'),
			expect.objectContaining({
				method: 'POST'
			})
		);
		const childHandoffCall = fetchMock.mock.calls.at(2);
		const childHandoffRequest = (childHandoffCall as unknown[] | undefined)?.[1] as
			| ({ body?: string } & Record<string, unknown>)
			| undefined;
		expect(JSON.parse(String(childHandoffRequest?.body))).toEqual({
			childTaskId: 'task_child',
			summary: 'Please address the missing recovery notes.',
			decision: 'changes_requested'
		});
		expect(fetchMock).toHaveBeenNthCalledWith(
			4,
			new URL('http://127.0.0.1:3000/api/tasks/task_parent'),
			expect.any(Object)
		);
	});

	it('executes the coordinate_with_another_thread playbook through the MCP bridge with a direct thread id', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		vi.stubEnv('AMS_AGENT_THREAD_ID', 'thread_source');
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse({ commands: [] }))
			.mockResolvedValueOnce(
				jsonResponse({
					target: { id: 'thread_target', handle: 'frontend' }
				})
			)
			.mockResolvedValueOnce(jsonResponse({ contactId: 'contact_123' }))
			.mockResolvedValueOnce(jsonResponse({ contacts: [{ id: 'contact_123' }] }));
		vi.stubGlobal('fetch', fetchMock);

		const results = await executeManifestPlaybook('coordinate_with_another_thread', {
			ams_manifest: { resource: 'thread' },
			ams_thread_best_target: { role: 'frontend' },
			ams_thread_contact: {
				targetThreadIdOrHandle: 'thread_target',
				prompt: 'Need implementation context.',
				type: 'request_context'
			},
			ams_thread_contacts: { threadIdOrHandle: 'thread_target' }
		});

		expect(results.map((entry) => entry.tool)).toEqual([
			'ams_manifest',
			'ams_thread_best_target',
			'ams_thread_contact',
			'ams_thread_contacts'
		]);
		expect(fetchMock).toHaveBeenNthCalledWith(
			1,
			new URL('http://127.0.0.1:3000/api/agent-capabilities?resource=thread'),
			expect.any(Object)
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			new URL(
				'http://127.0.0.1:3000/api/agents/threads/best-target?role=frontend&sourceThreadId=thread_source&canContact=1'
			),
			expect.any(Object)
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			3,
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
		expect(fetchMock).toHaveBeenNthCalledWith(
			4,
			new URL('http://127.0.0.1:3000/api/agents/threads/thread_target/contacts'),
			expect.any(Object)
		);
	});

	it('executes the coordinate_with_another_thread playbook through the MCP bridge with handle resolution', async () => {
		vi.stubEnv('AMS_AGENT_API_TOKEN', 'test-token');
		vi.stubEnv('AMS_AGENT_API_BASE_URL', 'http://127.0.0.1:3000');
		vi.stubEnv('AMS_AGENT_THREAD_ID', 'thread_source');
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse({ commands: [] }))
			.mockResolvedValueOnce(
				jsonResponse({
					target: { id: 'thread_target', handle: 'frontend' }
				})
			)
			.mockResolvedValueOnce(
				jsonResponse({
					threads: [{ id: 'thread_target', handle: 'frontend', name: 'Frontend thread' }]
				})
			)
			.mockResolvedValueOnce(jsonResponse({ contactId: 'contact_456' }))
			.mockResolvedValueOnce(
				jsonResponse({
					threads: [{ id: 'thread_target', handle: 'frontend', name: 'Frontend thread' }]
				})
			)
			.mockResolvedValueOnce(jsonResponse({ contacts: [{ id: 'contact_456' }] }));
		vi.stubGlobal('fetch', fetchMock);

		const results = await executeManifestPlaybook('coordinate_with_another_thread', {
			ams_manifest: { resource: 'thread', command: 'contact' },
			ams_thread_best_target: { role: 'frontend' },
			ams_thread_contact: {
				targetThreadIdOrHandle: 'frontend',
				prompt: 'Need implementation context.',
				type: 'request_context'
			},
			ams_thread_contacts: { threadIdOrHandle: 'frontend' }
		});

		expect(results.map((entry) => entry.tool)).toEqual([
			'ams_manifest',
			'ams_thread_best_target',
			'ams_thread_contact',
			'ams_thread_contacts'
		]);
		expect(fetchMock).toHaveBeenNthCalledWith(
			1,
			new URL('http://127.0.0.1:3000/api/agent-capabilities?resource=thread&command=contact'),
			expect.any(Object)
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			new URL(
				'http://127.0.0.1:3000/api/agents/threads/best-target?role=frontend&sourceThreadId=thread_source&canContact=1'
			),
			expect.any(Object)
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			3,
			new URL(
				'http://127.0.0.1:3000/api/agents/threads?q=frontend&sourceThreadId=thread_source&canContact=1&limit=25'
			),
			expect.any(Object)
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			4,
			new URL('http://127.0.0.1:3000/api/agents/threads/thread_target/messages'),
			expect.any(Object)
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			5,
			new URL('http://127.0.0.1:3000/api/agents/threads?q=frontend&includeArchived=1&limit=25'),
			expect.any(Object)
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			6,
			new URL('http://127.0.0.1:3000/api/agents/threads/thread_target/contacts'),
			expect.any(Object)
		);
	});
});
