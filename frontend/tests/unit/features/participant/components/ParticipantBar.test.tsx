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

  describe('Single-Select Filter Behavior (UTB-017)', () => {
    it('should show single user as selected when selectedUsers contains one user', () => {
      render(<ParticipantBar {...defaultProps} showAll={false} selectedUsers={['Alice']} />);

      const aliceBtn = screen.getByLabelText(/filter by alice/i);
      expect(aliceBtn).toHaveAttribute('aria-pressed', 'true');

      const bobBtn = screen.getByLabelText(/filter by bob/i);
      expect(bobBtn).toHaveAttribute('aria-pressed', 'false');

      const allBtn = screen.getByLabelText(/filter by all users/i);
      expect(allBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('should show mutually exclusive filter states - user selected', () => {
      render(
        <ParticipantBar
          {...defaultProps}
          showAll={false}
          showOnlyAnonymous={false}
          selectedUsers={['Bob']}
        />
      );

      // Only Bob should be selected
      expect(screen.getByLabelText(/filter by bob/i)).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByLabelText(/filter by alice/i)).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByLabelText(/filter by all users/i)).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByLabelText(/filter by anonymous/i)).toHaveAttribute('aria-pressed', 'false');
    });

    it('should show mutually exclusive filter states - anonymous selected', () => {
      render(
        <ParticipantBar
          {...defaultProps}
          showAll={false}
          showOnlyAnonymous={true}
          selectedUsers={[]}
        />
      );

      // Only Anonymous should be selected
      expect(screen.getByLabelText(/filter by anonymous/i)).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByLabelText(/filter by all users/i)).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByLabelText(/filter by alice/i)).toHaveAttribute('aria-pressed', 'false');
    });

    it('should show mutually exclusive filter states - all users selected', () => {
      render(
        <ParticipantBar
          {...defaultProps}
          showAll={true}
          showOnlyAnonymous={false}
          selectedUsers={[]}
        />
      );

      // Only All should be selected
      expect(screen.getByLabelText(/filter by all users/i)).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByLabelText(/filter by anonymous/i)).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByLabelText(/filter by alice/i)).toHaveAttribute('aria-pressed', 'false');
    });

    it('should call onToggleUser with correct alias for single selection', async () => {
      const user = userEvent.setup();
      const onToggleUser = vi.fn();
      render(<ParticipantBar {...defaultProps} onToggleUser={onToggleUser} />);

      await user.click(screen.getByLabelText(/filter by charlie/i));

      expect(onToggleUser).toHaveBeenCalledWith('Charlie');
      expect(onToggleUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('Participant Overflow Handling', () => {
    const generateManyUsers = (count: number): ActiveUser[] => {
      return Array.from({ length: count }, (_, i) => ({
        alias: `User${i + 1}`,
        is_admin: i === 0,
        last_active_at: '2025-01-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
      }));
    };

    it('should have scrollable container for participant avatars', () => {
      render(<ParticipantBar {...defaultProps} />);

      const container = screen.getByTestId('participant-avatar-container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('overflow-x-auto');
    });

    it('should have max-width constraint on avatar container', () => {
      render(<ParticipantBar {...defaultProps} />);

      const container = screen.getByTestId('participant-avatar-container');
      expect(container).toHaveClass('max-w-[280px]');
    });

    it('should render all participants when there are many (10+)', () => {
      const manyUsers = generateManyUsers(15);
      render(<ParticipantBar {...defaultProps} activeUsers={manyUsers} />);

      // All 15 users should be rendered (accessible via scroll)
      // Use getAllByLabelText to verify all users are present
      const allUserAvatars = screen.getAllByLabelText(/filter by user\d+/i);
      expect(allUserAvatars).toHaveLength(15);
    });

    it('should keep filter controls accessible with many participants', () => {
      const manyUsers = generateManyUsers(20);
      render(<ParticipantBar {...defaultProps} activeUsers={manyUsers} />);

      // Filter controls should still be visible and accessible
      expect(screen.getByLabelText(/filter by all users/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by anonymous/i)).toBeInTheDocument();
    });

    it('should keep admin dropdown accessible with many participants', () => {
      const manyUsers = generateManyUsers(20);
      render(<ParticipantBar {...defaultProps} activeUsers={manyUsers} isCreator={true} />);

      // Admin dropdown should still be visible
      expect(screen.getByRole('button', { name: /manage admins/i })).toBeInTheDocument();
    });

    it('should have scrollbar styling classes', () => {
      render(<ParticipantBar {...defaultProps} />);

      const container = screen.getByTestId('participant-avatar-container');
      expect(container).toHaveClass('scrollbar-thin');
      expect(container).toHaveClass('scrollbar-thumb-muted');
      expect(container).toHaveClass('scrollbar-track-transparent');
    });

    it('should allow clicking on participants in scrollable area', async () => {
      const user = userEvent.setup();
      const manyUsers = generateManyUsers(15);
      render(<ParticipantBar {...defaultProps} activeUsers={manyUsers} />);

      // Click on a user that would be in the scrollable area
      await user.click(screen.getByLabelText(/filter by user10/i));

      expect(defaultProps.onToggleUser).toHaveBeenCalledWith('User10');
    });
  });
});
