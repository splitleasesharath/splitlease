/**
 * URL Parameter Management Utilities
 * Handles serialization/deserialization of filter state to/from URL parameters
 * Enables shareable search URLs and browser navigation support
 *
 * Usage:
 *   import { parseUrlToFilters, updateUrlParams, serializeFiltersToUrl } from './urlParams.js';
 *
 *   // On component mount
 *   const filtersFromUrl = parseUrlToFilters();
 *
 *   // When filters change
 *   updateUrlParams(filters);
 */

import { DEFAULTS } from './constants.js';
import { sanitizeUrlParam } from './sanitize.js';

/**
 * Parse URL query parameters into filter state object
 * @returns {object} Filter state object
 */
export function parseUrlToFilters() {
  if (typeof window === 'undefined') {
    return getDefaultFilters();
  }

  const params = new URLSearchParams(window.location.search);

  return {
    selectedBoroughs: parseBoroughsParam(params.get('boroughs')),
    weekPattern: sanitizeUrlParam(params.get('weekly-frequency'), 'string') || DEFAULTS.DEFAULT_WEEK_PATTERN,
    priceTier: sanitizeUrlParam(params.get('pricetier'), 'string') || DEFAULTS.DEFAULT_PRICE_TIER,
    sortBy: sanitizeUrlParam(params.get('sort'), 'string') || DEFAULTS.DEFAULT_SORT_BY,
    selectedNeighborhoods: parseNeighborhoodsParam(params.get('neighborhoods'))
  };
}

/**
 * Parse boroughs parameter from URL
 * Format: "manhattan,brooklyn,queens" (comma-separated borough values)
 * @param {string|null} boroughsParam - The boroughs parameter from URL
 * @returns {Array<string>} Array of borough values
 */
function parseBoroughsParam(boroughsParam) {
  if (!boroughsParam) {
    return [];
  }

  try {
    const boroughs = boroughsParam
      .split(',')
      .map(b => b.trim())
      .filter(b => b.length > 0);

    return boroughs;
  } catch (error) {
    console.error('Failed to parse boroughs parameter:', error);
    return [];
  }
}

/**
 * Parse neighborhoods parameter from URL
 * Format: "id1,id2,id3" (comma-separated neighborhood IDs)
 * @param {string|null} neighborhoodsParam - The neighborhoods parameter from URL
 * @returns {Array<string>} Array of neighborhood IDs
 */
function parseNeighborhoodsParam(neighborhoodsParam) {
  if (!neighborhoodsParam) {
    return [];
  }

  try {
    const neighborhoods = neighborhoodsParam
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    return neighborhoods;
  } catch (error) {
    console.error('Failed to parse neighborhoods parameter:', error);
    return [];
  }
}

/**
 * Serialize filter state to URL query string
 * @param {object} filters - Filter state object
 * @returns {string} URL query string (without leading ?)
 */
export function serializeFiltersToUrl(filters) {
  const params = new URLSearchParams();

  // Add boroughs parameter (only if not empty - empty means "all boroughs")
  if (filters.selectedBoroughs && filters.selectedBoroughs.length > 0) {
    params.set('boroughs', filters.selectedBoroughs.join(','));
  }

  // Add week pattern parameter (only if not default)
  if (filters.weekPattern && filters.weekPattern !== DEFAULTS.DEFAULT_WEEK_PATTERN) {
    params.set('weekly-frequency', filters.weekPattern);
  }

  // Add price tier parameter (only if not default)
  if (filters.priceTier && filters.priceTier !== DEFAULTS.DEFAULT_PRICE_TIER) {
    params.set('pricetier', filters.priceTier);
  }

  // Add sort parameter (only if not default)
  if (filters.sortBy && filters.sortBy !== DEFAULTS.DEFAULT_SORT_BY) {
    params.set('sort', filters.sortBy);
  }

  // Add neighborhoods parameter (only if not empty)
  if (filters.selectedNeighborhoods && filters.selectedNeighborhoods.length > 0) {
    params.set('neighborhoods', filters.selectedNeighborhoods.join(','));
  }

  return params.toString();
}

/**
 * Update browser URL without page reload
 * Uses History API to maintain browser navigation
 * IMPORTANT: Preserves 'days-selected' parameter which is managed by SearchScheduleSelector
 * @param {object} filters - Filter state object
 * @param {boolean} replace - If true, replaces current history entry instead of pushing new one
 */
export function updateUrlParams(filters, replace = false) {
  if (typeof window === 'undefined') return;

  const queryString = serializeFiltersToUrl(filters);

  // Preserve days-selected parameter if it exists (managed by SearchScheduleSelector)
  const currentParams = new URLSearchParams(window.location.search);
  const daysSelected = currentParams.get('days-selected');

  let newUrl;
  if (queryString) {
    const newParams = new URLSearchParams(queryString);
    if (daysSelected) {
      newParams.set('days-selected', daysSelected);
    }
    newUrl = `${window.location.pathname}?${newParams.toString()}`;
  } else if (daysSelected) {
    // No other filters, but preserve days-selected
    newUrl = `${window.location.pathname}?days-selected=${daysSelected}`;
  } else {
    newUrl = window.location.pathname;
  }

  if (replace) {
    window.history.replaceState(null, '', newUrl);
  } else {
    window.history.pushState(null, '', newUrl);
  }
}

/**
 * Watch for URL changes (back/forward navigation)
 * Calls callback with new filter state when URL changes
 * @param {function} callback - Function to call with new filters: (filters) => void
 * @returns {function} Cleanup function to remove event listener
 */
export function watchUrlChanges(callback) {
  if (typeof window === 'undefined') return () => {};

  const handlePopState = () => {
    const filters = parseUrlToFilters();
    callback(filters);
  };

  window.addEventListener('popstate', handlePopState);

  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
}

/**
 * Get default filter values
 * @returns {object} Default filter state
 */
function getDefaultFilters() {
  return {
    selectedBoroughs: [],
    weekPattern: DEFAULTS.DEFAULT_WEEK_PATTERN,
    priceTier: DEFAULTS.DEFAULT_PRICE_TIER,
    sortBy: DEFAULTS.DEFAULT_SORT_BY,
    selectedNeighborhoods: []
  };
}

/**
 * Check if current URL has any filter parameters
 * @returns {boolean} True if URL has filter parameters
 */
export function hasUrlFilters() {
  if (typeof window === 'undefined') return false;

  const params = new URLSearchParams(window.location.search);
  return params.toString().length > 0;
}

/**
 * Clear all filter parameters from URL
 */
export function clearUrlParams() {
  if (typeof window === 'undefined') return;

  window.history.pushState(null, '', window.location.pathname);
}

/**
 * Get shareable URL for current filters
 * @param {object} filters - Filter state object
 * @returns {string} Full shareable URL
 */
export function getShareableUrl(filters) {
  if (typeof window === 'undefined') return '';

  const queryString = serializeFiltersToUrl(filters);
  const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;

  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}
