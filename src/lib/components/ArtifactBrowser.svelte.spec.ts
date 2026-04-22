import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import ArtifactBrowser from './ArtifactBrowser.svelte';

describe('ArtifactBrowser.svelte', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		globalThis.fetch = vi.fn(
			async () => new Response('# Preview file\n\nHello world.', { status: 200 })
		);
	});

	afterEach(() => {
		document.body.innerHTML = '';
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it('shows an inline preview for a root file and routes file actions through the artifact viewer', async () => {
		window.localStorage.clear();
		render(ArtifactBrowser, {
			browser: {
				rootPath: '/tmp/project/agent_output/brief.md',
				rootKind: 'file',
				browsePath: '/tmp/project/agent_output',
				inspectingParentDirectory: true,
				directoryEntries: [
					{
						name: 'diagram.png',
						path: '/tmp/project/agent_output/diagram.png',
						kind: 'file',
						extension: 'png',
						sizeBytes: 1536
					}
				],
				directoryEntriesTruncated: false,
				knownOutputs: [
					{
						label: 'brief.md',
						path: '/tmp/project/agent_output/brief.md',
						kind: 'file',
						extension: 'md',
						sizeBytes: 2048,
						exists: true,
						href: '/api/tasks/task_1/attachments/attachment_1',
						description: 'Attached task file'
					}
				],
				errorMessage: ''
			}
		});

		expect(document.body.textContent).toContain('File preview');
		await expect.element(page.getByText('Hello world.')).toBeInTheDocument();
		expect(document.body.textContent).toContain('Open in editor');
		expect(document.body.textContent).toContain('Preferred editor');
		expect(document.body.textContent).toContain('Auto detect');
		expect(document.body.textContent).toContain('Quick preview');
		expect(document.body.textContent).toContain('Copy link');

		const pageLinks = Array.from(document.querySelectorAll('a')).filter(
			(link) => link.textContent?.trim() === 'Open page'
		);
		expect(
			pageLinks.some(
				(link) =>
					link.getAttribute('href') ===
					'/app/artifacts?path=%2Ftmp%2Fproject%2Fagent_output%2Fbrief.md'
			)
		).toBe(true);
		expect(
			Array.from(document.querySelectorAll('a')).some(
				(link) =>
					link.getAttribute('href') ===
					'/api/artifacts/file?path=%2Ftmp%2Fproject%2Fagent_output%2Fbrief.md'
			)
		).toBe(true);
		expect(
			Array.from(document.querySelectorAll('a')).some(
				(link) =>
					link.getAttribute('href') === '/app/artifacts?path=%2Ftmp%2Fproject%2Fagent_output'
			)
		).toBe(true);
	});
});
