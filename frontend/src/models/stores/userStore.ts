/**
 * User Store
 * Zustand store for user session state management
 */

import { create } from 'zustand';
import type { UserSession, ActiveUser } from '../types';

// ============================================================================
// State Interface
// ============================================================================

interface UserStoreState {
  // State
  currentUser: UserSession | null;
  activeUsers: ActiveUser[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentUser: (user: UserSession) => void;
  updateAlias: (newAlias: string) => void;
  addActiveUser: (user: ActiveUser) => void;
  removeUser: (alias: string) => void;
  setActiveUsers: (users: ActiveUser[]) => void;
  updateHeartbeat: (alias: string, lastActiveAt: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearUser: () => void;

  // Selectors
  isCurrentUserAdmin: () => boolean;
  getActiveUser: (alias: string) => ActiveUser | undefined;
  getActiveUserCount: () => number;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useUserStore = create<UserStoreState>((set, get) => ({
  // Initial State
  currentUser: null,
  activeUsers: [],
  isLoading: false,
  error: null,

  // Actions
  setCurrentUser: (user) =>
    set({
      currentUser: user,
      isLoading: false,
      error: null,
    }),

  updateAlias: (newAlias) =>
    set((state) => {
      const currentAlias = state.currentUser?.alias;
      return {
        currentUser: state.currentUser ? { ...state.currentUser, alias: newAlias } : null,
        // Also update in active users list (only if we have a current user)
        activeUsers: currentAlias
          ? state.activeUsers.map((user) =>
              user.alias === currentAlias ? { ...user, alias: newAlias } : user
            )
          : state.activeUsers,
      };
    }),

  addActiveUser: (user) =>
    set((state) => {
      // Check if user already exists (by alias)
      const existingIndex = state.activeUsers.findIndex((u) => u.alias === user.alias);
      if (existingIndex >= 0) {
        // Update existing user
        const newUsers = [...state.activeUsers];
        newUsers[existingIndex] = user;
        return { activeUsers: newUsers };
      }
      // Add new user
      return { activeUsers: [...state.activeUsers, user] };
    }),

  removeUser: (alias) =>
    set((state) => ({
      activeUsers: state.activeUsers.filter((user) => user.alias !== alias),
    })),

  setActiveUsers: (users) =>
    set({
      activeUsers: users,
      isLoading: false,
    }),

  updateHeartbeat: (alias, lastActiveAt) =>
    set((state) => ({
      activeUsers: state.activeUsers.map((user) =>
        user.alias === alias ? { ...user, last_active_at: lastActiveAt } : user
      ),
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  clearUser: () =>
    set({
      currentUser: null,
      activeUsers: [],
      isLoading: false,
      error: null,
    }),

  // Selectors
  isCurrentUserAdmin: () => {
    const { currentUser } = get();
    return currentUser?.is_admin ?? false;
  },

  getActiveUser: (alias) => {
    const { activeUsers } = get();
    return activeUsers.find((user) => user.alias === alias);
  },

  getActiveUserCount: () => get().activeUsers.length,
}));

// ============================================================================
// Standalone Selectors (for use outside React components)
// ============================================================================

export const userSelectors = {
  getCurrentUser: () => useUserStore.getState().currentUser,
  getActiveUsers: () => useUserStore.getState().activeUsers,
  isAdmin: () => useUserStore.getState().currentUser?.is_admin ?? false,
  isLoading: () => useUserStore.getState().isLoading,
  getError: () => useUserStore.getState().error,
};
