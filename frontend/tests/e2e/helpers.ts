/**
 * E2E Test Helpers
 *
 * Utility functions for common E2E test operations.
 * These helpers interact with the real frontend and backend.
 */

import type { Page, BrowserContext, Locator } from '@playwright/test';
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
export function getBoardId(type: 'default' | 'quota' | 'lifecycle' | 'a11y' | 'anon'): string {
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
 * Wait for board to be fully loaded
 */
export async function waitForBoardLoad(page: Page, options: { timeout?: number } = {}): Promise<void> {
  const { timeout = 10000 } = options;

  // Wait for page to be stable first
  await page.waitForLoadState('domcontentloaded');

  // Wait for any column header to appear (indicates board is loaded)
  await page
    .getByRole('heading', { name: /What Went Well|To Improve|Action Items/i })
    .first()
    .waitFor({ state: 'visible', timeout });
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
  options: { cardType?: 'feedback' | 'action'; isAnonymous?: boolean; timeout?: number } = {}
): Promise<TestCard> {
  const { cardType = 'feedback', isAnonymous = false, timeout = 15000 } = options;

  // Click add card button for the column - find by column heading then sibling button
  // columnSelector can be a column ID like "col-1" or a column name like "What Went Well"
  const columnNameMap: Record<string, string> = {
    'col-1': 'What Went Well',
    'col-2': 'To Improve',
    'col-3': 'Action Items',
    'went_well': 'What Went Well',
    'to_improve': 'To Improve',
    'action_item': 'Action Items',
  };
  const columnName = columnNameMap[columnSelector] || columnSelector;

  // Find the column by heading and click its Add card button
  const columnHeading = page.getByRole('heading', { name: columnName, exact: true });
  const addButton = columnHeading.locator('..').getByRole('button', { name: 'Add card' });

  // Wait for add button to be clickable
  await addButton.waitFor({ state: 'visible', timeout: 10000 });
  await addButton.click();

  // Wait for dialog to open with longer timeout
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

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
 * Find a card by content
 */
export async function findCardByContent(page: Page, content: string, options: { timeout?: number } = {}) {
  const { timeout = 10000 } = options;

  // Find the card by looking for elements containing the text
  const card = page.getByText(content, { exact: false }).first();

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
 */
export async function addReaction(page: Page, content: string): Promise<void> {
  // Find the "Add reaction" button near the card content
  // The card structure has the reaction button as a child of the card button container
  const reactionButton = page.getByRole('button', { name: 'Add reaction' }).filter({
    has: page.locator('..').getByText(content, { exact: false }),
  });

  // If the above doesn't work, find the card text and go to parent to find the button
  if (!(await reactionButton.count())) {
    const cardText = page.getByText(content, { exact: false }).first();
    const cardContainer = cardText.locator('..');
    await cardContainer.getByRole('button', { name: 'Add reaction' }).click();
  } else {
    await reactionButton.first().click();
  }
}

/**
 * Get reaction count for a card
 */
export async function getReactionCount(page: Page, content: string): Promise<number> {
  const card = await findCardByContent(page, content);

  const countElement = card
    .getByTestId('reaction-count')
    .or(card.locator('[aria-label*="reaction"] + span'))
    .or(card.locator('.reaction-count'));

  const countText = await countElement.textContent();
  return parseInt(countText || '0', 10);
}

// ============================================================================
// Drag and Drop Operations
// ============================================================================

/**
 * Perform drag-and-drop using keyboard events for @dnd-kit compatibility.
 *
 * This is the PRIMARY drag method for E2E tests. @dnd-kit's KeyboardSensor
 * is more reliable in Playwright than PointerSensor because keyboard events
 * are handled consistently across browsers.
 *
 * Keyboard drag sequence:
 * 1. Focus the draggable element
 * 2. Press Space to pick up
 * 3. Press Arrow keys to move (or Tab to move between drop zones)
 * 4. Press Space to drop
 *
 * For card-to-card linking, we use Tab to navigate between cards.
 */
export async function dndKitDragKeyboard(
  page: Page,
  sourceLocator: Locator,
  targetLocator: Locator
): Promise<void> {
  // Focus the source element (the draggable card)
  await sourceLocator.focus();
  await page.waitForTimeout(100);

  // Press Space to pick up the item
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);

  // Get positions to determine direction
  const sourceBox = await sourceLocator.boundingBox();
  const targetBox = await targetLocator.boundingBox();

  if (sourceBox && targetBox) {
    // Calculate relative position and press arrow keys to move
    const dx = targetBox.x - sourceBox.x;
    const dy = targetBox.y - sourceBox.y;

    // Move horizontally first (columns are side by side)
    const horizontalMoves = Math.round(Math.abs(dx) / 100);
    const horizontalKey = dx > 0 ? 'ArrowRight' : 'ArrowLeft';
    for (let i = 0; i < horizontalMoves; i++) {
      await page.keyboard.press(horizontalKey);
      await page.waitForTimeout(50);
    }

    // Then move vertically (cards are stacked)
    const verticalMoves = Math.round(Math.abs(dy) / 80);
    const verticalKey = dy > 0 ? 'ArrowDown' : 'ArrowUp';
    for (let i = 0; i < verticalMoves; i++) {
      await page.keyboard.press(verticalKey);
      await page.waitForTimeout(50);
    }
  }

  // Press Space to drop
  await page.keyboard.press('Space');
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
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 15000 } = options;

  const sourceCard = await findCardByContent(page, sourceContent, { timeout });
  const targetCard = await findCardByContent(page, targetContent, { timeout });

  // Ensure both cards are visible
  await sourceCard.waitFor({ state: 'visible', timeout: 5000 });
  await targetCard.waitFor({ state: 'visible', timeout: 5000 });

  // Use keyboard-based drag for @dnd-kit compatibility
  await dndKitDragKeyboard(page, sourceCard, targetCard);

  // Additional wait for UI to settle after drag
  await page.waitForTimeout(300);
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
 */
export async function isBoardClosed(page: Page): Promise<boolean> {
  const closedIndicator = page
    .getByTestId('board-closed-indicator')
    .or(page.locator('[aria-label*="closed"]'))
    .or(page.locator('.lock-icon'));

  return closedIndicator.isVisible().catch(() => false);
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
 * Check if card has link icon (is a child)
 */
export async function isCardLinked(page: Page, cardContent: string): Promise<boolean> {
  const card = await findCardByContent(page, cardContent);
  const linkIcon = card.getByTestId('link-icon').or(card.locator('[aria-label*="linked"]'));
  return linkIcon.isVisible().catch(() => false);
}

/**
 * Wait for a card to become linked (has link icon)
 */
export async function waitForCardLinked(
  page: Page,
  cardContent: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;
  const card = await findCardByContent(page, cardContent);
  const linkIcon = card.getByTestId('link-icon').or(card.locator('[aria-label*="linked"]'));
  await linkIcon.waitFor({ state: 'visible', timeout });
}

/**
 * Wait for a card to become unlinked (link icon disappears)
 */
export async function waitForCardUnlinked(
  page: Page,
  cardContent: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;
  const card = await findCardByContent(page, cardContent);
  const linkIcon = card.getByTestId('link-icon').or(card.locator('[aria-label*="linked"]'));
  await linkIcon.waitFor({ state: 'hidden', timeout });
}

/**
 * Wait for reaction count to update
 */
export async function waitForReactionCount(
  page: Page,
  cardContent: string,
  expectedCount: number,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;
  // Note: We don't use the locator directly, but wait for DOM changes via waitForFunction
  await findCardByContent(page, cardContent);

  await page.waitForFunction(
    async ({ content, expected }) => {
      const cardEl = document.querySelector(`[data-testid^="card-"]:has-text("${content}")`);
      if (!cardEl) return false;
      const countEl =
        cardEl.querySelector('[data-testid="reaction-count"]') ||
        cardEl.querySelector('.reaction-count');
      if (!countEl) return false;
      return parseInt(countEl.textContent || '0', 10) >= expected;
    },
    { content: cardContent, expected: expectedCount },
    { timeout }
  );
}

/**
 * Wait for participant count to reach expected value
 */
export async function waitForParticipantCount(
  page: Page,
  expectedCount: number,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;
  await page.waitForFunction(
    (expected) => {
      const avatars = document.querySelectorAll('[data-testid^="participant-avatar"]');
      return avatars.length >= expected;
    },
    expectedCount,
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
  await page.waitForSelector('text="No participants yet"', {
    state: 'hidden',
    timeout,
  }).catch(() => {
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
  await page.waitForSelector('text="No participants yet"', {
    state: 'hidden',
    timeout,
  }).catch(() => {
    // May already be hidden if participants exist
  });

  // Also wait a bit for the participant avatar to render
  await page.waitForTimeout(500);
}
