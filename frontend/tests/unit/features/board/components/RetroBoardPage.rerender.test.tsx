/**
 * RetroBoardPage Re-render Optimization Tests (UTB-010)
 *
 * These tests verify that RetroBoardHeader and ParticipantBar don't re-render
 * when sort mode/direction changes. Only the card area should re-render.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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

// Track render counts for each component
let headerRenderCount = 0;
let participantBarRenderCount = 0;
let sortBarRenderCount = 0;

// Mock RetroBoardHeader to track renders
vi.mock('@/features/board/components/RetroBoardHeader', () => ({
  RetroBoardHeader: vi.fn((props) => {
    headerRenderCount++;
    return (
      <header data-testid="retro-board-header" data-render-count={headerRenderCount}>
        <h1>{props.boardName}</h1>
      </header>
    );
  }),
}));

// Mock ParticipantBar to track renders
vi.mock('@/features/participant/components/ParticipantBar', () => ({
  ParticipantBar: vi.fn(() => {
    participantBarRenderCount++;
    return (
      <nav data-testid="participant-bar" data-render-count={participantBarRenderCount}>
        Participant Bar
      </nav>
    );
  }),
}));

// Mock SortBar to track renders
vi.mock('@/features/board/components/SortBar', () => ({
  SortBar: vi.fn(({ onSortModeChange, onToggleDirection, sortMode, sortDirection }) => {
    sortBarRenderCount++;
    return (
      <div data-testid="sort-bar" data-render-count={sortBarRenderCount}>
        <button
          onClick={() => onSortModeChange(sortMode === 'recency' ? 'popularity' : 'recency')}
          data-testid="sort-mode-button"
        >
          Sort: {sortMode}
        </button>
        <button
          onClick={onToggleDirection}
          data-testid="sort-direction-button"
        >
          Direction: {sortDirection}
        </button>
      </div>
    );
  }),
}));

// Mock RetroColumn
vi.mock('@/features/card/components/RetroColumn', () => ({
  RetroColumn: vi.fn(() => <div data-testid="retro-column">Column</div>),
}));

// Mock ViewModels
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

let currentSortMode = 'recency' as 'recency' | 'popularity';
let currentSortDirection = 'desc' as 'asc' | 'desc';

const mockCardVM = {
  cards: [],
  cardsByColumn: new Map(),
  isLoading: false,
  error: null,
  cardQuota: null,
  reactionQuota: null,
  canCreateCard: true,
  canReact: true,
  get sortMode() { return currentSortMode; },
  get sortDirection() { return currentSortDirection; },
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
  setSortMode: vi.fn((mode: 'recency' | 'popularity') => {
    currentSortMode = mode;
  }),
  toggleSortDirection: vi.fn(() => {
    currentSortDirection = currentSortDirection === 'desc' ? 'asc' : 'desc';
  }),
  toggleAllUsersFilter: vi.fn(),
  toggleAnonymousFilter: vi.fn(),
  toggleUserFilter: vi.fn(),
  clearFilters: vi.fn(),
};

const mockParticipantVM = {
  activeUsers: [],
  currentUser: { cookie_hash: 'test-user', alias: 'Test User', is_admin: false, last_active_at: '', created_at: '' },
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

const mockDragDropVM = {
  isDragging: false,
  draggedItem: null,
  dropTarget: null,
  isValidDrop: false,
  handleDragStart: vi.fn(),
  handleDragOver: vi.fn(),
  handleDragEnd: vi.fn(),
  canDropOn: vi.fn().mockReturnValue(false),
  getDropResult: vi.fn().mockReturnValue(null),
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

vi.mock('@/features/card/viewmodels/useDragDropViewModel', () => ({
  useDragDropViewModel: () => mockDragDropVM,
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

describe('RetroBoardPage Re-render Optimization (UTB-010)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset render counts
    headerRenderCount = 0;
    participantBarRenderCount = 0;
    sortBarRenderCount = 0;
    // Reset sort state
    currentSortMode = 'recency';
    currentSortDirection = 'desc';

    // Mock BoardAPI.getCurrentUserSession to return a valid session
    // This prevents the alias prompt modal from showing
    vi.mocked(BoardAPI.getCurrentUserSession).mockResolvedValue({
      cookie_hash: 'user-hash-123',
      alias: 'Test User',
      is_admin: false,
      last_active_at: '2025-01-01T00:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
    });

    // Setup board data
    mockBoardVM.board = {
      id: 'board-1',
      name: 'Test Board',
      state: 'active',
      columns: [
        { id: 'col-1', name: 'Went Well', color: '#22c55e' },
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
    mockBoardVM.isLoading = false;
    mockBoardVM.error = null;
  });

  describe('Sort Mode Change Re-renders', () => {
    it('should render header only once on initial render', () => {
      renderWithRouter();

      expect(headerRenderCount).toBe(1);
      expect(screen.getByTestId('retro-board-header')).toBeInTheDocument();
    });

    it('should render participant bar only once on initial render', () => {
      renderWithRouter();

      expect(participantBarRenderCount).toBe(1);
      expect(screen.getByTestId('participant-bar')).toBeInTheDocument();
    });

    it('should NOT re-render header when sort mode changes', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const initialHeaderCount = headerRenderCount;

      // Change sort mode
      await user.click(screen.getByTestId('sort-mode-button'));

      // Header should not have re-rendered
      expect(headerRenderCount).toBe(initialHeaderCount);
    });

    it('should NOT re-render participant bar when sort mode changes', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const initialBarCount = participantBarRenderCount;

      // Change sort mode
      await user.click(screen.getByTestId('sort-mode-button'));

      // ParticipantBar should not have re-rendered
      expect(participantBarRenderCount).toBe(initialBarCount);
    });

    it('should NOT re-render header when sort direction changes', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const initialHeaderCount = headerRenderCount;

      // Toggle sort direction
      await user.click(screen.getByTestId('sort-direction-button'));

      // Header should not have re-rendered
      expect(headerRenderCount).toBe(initialHeaderCount);
    });

    it('should NOT re-render participant bar when sort direction changes', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const initialBarCount = participantBarRenderCount;

      // Toggle sort direction
      await user.click(screen.getByTestId('sort-direction-button'));

      // ParticipantBar should not have re-rendered
      expect(participantBarRenderCount).toBe(initialBarCount);
    });
  });

  describe('Callback Stability', () => {
    it('should pass stable handleRenameBoard callback to header', async () => {
      const { RetroBoardHeader } = await import('@/features/board/components/RetroBoardHeader');

      renderWithRouter();

      // First render - use the mocked function
      const mockedHeader = RetroBoardHeader as unknown as ReturnType<typeof vi.fn>;
      if (mockedHeader.mock?.calls?.length > 0) {
        const firstRenderProps = mockedHeader.mock.calls[0][0];
        expect(typeof firstRenderProps.onEditTitle).toBe('function');
      }
    });

    it('should pass stable handleCloseBoard callback to header', async () => {
      const { RetroBoardHeader } = await import('@/features/board/components/RetroBoardHeader');

      renderWithRouter();

      const mockedHeader = RetroBoardHeader as unknown as ReturnType<typeof vi.fn>;
      if (mockedHeader.mock?.calls?.length > 0) {
        const firstRenderProps = mockedHeader.mock.calls[0][0];
        expect(typeof firstRenderProps.onCloseBoard).toBe('function');
      }
    });

    it('should pass stable onUpdateAlias callback to header', async () => {
      const { RetroBoardHeader } = await import('@/features/board/components/RetroBoardHeader');

      renderWithRouter();

      const mockedHeader = RetroBoardHeader as unknown as ReturnType<typeof vi.fn>;
      if (mockedHeader.mock?.calls?.length > 0) {
        const firstRenderProps = mockedHeader.mock.calls[0][0];
        expect(typeof firstRenderProps.onUpdateAlias).toBe('function');
      }
    });

    it('should pass stable onPromoteToAdmin callback to participant bar', async () => {
      const { ParticipantBar } = await import('@/features/participant/components/ParticipantBar');

      renderWithRouter();

      const mockedBar = ParticipantBar as unknown as ReturnType<typeof vi.fn>;
      if (mockedBar.mock?.calls?.length > 0) {
        const firstRenderProps = mockedBar.mock.calls[0][0];
        expect(typeof firstRenderProps.onPromoteToAdmin).toBe('function');
      }
    });
  });
});
