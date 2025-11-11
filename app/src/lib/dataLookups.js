/**
 * Data Lookup Utilities
 * Provides cached lookups for neighborhoods, boroughs, and property types
 * to transform raw database IDs into human-readable names
 *
 * Usage:
 *   import { initializeLookups, getNeighborhoodName, getBoroughName } from './dataLookups.js';
 *
 *   // On app startup:
 *   await initializeLookups();
 *
 *   // In transform functions:
 *   const neighborhoodName = getNeighborhoodName(neighborhoodId); // Fast, synchronous
 */

import { supabase } from './supabase.js';
import { DATABASE } from './constants.js';

// ============================================================================
// Cache Storage
// ============================================================================

const lookupCache = {
  neighborhoods: new Map(), // neighborhoodId -> name
  boroughs: new Map(),       // boroughId -> name
  propertyTypes: new Map(),  // propertyTypeId -> label
  amenities: new Map(),      // amenityId -> {name, icon}
  safety: new Map(),         // safetyId -> {name, icon}
  houseRules: new Map(),     // houseRuleId -> {name, icon}
  parking: new Map(),        // parkingId -> {label}
  initialized: false
};

// ============================================================================
// Property Type Mappings (Static)
// ============================================================================

const PROPERTY_TYPE_MAP = {
  'Entire Place': 'Entire Place',
  'Private Room': 'Private Room',
  'Shared Room': 'Shared Room',
  'Studio': 'Studio',
  '1 Bedroom': '1 Bedroom',
  '2 Bedroom': '2 Bedroom',
  '3+ Bedroom': '3+ Bedroom'
};

// ============================================================================
// Initialization Functions
// ============================================================================

/**
 * Initialize all lookup caches by fetching data from Supabase
 * Call this once when the app starts
 * @returns {Promise<void>}
 */
export async function initializeLookups() {
  if (lookupCache.initialized) {
    return; // Already initialized
  }

  try {
    // Fetch all in parallel for performance
    await Promise.all([
      initializeBoroughLookups(),
      initializeNeighborhoodLookups(),
      initializePropertyTypeLookups(),
      initializeAmenityLookups(),
      initializeSafetyLookups(),
      initializeHouseRuleLookups(),
      initializeParkingLookups()
    ]);

    lookupCache.initialized = true;
    console.log('Data lookups initialized successfully');
  } catch (error) {
    console.error('Failed to initialize data lookups:', error);
    // Don't throw - allow app to continue with empty caches
    // This follows "No Fallback Mechanisms" - we show "Unknown" instead
  }
}

/**
 * Fetch and cache all boroughs
 * @returns {Promise<void>}
 */
async function initializeBoroughLookups() {
  try {
    const { data, error } = await supabase
      .from(DATABASE.TABLES.BOROUGH)
      .select('_id, "Display Borough"');

    if (error) throw error;

    if (data && Array.isArray(data)) {
      data.forEach(borough => {
        const name = borough['Display Borough'] || 'Unknown Borough';
        lookupCache.boroughs.set(borough._id, name.trim());
      });
      console.log(`Cached ${lookupCache.boroughs.size} boroughs`);
    }
  } catch (error) {
    console.error('Failed to initialize borough lookups:', error);
  }
}

/**
 * Fetch and cache all neighborhoods
 * @returns {Promise<void>}
 */
async function initializeNeighborhoodLookups() {
  try {
    const { data, error } = await supabase
      .from(DATABASE.TABLES.NEIGHBORHOOD)
      .select('_id, Display');

    if (error) throw error;

    if (data && Array.isArray(data)) {
      data.forEach(neighborhood => {
        const name = neighborhood.Display || 'Unknown Neighborhood';
        lookupCache.neighborhoods.set(neighborhood._id, name.trim());
      });
      console.log(`Cached ${lookupCache.neighborhoods.size} neighborhoods`);
    }
  } catch (error) {
    console.error('Failed to initialize neighborhood lookups:', error);
  }
}

/**
 * Initialize property type lookups
 * Note: Column name is "Label " with a TRAILING SPACE (database quirk)
 * @returns {Promise<void>}
 */
async function initializePropertyTypeLookups() {
  try {
    // IMPORTANT: Column name has trailing space: "Label "
    const { data, error } = await supabase
      .from(DATABASE.TABLES.LISTING_TYPE)
      .select('_id, "Label "')
      .limit(100);

    if (!error && data && Array.isArray(data)) {
      data.forEach(type => {
        // Access column with trailing space
        const label = type['Label '];
        if (label) {
          lookupCache.propertyTypes.set(type._id, label.trim());
        }
      });
      console.log(`Cached ${lookupCache.propertyTypes.size} property types from database`);
    } else {
      // Fall back to static mapping if table doesn't exist or query fails
      Object.entries(PROPERTY_TYPE_MAP).forEach(([key, value]) => {
        lookupCache.propertyTypes.set(key, value);
      });
      console.log('Using static property type mappings');
    }
  } catch (error) {
    console.error('Failed to initialize property type lookups:', error);
    // Use static mappings as last resort
    Object.entries(PROPERTY_TYPE_MAP).forEach(([key, value]) => {
      lookupCache.propertyTypes.set(key, value);
    });
  }
}

/**
 * Fetch and cache all amenities
 * @returns {Promise<void>}
 */
async function initializeAmenityLookups() {
  try {
    const { data, error } = await supabase
      .from(DATABASE.TABLES.AMENITY)
      .select('_id, Name, Icon');

    if (error) throw error;

    if (data && Array.isArray(data)) {
      data.forEach(amenity => {
        lookupCache.amenities.set(amenity._id, {
          name: amenity.Name || 'Unknown Amenity',
          icon: amenity.Icon || ''
        });
      });
      console.log(`Cached ${lookupCache.amenities.size} amenities`);
    }
  } catch (error) {
    console.error('Failed to initialize amenity lookups:', error);
  }
}

/**
 * Fetch and cache all safety features
 * @returns {Promise<void>}
 */
async function initializeSafetyLookups() {
  try {
    const { data, error } = await supabase
      .from(DATABASE.TABLES.SAFETY)
      .select('_id, Name, Icon');

    if (error) throw error;

    if (data && Array.isArray(data)) {
      data.forEach(safety => {
        lookupCache.safety.set(safety._id, {
          name: safety.Name || 'Unknown Safety Feature',
          icon: safety.Icon || ''
        });
      });
      console.log(`Cached ${lookupCache.safety.size} safety features`);
    }
  } catch (error) {
    console.error('Failed to initialize safety lookups:', error);
  }
}

/**
 * Fetch and cache all house rules
 * @returns {Promise<void>}
 */
async function initializeHouseRuleLookups() {
  try {
    const { data, error } = await supabase
      .from(DATABASE.TABLES.HOUSE_RULE)
      .select('_id, Name, Icon');

    if (error) throw error;

    if (data && Array.isArray(data)) {
      data.forEach(rule => {
        lookupCache.houseRules.set(rule._id, {
          name: rule.Name || 'Unknown Rule',
          icon: rule.Icon || ''
        });
      });
      console.log(`Cached ${lookupCache.houseRules.size} house rules`);
    }
  } catch (error) {
    console.error('Failed to initialize house rule lookups:', error);
  }
}

/**
 * Fetch and cache all parking options
 * @returns {Promise<void>}
 */
async function initializeParkingLookups() {
  try {
    const { data, error } = await supabase
      .from(DATABASE.TABLES.PARKING)
      .select('_id, Label');

    if (error) throw error;

    if (data && Array.isArray(data)) {
      data.forEach(parking => {
        lookupCache.parking.set(parking._id, {
          label: parking.Label || 'Unknown Parking'
        });
      });
      console.log(`Cached ${lookupCache.parking.size} parking options`);
    }
  } catch (error) {
    console.error('Failed to initialize parking lookups:', error);
  }
}

// ============================================================================
// Lookup Functions (Synchronous - use cached data)
// ============================================================================

/**
 * Get neighborhood name by ID (synchronous lookup from cache)
 * @param {string} neighborhoodId - The neighborhood ID
 * @returns {string} The neighborhood name or "Unknown Neighborhood"
 */
export function getNeighborhoodName(neighborhoodId) {
  if (!neighborhoodId) return '';

  const name = lookupCache.neighborhoods.get(neighborhoodId);
  if (name) return name;

  // Cache miss - return ID as fallback to show what's missing
  console.warn(`Neighborhood ID not found in cache: ${neighborhoodId}`);
  return neighborhoodId; // Show ID so we can debug
}

/**
 * Get borough name by ID (synchronous lookup from cache)
 * @param {string} boroughId - The borough ID
 * @returns {string} The borough name or "Unknown Borough"
 */
export function getBoroughName(boroughId) {
  if (!boroughId) return '';

  const name = lookupCache.boroughs.get(boroughId);
  if (name) return name;

  // Cache miss - return ID as fallback to show what's missing
  console.warn(`Borough ID not found in cache: ${boroughId}`);
  return boroughId; // Show ID so we can debug
}

/**
 * Get property type label by ID or type string
 * @param {string} propertyTypeId - The property type ID or string
 * @returns {string} The property type label or the original value
 */
export function getPropertyTypeLabel(propertyTypeId) {
  if (!propertyTypeId) return 'Entire Place'; // Default

  // Check cache first
  const label = lookupCache.propertyTypes.get(propertyTypeId);
  if (label) return label;

  // Check static mapping
  const staticLabel = PROPERTY_TYPE_MAP[propertyTypeId];
  if (staticLabel) return staticLabel;

  // If it's already a readable string, return it
  if (typeof propertyTypeId === 'string' && !propertyTypeId.includes('x')) {
    return propertyTypeId;
  }

  // Return original value if no mapping found
  console.warn(`Property type not found in cache: ${propertyTypeId}`);
  return propertyTypeId;
}

/**
 * Get amenity data by ID (synchronous lookup from cache)
 * @param {string} amenityId - The amenity ID
 * @returns {object|null} The amenity data {name, icon} or null
 */
export function getAmenity(amenityId) {
  if (!amenityId) return null;

  const amenity = lookupCache.amenities.get(amenityId);
  if (!amenity) {
    console.warn(`Amenity ID not found in cache: ${amenityId}`);
    return null;
  }

  return amenity;
}

/**
 * Get multiple amenities by ID array
 * @param {string[]} amenityIds - Array of amenity IDs
 * @returns {object[]} Array of amenity data {name, icon}
 */
export function getAmenities(amenityIds) {
  if (!Array.isArray(amenityIds)) return [];
  return amenityIds.map(id => getAmenity(id)).filter(Boolean);
}

/**
 * Get safety feature data by ID (synchronous lookup from cache)
 * @param {string} safetyId - The safety feature ID
 * @returns {object|null} The safety feature data {name, icon} or null
 */
export function getSafetyFeature(safetyId) {
  if (!safetyId) return null;

  const safety = lookupCache.safety.get(safetyId);
  if (!safety) {
    console.warn(`Safety feature ID not found in cache: ${safetyId}`);
    return null;
  }

  return safety;
}

/**
 * Get multiple safety features by ID array
 * @param {string[]} safetyIds - Array of safety feature IDs
 * @returns {object[]} Array of safety feature data {name, icon}
 */
export function getSafetyFeatures(safetyIds) {
  if (!Array.isArray(safetyIds)) return [];
  return safetyIds.map(id => getSafetyFeature(id)).filter(Boolean);
}

/**
 * Get house rule data by ID (synchronous lookup from cache)
 * @param {string} ruleId - The house rule ID
 * @returns {object|null} The house rule data {name, icon} or null
 */
export function getHouseRule(ruleId) {
  if (!ruleId) return null;

  const rule = lookupCache.houseRules.get(ruleId);
  if (!rule) {
    console.warn(`House rule ID not found in cache: ${ruleId}`);
    return null;
  }

  return rule;
}

/**
 * Get multiple house rules by ID array
 * @param {string[]} ruleIds - Array of house rule IDs
 * @returns {object[]} Array of house rule data {name, icon}
 */
export function getHouseRules(ruleIds) {
  if (!Array.isArray(ruleIds)) return [];
  return ruleIds.map(id => getHouseRule(id)).filter(Boolean);
}

/**
 * Get parking option data by ID (synchronous lookup from cache)
 * @param {string} parkingId - The parking option ID
 * @returns {object|null} The parking option data {label} or null
 */
export function getParkingOption(parkingId) {
  if (!parkingId) return null;

  const parking = lookupCache.parking.get(parkingId);
  if (!parking) {
    console.warn(`Parking option ID not found in cache: ${parkingId}`);
    return null;
  }

  return parking;
}

// ============================================================================
// Async Lookup Functions (for individual queries if needed)
// ============================================================================

/**
 * Fetch neighborhood name by ID from database (async)
 * Use this only if the cache doesn't have the value
 * @param {string} neighborhoodId - The neighborhood ID
 * @returns {Promise<string>} The neighborhood name
 */
export async function fetchNeighborhoodName(neighborhoodId) {
  if (!neighborhoodId) return '';

  // Check cache first
  const cached = lookupCache.neighborhoods.get(neighborhoodId);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from(DATABASE.TABLES.NEIGHBORHOOD)
      .select('Display')
      .eq('_id', neighborhoodId)
      .single();

    if (error) throw error;

    const name = data?.Display || 'Unknown Neighborhood';
    // Cache the result
    lookupCache.neighborhoods.set(neighborhoodId, name);
    return name;
  } catch (error) {
    console.error(`Failed to fetch neighborhood ${neighborhoodId}:`, error);
    return 'Unknown Neighborhood';
  }
}

/**
 * Fetch borough name by ID from database (async)
 * Use this only if the cache doesn't have the value
 * @param {string} boroughId - The borough ID
 * @returns {Promise<string>} The borough name
 */
export async function fetchBoroughName(boroughId) {
  if (!boroughId) return '';

  // Check cache first
  const cached = lookupCache.boroughs.get(boroughId);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from(DATABASE.TABLES.BOROUGH)
      .select('"Display Borough"')
      .eq('_id', boroughId)
      .single();

    if (error) throw error;

    const name = data?.['Display Borough'] || 'Unknown Borough';
    // Cache the result
    lookupCache.boroughs.set(boroughId, name);
    return name;
  } catch (error) {
    console.error(`Failed to fetch borough ${boroughId}:`, error);
    return 'Unknown Borough';
  }
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear all caches and re-initialize
 * @returns {Promise<void>}
 */
export async function refreshLookups() {
  lookupCache.neighborhoods.clear();
  lookupCache.boroughs.clear();
  lookupCache.propertyTypes.clear();
  lookupCache.amenities.clear();
  lookupCache.safety.clear();
  lookupCache.houseRules.clear();
  lookupCache.parking.clear();
  lookupCache.initialized = false;
  await initializeLookups();
}

/**
 * Get cache statistics for debugging
 * @returns {object} Cache statistics
 */
export function getCacheStats() {
  return {
    neighborhoods: lookupCache.neighborhoods.size,
    boroughs: lookupCache.boroughs.size,
    propertyTypes: lookupCache.propertyTypes.size,
    amenities: lookupCache.amenities.size,
    safety: lookupCache.safety.size,
    houseRules: lookupCache.houseRules.size,
    parking: lookupCache.parking.size,
    initialized: lookupCache.initialized
  };
}

/**
 * Check if lookups are initialized
 * @returns {boolean}
 */
export function isInitialized() {
  return lookupCache.initialized;
}
