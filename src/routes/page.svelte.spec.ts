import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('should render h1', async () => {
		render(Page, {
			data: {
				summary: {
					taskCount: 0,
					runCount: 0,
					activeRunCount: 0,
					blockedRunCount: 0,
					openReviewCount: 0,
					pendingApprovalCount: 0,
					runningTaskCount: 0,
					blockedTaskCount: 0,
					readyTaskCount: 0,
					reviewTaskCount: 0,
					reviewRequiredTaskCount: 0,
					dependencyBlockedTaskCount: 0,
					highRiskTaskCount: 0,
					projectCount: 0,
					goalCount: 0,
					workflowCount: 0,
					executionSurfaceCount: 0,
					onlineExecutionSurfaceCount: 0,
					busyExecutionSurfaceCount: 0
				},
				goals: [],
				tasks: []
			}
		});

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toBeInTheDocument();
	});
});
