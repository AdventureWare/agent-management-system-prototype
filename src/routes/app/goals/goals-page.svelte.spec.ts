import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { GOAL_STATUS_OPTIONS, LANE_OPTIONS } from '$lib/types/control-plane';
import Page from './+page.svelte';

describe('/app/goals/+page.svelte', () => {
	it('renders the goal directory table with relationship counts and open links', async () => {
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
						targetDate: '2026-05-20',
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
					},
					{
						id: 'goal_child',
						name: 'Validate creator partnerships',
						lane: 'growth',
						status: 'ready',
						summary: 'Prove whether creator partnerships can become a repeatable channel.',
						artifactPath: '/tmp/project/agent_output/goals/creator-partnerships',
						targetDate: null,
						successSignal: 'At least one creator channel shows repeatable traction.',
						parentGoalId: 'goal_parent',
						parentGoalName: 'Grow Kwipoo into a repeatable business',
						childGoals: [],
						childGoalCount: 0,
						linkedProjects: [{ id: 'project_1', name: 'Kwipoo website' }],
						linkedTasks: [],
						relatedTaskCount: 0
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
		expect(document.body.textContent).toContain('Validate creator partnerships');
		expect(document.body.textContent).toContain('Subgoal');
		expect(document.body.textContent).toContain('1 project');
		expect(document.body.textContent).toContain('1 task');
		expect(document.body.textContent).toContain('May 20, 2026');
		expect(document.body.textContent).toContain('Unscheduled');
		expect(document.body.textContent).toContain('Open');
	});
});
