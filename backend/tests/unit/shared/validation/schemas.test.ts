import { describe, it, expect } from 'vitest';
import {
  createBoardSchema,
  joinBoardSchema,
  createCardSchema,
  aliasSchema,
  hexColorSchema,
  objectIdSchema,
} from '@/shared/validation/schemas.js';

describe('objectIdSchema', () => {
  it('should accept valid ObjectId', () => {
    const result = objectIdSchema.safeParse('507f1f77bcf86cd799439011');
    expect(result.success).toBe(true);
  });

  it('should reject invalid ObjectId', () => {
    const result = objectIdSchema.safeParse('invalid-id');
    expect(result.success).toBe(false);
  });
});

describe('hexColorSchema', () => {
  it('should accept valid hex colors', () => {
    expect(hexColorSchema.safeParse('#FFFFFF').success).toBe(true);
    expect(hexColorSchema.safeParse('#000000').success).toBe(true);
    expect(hexColorSchema.safeParse('#abc123').success).toBe(true);
  });

  it('should reject invalid hex colors', () => {
    expect(hexColorSchema.safeParse('red').success).toBe(false);
    expect(hexColorSchema.safeParse('#FFF').success).toBe(false);
    expect(hexColorSchema.safeParse('#GGGGGG').success).toBe(false);
  });
});

describe('aliasSchema', () => {
  it('should accept valid aliases', () => {
    expect(aliasSchema.safeParse('Alice').success).toBe(true);
    expect(aliasSchema.safeParse('Bob-123').success).toBe(true);
    expect(aliasSchema.safeParse('User_Name').success).toBe(true);
    expect(aliasSchema.safeParse('Jane Doe').success).toBe(true);
  });

  it('should reject empty alias', () => {
    const result = aliasSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('should reject alias with special characters', () => {
    expect(aliasSchema.safeParse('Alice@123!').success).toBe(false);
    expect(aliasSchema.safeParse('User<script>').success).toBe(false);
  });

  it('should reject alias longer than 50 characters', () => {
    const result = aliasSchema.safeParse('a'.repeat(51));
    expect(result.success).toBe(false);
  });
});

describe('createBoardSchema', () => {
  it('should accept valid board data', () => {
    const data = {
      name: 'Sprint 42 Retro',
      columns: [
        { id: 'col-1', name: 'What Went Well', color: '#D5E8D4' },
        { id: 'col-2', name: 'Improvements', color: '#FFE6CC' },
      ],
      card_limit_per_user: 5,
      reaction_limit_per_user: 10,
    };

    const result = createBoardSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should accept board without limits', () => {
    const data = {
      name: 'Simple Board',
      columns: [{ id: 'col-1', name: 'Column 1' }],
    };

    const result = createBoardSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject empty name', () => {
    const data = {
      name: '',
      columns: [{ id: 'col-1', name: 'Column 1' }],
    };

    const result = createBoardSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject name longer than 200 characters', () => {
    const data = {
      name: 'a'.repeat(201),
      columns: [{ id: 'col-1', name: 'Column 1' }],
    };

    const result = createBoardSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject empty columns array', () => {
    const data = {
      name: 'Board',
      columns: [],
    };

    const result = createBoardSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject more than 10 columns', () => {
    const columns = Array.from({ length: 11 }, (_, i) => ({
      id: `col-${i}`,
      name: `Column ${i}`,
    }));

    const data = {
      name: 'Board',
      columns,
    };

    const result = createBoardSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject negative card limit', () => {
    const data = {
      name: 'Board',
      columns: [{ id: 'col-1', name: 'Column 1' }],
      card_limit_per_user: -5,
    };

    const result = createBoardSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('joinBoardSchema', () => {
  it('should accept valid alias', () => {
    const result = joinBoardSchema.safeParse({ alias: 'Alice' });
    expect(result.success).toBe(true);
  });

  it('should reject missing alias', () => {
    const result = joinBoardSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('createCardSchema', () => {
  it('should accept valid feedback card', () => {
    const data = {
      column_id: 'col-1',
      content: 'Great team collaboration!',
      card_type: 'feedback',
      is_anonymous: false,
    };

    const result = createCardSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should accept valid action card', () => {
    const data = {
      column_id: 'col-1',
      content: 'Improve test coverage',
      card_type: 'action',
    };

    const result = createCardSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should default is_anonymous to false', () => {
    const data = {
      column_id: 'col-1',
      content: 'Content',
      card_type: 'feedback',
    };

    const result = createCardSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_anonymous).toBe(false);
    }
  });

  it('should reject content longer than 5000 characters', () => {
    const data = {
      column_id: 'col-1',
      content: 'a'.repeat(5001),
      card_type: 'feedback',
    };

    const result = createCardSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject invalid card type', () => {
    const data = {
      column_id: 'col-1',
      content: 'Content',
      card_type: 'invalid',
    };

    const result = createCardSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should accept valid correlation_id (UUID)', () => {
    const data = {
      column_id: 'col-1',
      content: 'Content',
      card_type: 'feedback',
      correlation_id: '550e8400-e29b-41d4-a716-446655440000',
    };

    const result = createCardSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.correlation_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    }
  });

  it('should reject invalid correlation_id (not UUID)', () => {
    const data = {
      column_id: 'col-1',
      content: 'Content',
      card_type: 'feedback',
      correlation_id: 'not-a-uuid',
    };

    const result = createCardSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should work without correlation_id (optional)', () => {
    const data = {
      column_id: 'col-1',
      content: 'Content',
      card_type: 'feedback',
    };

    const result = createCardSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.correlation_id).toBeUndefined();
    }
  });
});
