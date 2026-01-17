/**
 * Canonical price formatting utility
 * @param {number} amount - Amount to format
 * @param {Object} options - Formatting options
 * @param {boolean} options.showCents - Include decimal places (default: false)
 * @param {string} options.suffix - Suffix like '/night' (default: '')
 * @param {*} options.fallback - Value for null/undefined (default: null)
 */
export function formatPrice(amount, options = {}) {
  const { showCents = false, suffix = '', fallback = null } = options;

  if (amount === null || amount === undefined || isNaN(amount)) {
    return fallback;
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0
  }).format(amount);

  return suffix ? `${formatted}${suffix}` : formatted;
}

// Convenience exports for common use cases
export const formatPricePerNight = (amount) => formatPrice(amount, { suffix: '/night' });
export const formatPriceWithCents = (amount) => formatPrice(amount, { showCents: true });
export const formatPriceOrZero = (amount) => formatPrice(amount, { fallback: '$0' });
