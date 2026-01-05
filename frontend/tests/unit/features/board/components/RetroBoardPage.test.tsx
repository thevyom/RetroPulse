/**
 * RetroBoardPage Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RetroBoardPage } from '@/features/board/components/RetroBoardPage';
import { BoardAPI } from '@/models/api/BoardAPI';

// Mock BoardAPI for session check on mount
vi.mock('@/models/api/BoardAPI', () => ({
  BoardAPI: {
    getCurrentUserSession: vi.fn(),
    joinBoard: vi.fn(),
  },
}));

// Mock the ViewModels
const mockBoardVM = {
  board: null as unknown,
  isLoading: false,
  error: null as string | null,
  isAdmin: false,
  isCreator: false,
  isClosed: false,
  handleRenameBoard: vi.fn(),
  handleCloseBoard: vi.fn(),
  handleRenameColumn: vi.fn(),
  refetchBoard: vi.fn(),
};

const mockCardVM = {
  cards: [],
  cardsByColumn: new Map(),
  isLoading: false,
  error: null,
  cardQuota: null,
  reactionQuota: null,
  canCreateCard: true,
  canReact: true,
  sortMode: 'recency' as const,
  sortDirection: 'desc' as const,
  filters: { showAll: true, showAnonymous: true, selectedUsers: [] },
  sortedFilteredCards: [],
  checkCardQuota: vi.fn(),
  checkReactionQuota: vi.fn(),
  refetchCards: vi.fn(),
  handleCreateCard: vi.fn(),
  handleUpdateCard: vi.fn(),
  handleDeleteCard: vi.fn(),
  handleMoveCard: vi.fn(),
  handleLinkParentChild: vi.fn(),
  handleUnlinkChild: vi.fn(),
  handleLinkActionToFeedback: vi.fn(),
  handleAddReaction: vi.fn(),
  handleRemoveReaction: vi.fn(),
  hasUserReacted: vi.fn().mockReturnValue(false),
  setSortMode: vi.fn(),
  toggleSortDirection: vi.fn(),
  toggleAllUsersFilter: vi.fn(),
  toggleAnonymousFilter: vi.fn(),
  toggleUserFilter: vi.fn(),
  clearFilters: vi.fn(),
};

const mockParticipantVM = {
  activeUsers: [],
  currentUser: null,
  isLoading: false,
  error: null,
  showAll: true,
  showAnonymous: true,
  showOnlyAnonymous: false,
  selectedUsers: [],
  isCurrentUserCreator: false,
  handleUpdateAlias: vi.fn(),
  handlePromoteToAdmin: vi.fn(),
  handleToggleAllUsersFilter: vi.fn(),
  handleToggleAnonymousFilter: vi.fn(),
  handleToggleUserFilter: vi.fn(),
  handleClearFilters: vi.fn(),
  sendHeartbeat: vi.fn(),
  refetchActiveUsers: vi.fn(),
};

vi.mock('@/features/board/viewmodels/useBoardViewModel', () => ({
  useBoardViewModel: () => mockBoardVM,
}));

vi.mock('@/features/card/viewmodels/useCardViewModel', () => ({
  useCardViewModel: () => mockCardVM,
}));

vi.mock('@/features/participant/viewmodels/useParticipantViewModel', () => ({
  useParticipantViewModel: () => mockParticipantVM,
}));

// Mock socket service
vi.mock('@/models/socket/SocketService', () => ({
  socketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

// Mock user store
vi.mock('@/models/stores/userStore', () => ({
  useUserStore: vi.fn((selector) => {
    const state = {
      currentUser: null,
      activeUsers: [],
      setCurrentUser: vi.fn(),
      addActiveUser: vi.fn(),
      setUserOnline: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

// Helper to render with router
function renderWithRouter(boardId: string = 'test-board-id') {
  return render(
    <MemoryRouter initialEntries={[`/boards/${boardId}`]}>
      <Routes>
        <Route path="/boards/:boardId" element={<RetroBoardPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RetroBoardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default values
    mockBoardVM.board = null;
    mockBoardVM.isLoading = false;
    mockBoardVM.error = null;
    mockBoardVM.isAdmin = false;
    mockBoardVM.isClosed = false;

    // Mock BoardAPI.getCurrentUserSession to return a valid session
    // This prevents the alias prompt modal from showing
    vi.mocked(BoardAPI.getCurrentUserSession).mockResolvedValue({
      cookie_hash: 'user-hash-123',
      alias: 'Test User',
      is_admin: false,
      last_active_at: '2025-01-01T00:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton when board is loading', () => {
      mockBoardVM.isLoading = true;

      renderWithRouter();

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByLabelText(/loading board/i)).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when board fetch fails', async () => {
      mockBoardVM.error = 'Failed to load board';

      renderWithRouter();

      // Wait for session check to complete
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to load board');
      });
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should call refetchBoard when Try Again button is clicked', async () => {
      const user = userEvent.setup();
      mockBoardVM.error = 'Failed to load board';

      renderWithRouter();

      // Wait for session check to complete
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /try again/i }));

      expect(mockBoardVM.refetchBoard).toHaveBeenCalled();
    });

    it('should show "Board not found" when board is null after loading', async () => {
      mockBoardVM.board = null;
      mockBoardVM.isLoading = false;
      mockBoardVM.error = null;

      renderWithRouter();

      // Wait for session check to complete
      await waitFor(() => {
        expect(screen.getByText(/board not found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Board Rendering', () => {
    it('should render board header with name', async () => {
      mockBoardVM.board = {
        id: 'board-1',
        name: 'Sprint 42 Retro',
        state: 'active',
        columns: [
          { id: 'col-1', name: 'Went Well', color: '#22c55e' },
          { id: 'col-2', name: 'To Improve', color: '#eab308' },
          { id: 'col-3', name: 'Action Items', color: '#3b82f6' },
        ],
        admins: ['hash-1'],
        active_users: [],
        shareable_link: 'http://example.com/boards/board-1',
        closed_at: null,
        card_limit_per_user: null,
        reaction_limit_per_user: null,
        created_at: '2025-01-01T00:00:00Z',
        created_by_hash: 'hash-1',
      };

      renderWithRouter();

      // Wait for session check to complete
      await waitFor(() => {
        expect(screen.getByText('Sprint 42 Retro')).toBeInTheDocument();
      });
    });

    it('should render 3 columns', async () => {
      mockBoardVM.board = {
        id: 'board-1',
        name: 'Test Board',
        state: 'active',
        columns: [
          { id: 'col-1', name: 'Went Well', color: '#22c55e' },
          { id: 'col-2', name: 'To Improve', color: '#eab308' },
          { id: 'col-3', name: 'Action Items', color: '#3b82f6' },
        ],
        admins: ['hash-1'],
        active_users: [],
        shareable_link: 'http://example.com/boards/board-1',
        closed_at: null,
        card_limit_per_user: null,
        reaction_limit_per_user: null,
        created_at: '2025-01-01T00:00:00Z',
        created_by_hash: 'hash-1',
      };

      renderWithRouter();

      // Wait for session check to complete
      await waitFor(() => {
        expect(screen.getByText('Went Well')).toBeInTheDocument();
      });
      expect(screen.getByText('To Improve')).toBeInTheDocument();
      expect(screen.getByText('Action Items')).toBeInTheDocument();
    });

    it('should show closed board overlay when board is closed', async () => {
      mockBoardVM.board = {
        id: 'board-1',
        name: 'Closed Board',
        state: 'closed',
        columns: [],
        admins: ['hash-1'],
        active_users: [],
        shareable_link: 'http://example.com/boards/board-1',
        closed_at: '2025-01-01T00:00:00Z',
        card_limit_per_user: null,
        reaction_limit_per_user: null,
        created_at: '2025-01-01T00:00:00Z',
        created_by_hash: 'hash-1',
      };
      mockBoardVM.isClosed = true;

      renderWithRouter();

      // Wait for session check to complete
      await waitFor(() => {
        // Check for the overlay (has aria-hidden)
        const overlay = document.querySelector('[aria-hidden="true"]');
        expect(overlay).toBeInTheDocument();
      });
    });
  });

  describe('No Board ID', () => {
    it('should show message when no board ID in URL', () => {
      render(
        <MemoryRouter initialEntries={['/boards/']}>
          <Routes>
            <Route path="/boards/" element={<RetroBoardPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText(/no board id provided/i)).toBeInTheDocument();
    });
  });

  describe('Card Filtering', () => {
    const mockBoard = {
      id: 'board-1',
      name: 'Test Board',
      state: 'active',
      columns: [{ id: 'col-1', name: 'Went Well', color: '#22c55e' }],
      admins: ['hash-1'],
      active_users: [],
      shareable_link: 'http://example.com/boards/board-1',
      closed_at: null,
      card_limit_per_user: null,
      reaction_limit_per_user: null,
      created_at: '2025-01-01T00:00:00Z',
      created_by_hash: 'hash-1',
    };

    const mockCards = [
      {
        id: 'card-1',
        board_id: 'board-1',
        column_id: 'col-1',
        content: 'Regular card',
        card_type: 'feedback',
        is_anonymous: false,
        created_by_hash: 'user-1',
        created_by_alias: 'User One',
        created_at: '2025-01-01T00:00:00Z',
        direct_reaction_count: 0,
        aggregated_reaction_count: 0,
        parent_card_id: null,
        linked_feedback_ids: [],
      },
      {
        id: 'card-2',
        board_id: 'board-1',
        column_id: 'col-1',
        content: 'Anonymous card',
        card_type: 'feedback',
        is_anonymous: true,
        created_by_hash: 'user-2',
        created_by_alias: null,
        created_at: '2025-01-01T00:00:00Z',
        direct_reaction_count: 0,
        aggregated_reaction_count: 0,
        parent_card_id: null,
        linked_feedback_ids: [],
      },
    ];

    it('should filter out anonymous cards when showAnonymous is false', async () => {
      mockBoardVM.board = mockBoard;
      mockCardVM.cardsByColumn = new Map([['col-1', mockCards]]);
      mockParticipantVM.showAnonymous = false;
      mockParticipantVM.showAll = true;
      mockParticipantVM.selectedUsers = [];

      renderWithRouter();

      // Wait for session check to complete
      await waitFor(() => {
        // Regular card should be visible
        expect(screen.getByText('Regular card')).toBeInTheDocument();
      });
      // Anonymous card should not be visible
      expect(screen.queryByText('Anonymous card')).not.toBeInTheDocument();
    });

    it('should filter cards by selected users', async () => {
      mockBoardVM.board = mockBoard;
      // When filtering by user, the viewmodel returns only cards from that user
      // The component just renders what cardsByColumn gives it
      const filteredCards = mockCards.filter((c) => c.created_by_alias === 'User One');
      mockCardVM.cardsByColumn = new Map([['col-1', filteredCards]]);
      mockParticipantVM.showAnonymous = true;
      mockParticipantVM.showAll = false;
      mockParticipantVM.selectedUsers = ['User One'];

      renderWithRouter();

      // Wait for session check to complete
      await waitFor(() => {
        // User-1's card should be visible
        expect(screen.getByText('Regular card')).toBeInTheDocument();
      });
      // Anonymous card should not be visible (doesn't match user filter)
      expect(screen.queryByText('Anonymous card')).not.toBeInTheDocument();
    });

    it('should show all cards when showAll is true and no filters', async () => {
      mockBoardVM.board = mockBoard;
      mockCardVM.cardsByColumn = new Map([['col-1', mockCards]]);
      mockParticipantVM.showAnonymous = true;
      mockParticipantVM.showAll = true;
      mockParticipantVM.selectedUsers = [];

      renderWithRouter();

      // Wait for session check to complete
      await waitFor(() => {
        expect(screen.getByText('Regular card')).toBeInTheDocument();
      });
      expect(screen.getByText('Anonymous card')).toBeInTheDocument();
    });
  });

  describe('Admin Column Edit', () => {
    it('should pass onEditColumnTitle callback when user is admin', async () => {
      mockBoardVM.board = {
        id: 'board-1',
        name: 'Test Board',
        state: 'active',
        columns: [{ id: 'col-1', name: 'Went Well', color: '#22c55e' }],
        admins: ['hash-1'],
        active_users: [],
        shareable_link: 'http://example.com/boards/board-1',
        closed_at: null,
        card_limit_per_user: null,
        reaction_limit_per_user: null,
        created_at: '2025-01-01T00:00:00Z',
        created_by_hash: 'hash-1',
      };
      mockBoardVM.isAdmin = true;

      renderWithRouter();

      // Wait for session check to complete
      await waitFor(() => {
        // Admin should see the edit column button
        expect(screen.getByLabelText(/edit column name/i)).toBeInTheDocument();
      });
    });

    it('should not show edit column button when user is not admin', async () => {
      mockBoardVM.board = {
        id: 'board-1',
        name: 'Test Board',
        state: 'active',
        columns: [{ id: 'col-1', name: 'Went Well', color: '#22c55e' }],
        admins: ['hash-1'],
        active_users: [],
        shareable_link: 'http://example.com/boards/board-1',
        closed_at: null,
        card_limit_per_user: null,
        reaction_limit_per_user: null,
        created_at: '2025-01-01T00:00:00Z',
        created_by_hash: 'hash-1',
      };
      mockBoardVM.isAdmin = false;

      renderWithRouter();

      // Wait for session check to complete (wait for board name to appear)
      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });
      // Non-admin should not see the edit column button
      expect(screen.queryByLabelText(/edit column name/i)).not.toBeInTheDocument();
    });
  });
});
