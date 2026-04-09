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
const ignoredRuntimeWatchGlobs = [
	'**/data',
	'**/data/**',
	'**/agent_output',
	'**/agent_output/**',
	'**/output',
	'**/output/**',
	'**/screenshots',
	'**/screenshots/**',
	'**/__screenshots__/**',
	'**/__snapshots__/**',
	'**/__image_snapshots__/**',
	'**/.playwright-cli/**',
	'**/.playwright-mcp/**',
	'**/.kwipoo-app-link',
	'**/.kwipoo-app-link/**',
	'**/*.sqlite',
	'**/*.sqlite-*',
	'**/.DS_Store'
];

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	server: {
		watch: {
			// Prevent traversal into repo-root symlinks such as .kwipoo-app-link, which can point at
			// large external app trees and exhaust watcher/memory limits during long-running dev sessions.
			followSymlinks: false,
			// Ignore live runtime artifacts so Vite only watches source files during dev.
			ignored: ignoredRuntimeWatchGlobs
		}
	},
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
								setupFiles: ['vitest-browser-svelte'],
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
