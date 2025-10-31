/**
 * Vitest Global Test Setup
 *
 * This file runs before all tests and sets up the testing environment.
 * It configures MSW for API mocking, extends matchers, and sets up global utilities.
 */

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './mocks/server';

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => {
  server.resetHandlers();
  cleanup();
});

// Clean up after the tests are finished
afterAll(() => {
  server.close();
});

// Global test utilities
declare global {
  var testUtils: {
    waitFor: (ms: number) => Promise<void>;
  };
}

globalThis.testUtils = {
  waitFor: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
};
