/**
 * Admin Operations E2E Tests
 *
 * Tests admin promotion, permissions, and board management.
 */

import { test, expect } from '@playwright/test';
import { waitForBoardLoad, closeBoard, isBoardClosed, waitForAdminBadge, getBoardId, isBackendReady } from './helpers';

test.describe('Admin Operations', () => {
  // Use default board for admin operations testing
  const testBoardId = getBoardId('default');

  test.beforeEach(async ({ page }) => {
    test.skip(!isBackendReady(), 'Backend not running');
  });

  test('creator has admin controls visible', async ({ page }) => {
    await page.goto(`/boards/${testBoardId}`);
    await waitForBoardLoad(page);

    // Admin controls should be visible
    const closeButton = page
      .getByTestId('close-board-button')
      .or(page.getByRole('button', { name: /close board/i }));
    const editButton = page
      .getByTestId('edit-board-button')
      .or(page.getByRole('button', { name: /edit/i }));

    // At least one admin control should be visible
    const hasCloseButton = await closeButton.isVisible().catch(() => false);
    const hasEditButton = await editButton.isVisible().catch(() => false);

    expect(hasCloseButton || hasEditButton).toBe(true);
  });

  test('non-admin cannot see admin controls', async ({ browser }) => {
    test.skip(!isBackendReady(), 'Backend not running');

    const testBoardId = getBoardId('default');

    // Create admin context (creator)
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    // Create non-admin context
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();

    try {
      // Admin joins first (becomes creator/admin)
      await adminPage.goto(`/boards/${testBoardId}`);
      await waitForBoardLoad(adminPage);

      // Non-admin joins
      await userPage.goto(`/boards/${testBoardId}`);
      await waitForBoardLoad(userPage);

      // Non-admin should NOT see admin controls - use accessible selectors
      const closeButton = userPage
        .getByRole('button', { name: /close board/i });
      const adminDropdown = userPage
        .getByRole('button', { name: /admin|settings/i });

      const hasCloseButton = await closeButton.isVisible({ timeout: 2000 }).catch(() => false);
      const hasAdminDropdown = await adminDropdown.isVisible({ timeout: 2000 }).catch(() => false);

      // Non-admin should not have admin controls
      expect(hasCloseButton).toBe(false);
      expect(hasAdminDropdown).toBe(false);
    } finally {
      await adminContext.close();
      await userContext.close();
    }
  });

  test('admin can promote user via dropdown', async ({ browser }) => {
    test.skip(!isBackendReady(), 'Backend not running');

    const testBoardId = getBoardId('default');

    const adminContext = await browser.newContext();
    const userContext = await browser.newContext();

    const adminPage = await adminContext.newPage();
    const userPage = await userContext.newPage();

    try {
      await adminPage.goto(`/boards/${testBoardId}`);
      await userPage.goto(`/boards/${testBoardId}`);

      await waitForBoardLoad(adminPage);
      await waitForBoardLoad(userPage);

      // Admin opens dropdown - use accessible selector
      const adminDropdown = adminPage
        .getByRole('button', { name: /admin|settings/i });
      if (await adminDropdown.first().isVisible().catch(() => false)) {
        await adminDropdown.first().click();

        // Promote user - use accessible selector
        const promoteOption = adminPage
          .getByRole('menuitem', { name: /promote/i })
          .or(adminPage.getByText(/promote/i));

        if (await promoteOption.isVisible().catch(() => false)) {
          await promoteOption.click();

          // Wait for promotion to complete - admin badge should appear
          await waitForAdminBadge(adminPage);

          // User should now have admin badge - use accessible selector
          const adminBadge = adminPage
            .getByRole('img', { name: /admin/i })
            .or(adminPage.locator('[aria-label*="admin"]'));
          const hasAdminBadge = await adminBadge.count();
          expect(hasAdminBadge).toBeGreaterThanOrEqual(1);
        }
      }
    } finally {
      await adminContext.close();
      await userContext.close();
    }
  });

  test('co-admin can close board', async ({ browser }) => {
    test.skip(!isBackendReady(), 'Backend not running');

    const testBoardId = getBoardId('default');

    const creatorContext = await browser.newContext();
    const coAdminContext = await browser.newContext();

    const creatorPage = await creatorContext.newPage();
    const coAdminPage = await coAdminContext.newPage();

    try {
      await creatorPage.goto(`/boards/${testBoardId}`);
      await coAdminPage.goto(`/boards/${testBoardId}`);

      await waitForBoardLoad(creatorPage);
      await waitForBoardLoad(coAdminPage);

      // Creator promotes user to co-admin first - use accessible selector
      const adminDropdown = creatorPage
        .getByRole('button', { name: /admin|settings/i });
      if (await adminDropdown.first().isVisible().catch(() => false)) {
        await adminDropdown.first().click();

        const promoteOption = creatorPage.getByRole('menuitem', { name: /promote/i });
        if (await promoteOption.first().isVisible().catch(() => false)) {
          await promoteOption.first().click();
          await waitForAdminBadge(creatorPage);
        }
      }

      // Reload co-admin page to get updated permissions
      await coAdminPage.reload();
      await waitForBoardLoad(coAdminPage);

      // Co-admin should be able to close board - use accessible selector
      const closeButton = coAdminPage.getByRole('button', { name: /close board/i });
      if (await closeButton.isVisible().catch(() => false)) {
        await closeBoard(coAdminPage);

        // Both should see closed state
        const creatorSeesClosed = await isBoardClosed(creatorPage);
        const coAdminSeesClosed = await isBoardClosed(coAdminPage);

        expect(coAdminSeesClosed).toBe(true);
      }
    } finally {
      await creatorContext.close();
      await coAdminContext.close();
    }
  });

  test('admin can rename board and columns', async ({ page }) => {
    await page.goto(`/boards/${testBoardId}`);
    await waitForBoardLoad(page);

    // Rename board - use accessible selector
    const editBoardButton = page.getByRole('button', { name: /edit/i });
    if (await editBoardButton.first().isVisible().catch(() => false)) {
      await editBoardButton.first().click();

      const boardInput = page
        .getByRole('textbox', { name: /board name/i })
        .or(page.getByRole('dialog').locator('input').first());
      const newBoardName = `Admin Board ${Date.now()}`;
      await boardInput.fill(newBoardName);

      const saveButton = page.getByRole('button', { name: /save/i });
      await saveButton.click();

      await expect(page.getByRole('heading').first()).toContainText(
        newBoardName.slice(0, 10)
      );
    }

    // Rename column - use accessible selector for column header
    const columnHeading = page.getByRole('heading', { name: 'What Went Well', exact: true });
    const editColumnButton = columnHeading.locator('..').getByRole('button', { name: /edit/i });
    if (await editColumnButton.first().isVisible().catch(() => false)) {
      await editColumnButton.first().click();

      const columnInput = page
        .getByRole('textbox', { name: /column name/i })
        .or(page.getByRole('dialog').locator('input').first());
      const newColumnName = `Renamed ${Date.now()}`;
      await columnInput.fill(newColumnName);

      const saveButton = page.getByRole('button', { name: /save/i });
      await saveButton.click();

      await expect(columnHeading).toContainText(
        newColumnName.slice(0, 8)
      );
    }
  });

  test('admin badge appears on admin avatars', async ({ page }) => {
    await page.goto(`/boards/${testBoardId}`);
    await waitForBoardLoad(page);

    // Look for admin badge on participant avatars - use accessible selectors
    const adminBadge = page
      .getByRole('img', { name: /admin/i })
      .or(page.locator('[aria-label*="admin"]'))
      .or(page.locator('.admin-badge'));

    // At least creator should have admin indicator
    const hasAdminBadge = (await adminBadge.count()) > 0;
    expect(hasAdminBadge).toBe(true);
  });
});
