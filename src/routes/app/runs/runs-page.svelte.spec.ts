import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { RUN_STATUS_OPTIONS } from '$lib/types/control-plane';
import Page from './+page.svelte';

describe('/app/runs/+page.svelte', () => {
	it('renders operator-facing run metadata on the index', async () => {
		render(Page, {
			data: {
				statusOptions: RUN_STATUS_OPTIONS,
				tasks: [{ id: 'task_1', title: 'Make runs first class' }],
				executionSurfaces: [{ id: 'worker_1', name: 'Coordinator' }],
				providers: [{ id: 'provider_1', name: 'Local Codex' }],
				runs: [
					{
						id: 'run_1',
						taskId: 'task_1',
						taskTitle: 'Make runs first class',
						taskProjectId: 'project_1',
						taskProjectName: 'Agent Management System Prototype',
						executionSurfaceId: 'worker_1',
						workerName: 'Coordinator',
						providerId: 'provider_1',
						providerName: 'Local Codex',
						status: 'running',
						createdAt: '2026-03-30T12:00:00.000Z',
						updatedAt: '2026-03-30T12:05:00.000Z',
						startedAt: '2026-03-30T12:01:00.000Z',
						endedAt: null,
						threadId: 'thread_1',
						agentThreadId: 'session_1',
						threadName: 'Task thread',
						threadState: 'working',
						sessionArchivedAt: null,
						threadSummary: 'Working through the task.',
						sessionCanResume: true,
						sessionHasActiveRun: true,
						promptDigest: 'digest: add runs index and detail',
						artifactPaths: ['/tmp/project/agent_output/run_1'],
						summary: 'Rendering the runs index.',
						lastHeartbeatAt: '2026-03-30T12:04:30.000Z',
						heartbeatAgeLabel: '30s ago',
						isHeartbeatStale: false,
						errorSummary: '',
						createdAtLabel: '5m ago',
						updatedAtLabel: 'just now'
					}
				]
			} as never
		});

		expect(document.body.textContent).toContain('Inspect execution outcomes');
		expect(document.body.textContent).toContain('digest: add runs index and detail');
		expect(document.body.textContent).toContain('Task thread');
		expect(document.body.textContent).toContain('Heartbeat 30s ago');
		expect(document.body.textContent).toContain('/tmp/project/agent_output/run_1');
	});
});
