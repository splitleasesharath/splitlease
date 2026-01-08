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

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const URL_PARAM_NAMES = Object.freeze({
  BOROUGH: 'borough',
  WEEK_PATTERN: 'weekly-frequency',
  PRICE_TIER: 'pricetier',
  SORT: 'sort',
  NEIGHBORHOODS: 'neighborhoods',
  DAYS_SELECTED: 'days-selected'
})

const LOG_PREFIX = '[urlParams]'

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is a non-empty string
 * @pure
 */
const isNonEmptyString = (value) =>
  typeof value === 'string' && value.length > 0

/**
 * Check if array is non-empty
 * @pure
 */
const hasElements = (arr) =>
  Array.isArray(arr) && arr.length > 0

/**
 * Check if running in browser environment
 * @pure
 */
const isBrowserEnvironment = () =>
  typeof window !== 'undefined'

/**
 * Check if value differs from default
 * @pure
 */
const isNotDefault = (value, defaultValue) =>
  value && value !== defaultValue

// ─────────────────────────────────────────────────────────────
// Pure Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Get default filter values
 * @pure
 * @returns {object} Default filter state (frozen)
 */
function getDefaultFilters() {
  return Object.freeze({
    selectedBorough: DEFAULTS.DEFAULT_BOROUGH,
    weekPattern: DEFAULTS.DEFAULT_WEEK_PATTERN,
    priceTier: DEFAULTS.DEFAULT_PRICE_TIER,
    sortBy: DEFAULTS.DEFAULT_SORT_BY,
    selectedNeighborhoods: []
  })
}

/**
 * Parse neighborhoods parameter from URL
 * Format: "id1,id2,id3" (comma-separated neighborhood IDs)
 * @pure
 * @param {string|null} neighborhoodsParam - The neighborhoods parameter from URL
 * @returns {Array<string>} Array of neighborhood IDs
 */
function parseNeighborhoodsParam(neighborhoodsParam) {
  if (!isNonEmptyString(neighborhoodsParam)) {
    return []
  }

  try {
    return neighborhoodsParam
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0)
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to parse neighborhoods parameter:`, error)
    return []
  }
}

/**
 * Build filter object from URL params
 * @pure
 */
const buildFiltersFromParams = (params) =>
  Object.freeze({
    selectedBorough: sanitizeUrlParam(params.get(URL_PARAM_NAMES.BOROUGH), 'string') || DEFAULTS.DEFAULT_BOROUGH,
    weekPattern: sanitizeUrlParam(params.get(URL_PARAM_NAMES.WEEK_PATTERN), 'string') || DEFAULTS.DEFAULT_WEEK_PATTERN,
    priceTier: sanitizeUrlParam(params.get(URL_PARAM_NAMES.PRICE_TIER), 'string') || DEFAULTS.DEFAULT_PRICE_TIER,
    sortBy: sanitizeUrlParam(params.get(URL_PARAM_NAMES.SORT), 'string') || DEFAULTS.DEFAULT_SORT_BY,
    selectedNeighborhoods: parseNeighborhoodsParam(params.get(URL_PARAM_NAMES.NEIGHBORHOODS))
  })

// ─────────────────────────────────────────────────────────────
// Main Functions
// ─────────────────────────────────────────────────────────────

/**
 * Parse URL query parameters into filter state object
 * @effectful - reads window.location
 * @returns {object} Filter state object
 */
export function parseUrlToFilters() {
  if (!isBrowserEnvironment()) {
    return getDefaultFilters()
  }

  const params = new URLSearchParams(window.location.search)
  return buildFiltersFromParams(params)
}

/**
 * Serialize filter state to URL query string
 * @pure
 * @param {object} filters - Filter state object
 * @returns {string} URL query string (without leading ?)
 */
export function serializeFiltersToUrl(filters) {
  const params = new URLSearchParams()

  // Add parameters only if not default
  if (isNotDefault(filters.selectedBorough, DEFAULTS.DEFAULT_BOROUGH)) {
    params.set(URL_PARAM_NAMES.BOROUGH, filters.selectedBorough)
  }

  if (isNotDefault(filters.weekPattern, DEFAULTS.DEFAULT_WEEK_PATTERN)) {
    params.set(URL_PARAM_NAMES.WEEK_PATTERN, filters.weekPattern)
  }

  if (isNotDefault(filters.priceTier, DEFAULTS.DEFAULT_PRICE_TIER)) {
    params.set(URL_PARAM_NAMES.PRICE_TIER, filters.priceTier)
  }

  if (isNotDefault(filters.sortBy, DEFAULTS.DEFAULT_SORT_BY)) {
    params.set(URL_PARAM_NAMES.SORT, filters.sortBy)
  }

  if (hasElements(filters.selectedNeighborhoods)) {
    params.set(URL_PARAM_NAMES.NEIGHBORHOODS, filters.selectedNeighborhoods.join(','))
  }

  return params.toString()
}

/**
 * Build new URL preserving days-selected param
 * @pure
 */
const buildUrlWithPreservedDays = (pathname, queryString, daysSelected) => {
  if (queryString) {
    const newParams = new URLSearchParams(queryString)
    if (daysSelected) {
      newParams.set(URL_PARAM_NAMES.DAYS_SELECTED, daysSelected)
    }
    return `${pathname}?${newParams.toString()}`
  }

  if (daysSelected) {
    return `${pathname}?${URL_PARAM_NAMES.DAYS_SELECTED}=${daysSelected}`
  }

  return pathname
}

/**
 * Update browser URL without page reload
 * Uses History API to maintain browser navigation
 * IMPORTANT: Preserves 'days-selected' parameter which is managed by SearchScheduleSelector
 * @effectful - modifies browser history
 * @param {object} filters - Filter state object
 * @param {boolean} replace - If true, replaces current history entry instead of pushing new one
 */
export function updateUrlParams(filters, replace = false) {
  if (!isBrowserEnvironment()) return

  const queryString = serializeFiltersToUrl(filters)
  const currentParams = new URLSearchParams(window.location.search)
  const daysSelected = currentParams.get(URL_PARAM_NAMES.DAYS_SELECTED)

  const newUrl = buildUrlWithPreservedDays(window.location.pathname, queryString, daysSelected)

  if (replace) {
    window.history.replaceState(null, '', newUrl)
  } else {
    window.history.pushState(null, '', newUrl)
  }
}

/**
 * Watch for URL changes (back/forward navigation)
 * Calls callback with new filter state when URL changes
 * @effectful - adds event listener
 * @param {function} callback - Function to call with new filters: (filters) => void
 * @returns {function} Cleanup function to remove event listener
 */
export function watchUrlChanges(callback) {
  if (!isBrowserEnvironment()) return () => {}

  const handlePopState = () => {
    const filters = parseUrlToFilters()
    callback(filters)
  }

  window.addEventListener('popstate', handlePopState)

  return () => {
    window.removeEventListener('popstate', handlePopState)
  }
}

/**
 * Check if current URL has any filter parameters
 * @effectful - reads window.location
 * @returns {boolean} True if URL has filter parameters
 */
export function hasUrlFilters() {
  if (!isBrowserEnvironment()) return false

  const params = new URLSearchParams(window.location.search)
  return params.toString().length > 0
}

/**
 * Clear all filter parameters from URL
 * @effectful - modifies browser history
 */
export function clearUrlParams() {
  if (!isBrowserEnvironment()) return

  window.history.pushState(null, '', window.location.pathname)
}

/**
 * Get shareable URL for current filters
 * @effectful - reads window.location
 * @param {object} filters - Filter state object
 * @returns {string} Full shareable URL
 */
export function getShareableUrl(filters) {
  if (!isBrowserEnvironment()) return ''

  const queryString = serializeFiltersToUrl(filters)
  const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`

  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  URL_PARAM_NAMES,
  LOG_PREFIX
}
