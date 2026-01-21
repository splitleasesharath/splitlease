/**
 * Formatting utilities for Host Proposals Page
 */
import { formatDateDisplay, formatDateRange as formatDateRangeCentral } from '../../../lib/dateFormatters.js';

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
 * Delegates to centralized dateFormatters
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  return formatDateDisplay(date, { format: 'short', fallback: '' });
}

/**
 * Format a date as full date (e.g., "Mar 28, 2025")
 * Delegates to centralized dateFormatters
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatFullDate(date) {
  return formatDateDisplay(date, { format: 'medium', fallback: '' });
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
  return formatDateRangeCentral(start, end, { format: 'short' });
}
