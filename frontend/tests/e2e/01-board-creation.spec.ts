/**
 * Board Creation E2E Tests
 *
 * Tests the home page and board creation flow.
 */

import { test, expect } from '@playwright/test';
import { isBackendReady, uniqueBoardName, waitForBoardLoad } from './helpers';
import { getBoardViaApi, extractBoardIdFromUrl } from './utils/admin-helpers';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page: _page }) => {
    test.skip(!isBackendReady(), 'Backend not running');
  });

  test('displays home page at root URL', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Home page should be visible
    await expect(page.getByTestId('home-page')).toBeVisible();
  });

  test('displays logo and title', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Title should be visible
    await expect(page.getByTestId('home-title')).toContainText('RetroPulse');
  });

  test('displays tagline', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('home-tagline')).toContainText('Collaborative Retrospective');
  });

  test('displays Create New Board button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const button = page.getByTestId('create-board-button');
    await expect(button).toBeVisible();
    await expect(button).toContainText('Create New Board');
  });

  test('displays feature list', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const featureList = page.getByTestId('feature-list');
    await expect(featureList).toBeVisible();

    // Should have 4 feature items
    const items = featureList.locator('li');
    await expect(items).toHaveCount(4);
  });
});

test.describe('Board Creation', () => {
  test.beforeEach(async ({ page: _page }) => {
    test.skip(!isBackendReady(), 'Backend not running');
  });

  test('clicking Create New Board opens dialog', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click the create button
    await page.getByTestId('create-board-button').click();

    // Dialog should appear
    await expect(page.getByTestId('create-board-dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Create New Board' })).toBeVisible();
  });

  test('dialog shows board name input', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('create-board-button').click();

    const input = page.getByTestId('board-name-input');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'Sprint 42 Retrospective');
  });

  test('dialog shows default column previews', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('create-board-button').click();

    // Should show default columns in the dialog - look for column chips
    const dialog = page.getByTestId('create-board-dialog');
    const columnSection = dialog.getByTestId('column-customization');
    await expect(columnSection).toBeVisible();

    // Check that column inputs have default values
    await expect(dialog.getByTestId('column-input-col-1')).toHaveValue('What Went Well');
    await expect(dialog.getByTestId('column-input-col-2')).toHaveValue('To Improve');
    await expect(dialog.getByTestId('column-input-col-3')).toHaveValue('Action Items');
  });

  test('submit button is disabled when input is empty', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('create-board-button').click();

    const submitButton = page.getByTestId('submit-create-board');
    await expect(submitButton).toBeDisabled();
  });

  test('submit button is enabled when board name and alias are entered', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('create-board-button').click();

    // Submit requires both board name AND creator alias
    const boardInput = page.getByTestId('board-name-input');
    const aliasInput = page.getByTestId('creator-alias-input');
    const submitButton = page.getByTestId('submit-create-board');

    // Fill only board name - should still be disabled (need alias too)
    await boardInput.pressSequentially('Test Board');
    await expect(submitButton).toBeDisabled();

    // Fill alias - now should be enabled
    await aliasInput.pressSequentially('TestUser');
    await expect(submitButton).not.toBeDisabled();
  });

  test('creates board and navigates to it', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open dialog
    await page.getByTestId('create-board-button').click();

    // Fill board name and alias (both required)
    const boardName = uniqueBoardName('creation');
    await page.getByTestId('board-name-input').pressSequentially(boardName);
    await page.getByTestId('creator-alias-input').pressSequentially('TestCreator');

    // Submit
    await page.getByTestId('submit-create-board').click();

    // Should navigate to board page
    await page.waitForURL(/\/boards\/.+/, { timeout: 15000 });

    // Wait for board to load
    await waitForBoardLoad(page);

    // Board header should show the name
    const header = page.locator('[data-testid="board-header"]').or(page.locator('h1'));
    await expect(header).toContainText(boardName.slice(0, 10));
  });

  test('created board has default columns', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a new board (both name and alias required)
    await page.getByTestId('create-board-button').click();
    await page.getByTestId('board-name-input').pressSequentially(uniqueBoardName('columns'));
    await page.getByTestId('creator-alias-input').pressSequentially('TestUser');
    await page.getByTestId('submit-create-board').click();

    await page.waitForURL(/\/boards\/.+/, { timeout: 15000 });
    await waitForBoardLoad(page);

    // Should have 3 columns with default names (column names are editable buttons)
    await expect(
      page.getByRole('button', { name: 'Edit column name: What Went Well' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit column name: To Improve' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Edit column name: Action Items' })
    ).toBeVisible();
  });

  test('cancel button closes dialog', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('create-board-button').click();
    await expect(page.getByTestId('create-board-dialog')).toBeVisible();

    // Click cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Dialog should be closed
    await expect(page.getByTestId('create-board-dialog')).not.toBeVisible();

    // Should still be on home page
    await expect(page.getByTestId('home-page')).toBeVisible();
  });

  test('shows validation error for too long board name', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('create-board-button').click();

    // Enter a name that exceeds the 75 character limit
    // Use pressSequentially to trigger React onChange properly
    const longName = 'a'.repeat(80);
    const boardInput = page.getByTestId('board-name-input');
    const aliasInput = page.getByTestId('creator-alias-input');

    await boardInput.pressSequentially(longName, { delay: 1 }); // Fast typing
    await aliasInput.pressSequentially('TestUser');

    // Click submit to trigger validation
    await page.getByTestId('submit-create-board').click();

    // Should show error (form validates on submit)
    await expect(page.getByTestId('board-name-error')).toBeVisible();
    await expect(page.getByTestId('board-name-error')).toContainText('75 characters');
  });

  test('creator appears in participant bar after board creation (UTB-014)', async ({ page }) => {
    // UTB-014: Verify user appears in participant bar after board creation
    // The creator is shown in MeSection with admin styling (amber background)
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a new board with a specific alias
    const creatorAlias = 'ParticipantTestUser';
    await page.getByTestId('create-board-button').click();
    await page.getByTestId('board-name-input').pressSequentially(uniqueBoardName('participant'));
    await page.getByTestId('creator-alias-input').pressSequentially(creatorAlias);
    await page.getByTestId('submit-create-board').click();

    // Wait for navigation to board page
    await page.waitForURL(/\/boards\/.+/, { timeout: 15000 });
    await waitForBoardLoad(page);

    // 1. Verify participant bar container is visible
    const participantContainer = page.getByTestId('participant-avatar-container');
    await expect(participantContainer).toBeVisible();

    // 2. Verify All Users button is visible and clickable
    const allUsersButton = page.getByRole('button', { name: 'Filter by All Users' });
    await expect(allUsersButton).toBeVisible();
    await expect(allUsersButton).toBeEnabled();

    // 3. Wait for WebSocket to register the participant (no more "No participants yet")
    await page
      .waitForSelector('text="No participants yet"', {
        state: 'hidden',
        timeout: 10000,
      })
      .catch(() => {
        // May already be hidden
      });

    // 4. Verify MeSection avatar appears with correct initial
    // MeSection has data-testid="me-section" and shows the user's initial
    // "ParticipantTestUser" -> initial is "P"
    const meSection = page.getByTestId('me-section');
    await expect(meSection).toBeVisible({ timeout: 10000 });
    await expect(meSection).toContainText('P');

    // 5. Verify Anonymous filter button is also visible
    const anonymousButton = page.getByRole('button', { name: 'Filter by Anonymous Cards' });
    await expect(anonymousButton).toBeVisible();

    // 6. Verify current user avatar is styled as admin (amber background)
    // MeSection uses bg-amber-400 for admin users (amber background, dark text)
    await expect(meSection).toHaveClass(/bg-amber-400/);
  });

  test('user becomes admin of created board (verified via API)', async ({ page, request }) => {
    // Verifies that board creator is set as admin by checking via API
    // This bypasses WebSocket timing issues by using X-Admin-Secret for verification
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a new board (both name and alias required)
    await page.getByTestId('create-board-button').click();
    await page.getByTestId('board-name-input').pressSequentially(uniqueBoardName('admin'));
    await page.getByTestId('creator-alias-input').pressSequentially('AdminUser');
    await page.getByTestId('submit-create-board').click();

    await page.waitForURL(/\/boards\/.+/, { timeout: 15000 });
    await waitForBoardLoad(page);

    // Extract board ID from URL
    const boardId = extractBoardIdFromUrl(page.url());
    expect(boardId).not.toBeNull();

    // Verify creator is admin via API
    const boardData = await getBoardViaApi(request, boardId!);

    // Board should have been created with correct ID
    expect(boardData.id).toBe(boardId);

    // Board should have at least one admin (the creator)
    expect(boardData.admins).toBeDefined();
    expect(Array.isArray(boardData.admins)).toBe(true);
    expect(boardData.admins.length).toBeGreaterThanOrEqual(1);

    // Board should be active (not closed)
    expect(boardData.state).toBe('active');
  });

  test.describe('Copy Link Button (UTB-003)', () => {
    test('Copy Link button exists in board header', async ({ page }) => {
      // Create a new board to get to board page
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.getByTestId('create-board-button').click();
      await page.getByTestId('board-name-input').pressSequentially(uniqueBoardName('copylink'));
      await page.getByTestId('creator-alias-input').pressSequentially('TestUser');
      await page.getByTestId('submit-create-board').click();

      await page.waitForURL(/\/boards\/.+/, { timeout: 15000 });
      await waitForBoardLoad(page);

      // Verify Copy Link button exists with correct label
      const copyLinkButton = page
        .getByRole('button', { name: /copy.*link/i })
        .or(page.locator('[aria-label="Copy board link"]'));
      await expect(copyLinkButton.first()).toBeVisible();

      // Button should have link icon and "Copy Link" text
      await expect(copyLinkButton.first()).toContainText(/copy.*link/i);
    });

    test('Copy Link button copies URL to clipboard', async ({ page, context }) => {
      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      // Create a new board
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.getByTestId('create-board-button').click();
      await page.getByTestId('board-name-input').pressSequentially(uniqueBoardName('clipboard'));
      await page.getByTestId('creator-alias-input').pressSequentially('TestUser');
      await page.getByTestId('submit-create-board').click();

      await page.waitForURL(/\/boards\/.+/, { timeout: 15000 });
      await waitForBoardLoad(page);

      const expectedUrl = page.url();

      // Click Copy Link button
      const copyLinkButton = page
        .getByRole('button', { name: /copy.*link/i })
        .or(page.locator('[aria-label="Copy board link"]'));
      await copyLinkButton.first().click();

      // Check clipboard content
      const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardContent).toBe(expectedUrl);

      // Success toast should appear
      await expect(page.getByText(/copied|success/i).first()).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Advanced Settings - Card/Reaction Limits (UTB-008)', () => {
    test('advanced settings toggle exists in create board dialog', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.getByTestId('create-board-button').click();
      await expect(page.getByTestId('create-board-dialog')).toBeVisible();

      // Advanced settings toggle should exist
      const advancedToggle = page.getByTestId('advanced-settings-toggle');
      await expect(advancedToggle).toBeVisible();
      await expect(advancedToggle).toContainText(/advanced/i);
    });

    test('card limit input appears when advanced settings expanded', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.getByTestId('create-board-button').click();

      // Expand advanced settings
      await page.getByTestId('advanced-settings-toggle').click();

      // Card limit controls should be visible
      const advancedContent = page.getByTestId('advanced-settings-content');
      await expect(advancedContent).toBeVisible();

      // Unlimited should be the default
      const cardLimitUnlimited = page.getByTestId('card-limit-unlimited');
      await expect(cardLimitUnlimited).toBeVisible();
      await expect(cardLimitUnlimited).toBeChecked();

      // Limited option should exist
      const cardLimitLimited = page.getByTestId('card-limit-limited');
      await expect(cardLimitLimited).toBeVisible();
    });

    test('reaction limit input appears when advanced settings expanded', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.getByTestId('create-board-button').click();

      // Expand advanced settings
      await page.getByTestId('advanced-settings-toggle').click();

      // Reaction limit controls should be visible
      const reactionLimitUnlimited = page.getByTestId('reaction-limit-unlimited');
      await expect(reactionLimitUnlimited).toBeVisible();
      await expect(reactionLimitUnlimited).toBeChecked();

      const reactionLimitLimited = page.getByTestId('reaction-limit-limited');
      await expect(reactionLimitLimited).toBeVisible();
    });

    test('can set card limit value', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.getByTestId('create-board-button').click();
      await page.getByTestId('advanced-settings-toggle').click();

      // Select limited option
      await page.getByTestId('card-limit-limited').click();

      // Input should appear
      const cardLimitInput = page.getByTestId('card-limit-input');
      await expect(cardLimitInput).toBeVisible();

      // Enter a value
      await cardLimitInput.fill('5');
      await expect(cardLimitInput).toHaveValue('5');
    });

    test('can set reaction limit value', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.getByTestId('create-board-button').click();
      await page.getByTestId('advanced-settings-toggle').click();

      // Select limited option
      await page.getByTestId('reaction-limit-limited').click();

      // Input should appear
      const reactionLimitInput = page.getByTestId('reaction-limit-input');
      await expect(reactionLimitInput).toBeVisible();

      // Enter a value
      await reactionLimitInput.fill('10');
      await expect(reactionLimitInput).toHaveValue('10');
    });
  });
});
