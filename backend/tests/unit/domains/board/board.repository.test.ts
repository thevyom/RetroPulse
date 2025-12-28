import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { BoardRepository } from '@/domains/board/board.repository.js';
import { startTestDb, stopTestDb, getTestDb, clearTestDb } from '../../../utils/index.js';

describe('BoardRepository', () => {
  let repository: BoardRepository;

  beforeAll(async () => {
    await startTestDb();
    repository = new BoardRepository(getTestDb());
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  describe('create', () => {
    it('should create a board with valid input', async () => {
      const input = {
        name: 'Sprint 42 Retro',
        columns: [
          { id: 'col-1', name: 'What Went Well', color: '#D5E8D4' },
          { id: 'col-2', name: 'Improvements', color: '#FFE6CC' },
        ],
        card_limit_per_user: 5,
        reaction_limit_per_user: 10,
      };
      const creatorHash = 'creator-hash-123';

      const board = await repository.create(input, creatorHash);

      expect(board._id).toBeInstanceOf(ObjectId);
      expect(board.name).toBe('Sprint 42 Retro');
      expect(board.columns).toHaveLength(2);
      expect(board.shareable_link).toHaveLength(12);
      expect(board.state).toBe('active');
      expect(board.card_limit_per_user).toBe(5);
      expect(board.reaction_limit_per_user).toBe(10);
      expect(board.created_by_hash).toBe(creatorHash);
      expect(board.admins).toContain(creatorHash);
      expect(board.created_at).toBeInstanceOf(Date);
      expect(board.closed_at).toBeNull();
    });

    it('should set limits to null when not provided', async () => {
      const input = {
        name: 'Simple Board',
        columns: [{ id: 'col-1', name: 'Column 1' }],
      };

      const board = await repository.create(input, 'hash');

      expect(board.card_limit_per_user).toBeNull();
      expect(board.reaction_limit_per_user).toBeNull();
    });

    it('should set creator as first admin', async () => {
      const input = {
        name: 'Test Board',
        columns: [{ id: 'col-1', name: 'Column 1' }],
      };
      const creatorHash = 'unique-creator-hash';

      const board = await repository.create(input, creatorHash);

      expect(board.admins).toEqual([creatorHash]);
    });
  });

  describe('findById', () => {
    it('should find an existing board', async () => {
      const created = await repository.create(
        { name: 'Test', columns: [{ id: 'c1', name: 'Col' }] },
        'hash'
      );

      const found = await repository.findById(created._id.toHexString());

      expect(found).not.toBeNull();
      expect(found!.name).toBe('Test');
    });

    it('should return null for non-existent board', async () => {
      const found = await repository.findById(new ObjectId().toHexString());

      expect(found).toBeNull();
    });

    it('should return null for invalid ObjectId', async () => {
      const found = await repository.findById('invalid-id');

      expect(found).toBeNull();
    });
  });

  describe('findByShareableLink', () => {
    it('should find board by shareable link', async () => {
      const created = await repository.create(
        { name: 'Linked Board', columns: [{ id: 'c1', name: 'Col' }] },
        'hash'
      );

      const found = await repository.findByShareableLink(created.shareable_link);

      expect(found).not.toBeNull();
      expect(found!.name).toBe('Linked Board');
    });

    it('should return null for non-existent link', async () => {
      const found = await repository.findByShareableLink('nonexistent');

      expect(found).toBeNull();
    });
  });

  describe('updateName', () => {
    it('should update board name', async () => {
      const created = await repository.create(
        { name: 'Old Name', columns: [{ id: 'c1', name: 'Col' }] },
        'hash'
      );

      const updated = await repository.updateName(
        created._id.toHexString(),
        'New Name'
      );

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe('New Name');
    });

    it('should return null for non-existent board', async () => {
      const updated = await repository.updateName(
        new ObjectId().toHexString(),
        'New Name'
      );

      expect(updated).toBeNull();
    });
  });

  describe('closeBoard', () => {
    it('should close an active board', async () => {
      const created = await repository.create(
        { name: 'Active Board', columns: [{ id: 'c1', name: 'Col' }] },
        'hash'
      );

      const closed = await repository.closeBoard(created._id.toHexString());

      expect(closed).not.toBeNull();
      expect(closed!.state).toBe('closed');
      expect(closed!.closed_at).toBeInstanceOf(Date);
    });

    it('should be idempotent (closing already closed board)', async () => {
      const created = await repository.create(
        { name: 'Board', columns: [{ id: 'c1', name: 'Col' }] },
        'hash'
      );

      await repository.closeBoard(created._id.toHexString());
      const closedAgain = await repository.closeBoard(created._id.toHexString());

      expect(closedAgain!.state).toBe('closed');
    });
  });

  describe('addAdmin', () => {
    it('should add a new admin', async () => {
      const created = await repository.create(
        { name: 'Board', columns: [{ id: 'c1', name: 'Col' }] },
        'creator-hash'
      );

      const updated = await repository.addAdmin(
        created._id.toHexString(),
        'new-admin-hash'
      );

      expect(updated).not.toBeNull();
      expect(updated!.admins).toContain('creator-hash');
      expect(updated!.admins).toContain('new-admin-hash');
      expect(updated!.admins).toHaveLength(2);
    });

    it('should not duplicate existing admin (idempotent)', async () => {
      const created = await repository.create(
        { name: 'Board', columns: [{ id: 'c1', name: 'Col' }] },
        'creator-hash'
      );

      await repository.addAdmin(created._id.toHexString(), 'creator-hash');
      const updated = await repository.addAdmin(
        created._id.toHexString(),
        'creator-hash'
      );

      expect(updated!.admins).toHaveLength(1);
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin', async () => {
      const created = await repository.create(
        { name: 'Board', columns: [{ id: 'c1', name: 'Col' }] },
        'admin-hash'
      );

      const isAdmin = await repository.isAdmin(
        created._id.toHexString(),
        'admin-hash'
      );

      expect(isAdmin).toBe(true);
    });

    it('should return false for non-admin', async () => {
      const created = await repository.create(
        { name: 'Board', columns: [{ id: 'c1', name: 'Col' }] },
        'admin-hash'
      );

      const isAdmin = await repository.isAdmin(
        created._id.toHexString(),
        'other-hash'
      );

      expect(isAdmin).toBe(false);
    });

    it('should return false for invalid board ID', async () => {
      const isAdmin = await repository.isAdmin('invalid-id', 'hash');

      expect(isAdmin).toBe(false);
    });
  });

  describe('isCreator', () => {
    it('should return true for creator', async () => {
      const created = await repository.create(
        { name: 'Board', columns: [{ id: 'c1', name: 'Col' }] },
        'creator-hash'
      );

      const isCreator = await repository.isCreator(
        created._id.toHexString(),
        'creator-hash'
      );

      expect(isCreator).toBe(true);
    });

    it('should return false for non-creator', async () => {
      const created = await repository.create(
        { name: 'Board', columns: [{ id: 'c1', name: 'Col' }] },
        'creator-hash'
      );

      const isCreator = await repository.isCreator(
        created._id.toHexString(),
        'other-hash'
      );

      expect(isCreator).toBe(false);
    });
  });

  describe('renameColumn', () => {
    it('should rename an existing column', async () => {
      const created = await repository.create(
        {
          name: 'Board',
          columns: [
            { id: 'col-1', name: 'Old Name' },
            { id: 'col-2', name: 'Other' },
          ],
        },
        'hash'
      );

      const updated = await repository.renameColumn(
        created._id.toHexString(),
        'col-1',
        'New Name'
      );

      expect(updated).not.toBeNull();
      expect(updated!.columns[0]!.name).toBe('New Name');
      expect(updated!.columns[1]!.name).toBe('Other'); // Unchanged
    });

    it('should return null if column not found', async () => {
      const created = await repository.create(
        { name: 'Board', columns: [{ id: 'col-1', name: 'Col' }] },
        'hash'
      );

      const updated = await repository.renameColumn(
        created._id.toHexString(),
        'nonexistent-col',
        'New Name'
      );

      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete an existing board', async () => {
      const created = await repository.create(
        { name: 'To Delete', columns: [{ id: 'c1', name: 'Col' }] },
        'hash'
      );

      const deleted = await repository.delete(created._id.toHexString());
      const found = await repository.findById(created._id.toHexString());

      expect(deleted).toBe(true);
      expect(found).toBeNull();
    });

    it('should return false for non-existent board', async () => {
      const deleted = await repository.delete(new ObjectId().toHexString());

      expect(deleted).toBe(false);
    });

    it('should return false for invalid ObjectId', async () => {
      const deleted = await repository.delete('invalid-id');

      expect(deleted).toBe(false);
    });
  });
});
