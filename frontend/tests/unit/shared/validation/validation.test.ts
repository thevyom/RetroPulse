import { describe, it, expect } from 'vitest';
import {
  validateAlias,
  validateCardContent,
  validateBoardName,
  validateColumnName,
  countWords,
  ALIAS_PATTERN,
  MIN_ALIAS_LENGTH,
  MAX_ALIAS_LENGTH,
  MIN_CARD_CONTENT_LENGTH,
  MAX_CARD_CONTENT_WORDS,
  MIN_BOARD_NAME_LENGTH,
  MAX_BOARD_NAME_LENGTH,
  MIN_COLUMN_NAME_LENGTH,
  MAX_COLUMN_NAME_LENGTH,
} from '@/shared/validation';

// ============================================================================
// Constants Tests
// ============================================================================

describe('Validation Constants', () => {
  it('exports correct alias constraints', () => {
    expect(MIN_ALIAS_LENGTH).toBe(1);
    expect(MAX_ALIAS_LENGTH).toBe(30);
    expect(ALIAS_PATTERN).toBeInstanceOf(RegExp);
  });

  it('exports correct card content constraints', () => {
    expect(MIN_CARD_CONTENT_LENGTH).toBe(1);
    expect(MAX_CARD_CONTENT_WORDS).toBe(150);
  });

  it('exports correct board name constraints', () => {
    expect(MIN_BOARD_NAME_LENGTH).toBe(1);
    expect(MAX_BOARD_NAME_LENGTH).toBe(75);
  });

  it('exports correct column name constraints', () => {
    expect(MIN_COLUMN_NAME_LENGTH).toBe(1);
    expect(MAX_COLUMN_NAME_LENGTH).toBe(30);
  });
});

// ============================================================================
// countWords Tests
// ============================================================================

describe('countWords', () => {
  it('counts single word correctly', () => {
    expect(countWords('hello')).toBe(1);
  });

  it('counts multiple words correctly', () => {
    expect(countWords('hello world test')).toBe(3);
  });

  it('handles multiple spaces between words', () => {
    expect(countWords('hello   world')).toBe(2);
  });

  it('handles leading and trailing spaces', () => {
    expect(countWords('  hello world  ')).toBe(2);
  });

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for whitespace-only string', () => {
    expect(countWords('   ')).toBe(0);
  });

  it('handles newlines as word separators', () => {
    expect(countWords('hello\nworld')).toBe(2);
  });

  it('handles tabs as word separators', () => {
    expect(countWords('hello\tworld')).toBe(2);
  });
});

// ============================================================================
// validateAlias Tests
// ============================================================================

describe('validateAlias', () => {
  describe('valid inputs', () => {
    it('accepts a simple alphanumeric alias', () => {
      const result = validateAlias('SneakyPanda42');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts alias with spaces', () => {
      const result = validateAlias('John Doe');
      expect(result.isValid).toBe(true);
    });

    it('accepts alias with hyphens', () => {
      const result = validateAlias('user-name');
      expect(result.isValid).toBe(true);
    });

    it('accepts alias with underscores', () => {
      const result = validateAlias('user_name');
      expect(result.isValid).toBe(true);
    });

    it('accepts alias with mixed valid characters', () => {
      const result = validateAlias('User_Name-123');
      expect(result.isValid).toBe(true);
    });

    it('accepts alias at minimum length', () => {
      const result = validateAlias('A');
      expect(result.isValid).toBe(true);
    });

    it('accepts alias at maximum length (30 chars)', () => {
      const result = validateAlias('A'.repeat(30));
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects empty string', () => {
      const result = validateAlias('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Alias is required');
    });

    it('rejects whitespace-only string', () => {
      const result = validateAlias('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Alias is required');
    });

    it('rejects null value', () => {
      const result = validateAlias(null as unknown as string);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Alias is required');
    });

    it('rejects undefined value', () => {
      const result = validateAlias(undefined as unknown as string);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Alias is required');
    });

    it('rejects alias exceeding max length (31 chars)', () => {
      const result = validateAlias('A'.repeat(31));
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Alias must be 30 characters or less');
    });

    it('rejects alias with special characters', () => {
      const result = validateAlias('user@name');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Only letters, numbers, spaces, hyphens, and underscores allowed');
    });

    it('rejects alias with emoji', () => {
      const result = validateAlias('user🎉');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Only letters, numbers, spaces, hyphens, and underscores allowed');
    });

    it('rejects alias with dot', () => {
      const result = validateAlias('user.name');
      expect(result.isValid).toBe(false);
    });

    it('rejects alias with exclamation mark', () => {
      const result = validateAlias('Hello!');
      expect(result.isValid).toBe(false);
    });
  });

  describe('whitespace handling', () => {
    it('trims leading whitespace before validation', () => {
      const result = validateAlias('  ValidName');
      expect(result.isValid).toBe(true);
    });

    it('trims trailing whitespace before validation', () => {
      const result = validateAlias('ValidName  ');
      expect(result.isValid).toBe(true);
    });

    it('trims both leading and trailing whitespace', () => {
      const result = validateAlias('  ValidName  ');
      expect(result.isValid).toBe(true);
    });
  });
});

// ============================================================================
// validateCardContent Tests
// ============================================================================

describe('validateCardContent', () => {
  describe('valid inputs', () => {
    it('accepts simple text content', () => {
      const result = validateCardContent('This is a valid card');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts content with special characters', () => {
      const result = validateCardContent('Content with @#$%^&*()!');
      expect(result.isValid).toBe(true);
    });

    it('accepts content with emojis', () => {
      const result = validateCardContent('Great work! 🎉');
      expect(result.isValid).toBe(true);
    });

    it('accepts content with newlines', () => {
      const result = validateCardContent('Line 1\nLine 2\nLine 3');
      expect(result.isValid).toBe(true);
    });

    it('accepts content at minimum length (1 word)', () => {
      const result = validateCardContent('A');
      expect(result.isValid).toBe(true);
    });

    it('accepts content at maximum word count (150 words)', () => {
      const words = Array(150).fill('word').join(' ');
      const result = validateCardContent(words);
      expect(result.isValid).toBe(true);
    });

    it('accepts long single word', () => {
      const result = validateCardContent('A'.repeat(1000));
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects empty string', () => {
      const result = validateCardContent('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Card content is required');
    });

    it('rejects whitespace-only string', () => {
      const result = validateCardContent('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Card content is required');
    });

    it('rejects null value', () => {
      const result = validateCardContent(null as unknown as string);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Card content is required');
    });

    it('rejects undefined value', () => {
      const result = validateCardContent(undefined as unknown as string);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Card content is required');
    });

    it('rejects content exceeding max word count (151 words)', () => {
      const words = Array(151).fill('word').join(' ');
      const result = validateCardContent(words);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Content must be 150 words or less');
    });
  });

  describe('whitespace handling', () => {
    it('trims leading whitespace for empty check', () => {
      const result = validateCardContent('  Valid content');
      expect(result.isValid).toBe(true);
    });

    it('handles content with multiple spaces between words', () => {
      const result = validateCardContent('word1   word2   word3');
      expect(result.isValid).toBe(true);
    });
  });
});

// ============================================================================
// validateBoardName Tests
// ============================================================================

describe('validateBoardName', () => {
  describe('valid inputs', () => {
    it('accepts a simple board name', () => {
      const result = validateBoardName('Sprint 42 Retrospective');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts board name with special characters', () => {
      const result = validateBoardName('Q4 2024 - Team Alpha Retro!');
      expect(result.isValid).toBe(true);
    });

    it('accepts board name at minimum length', () => {
      const result = validateBoardName('R');
      expect(result.isValid).toBe(true);
    });

    it('accepts board name at maximum length (75 chars)', () => {
      const result = validateBoardName('A'.repeat(75));
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects empty string', () => {
      const result = validateBoardName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Board name is required');
    });

    it('rejects whitespace-only string', () => {
      const result = validateBoardName('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Board name is required');
    });

    it('rejects null value', () => {
      const result = validateBoardName(null as unknown as string);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Board name is required');
    });

    it('rejects undefined value', () => {
      const result = validateBoardName(undefined as unknown as string);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Board name is required');
    });

    it('rejects board name exceeding max length (76 chars)', () => {
      const result = validateBoardName('A'.repeat(76));
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Board name must be 75 characters or less');
    });
  });
});

// ============================================================================
// validateColumnName Tests
// ============================================================================

describe('validateColumnName', () => {
  describe('valid inputs', () => {
    it('accepts a simple column name', () => {
      const result = validateColumnName('What Went Well');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts column name with special characters', () => {
      const result = validateColumnName('Improvements!');
      expect(result.isValid).toBe(true);
    });

    it('accepts column name at minimum length', () => {
      const result = validateColumnName('W');
      expect(result.isValid).toBe(true);
    });

    it('accepts column name at maximum length (30 chars)', () => {
      const result = validateColumnName('A'.repeat(30));
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects empty string', () => {
      const result = validateColumnName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Column name is required');
    });

    it('rejects whitespace-only string', () => {
      const result = validateColumnName('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Column name is required');
    });

    it('rejects null value', () => {
      const result = validateColumnName(null as unknown as string);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Column name is required');
    });

    it('rejects undefined value', () => {
      const result = validateColumnName(undefined as unknown as string);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Column name is required');
    });

    it('rejects column name exceeding max length (31 chars)', () => {
      const result = validateColumnName('A'.repeat(31));
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Column name must be 30 characters or less');
    });
  });
});
