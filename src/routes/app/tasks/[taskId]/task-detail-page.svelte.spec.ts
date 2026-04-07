import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { TASK_STATUS_OPTIONS } from '$lib/types/control-plane';
import Page from './+page.svelte';

describe('/app/tasks/[taskId]/+page.svelte', () => {
	it('renders attached files with download and detach controls', async () => {
		render(Page, {
			form: {} as never,
			data: {
				availableSkills: {
					totalCount: 2,
					globalCount: 1,
					projectCount: 1,
					previewSkills: [
						{
							id: 'skill-installer',
							description: 'Install Codex skills',
							global: true,
							project: false,
							sourceLabel: 'Global'
						},
						{
							id: 'web-design-guidelines',
							description: 'Review UI against guidelines',
							global: false,
							project: true,
							sourceLabel: 'Project'
						}
					]
				},
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
				goals: [
					{
						id: 'goal_launch',
						name: 'Improve goal UX',
						label: 'Improve goal UX',
						depth: 0,
						parentGoalId: null,
						status: 'active',
						area: 'product'
					},
					{
						id: 'goal_linking',
						name: 'Improve task linking',
						label: '  - Improve task linking',
						depth: 1,
						parentGoalId: 'goal_launch',
						status: 'planned',
						area: 'product'
					}
				],
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
					area: 'product',
					goalId: '',
					priority: 'medium',
					status: 'in_progress',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiredThreadSandbox: 'danger-full-access',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeWorkerId: null,
					assigneeName: 'Unassigned',
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					targetDate: '2026-04-22',
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
		expect(document.body.textContent).toContain('Skill access');
		expect(document.body.textContent).toContain(
			'2 installed skills are available to new task threads.'
		);
		expect(document.body.textContent).toContain('brief.md');
		expect(document.body.textContent).toContain('task-attachments');
		expect(document.body.textContent).toContain('/tmp/project/agent_output');
		expect(document.body.textContent).toContain('Target date');
		expect(document.body.textContent).toContain('Apr 22, 2026');
		expect(document.body.textContent).toContain('Required sandbox: Danger Full Access');
		expect(
			(document.querySelector('input[name="targetDate"]') as HTMLInputElement | null)?.value
		).toBe('2026-04-22');
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
				button.textContent?.includes('Save changes')
			)
		).toBe(true);
		expect(
			Array.from(document.querySelectorAll('button')).some((button) =>
				button.textContent?.includes('Run task')
			)
		).toBe(true);
		expect(
			Array.from(document.querySelectorAll('button')).some((button) =>
				button.textContent?.includes('Create follow-up task')
			)
		).toBe(true);
		expect(document.body.textContent).toContain('This task is not ready to run yet.');
		expect(document.body.textContent).toContain(
			'Set the task status to Ready before running it. Current status: In Progress.'
		);
	});

	it('renders a goal selector with hierarchical options on the task detail form', async () => {
		render(Page, {
			form: {} as never,
			data: {
				availableSkills: {
					totalCount: 0,
					globalCount: 0,
					projectCount: 0,
					previewSkills: []
				},
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
				goals: [
					{
						id: 'goal_launch',
						name: 'Improve goal UX',
						label: 'Improve goal UX',
						depth: 0,
						parentGoalId: null,
						status: 'active',
						area: 'product'
					},
					{
						id: 'goal_linking',
						name: 'Improve task linking',
						label: '  - Improve task linking',
						depth: 1,
						parentGoalId: 'goal_launch',
						status: 'planned',
						area: 'product'
					}
				],
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
					area: 'product',
					goalId: 'goal_linking',
					goalName: 'Improve task linking',
					priority: 'medium',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeWorkerId: null,
					assigneeName: 'Unassigned',
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 0,
					latestRunId: null,
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
				candidateThreads: [],
				suggestedThread: null
			} as never
		});

		const goalSelect = document.querySelector('select[name="goalId"]') as HTMLSelectElement | null;

		expect(goalSelect?.value).toBe('goal_linking');
		expect(goalSelect?.textContent).toContain('No goal linked');
		expect(goalSelect?.textContent).toContain('Improve goal UX');
		expect(goalSelect?.textContent).toContain('Improve task linking');
		expect(document.body.textContent).toContain(
			'This is the canonical task-to-goal link used by goal detail and hierarchy views.'
		);
	});

	it('renders the full routing and governance editor on the detail form', async () => {
		render(Page, {
			form: {} as never,
			data: {
				availableSkills: {
					totalCount: 0,
					globalCount: 0,
					projectCount: 0,
					previewSkills: []
				},
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
				goals: [],
				roles: [
					{
						id: 'role_coordinator',
						name: 'Coordinator',
						area: 'shared',
						description: 'Coordinates execution'
					},
					{
						id: 'role_reviewer',
						name: 'Reviewer',
						area: 'product',
						description: 'Reviews higher-risk work'
					}
				],
				workers: [],
				statusOptions: TASK_STATUS_OPTIONS,
				relatedRuns: [],
				dependencyTasks: [
					{
						id: 'task_dep_1',
						title: 'Finalize API contract',
						status: 'blocked',
						projectId: 'project_1',
						projectName: 'Agent Management System Prototype'
					}
				],
				availableDependencyTasks: [
					{
						id: 'task_dep_1',
						title: 'Finalize API contract',
						status: 'blocked',
						projectId: 'project_1',
						projectName: 'Agent Management System Prototype',
						isSelected: true
					},
					{
						id: 'task_dep_2',
						title: 'Ship docs update',
						status: 'ready',
						projectId: 'project_1',
						projectName: 'Agent Management System Prototype',
						isSelected: false
					}
				],
				task: {
					id: 'task_1',
					title: 'Attach a brief',
					summary: 'Need source documents',
					projectId: 'project_1',
					projectName: 'Agent Management System Prototype',
					area: 'product',
					goalId: '',
					priority: 'urgent',
					status: 'blocked',
					riskLevel: 'high',
					approvalMode: 'before_apply',
					requiresReview: false,
					desiredRoleId: 'role_reviewer',
					desiredRoleName: 'Reviewer',
					assigneeWorkerId: null,
					assigneeName: 'Unassigned',
					agentThreadId: null,
					blockedReason: 'Waiting on API contract',
					dependencyTaskIds: ['task_dep_1'],
					runCount: 0,
					latestRunId: null,
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
				candidateThreads: [],
				suggestedThread: null
			} as never
		});

		expect(document.body.textContent).toContain('Queue priority, gates, and blockers');
		expect(
			(document.querySelector('select[name="priority"]') as HTMLSelectElement | null)?.value
		).toBe('urgent');
		expect(
			(document.querySelector('select[name="riskLevel"]') as HTMLSelectElement | null)?.value
		).toBe('high');
		expect(
			(document.querySelector('select[name="approvalMode"]') as HTMLSelectElement | null)?.value
		).toBe('before_apply');
		expect(
			(document.querySelector('select[name="requiresReview"]') as HTMLSelectElement | null)?.value
		).toBe('false');
		expect(
			(document.querySelector('select[name="desiredRoleId"]') as HTMLSelectElement | null)?.value
		).toBe('role_reviewer');
		expect(
			(document.querySelector('textarea[name="blockedReason"]') as HTMLTextAreaElement | null)
				?.value
		).toBe('Waiting on API contract');
		expect(
			(
				document.querySelector(
					'input[name="dependencyTaskIds"][value="task_dep_1"]'
				) as HTMLInputElement | null
			)?.checked
		).toBe(true);
		expect(document.body.textContent).toContain('Finalize API contract');
	});

	it('clamps long title and instructions at the top of the page until expanded', async () => {
		render(Page, {
			form: {} as never,
			data: {
				availableSkills: {
					totalCount: 0,
					globalCount: 0,
					projectCount: 0,
					previewSkills: []
				},
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
				goals: [],
				workers: [],
				statusOptions: TASK_STATUS_OPTIONS,
				relatedRuns: [],
				dependencyTasks: [],
				task: {
					id: 'task_1',
					title:
						'Implement a task detail header that keeps a very long title readable without letting it dominate the entire page before the operator has chosen to expand it for full review and editing context',
					summary:
						'This task intentionally has a long instructions block so the header description needs to stay compact by default. The goal is to preserve scanability for the top of the page while still letting the full brief be expanded on demand when someone actually needs to read every line of the task context before acting. This should be reversible in place with a simple toggle rather than forcing navigation or a separate modal.',
					projectId: 'project_1',
					projectName: 'Agent Management System Prototype',
					area: 'product',
					goalId: '',
					priority: 'medium',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeWorkerId: null,
					assigneeName: 'Unassigned',
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 0,
					latestRunId: null,
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
				candidateThreads: [],
				suggestedThread: null
			} as never
		});

		const heading = document.querySelector('h1');
		const description = document.querySelector('.ui-page-description');

		expect(heading?.className).toContain('ui-clamp-3');
		expect(description?.className).toContain('ui-clamp-5');
		await expect.element(page.getByRole('button', { name: 'Expand title' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Expand instructions' })).toBeVisible();

		await page.getByRole('button', { name: 'Expand title' }).click();
		await page.getByRole('button', { name: 'Expand instructions' }).click();

		expect(heading?.className).not.toContain('ui-clamp-3');
		expect(description?.className).not.toContain('ui-clamp-5');
		await expect.element(page.getByRole('button', { name: 'Collapse title' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Collapse instructions' })).toBeVisible();
	});

	it('shows a suggested available thread while keeping the new-thread option', async () => {
		render(Page, {
			form: {} as never,
			data: {
				availableSkills: {
					totalCount: 0,
					globalCount: 0,
					projectCount: 0,
					previewSkills: []
				},
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
				goals: [],
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
					area: 'product',
					goalId: '',
					priority: 'medium',
					status: 'in_progress',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeWorkerId: null,
					assigneeName: 'Unassigned',
					agentThreadId: null,
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
						threadState: 'ready',
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
					threadState: 'ready',
					canResume: true,
					hasActiveRun: false,
					relatedTasks: [],
					previewText: 'Continue task thread work',
					isSuggested: true,
					suggestionReason: 'Matches this task topic and is available for follow-up.'
				}
			} as never
		});

		await page.getByRole('tab', { name: /Execution 0/i }).click();

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
				availableSkills: {
					totalCount: 0,
					globalCount: 0,
					projectCount: 0,
					previewSkills: []
				},
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
				goals: [],
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
					area: 'product',
					goalId: '',
					priority: 'medium',
					status: 'in_progress',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeWorkerId: null,
					assigneeName: 'Unassigned',
					agentThreadId: 'session_1',
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
						agentThreadId: 'session_1',
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
						agentThreadId: 'session_1',
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

	it('shows a stalled recovery call to action for stuck active runs', async () => {
		render(Page, {
			form: {} as never,
			data: {
				availableSkills: {
					totalCount: 0,
					globalCount: 0,
					projectCount: 0,
					previewSkills: []
				},
				stalledRecovery: {
					eligible: true,
					headline: 'This task appears stalled.',
					detail:
						'No run heartbeat for 20m ago. No thread output for 22m ago. Recovering will retire the current run and queue fresh work.'
				},
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
				goals: [],
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
					area: 'product',
					goalId: '',
					priority: 'medium',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeWorkerId: null,
					assigneeName: 'Unassigned',
					agentThreadId: 'session_1',
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 2,
					latestRunId: 'run_2',
					latestRun: null,
					activeRun: {
						id: 'run_2',
						taskId: 'task_1',
						status: 'running'
					},
					hasActiveRun: true,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-03-30T11:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z',
					updatedAtLabel: 'just now',
					openReview: null,
					pendingApproval: null,
					linkThread: {
						id: 'session_1',
						name: 'Thread continuity',
						threadState: 'working'
					},
					linkThreadKind: 'assigned',
					statusThread: {
						id: 'session_1',
						name: 'Thread continuity',
						threadState: 'working',
						lastActivityAt: '2026-03-30T12:00:00.000Z'
					}
				},
				candidateThreads: [],
				suggestedThread: null
			} as never
		});

		expect(document.body.textContent).toContain('Stalled recovery');
		expect(document.body.textContent).toContain('This task appears stalled.');
		expect(document.body.textContent).toContain('Recover stalled run');
	});
});
