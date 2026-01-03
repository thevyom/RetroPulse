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
 * Find a card container by content
 * Returns the card container element (id="card-{id}"), not just the text element.
 * This is important for finding child elements like the drag handle.
 */
export async function findCardByContent(page: Page, content: string, options: { timeout?: number } = {}) {
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
 * Check if card is linked (is a child of another card or has feedback links)
 *
 * There are two linking patterns:
 * 1. Parent-child (feedback cards): Child appears nested inside parent with "Add reaction to child card"
 * 2. Action-feedback links: Action card has "Links to" section showing linked feedback
 */
export async function isCardLinked(page: Page, cardContent: string): Promise<boolean> {
  // Pattern 1: Card appears as nested child inside another card
  // Look for a parent card containing both the content and a child reaction button
  const parentWithChild = page.locator('[id^="card-"]').filter({
    has: page.getByText(cardContent, { exact: false }),
  }).filter({
    has: page.getByRole('button', { name: /reaction to child card/i }),
  });
  const isNestedChild = await parentWithChild.first().isVisible().catch(() => false);
  if (isNestedChild) return true;

  // Pattern 2: Action card has "Links to" section (action linked to feedback)
  const cardWithLinksTo = page.locator('[id^="card-"]').filter({
    has: page.getByText(cardContent, { exact: false }),
  }).filter({
    has: page.getByText('Links to'),
  });
  const hasLinksTo = await cardWithLinksTo.first().isVisible().catch(() => false);
  if (hasLinksTo) return true;

  // Pattern 3: Card has "Linked Actions" section (feedback with linked action cards)
  const cardWithLinkedActions = page.locator('[id^="card-"]').filter({
    has: page.getByText(cardContent, { exact: false }),
  }).filter({
    has: page.getByText('Linked Actions'),
  });
  const hasLinkedActions = await cardWithLinkedActions.first().isVisible().catch(() => false);
  if (hasLinkedActions) return true;

  return false;
}

/**
 * Wait for a card to become linked (appears as child of another card or has links)
 */
export async function waitForCardLinked(
  page: Page,
  cardContent: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;

  // Wait for any of the linking patterns to appear
  await Promise.race([
    // Pattern 1: Card appears as nested child - look for the child reaction button
    // The parent card will have both the child content and a button with aria-label containing "child card"
    page.locator('[id^="card-"]').filter({
      has: page.getByText(cardContent, { exact: false }),
    }).filter({
      has: page.getByRole('button', { name: /reaction to child card/i }),
    }).first().waitFor({ state: 'visible', timeout }),

    // Pattern 2: Card has "Links to" text (visible, not aria-label) for action-feedback links
    page.locator('[id^="card-"]').filter({
      has: page.getByText(cardContent, { exact: false }),
    }).filter({
      has: page.getByText('Links to'),
    }).first().waitFor({ state: 'visible', timeout }),

    // Pattern 3: Card has "Linked Actions" text for feedback with linked actions
    page.locator('[id^="card-"]').filter({
      has: page.getByText(cardContent, { exact: false }),
    }).filter({
      has: page.getByText('Linked Actions'),
    }).first().waitFor({ state: 'visible', timeout }),
  ]).catch(() => {
    throw new Error(`Card "${cardContent}" did not become linked within ${timeout}ms`);
  });
}

/**
 * Wait for a card to become unlinked (no longer appears as child)
 */
export async function waitForCardUnlinked(
  page: Page,
  cardContent: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;

  // Wait for the card to appear as a standalone card (its own [id^="card-"] element with drag handle)
  const standaloneCard = page.locator('[id^="card-"]').filter({
    has: page.getByText(cardContent, { exact: false }),
  }).locator('[data-testid="card-header"]').locator('[aria-label="Drag handle icon"]');

  await standaloneCard.first().waitFor({ state: 'visible', timeout });
}

/**
 * Click the unlink button for a nested child card
 *
 * When a card is nested inside a parent, we need to find the specific
 * unlink button that is sibling to the child's content text.
 *
 * DOM structure:
 * <div class="rounded-md border-l-2..."> <!-- child container -->
 *   <div class="flex items-center gap-1"> <!-- flex row with buttons -->
 *     <button aria-label="Unlink child card">...</button>
 *     ...reaction button...
 *   </div>
 *   <p>child content</p>
 * </div>
 */
export async function clickUnlinkForNestedChild(
  page: Page,
  childContent: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;

  // Find the child container that has both the unlink button and the child content
  // The container is a div with class containing "rounded-md" that has the child content
  const childContainer = page.locator('div.rounded-md').filter({
    has: page.getByText(childContent, { exact: false }),
  }).first();

  await childContainer.waitFor({ state: 'visible', timeout });

  // Find the unlink button within this container
  const unlinkButton = childContainer.getByRole('button', { name: 'Unlink child card' });

  // Wait for button to be visible (should be visible for non-closed boards)
  await unlinkButton.waitFor({ state: 'visible', timeout: 5000 });

  await unlinkButton.click();

  // Wait a bit for the backend to process
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

  // Find the card container that has the content
  const card = page.locator('[id^="card-"]').filter({
    has: page.getByText(cardContent, { exact: false }),
  }).first();

  // Wait for the card to have a reaction button with the expected count
  // The reaction count is displayed in a span inside the reaction button
  await page.waitForFunction(
    ({ cardText, expected }) => {
      // Find all card elements
      const cards = document.querySelectorAll('[id^="card-"]');
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
