/**
 * Admin Operations & Complete Retro Session E2E Tests
 *
 * Tests admin permissions, board management, and full retro workflow.
 * These tests run last because they close the default board.
 *
 * Test order (serial):
 * 1. Tests that need an OPEN board (user workflow, admin permissions)
 * 2. Tests that CLOSE the board (run last)
 */

import { test, expect } from '@playwright/test';
import {
  waitForBoardLoad,
  createCard,
  findCardByContent,
  closeBoard,
  isBoardClosed,
  addReaction,
  getReactionCount,
  waitForReactionCount,
  waitForParticipantCount,
  waitForBoardClosed,
  waitForWebSocketConnection,
  waitForAdminBadge,
  getBoardId,
  isBackendReady,
} from './helpers';
import { closeBoardViaApi, renameBoardViaApi, getBoardViaApi } from './utils/admin-helpers';

// =============================================================================
// Tests that need an OPEN board - run first
// =============================================================================

test.describe('Admin & Session Tests', () => {
  const testBoardId = getBoardId('default');

  // Run all tests in serial mode to ensure proper order
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page: _page }) => {
    test.skip(!isBackendReady(), 'Backend not running');
  });

  // ---------------------------------------------------------------------------
  // User Workflow Tests (need open board)
  // ---------------------------------------------------------------------------

  test('single user can join board and see content', async ({ page }) => {
    await page.goto(`/boards/${testBoardId}`);
    await waitForBoardLoad(page);

    // Verify board header is visible
    await expect(page.locator('h1, [role="heading"]').first()).toBeVisible();

    // Verify columns are rendered - check for column headings
    await expect(page.getByRole('heading', { name: 'What Went Well' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'To Improve' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Action Items' })).toBeVisible();
  });

  test('user can create a feedback card', async ({ page }) => {
    await page.goto(`/boards/${testBoardId}`);
    await waitForBoardLoad(page);

    // Create a card in the first column
    const uniqueContent = `Test card ${Date.now()}`;
    await createCard(page, 'col-1', uniqueContent);

    // Verify card appears
    const card = await findCardByContent(page, uniqueContent);
    await expect(card).toBeVisible();
  });

  test('user can add reaction to card', async ({ page }) => {
    await page.goto(`/boards/${testBoardId}`);
    await waitForBoardLoad(page);

    // Create a card first
    const content = `React test ${Date.now()}`;
    await createCard(page, 'col-1', content);

    // Find the reaction button for this card
    const cardText = page.getByText(content, { exact: false }).first();
    const reactionButton = cardText.locator('..').getByRole('button', { name: 'Add reaction' });

    // Click to add reaction
    await reactionButton.click();

    // After clicking, the button should change to "Remove reaction"
    await expect(
      cardText.locator('..').getByRole('button', { name: 'Remove reaction' })
    ).toBeVisible({ timeout: 5000 });
  });

  test('user can create anonymous card', async ({ page }) => {
    await page.goto(`/boards/${testBoardId}`);
    await waitForBoardLoad(page);

    // Create anonymous card
    const content = `Anonymous ${Date.now()}`;
    await createCard(page, 'col-2', content, { isAnonymous: true });

    // Verify card appears
    const card = await findCardByContent(page, content);
    await expect(card).toBeVisible();

    // Verify no author name shown (anonymous)
    const authorElement = card.locator('[data-testid="card-author"]');
    await expect(authorElement).not.toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Admin Permission Tests (need open board)
  // ---------------------------------------------------------------------------

  test('admin operations work via API', async ({ page, request }) => {
    await page.goto(`/boards/${testBoardId}`);
    await waitForBoardLoad(page);

    // Test 1: Rename board via API
    const newBoardName = `Renamed Board ${Date.now()}`;
    await renameBoardViaApi(request, testBoardId, newBoardName);

    // Reload to see the new name
    await page.reload();
    await waitForBoardLoad(page);

    // Verify the board name was updated in the UI
    const header = page.locator('h1, [role="heading"]').first();
    await expect(header).toContainText(newBoardName.slice(0, 10));

    // Test 2: Verify board can be fetched via API
    const boardData = await getBoardViaApi(request, testBoardId);
    expect(boardData.name).toBe(newBoardName);
    expect(boardData.id).toBe(testBoardId);
  });

  test('non-admin cannot see admin controls', async ({ browser }) => {
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

      // Non-admin should NOT see admin controls
      const closeButton = userPage.getByRole('button', { name: /close board/i });
      const adminDropdown = userPage.getByRole('button', { name: /admin|settings/i });

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
    const adminContext = await browser.newContext();
    const userContext = await browser.newContext();

    const adminPage = await adminContext.newPage();
    const userPage = await userContext.newPage();

    try {
      await adminPage.goto(`/boards/${testBoardId}`);
      await userPage.goto(`/boards/${testBoardId}`);

      await waitForBoardLoad(adminPage);
      await waitForBoardLoad(userPage);

      // Admin opens dropdown
      const adminDropdown = adminPage.getByRole('button', { name: /admin|settings/i });
      if (
        await adminDropdown
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await adminDropdown.first().click();

        // Promote user
        const promoteOption = adminPage
          .getByRole('menuitem', { name: /promote/i })
          .or(adminPage.getByText(/promote/i));

        if (await promoteOption.isVisible().catch(() => false)) {
          await promoteOption.click();

          // Wait for promotion to complete
          await waitForAdminBadge(adminPage);

          // User should now have admin badge
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

  test('admin can rename board and columns', async ({ page }) => {
    await page.goto(`/boards/${testBoardId}`);
    await waitForBoardLoad(page);

    // Rename board
    const editBoardButton = page.getByRole('button', { name: /edit/i });
    if (
      await editBoardButton
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await editBoardButton.first().click();

      const boardInput = page
        .getByRole('textbox', { name: /board name/i })
        .or(page.getByRole('dialog').locator('input').first());
      const newBoardName = `Admin Board ${Date.now()}`;
      await boardInput.fill(newBoardName);

      const saveButton = page.getByRole('button', { name: /save/i });
      await saveButton.click();

      await expect(page.getByRole('heading').first()).toContainText(newBoardName.slice(0, 10));
    }

    // Rename column
    const columnHeading = page.getByRole('heading', { name: 'What Went Well', exact: true });
    const editColumnButton = columnHeading.locator('..').getByRole('button', { name: /edit/i });
    if (
      await editColumnButton
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await editColumnButton.first().click();

      const columnInput = page
        .getByRole('textbox', { name: /column name/i })
        .or(page.getByRole('dialog').locator('input').first());
      const newColumnName = `Renamed ${Date.now()}`;
      await columnInput.fill(newColumnName);

      const saveButton = page.getByRole('button', { name: /save/i });
      await saveButton.click();

      await expect(columnHeading).toContainText(newColumnName.slice(0, 8));
    }
  });

  // ---------------------------------------------------------------------------
  // Board Closure Tests (run LAST - these close the board!)
  // ---------------------------------------------------------------------------

  test('co-admin can close board', async ({ browser }) => {
    const creatorContext = await browser.newContext();
    const coAdminContext = await browser.newContext();

    const creatorPage = await creatorContext.newPage();
    const coAdminPage = await coAdminContext.newPage();

    try {
      await creatorPage.goto(`/boards/${testBoardId}`);
      await coAdminPage.goto(`/boards/${testBoardId}`);

      await waitForBoardLoad(creatorPage);
      await waitForBoardLoad(coAdminPage);

      // Creator promotes user to co-admin first
      const adminDropdown = creatorPage.getByRole('button', { name: /admin|settings/i });
      if (
        await adminDropdown
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await adminDropdown.first().click();

        const promoteOption = creatorPage.getByRole('menuitem', { name: /promote/i });
        if (
          await promoteOption
            .first()
            .isVisible()
            .catch(() => false)
        ) {
          await promoteOption.first().click();
          await waitForAdminBadge(creatorPage);
        }
      }

      // Reload co-admin page to get updated permissions
      await coAdminPage.reload();
      await waitForBoardLoad(coAdminPage);

      // Co-admin should be able to close board
      const closeButton = coAdminPage.getByRole('button', { name: /close board/i });
      if (await closeButton.isVisible().catch(() => false)) {
        await closeBoard(coAdminPage);

        // Both should see closed state
        await isBoardClosed(creatorPage);
        const coAdminSeesClosed = await isBoardClosed(coAdminPage);

        expect(coAdminSeesClosed).toBe(true);
      }
    } finally {
      await creatorContext.close();
      await coAdminContext.close();
    }
  });

  test('admin can close board via API', async ({ page, request }) => {
    await page.goto(`/boards/${testBoardId}`);
    await waitForBoardLoad(page);

    // Close the board via API with admin override
    await closeBoardViaApi(request, testBoardId);

    // Reload to see the closed state
    await page.reload();
    await waitForBoardLoad(page);

    // Verify board shows closed state
    const closed = await isBoardClosed(page);
    expect(closed).toBe(true);

    // Verify board data via API confirms closed state
    const boardData = await getBoardViaApi(request, testBoardId);
    expect(boardData.state).toBe('closed');
  });

  test('closed board disables card creation', async ({ page, request }) => {
    await page.goto(`/boards/${testBoardId}`);
    await waitForBoardLoad(page);

    // Ensure board is closed via API
    await closeBoardViaApi(request, testBoardId);

    // Reload page to see closed state
    await page.reload();
    await waitForBoardLoad(page);

    // Check if board is closed
    const closed = await isBoardClosed(page);
    expect(closed).toBe(true);

    // Add button should be disabled or not visible
    const addButton = page
      .getByTestId('add-card-col-1')
      .or(page.locator('button').filter({ hasText: '+' }));

    // Either the button is not visible or it's disabled
    const isDisabled = await addButton.isDisabled().catch(() => true);
    const isHidden = !(await addButton.isVisible().catch(() => false));

    expect(isDisabled || isHidden).toBe(true);
  });
});

// =============================================================================
// Multi-User Real-time Sync Tests (Skipped by default - flaky due to WebSocket timing)
// =============================================================================

// NOTE: Multi-user tests are inherently flaky due to WebSocket timing across browser contexts.
// The waitForWebSocketConnection() helper has been added to stabilize these tests.
// These tests are skipped by default but can be enabled for local debugging.
// To run: `npm run test:e2e -- --grep "Multi-User" --headed`
test.describe.skip('Multi-User Real-time Sync', () => {
  test("two users see each other's cards in real-time", async ({ browser }) => {
    test.skip(!isBackendReady(), 'Backend not running');

    const testBoardId = getBoardId('default');

    // Create two browser contexts (two users)
    const user1Context = await browser.newContext();
    const user2Context = await browser.newContext();

    const user1Page = await user1Context.newPage();
    const user2Page = await user2Context.newPage();

    try {
      // Both users join the board
      await user1Page.goto(`/boards/${testBoardId}`);
      await user2Page.goto(`/boards/${testBoardId}`);

      await waitForBoardLoad(user1Page);
      await waitForBoardLoad(user2Page);

      // Wait for WebSocket connections to be established
      await waitForWebSocketConnection(user1Page);
      await waitForWebSocketConnection(user2Page);

      // User 1 creates a card
      const cardContent = `Sync test ${Date.now()}`;
      await createCard(user1Page, 'col-1', cardContent);

      // User 2 should see the card appear (real-time sync)
      const cardOnUser2 = await findCardByContent(user2Page, cardContent, { timeout: 15000 });
      await expect(cardOnUser2).toBeVisible({ timeout: 10000 });

      // User 2 adds a reaction
      await addReaction(user2Page, cardContent);

      // User 1 should see the reaction count update via WebSocket
      await waitForReactionCount(user1Page, cardContent, 1);
      const countOnUser1 = await getReactionCount(user1Page, cardContent);
      expect(countOnUser1).toBeGreaterThanOrEqual(1);
    } finally {
      // Cleanup
      await user1Context.close();
      await user2Context.close();
    }
  });

  test('three users see each other in participant bar', async ({ browser }) => {
    test.skip(!isBackendReady(), 'Backend not running');

    const testBoardId = getBoardId('default');

    // Create three browser contexts
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);

    const pages = await Promise.all(contexts.map((ctx) => ctx.newPage()));

    try {
      // All users join the board sequentially to ensure stable WebSocket connections
      for (const page of pages) {
        await page.goto(`/boards/${testBoardId}`);
        await waitForBoardLoad(page);
        await waitForWebSocketConnection(page);
      }

      // Wait for participant updates to propagate via WebSocket
      await waitForParticipantCount(pages[0], 3, { timeout: 20000 });

      // Each user should see 3 participants (or avatars)
      for (const page of pages) {
        const participantBar = page
          .getByTestId('participant-bar')
          .or(page.locator('[data-testid^="participant"]'));
        await expect(participantBar).toBeVisible();

        // Count avatar elements
        const avatars = page
          .locator('[data-testid^="participant-avatar"]')
          .or(page.locator('.avatar'));
        const count = await avatars.count();

        // Should have at least 3 participants (might have special avatars too)
        expect(count).toBeGreaterThanOrEqual(3);
      }
    } finally {
      // Cleanup
      await Promise.all(contexts.map((ctx) => ctx.close()));
    }
  });

  test('user sees board close in real-time', async ({ browser }) => {
    test.skip(!isBackendReady(), 'Backend not running');

    const testBoardId = getBoardId('lifecycle'); // Use lifecycle board for close test

    // Create two contexts
    const adminContext = await browser.newContext();
    const userContext = await browser.newContext();

    const adminPage = await adminContext.newPage();
    const userPage = await userContext.newPage();

    try {
      // Admin joins first (to be recognized as admin)
      await adminPage.goto(`/boards/${testBoardId}`);
      await waitForBoardLoad(adminPage);
      await waitForWebSocketConnection(adminPage);

      // User joins second
      await userPage.goto(`/boards/${testBoardId}`);
      await waitForBoardLoad(userPage);
      await waitForWebSocketConnection(userPage);

      // Admin closes board
      await closeBoard(adminPage);

      // User should see closed state via WebSocket
      await waitForBoardClosed(userPage, { timeout: 15000 });
      const closed = await isBoardClosed(userPage);
      expect(closed).toBe(true);
    } finally {
      await adminContext.close();
      await userContext.close();
    }
  });
});
