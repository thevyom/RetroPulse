/**
 * Parent-Child Card Relationships E2E Tests
 *
 * Tests card linking, unlinking, aggregation, and hierarchy constraints.
 */

import { test, expect } from '@playwright/test';
import {
  waitForBoardLoad,
  createCard,
  findCardByContent,
  dragCardOntoCard,
  isCardLinked,
  addReaction,
  getReactionCount,
  waitForCardLinked,
  waitForCardUnlinked,
  waitForReactionCount,
  clickUnlinkForNestedChild,
  getBoardId,
  isBackendReady,
} from './helpers';

test.describe('Parent-Child Card Relationships', () => {
  // Use default board for parent-child card tests
  const testBoardId = getBoardId('default');

  test.beforeEach(async ({ page }) => {
    test.skip(!isBackendReady(), 'Backend not running');
    await page.goto(`/boards/${testBoardId}`);
    await waitForBoardLoad(page);
  });

  test('drag feedback onto feedback creates parent-child', async ({ page }) => {
    const parentContent = `Parent ${Date.now()}`;
    const childContent = `Child ${Date.now()}`;

    await createCard(page, 'col-1', parentContent);
    await createCard(page, 'col-1', childContent);

    await dragCardOntoCard(page, childContent, parentContent);
    await waitForCardLinked(page, childContent);

    const isLinked = await isCardLinked(page, childContent);
    expect(isLinked).toBe(true);
  });

  // NOTE: Unlink functionality is admin-only. This test is skipped because
  // the test user on pre-created boards is not an admin. The unlink button
  // only renders for admin users (see RetroBoardPage.tsx line 304).
  // To enable: create board via API, join as creator (becomes admin), then test unlink.
  test.skip('click link icon unlinks child (admin-only)', async ({ page }) => {
    const parentContent = `Unlink Parent ${Date.now()}`;
    const childContent = `Unlink Child ${Date.now()}`;

    await createCard(page, 'col-1', parentContent);
    await createCard(page, 'col-1', childContent);

    // Link them
    await dragCardOntoCard(page, childContent, parentContent);
    await waitForCardLinked(page, childContent);

    // Verify linked
    expect(await isCardLinked(page, childContent)).toBe(true);

    // Unlink the nested child by clicking its unlink button (admin-only)
    await clickUnlinkForNestedChild(page, childContent);

    await waitForCardUnlinked(page, childContent);

    // Verify unlinked
    const isStillLinked = await isCardLinked(page, childContent);

    expect(isStillLinked).toBe(false);
  });

  test('1-level hierarchy: cannot make grandchild', async ({ page }) => {
    const grandparent = `Grandparent ${Date.now()}`;
    const parent = `Parent ${Date.now()}`;
    const child = `Child ${Date.now()}`;

    await createCard(page, 'col-1', grandparent);
    await createCard(page, 'col-1', parent);
    await createCard(page, 'col-1', child);

    // Link child to parent
    await dragCardOntoCard(page, child, parent);
    await waitForCardLinked(page, child);

    // Verify child is linked
    expect(await isCardLinked(page, child)).toBe(true);

    // Try to link parent to grandparent (would create 2-level)
    await dragCardOntoCard(page, parent, grandparent);
    await page.waitForLoadState('networkidle');

    // Parent should NOT become a child (it has children)
    const parentCard = await findCardByContent(page, parent);
    const parentLinkIcon = parentCard
      .getByRole('button', { name: /link|unlink/i })
      .or(parentCard.locator('[aria-label*="linked"]'));
    const parentIsLinked = await parentLinkIcon.first().isVisible().catch(() => false);

    expect(parentIsLinked).toBe(false);
  });

  test('parent aggregated count shows sum of children reactions', async ({ page }) => {
    const parentContent = `Agg Parent ${Date.now()}`;
    const child1Content = `Agg Child1 ${Date.now()}`;
    const child2Content = `Agg Child2 ${Date.now()}`;

    await createCard(page, 'col-1', parentContent);
    await createCard(page, 'col-1', child1Content);
    await createCard(page, 'col-1', child2Content);

    // Link children to parent
    await dragCardOntoCard(page, child1Content, parentContent);
    await waitForCardLinked(page, child1Content);
    await dragCardOntoCard(page, child2Content, parentContent);
    await waitForCardLinked(page, child2Content);

    // React to children
    await addReaction(page, child1Content);
    await addReaction(page, child2Content);

    // Wait for aggregation update on parent
    await waitForReactionCount(page, parentContent, 2);

    // Parent should show aggregated count
    const parentCount = await getReactionCount(page, parentContent);
    expect(parentCount).toBeGreaterThanOrEqual(2);
  });

  test('cross-column parent-child relationship works', async ({ page }) => {
    const parentContent = `Cross Parent ${Date.now()}`;
    const childContent = `Cross Child ${Date.now()}`;

    // Create in different columns
    await createCard(page, 'col-1', parentContent);
    await createCard(page, 'col-2', childContent);

    // Link child to parent across columns
    await dragCardOntoCard(page, childContent, parentContent);
    await waitForCardLinked(page, childContent);

    // Child should show link icon
    const isLinked = await isCardLinked(page, childContent);
    expect(isLinked).toBe(true);
  });

  test('delete parent orphans children', async ({ page }) => {
    const parentContent = `Del Parent ${Date.now()}`;
    const childContent = `Del Child ${Date.now()}`;

    await createCard(page, 'col-1', parentContent);
    await createCard(page, 'col-1', childContent);

    // Link them
    await dragCardOntoCard(page, childContent, parentContent);
    await waitForCardLinked(page, childContent);

    // Verify linked
    expect(await isCardLinked(page, childContent)).toBe(true);

    // Delete parent - hover on the main card element to trigger group-hover styles
    const parentCard = await findCardByContent(page, parentContent);
    await parentCard.hover();
    await page.waitForTimeout(300); // Wait for CSS transition (opacity animation)

    // Find and click delete button (aria-label="Delete card")
    // Use force:true in case CSS opacity transition hasn't completed
    const deleteButton = parentCard.getByRole('button', { name: 'Delete card' });
    await deleteButton.click({ force: true });

    // Confirm deletion
    const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Wait for parent to be deleted and child to become unlinked
    await page.waitForSelector(`text="${parentContent}"`, { state: 'hidden', timeout: 10000 });

    // Child should become standalone (drag handle restored)
    const childCard = await findCardByContent(page, childContent);
    await expect(childCard).toBeVisible();

    // Child should no longer be linked
    const isStillLinked = await isCardLinked(page, childContent);
    expect(isStillLinked).toBe(false);
  });

  test('linked child appears directly under parent', async ({ page }) => {
    const parentContent = `Gap Parent ${Date.now()}`;
    const childContent = `Gap Child ${Date.now()}`;

    await createCard(page, 'col-1', parentContent);
    await createCard(page, 'col-1', childContent);

    // Link them
    await dragCardOntoCard(page, childContent, parentContent);
    await waitForCardLinked(page, childContent);

    // Get positions
    const parentCard = await findCardByContent(page, parentContent);
    const childCard = await findCardByContent(page, childContent);

    const parentBox = await parentCard.boundingBox();
    const childBox = await childCard.boundingBox();

    if (parentBox && childBox) {
      // Child should be below parent with minimal gap
      const gap = childBox.y - (parentBox.y + parentBox.height);
      expect(gap).toBeLessThan(20); // Less than 20px gap
    }
  });

  test('action card links to feedback', async ({ page }) => {
    const feedbackContent = `Feedback ${Date.now()}`;
    const actionContent = `Action ${Date.now()}`;

    await createCard(page, 'col-1', feedbackContent, { cardType: 'feedback' });
    await createCard(page, 'col-3', actionContent, { cardType: 'action' });

    // Drag action onto feedback
    await dragCardOntoCard(page, actionContent, feedbackContent);
    await waitForCardLinked(page, actionContent);

    // Action should show link
    const isLinked = await isCardLinked(page, actionContent);
    expect(isLinked).toBe(true);
  });
});
