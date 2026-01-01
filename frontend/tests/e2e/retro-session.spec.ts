/**
 * Complete Retro Session E2E Tests
 *
 * Tests the full retro workflow with multiple users:
 * - Board creation and joining
 * - Real-time card sync
 * - Participant visibility
 * - Board closure
 */

import { test, expect } from '@playwright/test';
import {
  joinBoard,
  waitForBoardLoad,
  createCard,
  findCardByContent,
  closeBoard,
  isBoardClosed,
  addReaction,
  getReactionCount,
} from './helpers';

test.describe('Complete Retro Session', () => {
  // Use a test board ID that exists in the backend
  // In a real scenario, create a board via API before tests
  const testBoardId = process.env.TEST_BOARD_ID || 'test-board-e2e';

  test.describe.configure({ mode: 'serial' });

  test('single user can join board and see content', async ({ page }) => {
    test.skip(!process.env.E2E_BACKEND_READY, 'Backend not running');

    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);

    // Verify board header is visible
    await expect(page.locator('h1, [role="heading"]').first()).toBeVisible();

    // Verify columns are rendered
    const columns = page.locator('[data-testid^="column-"]');
    await expect(columns.first()).toBeVisible();
  });

  test('user can create a feedback card', async ({ page }) => {
    test.skip(!process.env.E2E_BACKEND_READY, 'Backend not running');

    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);

    // Create a card in the first column
    const uniqueContent = `Test card ${Date.now()}`;
    await createCard(page, 'col-1', uniqueContent);

    // Verify card appears
    const card = await findCardByContent(page, uniqueContent);
    await expect(card).toBeVisible();
  });

  test('user can add reaction to card', async ({ page }) => {
    test.skip(!process.env.E2E_BACKEND_READY, 'Backend not running');

    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);

    // Create a card first
    const content = `React test ${Date.now()}`;
    await createCard(page, 'col-1', content);

    // Add reaction
    await addReaction(page, content);

    // Verify reaction count increased
    const count = await getReactionCount(page, content);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('user can create anonymous card', async ({ page }) => {
    test.skip(!process.env.E2E_BACKEND_READY, 'Backend not running');

    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);

    // Create anonymous card
    const content = `Anonymous ${Date.now()}`;
    await createCard(page, 'col-2', content, { isAnonymous: true });

    // Verify card appears
    const card = await findCardByContent(page, content);
    await expect(card).toBeVisible();

    // Verify no author name shown (anonymous)
    // The card should not show a username/alias
    const authorElement = card.locator('[data-testid="card-author"]');
    await expect(authorElement).not.toBeVisible();
  });

  test('admin can close board', async ({ page }) => {
    test.skip(!process.env.E2E_BACKEND_READY, 'Backend not running');

    // This test assumes the user is admin
    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);

    // Close the board
    await closeBoard(page);

    // Verify board shows closed state
    const closed = await isBoardClosed(page);
    expect(closed).toBe(true);
  });

  test('closed board disables card creation', async ({ page }) => {
    test.skip(!process.env.E2E_BACKEND_READY, 'Backend not running');

    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);

    // Check if board is closed
    const closed = await isBoardClosed(page);
    if (closed) {
      // Add button should be disabled or not visible
      const addButton = page.getByTestId('add-card-col-1').or(page.locator('button').filter({ hasText: '+' }));

      // Either the button is not visible or it's disabled
      const isDisabled = await addButton.isDisabled().catch(() => true);
      const isHidden = !(await addButton.isVisible().catch(() => false));

      expect(isDisabled || isHidden).toBe(true);
    }
  });
});

test.describe('Multi-User Real-time Sync', () => {
  test('two users see each other\'s cards in real-time', async ({ browser }) => {
    test.skip(!process.env.E2E_BACKEND_READY, 'Backend not running');

    const testBoardId = process.env.TEST_BOARD_ID || 'test-board-multi';

    // Create two browser contexts (two users)
    const user1Context = await browser.newContext();
    const user2Context = await browser.newContext();

    const user1Page = await user1Context.newPage();
    const user2Page = await user2Context.newPage();

    try {
      // Both users join the board
      await user1Page.goto(`/board/${testBoardId}`);
      await user2Page.goto(`/board/${testBoardId}`);

      await waitForBoardLoad(user1Page);
      await waitForBoardLoad(user2Page);

      // User 1 creates a card
      const cardContent = `Sync test ${Date.now()}`;
      await createCard(user1Page, 'col-1', cardContent);

      // User 2 should see the card appear (real-time sync)
      const cardOnUser2 = await findCardByContent(user2Page, cardContent);
      await expect(cardOnUser2).toBeVisible({ timeout: 10000 });

      // User 2 adds a reaction
      await addReaction(user2Page, cardContent);

      // User 1 should see the reaction count update
      await user1Page.waitForTimeout(1000); // Give time for WebSocket update
      const countOnUser1 = await getReactionCount(user1Page, cardContent);
      expect(countOnUser1).toBeGreaterThanOrEqual(1);

    } finally {
      // Cleanup
      await user1Context.close();
      await user2Context.close();
    }
  });

  test('three users see each other in participant bar', async ({ browser }) => {
    test.skip(!process.env.E2E_BACKEND_READY, 'Backend not running');

    const testBoardId = process.env.TEST_BOARD_ID || 'test-board-participants';

    // Create three browser contexts
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);

    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

    try {
      // All users join the board
      await Promise.all(
        pages.map(async (page) => {
          await page.goto(`/board/${testBoardId}`);
          await waitForBoardLoad(page);
        })
      );

      // Wait for participant updates to propagate
      await pages[0].waitForTimeout(2000);

      // Each user should see 3 participants (or avatars)
      for (const page of pages) {
        const participantBar = page.getByTestId('participant-bar').or(page.locator('[data-testid^="participant"]'));
        await expect(participantBar).toBeVisible();

        // Count avatar elements
        const avatars = page.locator('[data-testid^="participant-avatar"]').or(page.locator('.avatar'));
        const count = await avatars.count();

        // Should have at least 3 participants (might have special avatars too)
        expect(count).toBeGreaterThanOrEqual(3);
      }

    } finally {
      // Cleanup
      await Promise.all(contexts.map(ctx => ctx.close()));
    }
  });

  test('user sees board close in real-time', async ({ browser }) => {
    test.skip(!process.env.E2E_BACKEND_READY, 'Backend not running');

    const testBoardId = process.env.TEST_BOARD_ID || 'test-board-close';

    // Create two contexts
    const adminContext = await browser.newContext();
    const userContext = await browser.newContext();

    const adminPage = await adminContext.newPage();
    const userPage = await userContext.newPage();

    try {
      // Both join
      await adminPage.goto(`/board/${testBoardId}`);
      await userPage.goto(`/board/${testBoardId}`);

      await waitForBoardLoad(adminPage);
      await waitForBoardLoad(userPage);

      // Admin closes board
      await closeBoard(adminPage);

      // User should see closed state
      await userPage.waitForTimeout(2000); // Wait for WebSocket update
      const closed = await isBoardClosed(userPage);
      expect(closed).toBe(true);

    } finally {
      await adminContext.close();
      await userContext.close();
    }
  });
});
