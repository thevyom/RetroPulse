import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { UserSessionRepository } from '@/domains/user/user-session.repository.js';
import { startTestDb, stopTestDb, getTestDb, clearTestDb } from '../../../utils/index.js';

describe('UserSessionRepository', () => {
  let repository: UserSessionRepository;
  let db: ReturnType<typeof getTestDb>;
  const validBoardId = new ObjectId().toHexString();

  beforeAll(async () => {
    await startTestDb();
    db = getTestDb();
    repository = new UserSessionRepository(db);
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  describe('upsert', () => {
    it('should create a new session for new user', async () => {
      const session = await repository.upsert(validBoardId, 'user-hash-1', 'Alice');

      expect(session._id).toBeInstanceOf(ObjectId);
      expect(session.board_id.toHexString()).toBe(validBoardId);
      expect(session.cookie_hash).toBe('user-hash-1');
      expect(session.alias).toBe('Alice');
      expect(session.last_active_at).toBeInstanceOf(Date);
      expect(session.created_at).toBeInstanceOf(Date);
    });

    it('should update alias for existing user', async () => {
      await repository.upsert(validBoardId, 'user-hash-1', 'Alice');
      const updated = await repository.upsert(validBoardId, 'user-hash-1', 'Alice Updated');

      expect(updated.alias).toBe('Alice Updated');
    });

    it('should update last_active_at on upsert', async () => {
      const first = await repository.upsert(validBoardId, 'user-hash-1', 'Alice');
      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));
      const second = await repository.upsert(validBoardId, 'user-hash-1', 'Alice');

      expect(second.last_active_at.getTime()).toBeGreaterThanOrEqual(
        first.last_active_at.getTime()
      );
    });

    it('should preserve created_at on update', async () => {
      const first = await repository.upsert(validBoardId, 'user-hash-1', 'Alice');
      await new Promise((resolve) => setTimeout(resolve, 10));
      const second = await repository.upsert(validBoardId, 'user-hash-1', 'Alice Updated');

      expect(second.created_at.getTime()).toBe(first.created_at.getTime());
    });

    it('should throw for invalid board ID', async () => {
      await expect(
        repository.upsert('invalid-id', 'user-hash', 'Alice')
      ).rejects.toThrow('Invalid board ID');
    });

    it('should create separate sessions for same user on different boards', async () => {
      const boardId2 = new ObjectId().toHexString();
      const session1 = await repository.upsert(validBoardId, 'user-hash-1', 'Alice Board1');
      const session2 = await repository.upsert(boardId2, 'user-hash-1', 'Alice Board2');

      expect(session1.alias).toBe('Alice Board1');
      expect(session2.alias).toBe('Alice Board2');
      expect(session1._id.toHexString()).not.toBe(session2._id.toHexString());
    });
  });

  describe('findByBoardAndUser', () => {
    it('should find existing session', async () => {
      await repository.upsert(validBoardId, 'user-hash-1', 'Alice');

      const found = await repository.findByBoardAndUser(validBoardId, 'user-hash-1');

      expect(found).not.toBeNull();
      expect(found!.alias).toBe('Alice');
    });

    it('should return null for non-existent session', async () => {
      const found = await repository.findByBoardAndUser(validBoardId, 'nonexistent-hash');

      expect(found).toBeNull();
    });

    it('should return null for invalid board ID', async () => {
      const found = await repository.findByBoardAndUser('invalid-id', 'user-hash');

      expect(found).toBeNull();
    });
  });

  describe('findActiveUsers', () => {
    it('should return recently active users', async () => {
      await repository.upsert(validBoardId, 'user-1', 'Alice');
      await repository.upsert(validBoardId, 'user-2', 'Bob');

      const activeUsers = await repository.findActiveUsers(validBoardId);

      expect(activeUsers).toHaveLength(2);
      expect(activeUsers.map((u) => u.alias)).toContain('Alice');
      expect(activeUsers.map((u) => u.alias)).toContain('Bob');
    });

    it('should return users sorted by last_active_at descending', async () => {
      await repository.upsert(validBoardId, 'user-1', 'Alice');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await repository.upsert(validBoardId, 'user-2', 'Bob');

      const activeUsers = await repository.findActiveUsers(validBoardId);

      // Bob should be first (most recent)
      expect(activeUsers[0].alias).toBe('Bob');
      expect(activeUsers[1].alias).toBe('Alice');
    });

    it('should return empty array for board with no sessions', async () => {
      const activeUsers = await repository.findActiveUsers(validBoardId);

      expect(activeUsers).toEqual([]);
    });

    it('should return empty array for invalid board ID', async () => {
      const activeUsers = await repository.findActiveUsers('invalid-id');

      expect(activeUsers).toEqual([]);
    });

    it('should only return users from specified board', async () => {
      const boardId2 = new ObjectId().toHexString();
      await repository.upsert(validBoardId, 'user-1', 'Alice');
      await repository.upsert(boardId2, 'user-2', 'Bob');

      const activeUsers = await repository.findActiveUsers(validBoardId);

      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0].alias).toBe('Alice');
    });
  });

  describe('updateHeartbeat', () => {
    it('should update last_active_at timestamp', async () => {
      const created = await repository.upsert(validBoardId, 'user-1', 'Alice');
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repository.updateHeartbeat(validBoardId, 'user-1');

      expect(updated).not.toBeNull();
      expect(updated!.last_active_at.getTime()).toBeGreaterThan(
        created.last_active_at.getTime()
      );
    });

    it('should return null for non-existent session', async () => {
      const updated = await repository.updateHeartbeat(validBoardId, 'nonexistent-hash');

      expect(updated).toBeNull();
    });

    it('should return null for invalid board ID', async () => {
      const updated = await repository.updateHeartbeat('invalid-id', 'user-hash');

      expect(updated).toBeNull();
    });
  });

  describe('updateAlias', () => {
    it('should update alias', async () => {
      await repository.upsert(validBoardId, 'user-1', 'Alice');

      const updated = await repository.updateAlias(validBoardId, 'user-1', 'Alice Updated');

      expect(updated).not.toBeNull();
      expect(updated!.alias).toBe('Alice Updated');
    });

    it('should also update last_active_at', async () => {
      const created = await repository.upsert(validBoardId, 'user-1', 'Alice');
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repository.updateAlias(validBoardId, 'user-1', 'New Alias');

      expect(updated!.last_active_at.getTime()).toBeGreaterThan(
        created.last_active_at.getTime()
      );
    });

    it('should return null for non-existent session', async () => {
      const updated = await repository.updateAlias(validBoardId, 'nonexistent', 'New Alias');

      expect(updated).toBeNull();
    });

    it('should return null for invalid board ID', async () => {
      const updated = await repository.updateAlias('invalid-id', 'user', 'New Alias');

      expect(updated).toBeNull();
    });
  });

  describe('deleteByBoard', () => {
    it('should delete all sessions for a board', async () => {
      await repository.upsert(validBoardId, 'user-1', 'Alice');
      await repository.upsert(validBoardId, 'user-2', 'Bob');

      const deletedCount = await repository.deleteByBoard(validBoardId);

      expect(deletedCount).toBe(2);

      const remaining = await repository.findActiveUsers(validBoardId);
      expect(remaining).toHaveLength(0);
    });

    it('should not affect sessions on other boards', async () => {
      const boardId2 = new ObjectId().toHexString();
      await repository.upsert(validBoardId, 'user-1', 'Alice');
      await repository.upsert(boardId2, 'user-2', 'Bob');

      await repository.deleteByBoard(validBoardId);

      const remaining = await repository.findActiveUsers(boardId2);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].alias).toBe('Bob');
    });

    it('should return 0 for board with no sessions', async () => {
      const deletedCount = await repository.deleteByBoard(validBoardId);

      expect(deletedCount).toBe(0);
    });

    it('should return 0 for invalid board ID', async () => {
      const deletedCount = await repository.deleteByBoard('invalid-id');

      expect(deletedCount).toBe(0);
    });
  });

  describe('countByBoard', () => {
    it('should count all sessions for a board', async () => {
      await repository.upsert(validBoardId, 'user-1', 'Alice');
      await repository.upsert(validBoardId, 'user-2', 'Bob');

      const count = await repository.countByBoard(validBoardId);

      expect(count).toBe(2);
    });

    it('should return 0 for board with no sessions', async () => {
      const count = await repository.countByBoard(validBoardId);

      expect(count).toBe(0);
    });

    it('should return 0 for invalid board ID', async () => {
      const count = await repository.countByBoard('invalid-id');

      expect(count).toBe(0);
    });
  });

  describe('findActiveUsers - inactive user filtering', () => {
    it('should exclude users inactive for more than 2 minutes', async () => {
      const boardObjectId = new ObjectId(validBoardId);
      const collection = db.collection('user_sessions');

      // Create an active user (just now)
      await repository.upsert(validBoardId, 'active-user', 'ActiveUser');

      // Manually insert an inactive user with last_active_at > 2 minutes ago
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      await collection.insertOne({
        _id: new ObjectId(),
        board_id: boardObjectId,
        cookie_hash: 'inactive-user',
        alias: 'InactiveUser',
        last_active_at: threeMinutesAgo,
        created_at: threeMinutesAgo,
      });

      const activeUsers = await repository.findActiveUsers(validBoardId);

      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0].alias).toBe('ActiveUser');
    });

    it('should include users active just inside the 2-minute boundary', async () => {
      const boardObjectId = new ObjectId(validBoardId);
      const collection = db.collection('user_sessions');

      // Insert a user active 1 minute 59 seconds ago (just inside the 2-minute window)
      // We use 1 second buffer to avoid timing edge cases
      const justInsideBoundary = new Date(Date.now() - (2 * 60 * 1000 - 1000));
      await collection.insertOne({
        _id: new ObjectId(),
        board_id: boardObjectId,
        cookie_hash: 'boundary-user',
        alias: 'BoundaryUser',
        last_active_at: justInsideBoundary,
        created_at: justInsideBoundary,
      });

      const activeUsers = await repository.findActiveUsers(validBoardId);

      // User just inside 2 minute mark should be included
      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0].alias).toBe('BoundaryUser');
    });

    it('should exclude users inactive by just over 2 minutes', async () => {
      const boardObjectId = new ObjectId(validBoardId);
      const collection = db.collection('user_sessions');

      // Insert a user inactive by 2 minutes + 1 second
      const justOverTwoMinutes = new Date(Date.now() - (2 * 60 * 1000 + 1000));
      await collection.insertOne({
        _id: new ObjectId(),
        board_id: boardObjectId,
        cookie_hash: 'just-over-user',
        alias: 'JustOverUser',
        last_active_at: justOverTwoMinutes,
        created_at: justOverTwoMinutes,
      });

      const activeUsers = await repository.findActiveUsers(validBoardId);

      expect(activeUsers).toHaveLength(0);
    });
  });

  describe('ensureIndexes', () => {
    it('should create required indexes without error', async () => {
      // Should complete without throwing
      await expect(repository.ensureIndexes()).resolves.not.toThrow();
    });

    it('should create unique index on board_id and cookie_hash', async () => {
      await repository.ensureIndexes();

      const collection = db.collection('user_sessions');
      const indexes = await collection.indexes();

      // Find the compound index on board_id and cookie_hash
      const compoundIndex = indexes.find(
        (idx) =>
          idx.key &&
          'board_id' in idx.key &&
          'cookie_hash' in idx.key &&
          idx.unique === true
      );

      expect(compoundIndex).toBeDefined();
    });

    it('should create index on board_id and last_active_at for active users query', async () => {
      await repository.ensureIndexes();

      const collection = db.collection('user_sessions');
      const indexes = await collection.indexes();

      // Find the index for active users query
      const activeUsersIndex = indexes.find(
        (idx) =>
          idx.key &&
          'board_id' in idx.key &&
          'last_active_at' in idx.key
      );

      expect(activeUsersIndex).toBeDefined();
    });

    it('should be idempotent - calling multiple times should not fail', async () => {
      await repository.ensureIndexes();
      await repository.ensureIndexes();
      await expect(repository.ensureIndexes()).resolves.not.toThrow();
    });
  });
});
