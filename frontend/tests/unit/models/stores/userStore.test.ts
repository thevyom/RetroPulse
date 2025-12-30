/**
 * User Store Tests
 * Tests for Zustand user state management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useUserStore, userSelectors } from '@/models/stores/userStore';
import type { UserSession, ActiveUser } from '@/models/types';

describe('userStore', () => {
  // Reset store before each test
  beforeEach(() => {
    useUserStore.setState({
      currentUser: null,
      activeUsers: [],
      isLoading: false,
      error: null,
    });
  });

  // ============================================================================
  // Test Data
  // ============================================================================

  const mockUserSession: UserSession = {
    cookie_hash: 'user-hash-123',
    alias: 'Alice',
    is_admin: true,
    last_active_at: '2025-12-29T00:00:00Z',
    created_at: '2025-12-29T00:00:00Z',
  };

  const mockActiveUser: ActiveUser = {
    alias: 'Bob',
    is_admin: false,
    last_active_at: '2025-12-29T00:00:00Z',
    created_at: '2025-12-29T00:00:00Z',
  };

  // ============================================================================
  // Initial State Tests
  // ============================================================================

  describe('Initial State', () => {
    it('should have null currentUser initially', () => {
      expect(useUserStore.getState().currentUser).toBeNull();
    });

    it('should have empty activeUsers array initially', () => {
      expect(useUserStore.getState().activeUsers).toEqual([]);
    });

    it('should have isLoading false initially', () => {
      expect(useUserStore.getState().isLoading).toBe(false);
    });

    it('should have null error initially', () => {
      expect(useUserStore.getState().error).toBeNull();
    });
  });

  // ============================================================================
  // setCurrentUser Tests
  // ============================================================================

  describe('setCurrentUser', () => {
    it('should set current user', () => {
      useUserStore.getState().setCurrentUser(mockUserSession);

      expect(useUserStore.getState().currentUser).toEqual(mockUserSession);
    });

    it('should clear loading and error', () => {
      useUserStore.setState({ isLoading: true, error: 'Previous error' });

      useUserStore.getState().setCurrentUser(mockUserSession);

      expect(useUserStore.getState().isLoading).toBe(false);
      expect(useUserStore.getState().error).toBeNull();
    });
  });

  // ============================================================================
  // updateAlias Tests
  // ============================================================================

  describe('updateAlias', () => {
    it('should update current user alias', () => {
      useUserStore.getState().setCurrentUser(mockUserSession);

      useUserStore.getState().updateAlias('Alice (Updated)');

      expect(useUserStore.getState().currentUser?.alias).toBe('Alice (Updated)');
    });

    it('should update alias in active users list', () => {
      useUserStore.getState().setCurrentUser(mockUserSession);
      useUserStore.setState({
        activeUsers: [{ ...mockActiveUser, alias: 'Alice' }],
      });

      useUserStore.getState().updateAlias('Alice (Updated)');

      expect(useUserStore.getState().activeUsers[0].alias).toBe('Alice (Updated)');
    });

    it('should handle null currentUser gracefully', () => {
      useUserStore.getState().updateAlias('NewAlias');

      expect(useUserStore.getState().currentUser).toBeNull();
    });
  });

  // ============================================================================
  // addActiveUser Tests
  // ============================================================================

  describe('addActiveUser', () => {
    it('should add new active user', () => {
      useUserStore.getState().addActiveUser(mockActiveUser);

      expect(useUserStore.getState().activeUsers).toHaveLength(1);
      expect(useUserStore.getState().activeUsers[0].alias).toBe('Bob');
    });

    it('should update existing user by alias', () => {
      useUserStore.getState().addActiveUser(mockActiveUser);

      const updatedUser = {
        ...mockActiveUser,
        last_active_at: '2025-12-29T12:00:00Z',
      };
      useUserStore.getState().addActiveUser(updatedUser);

      expect(useUserStore.getState().activeUsers).toHaveLength(1);
      expect(useUserStore.getState().activeUsers[0].last_active_at).toBe('2025-12-29T12:00:00Z');
    });

    it('should add multiple different users', () => {
      useUserStore.getState().addActiveUser(mockActiveUser);
      useUserStore.getState().addActiveUser({
        ...mockActiveUser,
        alias: 'Charlie',
      });

      expect(useUserStore.getState().activeUsers).toHaveLength(2);
    });
  });

  // ============================================================================
  // removeUser Tests
  // ============================================================================

  describe('removeUser', () => {
    it('should remove user by alias', () => {
      useUserStore.getState().addActiveUser(mockActiveUser);
      useUserStore.getState().addActiveUser({
        ...mockActiveUser,
        alias: 'Charlie',
      });

      useUserStore.getState().removeUser('Bob');

      expect(useUserStore.getState().activeUsers).toHaveLength(1);
      expect(useUserStore.getState().activeUsers[0].alias).toBe('Charlie');
    });

    it('should handle non-existent user gracefully', () => {
      useUserStore.getState().addActiveUser(mockActiveUser);

      useUserStore.getState().removeUser('NonExistent');

      expect(useUserStore.getState().activeUsers).toHaveLength(1);
    });
  });

  // ============================================================================
  // setActiveUsers Tests
  // ============================================================================

  describe('setActiveUsers', () => {
    it('should set multiple active users', () => {
      const users = [
        mockActiveUser,
        { ...mockActiveUser, alias: 'Charlie' },
        { ...mockActiveUser, alias: 'Dave' },
      ];

      useUserStore.getState().setActiveUsers(users);

      expect(useUserStore.getState().activeUsers).toHaveLength(3);
    });

    it('should replace existing users', () => {
      useUserStore.getState().addActiveUser({ ...mockActiveUser, alias: 'OldUser' });

      useUserStore.getState().setActiveUsers([mockActiveUser]);

      expect(useUserStore.getState().activeUsers).toHaveLength(1);
      expect(useUserStore.getState().activeUsers[0].alias).toBe('Bob');
    });

    it('should clear loading state', () => {
      useUserStore.setState({ isLoading: true });

      useUserStore.getState().setActiveUsers([]);

      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  // ============================================================================
  // updateHeartbeat Tests
  // ============================================================================

  describe('updateHeartbeat', () => {
    it('should update user last_active_at timestamp', () => {
      useUserStore.getState().addActiveUser(mockActiveUser);

      const newTimestamp = '2025-12-29T12:00:00Z';
      useUserStore.getState().updateHeartbeat('Bob', newTimestamp);

      expect(useUserStore.getState().activeUsers[0].last_active_at).toBe(newTimestamp);
    });

    it('should not modify other users', () => {
      useUserStore.getState().addActiveUser(mockActiveUser);
      useUserStore.getState().addActiveUser({ ...mockActiveUser, alias: 'Charlie' });

      useUserStore.getState().updateHeartbeat('Bob', '2025-12-29T12:00:00Z');

      expect(useUserStore.getState().activeUsers[1].last_active_at).toBe('2025-12-29T00:00:00Z');
    });

    it('should handle non-existent user gracefully', () => {
      useUserStore.getState().addActiveUser(mockActiveUser);

      useUserStore.getState().updateHeartbeat('NonExistent', '2025-12-29T12:00:00Z');

      expect(useUserStore.getState().activeUsers[0].last_active_at).toBe('2025-12-29T00:00:00Z');
    });
  });

  // ============================================================================
  // setLoading Tests
  // ============================================================================

  describe('setLoading', () => {
    it('should set loading state to true', () => {
      useUserStore.getState().setLoading(true);

      expect(useUserStore.getState().isLoading).toBe(true);
    });

    it('should set loading state to false', () => {
      useUserStore.setState({ isLoading: true });

      useUserStore.getState().setLoading(false);

      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  // ============================================================================
  // setError Tests
  // ============================================================================

  describe('setError', () => {
    it('should set error message', () => {
      useUserStore.getState().setError('Failed to load users');

      expect(useUserStore.getState().error).toBe('Failed to load users');
    });

    it('should clear loading when setting error', () => {
      useUserStore.setState({ isLoading: true });

      useUserStore.getState().setError('Error occurred');

      expect(useUserStore.getState().isLoading).toBe(false);
    });

    it('should clear error with null', () => {
      useUserStore.setState({ error: 'Previous error' });

      useUserStore.getState().setError(null);

      expect(useUserStore.getState().error).toBeNull();
    });
  });

  // ============================================================================
  // clearUser Tests
  // ============================================================================

  describe('clearUser', () => {
    it('should reset all state to initial values', () => {
      useUserStore.setState({
        currentUser: mockUserSession,
        activeUsers: [mockActiveUser],
        isLoading: true,
        error: 'Some error',
      });

      useUserStore.getState().clearUser();

      expect(useUserStore.getState().currentUser).toBeNull();
      expect(useUserStore.getState().activeUsers).toEqual([]);
      expect(useUserStore.getState().isLoading).toBe(false);
      expect(useUserStore.getState().error).toBeNull();
    });
  });

  // ============================================================================
  // Selector Tests
  // ============================================================================

  describe('isCurrentUserAdmin', () => {
    it('should return true when current user is admin', () => {
      useUserStore.getState().setCurrentUser(mockUserSession);

      expect(useUserStore.getState().isCurrentUserAdmin()).toBe(true);
    });

    it('should return false when current user is not admin', () => {
      useUserStore.getState().setCurrentUser({
        ...mockUserSession,
        is_admin: false,
      });

      expect(useUserStore.getState().isCurrentUserAdmin()).toBe(false);
    });

    it('should return false when no current user', () => {
      expect(useUserStore.getState().isCurrentUserAdmin()).toBe(false);
    });
  });

  describe('getActiveUser', () => {
    it('should return user by alias', () => {
      useUserStore.getState().addActiveUser(mockActiveUser);

      const user = useUserStore.getState().getActiveUser('Bob');

      expect(user).toEqual(mockActiveUser);
    });

    it('should return undefined for non-existent user', () => {
      const user = useUserStore.getState().getActiveUser('NonExistent');

      expect(user).toBeUndefined();
    });
  });

  describe('getActiveUserCount', () => {
    it('should return count of active users', () => {
      useUserStore.getState().addActiveUser(mockActiveUser);
      useUserStore.getState().addActiveUser({ ...mockActiveUser, alias: 'Charlie' });

      expect(useUserStore.getState().getActiveUserCount()).toBe(2);
    });

    it('should return 0 when no active users', () => {
      expect(useUserStore.getState().getActiveUserCount()).toBe(0);
    });
  });

  // ============================================================================
  // Standalone Selectors Tests
  // ============================================================================

  describe('userSelectors', () => {
    it('getCurrentUser should return current user', () => {
      useUserStore.getState().setCurrentUser(mockUserSession);

      expect(userSelectors.getCurrentUser()).toEqual(mockUserSession);
    });

    it('getActiveUsers should return active users array', () => {
      useUserStore.getState().addActiveUser(mockActiveUser);

      expect(userSelectors.getActiveUsers()).toHaveLength(1);
    });

    it('isAdmin should return admin status', () => {
      useUserStore.getState().setCurrentUser(mockUserSession);

      expect(userSelectors.isAdmin()).toBe(true);
    });

    it('isAdmin should return false when no user', () => {
      expect(userSelectors.isAdmin()).toBe(false);
    });

    it('isLoading should return loading state', () => {
      useUserStore.setState({ isLoading: true });

      expect(userSelectors.isLoading()).toBe(true);
    });

    it('getError should return error message', () => {
      useUserStore.setState({ error: 'Test error' });

      expect(userSelectors.getError()).toBe('Test error');
    });
  });
});
