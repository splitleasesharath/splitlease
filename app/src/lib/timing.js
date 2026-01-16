/**
 * Timing utilities
 * Provides async delay functions for controlled waiting in async flows
 */

/**
 * Async delay utility - replaces manual setTimeout Promise patterns
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
