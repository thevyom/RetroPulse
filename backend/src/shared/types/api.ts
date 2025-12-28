import { Request as ExpressRequest } from 'express';

// Extend Express Request to include our custom properties
export interface AuthenticatedRequest extends ExpressRequest {
  hashedCookieId: string;
  sessionId?: string;
}

// Standard API response format
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Pagination types
export interface PaginationParams {
  offset?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

// Error codes (matching API specification)
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CARD_LIMIT_REACHED: 'CARD_LIMIT_REACHED',
  REACTION_LIMIT_REACHED: 'REACTION_LIMIT_REACHED',
  BOARD_NOT_FOUND: 'BOARD_NOT_FOUND',
  CARD_NOT_FOUND: 'CARD_NOT_FOUND',
  COLUMN_NOT_FOUND: 'COLUMN_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  REACTION_NOT_FOUND: 'REACTION_NOT_FOUND',
  BOARD_CLOSED: 'BOARD_CLOSED',
  CIRCULAR_RELATIONSHIP: 'CIRCULAR_RELATIONSHIP',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
