/**
 * MSW Server Setup
 * Test server configuration for integration tests
 */

import { setupServer } from 'msw/node';
import { handlers, resetMockData } from './handlers';

// Create the test server instance
export const server = setupServer(...handlers);

// Export reset function for test isolation
export { resetMockData };
