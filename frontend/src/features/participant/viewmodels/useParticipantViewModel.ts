/**
 * Participant ViewModel Hook
 * Manages participant state, heartbeat, and filter operations following MVVM pattern
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUserStore } from '../../../models/stores/userStore';
import { useBoardStore } from '../../../models/stores/boardStore';
import { BoardAPI } from '../../../models/api/BoardAPI';
import { socketService } from '../../../models/socket/SocketService';
import type { UserSession, ActiveUser } from '../../../models/types';
import { validateAlias } from '../../../shared/validation';

// ============================================================================
// Constants
// ============================================================================

const HEARTBEAT_INTERVAL = 60000; // 60 seconds

// ============================================================================
// Options
// ============================================================================

export interface UseParticipantViewModelOptions {
  /**
   * Automatically fetch participants on mount. Default: true
   * Set to false in tests to control when data fetching occurs.
   */
  autoFetch?: boolean;
}

// ============================================================================
// Types
// ============================================================================

export interface UseParticipantViewModelResult {
  // State
  activeUsers: ActiveUser[];
  currentUser: UserSession | null;
  isLoading: boolean;
  error: string | null;

  // Filter state
  showAll: boolean;
  showAnonymous: boolean;
  showOnlyAnonymous: boolean;
  selectedUsers: string[];

  // Derived state
  isCurrentUserCreator: boolean;

  // Actions
  handleUpdateAlias: (newAlias: string) => Promise<void>;
  handlePromoteToAdmin: (userHash: string) => Promise<void>;

  // Filter actions
  handleToggleAllUsersFilter: () => void;
  handleToggleAnonymousFilter: () => void;
  handleToggleUserFilter: (alias: string) => void;
  handleClearFilters: () => void;

  // Other actions
  sendHeartbeat: () => Promise<void>;
  refetchActiveUsers: () => Promise<void>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useParticipantViewModel(
  boardId: string,
  options: UseParticipantViewModelOptions = {}
): UseParticipantViewModelResult {
  const { autoFetch = true } = options;
  // Store state
  const currentUser = useUserStore((state) => state.currentUser);
  const activeUsers = useUserStore((state) => state.activeUsers);
  const storeIsLoading = useUserStore((state) => state.isLoading);
  const storeError = useUserStore((state) => state.error);
  const setCurrentUser = useUserStore((state) => state.setCurrentUser);
  const updateAlias = useUserStore((state) => state.updateAlias);
  const setActiveUsers = useUserStore((state) => state.setActiveUsers);
  const addActiveUser = useUserStore((state) => state.addActiveUser);
  const updateHeartbeat = useUserStore((state) => state.updateHeartbeat);
  const setLoading = useUserStore((state) => state.setLoading);
  const setError = useUserStore((state) => state.setError);

  const board = useBoardStore((state) => state.board);
  const addAdmin = useBoardStore((state) => state.addAdmin);

  // Local state
  const [operationError, setOperationError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(true);
  const [showAnonymous, setShowAnonymous] = useState(true);
  const [showOnlyAnonymous, setShowOnlyAnonymous] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Heartbeat interval ref
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ref for heartbeat callback to avoid interval restart on alias change
  const sendHeartbeatRef = useRef<(() => Promise<void>) | undefined>(undefined);

  // Combined error
  const error = operationError || storeError;

  // ============================================================================
  // Derived State
  // ============================================================================

  const isCurrentUserCreator = board?.admins[0] === currentUser?.cookie_hash;

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchActiveUsers = useCallback(async () => {
    if (!boardId) return;

    setLoading(true);
    setOperationError(null);

    try {
      const response = await BoardAPI.getActiveUsers(boardId);
      setActiveUsers(response.active_users);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load active users';
      setError(message);
    }
  }, [boardId, setActiveUsers, setLoading, setError]);

  const fetchCurrentUserSession = useCallback(async () => {
    if (!boardId) return;

    try {
      const session = await BoardAPI.getCurrentUserSession(boardId);
      if (session) {
        setCurrentUser(session);
      }
    } catch (err) {
      // Non-critical - session might not exist yet
      console.warn('Could not fetch current user session:', err);
    }
  }, [boardId, setCurrentUser]);

  // Load active users on mount (unless autoFetch is disabled)
  useEffect(() => {
    if (autoFetch) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Data fetching on mount is intentional
      void fetchActiveUsers();
      void fetchCurrentUserSession();
    }
  }, [autoFetch, fetchActiveUsers, fetchCurrentUserSession]);

  // ============================================================================
  // Heartbeat
  // ============================================================================

  const sendHeartbeat = useCallback(async () => {
    if (!boardId) return;

    try {
      const response = await BoardAPI.sendHeartbeat(boardId);
      // Update current user's last_active_at - use fresh state to avoid stale closure
      const currentAlias = useUserStore.getState().currentUser?.alias;
      if (currentAlias) {
        updateHeartbeat(currentAlias, response.last_active_at);
      }
    } catch (err) {
      // Heartbeat failures are non-critical, just log
      console.warn('Heartbeat failed:', err);
    }
  }, [boardId, updateHeartbeat]);

  // Keep ref updated with latest sendHeartbeat - must be in useEffect per React Compiler rules
  useEffect(() => {
    sendHeartbeatRef.current = sendHeartbeat;
  }, [sendHeartbeat]);

  // Set up heartbeat interval - only depends on boardId to avoid unnecessary restarts
  // Disabled when autoFetch is false (test mode)
  useEffect(() => {
    if (!boardId || !autoFetch) return;

    // Start heartbeat interval using ref to always get latest callback
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeatRef.current?.();
    }, HEARTBEAT_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [boardId, autoFetch]);

  // ============================================================================
  // Socket Event Handlers
  // ============================================================================

  useEffect(() => {
    if (!boardId) return;

    const handleUserJoined = (event: { board_id: string; alias: string; is_admin: boolean }) => {
      if (event.board_id === boardId) {
        const newUser: ActiveUser = {
          alias: event.alias,
          is_admin: event.is_admin,
          last_active_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        addActiveUser(newUser);
      }
    };

    const handleUserLeft = (event: { board_id: string; alias: string }) => {
      if (event.board_id === boardId) {
        // User left events might require refreshing the list
        fetchActiveUsers();
      }
    };

    const handleAliasChanged = (event: {
      board_id: string;
      old_alias: string;
      new_alias: string;
    }) => {
      if (event.board_id === boardId) {
        // Update alias in active users list using fresh state to avoid stale closure
        const currentUsers = useUserStore.getState().activeUsers;
        const updatedUsers = currentUsers.map((user) =>
          user.alias === event.old_alias ? { ...user, alias: event.new_alias } : user
        );
        setActiveUsers(updatedUsers);
      }
    };

    // Subscribe to events
    socketService.on('user:joined', handleUserJoined);
    socketService.on('user:left', handleUserLeft);
    socketService.on('user:alias_changed', handleAliasChanged);

    return () => {
      socketService.off('user:joined', handleUserJoined);
      socketService.off('user:left', handleUserLeft);
      socketService.off('user:alias_changed', handleAliasChanged);
    };
  }, [boardId, addActiveUser, setActiveUsers, fetchActiveUsers]);

  // ============================================================================
  // Actions
  // ============================================================================

  const handleUpdateAlias = useCallback(
    async (newAlias: string): Promise<void> => {
      if (!boardId) return;

      // Validate alias
      const validation = validateAlias(newAlias);
      if (!validation.isValid) {
        setOperationError(validation.error || 'Invalid alias');
        throw new Error(validation.error || 'Invalid alias');
      }

      // Check if board is closed
      if (board?.state === 'closed') {
        setOperationError('Cannot update alias on a closed board');
        throw new Error('Cannot update alias on a closed board');
      }

      setOperationError(null);

      try {
        const response = await BoardAPI.updateAlias(boardId, { alias: newAlias });
        updateAlias(response.alias);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update alias';
        setOperationError(message);
        throw err;
      }
    },
    [boardId, board?.state, updateAlias]
  );

  const handlePromoteToAdmin = useCallback(
    async (userCookieHash: string): Promise<void> => {
      if (!boardId) return;

      // Only creator can promote
      if (!isCurrentUserCreator) {
        setOperationError('Only the board creator can promote users to admin');
        throw new Error('Only the board creator can promote users to admin');
      }

      // Check if board is closed
      if (board?.state === 'closed') {
        setOperationError('Cannot promote admin on a closed board');
        throw new Error('Cannot promote admin on a closed board');
      }

      // Check if already admin
      if (board?.admins.includes(userCookieHash)) {
        setOperationError('User is already an admin');
        throw new Error('User is already an admin');
      }

      setOperationError(null);

      try {
        await BoardAPI.addAdmin(boardId, { user_cookie_hash: userCookieHash });
        addAdmin(userCookieHash);
        // Refresh active users to update their admin status
        await fetchActiveUsers();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to promote user';
        setOperationError(message);
        throw err;
      }
    },
    [boardId, board?.state, board?.admins, isCurrentUserCreator, addAdmin, fetchActiveUsers]
  );

  // ============================================================================
  // Filter Actions
  // ============================================================================

  const handleToggleAllUsersFilter = useCallback(() => {
    setShowAll((prev) => {
      const newValue = !prev;
      if (newValue) {
        setSelectedUsers([]);
      }
      return newValue;
    });
  }, []);

  const handleToggleAnonymousFilter = useCallback(() => {
    setShowOnlyAnonymous((prev) => {
      const newValue = !prev;
      if (newValue) {
        // When enabling anonymous-only mode, clear user filters
        setSelectedUsers([]);
        setShowAll(false);
      } else {
        // When disabling, show all cards
        setShowAll(true);
      }
      return newValue;
    });
  }, []);

  const handleToggleUserFilter = useCallback((alias: string) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.includes(alias);
      const newSelected = isSelected ? prev.filter((a) => a !== alias) : [...prev, alias];

      // If no users selected, show all
      if (newSelected.length === 0) {
        setShowAll(true);
      } else {
        setShowAll(false);
        // User filters are mutually exclusive with anonymous-only
        setShowOnlyAnonymous(false);
      }

      return newSelected;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setShowAll(true);
    setShowAnonymous(true);
    setShowOnlyAnonymous(false);
    setSelectedUsers([]);
  }, []);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    activeUsers,
    currentUser,
    isLoading: storeIsLoading,
    error,

    // Filter state
    showAll,
    showAnonymous,
    showOnlyAnonymous,
    selectedUsers,

    // Derived state
    isCurrentUserCreator,

    // Actions
    handleUpdateAlias,
    handlePromoteToAdmin,

    // Filter actions
    handleToggleAllUsersFilter,
    handleToggleAnonymousFilter,
    handleToggleUserFilter,
    handleClearFilters,

    // Other actions
    sendHeartbeat,
    refetchActiveUsers: fetchActiveUsers,
  };
}
