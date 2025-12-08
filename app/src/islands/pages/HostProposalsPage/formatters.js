/**
 * Formatting utilities for Host Proposals Page
 */

/**
 * Format a number as currency (USD)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '0.00';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format a date as M/D/YY
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear().toString().slice(-2);
  return `${month}/${day}/${year}`;
}

/**
 * Format a date as full date (e.g., "Mar 28, 2025")
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatFullDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format a date with time (e.g., "Mar 28, 2025 12:00 pm")
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date/time string
 */
export function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).replace(',', '');
}

/**
 * Format time only (e.g., "2:00 pm")
 * @param {string} time - The time string
 * @returns {string} Formatted time string
 */
export function formatTime(time) {
  if (!time) return '';
  return time.toLowerCase();
}

/**
 * Format a date range
 * @param {Date|string} start - Start date
 * @param {Date|string} end - End date
 * @returns {string} Formatted date range
 */
export function formatDateRange(start, end) {
  return `${formatDate(start)} - ${formatDate(end)}`;
}
