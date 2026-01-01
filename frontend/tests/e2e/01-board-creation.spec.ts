/**
 * Board Creation E2E Tests
 *
 * Tests the home page and board creation flow.
 */

import { test, expect } from '@playwright/test';
import { isBackendReady, uniqueBoardName, waitForBoardLoad } from './helpers';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
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
  test.beforeEach(async ({ page }) => {
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

    // Should have 3 columns with default names
    await expect(page.getByRole('heading', { name: 'What Went Well' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'To Improve' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Action Items' })).toBeVisible();
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

  test.skip('user becomes admin of created board', async ({ page }) => {
    // TODO: Fix admin detection timing - requires WebSocket connection to establish user identity
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a new board (both name and alias required)
    await page.getByTestId('create-board-button').click();
    await page.getByTestId('board-name-input').pressSequentially(uniqueBoardName('admin'));
    await page.getByTestId('creator-alias-input').pressSequentially('AdminUser');
    await page.getByTestId('submit-create-board').click();

    await page.waitForURL(/\/boards\/.+/, { timeout: 15000 });
    await waitForBoardLoad(page);

    // User should be admin - look for close board button (admin only)
    const closeButton = page
      .getByTestId('close-board-button')
      .or(page.getByRole('button', { name: /close board/i }));

    // Admin controls should be visible
    await expect(closeButton).toBeVisible({ timeout: 10000 });
  });
});
