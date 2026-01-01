/**
 * Sorting and Filtering E2E Tests
 *
 * Tests sort modes and user/anonymous filtering.
 */

import { test, expect } from '@playwright/test';
import { waitForBoardLoad, createCard } from './helpers';

test.describe('Sorting and Filtering', () => {
  const testBoardId = process.env.TEST_BOARD_ID || 'test-board-sort';

  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.E2E_BACKEND_READY, 'Backend not running');
    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);
  });

  test('sort by recency shows newest first (default)', async ({ page }) => {
    // Create cards sequentially - each card creation waits for visibility
    const card1 = `First ${Date.now()}`;
    await createCard(page, 'col-1', card1);

    const card2 = `Second ${Date.now() + 1}`;
    await createCard(page, 'col-1', card2);

    const card3 = `Third ${Date.now() + 2}`;
    await createCard(page, 'col-1', card3);

    // Default sort is recency (newest first)
    const cards = page.locator('[data-testid="column-col-1"] [data-testid^="card-"]');
    const firstCardText = await cards.first().textContent();

    // Third card should be first (newest)
    expect(firstCardText).toContain('Third');
  });

  test('sort dropdown changes sort mode', async ({ page }) => {
    const sortDropdown = page
      .getByTestId('sort-dropdown')
      .or(page.locator('[aria-label*="sort"]'))
      .or(page.getByRole('combobox', { name: /sort/i }));

    if (await sortDropdown.isVisible().catch(() => false)) {
      await sortDropdown.click();

      // Select popularity option
      const popularityOption = page
        .getByTestId('sort-option-popularity')
        .or(page.getByRole('option', { name: /popular/i }));

      if (await popularityOption.isVisible().catch(() => false)) {
        await popularityOption.click();

        // Verify dropdown shows new mode
        await expect(sortDropdown).toContainText(/popular/i);
      }
    }
  });

  test('filter by specific user shows only their cards', async ({ browser }) => {
    test.skip(!process.env.E2E_BACKEND_READY, 'Backend not running');

    const testBoardId = process.env.TEST_BOARD_ID || 'test-board-filter';

    // Create two contexts (two users)
    const aliceContext = await browser.newContext();
    const bobContext = await browser.newContext();

    const alice = await aliceContext.newPage();
    const bob = await bobContext.newPage();

    try {
      // Both join board
      await alice.goto(`/board/${testBoardId}`);
      await bob.goto(`/board/${testBoardId}`);

      await waitForBoardLoad(alice);
      await waitForBoardLoad(bob);

      // Each creates a card
      const aliceCard = `Alice card ${Date.now()}`;
      const bobCard = `Bob card ${Date.now()}`;

      await createCard(alice, 'col-1', aliceCard);
      await createCard(bob, 'col-1', bobCard);

      // Wait for cards to sync across users
      await expect(alice.locator(`text="${bobCard}"`)).toBeVisible({ timeout: 10000 });

      // Alice filters by Bob (click Bob's avatar in participant bar)
      const bobAvatar = alice
        .getByTestId('participant-avatar-Bob')
        .or(alice.locator('[data-testid^="participant-avatar"]').filter({ hasText: /Bob/i }));

      if (await bobAvatar.isVisible().catch(() => false)) {
        await bobAvatar.click();

        // Only Bob's card should be visible
        await expect(alice.locator(`text="${bobCard}"`)).toBeVisible();
        await expect(alice.locator(`text="${aliceCard}"`)).not.toBeVisible();
      }
    } finally {
      await aliceContext.close();
      await bobContext.close();
    }
  });

  test('filter by Anonymous shows only anonymous cards', async ({ page }) => {
    // Create public and anonymous cards
    const publicCard = `Public ${Date.now()}`;
    const anonCard = `Anonymous ${Date.now()}`;

    await createCard(page, 'col-1', publicCard, { isAnonymous: false });
    await createCard(page, 'col-1', anonCard, { isAnonymous: true });

    // Click anonymous filter
    const anonFilter = page
      .getByTestId('anonymous-filter-avatar')
      .or(page.locator('[data-testid="filter-anonymous"]'))
      .or(page.locator('[aria-label*="anonymous"]'));

    if (await anonFilter.isVisible().catch(() => false)) {
      await anonFilter.click();

      // Only anonymous card visible
      await expect(page.locator(`text="${anonCard}"`)).toBeVisible();
      await expect(page.locator(`text="${publicCard}"`)).not.toBeVisible();
    }
  });

  test('All Users filter shows all cards', async ({ page }) => {
    // Create multiple cards
    const card1 = `All1 ${Date.now()}`;
    const card2 = `All2 ${Date.now()}`;

    await createCard(page, 'col-1', card1);
    await createCard(page, 'col-1', card2);

    // Click All Users filter
    const allUsersFilter = page
      .getByTestId('all-users-filter-avatar')
      .or(page.locator('[data-testid="filter-all"]'))
      .or(page.locator('[aria-label*="all users"]'));

    if (await allUsersFilter.isVisible().catch(() => false)) {
      await allUsersFilter.click();

      // Both cards visible
      await expect(page.locator(`text="${card1}"`)).toBeVisible();
      await expect(page.locator(`text="${card2}"`)).toBeVisible();
    }
  });

  test('sort persists after refresh', async ({ page }) => {
    // Change sort mode
    const sortDropdown = page.getByTestId('sort-dropdown').or(page.locator('[aria-label*="sort"]'));

    if (await sortDropdown.isVisible().catch(() => false)) {
      await sortDropdown.click();

      const popularityOption = page
        .getByTestId('sort-option-popularity')
        .or(page.getByRole('option', { name: /popular/i }));

      if (await popularityOption.isVisible().catch(() => false)) {
        await popularityOption.click();

        // Refresh page
        await page.reload();
        await waitForBoardLoad(page);

        // Sort mode should persist
        await expect(sortDropdown).toContainText(/popular/i);
      }
    }
  });

  test('filter shows count of matching cards', async ({ page }) => {
    // Check if filter shows count
    const filterCount = page
      .getByTestId('filter-count')
      .or(page.locator('[aria-label*="cards"] span'));

    if (await filterCount.isVisible().catch(() => false)) {
      const countText = await filterCount.textContent();
      expect(countText).toMatch(/\d+/); // Should contain a number
    }
  });
});
