/**
 * HomePage Component
 * Entry point for the application - allows users to create new boards
 */

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateBoardDialog } from './CreateBoardDialog';

// ============================================================================
// Component
// ============================================================================

export function HomePage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const features = [
    'Real-time collaboration with your team',
    'Organize feedback into categories',
    'Vote on the most important items',
    'Create action items from discussions',
  ];

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-background px-4"
      data-testid="home-page"
    >
      <div className="w-full max-w-[600px] text-center">
        {/* Logo and Title */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-foreground" data-testid="home-title">
            🔄 RetroPulse
          </h1>
          <p className="mt-2 text-lg text-muted-foreground" data-testid="home-tagline">
            Collaborative Retrospective Boards
          </p>
        </div>

        {/* Description */}
        <p className="mb-8 text-muted-foreground" data-testid="home-description">
          Run effective retrospectives with your team. Create a board, share the link, and start
          collecting feedback in real-time.
        </p>

        {/* Create Board Button */}
        <Button
          size="lg"
          className="h-12 w-[280px] text-base font-semibold"
          onClick={() => setIsDialogOpen(true)}
          data-testid="create-board-button"
        >
          Create New Board
        </Button>

        {/* Feature List */}
        <ul className="mt-10 space-y-3 text-left" data-testid="feature-list">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-3 text-muted-foreground">
              <Check className="h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Create Board Dialog */}
      <CreateBoardDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </main>
  );
}

export default HomePage;
