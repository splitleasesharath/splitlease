/**
 * MSW server setup for Node.js test environment
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * Create MSW server instance with handlers
 */
export const server = setupServer(...handlers);
