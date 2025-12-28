/**
 * Socket Gateway Unit Tests
 * Tests the SocketGateway and EventBroadcaster without requiring socket.io-client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EventBroadcaster,
  NoOpEventBroadcaster,
  type IEventBroadcaster,
} from '@/gateway/socket/EventBroadcaster.js';
import { SocketGateway } from '@/gateway/socket/SocketGateway.js';

describe('EventBroadcaster', () => {
  let broadcaster: EventBroadcaster;

  beforeEach(() => {
    broadcaster = new EventBroadcaster();
  });

  describe('board events', () => {
    it('should have boardRenamed method', () => {
      expect(typeof broadcaster.boardRenamed).toBe('function');
    });

    it('should have boardClosed method', () => {
      expect(typeof broadcaster.boardClosed).toBe('function');
    });

    it('should have boardDeleted method', () => {
      expect(typeof broadcaster.boardDeleted).toBe('function');
    });
  });

  describe('card events', () => {
    it('should have cardCreated method', () => {
      expect(typeof broadcaster.cardCreated).toBe('function');
    });

    it('should have cardUpdated method', () => {
      expect(typeof broadcaster.cardUpdated).toBe('function');
    });

    it('should have cardDeleted method', () => {
      expect(typeof broadcaster.cardDeleted).toBe('function');
    });

    it('should have cardMoved method', () => {
      expect(typeof broadcaster.cardMoved).toBe('function');
    });

    it('should have cardLinked method', () => {
      expect(typeof broadcaster.cardLinked).toBe('function');
    });

    it('should have cardUnlinked method', () => {
      expect(typeof broadcaster.cardUnlinked).toBe('function');
    });
  });

  describe('reaction events', () => {
    it('should have reactionAdded method', () => {
      expect(typeof broadcaster.reactionAdded).toBe('function');
    });

    it('should have reactionRemoved method', () => {
      expect(typeof broadcaster.reactionRemoved).toBe('function');
    });
  });

  describe('user events', () => {
    it('should have userJoined method', () => {
      expect(typeof broadcaster.userJoined).toBe('function');
    });

    it('should have userLeft method', () => {
      expect(typeof broadcaster.userLeft).toBe('function');
    });

    it('should have userAliasChanged method', () => {
      expect(typeof broadcaster.userAliasChanged).toBe('function');
    });
  });
});

describe('NoOpEventBroadcaster', () => {
  let broadcaster: NoOpEventBroadcaster;

  beforeEach(() => {
    broadcaster = new NoOpEventBroadcaster();
  });

  it('should implement IEventBroadcaster interface', () => {
    // All methods should exist and not throw
    expect(() => broadcaster.broadcast('board', 'board:renamed', { boardId: '1', name: 'test' })).not.toThrow();
    expect(() => broadcaster.boardRenamed('1', 'test')).not.toThrow();
    expect(() => broadcaster.boardClosed('1', new Date().toISOString())).not.toThrow();
    expect(() => broadcaster.boardDeleted('1')).not.toThrow();
    expect(() => broadcaster.cardCreated({
      cardId: '1',
      boardId: '1',
      columnId: 'col1',
      content: 'test',
      cardType: 'feedback',
      isAnonymous: false,
      createdByAlias: 'Alice',
      createdAt: new Date().toISOString(),
      directReactionCount: 0,
      aggregatedReactionCount: 0,
      parentCardId: null,
      linkedFeedbackIds: [],
    })).not.toThrow();
    expect(() => broadcaster.cardUpdated({
      cardId: '1',
      boardId: '1',
      content: 'updated',
      updatedAt: new Date().toISOString(),
    })).not.toThrow();
    expect(() => broadcaster.cardDeleted('1', '1')).not.toThrow();
    expect(() => broadcaster.cardMoved({ cardId: '1', boardId: '1', columnId: 'col2' })).not.toThrow();
    expect(() => broadcaster.cardLinked({ sourceId: '1', targetId: '2', boardId: '1', linkType: 'parent_of' })).not.toThrow();
    expect(() => broadcaster.cardUnlinked({ sourceId: '1', targetId: '2', boardId: '1', linkType: 'parent_of' })).not.toThrow();
    expect(() => broadcaster.reactionAdded({
      cardId: '1',
      boardId: '1',
      userAlias: 'Alice',
      reactionType: 'thumbs_up',
      directCount: 1,
      aggregatedCount: 1,
    })).not.toThrow();
    expect(() => broadcaster.reactionRemoved({
      cardId: '1',
      boardId: '1',
      userAlias: 'Alice',
      directCount: 0,
      aggregatedCount: 0,
    })).not.toThrow();
    expect(() => broadcaster.userJoined({ boardId: '1', userAlias: 'Alice', isAdmin: false })).not.toThrow();
    expect(() => broadcaster.userLeft({ boardId: '1', userAlias: 'Alice' })).not.toThrow();
    expect(() => broadcaster.userAliasChanged({ boardId: '1', oldAlias: 'Alice', newAlias: 'Bob' })).not.toThrow();
  });
});

describe('SocketGateway', () => {
  let gateway: SocketGateway;

  beforeEach(() => {
    gateway = new SocketGateway();
  });

  describe('getServer', () => {
    it('should return null before initialization', () => {
      expect(gateway.getServer()).toBeNull();
    });
  });

  describe('getRoomSize', () => {
    it('should return 0 when gateway is not initialized', async () => {
      const size = await gateway.getRoomSize('any-board');
      expect(size).toBe(0);
    });
  });

  describe('broadcast', () => {
    it('should not throw when gateway is not initialized', () => {
      // Should log warning but not throw
      expect(() => {
        gateway.broadcast('board-1', 'board:renamed', { boardId: 'board-1', name: 'Test' });
      }).not.toThrow();
    });
  });

  describe('broadcastExcept', () => {
    it('should not throw when gateway is not initialized', () => {
      expect(() => {
        gateway.broadcastExcept('board-1', 'board:renamed', { boardId: 'board-1', name: 'Test' }, 'socket-123');
      }).not.toThrow();
    });
  });

  describe('disconnectRoom', () => {
    it('should not throw when gateway is not initialized', async () => {
      await expect(gateway.disconnectRoom('board-1')).resolves.toBeUndefined();
    });
  });

  describe('close', () => {
    it('should not throw when gateway is not initialized', async () => {
      await expect(gateway.close()).resolves.toBeUndefined();
    });
  });
});

describe('IEventBroadcaster interface', () => {
  it('NoOpEventBroadcaster should be usable as IEventBroadcaster', () => {
    const broadcaster: IEventBroadcaster = new NoOpEventBroadcaster();
    expect(broadcaster).toBeDefined();
  });

  it('EventBroadcaster should be usable as IEventBroadcaster', () => {
    const broadcaster: IEventBroadcaster = new EventBroadcaster();
    expect(broadcaster).toBeDefined();
  });
});
