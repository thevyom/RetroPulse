/**
 * E2E Test Helpers
 *
 * Utility functions for common E2E test operations.
 * These helpers interact with the real frontend and backend.
 */

import type { Page, BrowserContext } from '@playwright/test';

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
export async function waitForBoardLoad(page: Page): Promise<void> {
  // Wait for columns to appear
  await page.waitForSelector('[data-testid^="column-"]', { timeout: 15000 }).catch(() => {
    // Alternative: wait for any content
    return page.waitForLoadState('networkidle');
  });
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
  options: { cardType?: 'feedback' | 'action'; isAnonymous?: boolean } = {}
): Promise<TestCard> {
  const { cardType = 'feedback', isAnonymous = false } = options;

  // Click add card button for the column
  const addButton = page
    .getByTestId(`add-card-${columnSelector}`)
    .or(page.locator(`[data-column-id="${columnSelector}"] button[aria-label*="add"]`))
    .or(page.locator(`[data-testid="column-${columnSelector}"] button`).filter({ hasText: '+' }));

  await addButton.first().click();

  // Wait for dialog to open
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

  // Fill content
  const contentInput = page
    .getByTestId('card-content-input')
    .or(page.locator('[role="dialog"] textarea'))
    .or(page.locator('[role="dialog"] input[type="text"]'));
  await contentInput.fill(content);

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
      .or(page.locator('input[type="checkbox"]'));
    await anonCheckbox.check();
  }

  // Submit
  const submitButton = page
    .getByTestId('create-card-submit')
    .or(page.locator('[role="dialog"] button[type="submit"]'))
    .or(page.getByRole('button', { name: /create|add|submit/i }));
  await submitButton.click();

  // Wait for card to appear
  await page.waitForSelector(`text="${content}"`, { timeout: 10000 });

  return {
    id: '', // We'd need to extract this from the DOM
    content,
    columnId: columnSelector,
  };
}

/**
 * Find a card by content
 */
export async function findCardByContent(page: Page, content: string) {
  return page.locator(`[data-testid^="card-"]`).filter({ hasText: content });
}

/**
 * Delete a card
 */
export async function deleteCard(page: Page, content: string): Promise<void> {
  const card = await findCardByContent(page, content);

  // Hover to show delete button
  await card.hover();

  // Click delete button
  const deleteButton = card.getByTestId('delete-card').or(card.locator('button[aria-label*="delete"]'));
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
  targetContent: string
): Promise<void> {
  const sourceCard = await findCardByContent(page, sourceContent);
  const targetCard = await findCardByContent(page, targetContent);

  await sourceCard.dragTo(targetCard);
}

/**
 * Drag a card to a column
 */
export async function dragCardToColumn(
  page: Page,
  cardContent: string,
  columnId: string
): Promise<void> {
  const card = await findCardByContent(page, cardContent);
  const column = page.getByTestId(`column-${columnId}`).or(page.locator(`[data-column-id="${columnId}"]`));

  await card.dragTo(column);
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
  const { timeout = 10000 } = options;
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
  const confirmButton = page.getByTestId('confirm-close').or(page.getByRole('button', { name: /confirm/i }));
  await confirmButton.click();

  // Wait for closed state
  await page.waitForSelector('[data-testid="board-closed-indicator"]', { timeout: 5000 }).catch(() => {
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
  const column = page.getByTestId(`column-${columnId}`).or(page.locator(`[data-column-id="${columnId}"]`));
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
