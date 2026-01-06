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

interface AliasPromptModalProps {
  isOpen: boolean;
  onJoin: (alias: string) => void;
}

export function AliasPromptModal({ isOpen, onJoin }: AliasPromptModalProps) {
  const [alias, setAlias] = useState('');
  const [error, setError] = useState('');

  const validate = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length < 1) return 'Please enter a name';
    if (trimmed.length > 50) return 'Name must be 50 characters or less';
    if (!/^[a-zA-Z0-9\s]+$/.test(trimmed)) return 'Only letters, numbers, and spaces allowed';
    return null;
  };

  const handleSubmit = () => {
    const validationError = validate(alias);
    if (validationError) {
      setError(validationError);
      return;
    }
    onJoin(alias.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Join the Retrospective</DialogTitle>
          <DialogDescription>
            What should we call you? This name will be visible to other participants.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Input
            value={alias}
            onChange={(e) => {
              setAlias(e.target.value);
              setError('');
            }}
            placeholder="Enter your name"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
            maxLength={50}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={alias.trim().length === 0}
          className="w-full"
          size="lg"
        >
          Join Board
        </Button>
      </DialogContent>
    </Dialog>
  );
}
