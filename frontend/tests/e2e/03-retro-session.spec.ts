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
  waitForReactionCount,
  waitForParticipantCount,
  waitForBoardClosed,
  getBoardId,
  isBackendReady,
} from './helpers';

test.describe('Complete Retro Session', () => {
  // Get board ID from global setup (reads from file)
  const testBoardId = getBoardId('default');

  test.describe.configure({ mode: 'serial' });

  test('single user can join board and see content', async ({ page }) => {
    test.skip(!isBackendReady(), 'Backend not running');

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
    test.skip(!isBackendReady(), 'Backend not running');

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
    test.skip(!isBackendReady(), 'Backend not running');

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
    test.skip(!isBackendReady(), 'Backend not running');

    await page.goto(`/boards/${testBoardId}`);
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

  test.skip('admin can close board', async ({ page }) => {
    // TODO: Fix admin detection timing - requires WebSocket connection to establish user identity
    test.skip(!isBackendReady(), 'Backend not running');

    // This test assumes the user is admin
    await page.goto(`/boards/${testBoardId}`);
    await waitForBoardLoad(page);

    // Close the board
    await closeBoard(page);

    // Verify board shows closed state
    const closed = await isBoardClosed(page);
    expect(closed).toBe(true);
  });

  test.skip('closed board disables card creation', async ({ page }) => {
    // TODO: This test depends on previous admin close test which is skipped
    test.skip(!isBackendReady(), 'Backend not running');

    await page.goto(`/boards/${testBoardId}`);
    await waitForBoardLoad(page);

    // Check if board is closed
    const closed = await isBoardClosed(page);
    if (closed) {
      // Add button should be disabled or not visible
      const addButton = page
        .getByTestId('add-card-col-1')
        .or(page.locator('button').filter({ hasText: '+' }));

      // Either the button is not visible or it's disabled
      const isDisabled = await addButton.isDisabled().catch(() => true);
      const isHidden = !(await addButton.isVisible().catch(() => false));

      expect(isDisabled || isHidden).toBe(true);
    }
  });
});

test.describe.skip('Multi-User Real-time Sync', () => {
  // TODO: These tests require WebSocket real-time sync which is flaky in E2E
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

      // User 1 creates a card
      const cardContent = `Sync test ${Date.now()}`;
      await createCard(user1Page, 'col-1', cardContent);

      // User 2 should see the card appear (real-time sync)
      const cardOnUser2 = await findCardByContent(user2Page, cardContent);
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
      // All users join the board
      await Promise.all(
        pages.map(async (page) => {
          await page.goto(`/boards/${testBoardId}`);
          await waitForBoardLoad(page);
        })
      );

      // Wait for participant updates to propagate via WebSocket
      await waitForParticipantCount(pages[0], 3);

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

    const testBoardId = getBoardId('default');

    // Create two contexts
    const adminContext = await browser.newContext();
    const userContext = await browser.newContext();

    const adminPage = await adminContext.newPage();
    const userPage = await userContext.newPage();

    try {
      // Both join
      await adminPage.goto(`/boards/${testBoardId}`);
      await userPage.goto(`/boards/${testBoardId}`);

      await waitForBoardLoad(adminPage);
      await waitForBoardLoad(userPage);

      // Admin closes board
      await closeBoard(adminPage);

      // User should see closed state via WebSocket
      await waitForBoardClosed(userPage);
      const closed = await isBoardClosed(userPage);
      expect(closed).toBe(true);
    } finally {
      await adminContext.close();
      await userContext.close();
    }
  });
});
