/**
 * Utility functions for formatting listing data
 * Implements the 4 conditional logic rules from Bubble
 */
import { formatDateDisplay } from '../../../lib/dateFormatters.js';

/**
 * Bathroom display mapping based on Bubble option set
 */
const bathroomDisplayMap = {
  1: '1 Bath',
  1.5: '1.5 Baths',
  2: '2 Baths',
  2.5: '2.5 Baths',
  3: '3 Baths',
  3.5: '3.5 Baths',
  4: '4 Baths',
  4.5: '4.5 Baths',
  5: '5 Baths',
  6: '6 Baths',
};

/**
 * Get bathroom display text from numeric value
 * @param {number} count - Number of bathrooms (can be decimal for half baths)
 * @returns {string} Formatted bathroom display text
 */
export const getBathroomDisplay = (count) => {
  return bathroomDisplayMap[count] || `${count} Baths`;
};

/**
 * Format bedroom and bathroom text according to Bubble's 4 conditional rules
 *
 * CONDITIONAL 1: When bedrooms = 1
 *   Display: "• 1 bedroom • [bathrooms] • [kitchen]"
 *
 * CONDITIONAL 2: When bathrooms = 0
 *   Display: "[bedrooms] bedrooms" (bedroom info only)
 *
 * CONDITIONAL 3: When bedrooms > 1
 *   Display: "• [bedrooms] bedrooms • [bathrooms] • [kitchen]"
 *
 * CONDITIONAL 4: When kitchen type is empty
 *   Display: "• [bedrooms] bedroom(s) • [bathrooms]" (no kitchen)
 *
 * @param {number} bedrooms - Number of bedrooms
 * @param {number} bathrooms - Number of bathrooms
 * @param {string} [kitchenType] - Optional kitchen type
 * @returns {string} Formatted display string
 */
export const formatBedroomBathroom = (bedrooms, bathrooms, kitchenType) => {
  const parts = [];

  if (bathrooms === 0) {
    if (bedrooms === 1) {
      return '1 bedroom';
    } else if (bedrooms > 1) {
      return `${bedrooms} bedrooms`;
    }
    return '';
  }

  if (bedrooms === 1) {
    parts.push('1 bedroom');
  } else if (bedrooms > 1) {
    parts.push(`${bedrooms} bedrooms`);
  }

  if (bathrooms > 0) {
    const bathroomDisplay = getBathroomDisplay(bathrooms);
    parts.push(bathroomDisplay);
  }

  if (kitchenType && kitchenType !== '') {
    parts.push(kitchenType);
  }

  return parts.length > 0 ? '• ' + parts.join(' • ') : '';
};

/**
 * Format price with currency symbol
 * @param {number} price - Price amount
 * @param {string} [currency='USD'] - Currency code
 * @returns {string} Formatted price string (e.g., "$1,029/night")
 */
export const formatPrice = (price, currency = 'USD') => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return `${formatter.format(price)}/night`;
};

/**
 * Format location display
 * @param {string} [borough] - Borough name
 * @param {string} [hood] - Neighborhood name
 * @param {string} [city] - City name
 * @returns {string} Formatted location string (e.g., "Brooklyn, Williamsburg, New York")
 */
export const formatLocation = (borough, hood, city) => {
  const parts = [];

  if (borough) parts.push(borough);
  if (hood) parts.push(hood);
  if (city) parts.push(city);

  return parts.join(', ');
};

/**
 * Format date for display
 * Delegates to centralized dateFormatters for consistency
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date (e.g., "Jan 15, 2024")
 */
export const formatDate = (dateString) => {
  return formatDateDisplay(dateString, { format: 'medium', fallback: '' });
};

/**
 * Get responsive image URL with imgix processing
 * @param {string} imageUrl - Original image URL
 * @param {number} [width] - Desired width
 * @param {number} [height] - Desired height
 * @returns {string} Processed image URL
 */
export const getProcessedImageUrl = (imageUrl, width, height) => {
  if (!imageUrl) return '';

  if (imageUrl.includes('imgix')) {
    const params = new URLSearchParams();
    if (width) params.append('w', width.toString());
    if (height) params.append('h', height.toString());
    params.append('fit', 'crop');
    params.append('auto', 'format,compress');

    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}${params.toString()}`;
  }

  return imageUrl;
};
