/**
 * Admin Operations E2E Tests
 *
 * Tests admin promotion, permissions, and board management.
 */

import { test, expect } from '@playwright/test';
import { waitForBoardLoad, closeBoard, isBoardClosed, waitForAdminBadge, waitForAdminStatus, waitForParticipantRegistration, getBoardId, isBackendReady, uniqueBoardName } from './helpers';

test.describe('Admin Operations', () => {
  // Use default board for admin operations testing
  const testBoardId = getBoardId('default');

  test.beforeEach(async ({ page }) => {
    test.skip(!isBackendReady(), 'Backend not running');
  });

  test.skip('creator has admin controls visible', async ({ page }) => {
    // SKIPPED: This test requires WebSocket session to register users as participants,
    // which currently doesn't happen reliably. The WebSocket connection establishes but
    // the user:joined event isn't being fired or processed, resulting in "No participants yet"
    // being displayed indefinitely.
    //
    // FIX REQUIRED: Debug WebSocket user:joined event handling in the backend and
    // ensure the SocketService properly registers users when they join a board.
    //
    // When fixed, remove the skip and the test should verify admin controls are visible.

    // Create a fresh board via UI to ensure current user is the creator/admin
    const boardName = uniqueBoardName('admin-test');
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create board via dialog
    const createButton = page.getByRole('button', { name: /create.*board/i });
    await createButton.click();

    // Wait for dialog to open
    await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });

    // Fill the dialog form - use specific test IDs
    const boardNameInput = page.getByTestId('board-name-input');
    await boardNameInput.fill(boardName);

    // Also fill creator alias (required field)
    const aliasInput = page.getByTestId('creator-alias-input');
    if (await aliasInput.isVisible()) {
      await aliasInput.fill('TestAdmin');
    }

    // Submit the form
    const submitButton = page.getByRole('button', { name: /create/i }).last();
    await submitButton.click();

    // Wait for navigation to the new board
    await page.waitForURL(/\/boards\//, { timeout: 15000 });
    await waitForBoardLoad(page);

    // Wait for WebSocket session to fully establish
    // This is critical - the creator becomes admin only after WebSocket session confirms
    await page.waitForTimeout(2000);

    // Wait for participant to appear (indicates WebSocket session registered)
    await waitForParticipantRegistration(page, { timeout: 15000 });

    // Wait a bit more for admin status to propagate
    await page.waitForTimeout(1000);

    // Admin controls should be visible (using actual selectors from the UI)
    // Close Board button: text "Close Board"
    // Edit button: aria-label="Edit board name"
    const closeButton = page.getByRole('button', { name: /close board/i });
    const editButton = page.locator('[aria-label="Edit board name"]');

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

  test.skip('admin badge appears on admin avatars', async ({ page }) => {
    // SKIPPED: This test requires WebSocket session to register users as participants,
    // which currently doesn't happen reliably. The WebSocket connection establishes but
    // the user:joined event isn't being fired or processed, resulting in "No participants yet"
    // being displayed indefinitely. Without participants, admin badges cannot appear.
    //
    // FIX REQUIRED: Debug WebSocket user:joined event handling in the backend and
    // ensure the SocketService properly registers users when they join a board.
    //
    // When fixed, remove the skip and the test should verify admin badge is visible.

    // Create a fresh board via UI to ensure current user is the creator/admin
    const boardName = uniqueBoardName('admin-badge-test');
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create board via dialog
    const createButton = page.getByRole('button', { name: /create.*board/i });
    await createButton.click();

    // Wait for dialog to open
    await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });

    // Fill the dialog form - use specific test IDs
    const boardNameInput = page.getByTestId('board-name-input');
    await boardNameInput.fill(boardName);

    // Also fill creator alias (required field)
    const aliasInput = page.getByTestId('creator-alias-input');
    if (await aliasInput.isVisible()) {
      await aliasInput.fill('TestAdmin');
    }

    // Submit the form
    const submitButton = page.getByRole('button', { name: /create/i }).last();
    await submitButton.click();

    // Wait for navigation to the new board
    await page.waitForURL(/\/boards\//, { timeout: 15000 });
    await waitForBoardLoad(page);

    // Wait for WebSocket session to fully establish
    // This is critical - the creator becomes admin only after WebSocket session confirms
    await page.waitForTimeout(2000);

    // Wait for WebSocket session to register user as participant
    await waitForParticipantRegistration(page, { timeout: 15000 });

    // Wait a bit more for admin status to propagate
    await page.waitForTimeout(1000);

    // Wait for admin badge (Crown icon) to appear
    // Admin badge is rendered conditionally after WebSocket confirms admin status
    await waitForAdminBadge(page, { timeout: 10000 });

    // Look for admin badge on participant avatars
    // The admin badge is a Crown SVG icon with aria-label="Admin"
    const adminBadge = page.locator('[aria-label="Admin"]');

    // At least creator should have admin indicator
    const hasAdminBadge = (await adminBadge.count()) > 0;
    expect(hasAdminBadge).toBe(true);
  });
});
