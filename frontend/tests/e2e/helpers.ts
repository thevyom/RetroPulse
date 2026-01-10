/**
 * E2E Test Helpers
 *
 * Utility functions for common E2E test operations.
 * These helpers interact with the real frontend and backend.
 */

import { expect, type Page, type BrowserContext, type Locator } from '@playwright/test';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { TestBoardIds } from './global-setup';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

export interface TestBoard {
  id: string;
  name: string;
  url: string;
}

export interface TestCard {
  id: string;
  content: string;
  columnId: string;
}

// ============================================================================
// Board IDs from Global Setup
// ============================================================================

// Path to the board IDs file written by global-setup
const BOARD_IDS_FILE = path.join(__dirname, '.test-boards.json');

// Cached board IDs to avoid re-reading file
let cachedBoardIds: TestBoardIds | null = null;

/**
 * Get board IDs created by global-setup
 * Reads from the JSON file written during test setup
 */
export function getTestBoardIds(): TestBoardIds {
  if (cachedBoardIds) {
    return cachedBoardIds;
  }

  try {
    const content = fs.readFileSync(BOARD_IDS_FILE, 'utf-8');
    cachedBoardIds = JSON.parse(content) as TestBoardIds;
    return cachedBoardIds;
  } catch (error) {
    console.warn('Could not read board IDs file, using fallback');
    return {
      sessionId: randomUUID(),
      backendReady: false,
    };
  }
}

/**
 * Check if backend is ready for E2E tests
 */
export function isBackendReady(): boolean {
  return getTestBoardIds().backendReady;
}

/**
 * Get the default test board ID
 */
export function getDefaultBoardId(): string {
  return getTestBoardIds().default || 'fallback-board-id';
}

/**
 * Get a specific board ID by type
 */
export function getBoardId(
  type: 'default' | 'quota' | 'lifecycle' | 'a11y' | 'anon' | 'sorting'
): string {
  const ids = getTestBoardIds();
  return ids[type] || `fallback-${type}-board`;
}

// ============================================================================
// UUID Generation for Test Isolation
// ============================================================================

/**
 * Generate a unique board name with UUID for test isolation
 * Format: e2e-{prefix}-{uuid-short}
 */
export function uniqueBoardName(prefix: string = 'test'): string {
  const uuid = randomUUID().slice(0, 8);
  return `e2e-${prefix}-${uuid}`;
}

/**
 * Generate a unique board ID for test isolation
 * Returns full UUID for API compatibility
 */
export function uniqueBoardId(): string {
  return `e2e-${randomUUID()}`;
}

/**
 * Generate a unique test session ID
 * Used for grouping related test data for cleanup
 */
export function getTestSessionId(): string {
  return getTestBoardIds().sessionId;
}

// ============================================================================
// E2E Logging Infrastructure
// ============================================================================

/**
 * Log levels for E2E debugging
 * Set E2E_LOG_LEVEL environment variable to control verbosity:
 * - DEBUG: All messages (verbose)
 * - INFO: Informational messages (default)
 * - WARN: Warnings only
 * - ERROR: Errors only
 */
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LOG_LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
const E2E_LOG_LEVEL = (process.env.E2E_LOG_LEVEL as LogLevel) || 'INFO';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(E2E_LOG_LEVEL);
}

/**
 * Structured logging for E2E tests
 * @param context - The function/module context (e.g., 'waitForBoardLoad')
 * @param message - The message to log
 * @param level - Log level (default: INFO)
 */
export function e2eLog(context: string, message: string, level: LogLevel = 'INFO'): void {
  if (!shouldLog(level)) return;
  const timestamp = new Date().toISOString().slice(11, 23);
  const prefix = level === 'ERROR' ? '!' : level === 'WARN' ? '?' : level === 'DEBUG' ? '.' : '>';
  console.log(`[${timestamp}][${prefix}${level}][${context}] ${message}`);
}

/**
 * Log page state for debugging - useful when tests fail
 */
export async function logPageState(page: Page, context: string): Promise<void> {
  try {
    const url = page.url();
    const title = await page.title().catch(() => 'unknown');

    e2eLog(context, `URL: ${url}`, 'DEBUG');
    e2eLog(context, `Title: ${title}`, 'DEBUG');

    // Check for common error states
    const bodyText =
      (await page
        .locator('body')
        .textContent()
        .catch(() => '')) || '';

    if (bodyText.includes('Rate limited')) {
      e2eLog(context, 'PAGE STATE: Rate limited error detected!', 'ERROR');
      e2eLog(context, 'Fix: Start backend with DISABLE_RATE_LIMIT=true npm run dev', 'ERROR');
    }
    if (bodyText.includes('Error') || bodyText.includes('error')) {
      e2eLog(context, `PAGE STATE: Error on page - ${bodyText.slice(0, 200)}`, 'WARN');
    }

    // Log visible dialogs
    const dialogVisible = await page
      .locator('[role="dialog"]')
      .isVisible()
      .catch(() => false);
    if (dialogVisible) {
      const dialogTitle = await page
        .locator('[role="dialog"] h2')
        .textContent()
        .catch(() => 'unknown');
      e2eLog(context, `Dialog visible: ${dialogTitle}`, 'DEBUG');
    }
  } catch (error) {
    e2eLog(context, `Failed to log page state: ${error}`, 'ERROR');
  }
}

// ============================================================================
// Rate Limit Detection
// ============================================================================

/**
 * Check if page is showing rate limit error
 * Returns true if rate limited, false otherwise
 */
export async function checkForRateLimit(page: Page): Promise<boolean> {
  const rateLimitAlert = page.getByText(/rate limit/i);
  const isRateLimited = await rateLimitAlert.isVisible().catch(() => false);

  if (isRateLimited) {
    console.error('[E2E:RATE_LIMIT] ========================================');
    console.error('[E2E:RATE_LIMIT] Page is rate limited!');
    console.error('[E2E:RATE_LIMIT] Start backend with: DISABLE_RATE_LIMIT=true npm run dev');
    console.error('[E2E:RATE_LIMIT] ========================================');
    return true;
  }
  return false;
}

/**
 * Throw error if rate limited - use this to fail fast with clear message
 */
export async function failIfRateLimited(page: Page): Promise<void> {
  if (await checkForRateLimit(page)) {
    throw new Error(
      'E2E Test Failed: Backend rate limiting is active. ' +
        'Start backend with: DISABLE_RATE_LIMIT=true npm run dev'
    );
  }
}

// ============================================================================
// Board Operations
// ============================================================================

/**
 * Navigate to home page
 */
export async function goToHomePage(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

/**
 * Create a new board via the UI
 */
export async function createBoard(page: Page, name: string): Promise<TestBoard> {
  await page.goto('/');

  // Fill board name input
  const nameInput = page.getByTestId('board-name-input').or(page.getByPlaceholder(/board name/i));
  if (await nameInput.isVisible()) {
    await nameInput.fill(name);

    // Click create button
    const createButton = page
      .getByTestId('create-board-button')
      .or(page.getByRole('button', { name: /create/i }));
    await createButton.click();
  } else {
    // Alternative: direct API call and navigation
    // For now, assume home page has a create form
  }

  // Wait for navigation to board page
  await page.waitForURL(/\/board\/.+/, { timeout: 15000 });

  const url = page.url();
  const boardId = url.split('/board/')[1]?.split('?')[0] || '';

  return { id: boardId, name, url };
}

/**
 * Join an existing board
 */
export async function joinBoard(
  page: Page,
  boardId: string,
  alias?: string
): Promise<{ alias: string }> {
  await page.goto(`/boards/${boardId}`);

  // Wait for board to load
  await page.waitForSelector('[data-testid="board-header"]', { timeout: 15000 }).catch(() => {
    // Alternative: wait for any header element
    return page.waitForSelector('h1, [role="heading"]', { timeout: 15000 });
  });

  // If alias dialog appears, fill it
  const aliasInput = page.getByTestId('alias-input').or(page.getByPlaceholder(/alias|name/i));
  if (await aliasInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    const userAlias = alias || `TestUser${Date.now().toString().slice(-4)}`;
    await aliasInput.fill(userAlias);

    const joinButton = page
      .getByTestId('join-button')
      .or(page.getByRole('button', { name: /join/i }));
    await joinButton.click();

    return { alias: userAlias };
  }

  return { alias: alias || 'DefaultUser' };
}

/**
 * Handle alias prompt modal if it appears
 * Returns true if modal was handled, false otherwise
 *
 * Phase 8.8: Refactored for reliability
 * - Uses data-testid locators first (most reliable)
 * - Uses real .click() instead of dispatchEvent
 * - Verifies modal actually closes
 * - Better error messaging
 */
export async function handleAliasPromptModal(
  page: Page,
  alias?: string,
  debug = true
): Promise<boolean> {
  const log = (msg: string) => {
    if (debug) {
      console.log(`[handleAliasPromptModal] ${msg}`);
    }
  };

  // Check for alias input using data-testid first (most reliable)
  const aliasInput = page.getByTestId('alias-input');
  const aliasInputAlt = page.getByPlaceholder(/enter your name/i);

  log('Checking for alias modal (waiting up to 4s)...');
  try {
    // Try both selectors
    await Promise.race([
      aliasInput.waitFor({ state: 'visible', timeout: 4000 }),
      aliasInputAlt.waitFor({ state: 'visible', timeout: 4000 }),
    ]);
    log('Alias modal found');
  } catch {
    log('No alias modal found within 4s');
    return false;
  }

  // Determine which input is visible
  const inputToUse = (await aliasInput.isVisible()) ? aliasInput : aliasInputAlt;

  // Generate unique alias
  const userAlias = alias || `E2EUser${Date.now().toString().slice(-4)}`;
  log(`Entering alias: ${userAlias}`);

  // Clear and fill (more reliable than pressSequentially)
  await inputToUse.clear();
  await inputToUse.fill(userAlias);

  // Wait for React state to update
  await page.waitForTimeout(200);

  // Find Join Board button using data-testid (most reliable)
  const joinButton = page.getByTestId('join-board-button');
  const joinButtonAlt = page.getByRole('button', { name: /join board/i });

  // Wait for button to be enabled
  log('Waiting for Join Board button to be enabled...');
  try {
    // Check which button is visible and wait for it to be enabled
    const buttonToUse = (await joinButton.isVisible()) ? joinButton : joinButtonAlt;
    await expect(buttonToUse).toBeEnabled({ timeout: 3000 });

    log('Clicking Join Board button...');
    await buttonToUse.click();
  } catch (error) {
    // Fallback: try dispatchEvent if regular click fails
    log('Regular click failed, trying dispatchEvent fallback...');
    const fallbackButton = page.locator('button:has-text("Join Board")');
    await fallbackButton.dispatchEvent('click');
  }

  // Wait for modal to close
  log('Waiting for modal to close...');
  const dialog = page.locator('[role="dialog"]');
  try {
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    log('Modal closed successfully');
  } catch {
    // Check if modal is still visible
    const stillVisible = await dialog.isVisible().catch(() => false);
    if (stillVisible) {
      log('WARNING: Modal still visible after clicking Join - may need investigation');
    } else {
      log('Modal closed (verified via isVisible)');
    }
  }

  return true;
}

/**
 * Wait for board to be fully loaded
 * Handles alias prompt modal if it appears
 */
export async function waitForBoardLoad(
  page: Page,
  options: { timeout?: number; alias?: string; debug?: boolean } = {}
): Promise<void> {
  const { timeout = 4000, alias, debug = true } = options;
  const startTime = Date.now();

  const log = (msg: string) => {
    if (debug) {
      console.log(`[waitForBoardLoad +${Date.now() - startTime}ms] ${msg}`);
    }
  };

  log(`Starting - URL: ${page.url()}`);

  // Wait for page to be stable first
  await page.waitForLoadState('domcontentloaded');
  log('DOM content loaded');

  // Check for rate limiting first - fail fast with clear message
  if (await checkForRateLimit(page)) {
    throw new Error(
      'E2E Test Failed: Backend rate limiting is active. ' +
        'Start backend with: DISABLE_RATE_LIMIT=true npm run dev'
    );
  }

  // Check for error states first
  const errorText = await page
    .locator('text=/error|failed|not found/i')
    .first()
    .isVisible()
    .catch(() => false);
  if (errorText) {
    const errorContent = await page
      .locator('text=/error|failed|not found/i')
      .first()
      .textContent()
      .catch(() => '');
    log(`ERROR STATE DETECTED: ${errorContent}`);
  }

  // Handle alias prompt modal if it appears (Phase 8.7 AliasPromptModal)
  const modalHandled = await handleAliasPromptModal(page, alias);
  log(`Alias modal handled: ${modalHandled}`);

  // Wait for any column header to appear (indicates board is loaded)
  // Note: Column headers are h2 elements, but they may have role="button" for admins
  // so we use text matching instead of heading role for reliability
  try {
    await page
      .locator('h2')
      .filter({ hasText: /What Went Well|To Improve|Action Items/i })
      .first()
      .waitFor({ state: 'visible', timeout });
    log('Column headers visible - board loaded successfully');
  } catch (error) {
    // Debug: Log what's actually on the page
    const pageTitle = await page.title().catch(() => 'unknown');
    const bodyText = await page
      .locator('body')
      .textContent()
      .catch(() => '');
    const truncatedBody = bodyText?.substring(0, 500) || '';
    log(`TIMEOUT waiting for columns. Page title: ${pageTitle}`);
    log(`Body content (first 500 chars): ${truncatedBody}`);

    // Check for specific elements
    const hasDialog = await page
      .locator('[role="dialog"]')
      .isVisible()
      .catch(() => false);
    const hasError = await page
      .locator('[role="alert"]')
      .isVisible()
      .catch(() => false);
    const hasLoading = await page
      .locator('text=/loading/i')
      .isVisible()
      .catch(() => false);
    log(`Has dialog: ${hasDialog}, Has error: ${hasError}, Has loading: ${hasLoading}`);

    throw error;
  }
}

// ============================================================================
// Card Operations
// ============================================================================

/**
 * Create a card in a specific column
 */
export async function createCard(
  page: Page,
  columnSelector: string,
  content: string,
  options: {
    cardType?: 'feedback' | 'action';
    isAnonymous?: boolean;
    timeout?: number;
    debug?: boolean;
  } = {}
): Promise<TestCard> {
  const { cardType = 'feedback', isAnonymous = false, timeout = 15000, debug = true } = options;

  const log = (msg: string) => {
    if (debug) {
      console.log(`[createCard] ${msg}`);
    }
  };

  log(`Creating ${cardType} card in ${columnSelector}: "${content.substring(0, 30)}..."`);
  log(`isAnonymous: ${isAnonymous}`);

  // Click add card button for the column
  // columnSelector can be a column ID like "col-1" or a column name like "What Went Well"
  const columnNameMap: Record<string, string> = {
    'col-1': 'What Went Well',
    'col-2': 'To Improve',
    'col-3': 'Action Items',
    went_well: 'What Went Well',
    to_improve: 'To Improve',
    action_item: 'Action Items',
  };
  const columnName = columnNameMap[columnSelector] || columnSelector;
  log(`Looking for column: "${columnName}"`);

  // Find the Add card button for the column
  // Column headers can be either:
  // 1. h2 heading elements (non-admin view)
  // 2. button elements with "Edit column name: {name}" (admin view)
  // We look for the Add card button that's a sibling of either
  const h2Heading = page.locator('h2').filter({ hasText: columnName });
  const editButton = page.getByRole('button', { name: `Edit column name: ${columnName}` });

  // Try h2 first, then button
  let addButton = h2Heading.locator('..').getByRole('button', { name: 'Add card' });

  // Wait for add button to be clickable
  log('Waiting for Add card button...');
  try {
    // First try with h2 heading
    const h2Visible = await h2Heading.isVisible().catch(() => false);
    if (!h2Visible) {
      // Fall back to edit button (admin view)
      log('h2 not found, trying edit button selector...');
      addButton = editButton.locator('..').getByRole('button', { name: 'Add card' });
    }
    await addButton.waitFor({ state: 'visible', timeout: 10000 });
    log('Add card button found, clicking...');
  } catch (error) {
    log(`ERROR: Add card button not found. Checking page state...`);
    const headings = await page.locator('h2').allTextContents();
    const buttons = await page
      .locator('button')
      .filter({ hasText: /Edit column name/ })
      .allTextContents();
    log(`Available h2 headings: ${JSON.stringify(headings)}`);
    log(`Available edit buttons: ${JSON.stringify(buttons)}`);
    throw error;
  }
  await addButton.click();

  // Wait for dialog to open with longer timeout
  log('Waiting for dialog to open...');
  try {
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    log('Dialog opened');
  } catch (error) {
    log(`ERROR: Dialog did not open`);
    throw error;
  }

  // Fill content - try multiple selectors
  const contentInput = page
    .getByTestId('card-content-input')
    .or(page.locator('[role="dialog"] textarea'))
    .or(page.locator('[role="dialog"] input[type="text"]'))
    .or(page.getByPlaceholder(/content|text|message/i));
  await contentInput.first().waitFor({ state: 'visible', timeout: 5000 });
  await contentInput.first().fill(content);

  // Set card type if needed
  if (cardType === 'action') {
    const typeSelect = page.getByTestId('card-type-select');
    if (await typeSelect.isVisible().catch(() => false)) {
      await typeSelect.selectOption('action');
    }
  }

  // Set anonymous if needed
  if (isAnonymous) {
    const anonCheckbox = page
      .getByTestId('anonymous-checkbox')
      .or(page.getByLabel(/anonymous/i))
      .or(page.locator('[role="dialog"] input[type="checkbox"]'));
    if (await anonCheckbox.isVisible().catch(() => false)) {
      await anonCheckbox.check();
    }
  }

  // Submit - try multiple selectors
  const submitButton = page
    .getByTestId('create-card-submit')
    .or(page.locator('[role="dialog"] button[type="submit"]'))
    .or(page.getByRole('button', { name: /create|add|submit|save/i }));
  await submitButton.first().click();

  // Wait for dialog to close
  await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 }).catch(() => {});

  // Wait for card to appear - just check if the content text appears on the page
  await page.getByText(content, { exact: false }).first().waitFor({ state: 'visible', timeout });

  return {
    id: '', // We'd need to extract this from the DOM
    content,
    columnId: columnSelector,
  };
}

/**
 * Find a card container by content
 * Returns the card container element (id="card-{id}"), not just the text element.
 * This is important for finding child elements like the drag handle.
 */
export async function findCardByContent(
  page: Page,
  content: string,
  options: { timeout?: number } = {}
) {
  const { timeout = 10000 } = options;

  // Find the card container by looking for div[id^="card-"] that contains the text
  // The card container has id="card-{uuid}" pattern
  const card = page.locator('[id^="card-"]').filter({ hasText: content }).first();

  // Wait for it to be visible
  await card.waitFor({ state: 'visible', timeout }).catch(() => {});

  return card;
}

/**
 * Delete a card
 */
export async function deleteCard(page: Page, content: string): Promise<void> {
  const card = await findCardByContent(page, content);

  // Hover to show delete button (has opacity-0 initially, group-hover:opacity-100)
  await card.hover();

  // Wait a bit for the CSS transition
  await page.waitForTimeout(200);

  // Click delete button - use accessible selector with exact aria-label
  const deleteButton = card.getByRole('button', { name: 'Delete card' });

  // Wait for button to become visible after hover
  await deleteButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

  if (await deleteButton.isVisible()) {
    await deleteButton.click();

    // Confirm deletion in the dialog
    const confirmButton = page.getByRole('button', { name: /^delete$/i });
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
    }
  }

  // Wait for card to disappear
  await page.waitForSelector(`text="${content}"`, { state: 'hidden', timeout: 5000 });
}

/**
 * Add reaction to a card
 *
 * Handles both standalone cards ("Add reaction") and nested child cards
 * ("Add reaction to child card") which have different aria-labels.
 *
 * For nested children: When a child card is nested inside a parent,
 * findCardByContent returns the parent (since it contains the child's text).
 * We need to find the child-specific reaction button near the child's content.
 */
export async function addReaction(page: Page, content: string): Promise<void> {
  // Strategy: Look for the paragraph containing the content, then find the
  // nearest reaction button. For nested children, the button is in the same
  // div container. For standalone cards, the button is in the card header.

  // Find the paragraph with the content
  const paragraph = page.locator('p').filter({ hasText: content }).first();
  await paragraph.waitFor({ state: 'visible', timeout: 5000 });

  // Get the parent container of this paragraph
  const container = paragraph.locator('..');

  // Try to find a reaction button in this container first (for nested children)
  const childReactionButton = container.getByRole('button', {
    name: /Add reaction to child card|Remove reaction from child card/i,
  });
  if ((await childReactionButton.count()) > 0) {
    await childReactionButton.first().click();
    return;
  }

  // Not a nested child - find the card containing this paragraph and click its reaction button
  const card = page.locator('[id^="card-"]').filter({ has: paragraph }).first();
  const reactionButton = card.getByRole('button', { name: /^Add reaction$|^Remove reaction$/i });
  await reactionButton.first().click();
}

/**
 * Get reaction count for a card
 *
 * The reaction count is displayed inside the "Add reaction" button.
 * DOM structure: button > div > span with the count number
 */
export async function getReactionCount(page: Page, content: string): Promise<number> {
  const card = await findCardByContent(page, content);

  // The reaction button contains the count inside it
  // Look for button with aria-label containing "reaction" and extract number from its text
  const reactionButton = card
    .getByRole('button', { name: /Add reaction|Remove reaction/i })
    .first();
  const buttonText = await reactionButton.textContent().catch(() => '');

  // Extract the first number from the button text
  const match = buttonText.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

// ============================================================================
// WebSocket Connection Helpers
// ============================================================================

/**
 * Wait for WebSocket connection to be established
 * This helps stabilize multi-user tests by ensuring the socket is connected
 * before performing actions that depend on real-time sync.
 */
export async function waitForWebSocketConnection(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;

  // Wait for the board to be fully loaded with columns and interactive elements
  // The "No participants yet" message disappears once WebSocket registers the user
  await page.waitForFunction(
    () => {
      // Check for column headings (indicates board loaded)
      const columnHeadings = document.querySelectorAll('h2');
      if (columnHeadings.length < 3) return false;

      // Check that "No participants yet" message is gone (WebSocket registered user)
      const noParticipantsText = document.body.textContent?.includes('No participants yet');
      if (noParticipantsText) return false;

      return true;
    },
    { timeout }
  );

  // Additional small delay to ensure WebSocket event handlers are registered
  await page.waitForTimeout(500);
}

/**
 * Wait for a specific number of participants to be visible
 * Useful for multi-user tests that need to verify all users have joined
 */
export async function waitForParticipantCount(
  page: Page,
  expectedCount: number,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 15000 } = options;

  await page.waitForFunction(
    ({ count }) => {
      const avatars = document.querySelectorAll('[data-testid^="participant-avatar"]');
      // Count user avatars (exclude All Users and Anonymous buttons)
      const userAvatars = Array.from(avatars).filter(
        (el) => el.getAttribute('data-avatar-type') === 'user'
      );
      return userAvatars.length >= count;
    },
    { count: expectedCount },
    { timeout }
  );
}

// ============================================================================
// Drag and Drop Operations
// ============================================================================

/**
 * Perform drag-and-drop using keyboard shortcuts.
 *
 * @dnd-kit's KeyboardSensor responds to:
 * - Space/Enter: Pick up the draggable item
 * - Arrow keys: Move the item
 * - Space/Enter: Drop the item
 * - Escape: Cancel the drag
 *
 * This is more reliable in Playwright than mouse-based dragging because
 * @dnd-kit's PointerSensor expects native pointer* events, but Playwright
 * dispatches mouse* events.
 */
export async function dndKitDragWithKeyboard(
  page: Page,
  sourceLocator: Locator,
  direction: 'up' | 'down' | 'left' | 'right',
  steps: number = 1
): Promise<void> {
  // Find the drag handle within the source card
  const dragHandle = sourceLocator.locator('[data-testid="card-header"]').first();

  // Wait for element to be visible and focusable
  await dragHandle.waitFor({ state: 'visible', timeout: 5000 });

  // Focus the drag handle
  await dragHandle.focus();
  await page.waitForTimeout(100);

  // Pick up the item with Space
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);

  // Move in the specified direction
  const arrowKey = {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
  }[direction];

  for (let i = 0; i < steps; i++) {
    await page.keyboard.press(arrowKey);
    await page.waitForTimeout(100);
  }

  // Drop the item with Space
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
}

/**
 * Perform drag-and-drop to link cards using keyboard navigation.
 * Uses Tab/Shift+Tab to navigate between drop targets after picking up.
 */
export async function dndKitLinkCardsWithKeyboard(
  page: Page,
  sourceLocator: Locator,
  targetLocator: Locator
): Promise<void> {
  // Find the drag handle within the source card
  const dragHandle = sourceLocator.locator('[data-testid="card-header"]').first();

  // Wait for both elements to be visible
  await dragHandle.waitFor({ state: 'visible', timeout: 5000 });
  await targetLocator.waitFor({ state: 'visible', timeout: 5000 });

  // Focus the drag handle
  await dragHandle.focus();
  await page.waitForTimeout(100);

  // Pick up the item with Space
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);

  // Navigate to the target using Tab - @dnd-kit cycles through valid drop targets
  // We'll try multiple tabs to find the target card
  const maxTabs = 20;
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    // Check if the currently focused drop target matches our target
    const focused = await page.evaluate(() => {
      const active = document.activeElement;
      return active?.getAttribute('data-testid') || active?.id || '';
    });

    // If we're over the target card, break
    const targetId = await targetLocator.getAttribute('id').catch(() => null);
    if (targetId && focused.includes(targetId.replace('card-', ''))) {
      break;
    }
  }

  // Drop the item with Space
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
}

/**
 * Perform drag-and-drop using Playwright's native pointer events.
 *
 * This uses the PointerSensor in @dnd-kit. The drag sequence:
 * 1. Locate the drag handle (card header)
 * 2. Use Playwright's dragTo() to drag from source to target center
 *
 * Note: @dnd-kit requires a minimum drag distance of 8px to activate (see PointerSensor config).
 * We drag to the center of the target element.
 */
export async function dndKitDragKeyboard(
  page: Page,
  sourceLocator: Locator,
  targetLocator: Locator
): Promise<void> {
  // Find the drag handle within the source card (the card header element)
  const sourceDragHandle = sourceLocator.locator('[data-testid="card-header"]').first();

  // Ensure both elements are visible
  await sourceDragHandle.waitFor({ state: 'visible', timeout: 5000 });
  await targetLocator.waitFor({ state: 'visible', timeout: 5000 });

  // Get bounding boxes
  const sourceBox = await sourceDragHandle.boundingBox();
  const targetBox = await targetLocator.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error('Could not get bounding box for source or target');
  }

  // Use Playwright's drag API with explicit coordinates
  // Start from center of source drag handle, end at center of target
  const sourceX = sourceBox.x + sourceBox.width / 2;
  const sourceY = sourceBox.y + sourceBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height / 2;

  // Perform the drag using mouse events
  // Move to source, press, move slowly to target (to trigger @dnd-kit's sensors), release
  await page.mouse.move(sourceX, sourceY);
  await page.waitForTimeout(100);
  await page.mouse.down();
  await page.waitForTimeout(100);

  // Move in steps to ensure @dnd-kit recognizes the drag (needs 8px minimum movement)
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const x = sourceX + (targetX - sourceX) * (i / steps);
    const y = sourceY + (targetY - sourceY) * (i / steps);
    await page.mouse.move(x, y);
    await page.waitForTimeout(30);
  }

  // Brief pause at destination for drop zone detection
  await page.waitForTimeout(200);

  // Release
  await page.mouse.up();
  await page.waitForTimeout(300);
}

/**
 * Legacy pointer-based drag (kept for reference, but keyboard is preferred)
 */
export async function dndKitDrag(
  page: Page,
  sourceLocator: Locator,
  targetLocator: Locator
): Promise<void> {
  // Use keyboard-based drag as the default - more reliable in Playwright
  await dndKitDragKeyboard(page, sourceLocator, targetLocator);
}

/**
 * Drag a card onto another card (create parent-child)
 */
export async function dragCardOntoCard(
  page: Page,
  sourceContent: string,
  targetContent: string,
  options: { timeout?: number; debug?: boolean } = {}
): Promise<void> {
  const { timeout = 15000, debug = true } = options;

  const log = (msg: string) => {
    if (debug) {
      console.log(`[dragCardOntoCard] ${msg}`);
    }
  };

  log(
    `Dragging "${sourceContent.substring(0, 20)}..." onto "${targetContent.substring(0, 20)}..."`
  );

  const sourceCard = await findCardByContent(page, sourceContent, { timeout });
  const targetCard = await findCardByContent(page, targetContent, { timeout });

  log('Found both cards');

  // Ensure both cards are visible
  await sourceCard.waitFor({ state: 'visible', timeout: 5000 });
  await targetCard.waitFor({ state: 'visible', timeout: 5000 });
  log('Both cards visible');

  // Get bounding boxes for debug
  const sourceBox = await sourceCard.boundingBox();
  const targetBox = await targetCard.boundingBox();
  log(`Source box: ${JSON.stringify(sourceBox)}`);
  log(`Target box: ${JSON.stringify(targetBox)}`);

  // Use keyboard-based drag for @dnd-kit compatibility
  log('Performing keyboard-based drag...');
  await dndKitDragKeyboard(page, sourceCard, targetCard);

  // Additional wait for UI to settle after drag
  await page.waitForTimeout(300);
  log('Drag complete');
}

/**
 * Drag a card to a column
 */
export async function dragCardToColumn(
  page: Page,
  cardContent: string,
  columnId: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 15000 } = options;

  const card = await findCardByContent(page, cardContent, { timeout });
  const column = page
    .getByTestId(`column-${columnId}`)
    .or(page.locator(`[data-column-id="${columnId}"]`))
    .or(page.locator(`[data-testid="retro-column-${columnId}"]`));

  // Ensure both elements are visible
  await card.waitFor({ state: 'visible', timeout: 5000 });
  await column.first().waitFor({ state: 'visible', timeout: 5000 });

  // Use keyboard-based drag for @dnd-kit compatibility
  await dndKitDrag(page, card, column.first());

  // Additional wait for UI to settle after drag
  await page.waitForTimeout(300);
}

// ============================================================================
// Multi-User Operations
// ============================================================================

/**
 * Create a new browser context (simulates a new user)
 */
export async function createUserContext(
  browser: import('@playwright/test').Browser
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  return { context, page };
}

/**
 * Wait for real-time update to appear
 */
export async function waitForRealtimeUpdate(
  page: Page,
  selector: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 20000 } = options; // Increased from 10s to 20s for real-time sync
  await page.waitForSelector(selector, { timeout });
}

// ============================================================================
// Board State Operations
// ============================================================================

/**
 * Close a board (admin only)
 */
export async function closeBoard(page: Page): Promise<void> {
  const closeButton = page
    .getByTestId('close-board-button')
    .or(page.getByRole('button', { name: /close board/i }));
  await closeButton.click();

  // Confirm
  const confirmButton = page
    .getByTestId('confirm-close')
    .or(page.getByRole('button', { name: /confirm/i }));
  await confirmButton.click();

  // Wait for closed state
  await page
    .waitForSelector('[data-testid="board-closed-indicator"]', { timeout: 5000 })
    .catch(() => {
      return page.waitForSelector('[aria-label*="closed"]', { timeout: 5000 });
    });
}

/**
 * Check if board is closed
 * The closed indicator in RetroBoardHeader has title="Board is closed" and shows "Closed" text
 */
export async function isBoardClosed(page: Page): Promise<boolean> {
  const closedIndicator = page
    .getByTestId('board-closed-indicator')
    .or(page.locator('[title="Board is closed"]'))
    .or(page.getByText('Closed', { exact: true }))
    .or(page.locator('[aria-label*="closed"]'));

  return closedIndicator
    .first()
    .isVisible()
    .catch(() => false);
}

// ============================================================================
// Participant Operations
// ============================================================================

/**
 * Get count of active participants
 */
export async function getParticipantCount(page: Page): Promise<number> {
  const countElement = page
    .getByTestId('participant-count')
    .or(page.locator('[aria-label*="participant"] span'));

  const countText = await countElement.textContent().catch(() => '0');
  return parseInt(countText || '0', 10);
}

/**
 * Update user alias
 */
export async function updateAlias(page: Page, newAlias: string): Promise<void> {
  // Click on user card or edit button
  const editButton = page
    .getByTestId('edit-alias-button')
    .or(page.locator('[aria-label*="edit alias"]'));
  await editButton.click();

  // Fill new alias
  const aliasInput = page.getByTestId('alias-input').or(page.locator('[role="dialog"] input'));
  await aliasInput.fill(newAlias);

  // Submit
  const saveButton = page.getByRole('button', { name: /save|update/i });
  await saveButton.click();

  // Wait for update
  await page.waitForSelector(`text="${newAlias}"`, { timeout: 5000 });
}

// ============================================================================
// Assertions
// ============================================================================

/**
 * Check if card exists in column
 */
export async function isCardInColumn(
  page: Page,
  cardContent: string,
  columnId: string
): Promise<boolean> {
  const column = page
    .getByTestId(`column-${columnId}`)
    .or(page.locator(`[data-column-id="${columnId}"]`));
  const card = column.locator(`text="${cardContent}"`);
  return card.isVisible().catch(() => false);
}

/**
 * Check if card is linked (is a child of another card or has feedback links)
 *
 * There are two linking patterns:
 * 1. Parent-child (feedback cards): Child appears nested inside parent with "Add reaction to child card"
 * 2. Action-feedback links: Action card has "Links to" section showing linked feedback
 */
export async function isCardLinked(page: Page, cardContent: string): Promise<boolean> {
  // Pattern 1: Card appears as nested child inside another card
  // Look for a parent card containing both the content and a child reaction button
  const parentWithChild = page
    .locator('[id^="card-"]')
    .filter({
      has: page.getByText(cardContent, { exact: false }),
    })
    .filter({
      has: page.getByRole('button', { name: /reaction to child card/i }),
    });
  const isNestedChild = await parentWithChild
    .first()
    .isVisible()
    .catch(() => false);
  if (isNestedChild) return true;

  // Pattern 2: Action card has "Links to" section (action linked to feedback)
  const cardWithLinksTo = page
    .locator('[id^="card-"]')
    .filter({
      has: page.getByText(cardContent, { exact: false }),
    })
    .filter({
      has: page.getByText('Links to'),
    });
  const hasLinksTo = await cardWithLinksTo
    .first()
    .isVisible()
    .catch(() => false);
  if (hasLinksTo) return true;

  // Pattern 3: Card has "Linked Actions" section (feedback with linked action cards)
  const cardWithLinkedActions = page
    .locator('[id^="card-"]')
    .filter({
      has: page.getByText(cardContent, { exact: false }),
    })
    .filter({
      has: page.getByText('Linked Actions'),
    });
  const hasLinkedActions = await cardWithLinkedActions
    .first()
    .isVisible()
    .catch(() => false);
  if (hasLinkedActions) return true;

  return false;
}

/**
 * Wait for a card to become linked (appears as child of another card or has links)
 */
export async function waitForCardLinked(
  page: Page,
  cardContent: string,
  options: { timeout?: number; debug?: boolean } = {}
): Promise<void> {
  const { timeout = 10000, debug = true } = options;

  const log = (msg: string) => {
    if (debug) {
      console.log(`[waitForCardLinked] ${msg}`);
    }
  };

  log(
    `Waiting for card "${cardContent.substring(0, 30)}..." to become linked (timeout: ${timeout}ms)`
  );

  // Wait for any of the linking patterns to appear
  await Promise.race([
    // Pattern 1: Card appears as nested child - look for the child reaction button
    // The parent card will have both the child content and a button with aria-label containing "child card"
    page
      .locator('[id^="card-"]')
      .filter({
        has: page.getByText(cardContent, { exact: false }),
      })
      .filter({
        has: page.getByRole('button', { name: /reaction to child card/i }),
      })
      .first()
      .waitFor({ state: 'visible', timeout }),

    // Pattern 2: Card has "Links to" text (visible, not aria-label) for action-feedback links
    page
      .locator('[id^="card-"]')
      .filter({
        has: page.getByText(cardContent, { exact: false }),
      })
      .filter({
        has: page.getByText('Links to'),
      })
      .first()
      .waitFor({ state: 'visible', timeout }),

    // Pattern 3: Card has "Linked Actions" text for feedback with linked actions
    page
      .locator('[id^="card-"]')
      .filter({
        has: page.getByText(cardContent, { exact: false }),
      })
      .filter({
        has: page.getByText('Linked Actions'),
      })
      .first()
      .waitFor({ state: 'visible', timeout }),
  ]).catch(async () => {
    // Debug: check what patterns are on the page
    log(`TIMEOUT - Card not linked. Checking page state...`);

    // Check if the card even exists
    const cardExists = await page
      .getByText(cardContent, { exact: false })
      .isVisible()
      .catch(() => false);
    log(`Card content visible on page: ${cardExists}`);

    // Check for any nested child structures
    const nestedChildren = await page
      .locator('[id^="card-"]')
      .filter({
        has: page.getByRole('button', { name: /reaction to child card/i }),
      })
      .count();
    log(`Cards with nested children: ${nestedChildren}`);

    // Check for Links to sections
    const linksToSections = await page.locator('text="Links to"').count();
    log(`"Links to" sections found: ${linksToSections}`);

    throw new Error(`Card "${cardContent}" did not become linked within ${timeout}ms`);
  });
  log('Card is now linked');
}

/**
 * Wait for a card to become unlinked (no longer appears as child)
 *
 * Phase 8.8: Fixed selector to match actual DOM structure
 * - Standalone cards have aria-label="Drag card: {content}" on the header
 * - Linked cards have aria-label="Unlink from parent card" on the link icon
 *
 * So we wait for the unlink button to DISAPPEAR (card is no longer linked)
 */
export async function waitForCardUnlinked(
  page: Page,
  cardContent: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;

  // Find the card containing the content
  const card = page.locator('[id^="card-"]').filter({ hasText: cardContent });

  // Wait for the unlink button to disappear (card is no longer a child)
  const unlinkButton = card.locator('[aria-label="Unlink from parent card"]');
  await unlinkButton.waitFor({ state: 'hidden', timeout });

  // Also verify the card has the drag handle (standalone card)
  // Standalone cards have role="button" on the header with aria-label starting with "Drag card:"
  const dragHandle = card.locator('[data-testid="card-header"][role="button"]');
  await dragHandle.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {
    // This is optional - card might be in a closed board or not draggable
    e2eLog(
      'waitForCardUnlinked',
      `Note: Card "${cardContent}" unlinked but drag handle not visible`,
      'DEBUG'
    );
  });
}

/**
 * Click the unlink button for a nested child card
 *
 * Phase 8.8: Updated to match actual DOM structure
 * - Unlink button has aria-label="Unlink from parent card"
 * - Button is in the card header, next to the card content
 *
 * DOM structure:
 * <article id="card-xxx">
 *   <div data-testid="card-header">
 *     <button aria-label="Unlink from parent card">Link2 icon</button>
 *     ...
 *   </div>
 *   <p>card content</p>
 * </article>
 */
export async function clickUnlinkForNestedChild(
  page: Page,
  childContent: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;

  // Find the card containing the child content
  const card = page.locator('[id^="card-"]').filter({ hasText: childContent });

  await card.waitFor({ state: 'visible', timeout });

  // Find the unlink button within this card
  // Uses the correct aria-label from RetroCard.tsx
  const unlinkButton = card.locator('[aria-label="Unlink from parent card"]');

  // Wait for button to be visible
  await unlinkButton.waitFor({ state: 'visible', timeout: 5000 });

  await unlinkButton.click();

  // Wait for the backend to process and UI to update
  await page.waitForTimeout(500);
}

/**
 * Wait for reaction count to update on a card
 *
 * Uses Playwright's locator-based waiting instead of raw querySelector
 * since :has-text() is not valid in native CSS.
 */
export async function waitForReactionCount(
  page: Page,
  cardContent: string,
  expectedCount: number,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;

  // Wait for the card to have a reaction button with the expected count
  // The reaction count is displayed in a span inside the reaction button
  await page.waitForFunction(
    ({ cardText, expected }) => {
      // Find all card elements
      const cards = Array.from(document.querySelectorAll('[id^="card-"]'));
      for (const card of cards) {
        // Check if this card contains our content
        if (!card.textContent?.includes(cardText)) continue;

        // Look for reaction count in the Add reaction button
        const reactionBtn = card.querySelector('[aria-label*="reaction"]');
        if (!reactionBtn) continue;

        // Get the text content of the button (includes the count)
        const btnText = reactionBtn.textContent || '';
        const match = btnText.match(/\d+/);
        if (match) {
          const count = parseInt(match[0], 10);
          if (count >= expected) return true;
        }
      }
      return false;
    },
    { cardText: cardContent, expected: expectedCount },
    { timeout }
  );
}

/**
 * Wait for board closed state to appear
 */
export async function waitForBoardClosed(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;
  const closedIndicator = page
    .getByTestId('board-closed-indicator')
    .or(page.locator('[aria-label*="closed"]'))
    .or(page.locator('.lock-icon'));
  await closedIndicator.waitFor({ state: 'visible', timeout });
}

/**
 * Wait for admin badge to appear on participant
 * The admin badge is a Crown SVG with aria-label="Admin"
 */
export async function waitForAdminBadge(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;
  // The admin badge is a Crown icon with aria-label="Admin"
  await page.waitForSelector('[aria-label="Admin"]', {
    timeout,
    state: 'visible',
  });
}

/**
 * Wait for admin status to be established (WebSocket session confirmation)
 * This waits for either admin controls or admin badge to appear, indicating
 * that the WebSocket session has confirmed admin status.
 */
export async function waitForAdminStatus(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 5000 } = options;

  // First, wait for the "No participants yet" message to disappear
  // This indicates the WebSocket session is registering the user
  await page
    .waitForSelector('text="No participants yet"', {
      state: 'hidden',
      timeout,
    })
    .catch(() => {
      // May already be hidden if participants exist
    });

  // Then wait for any admin indicator to appear:
  // - Admin crown icon (Crown SVG with aria-label="Admin")
  // - Close Board button (text contains "Close Board")
  // - Edit board button (aria-label="Edit board name")
  await page
    .waitForSelector(
      '[aria-label="Admin"], [aria-label="Edit board name"], button:has-text("Close Board")',
      { timeout, state: 'visible' }
    )
    .catch(() => {
      // Silently fail - some tests may proceed without admin indicators visible
    });
}

/**
 * Wait for WebSocket session to be established (user appears as participant)
 * This waits for the "No participants yet" message to disappear, indicating
 * the WebSocket connection has registered the user.
 */
export async function waitForParticipantRegistration(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;

  // Wait for the "No participants yet" message to disappear
  await page
    .waitForSelector('text="No participants yet"', {
      state: 'hidden',
      timeout,
    })
    .catch(() => {
      // May already be hidden if participants exist
    });

  // Wait for "Current user" group to appear with an avatar button
  // This ensures the WebSocket session has registered this user
  // The group has role="group" with aria-label="Current user"
  try {
    await page.getByRole('group', { name: 'Current user' }).locator('button').waitFor({
      state: 'visible',
      timeout: 5000,
    });
  } catch {
    // Fall back to just waiting a bit
    await page.waitForTimeout(500);
  }
}
