import { describe, expect, it } from 'vitest';
import { load as loadRootPage } from './+page.server';
import { load as loadAppLandingPage } from './app/+page.server';

describe('task queue entry redirects', () => {
	it('redirects the root landing page to the task queue', async () => {
		await expect(loadRootPage()).rejects.toMatchObject({
			status: 307,
			location: '/app/tasks'
		});
	});

	it('redirects the app landing page to the task queue', async () => {
		await expect(loadAppLandingPage()).rejects.toMatchObject({
			status: 307,
			location: '/app/tasks'
		});
	});
});
