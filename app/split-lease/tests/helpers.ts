/**
 * Test helper functions
 * Provides custom render functions and common testing utilities
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

/**
 * Custom render function with common providers
 * @param ui - Component to render
 * @param options - Render options
 * @returns Render result
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  // Add any global providers here (e.g., theme, router, state management)
  return render(ui, { ...options });
}

/**
 * Wait for element to be removed from DOM
 * @param callback - Callback to wait for
 * @param options - Wait options
 */
export async function waitForElementToBeRemoved(
  callback: () => HTMLElement | null,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout || 3000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (!callback()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error('Element was not removed within timeout');
}

/**
 * Create mock function with type safety
 * @returns Mock function
 */
export function createMockFn<T extends (...args: any[]) => any>(): jest.Mock<
  ReturnType<T>,
  Parameters<T>
> {
  return jest.fn();
}

/**
 * Simulate async operation delay
 * @param ms - Milliseconds to wait
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create mock event
 * @param type - Event type
 * @param properties - Event properties
 * @returns Mock event
 */
export function createMockEvent<T = Element>(
  type: string,
  properties?: Partial<Event>
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true, ...properties });
  return event;
}

/**
 * Create mock mouse event
 * @param type - Event type
 * @param properties - Event properties
 * @returns Mock mouse event
 */
export function createMockMouseEvent(
  type: string,
  properties?: Partial<MouseEvent>
): MouseEvent {
  return new MouseEvent(type, { bubbles: true, cancelable: true, ...properties });
}

/**
 * Create mock keyboard event
 * @param type - Event type
 * @param properties - Event properties
 * @returns Mock keyboard event
 */
export function createMockKeyboardEvent(
  type: string,
  properties?: Partial<KeyboardEvent>
): KeyboardEvent {
  return new KeyboardEvent(type, { bubbles: true, cancelable: true, ...properties });
}

/**
 * Get element by test id
 * @param testId - Test ID
 * @returns Element or null
 */
export function getByTestId(testId: string): HTMLElement | null {
  return document.querySelector(`[data-testid="${testId}"]`);
}

/**
 * Query all elements by test id
 * @param testId - Test ID
 * @returns NodeList of elements
 */
export function getAllByTestId(testId: string): NodeListOf<HTMLElement> {
  return document.querySelectorAll(`[data-testid="${testId}"]`);
}

/**
 * Check if element has class
 * @param element - Element to check
 * @param className - Class name
 * @returns True if element has class
 */
export function hasClass(element: HTMLElement, className: string): boolean {
  return element.classList.contains(className);
}

/**
 * Get computed style property
 * @param element - Element to get style from
 * @param property - CSS property name
 * @returns Property value
 */
export function getComputedStyleProperty(element: HTMLElement, property: string): string {
  return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * Mock console methods
 * @param methods - Console methods to mock
 * @returns Object with original methods and restore function
 */
export function mockConsole(methods: ('log' | 'warn' | 'error' | 'info')[] = ['error']) {
  const original: Record<string, any> = {};
  const mocks: Record<string, jest.Mock> = {};

  methods.forEach((method) => {
    original[method] = console[method];
    mocks[method] = jest.fn();
    console[method] = mocks[method];
  });

  return {
    mocks,
    restore: () => {
      methods.forEach((method) => {
        console[method] = original[method];
      });
    },
  };
}
