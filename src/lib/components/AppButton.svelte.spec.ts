import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AppButton from './AppButton.svelte';

describe('AppButton.svelte', () => {
	it('preserves already resolved relative hrefs', () => {
		render(AppButton, {
			href: '../app/tasks/task_1'
		});

		const anchor = document.querySelector('a');

		expect(anchor?.getAttribute('href')).toBe('../app/tasks/task_1');
	});

	it('keeps resolving root-relative internal hrefs', () => {
		render(AppButton, {
			href: '/app/tasks/task_1'
		});

		const anchor = document.querySelector('a');

		expect(anchor?.getAttribute('href')).toBe('/app/tasks/task_1');
	});
});
