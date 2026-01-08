/**
 * Socket.io Gateway
 *
 * Manages WebSocket connections, room management, and event broadcasting.
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { sha256 } from '@/shared/utils/index.js';
import { env } from '@/shared/config/index.js';
import { logger } from '@/shared/logger/index.js';
import { websocketConnectionsActive, websocketEventsTotal } from '@/shared/metrics/index.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  EventType,
  EventPayload,
  JoinBoardData,
  UserLeftPayload,
} from './socket-types.js';

const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT_MS = 35000; // 35 seconds

export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>;
export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>;

export class SocketGateway {
  private io: TypedServer | null = null;

  /**
   * Initialize Socket.io server
   */
  initialize(httpServer: HttpServer): TypedServer {
    this.io = new Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>(
      httpServer,
      {
        cors: {
          origin: env.FRONTEND_URL,
          credentials: true,
          methods: ['GET', 'POST'],
        },
        pingInterval: HEARTBEAT_INTERVAL_MS,
        pingTimeout: HEARTBEAT_TIMEOUT_MS,
      }
    );

    // Authentication middleware
    this.io.use((socket, next) => {
      this.authenticateSocket(socket, next);
    });

    // Connection handler
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    logger.info('Socket.io gateway initialized');

    return this.io;
  }

  /**
   * Get the Socket.io server instance
   */
  getServer(): TypedServer | null {
    return this.io;
  }

  /**
   * Broadcast an event to all clients in a board room
   */
  broadcast(boardId: string, eventType: EventType, payload: EventPayload): void {
    if (!this.io) {
      logger.warn('Socket.io not initialized, cannot broadcast');
      return;
    }

    const roomName = this.getRoomName(boardId);
    this.io.to(roomName).emit(eventType as keyof ServerToClientEvents, payload as never);

    // Track outbound events
    websocketEventsTotal.inc({ event_type: eventType, direction: 'outbound' });

    logger.debug('Broadcasted event', {
      event: eventType,
      room: roomName,
    });
  }

  /**
   * Broadcast an event to all clients in a room except the sender
   */
  broadcastExcept(
    boardId: string,
    eventType: EventType,
    payload: EventPayload,
    excludeSocketId: string
  ): void {
    if (!this.io) {
      logger.warn('Socket.io not initialized, cannot broadcast');
      return;
    }

    const roomName = this.getRoomName(boardId);
    this.io
      .to(roomName)
      .except(excludeSocketId)
      .emit(eventType as keyof ServerToClientEvents, payload as never);

    // Track outbound events
    websocketEventsTotal.inc({ event_type: eventType, direction: 'outbound' });

    logger.debug('Broadcasted event (excluding sender)', {
      event: eventType,
      room: roomName,
      excludeSocketId,
    });
  }

  /**
   * Get the number of clients in a board room
   */
  async getRoomSize(boardId: string): Promise<number> {
    if (!this.io) {
      return 0;
    }

    const roomName = this.getRoomName(boardId);
    const sockets = await this.io.in(roomName).fetchSockets();
    return sockets.length;
  }

  /**
   * Disconnect all clients in a board room
   */
  async disconnectRoom(boardId: string): Promise<void> {
    if (!this.io) {
      return;
    }

    const roomName = this.getRoomName(boardId);
    const sockets = await this.io.in(roomName).fetchSockets();

    for (const socket of sockets) {
      socket.disconnect(true);
    }

    logger.info('Disconnected all clients from room', { room: roomName });
  }

  /**
   * Clean up resources
   */
  async close(): Promise<void> {
    if (this.io) {
      await new Promise<void>((resolve) => {
        this.io!.close(() => {
          resolve();
        });
      });
      this.io = null;
    }

    logger.info('Socket.io gateway closed');
  }

  // ===== Private Methods =====

  private getRoomName(boardId: string): string {
    return `board:${boardId}`;
  }

  private authenticateSocket(
    socket: TypedSocket,
    next: (err?: Error) => void
  ): void {
    try {
      const cookieHeader = socket.handshake.headers.cookie;

      if (!cookieHeader) {
        logger.debug('Socket connection without cookie');
        next();
        return;
      }

      // Parse cookies manually (simple format: key=value; key2=value2)
      const cookies: Record<string, string> = {};
      cookieHeader.split(';').forEach((pair) => {
        const [key, ...values] = pair.trim().split('=');
        if (key) {
          cookies[key] = values.join('=');
        }
      });

      const cookieId = cookies['retro_session_id'];

      if (!cookieId) {
        logger.debug('Socket connection without retro_session_id cookie');
        next();
        return;
      }

      // Hash the cookie ID using SHA-256
      const hashedCookieId = sha256(cookieId);
      socket.data.cookieHash = hashedCookieId;

      logger.debug('Socket authenticated', {
        socketId: socket.id,
        hashedCookieId: hashedCookieId.substring(0, 8) + '...',
      });

      next();
    } catch (error) {
      logger.error('Socket authentication error', { error });
      next(new Error('Authentication failed'));
    }
  }

  private handleConnection(socket: TypedSocket): void {
    // Increment active connections
    websocketConnectionsActive.inc();

    logger.info('Client connected', {
      socketId: socket.id,
      hasCookie: !!socket.data.cookieHash,
    });

    // Handle join-board event (supports both legacy string and new object format)
    socket.on('join-board', (data: string | JoinBoardData) => {
      websocketEventsTotal.inc({ event_type: 'join-board', direction: 'inbound' });
      this.handleJoinBoard(socket, data);
    });

    // Handle leave-board event
    socket.on('leave-board', (boardId: string) => {
      websocketEventsTotal.inc({ event_type: 'leave-board', direction: 'inbound' });
      this.handleLeaveBoard(socket, boardId);
    });

    // Handle heartbeat event
    socket.on('heartbeat', () => {
      websocketEventsTotal.inc({ event_type: 'heartbeat', direction: 'inbound' });
      this.handleHeartbeat(socket);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnect(socket, reason);
    });

    // Handle socket errors
    socket.on('error', (error) => {
      logger.error('Socket error', {
        socketId: socket.id,
        boardId: socket.data.currentBoardId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  private handleJoinBoard(socket: TypedSocket, data: string | JoinBoardData): void {
    // Parse data - support both legacy string format and new object format
    const boardId = typeof data === 'string' ? data : data.boardId;
    const userAlias = typeof data === 'object' ? data.userAlias : undefined;

    // Validate boardId format (MongoDB ObjectId: 24 hex characters)
    if (!boardId || typeof boardId !== 'string' || !/^[a-f\d]{24}$/i.test(boardId)) {
      logger.warn('Invalid boardId format in join-board', {
        socketId: socket.id,
        boardId: typeof boardId === 'string' ? boardId.substring(0, 30) : typeof boardId,
      });
      return;
    }

    // Leave any previous board room and emit user:left if we have alias
    if (socket.data.currentBoardId) {
      this.emitUserLeftIfNeeded(socket);
      const oldRoomName = this.getRoomName(socket.data.currentBoardId);
      socket.leave(oldRoomName);
      logger.debug('Left previous room', {
        socketId: socket.id,
        room: oldRoomName,
      });
    }

    // Join the new board room
    const roomName = this.getRoomName(boardId);
    socket.join(roomName);
    socket.data.currentBoardId = boardId;
    socket.data.userAlias = userAlias;

    logger.info('Client joined board room', {
      socketId: socket.id,
      boardId,
      userAlias,
      room: roomName,
    });
  }

  private handleLeaveBoard(socket: TypedSocket, boardId: string): void {
    // Emit user:left before leaving the room
    if (socket.data.currentBoardId === boardId) {
      this.emitUserLeftIfNeeded(socket);
      socket.data.currentBoardId = undefined;
      socket.data.userAlias = undefined;
    }

    const roomName = this.getRoomName(boardId);
    socket.leave(roomName);

    logger.info('Client left board room', {
      socketId: socket.id,
      boardId,
      room: roomName,
    });
  }

  private handleHeartbeat(socket: TypedSocket): void {
    logger.debug('Heartbeat received', {
      socketId: socket.id,
      boardId: socket.data.currentBoardId,
    });
  }

  private handleDisconnect(socket: TypedSocket, reason: string): void {
    // Decrement active connections
    websocketConnectionsActive.dec();

    // Emit user:left for the current board if we have the alias
    this.emitUserLeftIfNeeded(socket);

    logger.info('Client disconnected', {
      socketId: socket.id,
      reason,
      boardId: socket.data.currentBoardId,
      userAlias: socket.data.userAlias,
    });
  }

  /**
   * Emit user:left event if we have both boardId and userAlias
   */
  private emitUserLeftIfNeeded(socket: TypedSocket): void {
    const { currentBoardId, userAlias } = socket.data;

    if (currentBoardId && userAlias && this.io) {
      const roomName = this.getRoomName(currentBoardId);
      const payload: UserLeftPayload = {
        boardId: currentBoardId,
        userAlias,
      };

      this.io.to(roomName).emit('user:left', payload);

      // Log at info level for audit trail (user departures are important events)
      logger.info('User left board', {
        socketId: socket.id,
        boardId: currentBoardId,
        userAlias,
      });
    }
  }
}

// Singleton instance
export const socketGateway = new SocketGateway();
