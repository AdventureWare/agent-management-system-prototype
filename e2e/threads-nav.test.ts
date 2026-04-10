import { expect, test } from '@playwright/test';

async function unlockOperatorApp(page: import('@playwright/test').Page) {
	await page.getByRole('textbox', { name: 'Operator password' }).fill('StrongPassword123');
	await page.getByRole('button', { name: 'Open operator app' }).click();
}

test('sidebar threads link opens the threads index', async ({ page }) => {
	await page.goto('/app/home');

	await unlockOperatorApp(page);

	await page.locator('[data-scope="navigation"]').getByRole('link', { name: 'Threads' }).click();

	await expect(page).toHaveURL(/\/app\/threads$/);
	await expect(page.getByRole('heading', { name: 'Browse active and historical threads' })).toBeVisible();
});
