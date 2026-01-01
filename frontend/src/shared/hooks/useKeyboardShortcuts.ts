/**
 * Keyboard Shortcuts Hook
 * Provides keyboard shortcut handling for the application
 */

import { useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface KeyboardShortcut {
  /** Key combination (e.g., 'n', 'ctrl+s', 'shift+?') */
  key: string;
  /** Handler function */
  handler: () => void;
  /** Description for help menu */
  description?: string;
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
  /** Whether the shortcut requires focus outside inputs */
  requiresNonInputFocus?: boolean;
}

interface KeyboardShortcutsOptions {
  /** Whether shortcuts are enabled */
  enabled?: boolean;
  /** Scope identifier for debugging */
  scope?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse a key combination string into its components
 */
function parseKeyCombo(combo: string): {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
} {
  const parts = combo.toLowerCase().split('+');
  const key = parts[parts.length - 1];

  return {
    key,
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('command'),
  };
}

/**
 * Check if an element is an input-like element
 */
function isInputElement(element: EventTarget | null): boolean {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();
  const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
  const isEditable = element.isContentEditable;

  return isInput || isEditable;
}

/**
 * Check if a keyboard event matches a key combination
 */
function matchesKeyCombo(event: KeyboardEvent, combo: ReturnType<typeof parseKeyCombo>): boolean {
  const eventKey = event.key.toLowerCase();

  // Match single character keys or special keys
  const keyMatches =
    eventKey === combo.key ||
    event.code.toLowerCase() === `key${combo.key}` ||
    event.code.toLowerCase() === combo.key;

  return (
    keyMatches &&
    event.ctrlKey === combo.ctrl &&
    event.shiftKey === combo.shift &&
    event.altKey === combo.alt &&
    event.metaKey === combo.meta
  );
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for handling keyboard shortcuts
 *
 * @example
 * useKeyboardShortcuts([
 *   { key: 'n', handler: () => openNewCardDialog(), description: 'New card' },
 *   { key: '?', handler: () => openHelpMenu(), description: 'Show help' },
 *   { key: 'ctrl+s', handler: () => save(), preventDefault: true },
 * ]);
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: KeyboardShortcutsOptions = {}
): void {
  const { enabled = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Find matching shortcut
      for (const shortcut of shortcuts) {
        const combo = parseKeyCombo(shortcut.key);

        // Skip if we're in an input and the shortcut requires non-input focus
        if (shortcut.requiresNonInputFocus !== false && isInputElement(event.target)) {
          continue;
        }

        if (matchesKeyCombo(event, combo)) {
          if (shortcut.preventDefault) {
            event.preventDefault();
          }
          shortcut.handler();
          return;
        }
      }
    },
    [enabled, shortcuts]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

// ============================================================================
// Default Shortcuts
// ============================================================================

/**
 * Default keyboard shortcuts for the retro board
 */
export const DEFAULT_BOARD_SHORTCUTS: Omit<KeyboardShortcut, 'handler'>[] = [
  { key: 'n', description: 'Add new card to first column' },
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: 'escape', description: 'Close dialogs' },
  { key: '1', description: 'Focus first column' },
  { key: '2', description: 'Focus second column' },
  { key: '3', description: 'Focus third column' },
];

export default useKeyboardShortcuts;
