/**
 * Card Relationship Utilities
 * Shared functions for validating card relationships (parent-child, action links)
 */

import type { Card } from '../../models/types';

/**
 * Check if linking would create a circular relationship
 * Traverses the parent chain from parentId to see if it eventually reaches childId
 *
 * @param cards - Map of all cards
 * @param parentId - The card that would become the parent
 * @param childId - The card that would become the child
 * @returns true if linking would create a cycle
 */
export function wouldCreateCycle(
  cards: Map<string, Card>,
  parentId: string,
  childId: string
): boolean {
  let current: string | null = parentId;

  while (current) {
    if (current === childId) {
      return true;
    }
    const card = cards.get(current);
    current = card?.parent_card_id ?? null;
  }

  return false;
}

/**
 * Check if a card already has a parent (1-level hierarchy enforcement)
 *
 * @param cards - Map of all cards
 * @param cardId - The card to check
 * @returns true if the card has a parent
 */
export function hasParent(cards: Map<string, Card>, cardId: string): boolean {
  const card = cards.get(cardId);
  return card?.parent_card_id !== null && card?.parent_card_id !== undefined;
}

/**
 * Check if a card is a parent (has children)
 *
 * @param cards - Map of all cards
 * @param cardId - The card to check
 * @returns true if the card has children
 */
export function hasChildren(cards: Map<string, Card>, cardId: string): boolean {
  for (const card of cards.values()) {
    if (card.parent_card_id === cardId) {
      return true;
    }
  }
  return false;
}

/**
 * Get all children of a card
 *
 * @param cards - Map of all cards
 * @param parentId - The parent card ID
 * @returns Array of child cards
 */
export function getChildren(cards: Map<string, Card>, parentId: string): Card[] {
  const children: Card[] = [];
  for (const card of cards.values()) {
    if (card.parent_card_id === parentId) {
      children.push(card);
    }
  }
  return children;
}

/**
 * Validate if two feedback cards can be linked as parent-child
 *
 * @param cards - Map of all cards
 * @param parentId - The proposed parent card ID
 * @param childId - The proposed child card ID
 * @returns Object with valid flag and error message if invalid
 */
export function validateParentChildLink(
  cards: Map<string, Card>,
  parentId: string,
  childId: string
): { valid: boolean; error: string | null } {
  // Self-link check
  if (parentId === childId) {
    return { valid: false, error: 'Cannot link card to itself' };
  }

  const parentCard = cards.get(parentId);
  const childCard = cards.get(childId);

  if (!parentCard || !childCard) {
    return { valid: false, error: 'Card not found' };
  }

  // Both must be feedback type
  if (parentCard.card_type !== 'feedback' || childCard.card_type !== 'feedback') {
    return { valid: false, error: 'Only feedback cards can be linked as parent-child' };
  }

  // Check for circular relationship
  if (wouldCreateCycle(cards, parentId, childId)) {
    return { valid: false, error: 'Cannot create circular relationship' };
  }

  // 1-level hierarchy: child cannot already have a parent
  if (hasParent(cards, childId)) {
    return { valid: false, error: 'Card already has a parent. Only 1-level hierarchy allowed' };
  }

  // Parent cannot be a child of another card
  if (hasParent(cards, parentId)) {
    return { valid: false, error: 'Parent card cannot be a child of another card' };
  }

  return { valid: true, error: null };
}
