/**
 * BoardAPI Service Tests
 * Tests for board-related API operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BoardAPI } from '@/models/api/BoardAPI';
import { apiClient } from '@/models/api/client';
import { ApiRequestError } from '@/models/types';
import type { Board, BoardResponse, JoinBoardResponse, ActiveUsersResponse } from '@/models/types';

// Mock the API client
vi.mock('@/models/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  extractData: <T>(response: { data: { data: T } }) => response.data.data,
}));

describe('BoardAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Test Data
  // ============================================================================

  const mockBoard: Board = {
    id: 'board-123',
    name: 'Sprint 42 Retro',
    shareable_link: 'https://app.retroboard.com/board/board-123',
    state: 'active',
    closed_at: null,
    columns: [
      { id: 'col-1', name: 'What Went Well', color: '#D5E8D4' },
      { id: 'col-2', name: 'Improvements', color: '#FFE6CC' },
    ],
    admins: ['admin-hash'],
    active_users: [],
    card_limit_per_user: 5,
    reaction_limit_per_user: 10,
    created_at: '2025-12-29T00:00:00Z',
    created_by_hash: 'admin-hash',
  };

  const mockBoardResponse: BoardResponse = {
    id: 'board-123',
    name: 'Sprint 42 Retro',
    shareable_link: 'https://app.retroboard.com/board/board-123',
    state: 'active',
    columns: mockBoard.columns,
    created_at: '2025-12-29T00:00:00Z',
    created_by_hash: 'admin-hash',
    admins: ['admin-hash'],
    card_limit_per_user: 5,
    reaction_limit_per_user: 10,
  };

  // ============================================================================
  // getBoard Tests
  // ============================================================================

  describe('getBoard', () => {
    it('should make GET request with correct URL', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { success: true, data: mockBoard },
      });

      await BoardAPI.getBoard('board-123');

      expect(apiClient.get).toHaveBeenCalledWith('/boards/board-123');
    });

    it('should return board data', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { success: true, data: mockBoard },
      });

      const result = await BoardAPI.getBoard('board-123');

      expect(result).toEqual(mockBoard);
    });

    it('should return board with embedded columns', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { success: true, data: mockBoard },
      });

      const result = await BoardAPI.getBoard('board-123');

      expect(result.columns).toHaveLength(2);
      expect(result.columns[0].name).toBe('What Went Well');
    });
  });

  // ============================================================================
  // createBoard Tests
  // ============================================================================

  describe('createBoard', () => {
    it('should make POST request with correct payload', async () => {
      const createData = {
        name: 'New Sprint Retro',
        columns: [{ name: 'Went Well', color: '#D5E8D4' }],
        card_limit_per_user: 5,
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: { success: true, data: mockBoardResponse },
      });

      await BoardAPI.createBoard(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/boards', createData);
    });

    it('should return created board', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { success: true, data: mockBoardResponse },
      });

      const result = await BoardAPI.createBoard({
        name: 'New Board',
        columns: [],
      });

      expect(result.id).toBe('board-123');
    });
  });

  // ============================================================================
  // joinBoard Tests
  // ============================================================================

  describe('joinBoard', () => {
    const mockJoinResponse: JoinBoardResponse = {
      board_id: 'board-123',
      user_session: {
        cookie_hash: 'user-hash',
        alias: 'Alice',
        is_admin: false,
        last_active_at: '2025-12-29T00:00:00Z',
        created_at: '2025-12-29T00:00:00Z',
      },
    };

    it('should make POST request with alias', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { success: true, data: mockJoinResponse },
      });

      await BoardAPI.joinBoard('board-123', { alias: 'Alice' });

      expect(apiClient.post).toHaveBeenCalledWith('/boards/board-123/join', {
        alias: 'Alice',
      });
    });

    it('should return user session', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { success: true, data: mockJoinResponse },
      });

      const result = await BoardAPI.joinBoard('board-123', { alias: 'Alice' });

      expect(result.user_session.alias).toBe('Alice');
      expect(result.user_session.is_admin).toBe(false);
    });
  });

  // ============================================================================
  // updateBoardName Tests
  // ============================================================================

  describe('updateBoardName', () => {
    it('should make PATCH request with new name', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: { success: true, data: { id: 'board-123', name: 'Updated Name' } },
      });

      await BoardAPI.updateBoardName('board-123', { name: 'Updated Name' });

      expect(apiClient.patch).toHaveBeenCalledWith('/boards/board-123/name', {
        name: 'Updated Name',
      });
    });

    it('should return updated board info', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: { success: true, data: { id: 'board-123', name: 'Updated Name' } },
      });

      const result = await BoardAPI.updateBoardName('board-123', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });
  });

  // ============================================================================
  // closeBoard Tests
  // ============================================================================

  describe('closeBoard', () => {
    it('should make PATCH request to close endpoint', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: {
          success: true,
          data: {
            id: 'board-123',
            state: 'closed',
            closed_at: '2025-12-29T12:00:00Z',
          },
        },
      });

      await BoardAPI.closeBoard('board-123');

      expect(apiClient.patch).toHaveBeenCalledWith('/boards/board-123/close');
    });

    it('should return closed board info with timestamp', async () => {
      const closedAt = '2025-12-29T12:00:00Z';
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: {
          success: true,
          data: { id: 'board-123', state: 'closed', closed_at: closedAt },
        },
      });

      const result = await BoardAPI.closeBoard('board-123');

      expect(result.state).toBe('closed');
      expect(result.closed_at).toBe(closedAt);
    });
  });

  // ============================================================================
  // addAdmin Tests
  // ============================================================================

  describe('addAdmin', () => {
    it('should make POST request with user hash', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: {
          success: true,
          data: { board_id: 'board-123', admins: ['admin-hash', 'new-admin'] },
        },
      });

      await BoardAPI.addAdmin('board-123', { user_cookie_hash: 'new-admin' });

      expect(apiClient.post).toHaveBeenCalledWith('/boards/board-123/admins', {
        user_cookie_hash: 'new-admin',
      });
    });
  });

  // ============================================================================
  // renameColumn Tests
  // ============================================================================

  describe('renameColumn', () => {
    it('should make PATCH request with column ID and name', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: {
          success: true,
          data: { board_id: 'board-123', column_id: 'col-1', name: 'New Name' },
        },
      });

      await BoardAPI.renameColumn('board-123', 'col-1', { name: 'New Name' });

      expect(apiClient.patch).toHaveBeenCalledWith('/boards/board-123/columns/col-1', {
        name: 'New Name',
      });
    });
  });

  // ============================================================================
  // deleteBoard Tests
  // ============================================================================

  describe('deleteBoard', () => {
    it('should make DELETE request', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: undefined });

      await BoardAPI.deleteBoard('board-123');

      expect(apiClient.delete).toHaveBeenCalledWith('/boards/board-123');
    });
  });

  // ============================================================================
  // User Session Methods Tests
  // ============================================================================

  describe('getActiveUsers', () => {
    const mockActiveUsers: ActiveUsersResponse = {
      active_users: [
        {
          alias: 'Alice',
          is_admin: true,
          last_active_at: '2025-12-29T00:00:00Z',
          created_at: '2025-12-29T00:00:00Z',
        },
        {
          alias: 'Bob',
          is_admin: false,
          last_active_at: '2025-12-29T00:00:00Z',
          created_at: '2025-12-29T00:00:00Z',
        },
      ],
      total_count: 2,
    };

    it('should make GET request for active users', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { success: true, data: mockActiveUsers },
      });

      await BoardAPI.getActiveUsers('board-123');

      expect(apiClient.get).toHaveBeenCalledWith('/boards/board-123/users');
    });

    it('should return active users list', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { success: true, data: mockActiveUsers },
      });

      const result = await BoardAPI.getActiveUsers('board-123');

      expect(result.active_users).toHaveLength(2);
      expect(result.total_count).toBe(2);
    });
  });

  describe('sendHeartbeat', () => {
    it('should make PATCH request for heartbeat', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: {
          success: true,
          data: { alias: 'Alice', last_active_at: '2025-12-29T00:00:00Z' },
        },
      });

      await BoardAPI.sendHeartbeat('board-123');

      expect(apiClient.patch).toHaveBeenCalledWith('/boards/board-123/users/heartbeat');
    });
  });

  describe('updateAlias', () => {
    it('should make PATCH request with new alias', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: {
          success: true,
          data: { alias: 'NewAlias', last_active_at: '2025-12-29T00:00:00Z' },
        },
      });

      await BoardAPI.updateAlias('board-123', { alias: 'NewAlias' });

      expect(apiClient.patch).toHaveBeenCalledWith('/boards/board-123/users/alias', {
        alias: 'NewAlias',
      });
    });
  });

  describe('getCurrentUserSession', () => {
    it('should return user session when found', async () => {
      const userSession = {
        cookie_hash: 'user-hash',
        alias: 'Alice',
        is_admin: true,
        last_active_at: '2025-12-29T00:00:00Z',
        created_at: '2025-12-29T00:00:00Z',
      };

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { success: true, data: { user_session: userSession } },
      });

      const result = await BoardAPI.getCurrentUserSession('board-123');

      expect(result).toEqual(userSession);
    });

    it('should return null when user not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(
        new ApiRequestError('USER_NOT_FOUND', 'User not found', 404)
      );

      const result = await BoardAPI.getCurrentUserSession('board-123');

      expect(result).toBeNull();
    });

    it('should rethrow other errors', async () => {
      const networkError = new ApiRequestError('NETWORK_ERROR', 'Network error', 500);
      vi.mocked(apiClient.get).mockRejectedValue(networkError);

      await expect(BoardAPI.getCurrentUserSession('board-123')).rejects.toThrow('Network error');
    });
  });
});
