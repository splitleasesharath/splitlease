/**
 * Currency formatting utilities
 */

import { CURRENCY } from './constants';

/**
 * Format a number as currency
 * @param amount - Amount to format
 * @param currencyCode - Currency code (defaults to USD)
 * @param locale - Locale for formatting (defaults to en-US)
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = CURRENCY.CODE,
  locale: string = CURRENCY.LOCALE
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${CURRENCY.SYMBOL}${amount.toFixed(2)}`;
  }
}

/**
 * Format a number as currency without decimals
 * @param amount - Amount to format
 * @param currencyCode - Currency code (defaults to USD)
 * @param locale - Locale for formatting (defaults to en-US)
 * @returns Formatted currency string without decimals
 */
export function formatCurrencyWhole(
  amount: number,
  currencyCode: string = CURRENCY.CODE,
  locale: string = CURRENCY.LOCALE
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${CURRENCY.SYMBOL}${Math.round(amount)}`;
  }
}

/**
 * Format currency for display (shorthand for common amounts)
 * @param amount - Amount to format
 * @returns Formatted currency string (e.g., "$1.5K", "$2.3M")
 */
export function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000) {
    return `${CURRENCY.SYMBOL}${(amount / 1_000_000).toFixed(1)}M`;
  } else if (amount >= 1_000) {
    return `${CURRENCY.SYMBOL}${(amount / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
}

/**
 * Calculate total price from per-night rate and number of nights
 * @param pricePerNight - Price per night
 * @param nights - Number of nights
 * @returns Total price
 */
export function calculateTotalPrice(pricePerNight: number, nights: number): number {
  return pricePerNight * nights;
}

/**
 * Calculate price per night from total price and number of nights
 * @param totalPrice - Total price
 * @param nights - Number of nights
 * @returns Price per night
 */
export function calculatePricePerNight(totalPrice: number, nights: number): number {
  if (nights === 0) {
    return 0;
  }
  return totalPrice / nights;
}

/**
 * Add service fee to a price
 * @param price - Base price
 * @param feePercentage - Fee percentage (e.g., 10 for 10%)
 * @returns Price with fee added
 */
export function addServiceFee(price: number, feePercentage: number): number {
  return price * (1 + feePercentage / 100);
}

/**
 * Calculate service fee amount
 * @param price - Base price
 * @param feePercentage - Fee percentage (e.g., 10 for 10%)
 * @returns Service fee amount
 */
export function calculateServiceFee(price: number, feePercentage: number): number {
  return price * (feePercentage / 100);
}

/**
 * Parse currency string to number
 * @param currencyString - Currency string to parse (e.g., "$123.45")
 * @returns Parsed number or 0 if invalid
 */
export function parseCurrency(currencyString: string): number {
  try {
    const cleaned = currencyString.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  } catch (error) {
    console.error('Error parsing currency:', error);
    return 0;
  }
}

/**
 * Format a price range
 * @param min - Minimum price
 * @param max - Maximum price
 * @returns Formatted price range string
 */
export function formatPriceRange(min: number, max: number): string {
  return `${formatCurrencyWhole(min)} - ${formatCurrencyWhole(max)}`;
}

/**
 * Check if a price is within a range
 * @param price - Price to check
 * @param min - Minimum price (optional)
 * @param max - Maximum price (optional)
 * @returns True if price is within range
 */
export function isPriceInRange(price: number, min?: number, max?: number): boolean {
  if (min !== undefined && price < min) {
    return false;
  }
  if (max !== undefined && price > max) {
    return false;
  }
  return true;
}

/**
 * Round price to nearest cent
 * @param price - Price to round
 * @returns Rounded price
 */
export function roundPrice(price: number): number {
  return Math.round(price * 100) / 100;
}
