import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import AgentGuidanceCoordinationPreviewDialog from './AgentGuidanceCoordinationPreviewDialog.svelte';

const MEMORY_KEY = 'ams:coordination-preview-memory';

function contactTargetsResponse() {
	return new Response(
		JSON.stringify({
			targets: [
				{
					id: 'thread_reviewer',
					handle: 'reviewer',
					contactLabel: 'Reviewer thread',
					projectLabel: 'AMS',
					roleLabel: 'Reviewer',
					lastActivityLabel: 'just now',
					threadState: 'idle',
					canContact: true,
					disabledReason: '',
					routingReason: 'Available for contact.'
				}
			]
		}),
		{ status: 200, headers: { 'content-type': 'application/json' } }
	);
}

describe('AgentGuidanceCoordinationPreviewDialog.svelte', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		window.localStorage.clear();
		globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);

			if (url.includes('/contact-targets')) {
				return contactTargetsResponse();
			}

			if (url.includes('/api/agent-intents/coordinate_with_another_thread')) {
				return new Response(
					JSON.stringify({
						valid: true,
						action: 'intent:coordinate_with_another_thread',
						checks: ['Target thread can be contacted.'],
						preview: JSON.parse(String(init?.body ?? '{}')),
						suggestedNextCommands: ['intent coordinate_with_another_thread']
					}),
					{ status: 200, headers: { 'content-type': 'application/json' } }
				);
			}

			return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
		});
	});

	afterEach(() => {
		document.body.innerHTML = '';
		window.localStorage.clear();
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it('restores the last target and prompt for a source thread', async () => {
		window.localStorage.setItem(
			MEMORY_KEY,
			JSON.stringify({
				thread_source: {
					targetThreadIdOrHandle: 'remembered-target',
					prompt: 'Remembered coordination prompt.',
					updatedAt: '2026-04-23T12:00:00.000Z'
				}
			})
		);

		render(AgentGuidanceCoordinationPreviewDialog, {
			open: true,
			sourceThreadId: 'thread_source',
			sourceThreadLabel: 'Source thread',
			initialPrompt: 'Initial prompt.'
		});

		await expect
			.element(page.getByText('Restored the last target and prompt used from this source thread.'))
			.toBeInTheDocument();
		await expect.element(page.getByText('Reviewer thread')).toBeInTheDocument();

		const targetInput = document.querySelector(
			'input[placeholder="thread_123 or researcher"]'
		) as HTMLInputElement | null;
		const promptInput = document.querySelector('textarea') as HTMLTextAreaElement | null;

		expect(targetInput?.value).toBe('remembered-target');
		expect(promptInput?.value).toBe('Remembered coordination prompt.');
	});

	it('saves the target and prompt after a successful preview', async () => {
		render(AgentGuidanceCoordinationPreviewDialog, {
			open: true,
			sourceThreadId: 'thread_source',
			sourceThreadLabel: 'Source thread',
			initialPrompt: 'Initial prompt.'
		});

		await expect.element(page.getByText('Reviewer thread')).toBeInTheDocument();

		const targetInput = document.querySelector(
			'input[placeholder="thread_123 or researcher"]'
		) as HTMLInputElement;
		const promptInput = document.querySelector('textarea') as HTMLTextAreaElement;

		targetInput.value = 'reviewer';
		targetInput.dispatchEvent(new Event('input', { bubbles: true }));
		promptInput.value = 'Need focused review before approval.';
		promptInput.dispatchEvent(new Event('input', { bubbles: true }));

		await page.getByRole('button', { name: 'Run preview' }).click();
		await expect.element(page.getByText('Preview valid')).toBeInTheDocument();

		const memory = JSON.parse(window.localStorage.getItem(MEMORY_KEY) ?? '{}');
		expect(memory.thread_source.targetThreadIdOrHandle).toBe('reviewer');
		expect(memory.thread_source.prompt).toBe('Need focused review before approval.');
		expect(memory.thread_source.updatedAt).toEqual(expect.any(String));
	});
});
