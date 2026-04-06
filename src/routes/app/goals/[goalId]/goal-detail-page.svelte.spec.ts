import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { GOAL_STATUS_OPTIONS, AREA_OPTIONS } from '$lib/types/control-plane';
import Page from './+page.svelte';

describe('/app/goals/[goalId]/+page.svelte', () => {
	it('renders goal editing, structure, and linked execution context', async () => {
		render(Page, {
			form: {} as never,
			data: {
				goal: {
					id: 'goal_parent',
					name: 'Grow Kwipoo into a repeatable business',
					area: 'growth',
					status: 'running',
					summary: 'Establish repeatable acquisition and retention loops.',
					artifactPath: '/tmp/project/agent_output/goals/grow-kwipoo',
					targetDate: '2026-05-20',
					successSignal: 'Reliable acquisition channel identified.',
					parentGoalId: '',
					parentGoalName: '',
					linkedProjectCount: 1,
					relatedTaskCount: 1,
					childGoalCount: 1
				},
				childGoals: [
					{
						id: 'goal_child',
						name: 'Validate creator partnerships',
						status: 'ready',
						taskCount: 1
					}
				],
				linkedProjects: [
					{
						id: 'project_1',
						name: 'Kwipoo website',
						summary: 'Marketing and launch surface.',
						defaultArtifactRoot: '/tmp/project/agent_output',
						projectRootFolder: '/tmp/project'
					}
				],
				relatedTasks: [
					{
						id: 'task_1',
						title: 'Draft creator outreach plan',
						status: 'ready',
						summary: 'Create the first outreach draft.',
						projectName: 'Kwipoo website'
					}
				],
				artifactBrowser: {
					rootPath: '/tmp/project/agent_output/goals/grow-kwipoo',
					rootKind: 'directory',
					browsePath: '/tmp/project/agent_output/goals/grow-kwipoo',
					inspectingParentDirectory: false,
					directoryEntries: [
						{
							name: 'notes.md',
							path: '/tmp/project/agent_output/goals/grow-kwipoo/notes.md',
							kind: 'file',
							extension: 'md',
							sizeBytes: 512
						}
					],
					directoryEntriesTruncated: false,
					knownOutputs: [],
					errorMessage: ''
				},
				metrics: {
					relatedTaskCount: 1,
					activeTaskCount: 1,
					linkedProjectCount: 1,
					childGoalCount: 1
				},
				laneOptions: AREA_OPTIONS,
				statusOptions: GOAL_STATUS_OPTIONS,
				folderOptions: [],
				parentGoalOptions: [],
				projectOptions: [
					{
						id: 'project_1',
						name: 'Kwipoo website',
						summary: 'Marketing and launch surface.',
						defaultArtifactRoot: '/tmp/project/agent_output',
						projectRootFolder: '/tmp/project'
					}
				],
				taskOptions: [
					{
						id: 'task_1',
						title: 'Draft creator outreach plan',
						status: 'ready',
						projectId: 'project_1',
						projectName: 'Kwipoo website',
						currentGoalId: 'goal_parent',
						currentGoalName: 'Grow Kwipoo into a repeatable business'
					}
				]
			} as never
		});

		expect(document.body.textContent).toContain('Edit goal');
		expect(document.body.textContent).toContain('Goal coach');
		expect(document.body.textContent).toContain('Target May 20, 2026');
		expect(document.body.textContent).toContain('Target date');
		expect(document.body.textContent).toContain('Parent and subgoal context');
		expect(document.body.textContent).toContain('Validate creator partnerships');
		expect(document.body.textContent).toContain('Goal artifact browser');
		expect(document.body.textContent).toContain('Delete goal');
		expect(document.body.textContent).toContain('notes.md');
		expect(
			(document.querySelector('input[name="targetDate"]') as HTMLInputElement | null)?.value
		).toBe('2026-05-20');

		await page.getByRole('tab', { name: /Projects 1/i }).click();

		expect(document.body.textContent).toContain('Project context');
		expect(document.body.textContent).toContain('Kwipoo website');

		await page.getByRole('tab', { name: /Tasks 1/i }).click();

		expect(document.body.textContent).toContain('Execution under this goal');
		expect(document.body.textContent).toContain('Draft creator outreach plan');
	});
});
