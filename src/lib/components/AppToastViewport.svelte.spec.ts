import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { showAppToast } from '$lib/client/app-toast';
import AppToastViewport from './AppToastViewport.svelte';

describe('AppToastViewport.svelte', () => {
	it('renders dispatched app toasts', async () => {
		render(AppToastViewport);

		showAppToast({
			message: 'Opened in VS Code CLI.',
			tone: 'success'
		});

		await expect.element(page.getByText('Opened in VS Code CLI.')).toBeInTheDocument();
	});
});
