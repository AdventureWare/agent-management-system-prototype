import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/app/threads/[threadId]/+page.svelte', () => {
	afterEach(() => {
		window.history.replaceState({}, '', '/app/threads/thread_1');
	});

	it('shows the current task brief in the thread detail pane', async () => {
		render(Page, {
			form: {} as never,
			data: {
				thread: {
					id: 'thread_1',
					name: 'UI implementation thread',
					cwd: '/tmp/project',
					additionalWritableRoots: [],
					sandbox: 'workspace-write',
					model: 'gpt-5.4',
					threadId: 'codex_thread_1',
					attachments: [],
					archivedAt: null,
					createdAt: '2026-04-07T12:00:00.000Z',
					updatedAt: '2026-04-07T12:05:00.000Z',
					origin: 'managed',
					handle: 'frontend.project-1.task-1',
					contactLabel: 'Frontend · task_1 · ready',
					topicLabels: [],
					threadState: 'ready',
					latestRunStatus: 'completed',
					hasActiveRun: false,
					canResume: true,
					runCount: 1,
					lastActivityAt: '2026-04-07T12:05:00.000Z',
					lastActivityLabel: 'just now',
					threadSummary: 'Thread is ready for a follow-up decision.',
					lastExitCode: 0,
					runTimeline: [],
					relatedTasks: [
						{
							id: 'task_1',
							title: 'Task info pane in thread detail page',
							status: 'in_progress',
							isPrimary: true
						}
					],
					latestRun: {
						id: 'run_1',
						agentThreadId: 'thread_1',
						mode: 'message',
						prompt: 'Update the Current Task pane so it shows the real task brief.',
						requestedThreadId: 'codex_thread_1',
						sourceAgentThreadId: 'thread_2',
						sourceAgentThreadName: 'Coordinator thread',
						createdAt: '2026-04-07T12:01:00.000Z',
						updatedAt: '2026-04-07T12:05:00.000Z',
						logPath: '/tmp/project/agent_output/log.txt',
						statePath: '/tmp/project/agent_output/state.json',
						messagePath: '/tmp/project/agent_output/message.txt',
						configPath: '/tmp/project/agent_output/config.json',
						state: {
							status: 'completed',
							pid: null,
							startedAt: '2026-04-07T12:01:05.000Z',
							finishedAt: '2026-04-07T12:05:00.000Z',
							exitCode: 0,
							signal: null,
							codexThreadId: 'codex_thread_1'
						},
						lastMessage: 'Implemented the thread detail card update.',
						logTail: [],
						activityAt: '2026-04-07T12:05:00.000Z'
					},
					runs: [
						{
							id: 'run_1',
							agentThreadId: 'thread_1',
							mode: 'message',
							prompt: 'Update the Current Task pane so it shows the real task brief.',
							requestedThreadId: 'codex_thread_1',
							sourceAgentThreadId: 'thread_2',
							sourceAgentThreadName: 'Coordinator thread',
							createdAt: '2026-04-07T12:01:00.000Z',
							updatedAt: '2026-04-07T12:05:00.000Z',
							logPath: '/tmp/project/agent_output/log.txt',
							statePath: '/tmp/project/agent_output/state.json',
							messagePath: '/tmp/project/agent_output/message.txt',
							configPath: '/tmp/project/agent_output/config.json',
							state: {
								status: 'completed',
								pid: null,
								startedAt: '2026-04-07T12:01:05.000Z',
								finishedAt: '2026-04-07T12:05:00.000Z',
								exitCode: 0,
								signal: null,
								codexThreadId: 'codex_thread_1'
							},
							lastMessage: 'Implemented the thread detail card update.',
							logTail: [],
							activityAt: '2026-04-07T12:05:00.000Z'
						}
					]
				},
				sandboxOptions: ['read-only', 'workspace-write', 'danger-full-access'],
				threadFocusTask: {
					id: 'task_1',
					title: 'Task info pane in thread detail page',
					projectId: 'project_1',
					status: 'in_progress',
					summary:
						'Replace the current text/content of the Current Task pane in the Thread Detail page so it shows the task name and instructions/summary instead.',
					isPrimary: true,
					source: 'resolved'
				},
				threadContactTargets: [
					{
						id: 'thread_2',
						name: 'Coordinator thread',
						handle: 'coordination.project-1.task-2',
						contactLabel: 'Coordination · task_2 · ready',
						projectLabel: 'Agent Management System Prototype',
						roleLabel: 'Coordination',
						primaryTaskTitle: 'Coordinate implementation',
						relatedTaskCount: 1,
						lastActivityLabel: 'just now',
						threadState: 'ready',
						latestRunStatus: 'completed',
						threadSummary: 'Handles coordination and assignment decisions.',
						relatedTaskTitles: ['Coordinate implementation'],
						canContact: true,
						disabledReason: '',
						routingReason:
							'Shares project Agent Management System Prototype; Can accept contact now'
					}
				],
				threadContacts: [
					{
						id: 'contact_1',
						sourceAgentThreadId: 'thread_1',
						sourceAgentThreadName: 'UI implementation thread',
						targetAgentThreadId: 'thread_2',
						targetAgentThreadName: 'Coordinator thread',
						contactType: 'request_assignment',
						contextSummary: 'Need a clear owner before shipping the coordination update.',
						contextItems: [
							{
								id: 'focus-task:task_1',
								kind: 'task',
								label: 'Task info pane in thread detail page',
								detail:
									'Replace the current text/content of the Current Task pane in the Thread Detail page so it shows the task name and instructions/summary instead.',
								path: null,
								href: '/app/tasks/task_1'
							}
						],
						prompt: 'Need assignment confirmation before shipping this update.',
						replyRequested: true,
						replyToContactId: null,
						status: 'awaiting_reply',
						resolvedByContactId: null,
						targetRunId: 'run_2',
						createdAt: '2026-04-07T12:06:00.000Z',
						updatedAt: '2026-04-07T12:06:00.000Z'
					}
				],
				taskResponseAction: null,
				responseContextArtifacts: []
			} as never
		});

		expect(document.body.textContent).toContain('Current task');
		expect(document.body.textContent).toContain('Task info pane in thread detail page');
		expect(document.body.textContent).toContain('Task brief');
		expect(document.body.textContent).toContain(
			'Replace the current text/content of the Current Task pane in the Thread Detail page so it shows the task name and instructions/summary instead.'
		);
		expect(document.body.textContent).toContain('Contact another thread');
		expect(document.body.textContent).toContain('Coordinator thread');
		expect(document.body.textContent).toContain('Coordination · task_2 · ready');
		expect(document.body.textContent).toContain('Browse matching threads');
		expect(document.body.textContent).toContain('Routing hint');
		expect(document.body.textContent).toContain('Contact inbox and outbox');
		expect(document.body.textContent).toContain('Awaiting reply 1');
		expect(document.body.textContent).toContain('Request Assignment');
		expect(document.body.textContent).toContain(
			'Need assignment confirmation before shipping this update.'
		);
		expect(document.body.textContent).toContain('Contact from Coordinator thread');
		expect(document.body.textContent).toContain('Reply context');
		expect(document.body.textContent).toContain('Most recent response');
		expect(document.body.textContent).not.toContain(
			'This is the task the thread is currently anchored to while you review or reply.'
		);
	});

	it('focuses the follow-up composer when reply entry is requested', async () => {
		window.history.replaceState({}, '', '/app/threads/thread_1?compose=1');

		render(Page, {
			form: {} as never,
			data: {
				thread: {
					id: 'thread_1',
					name: 'UI implementation thread',
					cwd: '/tmp/project',
					additionalWritableRoots: [],
					sandbox: 'workspace-write',
					model: 'gpt-5.4',
					threadId: 'codex_thread_1',
					attachments: [],
					archivedAt: null,
					createdAt: '2026-04-07T12:00:00.000Z',
					updatedAt: '2026-04-07T12:05:00.000Z',
					origin: 'managed',
					handle: 'frontend.project-1.task-1',
					contactLabel: 'Frontend · task_1 · ready',
					topicLabels: [],
					threadState: 'ready',
					latestRunStatus: 'completed',
					hasActiveRun: false,
					canResume: true,
					runCount: 1,
					lastActivityAt: '2026-04-07T12:05:00.000Z',
					lastActivityLabel: 'just now',
					threadSummary: 'Thread is ready for a follow-up decision.',
					lastExitCode: 0,
					runTimeline: [],
					relatedTasks: [],
					latestRun: {
						id: 'run_1',
						agentThreadId: 'thread_1',
						mode: 'message',
						prompt: 'Update the Current Task pane so it shows the real task brief.',
						requestedThreadId: 'codex_thread_1',
						sourceAgentThreadId: null,
						sourceAgentThreadName: null,
						createdAt: '2026-04-07T12:01:00.000Z',
						updatedAt: '2026-04-07T12:05:00.000Z',
						logPath: '/tmp/project/agent_output/log.txt',
						statePath: '/tmp/project/agent_output/state.json',
						messagePath: '/tmp/project/agent_output/message.txt',
						configPath: '/tmp/project/agent_output/config.json',
						state: {
							status: 'completed',
							pid: null,
							startedAt: '2026-04-07T12:01:05.000Z',
							finishedAt: '2026-04-07T12:05:00.000Z',
							exitCode: 0,
							signal: null,
							codexThreadId: 'codex_thread_1'
						},
						lastMessage: 'Implemented the thread detail card update.',
						logTail: [],
						activityAt: '2026-04-07T12:05:00.000Z'
					},
					runs: [
						{
							id: 'run_1',
							agentThreadId: 'thread_1',
							mode: 'message',
							prompt: 'Update the Current Task pane so it shows the real task brief.',
							requestedThreadId: 'codex_thread_1',
							sourceAgentThreadId: null,
							sourceAgentThreadName: null,
							createdAt: '2026-04-07T12:01:00.000Z',
							updatedAt: '2026-04-07T12:05:00.000Z',
							logPath: '/tmp/project/agent_output/log.txt',
							statePath: '/tmp/project/agent_output/state.json',
							messagePath: '/tmp/project/agent_output/message.txt',
							configPath: '/tmp/project/agent_output/config.json',
							state: {
								status: 'completed',
								pid: null,
								startedAt: '2026-04-07T12:01:05.000Z',
								finishedAt: '2026-04-07T12:05:00.000Z',
								exitCode: 0,
								signal: null,
								codexThreadId: 'codex_thread_1'
							},
							lastMessage: 'Implemented the thread detail card update.',
							logTail: [],
							activityAt: '2026-04-07T12:05:00.000Z'
						}
					]
				},
				sandboxOptions: ['read-only', 'workspace-write', 'danger-full-access'],
				threadFocusTask: null,
				threadContactTargets: [],
				threadContacts: [],
				taskResponseAction: null,
				responseContextArtifacts: []
			} as never
		});

		await new Promise((resolve) => window.setTimeout(resolve, 0));

		const followUpPrompt = document.querySelector(
			'#thread-follow-up-form textarea[name="prompt"]'
		) as HTMLTextAreaElement | null;

		expect(document.activeElement).toBe(followUpPrompt);
		expect(followUpPrompt?.closest('#reply')).not.toBeNull();
	});
});
