/**
 * AliasPromptModal Component
 * Mandatory alias prompt modal that appears when a new user (without cookie) tries to join a board.
 * Cannot be dismissed without entering a valid alias.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { validateAlias, MAX_ALIAS_LENGTH } from '@/shared/validation';

// ============================================================================
// Types
// ============================================================================

export interface AliasPromptModalProps {
  isOpen: boolean;
  onJoin: (alias: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function AliasPromptModal({ isOpen, onJoin }: AliasPromptModalProps) {
  const [alias, setAlias] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const validation = validateAlias(alias);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid alias');
      return;
    }
    onJoin(alias.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        data-testid="alias-prompt-modal"
      >
        <DialogHeader>
          <DialogTitle>Join the Retro</DialogTitle>
          <DialogDescription>What should we call you?</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Input
            value={alias}
            onChange={(e) => {
              setAlias(e.target.value);
              setError('');
            }}
            placeholder="Enter your name"
            onKeyDown={handleKeyDown}
            autoFocus
            maxLength={MAX_ALIAS_LENGTH}
            aria-label="Your name"
            aria-invalid={!!error}
            aria-describedby={error ? 'alias-error' : 'alias-hint'}
            data-testid="alias-input"
          />
          {error && (
            <p
              id="alias-error"
              className="text-sm text-destructive"
              role="alert"
              data-testid="alias-error"
            >
              {error}
            </p>
          )}
          <p id="alias-hint" className="text-sm text-muted-foreground">
            This name will be visible to other participants.
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={alias.trim().length === 0}
          className="w-full"
          data-testid="join-board-button"
        >
          Join Board
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default AliasPromptModal;
