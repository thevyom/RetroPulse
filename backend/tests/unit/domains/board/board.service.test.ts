import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { BoardService } from '@/domains/board/board.service.js';
import { BoardRepository } from '@/domains/board/board.repository.js';
import type { BoardDocument } from '@/domains/board/types.js';

// Mock the BoardRepository
vi.mock('@/domains/board/board.repository.js');

// Mock env
vi.mock('@/shared/config/index.js', () => ({
  env: {
    APP_URL: 'http://localhost:3000',
  },
}));

describe('BoardService', () => {
  let service: BoardService;
  let mockRepository: Partial<BoardRepository>;

  const mockBoardDoc: BoardDocument = {
    _id: new ObjectId(),
    name: 'Test Board',
    columns: [{ id: 'col-1', name: 'Column 1' }],
    shareable_link: 'abc12345',
    state: 'active',
    card_limit_per_user: 5,
    reaction_limit_per_user: 10,
    created_by_hash: 'creator-hash',
    admins: ['creator-hash'],
    created_at: new Date(),
    closed_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByShareableLink: vi.fn(),
      updateName: vi.fn(),
      closeBoard: vi.fn(),
      addAdmin: vi.fn(),
      isAdmin: vi.fn(),
      isCreator: vi.fn(),
      renameColumn: vi.fn(),
      delete: vi.fn(),
    };

    service = new BoardService(mockRepository as BoardRepository);
  });

  describe('createBoard', () => {
    it('should create a board and return with full shareable link', async () => {
      vi.mocked(mockRepository.create!).mockResolvedValue(mockBoardDoc);

      const input = {
        name: 'Test Board',
        columns: [{ id: 'col-1', name: 'Column 1' }],
      };

      const result = await service.createBoard(input, 'creator-hash');

      expect(mockRepository.create).toHaveBeenCalledWith(input, 'creator-hash');
      expect(result.name).toBe('Test Board');
      expect(result.shareable_link).toBe('http://localhost:3000/join/abc12345');
    });
  });

  describe('getBoard', () => {
    it('should return board when found', async () => {
      vi.mocked(mockRepository.findById!).mockResolvedValue(mockBoardDoc);

      const result = await service.getBoard(mockBoardDoc._id.toHexString());

      expect(result.name).toBe('Test Board');
      expect(result.shareable_link).toContain('abc12345');
    });

    it('should throw BOARD_NOT_FOUND when not found', async () => {
      vi.mocked(mockRepository.findById!).mockResolvedValue(null);

      await expect(service.getBoard('nonexistent')).rejects.toMatchObject({
        code: 'BOARD_NOT_FOUND',
        statusCode: 404,
      });
    });
  });

  describe('updateBoardName', () => {
    it('should update name when user is admin and board is active', async () => {
      vi.mocked(mockRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockRepository.updateName!).mockResolvedValue({
        ...mockBoardDoc,
        name: 'New Name',
      });

      const result = await service.updateBoardName(
        mockBoardDoc._id.toHexString(),
        'New Name',
        'creator-hash'
      );

      expect(result.name).toBe('New Name');
      expect(mockRepository.updateName).toHaveBeenCalledWith(
        mockBoardDoc._id.toHexString(),
        'New Name',
        { requireActive: true, requireAdmin: 'creator-hash' }
      );
    });

    it('should throw FORBIDDEN when user is not admin', async () => {
      vi.mocked(mockRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockRepository.updateName!).mockResolvedValue(null); // Atomic update returns null when admin check fails

      await expect(
        service.updateBoardName(mockBoardDoc._id.toHexString(), 'New Name', 'other-hash')
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });

    it('should throw BOARD_CLOSED when board is closed', async () => {
      vi.mocked(mockRepository.findById!).mockResolvedValue({
        ...mockBoardDoc,
        state: 'closed',
      });

      await expect(
        service.updateBoardName(mockBoardDoc._id.toHexString(), 'New Name', 'creator-hash')
      ).rejects.toMatchObject({
        code: 'BOARD_CLOSED',
        statusCode: 409,
      });
    });
  });

  describe('closeBoard', () => {
    it('should close board when user is admin', async () => {
      vi.mocked(mockRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockRepository.closeBoard!).mockResolvedValue({
        ...mockBoardDoc,
        state: 'closed',
        closed_at: new Date(),
      });

      const result = await service.closeBoard(mockBoardDoc._id.toHexString(), 'creator-hash');

      expect(result.state).toBe('closed');
      expect(result.closed_at).not.toBeNull();
    });

    it('should throw BOARD_NOT_FOUND when board does not exist', async () => {
      vi.mocked(mockRepository.findById!).mockResolvedValue(null);

      await expect(
        service.closeBoard(mockBoardDoc._id.toHexString(), 'other-hash')
      ).rejects.toMatchObject({
        code: 'BOARD_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should throw FORBIDDEN when user is not admin', async () => {
      vi.mocked(mockRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockRepository.closeBoard!).mockResolvedValue(null);

      await expect(
        service.closeBoard(mockBoardDoc._id.toHexString(), 'other-hash')
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });
  });

  describe('addAdmin', () => {
    it('should add admin when requester is creator and board is active', async () => {
      vi.mocked(mockRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockRepository.addAdmin!).mockResolvedValue({
        ...mockBoardDoc,
        admins: ['creator-hash', 'new-admin-hash'],
      });

      const result = await service.addAdmin(
        mockBoardDoc._id.toHexString(),
        'new-admin-hash',
        'creator-hash'
      );

      expect(result.admins).toContain('new-admin-hash');
      expect(mockRepository.addAdmin).toHaveBeenCalledWith(
        mockBoardDoc._id.toHexString(),
        'new-admin-hash',
        { requireActive: true, requireCreator: 'creator-hash' }
      );
    });

    it('should throw FORBIDDEN when requester is not creator', async () => {
      vi.mocked(mockRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockRepository.addAdmin!).mockResolvedValue(null); // Atomic update returns null when creator check fails

      await expect(
        service.addAdmin(mockBoardDoc._id.toHexString(), 'new-admin', 'not-creator')
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });

    it('should throw BOARD_CLOSED when board is closed', async () => {
      vi.mocked(mockRepository.findById!).mockResolvedValue({
        ...mockBoardDoc,
        state: 'closed',
      });

      await expect(
        service.addAdmin(mockBoardDoc._id.toHexString(), 'new-admin', 'creator-hash')
      ).rejects.toMatchObject({
        code: 'BOARD_CLOSED',
        statusCode: 409,
      });
    });
  });

  describe('renameColumn', () => {
    it('should rename column when user is admin and board is active', async () => {
      vi.mocked(mockRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockRepository.renameColumn!).mockResolvedValue({
        ...mockBoardDoc,
        columns: [{ id: 'col-1', name: 'New Column Name' }],
      });

      const result = await service.renameColumn(
        mockBoardDoc._id.toHexString(),
        'col-1',
        'New Column Name',
        'creator-hash'
      );

      expect(result.columns[0]!.name).toBe('New Column Name');
      expect(mockRepository.renameColumn).toHaveBeenCalledWith(
        mockBoardDoc._id.toHexString(),
        'col-1',
        'New Column Name',
        { requireActive: true, requireAdmin: 'creator-hash' }
      );
    });

    it('should throw COLUMN_NOT_FOUND when column not found', async () => {
      // Mock board without the column we're trying to rename
      vi.mocked(mockRepository.findById!).mockResolvedValue(mockBoardDoc);

      await expect(
        service.renameColumn(
          mockBoardDoc._id.toHexString(),
          'nonexistent', // This column doesn't exist in mockBoardDoc
          'Name',
          'creator-hash'
        )
      ).rejects.toMatchObject({
        code: 'COLUMN_NOT_FOUND',
        statusCode: 400,
      });
    });

    it('should throw FORBIDDEN when user is not admin', async () => {
      vi.mocked(mockRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockRepository.renameColumn!).mockResolvedValue(null); // Atomic update returns null when admin check fails

      await expect(
        service.renameColumn(
          mockBoardDoc._id.toHexString(),
          'col-1',
          'Name',
          'other-hash'
        )
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });
  });

  describe('deleteBoard', () => {
    it('should delete board when user is creator', async () => {
      vi.mocked(mockRepository.isCreator!).mockResolvedValue(true);
      vi.mocked(mockRepository.delete!).mockResolvedValue(true);

      await expect(
        service.deleteBoard(mockBoardDoc._id.toHexString(), 'creator-hash')
      ).resolves.toBeUndefined();

      expect(mockRepository.delete).toHaveBeenCalled();
    });

    it('should delete board with admin secret bypass', async () => {
      vi.mocked(mockRepository.delete!).mockResolvedValue(true);

      await expect(
        service.deleteBoard(mockBoardDoc._id.toHexString(), 'any-hash', true)
      ).resolves.toBeUndefined();

      // isCreator should not be called when using admin secret
      expect(mockRepository.isCreator).not.toHaveBeenCalled();
    });

    it('should throw FORBIDDEN when user is not creator', async () => {
      vi.mocked(mockRepository.isCreator!).mockResolvedValue(false);

      await expect(
        service.deleteBoard(mockBoardDoc._id.toHexString(), 'other-hash')
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });

    it('should throw BOARD_NOT_FOUND when board does not exist', async () => {
      vi.mocked(mockRepository.isCreator!).mockResolvedValue(true);
      vi.mocked(mockRepository.delete!).mockResolvedValue(false);

      await expect(
        service.deleteBoard(mockBoardDoc._id.toHexString(), 'creator-hash')
      ).rejects.toMatchObject({
        code: 'BOARD_NOT_FOUND',
        statusCode: 404,
      });
    });
  });
});
