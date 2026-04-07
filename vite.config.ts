import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';

const remotePreviewAllowedHosts = (process.env.AMS_REMOTE_PREVIEW_ALLOWED_HOSTS ?? '')
	.split(',')
	.map((value) => value.trim())
	.filter(Boolean);
const enableBrowserTests = process.env.VITEST_BROWSER === '1';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	preview:
		remotePreviewAllowedHosts.length > 0 ? { allowedHosts: remotePreviewAllowedHosts } : undefined,
	test: {
		expect: { requireAssertions: true },
		projects: [
			...(enableBrowserTests
				? [
						{
							extends: './vite.config.ts',
							test: {
								name: 'client',
								browser: {
									enabled: true,
									api: {
										host: '127.0.0.1'
									},
									provider: playwright(),
									instances: [{ browser: 'chromium' as const, headless: true }]
								},
								include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
								exclude: ['src/lib/server/**']
							}
						}
					]
				: []),

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
