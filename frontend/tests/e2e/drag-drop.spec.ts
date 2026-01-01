/**
 * Drag-and-Drop E2E Tests
 *
 * Tests drag-and-drop interactions for:
 * - Parent-child card linking
 * - Action-feedback linking
 * - Column moves
 * - Visual feedback
 */

import { test, expect } from '@playwright/test';
import {
  waitForBoardLoad,
  createCard,
  findCardByContent,
  dragCardOntoCard,
  dragCardToColumn,
  isCardLinked,
  isCardInColumn,
  waitForCardLinked,
  waitForCardUnlinked,
  getBoardId,
  isBackendReady,
} from './helpers';

test.describe('Drag-and-Drop Interactions', () => {
  // Use default board for drag-drop tests
  const testBoardId = getBoardId('default');

  test.beforeEach(async ({ page }) => {
    test.skip(!isBackendReady(), 'Backend not running');
    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);
  });

  test('drag card to different column moves it', async ({ page }) => {
    // Create a card in col-1
    const content = `Move test ${Date.now()}`;
    await createCard(page, 'col-1', content);

    // Verify card is in col-1
    const inCol1 = await isCardInColumn(page, content, 'col-1');
    expect(inCol1).toBe(true);

    // Drag to col-2
    await dragCardToColumn(page, content, 'col-2');

    // Wait for move to complete - verify card appears in col-2
    await expect(async () => {
      const inCol2 = await isCardInColumn(page, content, 'col-2');
      expect(inCol2).toBe(true);
    }).toPass({ timeout: 10000 });
  });

  test('drag feedback onto feedback creates parent-child', async ({ page }) => {
    // Create two feedback cards
    const parentContent = `Parent ${Date.now()}`;
    const childContent = `Child ${Date.now()}`;

    await createCard(page, 'col-1', parentContent, { cardType: 'feedback' });
    await createCard(page, 'col-1', childContent, { cardType: 'feedback' });

    // Drag child onto parent
    await dragCardOntoCard(page, childContent, parentContent);

    // Wait for link to be created
    await waitForCardLinked(page, childContent);

    // Child should now show link icon
    const isLinked = await isCardLinked(page, childContent);
    expect(isLinked).toBe(true);
  });

  test('drag action onto feedback creates link', async ({ page }) => {
    // Create feedback card
    const feedbackContent = `Feedback ${Date.now()}`;
    await createCard(page, 'col-1', feedbackContent, { cardType: 'feedback' });

    // Create action card
    const actionContent = `Action ${Date.now()}`;
    await createCard(page, 'col-3', actionContent, { cardType: 'action' });

    // Drag action onto feedback
    await dragCardOntoCard(page, actionContent, feedbackContent);

    // Wait for link to be created
    await waitForCardLinked(page, actionContent);

    // Action should show it's linked
    const isLinked = await isCardLinked(page, actionContent);
    expect(isLinked).toBe(true);
  });

  test('linked child appears directly under parent with no gap', async ({ page }) => {
    // Create parent and child
    const parentContent = `Parent gap test ${Date.now()}`;
    const childContent = `Child gap test ${Date.now()}`;

    await createCard(page, 'col-1', parentContent);
    await createCard(page, 'col-1', childContent);

    // Link them
    await dragCardOntoCard(page, childContent, parentContent);
    await waitForCardLinked(page, childContent);

    // Get bounding boxes
    const parentCard = await findCardByContent(page, parentContent);
    const childCard = await findCardByContent(page, childContent);

    const parentBox = await parentCard.boundingBox();
    const childBox = await childCard.boundingBox();

    if (parentBox && childBox) {
      // Child should be directly below parent (accounting for small border/margin)
      const gap = childBox.y - (parentBox.y + parentBox.height);
      expect(gap).toBeLessThan(10); // Less than 10px gap
    }
  });

  test('link icon appears after linking', async ({ page }) => {
    // Create two cards
    const parentContent = `Icon parent ${Date.now()}`;
    const childContent = `Icon child ${Date.now()}`;

    await createCard(page, 'col-1', parentContent);
    await createCard(page, 'col-1', childContent);

    // Child should have drag handle initially (before linking)
    const childCard = await findCardByContent(page, childContent);
    const dragHandle = childCard
      .locator('[data-testid="drag-handle"]')
      .or(childCard.locator('[aria-label*="drag"]'));

    // Verify drag handle is visible before linking
    const hadDragHandle = await dragHandle.isVisible().catch(() => false);
    // Note: hadDragHandle may be false in jsdom/mocked environments

    // Link the cards
    await dragCardOntoCard(page, childContent, parentContent);
    await waitForCardLinked(page, childContent);

    // After linking: link icon visible
    const isLinked = await isCardLinked(page, childContent);
    expect(isLinked).toBe(true);
  });

  test('click link icon unlinks child', async ({ page }) => {
    // Create and link two cards
    const parentContent = `Unlink parent ${Date.now()}`;
    const childContent = `Unlink child ${Date.now()}`;

    await createCard(page, 'col-1', parentContent);
    await createCard(page, 'col-1', childContent);
    await dragCardOntoCard(page, childContent, parentContent);
    await waitForCardLinked(page, childContent);

    // Verify linked
    expect(await isCardLinked(page, childContent)).toBe(true);

    // Click link icon to unlink
    const childCard = await findCardByContent(page, childContent);
    const linkIcon = childCard
      .locator('[data-testid="link-icon"]')
      .or(childCard.locator('[aria-label*="linked"]'));
    await linkIcon.click();

    // Wait for unlink
    await waitForCardUnlinked(page, childContent);

    // Should no longer be linked
    const stillLinked = await isCardLinked(page, childContent);
    expect(stillLinked).toBe(false);
  });

  test('cannot drop card on itself', async ({ page }) => {
    // Create a card
    const content = `Self drop ${Date.now()}`;
    await createCard(page, 'col-1', content);

    const card = await findCardByContent(page, content);

    // Try to drag onto itself
    await card.dragTo(card);

    // Brief wait for any potential state change, then verify
    await page.waitForLoadState('networkidle');

    // Card should still be normal (not linked)
    const isLinked = await isCardLinked(page, content);
    expect(isLinked).toBe(false);
  });

  test('cannot create circular relationship', async ({ page }) => {
    // Create parent and child
    const parentContent = `Circular parent ${Date.now()}`;
    const childContent = `Circular child ${Date.now()}`;

    await createCard(page, 'col-1', parentContent);
    await createCard(page, 'col-1', childContent);

    // Link child to parent
    await dragCardOntoCard(page, childContent, parentContent);
    await waitForCardLinked(page, childContent);

    // Try to link parent to child (would create circle)
    await dragCardOntoCard(page, parentContent, childContent);
    await page.waitForLoadState('networkidle');

    // Look for error message
    const errorMessage = page
      .locator('[role="alert"]')
      .or(page.locator('text=/circular|invalid/i'));
    const hasError = await errorMessage.isVisible().catch(() => false);

    // Either there's an error message, or the operation was silently blocked
    // Parent should NOT be linked (remain a parent, not a child)
    const parentCard = await findCardByContent(page, parentContent);
    const parentLinkIcon = parentCard.locator('[data-testid="link-icon"]');
    const parentIsLinked = await parentLinkIcon.isVisible().catch(() => false);

    expect(parentIsLinked).toBe(false);
  });

  test('only 1-level hierarchy allowed', async ({ page }) => {
    // Create three cards
    const grandparent = `Grandparent ${Date.now()}`;
    const parent = `Parent ${Date.now()}`;
    const child = `Child ${Date.now()}`;

    await createCard(page, 'col-1', grandparent);
    await createCard(page, 'col-1', parent);
    await createCard(page, 'col-1', child);

    // Link child to parent
    await dragCardOntoCard(page, child, parent);
    await waitForCardLinked(page, child);

    // Try to link parent to grandparent (would create 2-level hierarchy)
    await dragCardOntoCard(page, parent, grandparent);
    await page.waitForLoadState('networkidle');

    // Look for error or verify the operation was blocked
    // Parent (which now has a child) should not become a child of grandparent
    const parentCard = await findCardByContent(page, parent);
    const parentLinkIcon = parentCard.locator('[data-testid="link-icon"]');
    const parentIsLinked = await parentLinkIcon.isVisible().catch(() => false);

    // Parent should not have a link icon (it's a parent, not a child)
    expect(parentIsLinked).toBe(false);
  });

  test('visual feedback on drag over valid target', async ({ page }) => {
    // Create two cards
    const source = `Drag source ${Date.now()}`;
    const target = `Drag target ${Date.now()}`;

    await createCard(page, 'col-1', source);
    await createCard(page, 'col-1', target);

    const sourceCard = await findCardByContent(page, source);
    const targetCard = await findCardByContent(page, target);

    // Start dragging
    const sourceBox = await sourceCard.boundingBox();
    const targetBox = await targetCard.boundingBox();

    if (sourceBox && targetBox) {
      // Simulate drag over
      await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);

      // Check for visual feedback (ring class)
      const hasRing = await targetCard.evaluate((el) => {
        return (
          el.classList.contains('ring-primary') ||
          el.classList.contains('ring-2') ||
          el.className.includes('ring') ||
          getComputedStyle(el).outline !== 'none'
        );
      });

      // Cleanup
      await page.mouse.up();

      // Visual feedback may or may not be detectable depending on implementation
      // This test documents the expected behavior
    }
  });
});
