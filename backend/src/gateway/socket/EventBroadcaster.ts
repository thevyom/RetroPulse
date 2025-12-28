/**
 * Event Broadcaster Interface
 *
 * Abstraction layer for services to emit real-time events without
 * directly depending on Socket.io.
 */

import type {
  EventType,
  EventPayload,
  BoardRenamedPayload,
  BoardClosedPayload,
  BoardDeletedPayload,
  CardCreatedPayload,
  CardUpdatedPayload,
  CardDeletedPayload,
  CardMovedPayload,
  CardLinkedPayload,
  CardUnlinkedPayload,
  ReactionAddedPayload,
  ReactionRemovedPayload,
  UserJoinedPayload,
  UserLeftPayload,
  UserAliasChangedPayload,
} from './socket-types.js';
import { socketGateway } from './SocketGateway.js';

/**
 * Interface for event broadcasting
 * Allows mocking in tests
 */
export interface IEventBroadcaster {
  broadcast(boardId: string, eventType: EventType, payload: EventPayload): void;

  // Board events
  boardRenamed(boardId: string, name: string): void;
  boardClosed(boardId: string, closedAt: string): void;
  boardDeleted(boardId: string): void;

  // Card events
  cardCreated(payload: CardCreatedPayload): void;
  cardUpdated(payload: CardUpdatedPayload): void;
  cardDeleted(boardId: string, cardId: string): void;
  cardMoved(payload: CardMovedPayload): void;
  cardLinked(payload: CardLinkedPayload): void;
  cardUnlinked(payload: CardUnlinkedPayload): void;

  // Reaction events
  reactionAdded(payload: ReactionAddedPayload): void;
  reactionRemoved(payload: ReactionRemovedPayload): void;

  // User events
  userJoined(payload: UserJoinedPayload): void;
  userLeft(payload: UserLeftPayload): void;
  userAliasChanged(payload: UserAliasChangedPayload): void;
}

/**
 * Event Broadcaster implementation using Socket.io gateway
 */
export class EventBroadcaster implements IEventBroadcaster {
  /**
   * Generic broadcast method
   */
  broadcast(boardId: string, eventType: EventType, payload: EventPayload): void {
    socketGateway.broadcast(boardId, eventType, payload);
  }

  // ===== Board Events =====

  boardRenamed(boardId: string, name: string): void {
    const payload: BoardRenamedPayload = { boardId, name };
    this.broadcast(boardId, 'board:renamed', payload);
  }

  boardClosed(boardId: string, closedAt: string): void {
    const payload: BoardClosedPayload = { boardId, closedAt };
    this.broadcast(boardId, 'board:closed', payload);
  }

  boardDeleted(boardId: string): void {
    const payload: BoardDeletedPayload = { boardId };
    this.broadcast(boardId, 'board:deleted', payload);
  }

  // ===== Card Events =====

  cardCreated(payload: CardCreatedPayload): void {
    this.broadcast(payload.boardId, 'card:created', payload);
  }

  cardUpdated(payload: CardUpdatedPayload): void {
    this.broadcast(payload.boardId, 'card:updated', payload);
  }

  cardDeleted(boardId: string, cardId: string): void {
    const payload: CardDeletedPayload = { boardId, cardId };
    this.broadcast(boardId, 'card:deleted', payload);
  }

  cardMoved(payload: CardMovedPayload): void {
    this.broadcast(payload.boardId, 'card:moved', payload);
  }

  cardLinked(payload: CardLinkedPayload): void {
    this.broadcast(payload.boardId, 'card:linked', payload);
  }

  cardUnlinked(payload: CardUnlinkedPayload): void {
    this.broadcast(payload.boardId, 'card:unlinked', payload);
  }

  // ===== Reaction Events =====

  reactionAdded(payload: ReactionAddedPayload): void {
    this.broadcast(payload.boardId, 'reaction:added', payload);
  }

  reactionRemoved(payload: ReactionRemovedPayload): void {
    this.broadcast(payload.boardId, 'reaction:removed', payload);
  }

  // ===== User Events =====

  userJoined(payload: UserJoinedPayload): void {
    this.broadcast(payload.boardId, 'user:joined', payload);
  }

  userLeft(payload: UserLeftPayload): void {
    this.broadcast(payload.boardId, 'user:left', payload);
  }

  userAliasChanged(payload: UserAliasChangedPayload): void {
    this.broadcast(payload.boardId, 'user:alias_changed', payload);
  }
}

/**
 * No-op Event Broadcaster for testing
 */
export class NoOpEventBroadcaster implements IEventBroadcaster {
  broadcast(): void {}
  boardRenamed(): void {}
  boardClosed(): void {}
  boardDeleted(): void {}
  cardCreated(): void {}
  cardUpdated(): void {}
  cardDeleted(): void {}
  cardMoved(): void {}
  cardLinked(): void {}
  cardUnlinked(): void {}
  reactionAdded(): void {}
  reactionRemoved(): void {}
  userJoined(): void {}
  userLeft(): void {}
  userAliasChanged(): void {}
}

// Singleton instance
export const eventBroadcaster = new EventBroadcaster();
