/**
 * WebSocket Event Types
 * Type definitions for Socket.io events
 */

import type { LinkType } from '../types';

// ============================================================================
// Client -> Server Events
// ============================================================================

export interface ClientToServerEvents {
  'join-board': (data: JoinBoardData) => void;
  'leave-board': (data: LeaveBoardData) => void;
  heartbeat: (data: HeartbeatData) => void;
}

export interface JoinBoardData {
  boardId: string;
  userAlias?: string;
}

export interface LeaveBoardData {
  boardId: string;
}

export interface HeartbeatData {
  boardId: string;
  alias?: string;
}

// ============================================================================
// Server -> Client Events
// ============================================================================

export interface ServerToClientEvents {
  'card:created': (event: CardCreatedEvent) => void;
  'card:updated': (event: CardUpdatedEvent) => void;
  'card:deleted': (event: CardDeletedEvent) => void;
  'card:moved': (event: CardMovedEvent) => void;
  'card:linked': (event: CardLinkedEvent) => void;
  'card:unlinked': (event: CardUnlinkedEvent) => void;
  'card:refresh': (event: CardRefreshEvent) => void;
  'reaction:added': (event: ReactionAddedEvent) => void;
  'reaction:removed': (event: ReactionRemovedEvent) => void;
  'board:renamed': (event: BoardRenamedEvent) => void;
  'board:closed': (event: BoardClosedEvent) => void;
  'board:deleted': (event: BoardDeletedEvent) => void;
  'user:joined': (event: UserJoinedEvent) => void;
  'user:left': (event: UserLeftEvent) => void;
  'user:alias_changed': (event: UserAliasChangedEvent) => void;
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: Error) => void;
}

// ============================================================================
// Event Payloads
// ============================================================================

export interface BaseEvent {
  timestamp: string;
}

// Card Events
// Note: Backend sends flat camelCase payload, not wrapped in { card: Card }
export interface CardCreatedEvent extends BaseEvent {
  cardId: string;
  boardId: string;
  columnId: string;
  content: string;
  cardType: 'feedback' | 'action';
  isAnonymous: boolean;
  createdByAlias: string | null;
  createdAt: string;
  directReactionCount: number;
  aggregatedReactionCount: number;
  parentCardId: string | null;
  linkedFeedbackIds: string[];
}

export interface CardUpdatedEvent extends BaseEvent {
  cardId: string;
  boardId: string;
  content: string;
  updatedAt: string;
}

export interface CardDeletedEvent extends BaseEvent {
  cardId: string;
  boardId: string;
}

export interface CardMovedEvent extends BaseEvent {
  cardId: string;
  boardId: string;
  columnId: string;
}

export interface CardLinkedEvent extends BaseEvent {
  sourceId: string;
  targetId: string;
  boardId: string;
  linkType: LinkType;
}

export interface CardUnlinkedEvent extends BaseEvent {
  sourceId: string;
  targetId: string;
  boardId: string;
  linkType: LinkType;
}

/**
 * Full card data for refresh events
 * Used after link/unlink operations to sync complete card state including relationships
 */
export interface CardRefreshEvent extends BaseEvent {
  boardId: string;
  card: {
    id: string;
    boardId: string;
    columnId: string;
    content: string;
    cardType: 'feedback' | 'action';
    isAnonymous: boolean;
    createdByAlias: string | null;
    createdAt: string;
    updatedAt: string | null;
    directReactionCount: number;
    aggregatedReactionCount: number;
    parentCardId: string | null;
    linkedFeedbackIds: string[];
    children: Array<{
      id: string;
      content: string;
      isAnonymous: boolean;
      createdByAlias: string | null;
      createdAt: string;
      directReactionCount: number;
      aggregatedReactionCount: number;
    }>;
    linkedFeedbackCards: Array<{
      id: string;
      content: string;
      createdByAlias: string | null;
      createdAt: string;
    }>;
  };
}

// Reaction Events
export interface ReactionAddedEvent extends BaseEvent {
  cardId: string;
  boardId: string;
  userAlias: string | null;
  reactionType: 'thumbs_up';
  directCount: number;
  aggregatedCount: number;
  parentCardId: string | null;
}

export interface ReactionRemovedEvent extends BaseEvent {
  cardId: string;
  boardId: string;
  userAlias: string | null;
  directCount: number;
  aggregatedCount: number;
  parentCardId: string | null;
}

// Board Events
export interface BoardRenamedEvent extends BaseEvent {
  boardId: string;
  name: string;
}

export interface BoardClosedEvent extends BaseEvent {
  boardId: string;
  closedAt: string;
}

export interface BoardDeletedEvent extends BaseEvent {
  boardId: string;
}

// User Events
export interface UserJoinedEvent extends BaseEvent {
  boardId: string;
  userAlias: string;
  isAdmin: boolean;
}

export interface UserLeftEvent extends BaseEvent {
  boardId: string;
  userAlias: string;
}

export interface UserAliasChangedEvent extends BaseEvent {
  boardId: string;
  oldAlias: string;
  newAlias: string;
}

// ============================================================================
// Event Type Union
// ============================================================================

export type SocketEventType = keyof ServerToClientEvents;

export type SocketEventPayload<T extends SocketEventType> = Parameters<ServerToClientEvents[T]>[0];
