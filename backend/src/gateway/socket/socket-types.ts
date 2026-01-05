/**
 * Socket.io Event Type Definitions
 *
 * Defines all real-time events for board synchronization.
 */

// ===== Board Events =====

export interface BoardRenamedPayload {
  boardId: string;
  name: string;
}

export interface BoardClosedPayload {
  boardId: string;
  closedAt: string;
}

export interface BoardDeletedPayload {
  boardId: string;
}

export type BoardEventType = 'board:renamed' | 'board:closed' | 'board:deleted';

export interface BoardEvent {
  type: BoardEventType;
  payload: BoardRenamedPayload | BoardClosedPayload | BoardDeletedPayload;
}

// ===== Card Events =====

export interface CardCreatedPayload {
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

export interface CardUpdatedPayload {
  cardId: string;
  boardId: string;
  content: string;
  updatedAt: string;
}

export interface CardDeletedPayload {
  cardId: string;
  boardId: string;
}

export interface CardMovedPayload {
  cardId: string;
  boardId: string;
  columnId: string;
}

export interface CardLinkedPayload {
  sourceId: string;
  targetId: string;
  boardId: string;
  linkType: 'parent_of' | 'linked_to';
}

export interface CardUnlinkedPayload {
  sourceId: string;
  targetId: string;
  boardId: string;
  linkType: 'parent_of' | 'linked_to';
}

/**
 * Full card data payload for refresh events
 * Used after link/unlink operations to sync complete card state including relationships
 */
export interface CardRefreshPayload {
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

export type CardEventType =
  | 'card:created'
  | 'card:updated'
  | 'card:deleted'
  | 'card:moved'
  | 'card:linked'
  | 'card:unlinked'
  | 'card:refresh';

export interface CardEvent {
  type: CardEventType;
  payload:
    | CardCreatedPayload
    | CardUpdatedPayload
    | CardDeletedPayload
    | CardMovedPayload
    | CardLinkedPayload
    | CardUnlinkedPayload
    | CardRefreshPayload;
}

// ===== Reaction Events =====

export interface ReactionAddedPayload {
  cardId: string;
  boardId: string;
  userAlias: string | null;
  reactionType: 'thumbs_up';
  directCount: number;
  aggregatedCount: number;
  parentCardId: string | null;
}

export interface ReactionRemovedPayload {
  cardId: string;
  boardId: string;
  userAlias: string | null;
  directCount: number;
  aggregatedCount: number;
  parentCardId: string | null;
}

export type ReactionEventType = 'reaction:added' | 'reaction:removed';

export interface ReactionEvent {
  type: ReactionEventType;
  payload: ReactionAddedPayload | ReactionRemovedPayload;
}

// ===== User Events =====

export interface UserJoinedPayload {
  boardId: string;
  userAlias: string;
  isAdmin: boolean;
}

export interface UserLeftPayload {
  boardId: string;
  userAlias: string;
}

export interface UserAliasChangedPayload {
  boardId: string;
  oldAlias: string;
  newAlias: string;
}

export type UserEventType = 'user:joined' | 'user:left' | 'user:alias_changed';

export interface UserEvent {
  type: UserEventType;
  payload: UserJoinedPayload | UserLeftPayload | UserAliasChangedPayload;
}

// ===== Combined Event Types =====

export type EventType = BoardEventType | CardEventType | ReactionEventType | UserEventType;

export type EventPayload =
  | BoardRenamedPayload
  | BoardClosedPayload
  | BoardDeletedPayload
  | CardCreatedPayload
  | CardUpdatedPayload
  | CardDeletedPayload
  | CardMovedPayload
  | CardLinkedPayload
  | CardUnlinkedPayload
  | CardRefreshPayload
  | ReactionAddedPayload
  | ReactionRemovedPayload
  | UserJoinedPayload
  | UserLeftPayload
  | UserAliasChangedPayload;

export interface SocketEvent {
  type: EventType;
  payload: EventPayload;
}

// ===== Client-to-Server Events =====

export interface JoinBoardData {
  boardId: string;
  userAlias?: string; // Optional: user's display name for presence tracking
}

export interface ClientToServerEvents {
  'join-board': (data: string | JoinBoardData) => void; // Supports both legacy (string) and new format
  'leave-board': (boardId: string) => void;
  'heartbeat': () => void;
}

// ===== Server-to-Client Events =====

export interface ServerToClientEvents {
  // Board events
  'board:renamed': (payload: BoardRenamedPayload) => void;
  'board:closed': (payload: BoardClosedPayload) => void;
  'board:deleted': (payload: BoardDeletedPayload) => void;

  // Card events
  'card:created': (payload: CardCreatedPayload) => void;
  'card:updated': (payload: CardUpdatedPayload) => void;
  'card:deleted': (payload: CardDeletedPayload) => void;
  'card:moved': (payload: CardMovedPayload) => void;
  'card:linked': (payload: CardLinkedPayload) => void;
  'card:unlinked': (payload: CardUnlinkedPayload) => void;
  'card:refresh': (payload: CardRefreshPayload) => void;

  // Reaction events
  'reaction:added': (payload: ReactionAddedPayload) => void;
  'reaction:removed': (payload: ReactionRemovedPayload) => void;

  // User events
  'user:joined': (payload: UserJoinedPayload) => void;
  'user:left': (payload: UserLeftPayload) => void;
  'user:alias_changed': (payload: UserAliasChangedPayload) => void;
}

// ===== Socket Data =====

export interface SocketData {
  cookieHash?: string;
  currentBoardId?: string;
  userAlias?: string; // User's display name for presence tracking
}
