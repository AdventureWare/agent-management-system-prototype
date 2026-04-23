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
					executionSurfaceId: 'worker_1',
					executionSurfaceName: 'Coordinator',
					providerId: 'provider_1',
					providerName: 'Local Codex',
					status: 'failed',
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:05:00.000Z',
					startedAt: '2026-03-30T12:01:00.000Z',
					endedAt: '2026-03-30T12:05:00.000Z',
					threadId: 'thread_1',
					agentThreadId: 'session_1',
					threadName: 'Task thread',
					threadState: 'attention',
					sessionArchivedAt: null,
					threadSummary: 'The thread needs a decision.',
					sessionCanResume: true,
					sessionHasActiveRun: false,
					promptDigest: 'digest: add runs index and detail',
					artifactPaths: ['/tmp/project/agent_output/run_1/log.txt'],
					summary: 'Run stopped during rendering.',
					lastHeartbeatAt: '2026-03-30T12:04:30.000Z',
					heartbeatAgeLabel: '30s ago',
					isHeartbeatStale: true,
					errorSummary: 'Route load failed on missing execution-surface filter.',
					createdAtLabel: '5m ago',
					updatedAtLabel: 'just now'
				},
				agentThreadRun: {
					id: 'agent_run_1',
					agentThreadId: 'session_1',
					mode: 'start',
					prompt: 'Implement the runs page.',
					requestedThreadId: null,
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:05:00.000Z',
					logPath: '/tmp/project/.agents/runs/agent_run_1/codex.log',
					statePath: '/tmp/project/.agents/runs/agent_run_1/state.json',
					messagePath: '/tmp/project/.agents/runs/agent_run_1/last-message.txt',
					configPath: '/tmp/project/.agents/runs/agent_run_1/config.json',
					state: {
						status: 'failed',
						pid: null,
						startedAt: '2026-03-30T12:01:00.000Z',
						finishedAt: '2026-03-30T12:05:00.000Z',
						exitCode: 1,
						signal: null,
						codexThreadId: 'thread_1'
					},
					lastMessage: null,
					logTail: ['route load started', 'Error: missing execution-surface filter'],
					activityAt: '2026-03-30T12:05:00.000Z'
				},
				task: {
					id: 'task_1'
				},
				executionSurface: {
					id: 'worker_1',
					status: 'busy'
				},
				provider: {
					id: 'provider_1',
					service: 'OpenAI'
				},
				session: {
					id: 'session_1',
					threadState: 'attention',
					canResume: true
				},
				agentCurrentContext: {
					summary: {
						currentState: 'Run run_1 is failed.',
						blockers: [],
						openGates: [],
						recommendedNextActions: []
					}
				},
				relatedTaskRuns: []
			} as never
		});

		expect(document.body.textContent).toContain('Captured execution inputs');
		expect(document.body.textContent).toContain('digest: add runs index and detail');
		expect(document.body.textContent).toContain('thread_1');
		expect(document.body.textContent).toContain(
			'Route load failed on missing execution-surface filter.'
		);
		expect(document.body.textContent).toContain('/tmp/project/agent_output/run_1/log.txt');
		expect(document.body.textContent).toContain('Run logs');
		expect(document.body.textContent).toContain('/tmp/project/.agents/runs/agent_run_1/codex.log');
		expect(document.body.textContent).toContain('Error: missing execution-surface filter');
		expect(document.body.textContent).toContain('Recorded output');
		expect(
			Array.from(document.querySelectorAll('a')).some(
				(link) => link.getAttribute('href') === '/app/agent-use?run=run_1'
			)
		).toBe(true);
		expect(
			Array.from(document.querySelectorAll('a')).some(
				(link) => link.getAttribute('href') === '/app/agent-use?task=task_1'
			)
		).toBe(true);
	});

	it('shows preview-first guidance for risky coordination or governance actions', async () => {
		render(Page, {
			data: {
				artifactBrowsers: [],
				run: {
					id: 'run_2',
					taskId: 'task_2',
					taskTitle: 'Coordinate rollout',
					taskProjectId: 'project_1',
					taskProjectName: 'Agent Management System Prototype',
					executionSurfaceId: null,
					executionSurfaceName: null,
					providerId: null,
					providerName: null,
					status: 'running',
					createdAt: '2026-03-30T12:00:00.000Z',
					updatedAt: '2026-03-30T12:05:00.000Z',
					startedAt: '2026-03-30T12:01:00.000Z',
					endedAt: null,
					threadId: 'thread_2',
					agentThreadId: 'session_2',
					threadName: 'Coordinator thread',
					threadState: 'running',
					sessionArchivedAt: null,
					threadSummary: 'Coordinating rollout',
					sessionCanResume: true,
					sessionHasActiveRun: true,
					promptDigest: 'digest',
					artifactPaths: [],
					summary: 'Run is actively coordinating.',
					lastHeartbeatAt: '2026-03-30T12:04:30.000Z',
					heartbeatAgeLabel: '30s ago',
					isHeartbeatStale: false,
					errorSummary: null,
					createdAtLabel: '5m ago',
					updatedAtLabel: 'just now'
				},
				agentThreadRun: null,
				task: { id: 'task_2' },
				executionSurface: null,
				provider: null,
				session: null,
				thread: null,
				relatedTaskRuns: [],
				agentCurrentContext: {
					task: {
						title: 'Coordinate rollout',
						status: 'in_progress'
					},
					run: {
						status: 'running'
					},
					thread: {
						name: 'Coordinator thread',
						threadState: 'running'
					},
					summary: {
						currentState: 'Task "Coordinate rollout" is in_progress with run running.',
						blockers: [],
						openGates: [],
						recommendedNextActions: [
							{
								resource: 'intent',
								command: 'coordinate_with_another_thread',
								reason:
									'Route focused context or delegation to another thread without manually resolving and messaging it.',
								stateSignals: [
									'Task task_2 is in_progress.',
									'Source thread session_2 is available for cross-thread routing.'
								],
								expectedOutcome:
									'Resolve a target thread, send the contact, and read back contact state in one call.',
								suggestedReadbackCommands: ['thread:contacts', 'context:current'],
								shouldValidateFirst: true,
								validationMode: 'validateOnly',
								validationReason:
									'Cross-thread routing is coordination-heavy. Preview target resolution and availability first.'
							}
						]
					}
				}
			} as never
		});

		expect(document.body.textContent).toContain('Current context recommendations');
		expect(document.body.textContent).toContain('Preview first');
		expect(document.body.textContent).toContain(
			'Cross-thread routing is coordination-heavy. Preview target resolution and availability first.'
		);
		expect(document.body.textContent).toContain('thread:contacts');
	});
});
