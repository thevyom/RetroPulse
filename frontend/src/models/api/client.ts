/**
 * Axios HTTP Client Configuration
 * Centralized API client with interceptors for error handling and authentication
 */

import axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';
import type { ApiResponse, ApiErrorResponse } from '../types';
import { ApiRequestError, isApiErrorResponse } from '../types';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/v1';

// ============================================================================
// Axios Instance
// ============================================================================

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send cookies for session auth
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// ============================================================================
// Response Interceptor
// ============================================================================

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    // Handle network errors (no response)
    if (!error.response) {
      return Promise.reject(ApiRequestError.networkError(error.message || 'Network error'));
    }

    // Handle rate limiting (429)
    if (error.response.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
      return Promise.reject(ApiRequestError.rateLimited(retryAfterSeconds));
    }

    // Handle API errors with structured error response
    const responseData = error.response.data;
    if (isApiErrorResponse(responseData)) {
      return Promise.reject(
        ApiRequestError.fromApiError(responseData.error, error.response.status)
      );
    }

    // Handle unexpected error format
    return Promise.reject(
      ApiRequestError.unknownError(
        error.message || `Request failed with status ${error.response.status}`
      )
    );
  }
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract data from API response wrapper
 * @param response - Axios response with ApiResponse wrapper
 * @returns The unwrapped data
 */
export function extractData<T>(response: AxiosResponse<ApiResponse<T>>): T {
  return response.data.data;
}

// ============================================================================
// Export Types
// ============================================================================

export type { AxiosResponse, AxiosError };
