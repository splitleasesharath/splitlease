/**
 * AI Service - Client for AI Gateway Edge Function
 * Split Lease
 *
 * Provides functions to call AI-powered features through Supabase Edge Functions
 *
 * @module lib/aiService
 */

import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[aiService]'

const EDGE_FUNCTIONS = Object.freeze({
  AI_GATEWAY: 'ai-gateway'
})

const ACTIONS = Object.freeze({
  COMPLETE: 'complete'
})

const PROMPT_KEYS = Object.freeze({
  LISTING_DESCRIPTION: 'listing-description',
  LISTING_TITLE: 'listing-title',
  NEIGHBORHOOD_DESCRIPTION: 'neighborhood-description'
})

const DEFAULT_VALUES = Object.freeze({
  NONE_SPECIFIED: 'None specified',
  EMPTY: ''
})

const STORAGE_KEYS = Object.freeze({
  SELF_LISTING_DRAFT: 'selfListingDraft'
})

/**
 * Rare amenities that should be prioritized in title generation
 * These are differentiators that make a listing stand out
 */
const RARE_AMENITIES = Object.freeze([
  'washer', 'dryer', 'w/d', 'laundry',
  'dishwasher',
  'terrace', 'balcony', 'patio', 'outdoor', 'backyard', 'garden', 'deck',
  'rooftop', 'roof deck',
  'doorman', 'concierge',
  'gym', 'fitness',
  'parking', 'garage',
  'pool', 'swimming',
  'elevator',
  'exposed brick', 'high ceiling', 'skylight',
  'fireplace',
  'view', 'views',
])

/**
 * Variation hints to force different title approaches
 */
const VARIATION_HINTS = Object.freeze([
  'Focus on the LOCATION - mention the neighborhood name prominently',
  'Focus on the BEST AMENITY - lead with the most unique feature',
  'Focus on the SPACE TYPE - emphasize what kind of space it is',
  'Focus on the VIBE - capture the neighborhood character',
  'Focus on LIFESTYLE - who would love living here',
])

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is an array
 * @pure
 */
const isArray = (value) => Array.isArray(value)

/**
 * Check if amenity contains a rare keyword
 * @pure
 */
const containsRareKeyword = (amenity) => {
  const lower = amenity.toLowerCase()
  return RARE_AMENITIES.some(rare => lower.includes(rare))
}

// ─────────────────────────────────────────────────────────────
// Pure Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Format array as comma-separated string
 * @pure
 */
const formatArrayToString = (arr) =>
  isArray(arr) ? arr.join(', ') : (arr || DEFAULT_VALUES.EMPTY)

/**
 * Get default or provided value
 * @pure
 */
const getOrDefault = (value, defaultValue = DEFAULT_VALUES.EMPTY) =>
  value ?? defaultValue

/**
 * Sort amenities by rarity - rare ones first
 * @pure
 * @param {string[]} amenities - Array of amenity strings
 * @returns {string[]} Sorted array with rare amenities first
 */
const sortAmenitiesByRarity = (amenities) => {
  if (!isArray(amenities)) return []

  return [...amenities].sort((a, b) => {
    const aIsRare = containsRareKeyword(a)
    const bIsRare = containsRareKeyword(b)

    if (aIsRare && !bIsRare) return -1
    if (!aIsRare && bIsRare) return 1
    return 0
  })
}

/**
 * Pick a random variation hint
 * @pure (deterministic for same Math.random seed)
 */
const pickRandomVariationHint = () =>
  VARIATION_HINTS[Math.floor(Math.random() * VARIATION_HINTS.length)]

/**
 * Build description variables
 * @pure
 */
const buildDescriptionVariables = (listingData, amenitiesInUnit, amenitiesOutside) =>
  Object.freeze({
    listingName: listingData.listingName || DEFAULT_VALUES.EMPTY,
    address: listingData.address || DEFAULT_VALUES.EMPTY,
    neighborhood: listingData.neighborhood || DEFAULT_VALUES.EMPTY,
    typeOfSpace: listingData.typeOfSpace || DEFAULT_VALUES.EMPTY,
    bedrooms: listingData.bedrooms ?? DEFAULT_VALUES.EMPTY,
    beds: listingData.beds ?? DEFAULT_VALUES.EMPTY,
    bathrooms: listingData.bathrooms ?? DEFAULT_VALUES.EMPTY,
    kitchenType: listingData.kitchenType || DEFAULT_VALUES.EMPTY,
    amenitiesInsideUnit: amenitiesInUnit || DEFAULT_VALUES.NONE_SPECIFIED,
    amenitiesOutsideUnit: amenitiesOutside || DEFAULT_VALUES.NONE_SPECIFIED,
  })

/**
 * Build title variables
 * @pure
 */
const buildTitleVariables = (listingData, amenitiesInUnit, amenitiesInBuilding, variationHint) =>
  Object.freeze({
    neighborhood: listingData.neighborhood || DEFAULT_VALUES.EMPTY,
    borough: listingData.borough || DEFAULT_VALUES.EMPTY,
    typeOfSpace: listingData.typeOfSpace || DEFAULT_VALUES.EMPTY,
    bedrooms: listingData.bedrooms ?? DEFAULT_VALUES.EMPTY,
    bathrooms: listingData.bathrooms ?? DEFAULT_VALUES.EMPTY,
    amenitiesInsideUnit: amenitiesInUnit || DEFAULT_VALUES.NONE_SPECIFIED,
    amenitiesInBuilding: amenitiesInBuilding || DEFAULT_VALUES.NONE_SPECIFIED,
    variationHint,
  })

/**
 * Build neighborhood variables
 * @pure
 */
const buildNeighborhoodVariables = (addressData) =>
  Object.freeze({
    address: addressData.fullAddress || DEFAULT_VALUES.EMPTY,
    city: addressData.city || DEFAULT_VALUES.EMPTY,
    state: addressData.state || DEFAULT_VALUES.EMPTY,
    zipCode: addressData.zip || DEFAULT_VALUES.EMPTY,
  })

/**
 * Build AI gateway request body
 * @pure
 */
const buildAIRequestBody = (promptKey, variables) =>
  Object.freeze({
    action: ACTIONS.COMPLETE,
    payload: Object.freeze({
      prompt_key: promptKey,
      variables,
    }),
  })

/**
 * Clean title response (remove quotes)
 * @pure
 */
const cleanTitleResponse = (title) =>
  (title || DEFAULT_VALUES.EMPTY).trim().replace(/^["']|["']$/g, '')

/**
 * Extract content from AI response
 * @pure
 */
const extractContent = (data) =>
  data?.data?.content || DEFAULT_VALUES.EMPTY

// ─────────────────────────────────────────────────────────────
// Logging Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Log generation start
 * @effectful
 */
const logGenerating = (type, data) => {
  console.log(`${LOG_PREFIX} Generating ${type} with data:`, data)
}

/**
 * Log AI call
 * @effectful
 */
const logAICall = (type, variables) => {
  console.log(`${LOG_PREFIX} Calling ai-gateway for ${type} with variables:`, variables)
}

/**
 * Log success
 * @effectful
 */
const logSuccess = (type, content) => {
  console.log(`${LOG_PREFIX} Generated ${type}:`, content)
}

/**
 * Log error
 * @effectful
 */
const logError = (message, error) => {
  console.error(`${LOG_PREFIX} ${message}:`, error)
}

/**
 * Log warning
 * @effectful
 */
const logWarning = (message) => {
  console.warn(`${LOG_PREFIX} ${message}`)
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Generate a listing description using AI based on property details
 * @effectful
 * @param {Object} listingData - The listing data to generate description from
 * @param {string} listingData.listingName - Name of the listing
 * @param {string} listingData.address - Full address
 * @param {string} listingData.neighborhood - Neighborhood name
 * @param {string} listingData.typeOfSpace - Type of space (e.g., "Private Room", "Entire Place")
 * @param {number} listingData.bedrooms - Number of bedrooms (0 = Studio)
 * @param {number} listingData.beds - Number of beds
 * @param {number} listingData.bathrooms - Number of bathrooms
 * @param {string} listingData.kitchenType - Kitchen type (e.g., "Full Kitchen", "Kitchenette")
 * @param {string[]} listingData.amenitiesInsideUnit - Array of in-unit amenities
 * @param {string[]} listingData.amenitiesOutsideUnit - Array of building amenities
 * @returns {Promise<string>} Generated description
 * @throws {Error} If generation fails
 */
export async function generateListingDescription(listingData) {
  logGenerating('listing description', listingData)

  // Format amenities arrays as comma-separated strings
  const amenitiesInUnit = formatArrayToString(listingData.amenitiesInsideUnit)
  const amenitiesOutside = formatArrayToString(listingData.amenitiesOutsideUnit)

  // Prepare variables for the prompt
  const variables = buildDescriptionVariables(listingData, amenitiesInUnit, amenitiesOutside)

  logAICall('description', variables)

  const { data, error } = await supabase.functions.invoke(EDGE_FUNCTIONS.AI_GATEWAY, {
    body: buildAIRequestBody(PROMPT_KEYS.LISTING_DESCRIPTION, variables),
  })

  if (error) {
    logError('Edge Function error', error)
    throw new Error(`Failed to generate description: ${error.message}`)
  }

  if (!data?.success) {
    logError('AI Gateway error', data?.error)
    throw new Error(data?.error || 'Failed to generate description')
  }

  const content = extractContent(data)
  logSuccess('description', content)
  return content
}

/**
 * Generate a listing title using AI based on property details
 * @effectful
 * @param {Object} listingData - The listing data to generate title from
 * @param {string} listingData.neighborhood - Neighborhood name
 * @param {string} listingData.borough - Borough name (Manhattan, Brooklyn, etc.)
 * @param {string} listingData.typeOfSpace - Type of space (e.g., "Private Room", "Entire Place")
 * @param {number} listingData.bedrooms - Number of bedrooms (0 = Studio)
 * @param {number} listingData.bathrooms - Number of bathrooms
 * @param {string[]} listingData.amenitiesInsideUnit - Array of in-unit amenities
 * @param {string[]} listingData.amenitiesOutsideUnit - Array of building amenities
 * @returns {Promise<string>} Generated title
 * @throws {Error} If generation fails
 */
export async function generateListingTitle(listingData) {
  logGenerating('listing title', listingData)

  // Sort amenities by rarity (rare ones first) and take top 5
  const inUnitSorted = sortAmenitiesByRarity(listingData.amenitiesInsideUnit || [])
  const buildingSorted = sortAmenitiesByRarity(listingData.amenitiesOutsideUnit || [])

  const amenitiesInUnit = inUnitSorted.slice(0, 5).join(', ')
  const amenitiesInBuilding = buildingSorted.slice(0, 5).join(', ')

  // Pick a random variation hint to force different approaches
  const variationHint = pickRandomVariationHint()

  // Prepare variables for the prompt
  const variables = buildTitleVariables(listingData, amenitiesInUnit, amenitiesInBuilding, variationHint)

  logAICall('title', variables)

  const { data, error } = await supabase.functions.invoke(EDGE_FUNCTIONS.AI_GATEWAY, {
    body: buildAIRequestBody(PROMPT_KEYS.LISTING_TITLE, variables),
  })

  if (error) {
    logError('Edge Function error', error)
    throw new Error(`Failed to generate title: ${error.message}`)
  }

  if (!data?.success) {
    logError('AI Gateway error', data?.error)
    throw new Error(data?.error || 'Failed to generate title')
  }

  // Clean up the response (remove quotes if present)
  const title = cleanTitleResponse(extractContent(data))

  logSuccess('title', title)
  return title
}

/**
 * Generate a neighborhood description using AI based on address
 * Used as fallback when ZIP code lookup fails
 * @effectful
 * @param {Object} addressData - The address data to generate description from
 * @param {string} addressData.fullAddress - Full street address
 * @param {string} addressData.city - City name
 * @param {string} addressData.state - State abbreviation
 * @param {string} addressData.zip - ZIP code
 * @returns {Promise<string>} Generated neighborhood description
 * @throws {Error} If generation fails
 */
export async function generateNeighborhoodDescription(addressData) {
  logGenerating('neighborhood description', addressData)

  const variables = buildNeighborhoodVariables(addressData)

  logAICall('neighborhood', variables)

  const { data, error } = await supabase.functions.invoke(EDGE_FUNCTIONS.AI_GATEWAY, {
    body: buildAIRequestBody(PROMPT_KEYS.NEIGHBORHOOD_DESCRIPTION, variables),
  })

  if (error) {
    logError('Edge Function error', error)
    throw new Error(`Failed to generate neighborhood description: ${error.message}`)
  }

  if (!data?.success) {
    logError('AI Gateway error', data?.error)
    throw new Error(data?.error || 'Failed to generate neighborhood description')
  }

  const content = extractContent(data)
  logSuccess('neighborhood description', content)
  return content
}

/**
 * Extract listing data from localStorage draft for AI generation
 * Reads the selfListingDraft from localStorage and extracts relevant fields
 * @effectful
 * @returns {Object} Extracted listing data suitable for generateListingDescription
 */
export function extractListingDataFromDraft() {
  const draftJson = localStorage.getItem(STORAGE_KEYS.SELF_LISTING_DRAFT)

  if (!draftJson) {
    logWarning('No draft found in localStorage')
    return null
  }

  try {
    const draft = JSON.parse(draftJson)

    return Object.freeze({
      listingName: getOrDefault(draft.spaceSnapshot?.listingName),
      address: getOrDefault(draft.spaceSnapshot?.address?.fullAddress),
      neighborhood: getOrDefault(draft.spaceSnapshot?.address?.neighborhood),
      typeOfSpace: getOrDefault(draft.spaceSnapshot?.typeOfSpace),
      bedrooms: draft.spaceSnapshot?.bedrooms ?? 0,
      beds: draft.spaceSnapshot?.beds ?? 0,
      bathrooms: draft.spaceSnapshot?.bathrooms ?? 0,
      kitchenType: getOrDefault(draft.spaceSnapshot?.typeOfKitchen),
      amenitiesInsideUnit: draft.features?.amenitiesInsideUnit || [],
      amenitiesOutsideUnit: draft.features?.amenitiesOutsideUnit || [],
    })
  } catch (error) {
    logError('Error parsing draft from localStorage', error)
    return null
  }
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  LOG_PREFIX,
  EDGE_FUNCTIONS,
  ACTIONS,
  PROMPT_KEYS,
  DEFAULT_VALUES,
  STORAGE_KEYS,
  RARE_AMENITIES,
  VARIATION_HINTS
}
