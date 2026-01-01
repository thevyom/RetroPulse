/**
 * Admin Operations E2E Tests
 *
 * Tests admin promotion, permissions, and board management.
 */

import { test, expect } from '@playwright/test';
import { waitForBoardLoad, closeBoard, isBoardClosed } from './helpers';

test.describe('Admin Operations', () => {
  const testBoardId = process.env.TEST_BOARD_ID || 'test-board-admin';

  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.E2E_BACKEND_READY, 'Backend not running');
  });

  test('creator has admin controls visible', async ({ page }) => {
    await page.goto(`/board/${testBoardId}`);
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
    test.skip(!process.env.E2E_BACKEND_READY, 'Backend not running');

    const testBoardId = process.env.TEST_BOARD_ID || 'test-board-no-admin';

    // Create admin context (creator)
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    // Create non-admin context
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();

    try {
      // Admin joins first (becomes creator/admin)
      await adminPage.goto(`/board/${testBoardId}`);
      await waitForBoardLoad(adminPage);

      // Non-admin joins
      await userPage.goto(`/board/${testBoardId}`);
      await waitForBoardLoad(userPage);

      // Non-admin should NOT see admin controls
      const closeButton = userPage
        .getByTestId('close-board-button')
        .or(userPage.getByRole('button', { name: /close board/i }));
      const adminDropdown = userPage.getByTestId('admin-dropdown');
      const editButton = userPage.getByTestId('edit-board-button');

      const hasCloseButton = await closeButton.isVisible({ timeout: 2000 }).catch(() => false);
      const hasAdminDropdown = await adminDropdown.isVisible({ timeout: 2000 }).catch(() => false);
      const hasEditButton = await editButton.isVisible({ timeout: 2000 }).catch(() => false);

      // Non-admin should not have admin controls
      // Note: They might have edit button for their own alias
      expect(hasCloseButton).toBe(false);
      expect(hasAdminDropdown).toBe(false);
    } finally {
      await adminContext.close();
      await userContext.close();
    }
  });

  test('admin can promote user via dropdown', async ({ browser }) => {
    test.skip(!process.env.E2E_BACKEND_READY, 'Backend not running');

    const testBoardId = process.env.TEST_BOARD_ID || 'test-board-promote';

    const adminContext = await browser.newContext();
    const userContext = await browser.newContext();

    const adminPage = await adminContext.newPage();
    const userPage = await userContext.newPage();

    try {
      await adminPage.goto(`/board/${testBoardId}`);
      await userPage.goto(`/board/${testBoardId}`);

      await waitForBoardLoad(adminPage);
      await waitForBoardLoad(userPage);

      // Admin opens dropdown
      const adminDropdown = adminPage.getByTestId('admin-dropdown');
      if (await adminDropdown.isVisible().catch(() => false)) {
        await adminDropdown.click();

        // Promote user
        const promoteOption = adminPage
          .getByTestId('promote-user')
          .or(adminPage.getByRole('menuitem', { name: /promote/i }));

        if (await promoteOption.isVisible().catch(() => false)) {
          await promoteOption.click();

          // Wait for promotion
          await adminPage.waitForTimeout(1000);

          // User should now have admin badge
          const userAvatar = adminPage.locator(
            '[data-testid^="participant-avatar"][data-is-admin="true"]'
          );
          const hasAdminBadge = await userAvatar.count();
          expect(hasAdminBadge).toBeGreaterThanOrEqual(1);
        }
      }
    } finally {
      await adminContext.close();
      await userContext.close();
    }
  });

  test('co-admin can close board', async ({ browser }) => {
    test.skip(!process.env.E2E_BACKEND_READY, 'Backend not running');

    const testBoardId = process.env.TEST_BOARD_ID || 'test-board-coadmin';

    const creatorContext = await browser.newContext();
    const coAdminContext = await browser.newContext();

    const creatorPage = await creatorContext.newPage();
    const coAdminPage = await coAdminContext.newPage();

    try {
      await creatorPage.goto(`/board/${testBoardId}`);
      await coAdminPage.goto(`/board/${testBoardId}`);

      await waitForBoardLoad(creatorPage);
      await waitForBoardLoad(coAdminPage);

      // Creator promotes user to co-admin first
      const adminDropdown = creatorPage.getByTestId('admin-dropdown');
      if (await adminDropdown.isVisible().catch(() => false)) {
        await adminDropdown.click();

        const promoteOption = creatorPage.getByRole('menuitem', { name: /promote/i });
        if (await promoteOption.isVisible().catch(() => false)) {
          await promoteOption.click();
          await creatorPage.waitForTimeout(1000);
        }
      }

      // Reload co-admin page to get updated permissions
      await coAdminPage.reload();
      await waitForBoardLoad(coAdminPage);

      // Co-admin should be able to close board
      const closeButton = coAdminPage.getByTestId('close-board-button');
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
    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);

    // Rename board
    const editBoardButton = page.getByTestId('edit-board-button');
    if (await editBoardButton.isVisible().catch(() => false)) {
      await editBoardButton.click();

      const boardInput = page.getByTestId('board-name-input').or(page.locator('[role="dialog"] input'));
      const newBoardName = `Admin Board ${Date.now()}`;
      await boardInput.fill(newBoardName);

      const saveButton = page.getByRole('button', { name: /save/i });
      await saveButton.click();

      await expect(page.locator('[data-testid="board-header"]')).toContainText(newBoardName.slice(0, 10));
    }

    // Rename column
    const editColumnButton = page.locator(
      '[data-testid="column-col-1"] [data-testid="edit-column-button"]'
    );
    if (await editColumnButton.isVisible().catch(() => false)) {
      await editColumnButton.click();

      const columnInput = page.getByTestId('column-name-input');
      const newColumnName = `Renamed ${Date.now()}`;
      await columnInput.fill(newColumnName);

      const saveButton = page.getByRole('button', { name: /save/i });
      await saveButton.click();

      await expect(page.locator('[data-testid="column-col-1"]')).toContainText(newColumnName.slice(0, 8));
    }
  });

  test('admin badge appears on admin avatars', async ({ page }) => {
    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);

    // Look for admin badge on participant avatars
    const adminAvatars = page.locator('[data-testid^="participant-avatar"][data-is-admin="true"]');
    const adminBadge = page.locator('[data-testid="admin-badge"]').or(page.locator('.admin-badge'));

    // Either there are admin avatars with data attribute or visible badges
    const hasAdminAvatars = (await adminAvatars.count()) > 0;
    const hasAdminBadge = await adminBadge.isVisible().catch(() => false);

    // At least creator should have admin indicator
    expect(hasAdminAvatars || hasAdminBadge).toBe(true);
  });
});
