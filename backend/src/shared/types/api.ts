import { Request as ExpressRequest } from 'express';

// Extend Express Request to include our custom properties
export interface AuthenticatedRequest extends ExpressRequest {
  hashedCookieId: string;
  sessionId?: string;
  /** Set by adminOverrideMiddleware when valid X-Admin-Secret header is provided */
  isAdminOverride?: boolean;
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
  NOT_FOUND: 'NOT_FOUND',
  CARD_LIMIT_REACHED: 'CARD_LIMIT_REACHED',
  REACTION_LIMIT_REACHED: 'REACTION_LIMIT_REACHED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  BOARD_NOT_FOUND: 'BOARD_NOT_FOUND',
  CARD_NOT_FOUND: 'CARD_NOT_FOUND',
  COLUMN_NOT_FOUND: 'COLUMN_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  REACTION_NOT_FOUND: 'REACTION_NOT_FOUND',
  BOARD_CLOSED: 'BOARD_CLOSED',
  CIRCULAR_RELATIONSHIP: 'CIRCULAR_RELATIONSHIP',
  CHILD_CANNOT_BE_PARENT: 'CHILD_CANNOT_BE_PARENT',
  PARENT_CANNOT_BE_CHILD: 'PARENT_CANNOT_BE_CHILD',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// Map error codes to HTTP status codes
export const ErrorCodeToStatusCode: Record<ErrorCode, number> = {
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.CARD_LIMIT_REACHED]: 403,
  [ErrorCodes.REACTION_LIMIT_REACHED]: 403,
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCodes.BOARD_NOT_FOUND]: 404,
  [ErrorCodes.CARD_NOT_FOUND]: 404,
  [ErrorCodes.COLUMN_NOT_FOUND]: 400,
  [ErrorCodes.USER_NOT_FOUND]: 404,
  [ErrorCodes.REACTION_NOT_FOUND]: 404,
  [ErrorCodes.BOARD_CLOSED]: 409,
  [ErrorCodes.CIRCULAR_RELATIONSHIP]: 400,
  [ErrorCodes.CHILD_CANNOT_BE_PARENT]: 400,
  [ErrorCodes.PARENT_CANNOT_BE_CHILD]: 400,
  [ErrorCodes.DATABASE_ERROR]: 500,
  [ErrorCodes.INTERNAL_ERROR]: 500,
};

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
