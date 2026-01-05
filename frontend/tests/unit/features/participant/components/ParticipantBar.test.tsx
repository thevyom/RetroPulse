/**
 * ParticipantBar Component Tests
 * Updated for Avatar System v2 (Phase 8.6)
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
  {
    alias: 'CurrentUser',
    is_admin: false,
    last_active_at: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
  },
];

describe('ParticipantBar', () => {
  const defaultProps = {
    activeUsers: mockActiveUsers,
    currentUserHash: 'user-hash-1',
    currentUserAlias: 'CurrentUser',
    currentUserIsAdmin: false,
    showAll: true,
    showAnonymous: true,
    showOnlyAnonymous: false,
    showOnlyMe: false,
    selectedUsers: [] as string[],
    onlineAliases: new Set<string>(['Alice', 'Bob', 'CurrentUser']),
    onToggleAllUsers: vi.fn(),
    onToggleAnonymous: vi.fn(),
    onToggleMe: vi.fn(),
    onToggleUser: vi.fn(),
    onPromoteToAdmin: vi.fn().mockResolvedValue(undefined),
    onUpdateAlias: vi.fn().mockResolvedValue(undefined),
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
    it('should render avatars for other active users (not current user)', () => {
      render(<ParticipantBar {...defaultProps} />);

      // Other users should be visible
      expect(screen.getByLabelText(/filter by alice/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by bob/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by charlie/i)).toBeInTheDocument();
      // Current user should be in MeSection, not in the participant list
    });

    it('should show "No other participants" when only current user exists', () => {
      const onlyCurrentUser = [mockActiveUsers.find((u) => u.alias === 'CurrentUser')!];
      render(<ParticipantBar {...defaultProps} activeUsers={onlyCurrentUser} />);

      expect(screen.getByText(/no other participants/i)).toBeInTheDocument();
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

  describe('MeSection', () => {
    it('should show MeSection with current user alias', () => {
      render(<ParticipantBar {...defaultProps} />);

      expect(screen.getByTestId('me-section')).toBeInTheDocument();
      expect(screen.getByTestId('me-alias')).toHaveTextContent('CurrentUser');
    });

    it('should call onToggleMe when MeSection avatar is clicked', async () => {
      const user = userEvent.setup();
      render(<ParticipantBar {...defaultProps} />);

      await user.click(screen.getByTestId('me-avatar'));

      expect(defaultProps.onToggleMe).toHaveBeenCalled();
    });

    it('should show edit button in MeSection', () => {
      render(<ParticipantBar {...defaultProps} />);

      expect(screen.getByTestId('edit-alias-button')).toBeInTheDocument();
    });
  });

  describe('Admin Context Menu (replaces AdminDropdown)', () => {
    it('should not render AdminDropdown button (removed in v2)', () => {
      render(<ParticipantBar {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /manage admins/i })).not.toBeInTheDocument();
    });

    it('should render participant avatars with correct aria-labels for filtering', () => {
      render(<ParticipantBar {...defaultProps} currentUserIsAdmin={true} />);

      // Avatars should be present and clickable for filtering
      expect(screen.getByLabelText(/filter by alice/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by bob/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by charlie/i)).toBeInTheDocument();
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

    it('should use flex-1 for natural sizing (no fixed max-width)', () => {
      render(<ParticipantBar {...defaultProps} />);

      const container = screen.getByTestId('participant-avatar-container');
      expect(container).toHaveClass('flex-1');
      expect(container).toHaveClass('min-w-0');
    });

    it('should render all participants when there are many (10+)', () => {
      const manyUsers = [...generateManyUsers(15), { alias: 'CurrentUser', is_admin: false, last_active_at: '2025-01-01T00:00:00Z', created_at: '2025-01-01T00:00:00Z' }];
      render(<ParticipantBar {...defaultProps} activeUsers={manyUsers} />);

      // All 15 other users should be rendered (CurrentUser is in MeSection)
      const allUserAvatars = screen.getAllByLabelText(/filter by user\d+/i);
      expect(allUserAvatars).toHaveLength(15);
    });

    it('should keep filter controls accessible with many participants', () => {
      const manyUsers = [...generateManyUsers(20), { alias: 'CurrentUser', is_admin: false, last_active_at: '2025-01-01T00:00:00Z', created_at: '2025-01-01T00:00:00Z' }];
      render(<ParticipantBar {...defaultProps} activeUsers={manyUsers} />);

      // Filter controls should still be visible and accessible
      expect(screen.getByLabelText(/filter by all users/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by anonymous/i)).toBeInTheDocument();
    });

    it('should keep MeSection accessible with many participants', () => {
      const manyUsers = [...generateManyUsers(20), { alias: 'CurrentUser', is_admin: false, last_active_at: '2025-01-01T00:00:00Z', created_at: '2025-01-01T00:00:00Z' }];
      render(<ParticipantBar {...defaultProps} activeUsers={manyUsers} />);

      // MeSection should still be visible
      expect(screen.getByTestId('me-section')).toBeInTheDocument();
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
      const manyUsers = [...generateManyUsers(15), { alias: 'CurrentUser', is_admin: false, last_active_at: '2025-01-01T00:00:00Z', created_at: '2025-01-01T00:00:00Z' }];
      render(<ParticipantBar {...defaultProps} activeUsers={manyUsers} />);

      // Click on a user that would be in the scrollable area
      await user.click(screen.getByLabelText(/filter by user10/i));

      expect(defaultProps.onToggleUser).toHaveBeenCalledWith('User10');
    });
  });
});
