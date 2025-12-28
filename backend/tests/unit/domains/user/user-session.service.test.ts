import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { UserSessionService } from '@/domains/user/user-session.service.js';
import { UserSessionRepository } from '@/domains/user/user-session.repository.js';
import { BoardRepository } from '@/domains/board/board.repository.js';
import type { UserSessionDocument } from '@/domains/user/types.js';
import type { BoardDocument } from '@/domains/board/types.js';

// Mock repositories
vi.mock('@/domains/user/user-session.repository.js');
vi.mock('@/domains/board/board.repository.js');

describe('UserSessionService', () => {
  let service: UserSessionService;
  let mockUserSessionRepository: Partial<UserSessionRepository>;
  let mockBoardRepository: Partial<BoardRepository>;

  const boardId = new ObjectId();
  const mockBoardDoc: BoardDocument = {
    _id: boardId,
    name: 'Test Board',
    columns: [{ id: 'col-1', name: 'Column 1' }],
    shareable_link: 'abc12345',
    state: 'active',
    card_limit_per_user: 5,
    reaction_limit_per_user: 10,
    created_by_hash: 'creator-hash',
    admins: ['creator-hash', 'admin-hash'],
    created_at: new Date(),
    closed_at: null,
  };

  const mockSessionDoc: UserSessionDocument = {
    _id: new ObjectId(),
    board_id: boardId,
    cookie_hash: 'user-hash',
    alias: 'Alice',
    last_active_at: new Date(),
    created_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserSessionRepository = {
      upsert: vi.fn(),
      findByBoardAndUser: vi.fn(),
      findActiveUsers: vi.fn(),
      updateHeartbeat: vi.fn(),
      updateAlias: vi.fn(),
      deleteByBoard: vi.fn(),
    };

    mockBoardRepository = {
      findById: vi.fn(),
    };

    service = new UserSessionService(
      mockUserSessionRepository as UserSessionRepository,
      mockBoardRepository as BoardRepository
    );
  });

  describe('joinBoard', () => {
    it('should create session and return with is_admin=false for non-admin', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockUserSessionRepository.upsert!).mockResolvedValue({
        ...mockSessionDoc,
        cookie_hash: 'new-user-hash',
      });

      const result = await service.joinBoard(
        boardId.toHexString(),
        'new-user-hash',
        'Alice'
      );

      expect(mockBoardRepository.findById).toHaveBeenCalledWith(boardId.toHexString());
      expect(mockUserSessionRepository.upsert).toHaveBeenCalledWith(
        boardId.toHexString(),
        'new-user-hash',
        'Alice'
      );
      expect(result.alias).toBe('Alice');
      expect(result.is_admin).toBe(false);
    });

    it('should return is_admin=true for admin user', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockUserSessionRepository.upsert!).mockResolvedValue({
        ...mockSessionDoc,
        cookie_hash: 'admin-hash',
      });

      const result = await service.joinBoard(
        boardId.toHexString(),
        'admin-hash',
        'AdminUser'
      );

      expect(result.is_admin).toBe(true);
    });

    it('should return is_admin=true for creator', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockUserSessionRepository.upsert!).mockResolvedValue({
        ...mockSessionDoc,
        cookie_hash: 'creator-hash',
      });

      const result = await service.joinBoard(
        boardId.toHexString(),
        'creator-hash',
        'Creator'
      );

      expect(result.is_admin).toBe(true);
    });

    it('should throw BOARD_NOT_FOUND when board does not exist', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(null);

      await expect(
        service.joinBoard(boardId.toHexString(), 'user-hash', 'Alice')
      ).rejects.toMatchObject({
        code: 'BOARD_NOT_FOUND',
        statusCode: 404,
      });
    });
  });

  describe('getActiveUsers', () => {
    it('should return active users with is_admin flags', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockUserSessionRepository.findActiveUsers!).mockResolvedValue([
        { ...mockSessionDoc, cookie_hash: 'creator-hash', alias: 'Creator' },
        { ...mockSessionDoc, cookie_hash: 'regular-user', alias: 'Regular' },
      ]);

      const result = await service.getActiveUsers(boardId.toHexString());

      expect(result).toHaveLength(2);
      expect(result[0].alias).toBe('Creator');
      expect(result[0].is_admin).toBe(true);
      expect(result[1].alias).toBe('Regular');
      expect(result[1].is_admin).toBe(false);
    });

    it('should return empty array when no active users', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockUserSessionRepository.findActiveUsers!).mockResolvedValue([]);

      const result = await service.getActiveUsers(boardId.toHexString());

      expect(result).toEqual([]);
    });

    it('should throw BOARD_NOT_FOUND when board does not exist', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(null);

      await expect(
        service.getActiveUsers(boardId.toHexString())
      ).rejects.toMatchObject({
        code: 'BOARD_NOT_FOUND',
        statusCode: 404,
      });
    });
  });

  describe('updateHeartbeat', () => {
    it('should update heartbeat and return alias with timestamp', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockUserSessionRepository.updateHeartbeat!).mockResolvedValue(mockSessionDoc);

      const result = await service.updateHeartbeat(boardId.toHexString(), 'user-hash');

      expect(mockUserSessionRepository.updateHeartbeat).toHaveBeenCalledWith(
        boardId.toHexString(),
        'user-hash'
      );
      expect(result.alias).toBe('Alice');
      expect(result.last_active_at).toBeDefined();
    });

    it('should throw BOARD_NOT_FOUND when board does not exist', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(null);

      await expect(
        service.updateHeartbeat(boardId.toHexString(), 'user-hash')
      ).rejects.toMatchObject({
        code: 'BOARD_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should throw USER_NOT_FOUND when session does not exist', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockUserSessionRepository.updateHeartbeat!).mockResolvedValue(null);

      await expect(
        service.updateHeartbeat(boardId.toHexString(), 'nonexistent-hash')
      ).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
        statusCode: 404,
      });
    });
  });

  describe('updateAlias', () => {
    it('should update alias and return new alias with timestamp', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockUserSessionRepository.updateAlias!).mockResolvedValue({
        ...mockSessionDoc,
        alias: 'NewAlias',
      });

      const result = await service.updateAlias(
        boardId.toHexString(),
        'user-hash',
        'NewAlias'
      );

      expect(mockUserSessionRepository.updateAlias).toHaveBeenCalledWith(
        boardId.toHexString(),
        'user-hash',
        'NewAlias'
      );
      expect(result.alias).toBe('NewAlias');
    });

    it('should throw BOARD_NOT_FOUND when board does not exist', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(null);

      await expect(
        service.updateAlias(boardId.toHexString(), 'user-hash', 'NewAlias')
      ).rejects.toMatchObject({
        code: 'BOARD_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should throw USER_NOT_FOUND when session does not exist', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockUserSessionRepository.updateAlias!).mockResolvedValue(null);

      await expect(
        service.updateAlias(boardId.toHexString(), 'nonexistent-hash', 'NewAlias')
      ).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
        statusCode: 404,
      });
    });
  });

  describe('getUserSession', () => {
    it('should return session with is_admin flag when found', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockUserSessionRepository.findByBoardAndUser!).mockResolvedValue({
        ...mockSessionDoc,
        cookie_hash: 'admin-hash',
      });

      const result = await service.getUserSession(boardId.toHexString(), 'admin-hash');

      expect(result).not.toBeNull();
      expect(result!.is_admin).toBe(true);
    });

    it('should throw BOARD_NOT_FOUND when board does not exist', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(null);

      await expect(
        service.getUserSession(boardId.toHexString(), 'user-hash')
      ).rejects.toThrow('Board not found');
    });

    it('should return null when session does not exist', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockUserSessionRepository.findByBoardAndUser!).mockResolvedValue(null);

      const result = await service.getUserSession(boardId.toHexString(), 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteSessionsForBoard', () => {
    it('should delete all sessions for board', async () => {
      vi.mocked(mockUserSessionRepository.deleteByBoard!).mockResolvedValue(5);

      const result = await service.deleteSessionsForBoard(boardId.toHexString());

      expect(mockUserSessionRepository.deleteByBoard).toHaveBeenCalledWith(
        boardId.toHexString()
      );
      expect(result).toBe(5);
    });
  });
});
