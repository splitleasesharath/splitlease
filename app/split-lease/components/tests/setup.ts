/**
 * Test Environment Setup
 *
 * Configures Testing Library and global test utilities for
 * component testing with Vitest.
 */

import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { toHaveNoViolations } from 'jest-axe';

// Extend Vitest matchers with Testing Library matchers
expect.extend(matchers);

// Extend with jest-axe matchers for accessibility testing
expect.extend(toHaveNoViolations);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock scrollTo for smooth scroll tests
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock pageYOffset
Object.defineProperty(window, 'pageYOffset', {
  writable: true,
  value: 0,
});
