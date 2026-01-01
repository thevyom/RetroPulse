/**
 * E2E Test Helpers
 *
 * Utility functions for common E2E test operations.
 * These helpers interact with the real frontend and backend.
 */

import type { Page, BrowserContext } from '@playwright/test';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { TestBoardIds } from './global-setup';

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
  await page.goto(`/board/${boardId}`);

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
  const { timeout = 30000 } = options;

  // Wait for page to be stable first
  await page.waitForLoadState('domcontentloaded');

  // Try multiple selectors for board content
  await Promise.race([
    page.waitForSelector('[data-testid^="column-"]', { timeout }),
    page.waitForSelector('[data-testid="retro-column"]', { timeout }),
    page.waitForSelector('.retro-column', { timeout }),
    page.waitForSelector('[data-testid="board-container"]', { timeout }),
  ]).catch(async () => {
    // Fallback: wait for network idle
    await page.waitForLoadState('networkidle', { timeout });
  });

  // Additional small delay for React hydration
  await page.waitForTimeout(500);
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

  // Click add card button for the column - try multiple selectors
  const addButton = page
    .getByTestId(`add-card-${columnSelector}`)
    .or(page.locator(`[data-column-id="${columnSelector}"] button[aria-label*="add"]`))
    .or(page.locator(`[data-testid="column-${columnSelector}"] button`).filter({ hasText: '+' }))
    .or(page.locator(`[data-testid="retro-column-${columnSelector}"] button`).first());

  // Wait for add button to be clickable
  await addButton.first().waitFor({ state: 'visible', timeout: 10000 });
  await addButton.first().click();

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

  // Wait for card to appear with better selector
  await page.waitForFunction(
    (text) => {
      const cards = document.querySelectorAll('[data-testid^="card-"], [data-testid="retro-card"]');
      return Array.from(cards).some((card) => card.textContent?.includes(text));
    },
    content,
    { timeout }
  );

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

  // Try multiple selectors
  const card = page
    .locator('[data-testid^="card-"]')
    .filter({ hasText: content })
    .or(page.locator('[data-testid="retro-card"]').filter({ hasText: content }))
    .or(page.locator('.retro-card').filter({ hasText: content }));

  // Wait for at least one match
  await card.first().waitFor({ state: 'visible', timeout }).catch(() => {});

  return card.first();
}

/**
 * Delete a card
 */
export async function deleteCard(page: Page, content: string): Promise<void> {
  const card = await findCardByContent(page, content);

  // Hover to show delete button
  await card.hover();

  // Click delete button
  const deleteButton = card
    .getByTestId('delete-card')
    .or(card.locator('button[aria-label*="delete"]'));
  await deleteButton.click();

  // Confirm deletion if dialog appears
  const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
  if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmButton.click();
  }

  // Wait for card to disappear
  await page.waitForSelector(`text="${content}"`, { state: 'hidden', timeout: 5000 });
}

/**
 * Add reaction to a card
 */
export async function addReaction(page: Page, content: string): Promise<void> {
  const card = await findCardByContent(page, content);

  const reactionButton = card
    .getByTestId('reaction-button')
    .or(card.locator('button[aria-label*="react"]'))
    .or(card.locator('button').filter({ hasText: /👍|like|react/i }));
  await reactionButton.click();
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

  // Perform drag with force for reliability
  await sourceCard.dragTo(targetCard, { force: true });

  // Wait for UI to settle after drag
  await page.waitForTimeout(500);
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

  // Perform drag
  await card.dragTo(column.first(), { force: true });

  // Wait for UI to settle after drag
  await page.waitForTimeout(500);
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
 */
export async function waitForAdminBadge(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;
  await page.waitForSelector('[data-testid^="participant-avatar"][data-is-admin="true"]', {
    timeout,
  });
}
