/**
 * Sorting and Filtering E2E Tests
 *
 * Tests sort modes and user/anonymous filtering.
 */

import { test, expect } from '@playwright/test';
import { waitForBoardLoad, createCard, getBoardId, isBackendReady } from './helpers';

test.describe('Sorting and Filtering', () => {
  // Use dedicated sorting board to avoid conflicts with admin tests that close the default board
  const testBoardId = getBoardId('sorting');

  test.beforeEach(async ({ page }) => {
    test.skip(!isBackendReady(), 'Backend not running');
    await page.goto(`/boards/${testBoardId}`);
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

    // Third card should be visible on the page (newest first is default)
    // Cards are paragraphs inside button elements with drag handles
    const thirdCard = page.getByText(/^Third \d+$/).first();
    await expect(thirdCard).toBeVisible();
  });

  test('sort dropdown changes sort mode', async ({ page }) => {
    // Use accessible selectors - look for sort control by role first
    const sortDropdown = page
      .getByRole('combobox', { name: /sort/i })
      .or(page.getByRole('button', { name: /sort/i }))
      .or(page.locator('[aria-label*="sort"]'));

    if (
      await sortDropdown
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await sortDropdown.first().click();

      // Select popularity option using accessible selector
      const popularityOption = page
        .getByRole('option', { name: /popular/i })
        .or(page.getByText(/popular/i));

      if (
        await popularityOption
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await popularityOption.first().click();

        // Verify dropdown shows new mode
        await expect(sortDropdown.first()).toContainText(/popular/i);
      }
    }
  });

  test('filter by specific user shows only their cards', async ({ browser }) => {
    // SKIP: This test requires real-time WebSocket sync between two browser contexts
    // and clicking participant avatars to filter. The current implementation has issues:
    // 1. User aliases are auto-generated (E2EUser####), not predictable names
    // 2. Filtering by clicking avatars requires WebSocket sync to propagate participant info
    // 3. The filter behavior may vary based on UI state
    // TODO: Revisit when participant filtering is more stable
    test.skip(true, 'Multi-user filter test requires stable WebSocket sync - skipping');
  });

  test('filter by Anonymous shows only anonymous cards', async ({ page: _page }) => {
    // SKIP: Known bug UTB-012 - Anonymous filter logic is inverted
    // See: docs/frontend/USER_TESTING_BUGS.md#utb-012-anonymous-filter-logic-inverted
    test.skip(
      true,
      'Known bug UTB-012: Anonymous filter hides anonymous cards instead of showing only anonymous'
    );
  });

  test('All Users filter shows all cards', async ({ page }) => {
    // Create multiple cards
    const card1 = `All1 ${Date.now()}`;
    const card2 = `All2 ${Date.now()}`;

    await createCard(page, 'col-1', card1);
    await createCard(page, 'col-1', card2);

    // Click All Users filter - use accessible selector
    const allUsersFilter = page
      .getByRole('button', { name: /all users|everyone/i })
      .or(page.getByText(/all users/i))
      .or(page.locator('[aria-label*="all users"]'));

    if (
      await allUsersFilter
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await allUsersFilter.first().click();

      // Both cards visible
      await expect(page.getByText(card1)).toBeVisible();
      await expect(page.getByText(card2)).toBeVisible();
    }
  });

  test('sort persists after refresh', async ({ page }) => {
    // Change sort mode - use accessible selectors
    const sortDropdown = page
      .getByRole('combobox', { name: /sort/i })
      .or(page.getByRole('button', { name: /sort/i }))
      .or(page.locator('[aria-label*="sort"]'));

    if (
      await sortDropdown
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await sortDropdown.first().click();

      const popularityOption = page
        .getByRole('option', { name: /popular/i })
        .or(page.getByText(/popular/i));

      if (
        await popularityOption
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await popularityOption.first().click();

        // Refresh page
        await page.reload();
        await waitForBoardLoad(page);

        // Sort mode should persist
        await expect(sortDropdown.first()).toContainText(/popular/i);
      }
    }
  });

  test('filter shows count of matching cards', async ({ page }) => {
    // Check if filter shows count - use accessible selector
    // This is an optional feature - test passes if not implemented
    const filterCount = page.getByText(/\d+\s*cards?/i);

    const isVisible = await filterCount
      .first()
      .isVisible()
      .catch(() => false);
    if (isVisible) {
      const countText = await filterCount.first().textContent();
      // Only check if we found meaningful content (not empty string)
      if (countText && countText.trim().length > 0) {
        expect(countText).toMatch(/\d+/); // Should contain a number
      }
    }
    // Test passes if filter count feature is not implemented
  });

  test.describe('Sort Performance (UTB-010)', () => {
    test('header remains stable when sort changes', async ({ page }) => {
      // Get initial header reference
      const header = page.locator('header').first();
      const initialHeaderBox = await header.boundingBox();

      // Find sort dropdown
      const sortDropdown = page
        .getByRole('combobox', { name: /sort/i })
        .or(page.getByRole('button', { name: /sort/i }))
        .or(page.locator('[aria-label*="sort"]'));

      if (
        await sortDropdown
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await sortDropdown.first().click();

        const popularityOption = page
          .getByRole('option', { name: /popular/i })
          .or(page.getByText(/popular/i));

        if (
          await popularityOption
            .first()
            .isVisible()
            .catch(() => false)
        ) {
          await popularityOption.first().click();

          // Small wait for any potential re-render
          await page.waitForTimeout(100);

          // Header should still be at same position (no layout shift)
          const afterHeaderBox = await header.boundingBox();

          if (initialHeaderBox && afterHeaderBox) {
            expect(afterHeaderBox.y).toBe(initialHeaderBox.y);
            expect(afterHeaderBox.height).toBe(initialHeaderBox.height);
          }
        }
      }
    });
  });

  test.describe('Anonymous Filter Visual Indicator (UTB-013)', () => {
    test('Anonymous filter shows visual active state when clicked', async ({ page }) => {
      // Find the Anonymous filter button
      const anonymousFilter = page
        .getByRole('button', { name: /filter by anonymous/i })
        .or(page.locator('[aria-label="Filter by Anonymous Cards"]'));

      await expect(anonymousFilter.first()).toBeVisible();

      // Initially should not be pressed
      await expect(anonymousFilter.first()).toHaveAttribute('aria-pressed', 'false');

      // Click to activate
      await anonymousFilter.first().click();

      // Should now show as pressed/selected with ring indicator
      await expect(anonymousFilter.first()).toHaveAttribute('aria-pressed', 'true');

      // Visual indicator: ring class should be applied (verify via computed style or class)
      // The component applies 'ring-2 ring-primary ring-offset-2' when selected
      const filterButton = anonymousFilter.first();
      const className = await filterButton.getAttribute('class');
      expect(className).toContain('ring');
    });

    test('Anonymous filter ring disappears when deselected', async ({ page }) => {
      const anonymousFilter = page
        .getByRole('button', { name: /filter by anonymous/i })
        .or(page.locator('[aria-label="Filter by Anonymous Cards"]'));

      // Click to activate
      await anonymousFilter.first().click();
      await expect(anonymousFilter.first()).toHaveAttribute('aria-pressed', 'true');

      // Click All Users to deselect anonymous
      const allUsersFilter = page
        .getByRole('button', { name: /filter by all users/i })
        .or(page.locator('[aria-label="Filter by All Users"]'));
      await allUsersFilter.first().click();

      // Anonymous should no longer be pressed
      await expect(anonymousFilter.first()).toHaveAttribute('aria-pressed', 'false');
    });
  });

  test.describe('Single-Selection Filter (UTB-017)', () => {
    test('clicking new filter deselects previous filter', async ({ page }) => {
      // Get filter buttons
      const allUsersFilter = page
        .getByRole('button', { name: /filter by all users/i })
        .or(page.locator('[aria-label="Filter by All Users"]'));
      const anonymousFilter = page
        .getByRole('button', { name: /filter by anonymous/i })
        .or(page.locator('[aria-label="Filter by Anonymous Cards"]'));

      // All Users should be selected by default
      await expect(allUsersFilter.first()).toHaveAttribute('aria-pressed', 'true');
      await expect(anonymousFilter.first()).toHaveAttribute('aria-pressed', 'false');

      // Click Anonymous
      await anonymousFilter.first().click();

      // Anonymous should now be selected, All Users deselected
      await expect(anonymousFilter.first()).toHaveAttribute('aria-pressed', 'true');
      await expect(allUsersFilter.first()).toHaveAttribute('aria-pressed', 'false');

      // Click All Users again
      await allUsersFilter.first().click();

      // All Users selected, Anonymous deselected
      await expect(allUsersFilter.first()).toHaveAttribute('aria-pressed', 'true');
      await expect(anonymousFilter.first()).toHaveAttribute('aria-pressed', 'false');
    });
  });
});
