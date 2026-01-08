import { z } from 'zod';
import { ObjectId } from 'mongodb';

// Custom ObjectId validator
export const objectIdSchema = z.string().refine(
  (val) => ObjectId.isValid(val),
  { message: 'Invalid ObjectId format' }
);

// Hex color validator
export const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, {
  message: 'Color must be in hex format (#RRGGBB)',
});

// Alias validator (alphanumeric, spaces, hyphens, underscores)
export const aliasSchema = z
  .string()
  .min(1, 'Alias is required')
  .max(50, 'Alias must be 50 characters or less')
  .regex(/^[a-zA-Z0-9 _-]+$/, {
    message: 'Alias can only contain letters, numbers, spaces, hyphens, and underscores',
  });

// Column ID validator (alphanumeric, hyphens, underscores only)
export const columnIdSchema = z
  .string()
  .min(1, 'Column ID is required')
  .max(50, 'Column ID must be 50 characters or less')
  .regex(/^[a-zA-Z0-9_-]+$/, {
    message: 'Column ID can only contain letters, numbers, hyphens, and underscores',
  });

// Column schema
export const columnSchema = z.object({
  id: columnIdSchema,
  name: z.string().min(1, 'Column name is required').max(100, 'Column name must be 100 characters or less'),
  color: hexColorSchema.optional(),
});

// Board creation schema
export const createBoardSchema = z.object({
  name: z.string().min(1, 'Board name is required').max(200, 'Board name must be 200 characters or less'),
  columns: z
    .array(columnSchema)
    .min(1, 'Must have at least 1 column')
    .max(10, 'Maximum 10 columns allowed'),
  card_limit_per_user: z.number().int().positive().optional().nullable(),
  reaction_limit_per_user: z.number().int().positive().optional().nullable(),
  // Optional creator alias - if provided, auto-creates user session for the creator
  creator_alias: aliasSchema.optional(),
});

// Join board schema
export const joinBoardSchema = z.object({
  alias: aliasSchema,
});

// Update board name schema
export const updateBoardNameSchema = z.object({
  name: z.string().min(1, 'Board name is required').max(200, 'Board name must be 200 characters or less'),
});

// Update column name schema
export const updateColumnNameSchema = z.object({
  name: z.string().min(1, 'Column name is required').max(100, 'Column name must be 100 characters or less'),
});

// Add admin schema
export const addAdminSchema = z.object({
  user_cookie_hash: z.string().min(1, 'User cookie hash is required'),
});

// Card type enum
export const cardTypeSchema = z.enum(['feedback', 'action']);

// Create card schema
export const createCardSchema = z.object({
  column_id: columnIdSchema,
  content: z.string().min(1, 'Content is required').max(5000, 'Content must be 5000 characters or less'),
  card_type: cardTypeSchema,
  is_anonymous: z.boolean().optional().default(false),
  // Optional correlation ID for optimistic update deduplication
  correlation_id: z.string().uuid().optional(),
});

// Update card schema
export const updateCardSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000, 'Content must be 5000 characters or less'),
});

// Move card schema
export const moveCardSchema = z.object({
  column_id: columnIdSchema,
});

// Link type enum
export const linkTypeSchema = z.enum(['parent_of', 'linked_to']);

// Link cards schema
export const linkCardsSchema = z.object({
  target_card_id: objectIdSchema,
  link_type: linkTypeSchema,
});

// Add reaction schema
export const addReactionSchema = z.object({
  reaction_type: z.string().min(1, 'Reaction type is required').default('thumbs_up'),
});

// Update alias schema
export const updateAliasSchema = z.object({
  alias: aliasSchema,
});

// Seed test data schema
export const seedTestDataSchema = z.object({
  num_users: z.number().int().positive().max(100).default(5),
  num_cards: z.number().int().positive().max(500).default(20),
  num_action_cards: z.number().int().nonnegative().max(50).default(5),
  num_reactions: z.number().int().nonnegative().max(1000).default(50),
  create_relationships: z.boolean().default(true),
});

// ObjectId param schema (for route params)
export const objectIdParamSchema = z.object({
  id: objectIdSchema,
});

// Export types inferred from schemas
export type CreateBoardDTO = z.infer<typeof createBoardSchema>;
export type JoinBoardDTO = z.infer<typeof joinBoardSchema>;
export type UpdateBoardNameDTO = z.infer<typeof updateBoardNameSchema>;
export type UpdateColumnNameDTO = z.infer<typeof updateColumnNameSchema>;
export type AddAdminDTO = z.infer<typeof addAdminSchema>;
export type CreateCardDTO = z.infer<typeof createCardSchema>;
export type UpdateCardDTO = z.infer<typeof updateCardSchema>;
export type MoveCardDTO = z.infer<typeof moveCardSchema>;
export type LinkCardsDTO = z.infer<typeof linkCardsSchema>;
export type AddReactionDTO = z.infer<typeof addReactionSchema>;
export type UpdateAliasDTO = z.infer<typeof updateAliasSchema>;
export type SeedTestDataDTO = z.infer<typeof seedTestDataSchema>;
export type Column = z.infer<typeof columnSchema>;
export type CardType = z.infer<typeof cardTypeSchema>;
export type LinkType = z.infer<typeof linkTypeSchema>;
