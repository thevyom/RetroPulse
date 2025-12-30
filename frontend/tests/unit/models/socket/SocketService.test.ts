/**
 * SocketService Tests
 * Tests for WebSocket service functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { io } from 'socket.io-client';
import { SocketService } from '@/models/socket/SocketService';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(),
}));

describe('SocketService', () => {
  let service: SocketService;
  let mockSocket: {
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Create fresh mock socket for each test
    mockSocket = {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
    };

    vi.mocked(io).mockReturnValue(mockSocket as never);

    // Create fresh service instance
    service = new SocketService();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // ============================================================================
  // connect Tests
  // ============================================================================

  describe('connect', () => {
    it('should establish socket connection', () => {
      service.connect('board-123');

      expect(io).toHaveBeenCalled();
    });

    it('should configure socket with correct options', () => {
      service.connect('board-123');

      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          withCredentials: true,
          reconnection: true,
          transports: ['websocket', 'polling'],
        })
      );
    });

    it('should emit join-board event on connect', () => {
      service.connect('board-123', 'Alice');

      // Simulate connect event
      const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
      connectHandler?.();

      expect(mockSocket.emit).toHaveBeenCalledWith('join-board', {
        boardId: 'board-123',
        userAlias: 'Alice',
      });
    });

    it('should disconnect from previous board when connecting to new one', () => {
      service.connect('board-123');

      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
      connectHandler?.();

      // Connect to different board
      service.connect('board-456');

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should not reconnect if already connected to same board', () => {
      service.connect('board-123');

      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
      connectHandler?.();

      // Reset mock to check if io is called again
      vi.mocked(io).mockClear();

      // Try to connect to same board
      service.connect('board-123');

      expect(io).not.toHaveBeenCalled();
    });

    it('should set up disconnect handler', () => {
      service.connect('board-123');

      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should set up connect_error handler', () => {
      service.connect('board-123');

      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    });
  });

  // ============================================================================
  // disconnect Tests
  // ============================================================================

  describe('disconnect', () => {
    it('should emit leave-board before disconnecting', () => {
      service.connect('board-123');

      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
      connectHandler?.();

      service.disconnect();

      expect(mockSocket.emit).toHaveBeenCalledWith('leave-board', {
        boardId: 'board-123',
      });
    });

    it('should call socket disconnect', () => {
      service.connect('board-123');
      service.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnect when not connected', () => {
      // Should not throw
      expect(() => service.disconnect()).not.toThrow();
    });

    it('should clear boardId after disconnect', () => {
      service.connect('board-123');
      service.disconnect();

      expect(service.boardId).toBeNull();
    });

    it('should set connected to false', () => {
      service.connect('board-123');

      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
      connectHandler?.();

      service.disconnect();

      expect(service.connected).toBe(false);
    });
  });

  // ============================================================================
  // on Tests
  // ============================================================================

  describe('on', () => {
    it('should subscribe to events', () => {
      service.connect('board-123');
      const handler = vi.fn();

      service.on('card:created', handler);

      expect(mockSocket.on).toHaveBeenCalledWith('card:created', handler);
    });

    it('should warn when socket not connected', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const handler = vi.fn();

      service.on('card:created', handler);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Socket not connected. Cannot subscribe to event:',
        'card:created'
      );
      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // off Tests
  // ============================================================================

  describe('off', () => {
    it('should unsubscribe from events with handler', () => {
      service.connect('board-123');
      const handler = vi.fn();

      service.off('card:created', handler);

      expect(mockSocket.off).toHaveBeenCalledWith('card:created', handler);
    });

    it('should unsubscribe from all handlers when no handler provided', () => {
      service.connect('board-123');

      service.off('card:created');

      expect(mockSocket.off).toHaveBeenCalledWith('card:created');
    });

    it('should handle off when not connected', () => {
      // Should not throw
      expect(() => service.off('card:created')).not.toThrow();
    });
  });

  // ============================================================================
  // emit Tests
  // ============================================================================

  describe('emit', () => {
    it('should emit events when connected', () => {
      service.connect('board-123');

      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
      connectHandler?.();

      service.emit('heartbeat', { boardId: 'board-123' });

      expect(mockSocket.emit).toHaveBeenCalledWith('heartbeat', {
        boardId: 'board-123',
      });
    });

    it('should queue events when not connected', () => {
      service.connect('board-123');
      // Note: Not simulating connect, so service is not "connected"

      service.emit('heartbeat', { boardId: 'board-123' });

      // Event should be queued, not emitted yet
      // The queued event will be emitted on connect
      const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
      connectHandler?.();

      // Now the queued event should be emitted along with join-board
      expect(mockSocket.emit).toHaveBeenCalledWith('heartbeat', {
        boardId: 'board-123',
      });
    });
  });

  // ============================================================================
  // Heartbeat Tests
  // ============================================================================

  describe('Heartbeat', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should start heartbeat on connect', () => {
      service.connect('board-123', 'Alice');

      // Simulate connect
      const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
      connectHandler?.();

      // Advance time by heartbeat interval (60 seconds)
      vi.advanceTimersByTime(60000);

      // Heartbeat should have been emitted
      expect(mockSocket.emit).toHaveBeenCalledWith('heartbeat', {
        boardId: 'board-123',
        alias: 'Alice',
      });
    });

    it('should stop heartbeat on disconnect', () => {
      service.connect('board-123', 'Alice');

      // Simulate connect
      const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
      connectHandler?.();

      service.disconnect();

      // Clear previous calls
      mockSocket.emit.mockClear();

      // Advance time
      vi.advanceTimersByTime(60000);

      // Heartbeat should not be emitted after disconnect
      expect(mockSocket.emit).not.toHaveBeenCalledWith('heartbeat', expect.anything());
    });
  });

  // ============================================================================
  // Property Tests
  // ============================================================================

  describe('connected property', () => {
    it('should return false initially', () => {
      expect(service.connected).toBe(false);
    });

    it('should return true after connection', () => {
      service.connect('board-123');

      // Simulate connect
      const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
      connectHandler?.();

      expect(service.connected).toBe(true);
    });

    it('should return false after disconnect event', () => {
      service.connect('board-123');

      // Simulate connect
      const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
      connectHandler?.();

      // Simulate disconnect event
      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'disconnect'
      )?.[1];
      disconnectHandler?.();

      expect(service.connected).toBe(false);
    });
  });

  describe('boardId property', () => {
    it('should return null initially', () => {
      expect(service.boardId).toBeNull();
    });

    it('should return current board ID after connect', () => {
      service.connect('board-123');

      expect(service.boardId).toBe('board-123');
    });
  });

  describe('getSocket', () => {
    it('should return null when not connected', () => {
      expect(service.getSocket()).toBeNull();
    });

    it('should return socket instance when connected', () => {
      service.connect('board-123');

      expect(service.getSocket()).toBe(mockSocket);
    });
  });

  // ============================================================================
  // Reconnection Tests
  // ============================================================================

  describe('Reconnection', () => {
    it('should configure exponential backoff', () => {
      service.connect('board-123');

      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          reconnectionDelay: 1000,
          reconnectionDelayMax: 30000,
          reconnectionAttempts: 10,
        })
      );
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should log connection errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      service.connect('board-123');

      // Simulate connect_error
      const errorHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect_error'
      )?.[1];
      errorHandler?.(new Error('Connection failed'));

      expect(consoleSpy).toHaveBeenCalledWith('Socket connection error:', 'Connection failed');
      consoleSpy.mockRestore();
    });

    it('should set connected to false on connect_error', () => {
      service.connect('board-123');

      // First simulate connection
      const connectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
      connectHandler?.();

      expect(service.connected).toBe(true);

      // Then simulate error
      const errorHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect_error'
      )?.[1];
      errorHandler?.(new Error('Connection failed'));

      expect(service.connected).toBe(false);
    });
  });
});
