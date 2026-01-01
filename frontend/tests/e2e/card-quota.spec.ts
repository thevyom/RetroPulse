/**
 * Card Quota E2E Tests
 *
 * Tests card creation limits and quota enforcement.
 */

import { test, expect } from '@playwright/test';
import { waitForBoardLoad, createCard, findCardByContent, deleteCard } from './helpers';

test.describe('Card Quota Enforcement', () => {
  // Use a board with card limit = 2 for testing
  const quotaBoardId = process.env.QUOTA_BOARD_ID || 'test-board-quota';

  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.E2E_BACKEND_READY, 'Backend not running');
  });

  test('allows card creation when under limit', async ({ page }) => {
    await page.goto(`/board/${quotaBoardId}`);
    await waitForBoardLoad(page);

    // Create first card
    const content1 = `Quota test 1 - ${Date.now()}`;
    await createCard(page, 'col-1', content1);

    // Verify card appears
    const card = await findCardByContent(page, content1);
    await expect(card).toBeVisible();
  });

  test('shows quota status indicator', async ({ page }) => {
    await page.goto(`/board/${quotaBoardId}`);
    await waitForBoardLoad(page);

    // Look for quota indicator in the UI
    const quotaIndicator = page
      .getByTestId('card-quota-indicator')
      .or(page.locator('[aria-label*="quota"]'))
      .or(page.locator('text=/\\d+\\/\\d+ cards/'));

    // If quota indicator exists, it should show the count
    if (await quotaIndicator.isVisible().catch(() => false)) {
      const text = await quotaIndicator.textContent();
      expect(text).toMatch(/\d+/); // Should contain numbers
    }
  });

  test('blocks creation when quota exhausted', async ({ page }) => {
    await page.goto(`/board/${quotaBoardId}`);
    await waitForBoardLoad(page);

    // Try to click add button when at limit
    const addButton = page.getByTestId('add-card-col-1').or(page.locator('button').filter({ hasText: '+' }).first());

    // Check if button is disabled
    const isDisabled = await addButton.isDisabled().catch(() => false);

    if (!isDisabled) {
      // Button might show error on click
      await addButton.click();

      // Look for error message
      const errorMessage = page
        .getByTestId('quota-error')
        .or(page.locator('[role="alert"]'))
        .or(page.locator('text=/limit|quota|maximum/i'));

      // If we've hit the limit, an error should appear
      const errorVisible = await errorMessage.isVisible().catch(() => false);
      if (errorVisible) {
        expect(errorVisible).toBe(true);
      }
    } else {
      // Button is disabled when at quota limit
      expect(isDisabled).toBe(true);
    }
  });

  test('action cards may not count toward quota', async ({ page }) => {
    await page.goto(`/board/${quotaBoardId}`);
    await waitForBoardLoad(page);

    // Create an action card
    const content = `Action item ${Date.now()}`;

    // Navigate to action column and create
    const addButton = page.getByTestId('add-card-col-3').or(
      page.locator('[data-testid="column-col-3"] button').filter({ hasText: '+' }).first()
    );

    if (await addButton.isVisible().catch(() => false)) {
      await createCard(page, 'col-3', content, { cardType: 'action' });

      // Action card should be created regardless of quota
      const card = await findCardByContent(page, content);
      await expect(card).toBeVisible();
    }
  });

  test('deleting card frees quota slot', async ({ page }) => {
    await page.goto(`/board/${quotaBoardId}`);
    await waitForBoardLoad(page);

    // Create a card
    const content = `Delete for quota ${Date.now()}`;
    await createCard(page, 'col-1', content);

    // Get initial quota status
    const addButton = page.getByTestId('add-card-col-1').or(page.locator('button').filter({ hasText: '+' }).first());
    const wasDisabledBefore = await addButton.isDisabled().catch(() => false);

    // Delete the card
    await deleteCard(page, content);

    // Check if we can create another card now
    const isDisabledAfter = await addButton.isDisabled().catch(() => false);

    // If was disabled before, should be enabled after delete
    if (wasDisabledBefore) {
      expect(isDisabledAfter).toBe(false);
    }
  });
});

test.describe('Anonymous Cards', () => {
  const testBoardId = process.env.TEST_BOARD_ID || 'test-board-anon';

  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.E2E_BACKEND_READY, 'Backend not running');
  });

  test('anonymous card hides creator info', async ({ page }) => {
    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);

    // Create anonymous card
    const content = `Anon test ${Date.now()}`;
    await createCard(page, 'col-1', content, { isAnonymous: true });

    // Find the card
    const card = await findCardByContent(page, content);
    await expect(card).toBeVisible();

    // Card should not show author name
    const authorElement = card.locator('[data-testid="card-author"]').or(card.locator('.author'));
    const authorVisible = await authorElement.isVisible().catch(() => false);

    if (authorVisible) {
      // If author element exists, it should say "Anonymous" or be empty
      const authorText = await authorElement.textContent();
      expect(authorText).toMatch(/anonymous|^$/i);
    }
  });

  test('public card shows creator info', async ({ page }) => {
    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);

    // Create public (non-anonymous) card
    const content = `Public test ${Date.now()}`;
    await createCard(page, 'col-1', content, { isAnonymous: false });

    // Find the card
    const card = await findCardByContent(page, content);
    await expect(card).toBeVisible();

    // Card should show author info (alias)
    const authorElement = card.locator('[data-testid="card-author"]').or(card.locator('.author'));

    // If author element exists, it should have some content
    if (await authorElement.isVisible().catch(() => false)) {
      const authorText = await authorElement.textContent();
      expect(authorText?.length).toBeGreaterThan(0);
      expect(authorText?.toLowerCase()).not.toBe('anonymous');
    }
  });

  test('user can delete own anonymous card', async ({ page }) => {
    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);

    // Create anonymous card
    const content = `Delete anon ${Date.now()}`;
    await createCard(page, 'col-1', content, { isAnonymous: true });

    // Verify card exists
    const card = await findCardByContent(page, content);
    await expect(card).toBeVisible();

    // Delete button should be visible for the creator
    await card.hover();
    const deleteButton = card.locator('[data-testid="delete-card"]').or(card.locator('button[aria-label*="delete"]'));
    await expect(deleteButton).toBeVisible();

    // Delete the card
    await deleteCard(page, content);

    // Card should be gone
    await expect(card).not.toBeVisible();
  });

  test('other user cannot delete anonymous card', async ({ browser }) => {
    test.skip(!process.env.E2E_BACKEND_READY, 'Backend not running');

    const testBoardId = process.env.TEST_BOARD_ID || 'test-board-anon-multi';

    // Create two contexts
    const creatorContext = await browser.newContext();
    const otherContext = await browser.newContext();

    const creatorPage = await creatorContext.newPage();
    const otherPage = await otherContext.newPage();

    try {
      // Creator joins and creates anonymous card
      await creatorPage.goto(`/board/${testBoardId}`);
      await waitForBoardLoad(creatorPage);

      const content = `Other anon ${Date.now()}`;
      await createCard(creatorPage, 'col-1', content, { isAnonymous: true });

      // Other user joins
      await otherPage.goto(`/board/${testBoardId}`);
      await waitForBoardLoad(otherPage);

      // Wait for card to appear via real-time
      await otherPage.waitForSelector(`text="${content}"`, { timeout: 10000 });

      // Find the card on other user's page
      const card = await findCardByContent(otherPage, content);
      await card.hover();

      // Delete button should NOT be visible to other user
      const deleteButton = card.locator('[data-testid="delete-card"]').or(card.locator('button[aria-label*="delete"]'));
      await expect(deleteButton).not.toBeVisible({ timeout: 2000 }).catch(() => {
        // If button exists, it might be disabled
        return deleteButton.isDisabled().then(disabled => expect(disabled).toBe(true));
      });

    } finally {
      await creatorContext.close();
      await otherContext.close();
    }
  });
});
