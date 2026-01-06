/**
 * E2E Admin Helpers
 *
 * Utility functions for admin operations in E2E tests.
 * Uses X-Admin-Secret header to bypass WebSocket-based admin detection.
 *
 * This allows tests to reliably perform admin actions without depending
 * on the WebSocket session establishing admin status first.
 */

import type { APIRequestContext, APIResponse } from '@playwright/test';

// Admin secret from environment or default dev secret
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-admin-secret-16chars';

// API base URL - defaults to local backend
const API_BASE = process.env.API_BASE || 'http://localhost:3001/v1';

/**
 * Make an API request with admin override header.
 * Bypasses normal admin detection for reliable E2E tests.
 *
 * @param request - Playwright's APIRequestContext
 * @param method - HTTP method
 * @param path - API path (starting with /)
 * @param data - Request body data (optional)
 * @returns Promise<APIResponse>
 */
export async function adminRequest(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  data?: unknown
): Promise<APIResponse> {
  const url = `${API_BASE}${path}`;
  const options = {
    headers: {
      'X-Admin-Secret': ADMIN_SECRET,
      'Content-Type': 'application/json',
    },
    data,
  };

  switch (method) {
    case 'GET':
      return request.get(url, options);
    case 'POST':
      return request.post(url, options);
    case 'PATCH':
      return request.patch(url, options);
    case 'DELETE':
      return request.delete(url, options);
  }
}

/**
 * Close a board using admin override.
 * This bypasses WebSocket admin detection and directly closes the board via API.
 *
 * @param request - Playwright's APIRequestContext
 * @param boardId - Board ID to close
 */
export async function closeBoardViaApi(request: APIRequestContext, boardId: string): Promise<void> {
  const response = await adminRequest(request, 'PATCH', `/boards/${boardId}/close`, {});
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to close board: ${response.status()} - ${body}`);
  }
}

/**
 * Rename a board using admin override.
 * This bypasses WebSocket admin detection and directly renames the board via API.
 *
 * @param request - Playwright's APIRequestContext
 * @param boardId - Board ID to rename
 * @param name - New board name
 */
export async function renameBoardViaApi(
  request: APIRequestContext,
  boardId: string,
  name: string
): Promise<void> {
  const response = await adminRequest(request, 'PATCH', `/boards/${boardId}/name`, {
    name,
  });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to rename board: ${response.status()} - ${body}`);
  }
}

/**
 * Promote a user to admin using admin override.
 * This bypasses WebSocket admin detection and directly promotes the user via API.
 *
 * @param request - Playwright's APIRequestContext
 * @param boardId - Board ID
 * @param userCookieHash - The user's cookie hash (participant ID)
 */
export async function promoteAdminViaApi(
  request: APIRequestContext,
  boardId: string,
  userCookieHash: string
): Promise<void> {
  const response = await adminRequest(request, 'POST', `/boards/${boardId}/admins`, {
    user_cookie_hash: userCookieHash,
  });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to promote admin: ${response.status()} - ${body}`);
  }
}

/**
 * Get board data via admin API.
 *
 * @param request - Playwright's APIRequestContext
 * @param boardId - Board ID to fetch
 * @returns Board data object
 */
export async function getBoardViaApi(
  request: APIRequestContext,
  boardId: string
): Promise<{
  id: string;
  name: string;
  is_closed: boolean;
  admins: string[];
  creator_hash: string;
}> {
  const response = await adminRequest(request, 'GET', `/boards/${boardId}`);
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to get board: ${response.status()} - ${body}`);
  }
  return response.json();
}

/**
 * Extract board ID from a page URL.
 * Works with URLs like /boards/{id} or /boards/{id}?query=params
 *
 * @param url - Page URL
 * @returns Board ID or null if not found
 */
export function extractBoardIdFromUrl(url: string): string | null {
  const match = url.match(/\/boards\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}
