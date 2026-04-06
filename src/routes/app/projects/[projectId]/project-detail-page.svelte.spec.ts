import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/app/projects/[projectId]/+page.svelte', () => {
	it('renders the project danger zone and disables deletion when tasks remain', async () => {
		render(Page, {
			form: {} as never,
			data: {
				project: {
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'Prototype summary',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '/tmp/project',
					defaultRepoUrl: 'git@github.com:org/repo.git',
					defaultBranch: 'main',
					defaultThreadSandbox: null
				},
				relatedGoals: [
					{
						id: 'goal_1',
						name: 'Ship deletion',
						area: 'product',
						status: 'running',
						summary: 'Goal summary',
						artifactPath: '/tmp/project/agent_output/goals/ship-deletion',
						taskCount: 1
					}
				],
				relatedTasks: [
					{
						id: 'task_1',
						title: 'Finish deletion flow',
						summary: 'Wire delete behavior',
						status: 'ready',
						priority: 'high',
						artifactPath: '/tmp/project/agent_output/tasks/task_1',
						goalName: 'Ship deletion',
						assigneeName: 'Coordinator',
						openReview: null,
						pendingApproval: null,
						hasUnmetDependencies: false,
						updatedAtLabel: 'just now'
					}
				],
				folderOptions: [],
				sandboxOptions: ['workspace-write'],
				metrics: {
					totalTasks: 1,
					activeTasks: 1,
					reviewTasks: 0,
					pendingApprovals: 0,
					blockedTasks: 0,
					goalCount: 1
				}
			} as never
		});

		expect(document.body.textContent).toContain('Delete project');
		expect(document.body.textContent).toContain(
			'Reassign or delete those tasks first because tasks require a project.'
		);
		expect(
			(document.querySelector('button[type="submit"][disabled]') as HTMLButtonElement | null)
				?.textContent
		).toContain('Delete project');
	});
});
