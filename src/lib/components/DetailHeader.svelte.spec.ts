import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import DetailHeader from './DetailHeader.svelte';

describe('DetailHeader.svelte', () => {
	it('preserves an already resolved relative back href', () => {
		render(DetailHeader, {
			backHref: '../app',
			title: 'Artifacts'
		});

		const backLink = document.querySelector('a');

		expect(backLink?.getAttribute('href')).toBe('../app');
	});

	it('keeps resolving root-relative back hrefs', () => {
		render(DetailHeader, {
			backHref: '/app',
			title: 'Artifacts'
		});

		const backLink = document.querySelector('a');

		expect(backLink?.getAttribute('href')).toBe('/app');
	});
});
