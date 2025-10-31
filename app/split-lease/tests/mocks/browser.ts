/**
 * MSW browser setup for browser test environment
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * Create MSW browser worker instance with handlers
 */
export const worker = setupWorker(...handlers);
