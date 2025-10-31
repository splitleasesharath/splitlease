/**
 * MSW Server Setup
 *
 * Configures the Mock Service Worker server for intercepting
 * network requests during testing.
 *
 * See: https://mswjs.io/docs/getting-started/integrate/node
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup requests interception using the given handlers
export const server = setupServer(...handlers);
