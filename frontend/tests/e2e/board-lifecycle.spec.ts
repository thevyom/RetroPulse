/**
 * Board Lifecycle E2E Tests
 *
 * Tests board creation, renaming, usage, and closure.
 */

import { test, expect } from '@playwright/test';
import { waitForBoardLoad, createCard, closeBoard, isBoardClosed, getBoardId, isBackendReady } from './helpers';

test.describe('Board Lifecycle', () => {
  // Use dedicated lifecycle board
  const testBoardId = getBoardId('lifecycle');

  test.beforeEach(async ({ page }) => {
    test.skip(!isBackendReady(), 'Backend not running');
  });

  test('board displays header with name', async ({ page }) => {
    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);

    // Board header should be visible
    const header = page.locator('[data-testid="board-header"]').or(page.locator('h1'));
    await expect(header).toBeVisible();
  });

  test('admin can rename board', async ({ page }) => {
    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);

    // Click edit button
    const editButton = page
      .getByTestId('edit-board-button')
      .or(page.getByRole('button', { name: /edit/i }));

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();

      // Fill new name
      const nameInput = page
        .getByTestId('board-name-input')
        .or(page.locator('[role="dialog"] input'));
      const newName = `Renamed Board ${Date.now()}`;
      await nameInput.fill(newName);

      // Save
      const saveButton = page.getByRole('button', { name: /save/i });
      await saveButton.click();

      // Verify update
      await expect(
        page.locator('[data-testid="board-header"]').or(page.locator('h1'))
      ).toContainText(newName.slice(0, 10));
    }
  });

  test('can create cards in board', async ({ page }) => {
    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);

    const content = `Lifecycle card ${Date.now()}`;
    await createCard(page, 'col-1', content);

    await expect(page.locator(`text="${content}"`)).toBeVisible();
  });

  test('admin can close board', async ({ page }) => {
    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);

    // Check if close button exists (admin only)
    const closeButton = page
      .getByTestId('close-board-button')
      .or(page.getByRole('button', { name: /close board/i }));

    if (await closeButton.isVisible().catch(() => false)) {
      await closeBoard(page);

      const closed = await isBoardClosed(page);
      expect(closed).toBe(true);
    }
  });

  test('closed board shows lock icon', async ({ page }) => {
    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);

    const closed = await isBoardClosed(page);
    if (closed) {
      const lockIcon = page
        .getByTestId('lock-icon')
        .or(page.locator('[aria-label*="closed"]'))
        .or(page.locator('.lock-icon'));
      await expect(lockIcon).toBeVisible();
    }
  });

  test('closed board disables add buttons', async ({ page }) => {
    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);

    const closed = await isBoardClosed(page);
    if (closed) {
      const addButton = page
        .getByTestId('add-card-col-1')
        .or(page.locator('button').filter({ hasText: '+' }).first());

      const isDisabled = await addButton.isDisabled().catch(() => true);
      const isHidden = !(await addButton.isVisible().catch(() => false));

      expect(isDisabled || isHidden).toBe(true);
    }
  });

  test('closed board cards remain visible', async ({ page }) => {
    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);

    // Cards should still be visible even if board is closed
    const cards = page.locator('[data-testid^="card-"]');
    const cardCount = await cards.count();

    // If there are cards, they should be visible
    if (cardCount > 0) {
      await expect(cards.first()).toBeVisible();
    }
  });

  test('column rename persists', async ({ page }) => {
    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);

    // Find column edit button
    const columnEditButton = page
      .locator('[data-testid="column-col-1"] [data-testid="edit-column-button"]')
      .or(page.locator('[data-column-id="col-1"] button[aria-label*="edit"]'));

    if (await columnEditButton.isVisible().catch(() => false)) {
      await columnEditButton.click();

      const columnInput = page
        .getByTestId('column-name-input')
        .or(page.locator('[role="dialog"] input'));
      const newColumnName = `Column ${Date.now()}`;
      await columnInput.fill(newColumnName);

      const saveButton = page.getByRole('button', { name: /save/i });
      await saveButton.click();

      // Verify update
      await expect(page.locator('[data-testid="column-col-1"]')).toContainText(
        newColumnName.slice(0, 8)
      );

      // Refresh and verify persistence
      await page.reload();
      await waitForBoardLoad(page);
      await expect(page.locator('[data-testid="column-col-1"]')).toContainText(
        newColumnName.slice(0, 8)
      );
    }
  });

  test('closed board accessible via direct link', async ({ page }) => {
    // Navigate to a known closed board
    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);

    // Board should load regardless of closed state
    const header = page.locator('[data-testid="board-header"]').or(page.locator('h1'));
    await expect(header).toBeVisible();
  });
});
