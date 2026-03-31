import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { TASK_STATUS_OPTIONS } from '$lib/types/control-plane';
import Page from './+page.svelte';

describe('/app/tasks/+page.svelte', () => {
	it('renders the project selector before the task name in the create form', async () => {
		render(Page, {
			form: {} as never,
			data: {
				deleted: false,
				statusOptions: TASK_STATUS_OPTIONS,
				defaultDraftRoleName: 'Coordinator',
				ideationReviews: [],
				projects: [
					{
						id: 'project_1',
						name: 'Agent Management System Prototype',
						summary: 'Primary app project',
						projectRootFolder: '/tmp/project',
						defaultArtifactRoot: '/tmp/project/out',
						defaultRepoPath: '',
						defaultRepoUrl: '',
						defaultBranch: ''
					}
				],
				workers: [],
				tasks: []
			} as never
		});

		const createFormLabels = Array.from(
			document.querySelectorAll('form[action="?/createTask"] label > span:first-child')
		).map((label) => label.textContent?.trim());

		expect(createFormLabels.slice(0, 2)).toEqual(['Project', 'Name']);
	});
});
