import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/app/runs/[runId]/+page.svelte', () => {
	it('shows prompt, thread, error, and artifact inspection details', async () => {
		render(Page, {
			data: {
				artifactBrowsers: [
					{
						rootPath: '/tmp/project/agent_output/run_1/log.txt',
						rootKind: 'file',
						browsePath: '/tmp/project/agent_output/run_1',
						inspectingParentDirectory: true,
						directoryEntries: [
							{
								name: 'log.txt',
								path: '/tmp/project/agent_output/run_1/log.txt',
								kind: 'file',
								extension: 'txt',
								sizeBytes: 1280
							}
						],
						directoryEntriesTruncated: false,
						knownOutputs: [
							{
								label: 'Recorded output',
								path: '/tmp/project/agent_output/run_1/log.txt',
								kind: 'file',
								extension: 'txt',
								sizeBytes: 1280,
								exists: true,
								href: null,
								description: 'Recorded file.'
							}
						],
						errorMessage: ''
					}
				],
				run: {
					id: 'run_1',
					taskId: 'task_1',
					taskTitle: 'Make runs first class',
					taskProjectId: 'project_1',
					taskProjectName: 'Agent Management System Prototype',
					workerId: 'worker_1',
					workerName: 'Coordinator',
					providerId: 'provider_1',
					providerName: 'Local Codex',
					status: 'failed',
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:05:00.000Z',
					startedAt: '2026-03-30T12:01:00.000Z',
					endedAt: '2026-03-30T12:05:00.000Z',
					threadId: 'thread_1',
					sessionId: 'session_1',
					sessionName: 'Task thread',
					sessionState: 'attention',
					sessionArchivedAt: null,
					sessionSummary: 'The thread needs a decision.',
					sessionCanResume: true,
					sessionHasActiveRun: false,
					promptDigest: 'digest: add runs index and detail',
					artifactPaths: ['/tmp/project/agent_output/run_1/log.txt'],
					summary: 'Run stopped during rendering.',
					lastHeartbeatAt: '2026-03-30T12:04:30.000Z',
					heartbeatAgeLabel: '30s ago',
					isHeartbeatStale: true,
					errorSummary: 'Route load failed on missing worker filter.',
					createdAtLabel: '5m ago',
					updatedAtLabel: 'just now'
				},
				task: {
					id: 'task_1'
				},
				worker: {
					id: 'worker_1',
					status: 'busy'
				},
				provider: {
					id: 'provider_1',
					service: 'OpenAI'
				},
				session: {
					id: 'session_1',
					sessionState: 'attention',
					canResume: true
				},
				relatedTaskRuns: []
			} as never
		});

		expect(document.body.textContent).toContain('Captured execution inputs');
		expect(document.body.textContent).toContain('digest: add runs index and detail');
		expect(document.body.textContent).toContain('thread_1');
		expect(document.body.textContent).toContain('Route load failed on missing worker filter.');
		expect(document.body.textContent).toContain('/tmp/project/agent_output/run_1/log.txt');
		expect(document.body.textContent).toContain('Recorded output');
	});
});
