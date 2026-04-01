import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { TASK_STATUS_OPTIONS } from '$lib/types/control-plane';
import Page from './+page.svelte';

describe('/app/tasks/[taskId]/+page.svelte', () => {
	it('renders attached files with download and detach controls', async () => {
		render(Page, {
			form: {} as never,
			data: {
				attachmentRoot: '/tmp/project/agent_output',
				artifactBrowser: {
					rootPath: '/tmp/project/agent_output',
					rootKind: 'directory',
					browsePath: '/tmp/project/agent_output',
					inspectingParentDirectory: false,
					directoryEntries: [
						{
							name: 'task-attachments',
							path: '/tmp/project/agent_output/task-attachments',
							kind: 'directory',
							extension: '',
							sizeBytes: null
						}
					],
					directoryEntriesTruncated: false,
					knownOutputs: [
						{
							label: 'brief.md',
							path: '/tmp/project/agent_output/task-attachments/task_1/brief.md',
							kind: 'file',
							extension: 'md',
							sizeBytes: 2048,
							exists: true,
							href: '/api/tasks/task_1/attachments/attachment_1',
							description: 'Attached task file · text/markdown'
						}
					],
					errorMessage: ''
				},
				project: {
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'Primary app project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				},
				projects: [],
				workers: [],
				statusOptions: TASK_STATUS_OPTIONS,
				relatedRuns: [],
				dependencyTasks: [],
				task: {
					id: 'task_1',
					title: 'Attach a brief',
					summary: 'Need source documents',
					projectId: 'project_1',
					projectName: 'Agent Management System Prototype',
					lane: 'product',
					goalId: '',
					priority: 'medium',
					status: 'in_progress',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeWorkerId: null,
					assigneeName: 'Unassigned',
					threadSessionId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 1,
					latestRunId: 'run_1',
					latestRun: null,
					artifactPath: '/tmp/project/agent_output',
					attachments: [
						{
							id: 'attachment_1',
							name: 'brief.md',
							path: '/tmp/project/agent_output/task-attachments/task_1/brief.md',
							contentType: 'text/markdown',
							sizeBytes: 2048,
							attachedAt: '2026-03-30T12:00:00.000Z'
						}
					],
					createdAt: '2026-03-30T11:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z',
					updatedAtLabel: 'just now',
					openReview: null,
					pendingApproval: null,
					linkThread: null,
					linkThreadKind: 'assigned',
					statusThread: null
				},
				candidateThreads: [],
				suggestedThread: null
			} as never
		});

		expect(document.body.textContent).toContain('Attached files');
		expect(document.body.textContent).toContain('Browse task outputs');
		expect(document.body.textContent).toContain('Primary actions');
		expect(document.body.textContent).toContain('Save changes or queue work now');
		expect(document.body.textContent).toContain('brief.md');
		expect(document.body.textContent).toContain('task-attachments');
		expect(document.body.textContent).toContain('/tmp/project/agent_output');
		expect(
			Array.from(document.querySelectorAll('a')).some(
				(link) => link.textContent?.trim() === 'Download'
			)
		).toBe(true);
		expect(
			Array.from(document.querySelectorAll('button')).some(
				(button) => button.textContent?.trim() === 'Detach'
			)
		).toBe(true);
		expect(
			Array.from(document.querySelectorAll('button')).some((button) =>
				button.textContent?.includes('Save task')
			)
		).toBe(true);
		expect(
			Array.from(document.querySelectorAll('button')).some((button) =>
				button.textContent?.includes('Run task')
			)
		).toBe(true);
		expect(document.body.textContent).toContain('This task is not ready to run yet.');
		expect(document.body.textContent).toContain(
			'Set the task status to Ready before running it. Current status: In Progress.'
		);
	});

	it('shows a suggested available thread while keeping the new-thread option', async () => {
		render(Page, {
			form: {} as never,
			data: {
				attachmentRoot: '/tmp/project/agent_output',
				artifactBrowser: {
					rootPath: '/tmp/project/agent_output',
					rootKind: 'directory',
					browsePath: '/tmp/project/agent_output',
					inspectingParentDirectory: false,
					directoryEntries: [],
					directoryEntriesTruncated: false,
					knownOutputs: [],
					errorMessage: ''
				},
				project: {
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'Primary app project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				},
				projects: [],
				workers: [],
				statusOptions: TASK_STATUS_OPTIONS,
				relatedRuns: [],
				dependencyTasks: [],
				task: {
					id: 'task_1',
					title: 'Attach a brief',
					summary: 'Need source documents',
					projectId: 'project_1',
					projectName: 'Agent Management System Prototype',
					lane: 'product',
					goalId: '',
					priority: 'medium',
					status: 'in_progress',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeWorkerId: null,
					assigneeName: 'Unassigned',
					threadSessionId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 1,
					latestRunId: 'run_1',
					latestRun: null,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-03-30T11:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z',
					updatedAtLabel: 'just now',
					openReview: null,
					pendingApproval: null,
					linkThread: null,
					linkThreadKind: 'assigned',
					statusThread: null
				},
				candidateThreads: [
					{
						id: 'session_1',
						name: 'Task thread continuity',
						topicLabels: ['Product', 'Coordination', 'Brief'],
						sessionState: 'ready',
						canResume: true,
						hasActiveRun: false,
						relatedTasks: [],
						previewText: 'Continue task thread work',
						isSuggested: true,
						suggestionReason: 'Matches this task topic and is available for follow-up.'
					}
				],
				suggestedThread: {
					id: 'session_1',
					name: 'Task thread continuity',
					topicLabels: ['Product', 'Coordination', 'Brief'],
					sessionState: 'ready',
					canResume: true,
					hasActiveRun: false,
					relatedTasks: [],
					previewText: 'Continue task thread work',
					isSuggested: true,
					suggestionReason: 'Matches this task topic and is available for follow-up.'
				}
			} as never
		});

		expect(document.body.textContent).toContain('Suggested available thread');
		expect(document.body.textContent).toContain('Assign suggested thread');
		expect(document.body.textContent).toContain('Create a new thread when this task runs');
		expect(document.body.textContent).toContain('Suggested');
		expect(document.body.textContent).toContain('Coordination');
	});

	it('disables the run button and explains why while a run is active', async () => {
		render(Page, {
			form: {} as never,
			data: {
				attachmentRoot: '/tmp/project/agent_output',
				artifactBrowser: {
					rootPath: '/tmp/project/agent_output',
					rootKind: 'directory',
					browsePath: '/tmp/project/agent_output',
					inspectingParentDirectory: false,
					directoryEntries: [],
					directoryEntriesTruncated: false,
					knownOutputs: [],
					errorMessage: ''
				},
				project: {
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'Primary app project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				},
				projects: [],
				workers: [],
				statusOptions: TASK_STATUS_OPTIONS,
				relatedRuns: [],
				dependencyTasks: [],
				task: {
					id: 'task_1',
					title: 'Attach a brief',
					summary: 'Need source documents',
					projectId: 'project_1',
					projectName: 'Agent Management System Prototype',
					lane: 'product',
					goalId: '',
					priority: 'medium',
					status: 'in_progress',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeWorkerId: null,
					assigneeName: 'Unassigned',
					threadSessionId: 'session_1',
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 1,
					latestRunId: 'run_1',
					latestRun: {
						id: 'run_1',
						taskId: 'task_1',
						workerId: null,
						providerId: 'provider_local',
						status: 'running',
						createdAt: '2026-03-30T11:30:00.000Z',
						updatedAt: '2026-03-30T12:00:00.000Z',
						startedAt: '2026-03-30T11:30:00.000Z',
						endedAt: null,
						threadId: 'thread_1',
						sessionId: 'session_1',
						promptDigest: 'digest',
						artifactPaths: ['/tmp/project/agent_output'],
						summary: 'Already running.',
						lastHeartbeatAt: '2026-03-30T12:00:00.000Z',
						errorSummary: ''
					},
					activeRun: {
						id: 'run_1',
						taskId: 'task_1',
						workerId: null,
						providerId: 'provider_local',
						status: 'running',
						createdAt: '2026-03-30T11:30:00.000Z',
						updatedAt: '2026-03-30T12:00:00.000Z',
						startedAt: '2026-03-30T11:30:00.000Z',
						endedAt: null,
						threadId: 'thread_1',
						sessionId: 'session_1',
						promptDigest: 'digest',
						artifactPaths: ['/tmp/project/agent_output'],
						summary: 'Already running.',
						lastHeartbeatAt: '2026-03-30T12:00:00.000Z',
						errorSummary: ''
					},
					hasActiveRun: true,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-03-30T11:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z',
					updatedAtLabel: 'just now',
					openReview: null,
					pendingApproval: null,
					linkThread: null,
					linkThreadKind: 'assigned',
					statusThread: null
				},
				candidateThreads: [],
				suggestedThread: null
			} as never
		});

		const runButton = Array.from(document.querySelectorAll('button')).find((button) =>
			button.textContent?.includes('Task running')
		) as HTMLButtonElement | undefined;

		expect(runButton).toBeDefined();
		expect(runButton?.disabled).toBe(true);
		expect(document.body.textContent).toContain('A run is already in progress for this task.');
		expect(document.body.textContent).toContain(
			'This task is already running. Open the current work thread or wait for the current run to finish before running again.'
		);
	});
});
