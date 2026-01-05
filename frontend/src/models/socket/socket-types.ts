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
  card_id: string;
  content: string;
}

export interface CardDeletedEvent extends BaseEvent {
  card_id: string;
}

export interface CardMovedEvent extends BaseEvent {
  card_id: string;
  column_id: string;
}

export interface CardLinkedEvent extends BaseEvent {
  source_card_id: string;
  target_card_id: string;
  link_type: LinkType;
}

export interface CardUnlinkedEvent extends BaseEvent {
  source_card_id: string;
  target_card_id: string;
  link_type: LinkType;
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
  card_id: string;
  user_alias: string;
  reaction_type: string;
}

export interface ReactionRemovedEvent extends BaseEvent {
  card_id: string;
  user_alias: string;
}

// Board Events
export interface BoardRenamedEvent extends BaseEvent {
  board_id: string;
  name: string;
}

export interface BoardClosedEvent extends BaseEvent {
  board_id: string;
  closed_at: string;
}

export interface BoardDeletedEvent extends BaseEvent {
  board_id: string;
}

// User Events
export interface UserJoinedEvent extends BaseEvent {
  boardId: string;
  userAlias: string;
  isAdmin: boolean;
}

export interface UserLeftEvent extends BaseEvent {
  board_id: string;
  alias: string;
}

export interface UserAliasChangedEvent extends BaseEvent {
  board_id: string;
  old_alias: string;
  new_alias: string;
}

// ============================================================================
// Event Type Union
// ============================================================================

export type SocketEventType = keyof ServerToClientEvents;

export type SocketEventPayload<T extends SocketEventType> = Parameters<ServerToClientEvents[T]>[0];
