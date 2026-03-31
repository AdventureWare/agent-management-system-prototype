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
				candidateThreads: []
			} as never
		});

		expect(document.body.textContent).toContain('Attached files');
		expect(document.body.textContent).toContain('brief.md');
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
	});
});
