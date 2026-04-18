import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('renders redirect copy for the task queue handoff', async () => {
		render(Page);

		const redirectMessage = page.getByText('Redirecting to the task queue.');
		await expect.element(redirectMessage).toBeInTheDocument();
	});
});
