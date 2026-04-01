import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { GOAL_STATUS_OPTIONS, LANE_OPTIONS } from '$lib/types/control-plane';
import Page from './+page.svelte';

describe('/app/goals/+page.svelte', () => {
	it('renders the goal directory with relationship counts and detail links', async () => {
		render(Page, {
			form: {} as never,
			data: {
				goals: [
					{
						id: 'goal_parent',
						name: 'Grow Kwipoo into a repeatable business',
						lane: 'growth',
						status: 'running',
						summary: 'Establish repeatable acquisition and retention loops.',
						artifactPath: '/tmp/project/agent_output/goals/grow-kwipoo',
						horizon: 'Later this year',
						successSignal: 'The team can point to a reliable acquisition channel.',
						parentGoalId: null,
						parentGoalName: '',
						childGoals: [
							{
								id: 'goal_child',
								name: 'Validate creator partnerships',
								status: 'ready'
							}
						],
						childGoalCount: 1,
						linkedProjects: [{ id: 'project_1', name: 'Kwipoo website' }],
						linkedTasks: [
							{
								id: 'task_1',
								title: 'Draft creator outreach plan',
								status: 'ready',
								projectName: 'Kwipoo website'
							}
						],
						relatedTaskCount: 1
					}
				],
				laneOptions: LANE_OPTIONS,
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

		expect(document.body.textContent).toContain('Goal directory');
		expect(document.body.textContent).toContain('Add goal');
		expect(document.body.textContent).toContain('Grow Kwipoo into a repeatable business');
		expect(document.body.textContent).toContain('Kwipoo website');
		expect(document.body.textContent).toContain('Open details');
		expect(document.body.textContent).toContain('Fully scoped');
	});
});
