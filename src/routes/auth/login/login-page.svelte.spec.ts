import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

function renderPage(form?: { message?: string; nextPath?: string }) {
	render(Page, {
		data: {
			formAction: '/auth/login?next=/app/v2-core',
			nextPath: '/app/v2-core'
		},
		form
	});
}

function expectNoHorizontalOverflow() {
	const root = document.documentElement;
	const body = document.body;
	const rootOverflow = root.scrollWidth - root.clientWidth;
	const bodyOverflow = body.scrollWidth - body.clientWidth;

	expect(rootOverflow).toBeLessThanOrEqual(1);
	expect(bodyOverflow).toBeLessThanOrEqual(1);
}

describe('/auth/login/+page.svelte', () => {
	it('renders the remote operator login form', async () => {
		renderPage();

		await expect.element(page.getByText('Remote Operator Access')).toBeInTheDocument();
		await expect.element(page.getByLabelText('Operator password')).toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'Open operator app' }))
			.toBeInTheDocument();
		expect(document.querySelector('input[name="next"]')?.getAttribute('value')).toBe(
			'/app/v2-core'
		);
	});

	it('keeps the access gate usable in a phone viewport', async () => {
		await page.viewport(390, 844);
		renderPage({
			message: 'Password did not match the configured remote operator password.',
			nextPath: '/app/v2-core'
		});

		await expect.element(page.getByText('Unlock the control plane')).toBeInTheDocument();
		await expect
			.element(page.getByText('Password did not match the configured remote operator password.'))
			.toBeInTheDocument();
		expectNoHorizontalOverflow();
	});
});
