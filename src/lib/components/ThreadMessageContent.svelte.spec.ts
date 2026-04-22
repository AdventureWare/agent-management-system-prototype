import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ThreadMessageContent from './ThreadMessageContent.svelte';

describe('ThreadMessageContent.svelte', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
			const url = input instanceof URL ? input.toString() : input.toString();

			if (url.includes('/api/artifacts/inspect?')) {
				return new Response(JSON.stringify({ exists: true, kind: 'file' }), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				});
			}

			return new Response('', { status: 200 });
		});
	});

	afterEach(() => {
		document.body.innerHTML = '';
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it('renders paragraphs, lists, inline formatting, and code blocks with improved markdown flow', async () => {
		render(ThreadMessageContent, {
			text: [
				'Wrapped paragraph line',
				'continues without a forced break.',
				'',
				'- First item',
				'  continued detail',
				'- Second item',
				'',
				'> Quoted line one',
				'> quoted line two',
				'',
				'Use **bold** and *italics* and `const value = 1;`.',
				'',
				'```ts',
				'const answer = 42;',
				'console.log(answer);',
				'```'
			].join('\n')
		});

		const paragraphs = Array.from(document.querySelectorAll('p'));
		const firstParagraph = paragraphs.find((paragraph) =>
			paragraph.textContent?.includes('Wrapped paragraph line')
		);
		expect(firstParagraph?.textContent).toContain(
			'Wrapped paragraph line continues without a forced break.'
		);
		expect(firstParagraph?.querySelector('br')).toBeNull();

		const listItems = Array.from(document.querySelectorAll('li')).map((item) =>
			item.textContent?.replace(/\s+/g, ' ').trim()
		);
		expect(listItems).toContain('First item continued detail');
		expect(listItems).toContain('Second item');

		const quoteParagraph = document.querySelector('blockquote p');
		expect(quoteParagraph?.textContent).toContain('Quoted line one quoted line two');

		expect(document.querySelector('strong')?.textContent).toBe('bold');
		expect(document.querySelector('em')?.textContent).toBe('italics');
		expect(document.querySelector('p code')?.textContent).toBe('const value = 1;');

		const codeBlock = document.querySelector('[data-testid="thread-message-code-block"] code');
		expect(codeBlock?.textContent).toContain('const answer = 42;');
		expect(document.body.textContent).toContain('Copy');
		expect(document.body.textContent).toContain('ts');
	});

	it('preserves explicit hard breaks and normalizes angle-bracketed local file links', async () => {
		render(ThreadMessageContent, {
			text: 'First line  \nSecond line\n\nSee [artifact](</tmp/demo folder/output.md:12>).'
		});

		const explicitBreakParagraph = Array.from(document.querySelectorAll('p')).find((paragraph) =>
			paragraph.textContent?.includes('First line')
		);
		expect(explicitBreakParagraph?.querySelectorAll('br').length).toBe(1);

		const artifactReference = document.querySelector('[title="/tmp/demo folder/output.md:12"]');
		expect(artifactReference).not.toBeNull();
		expect(artifactReference?.textContent).toContain('artifact');
	});
});
