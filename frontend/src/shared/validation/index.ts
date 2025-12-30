/**
 * Form Validation Utilities
 * Centralized validation logic for user input across the application
 */

// ============================================================================
// Constants
// ============================================================================

export const ALIAS_PATTERN = /^[a-zA-Z0-9 _-]+$/;
export const MIN_ALIAS_LENGTH = 1;
export const MAX_ALIAS_LENGTH = 30;

export const MIN_CARD_CONTENT_LENGTH = 1;
export const MAX_CARD_CONTENT_WORDS = 150;

export const MIN_BOARD_NAME_LENGTH = 1;
export const MAX_BOARD_NAME_LENGTH = 75;

export const MIN_COLUMN_NAME_LENGTH = 1;
export const MAX_COLUMN_NAME_LENGTH = 30;

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates a user alias for the retro board
 * @param alias - The alias to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export function validateAlias(alias: string): ValidationResult {
  if (alias === null || alias === undefined) {
    return { isValid: false, error: 'Alias is required' };
  }

  const trimmed = alias.trim();

  if (trimmed.length === 0) {
    return { isValid: false, error: 'Alias is required' };
  }

  if (trimmed.length < MIN_ALIAS_LENGTH) {
    return { isValid: false, error: 'Alias is too short' };
  }

  if (trimmed.length > MAX_ALIAS_LENGTH) {
    return {
      isValid: false,
      error: `Alias must be ${MAX_ALIAS_LENGTH} characters or less`,
    };
  }

  if (!ALIAS_PATTERN.test(trimmed)) {
    return {
      isValid: false,
      error: 'Only letters, numbers, spaces, hyphens, and underscores allowed',
    };
  }

  return { isValid: true };
}

/**
 * Counts words in a string (splits by whitespace)
 * @param text - The text to count words in
 * @returns Number of words
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Validates card content for a retro card
 * @param content - The card content to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export function validateCardContent(content: string): ValidationResult {
  if (content === null || content === undefined) {
    return { isValid: false, error: 'Card content is required' };
  }

  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return { isValid: false, error: 'Card content is required' };
  }

  const wordCount = countWords(content);
  if (wordCount > MAX_CARD_CONTENT_WORDS) {
    return {
      isValid: false,
      error: `Content must be ${MAX_CARD_CONTENT_WORDS} words or less`,
    };
  }

  return { isValid: true };
}

/**
 * Validates a board name
 * @param name - The board name to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export function validateBoardName(name: string): ValidationResult {
  if (name === null || name === undefined) {
    return { isValid: false, error: 'Board name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { isValid: false, error: 'Board name is required' };
  }

  if (trimmed.length > MAX_BOARD_NAME_LENGTH) {
    return {
      isValid: false,
      error: `Board name must be ${MAX_BOARD_NAME_LENGTH} characters or less`,
    };
  }

  return { isValid: true };
}

/**
 * Validates a column name
 * @param name - The column name to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export function validateColumnName(name: string): ValidationResult {
  if (name === null || name === undefined) {
    return { isValid: false, error: 'Column name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { isValid: false, error: 'Column name is required' };
  }

  if (trimmed.length > MAX_COLUMN_NAME_LENGTH) {
    return {
      isValid: false,
      error: `Column name must be ${MAX_COLUMN_NAME_LENGTH} characters or less`,
    };
  }

  return { isValid: true };
}
