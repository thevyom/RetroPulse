/**
 * Card Relationship Utilities Tests
 * Comprehensive unit tests for card relationship validation functions
 */

import { describe, it, expect } from 'vitest';
import {
  wouldCreateCycle,
  hasParent,
  hasChildren,
  getChildren,
  validateParentChildLink,
} from '../../../../src/shared/utils/cardRelationships';
import type { Card } from '../../../../src/models/types';

// ============================================================================
// Test Data
// ============================================================================

const createMockCard = (overrides: Partial<Card>): Card => ({
  id: 'default-id',
  board_id: 'board-123',
  column_id: 'col-1',
  content: 'Test content',
  card_type: 'feedback',
  is_anonymous: false,
  created_by_hash: 'hash-user-1',
  created_by_alias: 'User1',
  created_at: '2025-12-28T10:00:00Z',
  direct_reaction_count: 0,
  aggregated_reaction_count: 0,
  parent_card_id: null,
  linked_feedback_ids: [],
  ...overrides,
});

const createTestCardsMap = (): Map<string, Card> => {
  return new Map<string, Card>([
    ['parent-1', createMockCard({ id: 'parent-1', parent_card_id: null })],
    ['parent-2', createMockCard({ id: 'parent-2', parent_card_id: null })],
    ['child-1', createMockCard({ id: 'child-1', parent_card_id: 'parent-1' })],
    ['child-2', createMockCard({ id: 'child-2', parent_card_id: 'parent-1' })],
    ['orphan-1', createMockCard({ id: 'orphan-1', parent_card_id: null })],
    ['action-1', createMockCard({ id: 'action-1', parent_card_id: null, card_type: 'action' })],
    ['action-2', createMockCard({ id: 'action-2', parent_card_id: null, card_type: 'action' })],
  ]);
};

// ============================================================================
// Test Suite
// ============================================================================

describe('cardRelationships', () => {
  // ============================================================================
  // wouldCreateCycle Tests
  // ============================================================================

  describe('wouldCreateCycle', () => {
    it('should return false for valid parent-child relationship', () => {
      const cards = createTestCardsMap();
      expect(wouldCreateCycle(cards, 'parent-1', 'orphan-1')).toBe(false);
    });

    it('should return true when child would become ancestor of parent', () => {
      const cards = createTestCardsMap();
      // child-1 has parent-1 as parent
      // If we try to make parent-1 a child of child-1, it creates a cycle
      expect(wouldCreateCycle(cards, 'child-1', 'parent-1')).toBe(true);
    });

    it('should return false for unrelated cards', () => {
      const cards = createTestCardsMap();
      expect(wouldCreateCycle(cards, 'parent-1', 'parent-2')).toBe(false);
    });

    it('should return false when checking orphan cards', () => {
      const cards = createTestCardsMap();
      expect(wouldCreateCycle(cards, 'orphan-1', 'parent-1')).toBe(false);
    });

    it('should handle non-existent parent card gracefully', () => {
      const cards = createTestCardsMap();
      expect(wouldCreateCycle(cards, 'non-existent', 'parent-1')).toBe(false);
    });

    it('should detect cycle in deeper hierarchy', () => {
      // Create a chain: grandparent -> parent -> child
      const cards = new Map<string, Card>([
        ['grandparent', createMockCard({ id: 'grandparent', parent_card_id: null })],
        ['parent', createMockCard({ id: 'parent', parent_card_id: 'grandparent' })],
        ['child', createMockCard({ id: 'child', parent_card_id: 'parent' })],
      ]);

      // Trying to make grandparent a child of child would create a cycle
      expect(wouldCreateCycle(cards, 'child', 'grandparent')).toBe(true);
    });
  });

  // ============================================================================
  // hasParent Tests
  // ============================================================================

  describe('hasParent', () => {
    it('should return true for card with parent', () => {
      const cards = createTestCardsMap();
      expect(hasParent(cards, 'child-1')).toBe(true);
    });

    it('should return false for card without parent', () => {
      const cards = createTestCardsMap();
      expect(hasParent(cards, 'parent-1')).toBe(false);
    });

    it('should return false for orphan card', () => {
      const cards = createTestCardsMap();
      expect(hasParent(cards, 'orphan-1')).toBe(false);
    });

    it('should return false for non-existent card', () => {
      const cards = createTestCardsMap();
      expect(hasParent(cards, 'non-existent')).toBe(false);
    });

    it('should return false for action cards without parent', () => {
      const cards = createTestCardsMap();
      expect(hasParent(cards, 'action-1')).toBe(false);
    });
  });

  // ============================================================================
  // hasChildren Tests
  // ============================================================================

  describe('hasChildren', () => {
    it('should return true for parent with children', () => {
      const cards = createTestCardsMap();
      expect(hasChildren(cards, 'parent-1')).toBe(true);
    });

    it('should return false for card without children', () => {
      const cards = createTestCardsMap();
      expect(hasChildren(cards, 'orphan-1')).toBe(false);
    });

    it('should return false for child card', () => {
      const cards = createTestCardsMap();
      expect(hasChildren(cards, 'child-1')).toBe(false);
    });

    it('should return false for non-existent card', () => {
      const cards = createTestCardsMap();
      expect(hasChildren(cards, 'non-existent')).toBe(false);
    });

    it('should return false for action cards', () => {
      const cards = createTestCardsMap();
      expect(hasChildren(cards, 'action-1')).toBe(false);
    });

    it('should return true for parent with multiple children', () => {
      const cards = createTestCardsMap();
      // parent-1 has child-1 and child-2
      expect(hasChildren(cards, 'parent-1')).toBe(true);
    });
  });

  // ============================================================================
  // getChildren Tests
  // ============================================================================

  describe('getChildren', () => {
    it('should return all children of parent', () => {
      const cards = createTestCardsMap();
      const children = getChildren(cards, 'parent-1');

      expect(children).toHaveLength(2);
      expect(children.map((c) => c.id)).toContain('child-1');
      expect(children.map((c) => c.id)).toContain('child-2');
    });

    it('should return empty array for card without children', () => {
      const cards = createTestCardsMap();
      expect(getChildren(cards, 'orphan-1')).toEqual([]);
    });

    it('should return empty array for child card', () => {
      const cards = createTestCardsMap();
      expect(getChildren(cards, 'child-1')).toEqual([]);
    });

    it('should return empty array for non-existent card', () => {
      const cards = createTestCardsMap();
      expect(getChildren(cards, 'non-existent')).toEqual([]);
    });

    it('should return empty array for action cards', () => {
      const cards = createTestCardsMap();
      expect(getChildren(cards, 'action-1')).toEqual([]);
    });
  });

  // ============================================================================
  // validateParentChildLink Tests
  // ============================================================================

  describe('validateParentChildLink', () => {
    it('should reject self-link', () => {
      const cards = createTestCardsMap();
      const result = validateParentChildLink(cards, 'parent-1', 'parent-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot link card to itself');
    });

    it('should reject non-existent parent card', () => {
      const cards = createTestCardsMap();
      const result = validateParentChildLink(cards, 'non-existent', 'parent-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Card not found');
    });

    it('should reject non-existent child card', () => {
      const cards = createTestCardsMap();
      const result = validateParentChildLink(cards, 'parent-1', 'non-existent');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Card not found');
    });

    it('should reject when parent is action card', () => {
      const cards = createTestCardsMap();
      const result = validateParentChildLink(cards, 'action-1', 'orphan-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Only feedback cards can be linked as parent-child');
    });

    it('should reject when child is action card', () => {
      const cards = createTestCardsMap();
      const result = validateParentChildLink(cards, 'parent-1', 'action-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Only feedback cards can be linked as parent-child');
    });

    it('should reject circular relationship', () => {
      const cards = createTestCardsMap();
      // child-1 has parent-1 as parent, trying to make parent-1 child of child-1
      const result = validateParentChildLink(cards, 'child-1', 'parent-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot create circular relationship');
    });

    it('should reject card that already has parent', () => {
      const cards = createTestCardsMap();
      // child-1 already has parent-1 as parent
      const result = validateParentChildLink(cards, 'parent-2', 'child-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Card already has a parent. Only 1-level hierarchy allowed');
    });

    it('should reject when parent is already a child', () => {
      const cards = createTestCardsMap();
      // child-1 is a child of parent-1, trying to make it a parent of orphan-1
      const result = validateParentChildLink(cards, 'child-1', 'orphan-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Parent card cannot be a child of another card');
    });

    it('should accept valid parent-child link', () => {
      const cards = createTestCardsMap();
      const result = validateParentChildLink(cards, 'parent-2', 'orphan-1');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should accept parent with existing children adding new child', () => {
      const cards = createTestCardsMap();
      const result = validateParentChildLink(cards, 'parent-1', 'orphan-1');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject both action cards', () => {
      const cards = createTestCardsMap();
      const result = validateParentChildLink(cards, 'action-1', 'action-2');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Only feedback cards can be linked as parent-child');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty cards map', () => {
      const emptyCards = new Map<string, Card>();

      expect(wouldCreateCycle(emptyCards, 'any', 'card')).toBe(false);
      expect(hasParent(emptyCards, 'any')).toBe(false);
      expect(hasChildren(emptyCards, 'any')).toBe(false);
      expect(getChildren(emptyCards, 'any')).toEqual([]);
    });

    it('should handle card with null parent_card_id explicitly', () => {
      const cards = new Map<string, Card>([
        ['card-1', createMockCard({ id: 'card-1', parent_card_id: null })],
      ]);

      expect(hasParent(cards, 'card-1')).toBe(false);
    });

    it('should handle card with undefined parent_card_id', () => {
      const cards = new Map<string, Card>([
        ['card-1', createMockCard({ id: 'card-1', parent_card_id: undefined as unknown as null })],
      ]);

      expect(hasParent(cards, 'card-1')).toBe(false);
    });
  });
});
