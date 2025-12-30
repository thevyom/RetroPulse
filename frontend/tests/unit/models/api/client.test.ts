/**
 * API Client Tests
 * Tests for Axios HTTP client configuration and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, extractData } from '@/models/api/client';
import { ApiRequestError, isApiErrorResponse, isApiResponse } from '@/models/types';

// Mock axios
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: {
      baseURL: '',
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    },
  };
  return { default: mockAxios };
});

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should be configured with withCredentials for session auth', () => {
      expect(apiClient.defaults.withCredentials).toBe(true);
    });

    it('should have Content-Type header set to application/json', () => {
      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    });

    it('should have a baseURL configured', () => {
      expect(apiClient.defaults.baseURL).toBeDefined();
    });
  });

  describe('extractData', () => {
    it('should extract data from API response wrapper', () => {
      const mockResponse = {
        data: {
          success: true,
          data: { id: '123', name: 'Test Board' },
          timestamp: '2025-12-29T00:00:00Z',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      const result = extractData(mockResponse as never);

      expect(result).toEqual({ id: '123', name: 'Test Board' });
    });
  });
});

describe('ApiRequestError', () => {
  describe('fromApiError', () => {
    it('should create error from API error response', () => {
      const apiError = {
        code: 'BOARD_NOT_FOUND' as const,
        message: 'Board not found',
        details: { boardId: '123' },
      };

      const error = ApiRequestError.fromApiError(apiError, 404);

      expect(error).toBeInstanceOf(ApiRequestError);
      expect(error.code).toBe('BOARD_NOT_FOUND');
      expect(error.message).toBe('Board not found');
      expect(error.statusCode).toBe(404);
      expect(error.details).toEqual({ boardId: '123' });
    });
  });

  describe('networkError', () => {
    it('should create network error with default message', () => {
      const error = ApiRequestError.networkError();

      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toBe('Network error occurred');
    });

    it('should create network error with custom message', () => {
      const error = ApiRequestError.networkError('Connection refused');

      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toBe('Connection refused');
    });
  });

  describe('unknownError', () => {
    it('should create unknown error with default message', () => {
      const error = ApiRequestError.unknownError();

      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.message).toBe('An unknown error occurred');
    });

    it('should create unknown error with custom message', () => {
      const error = ApiRequestError.unknownError('Something went wrong');

      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.message).toBe('Something went wrong');
    });
  });
});

describe('Type Guards', () => {
  describe('isApiErrorResponse', () => {
    it('should return true for valid error response', () => {
      const response = {
        success: false,
        error: {
          code: 'BOARD_NOT_FOUND',
          message: 'Board not found',
        },
        timestamp: '2025-12-29T00:00:00Z',
      };

      expect(isApiErrorResponse(response)).toBe(true);
    });

    it('should return false for success response', () => {
      const response = {
        success: true,
        data: { id: '123' },
        timestamp: '2025-12-29T00:00:00Z',
      };

      expect(isApiErrorResponse(response)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isApiErrorResponse(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isApiErrorResponse('string')).toBe(false);
      expect(isApiErrorResponse(123)).toBe(false);
      expect(isApiErrorResponse(undefined)).toBe(false);
    });

    it('should return false for object without success field', () => {
      expect(isApiErrorResponse({ error: {} })).toBe(false);
    });

    it('should return false for object without error field', () => {
      expect(isApiErrorResponse({ success: false })).toBe(false);
    });
  });

  describe('isApiResponse', () => {
    it('should return true for valid success response', () => {
      const response = {
        success: true,
        data: { id: '123', name: 'Test' },
        timestamp: '2025-12-29T00:00:00Z',
      };

      expect(isApiResponse(response)).toBe(true);
    });

    it('should return false for error response', () => {
      const response = {
        success: false,
        error: { code: 'ERROR', message: 'Error' },
        timestamp: '2025-12-29T00:00:00Z',
      };

      expect(isApiResponse(response)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isApiResponse(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isApiResponse('string')).toBe(false);
      expect(isApiResponse(123)).toBe(false);
      expect(isApiResponse(undefined)).toBe(false);
    });

    it('should return false for object without success field', () => {
      expect(isApiResponse({ data: {} })).toBe(false);
    });

    it('should return false for object without data field', () => {
      expect(isApiResponse({ success: true })).toBe(false);
    });
  });
});
