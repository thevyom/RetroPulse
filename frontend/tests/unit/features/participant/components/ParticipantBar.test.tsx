/**
 * ParticipantBar Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParticipantBar } from '@/features/participant/components/ParticipantBar';
import type { ActiveUser } from '@/models/types';

const mockActiveUsers: ActiveUser[] = [
  {
    alias: 'Alice',
    is_admin: true,
    last_active_at: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    alias: 'Bob',
    is_admin: false,
    last_active_at: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    alias: 'Charlie',
    is_admin: false,
    last_active_at: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
  },
];

describe('ParticipantBar', () => {
  const defaultProps = {
    activeUsers: mockActiveUsers,
    currentUserHash: 'user-hash-1',
    isCreator: false,
    admins: ['admin-hash-1'],
    showAll: true,
    showAnonymous: true,
    showOnlyAnonymous: false,
    selectedUsers: [] as string[],
    onToggleAllUsers: vi.fn(),
    onToggleAnonymous: vi.fn(),
    onToggleUser: vi.fn(),
    onPromoteToAdmin: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Special Avatars', () => {
    it('should render All Users avatar', () => {
      render(<ParticipantBar {...defaultProps} />);

      expect(screen.getByLabelText(/filter by all users/i)).toBeInTheDocument();
    });

    it('should render Anonymous avatar', () => {
      render(<ParticipantBar {...defaultProps} />);

      expect(screen.getByLabelText(/filter by anonymous/i)).toBeInTheDocument();
    });

    it('should show All Users as selected when showAll is true and no users selected', () => {
      render(<ParticipantBar {...defaultProps} showAll={true} selectedUsers={[]} />);

      const allUsersBtn = screen.getByLabelText(/filter by all users/i);
      expect(allUsersBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('should show Anonymous as selected when showOnlyAnonymous is true', () => {
      render(<ParticipantBar {...defaultProps} showOnlyAnonymous={true} />);

      const anonBtn = screen.getByLabelText(/filter by anonymous/i);
      expect(anonBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('should NOT show Anonymous as selected when showOnlyAnonymous is false', () => {
      render(<ParticipantBar {...defaultProps} showOnlyAnonymous={false} />);

      const anonBtn = screen.getByLabelText(/filter by anonymous/i);
      expect(anonBtn).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('User Avatars', () => {
    it('should render avatars for all active users', () => {
      render(<ParticipantBar {...defaultProps} />);

      expect(screen.getByLabelText(/filter by alice/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by bob/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by charlie/i)).toBeInTheDocument();
    });

    it('should show "No participants yet" when no active users', () => {
      render(<ParticipantBar {...defaultProps} activeUsers={[]} />);

      expect(screen.getByText(/no participants yet/i)).toBeInTheDocument();
    });

    it('should call onToggleUser when user avatar is clicked', async () => {
      const user = userEvent.setup();
      render(<ParticipantBar {...defaultProps} />);

      await user.click(screen.getByLabelText(/filter by bob/i));

      expect(defaultProps.onToggleUser).toHaveBeenCalledWith('Bob');
    });
  });

  describe('Filter Toggles', () => {
    it('should call onToggleAllUsers when All Users is clicked', async () => {
      const user = userEvent.setup();
      render(<ParticipantBar {...defaultProps} />);

      await user.click(screen.getByLabelText(/filter by all users/i));

      expect(defaultProps.onToggleAllUsers).toHaveBeenCalled();
    });

    it('should call onToggleAnonymous when Anonymous is clicked', async () => {
      const user = userEvent.setup();
      render(<ParticipantBar {...defaultProps} />);

      await user.click(screen.getByLabelText(/filter by anonymous/i));

      expect(defaultProps.onToggleAnonymous).toHaveBeenCalled();
    });
  });

  describe('Admin Dropdown', () => {
    it('should show admin dropdown for creator', () => {
      render(<ParticipantBar {...defaultProps} isCreator={true} />);

      expect(screen.getByRole('button', { name: /manage admins/i })).toBeInTheDocument();
    });

    it('should not show admin dropdown for non-creator', () => {
      render(<ParticipantBar {...defaultProps} isCreator={false} />);

      expect(screen.queryByRole('button', { name: /manage admins/i })).not.toBeInTheDocument();
    });
  });
});
