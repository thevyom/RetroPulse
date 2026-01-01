/**
 * Common API types
 * Standard response wrappers and error types
 */

// ============================================================================
// Standard API Response Wrapper
// ============================================================================

export interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  timestamp: string;
}

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Error Codes
// ============================================================================

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CARD_LIMIT_REACHED'
  | 'REACTION_LIMIT_REACHED'
  | 'BOARD_NOT_FOUND'
  | 'CARD_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'BOARD_CLOSED'
  | 'CIRCULAR_RELATIONSHIP'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'DATABASE_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

// ============================================================================
// Custom Error Classes
// ============================================================================

export class ApiRequestError extends Error {
  code: ApiErrorCode;
  statusCode?: number;
  details?: Record<string, unknown>;

  constructor(
    code: ApiErrorCode,
    message: string,
    statusCode?: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  static fromApiError(error: ApiError, statusCode?: number): ApiRequestError {
    return new ApiRequestError(error.code, error.message, statusCode, error.details);
  }

  static networkError(message = 'Network error occurred'): ApiRequestError {
    return new ApiRequestError('NETWORK_ERROR', message);
  }

  static unknownError(message = 'An unknown error occurred'): ApiRequestError {
    return new ApiRequestError('UNKNOWN_ERROR', message);
  }

  static rateLimited(retryAfter?: number): ApiRequestError {
    const message = retryAfter
      ? `Rate limited. Try again in ${retryAfter} seconds`
      : 'Rate limited. Please try again later';
    return new ApiRequestError('RATE_LIMITED', message, 429, { retryAfter });
  }

  /**
   * Check if this error is a rate limit error
   */
  isRateLimited(): boolean {
    return this.code === 'RATE_LIMITED' || this.statusCode === 429;
  }

  /**
   * Check if this error is a quota limit error
   */
  isQuotaLimited(): boolean {
    return this.code === 'CARD_LIMIT_REACHED' || this.code === 'REACTION_LIMIT_REACHED';
  }

  /**
   * Check if this error is recoverable (transient)
   */
  isRecoverable(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'RATE_LIMITED';
  }
}

// ============================================================================
// Type Guards
// ============================================================================

export function isApiErrorResponse(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    response.success === false &&
    'error' in response
  );
}

export function isApiResponse<T>(response: unknown): response is ApiResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    response.success === true &&
    'data' in response
  );
}
