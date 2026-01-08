/**
 * Data Lookup Utilities
 *
 * Provides cached lookups for neighborhoods, boroughs, and property types
 * to transform raw database IDs into human-readable names.
 *
 * Usage:
 *   import { initializeLookups, getNeighborhoodName, getBoroughName } from './dataLookups.js';
 *
 *   // On app startup:
 *   await initializeLookups();
 *
 *   // In transform functions:
 *   const neighborhoodName = getNeighborhoodName(neighborhoodId); // Fast, synchronous
 *
 * @module lib/dataLookups
 */

import { supabase } from './supabase.js';
import { DATABASE } from './constants.js';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[dataLookups]'

const CACHE_KEYS = Object.freeze({
  NEIGHBORHOODS: 'neighborhoods',
  BOROUGHS: 'boroughs',
  PROPERTY_TYPES: 'propertyTypes',
  AMENITIES: 'amenities',
  SAFETY: 'safety',
  HOUSE_RULES: 'houseRules',
  PARKING: 'parking',
  CANCELLATION_POLICIES: 'cancellationPolicies',
  STORAGE: 'storage',
  GUEST_CANCELLATION_REASONS: 'guestCancellationReasons',
  HOST_CANCELLATION_REASONS: 'hostCancellationReasons'
})

const DEFAULT_VALUES = Object.freeze({
  NEIGHBORHOOD: 'Unknown Neighborhood',
  BOROUGH: 'Unknown Borough',
  AMENITY: 'Unknown Amenity',
  SAFETY: 'Unknown Safety Feature',
  HOUSE_RULE: 'Unknown Rule',
  PARKING: 'Unknown Parking',
  POLICY: 'Unknown Policy',
  STORAGE: 'Unknown Storage',
  PROPERTY_TYPE: 'Entire Place'
})

const SCHEMAS = Object.freeze({
  REFERENCE: 'reference_table',
  PUBLIC: 'public'
})

// ─────────────────────────────────────────────────────────────
// Property Type Mappings (Static)
// ─────────────────────────────────────────────────────────────

const PROPERTY_TYPE_MAP = Object.freeze({
  'Entire Place': 'Entire Place',
  'Private Room': 'Private Room',
  'Shared Room': 'Shared Room',
  'Studio': 'Studio',
  '1 Bedroom': '1 Bedroom',
  '2 Bedroom': '2 Bedroom',
  '3+ Bedroom': '3+ Bedroom'
})

// ─────────────────────────────────────────────────────────────
// Cache Storage (Module-level State)
// ─────────────────────────────────────────────────────────────

const lookupCache = {
  neighborhoods: new Map(),
  boroughs: new Map(),
  propertyTypes: new Map(),
  amenities: new Map(),
  safety: new Map(),
  houseRules: new Map(),
  parking: new Map(),
  cancellationPolicies: new Map(),
  storage: new Map(),
  guestCancellationReasons: new Map(),
  hostCancellationReasons: new Map(),
  initialized: false
};

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is non-empty string
 * @pure
 */
const isNonEmptyString = (value) =>
  typeof value === 'string' && value.length > 0

/**
 * Check if value is an array
 * @pure
 */
const isArray = (value) => Array.isArray(value)

/**
 * Check if value is a non-empty array
 * @pure
 */
const hasElements = (arr) => isArray(arr) && arr.length > 0

/**
 * Check if value looks like a Bubble ID (contains 'x')
 * @pure
 */
const isBubbleId = (value) =>
  typeof value === 'string' && value.includes('x')

// ─────────────────────────────────────────────────────────────
// Pure Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Trim string safely
 * @pure
 */
const trimString = (value) => (value || '').trim()

/**
 * Build cache entry for amenity/safety/house rule
 * @pure
 */
const buildFeatureEntry = (name, icon, defaultName) =>
  Object.freeze({
    name: name || defaultName,
    icon: icon || ''
  })

/**
 * Build cache entry for parking option
 * @pure
 */
const buildParkingEntry = (label) =>
  Object.freeze({ label: label || DEFAULT_VALUES.PARKING })

/**
 * Build cache entry for cancellation policy
 * @pure
 */
const buildPolicyEntry = (policy) =>
  Object.freeze({
    display: policy.Display || DEFAULT_VALUES.POLICY,
    bestCaseText: policy['Best Case Text'] || null,
    mediumCaseText: policy['Medium Case Text'] || null,
    worstCaseText: policy['Worst Case Text'] || null,
    summaryTexts: policy['Summary Texts'] || null
  })

/**
 * Build cache entry for storage option
 * @pure
 */
const buildStorageEntry = (storage) =>
  Object.freeze({
    title: storage.Title || DEFAULT_VALUES.STORAGE,
    summaryGuest: storage['Summary - Guest'] || ''
  })

/**
 * Build cache entry for cancellation reason
 * @pure
 */
const buildReasonEntry = (item) =>
  Object.freeze({
    id: item.id,
    reason: item.reason,
    displayOrder: item.display_order
  })

/**
 * Sort by display order
 * @pure
 */
const sortByDisplayOrder = (arr) =>
  [...arr].sort((a, b) => a.displayOrder - b.displayOrder)

/**
 * Convert Map to array of entries
 * @pure
 */
const mapToArray = (map, transform) => {
  const result = []
  map.forEach((value, id) => {
    result.push(transform(value, id))
  })
  return result
}

// ─────────────────────────────────────────────────────────────
// Logging Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Log cache populated message
 * @effectful
 */
const logCached = (name, count) => {
  console.log(`${LOG_PREFIX} Cached ${count} ${name}`)
}

/**
 * Log cache miss warning
 * @effectful
 */
const logCacheMiss = (type, id) => {
  console.warn(`${LOG_PREFIX} ${type} ID not found in cache: ${id}`)
}

/**
 * Log initialization error
 * @effectful
 */
const logInitError = (type, error) => {
  console.error(`${LOG_PREFIX} Failed to initialize ${type} lookups:`, error)
}

// ─────────────────────────────────────────────────────────────
// Cache Population Functions (Effectful)
// ─────────────────────────────────────────────────────────────

/**
 * Populate cache from data array
 * @effectful
 */
const populateCache = (cache, data, keyField, valueExtractor) => {
  if (!hasElements(data)) return 0

  data.forEach(item => {
    const key = item[keyField]
    const value = valueExtractor(item)
    if (key && value) {
      cache.set(key, value)
    }
  })

  return cache.size
}

/**
 * Fetch and cache all boroughs
 * @effectful
 */
async function initializeBoroughLookups() {
  try {
    const { data, error } = await supabase
      .schema(SCHEMAS.REFERENCE)
      .from(DATABASE.TABLES.BOROUGH)
      .select('_id, "Display Borough"');

    if (error) throw error;

    const count = populateCache(
      lookupCache.boroughs,
      data,
      '_id',
      (borough) => trimString(borough['Display Borough']) || DEFAULT_VALUES.BOROUGH
    )
    logCached('boroughs', count)
  } catch (error) {
    logInitError('borough', error)
  }
}

/**
 * Fetch and cache all neighborhoods
 * @effectful
 */
async function initializeNeighborhoodLookups() {
  try {
    const { data, error } = await supabase
      .schema(SCHEMAS.REFERENCE)
      .from(DATABASE.TABLES.NEIGHBORHOOD)
      .select('_id, Display');

    if (error) throw error;

    const count = populateCache(
      lookupCache.neighborhoods,
      data,
      '_id',
      (neighborhood) => trimString(neighborhood.Display) || DEFAULT_VALUES.NEIGHBORHOOD
    )
    logCached('neighborhoods', count)
  } catch (error) {
    logInitError('neighborhood', error)
  }
}

/**
 * Initialize property type lookups
 * Note: Column name is "Label " with a TRAILING SPACE (database quirk)
 * @effectful
 */
async function initializePropertyTypeLookups() {
  try {
    const { data, error } = await supabase
      .schema(SCHEMAS.REFERENCE)
      .from(DATABASE.TABLES.LISTING_TYPE)
      .select('_id, "Label "')
      .limit(100);

    if (!error && hasElements(data)) {
      const count = populateCache(
        lookupCache.propertyTypes,
        data,
        '_id',
        (type) => trimString(type['Label '])
      )
      logCached('property types from database', count)
    } else {
      // Fall back to static mapping
      Object.entries(PROPERTY_TYPE_MAP).forEach(([key, value]) => {
        lookupCache.propertyTypes.set(key, value)
      })
      console.log(`${LOG_PREFIX} Using static property type mappings`)
    }
  } catch (error) {
    logInitError('property type', error)
    // Use static mappings as last resort
    Object.entries(PROPERTY_TYPE_MAP).forEach(([key, value]) => {
      lookupCache.propertyTypes.set(key, value)
    })
  }
}

/**
 * Fetch and cache all amenities
 * @effectful
 */
async function initializeAmenityLookups() {
  try {
    const { data, error } = await supabase
      .from(DATABASE.TABLES.AMENITY)
      .select('_id, Name, Icon');

    if (error) throw error;

    if (hasElements(data)) {
      data.forEach(amenity => {
        lookupCache.amenities.set(
          amenity._id,
          buildFeatureEntry(amenity.Name, amenity.Icon, DEFAULT_VALUES.AMENITY)
        )
      })
      logCached('amenities', lookupCache.amenities.size)
    }
  } catch (error) {
    logInitError('amenity', error)
  }
}

/**
 * Fetch and cache all safety features
 * @effectful
 */
async function initializeSafetyLookups() {
  try {
    const { data, error } = await supabase
      .from(DATABASE.TABLES.SAFETY)
      .select('_id, Name, Icon');

    if (error) throw error;

    if (hasElements(data)) {
      data.forEach(safety => {
        lookupCache.safety.set(
          safety._id,
          buildFeatureEntry(safety.Name, safety.Icon, DEFAULT_VALUES.SAFETY)
        )
      })
      logCached('safety features', lookupCache.safety.size)
    }
  } catch (error) {
    logInitError('safety', error)
  }
}

/**
 * Fetch and cache all house rules
 * @effectful
 */
async function initializeHouseRuleLookups() {
  try {
    const { data, error } = await supabase
      .schema(SCHEMAS.REFERENCE)
      .from(DATABASE.TABLES.HOUSE_RULE)
      .select('_id, Name, Icon');

    if (error) throw error;

    if (hasElements(data)) {
      data.forEach(rule => {
        lookupCache.houseRules.set(
          rule._id,
          buildFeatureEntry(rule.Name, rule.Icon, DEFAULT_VALUES.HOUSE_RULE)
        )
      })
      logCached('house rules', lookupCache.houseRules.size)
    }
  } catch (error) {
    logInitError('house rule', error)
  }
}

/**
 * Fetch and cache all parking options
 * @effectful
 */
async function initializeParkingLookups() {
  try {
    const { data, error } = await supabase
      .schema(SCHEMAS.REFERENCE)
      .from(DATABASE.TABLES.PARKING)
      .select('_id, Label');

    if (error) throw error;

    if (hasElements(data)) {
      data.forEach(parking => {
        lookupCache.parking.set(parking._id, buildParkingEntry(parking.Label))
      })
      logCached('parking options', lookupCache.parking.size)
    }
  } catch (error) {
    logInitError('parking', error)
  }
}

/**
 * Fetch and cache all cancellation policies
 * @effectful
 */
async function initializeCancellationPolicyLookups() {
  try {
    const { data, error } = await supabase
      .schema(SCHEMAS.REFERENCE)
      .from(DATABASE.TABLES.CANCELLATION_POLICY)
      .select('_id, Display, "Best Case Text", "Medium Case Text", "Worst Case Text", "Summary Texts"');

    if (error) throw error;

    if (hasElements(data)) {
      data.forEach(policy => {
        lookupCache.cancellationPolicies.set(policy._id, buildPolicyEntry(policy))
      })
      logCached('cancellation policies', lookupCache.cancellationPolicies.size)
    }
  } catch (error) {
    logInitError('cancellation policy', error)
  }
}

/**
 * Fetch and cache all storage options
 * @effectful
 */
async function initializeStorageLookups() {
  try {
    const { data, error } = await supabase
      .schema(SCHEMAS.REFERENCE)
      .from(DATABASE.TABLES.STORAGE)
      .select('_id, Title, "Summary - Guest"');

    if (error) throw error;

    if (hasElements(data)) {
      data.forEach(storage => {
        lookupCache.storage.set(storage._id, buildStorageEntry(storage))
      })
      logCached('storage options', lookupCache.storage.size)
    }
  } catch (error) {
    logInitError('storage', error)
  }
}

/**
 * Fetch and cache all cancellation/rejection reasons for both guests and hosts
 * @effectful
 */
async function initializeCancellationReasonLookups() {
  try {
    const { data, error } = await supabase
      .schema(SCHEMAS.REFERENCE)
      .from(DATABASE.TABLES.CANCELLATION_REASON)
      .select('id, user_type, reason, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    if (hasElements(data)) {
      data.forEach(item => {
        const entry = buildReasonEntry(item)

        if (item.user_type === 'guest') {
          lookupCache.guestCancellationReasons.set(item.id, entry)
        } else if (item.user_type === 'host') {
          lookupCache.hostCancellationReasons.set(item.id, entry)
        }
      })
      logCached('guest cancellation reasons', lookupCache.guestCancellationReasons.size)
      logCached('host rejection reasons', lookupCache.hostCancellationReasons.size)
    }
  } catch (error) {
    logInitError('cancellation reason', error)
  }
}

// ─────────────────────────────────────────────────────────────
// Public Initialization
// ─────────────────────────────────────────────────────────────

/**
 * Initialize all lookup caches by fetching data from Supabase
 * Call this once when the app starts
 * @effectful
 * @returns {Promise<void>}
 */
export async function initializeLookups() {
  if (lookupCache.initialized) {
    return;
  }

  try {
    await Promise.all([
      initializeBoroughLookups(),
      initializeNeighborhoodLookups(),
      initializePropertyTypeLookups(),
      initializeAmenityLookups(),
      initializeSafetyLookups(),
      initializeHouseRuleLookups(),
      initializeParkingLookups(),
      initializeCancellationPolicyLookups(),
      initializeStorageLookups(),
      initializeCancellationReasonLookups()
    ]);

    lookupCache.initialized = true;
    console.log(`${LOG_PREFIX} Data lookups initialized successfully`);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to initialize data lookups:`, error);
  }
}

// ─────────────────────────────────────────────────────────────
// Synchronous Lookup Functions (Pure - use cached data)
// ─────────────────────────────────────────────────────────────

/**
 * Get neighborhood name by ID (synchronous lookup from cache)
 * @pure (reads from cache)
 * @param {string} neighborhoodId - The neighborhood ID
 * @returns {string} The neighborhood name or the ID if not found
 */
export function getNeighborhoodName(neighborhoodId) {
  if (!isNonEmptyString(neighborhoodId)) return '';

  const name = lookupCache.neighborhoods.get(neighborhoodId);
  if (name) return name;

  logCacheMiss('Neighborhood', neighborhoodId)
  return neighborhoodId;
}

/**
 * Get borough name by ID (synchronous lookup from cache)
 * @pure (reads from cache)
 * @param {string} boroughId - The borough ID
 * @returns {string} The borough name or the ID if not found
 */
export function getBoroughName(boroughId) {
  if (!isNonEmptyString(boroughId)) return '';

  const name = lookupCache.boroughs.get(boroughId);
  if (name) return name;

  logCacheMiss('Borough', boroughId)
  return boroughId;
}

/**
 * Get property type label by ID or type string
 * @pure (reads from cache)
 * @param {string} propertyTypeId - The property type ID or string
 * @returns {string} The property type label or the original value
 */
export function getPropertyTypeLabel(propertyTypeId) {
  if (!isNonEmptyString(propertyTypeId)) return DEFAULT_VALUES.PROPERTY_TYPE;

  // Check cache first
  const cachedLabel = lookupCache.propertyTypes.get(propertyTypeId);
  if (cachedLabel) return cachedLabel;

  // Check static mapping
  const staticLabel = PROPERTY_TYPE_MAP[propertyTypeId];
  if (staticLabel) return staticLabel;

  // If it's already a readable string (not a Bubble ID), return it
  if (!isBubbleId(propertyTypeId)) {
    return propertyTypeId;
  }

  logCacheMiss('Property type', propertyTypeId)
  return propertyTypeId;
}

/**
 * Get amenity data by ID (synchronous lookup from cache)
 * @pure (reads from cache)
 * @param {string} amenityId - The amenity ID
 * @returns {object|null} The amenity data {name, icon} or null
 */
export function getAmenity(amenityId) {
  if (!isNonEmptyString(amenityId)) return null;

  const amenity = lookupCache.amenities.get(amenityId);
  if (!amenity) {
    logCacheMiss('Amenity', amenityId)
    return null;
  }

  return amenity;
}

/**
 * Get multiple amenities by ID array
 * @pure
 * @param {string[]} amenityIds - Array of amenity IDs
 * @returns {object[]} Array of amenity data {name, icon}
 */
export function getAmenities(amenityIds) {
  if (!isArray(amenityIds)) return [];
  return amenityIds.map(id => getAmenity(id)).filter(Boolean);
}

/**
 * Get safety feature data by ID (synchronous lookup from cache)
 * @pure (reads from cache)
 * @param {string} safetyId - The safety feature ID
 * @returns {object|null} The safety feature data {name, icon} or null
 */
export function getSafetyFeature(safetyId) {
  if (!isNonEmptyString(safetyId)) return null;

  const safety = lookupCache.safety.get(safetyId);
  if (!safety) {
    logCacheMiss('Safety feature', safetyId)
    return null;
  }

  return safety;
}

/**
 * Get multiple safety features by ID array
 * @pure
 * @param {string[]} safetyIds - Array of safety feature IDs
 * @returns {object[]} Array of safety feature data {name, icon}
 */
export function getSafetyFeatures(safetyIds) {
  if (!isArray(safetyIds)) return [];
  return safetyIds.map(id => getSafetyFeature(id)).filter(Boolean);
}

/**
 * Get house rule data by ID (synchronous lookup from cache)
 * @pure (reads from cache)
 * @param {string} ruleId - The house rule ID
 * @returns {object|null} The house rule data {name, icon} or null
 */
export function getHouseRule(ruleId) {
  if (!isNonEmptyString(ruleId)) return null;

  const rule = lookupCache.houseRules.get(ruleId);
  if (!rule) {
    logCacheMiss('House rule', ruleId)
    return null;
  }

  return rule;
}

/**
 * Get multiple house rules by ID array
 * @pure
 * @param {string[]} ruleIds - Array of house rule IDs
 * @returns {object[]} Array of house rule data {name, icon}
 */
export function getHouseRules(ruleIds) {
  if (!isArray(ruleIds)) return [];
  return ruleIds.map(id => getHouseRule(id)).filter(Boolean);
}

/**
 * Get parking option data by ID (synchronous lookup from cache)
 * @pure (reads from cache)
 * @param {string} parkingId - The parking option ID
 * @returns {object|null} The parking option data {label} or null
 */
export function getParkingOption(parkingId) {
  if (!isNonEmptyString(parkingId)) return null;

  const parking = lookupCache.parking.get(parkingId);
  if (!parking) {
    logCacheMiss('Parking option', parkingId)
    return null;
  }

  return parking;
}

/**
 * Get cancellation policy data by ID (synchronous lookup from cache)
 * @pure (reads from cache)
 * @param {string} policyId - The cancellation policy ID
 * @returns {object|null} The cancellation policy data or null
 */
export function getCancellationPolicy(policyId) {
  if (!isNonEmptyString(policyId)) return null;

  const policy = lookupCache.cancellationPolicies.get(policyId);
  if (!policy) {
    logCacheMiss('Cancellation policy', policyId)
    return null;
  }

  return policy;
}

/**
 * Get all cancellation policies from cache (for dropdown options)
 * @pure
 * @returns {Array<{id: string, display: string}>} Array of policy options
 */
export function getAllCancellationPolicies() {
  return mapToArray(lookupCache.cancellationPolicies, (policy, id) => ({
    id,
    display: policy.display
  }))
}

/**
 * Get storage option data by ID (synchronous lookup from cache)
 * @pure (reads from cache)
 * @param {string} storageId - The storage option ID
 * @returns {object|null} The storage option data {title, summaryGuest} or null
 */
export function getStorageOption(storageId) {
  if (!isNonEmptyString(storageId)) return null;

  const storage = lookupCache.storage.get(storageId);
  if (!storage) {
    logCacheMiss('Storage option', storageId)
    return null;
  }

  return storage;
}

/**
 * Get all active guest cancellation reasons as array (for dropdown population)
 * Returns reasons sorted by display_order
 * @pure
 * @returns {Array<{id: number, reason: string, displayOrder: number}>} Array of reason options
 */
export function getGuestCancellationReasons() {
  const reasons = mapToArray(
    lookupCache.guestCancellationReasons,
    (data) => ({ id: data.id, reason: data.reason, displayOrder: data.displayOrder })
  )
  return sortByDisplayOrder(reasons)
}

/**
 * Get all active host rejection reasons as array (for dropdown population)
 * Returns reasons sorted by display_order
 * @pure
 * @returns {Array<{id: number, reason: string, displayOrder: number}>} Array of reason options
 */
export function getHostRejectionReasons() {
  const reasons = mapToArray(
    lookupCache.hostCancellationReasons,
    (data) => ({ id: data.id, reason: data.reason, displayOrder: data.displayOrder })
  )
  return sortByDisplayOrder(reasons)
}

// ─────────────────────────────────────────────────────────────
// Async Lookup Functions (Effectful - for individual queries)
// ─────────────────────────────────────────────────────────────

/**
 * Fetch neighborhood name by ID from database (async)
 * Use this only if the cache doesn't have the value
 * @effectful
 * @param {string} neighborhoodId - The neighborhood ID
 * @returns {Promise<string>} The neighborhood name
 */
export async function fetchNeighborhoodName(neighborhoodId) {
  if (!isNonEmptyString(neighborhoodId)) return '';

  // Check cache first
  const cached = lookupCache.neighborhoods.get(neighborhoodId);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .schema(SCHEMAS.REFERENCE)
      .from(DATABASE.TABLES.NEIGHBORHOOD)
      .select('Display')
      .eq('_id', neighborhoodId)
      .single();

    if (error) throw error;

    const name = data?.Display || DEFAULT_VALUES.NEIGHBORHOOD;
    lookupCache.neighborhoods.set(neighborhoodId, name);
    return name;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to fetch neighborhood ${neighborhoodId}:`, error);
    return DEFAULT_VALUES.NEIGHBORHOOD;
  }
}

/**
 * Fetch borough name by ID from database (async)
 * Use this only if the cache doesn't have the value
 * @effectful
 * @param {string} boroughId - The borough ID
 * @returns {Promise<string>} The borough name
 */
export async function fetchBoroughName(boroughId) {
  if (!isNonEmptyString(boroughId)) return '';

  // Check cache first
  const cached = lookupCache.boroughs.get(boroughId);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .schema(SCHEMAS.REFERENCE)
      .from(DATABASE.TABLES.BOROUGH)
      .select('"Display Borough"')
      .eq('_id', boroughId)
      .single();

    if (error) throw error;

    const name = data?.['Display Borough'] || DEFAULT_VALUES.BOROUGH;
    lookupCache.boroughs.set(boroughId, name);
    return name;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to fetch borough ${boroughId}:`, error);
    return DEFAULT_VALUES.BOROUGH;
  }
}

// ─────────────────────────────────────────────────────────────
// Cache Management
// ─────────────────────────────────────────────────────────────

/**
 * Clear all caches
 * @effectful
 */
const clearAllCaches = () => {
  lookupCache.neighborhoods.clear()
  lookupCache.boroughs.clear()
  lookupCache.propertyTypes.clear()
  lookupCache.amenities.clear()
  lookupCache.safety.clear()
  lookupCache.houseRules.clear()
  lookupCache.parking.clear()
  lookupCache.cancellationPolicies.clear()
  lookupCache.storage.clear()
  lookupCache.guestCancellationReasons.clear()
  lookupCache.hostCancellationReasons.clear()
  lookupCache.initialized = false
}

/**
 * Clear all caches and re-initialize
 * @effectful
 * @returns {Promise<void>}
 */
export async function refreshLookups() {
  clearAllCaches()
  await initializeLookups()
}

/**
 * Get cache statistics for debugging
 * @pure
 * @returns {object} Cache statistics
 */
export function getCacheStats() {
  return Object.freeze({
    neighborhoods: lookupCache.neighborhoods.size,
    boroughs: lookupCache.boroughs.size,
    propertyTypes: lookupCache.propertyTypes.size,
    amenities: lookupCache.amenities.size,
    safety: lookupCache.safety.size,
    houseRules: lookupCache.houseRules.size,
    parking: lookupCache.parking.size,
    cancellationPolicies: lookupCache.cancellationPolicies.size,
    storage: lookupCache.storage.size,
    guestCancellationReasons: lookupCache.guestCancellationReasons.size,
    hostCancellationReasons: lookupCache.hostCancellationReasons.size,
    initialized: lookupCache.initialized
  })
}

/**
 * Check if lookups are initialized
 * @pure
 * @returns {boolean}
 */
export function isInitialized() {
  return lookupCache.initialized
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  LOG_PREFIX,
  CACHE_KEYS,
  DEFAULT_VALUES,
  SCHEMAS,
  PROPERTY_TYPE_MAP
}
