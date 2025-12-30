/**
 * WebSocket Service
 * Manages Socket.io connection for real-time events
 */

import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketEventType,
  SocketEventPayload,
} from './socket-types';

// ============================================================================
// Configuration
// ============================================================================

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

// Reconnection settings
const RECONNECTION_DELAY = 1000; // 1 second initial delay
const RECONNECTION_DELAY_MAX = 30000; // 30 seconds max delay
const RECONNECTION_ATTEMPTS = 10;

// Heartbeat interval (30 seconds - must be less than backend's 35s timeout)
const HEARTBEAT_INTERVAL = 30000;

// Maximum queued events to prevent memory issues during extended disconnection
const MAX_EVENT_QUEUE_SIZE = 100;

// ============================================================================
// Types
// ============================================================================

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

type EventHandler<T extends SocketEventType> = (data: SocketEventPayload<T>) => void;

interface QueuedEvent {
  event: string;
  data: unknown;
}

// ============================================================================
// SocketService Class
// ============================================================================

class SocketServiceImpl {
  private socket: TypedSocket | null = null;
  private currentBoardId: string | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private eventQueue: QueuedEvent[] = [];
  private isConnected = false;

  /**
   * Connect to the WebSocket server and join a board room
   * @param boardId - The board to join
   * @param userAlias - Optional user alias
   */
  connect(boardId: string, userAlias?: string): void {
    // Disconnect from previous board if connected
    if (this.socket && this.currentBoardId !== boardId) {
      this.disconnect();
    }

    // Don't reconnect if already connected to the same board
    if (this.socket && this.currentBoardId === boardId && this.isConnected) {
      return;
    }

    this.currentBoardId = boardId;

    this.socket = io(WS_URL, {
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: RECONNECTION_DELAY,
      reconnectionDelayMax: RECONNECTION_DELAY_MAX,
      reconnectionAttempts: RECONNECTION_ATTEMPTS,
      transports: ['websocket', 'polling'],
    });

    // Set up connection handlers
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.socket?.emit('join-board', { boardId, userAlias });
      this.startHeartbeat(boardId, userAlias);
      this.flushEventQueue();
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.stopHeartbeat();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      this.isConnected = false;
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      if (this.currentBoardId) {
        this.socket.emit('leave-board', { boardId: this.currentBoardId });
      }
      this.socket.disconnect();
      this.socket = null;
    }

    this.stopHeartbeat();
    this.currentBoardId = null;
    this.isConnected = false;
    this.eventQueue = [];
  }

  /**
   * Subscribe to a server event
   * @param event - Event name
   * @param handler - Event handler function
   */
  on<T extends SocketEventType>(event: T, handler: EventHandler<T>): void {
    if (!this.socket) {
      console.warn('Socket not connected. Cannot subscribe to event:', event);
      return;
    }
    // Type assertion needed due to Socket.io typing limitations
    (
      this.socket as unknown as {
        on: (event: string, handler: (...args: unknown[]) => void) => void;
      }
    ).on(event, handler as unknown as (...args: unknown[]) => void);
  }

  /**
   * Unsubscribe from a server event
   * @param event - Event name
   * @param handler - Optional specific handler to remove
   */
  off<T extends SocketEventType>(event: T, handler?: EventHandler<T>): void {
    if (!this.socket) return;

    const sock = this.socket as unknown as {
      off: (event: string, handler?: (...args: unknown[]) => void) => void;
    };

    if (handler) {
      sock.off(event, handler as unknown as (...args: unknown[]) => void);
    } else {
      sock.off(event);
    }
  }

  /**
   * Emit an event to the server
   * @param event - Event name
   * @param data - Event data
   */
  emit<T extends keyof ClientToServerEvents>(
    event: T,
    data: Parameters<ClientToServerEvents[T]>[0]
  ): void {
    if (!this.socket || !this.isConnected) {
      // Queue event for when connection is restored (with size limit)
      if (this.eventQueue.length < MAX_EVENT_QUEUE_SIZE) {
        this.eventQueue.push({ event: event as string, data });
      }
      return;
    }

    (this.socket as unknown as { emit: (event: string, data: unknown) => void }).emit(
      event as string,
      data
    );
  }

  /**
   * Check if socket is currently connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Get the current board ID
   */
  get boardId(): string | null {
    return this.currentBoardId;
  }

  /**
   * Get the underlying socket instance (for testing)
   */
  getSocket(): TypedSocket | null {
    return this.socket;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private startHeartbeat(boardId: string, alias?: string): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.socket) {
        this.socket.emit('heartbeat', { boardId, alias });
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private flushEventQueue(): void {
    while (this.eventQueue.length > 0 && this.isConnected && this.socket) {
      const queued = this.eventQueue.shift();
      if (queued) {
        (this.socket as unknown as { emit: (event: string, data: unknown) => void }).emit(
          queued.event,
          queued.data
        );
      }
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const socketService = new SocketServiceImpl();

// Export class for testing purposes
export { SocketServiceImpl as SocketService };
