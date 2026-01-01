/**
 * Basic Accessibility E2E Tests
 *
 * Tests focus indicators, accessible labels, and keyboard navigation.
 */

import { test, expect } from '@playwright/test';
import { waitForBoardLoad, createCard, findCardByContent } from './helpers';

test.describe('Basic Accessibility', () => {
  const testBoardId = process.env.TEST_BOARD_ID || 'test-board-a11y';

  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.E2E_BACKEND_READY, 'Backend not running');
    await page.goto(`/board/${testBoardId}`);
    await waitForBoardLoad(page);
  });

  test('interactive elements have focus indicators', async ({ page }) => {
    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Get focused element
    const focusedElement = page.locator(':focus');

    if ((await focusedElement.count()) > 0) {
      // Check for visible focus indicator
      const hasVisibleFocus = await focusedElement.evaluate((el) => {
        const styles = getComputedStyle(el);
        const hasOutline = styles.outline !== 'none' && styles.outlineWidth !== '0px';
        const hasBoxShadow = styles.boxShadow !== 'none';
        const hasRing = el.className.includes('ring') || el.className.includes('focus');
        return hasOutline || hasBoxShadow || hasRing;
      });

      expect(hasVisibleFocus).toBe(true);
    }
  });

  test('cards have accessible labels', async ({ page }) => {
    const content = `A11y card ${Date.now()}`;
    await createCard(page, 'col-1', content);

    const card = await findCardByContent(page, content);

    // Card should have aria-label or be properly labeled
    const hasAriaLabel = await card.getAttribute('aria-label');
    const hasRole = await card.getAttribute('role');

    // Either has aria-label or is an article/region with text content
    const isAccessible =
      hasAriaLabel !== null ||
      hasRole === 'article' ||
      (await card.textContent())?.includes(content);

    expect(isAccessible).toBe(true);
  });

  test('drag handles have accessible names', async ({ page }) => {
    const content = `Drag a11y ${Date.now()}`;
    await createCard(page, 'col-1', content);

    const card = await findCardByContent(page, content);
    const dragHandle = card
      .locator('[data-testid="drag-handle"]')
      .or(card.locator('[aria-label*="drag"]'))
      .or(card.locator('button').first());

    if (await dragHandle.isVisible()) {
      // Should have aria-label for screen readers
      const ariaLabel = await dragHandle.getAttribute('aria-label');
      const title = await dragHandle.getAttribute('title');
      const accessibleName = ariaLabel || title;

      // Drag handle should be accessible
      expect(accessibleName?.toLowerCase()).toMatch(/drag|move|reorder/i);
    }
  });

  test('buttons have accessible names', async ({ page }) => {
    // Check add card button
    const addButton = page
      .getByTestId('add-card-col-1')
      .or(page.locator('button').filter({ hasText: '+' }).first());

    if (await addButton.isVisible()) {
      const ariaLabel = await addButton.getAttribute('aria-label');
      const textContent = await addButton.textContent();

      // Button should have accessible name
      expect(ariaLabel || textContent?.trim()).toBeTruthy();
    }
  });

  test('dialogs trap focus', async ({ page }) => {
    // Open a dialog
    const addButton = page
      .getByTestId('add-card-col-1')
      .or(page.locator('button').filter({ hasText: '+' }).first());

    if ((await addButton.isVisible()) && !(await addButton.isDisabled())) {
      await addButton.click();

      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        // Tab through dialog elements
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // Focus should still be within dialog
        const focusedInDialog = await page.evaluate(() => {
          const dialog = document.querySelector('[role="dialog"]');
          const focused = document.activeElement;
          return dialog?.contains(focused);
        });

        expect(focusedInDialog).toBe(true);

        // Close dialog with Escape
        await page.keyboard.press('Escape');
      }
    }
  });

  test('images have alt text', async ({ page }) => {
    // Find all images
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // Images should have alt text OR role="presentation" for decorative images
      const isAccessible = alt !== null || role === 'presentation' || role === 'none';
      expect(isAccessible).toBe(true);
    }
  });

  test('form inputs have labels', async ({ page }) => {
    // Open a dialog with form
    const addButton = page
      .getByTestId('add-card-col-1')
      .or(page.locator('button').filter({ hasText: '+' }).first());

    if ((await addButton.isVisible()) && !(await addButton.isDisabled())) {
      await addButton.click();

      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        // Find all inputs
        const inputs = dialog.locator('input, textarea');
        const inputCount = await inputs.count();

        for (let i = 0; i < inputCount; i++) {
          const input = inputs.nth(i);
          const id = await input.getAttribute('id');
          const ariaLabel = await input.getAttribute('aria-label');
          const ariaLabelledBy = await input.getAttribute('aria-labelledby');
          const placeholder = await input.getAttribute('placeholder');

          // Check for associated label
          let hasLabel = false;
          if (id) {
            const label = dialog.locator(`label[for="${id}"]`);
            hasLabel = (await label.count()) > 0;
          }

          // Input should have accessible label via one of these methods
          const isLabeled =
            hasLabel || ariaLabel !== null || ariaLabelledBy !== null || placeholder !== null;
          expect(isLabeled).toBe(true);
        }

        await page.keyboard.press('Escape');
      }
    }
  });

  test('color is not the only visual indicator', async ({ page }) => {
    // Create a card and check reaction button
    const content = `Color a11y ${Date.now()}`;
    await createCard(page, 'col-1', content);

    const card = await findCardByContent(page, content);
    const reactionButton = card
      .locator('[data-testid="reaction-button"]')
      .or(card.locator('button[aria-label*="react"]'));

    if (await reactionButton.isVisible()) {
      // Reaction state should be indicated by more than just color
      // (e.g., icon change, aria-pressed, text)
      const ariaPressed = await reactionButton.getAttribute('aria-pressed');
      const hasIcon = (await reactionButton.locator('svg').count()) > 0;
      const hasText = (await reactionButton.textContent())?.trim().length || 0;

      // Should have non-color indicator
      expect(ariaPressed !== null || hasIcon || hasText > 0).toBe(true);
    }
  });

  test('skip link or landmarks present', async ({ page }) => {
    // Check for skip link or main landmark
    const skipLink = page.locator('a[href="#main"], a[href="#content"]');
    const mainLandmark = page.locator('main, [role="main"]');

    const hasSkipLink = (await skipLink.count()) > 0;
    const hasMainLandmark = (await mainLandmark.count()) > 0;

    // Page should have either skip link or main landmark
    expect(hasSkipLink || hasMainLandmark).toBe(true);
  });

  test('heading hierarchy is logical', async ({ page }) => {
    // Get all headings
    const headings = await page.evaluate(() => {
      const hs = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(hs).map((h) => ({
        level: parseInt(h.tagName.charAt(1)),
        text: h.textContent?.trim().slice(0, 50),
      }));
    });

    if (headings.length > 0) {
      // Should start with h1 or have logical progression
      // Check that there's no more than 1 h1
      const h1Count = headings.filter((h) => h.level === 1).length;
      expect(h1Count).toBeLessThanOrEqual(1);

      // Check no level is skipped (e.g., h1 -> h3)
      for (let i = 1; i < headings.length; i++) {
        const jump = headings[i].level - headings[i - 1].level;
        // Should not skip more than 1 level going deeper
        expect(jump).toBeLessThanOrEqual(1);
      }
    }
  });
});
