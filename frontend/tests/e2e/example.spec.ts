import { test, expect } from '@playwright/test';

test('homepage has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/frontend/);
});

test('homepage contains Vite logo', async ({ page }) => {
  await page.goto('/');
  const viteLogo = page.getByAltText('Vite logo');
  await expect(viteLogo).toBeVisible();
});
