/**
 * Global Toast Service
 * Provides a centralized way to show toast notifications without prop drilling.
 * Uses a pub/sub pattern for decoupled notification dispatch.
 */

const listeners = new Set();

export const ToastType = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - One of ToastType values
 * @param {number} duration - Duration in ms (default 4000)
 */
export function showToast(message, type = ToastType.INFO, duration = 4000) {
  listeners.forEach(listener => listener({ message, type, duration }));
}

/**
 * Subscribe to toast events (used by Toast component)
 * @param {Function} listener - Callback function
 * @returns {Function} Unsubscribe function
 */
export function subscribeToToasts(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Convenience methods
export const toast = {
  success: (msg, duration) => showToast(msg, ToastType.SUCCESS, duration),
  error: (msg, duration) => showToast(msg, ToastType.ERROR, duration),
  warning: (msg, duration) => showToast(msg, ToastType.WARNING, duration),
  info: (msg, duration) => showToast(msg, ToastType.INFO, duration)
};
