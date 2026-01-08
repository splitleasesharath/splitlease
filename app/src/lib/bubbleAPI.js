/**
 * Bubble.io API Service - Edge Function Proxy
 *
 * ALL Bubble workflow calls now route through Supabase Edge Functions.
 * This ensures atomic operations and secure API key storage.
 *
 * NO FALLBACK: If Edge Function fails, we fail. No client-side retry logic.
 * API keys are stored server-side only in Supabase Secrets.
 *
 * Migration Status: ✅ MIGRATED TO EDGE FUNCTIONS
 *
 * @module lib/bubbleAPI
 */

import { supabase } from './supabase.js';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[Bubble API]'

const EDGE_FUNCTIONS = Object.freeze({
  BUBBLE_PROXY: 'bubble-proxy'
})

const ACTIONS = Object.freeze({
  CREATE_LISTING: 'create_listing',
  GET_LISTING: 'get_listing',
  UPLOAD_PHOTOS: 'upload_photos',
  SUBMIT_LISTING: 'submit_listing'
})

const ERROR_MESSAGES = Object.freeze({
  LISTING_NAME_REQUIRED: 'Listing name is required',
  LISTING_ID_REQUIRED: 'Listing ID is required',
  USER_EMAIL_REQUIRED: 'User email is required',
  LISTING_DATA_REQUIRED: 'Listing data is required',
  PHOTOS_REQUIRED: 'At least one photo is required',
  DIRECT_CALLS_NOT_SUPPORTED: 'Direct Bubble workflow calls are not supported. Use Edge Functions.'
})

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is a non-empty string
 * @pure
 */
const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0

/**
 * Check if value is a non-empty array
 * @pure
 */
const isNonEmptyArray = (value) =>
  Array.isArray(value) && value.length > 0

/**
 * Check if value is a valid object
 * @pure
 */
const isValidObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

// ─────────────────────────────────────────────────────────────
// Pure Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Trim string safely
 * @pure
 */
const trimString = (value) => value?.trim() ?? ''

/**
 * Extract error message from response
 * @pure
 */
const extractErrorMessage = (error, defaultMessage) =>
  error?.message || defaultMessage

/**
 * Build Edge Function payload
 * @pure
 */
const buildPayload = (action, payload) =>
  Object.freeze({ action, payload })

/**
 * Log operation start
 * @effectful
 */
const logOperationStart = (operation, details) => {
  console.log(`${LOG_PREFIX} ${operation}`)
  Object.entries(details).forEach(([key, value]) => {
    console.log(`${LOG_PREFIX} ${key}:`, value)
  })
}

/**
 * Log operation success
 * @effectful
 */
const logSuccess = (message, data) => {
  console.log(`${LOG_PREFIX} ✅ ${message}:`, data)
}

/**
 * Log operation error
 * @effectful
 */
const logError = (message, error) => {
  console.error(`${LOG_PREFIX} ${message}:`, error)
}

// ─────────────────────────────────────────────────────────────
// Edge Function Invocation
// ─────────────────────────────────────────────────────────────

/**
 * Invoke Edge Function and handle response
 * @effectful
 * @param {string} functionName - Edge function name
 * @param {Object} body - Request body
 * @param {string} errorContext - Context for error messages
 * @returns {Promise<Object>} - Response data
 */
async function invokeEdgeFunction(functionName, body, errorContext) {
  const { data, error } = await supabase.functions.invoke(functionName, { body })

  if (error) {
    logError(`Edge Function error (${errorContext})`, error)
    throw new Error(extractErrorMessage(error, `Failed to ${errorContext}`))
  }

  if (!data.success) {
    throw new Error(data.error || 'Unknown error')
  }

  return data.data
}

// ─────────────────────────────────────────────────────────────
// Public API Functions
// ─────────────────────────────────────────────────────────────

/**
 * Trigger a Bubble.io backend workflow via Edge Function
 * @deprecated Use specific functions like createListingInCode instead
 * @effectful
 * @param {string} workflowName - Name of the workflow (not used - for backward compatibility)
 * @param {Object} parameters - Parameters to pass to the workflow (not used)
 * @returns {Promise<Object>} - Throws error (direct workflow calls not supported)
 */
export async function triggerBubbleWorkflow(workflowName, parameters = {}) {
  console.warn(`${LOG_PREFIX} ⚠️ triggerBubbleWorkflow is deprecated and will be removed.`)
  console.warn(`${LOG_PREFIX} Direct Bubble workflow calls are not supported.`)
  console.warn(`${LOG_PREFIX} Use Edge Function proxies instead (e.g., createListingInCode).`)
  throw new Error(ERROR_MESSAGES.DIRECT_CALLS_NOT_SUPPORTED)
}

/**
 * Create a new listing via Supabase Edge Function
 * Implements atomic operation: Create in Bubble → Fetch from Bubble → Sync to Supabase
 * NO FALLBACK - Throws if Edge Function fails
 * @effectful
 * @param {string} listingName - Name of the listing to create
 * @param {string} [userEmail] - Email of the logged-in user (optional)
 * @returns {Promise<Object>} - Synced listing data from Supabase
 */
export async function createListingInCode(listingName, userEmail = null) {
  logOperationStart('Creating listing via Edge Function', {
    'Listing name': listingName,
    'User email': userEmail || 'Not provided (logged out)'
  })

  if (!isNonEmptyString(listingName)) {
    throw new Error(ERROR_MESSAGES.LISTING_NAME_REQUIRED)
  }

  try {
    const payload = buildPayload(ACTIONS.CREATE_LISTING, {
      listing_name: trimString(listingName),
      user_email: userEmail
    })

    const result = await invokeEdgeFunction(
      EDGE_FUNCTIONS.BUBBLE_PROXY,
      payload,
      'create listing'
    )

    logSuccess('Listing created and synced', result)
    return result
  } catch (error) {
    logError('Failed to create listing', error)
    throw error
  }
}

/**
 * Get a listing by ID via Supabase Edge Function
 * Fetches listing data from Bubble via Edge Function proxy
 * NO FALLBACK - Throws if Edge Function fails
 * @effectful
 * @param {string} listingId - Bubble ID of the listing to fetch
 * @returns {Promise<Object>} - Listing data from Bubble
 */
export async function getListingById(listingId) {
  logOperationStart('Fetching listing via Edge Function', {
    'Listing ID': listingId
  })

  if (!isNonEmptyString(listingId)) {
    throw new Error(ERROR_MESSAGES.LISTING_ID_REQUIRED)
  }

  try {
    const payload = buildPayload(ACTIONS.GET_LISTING, {
      listing_id: trimString(listingId)
    })

    const result = await invokeEdgeFunction(
      EDGE_FUNCTIONS.BUBBLE_PROXY,
      payload,
      'fetch listing'
    )

    logSuccess('Listing fetched', result)
    return result
  } catch (error) {
    logError('Failed to fetch listing', error)
    throw error
  }
}

/**
 * Upload listing photos via Supabase Edge Function
 * Sends all photos to Bubble in a single workflow call
 * Bubble creates Listing-Photo records and attaches them to the Listing
 * Sort order is determined by array position (first photo = cover photo)
 * NO FALLBACK - Throws if Edge Function fails
 * @effectful
 * @param {string} listingId - Bubble ID of the listing
 * @param {string[]} photos - Array of base64-encoded image data URLs
 * @returns {Promise<Object>} - Upload result with count
 */
export async function uploadListingPhotos(listingId, photos) {
  logOperationStart('Uploading photos via Edge Function', {
    'Listing ID': listingId,
    'Number of photos': photos?.length || 0
  })

  if (!isNonEmptyString(listingId)) {
    throw new Error(ERROR_MESSAGES.LISTING_ID_REQUIRED)
  }

  if (!isNonEmptyArray(photos)) {
    throw new Error(ERROR_MESSAGES.PHOTOS_REQUIRED)
  }

  try {
    const payload = buildPayload(ACTIONS.UPLOAD_PHOTOS, {
      listing_id: trimString(listingId),
      photos: photos
    })

    const result = await invokeEdgeFunction(
      EDGE_FUNCTIONS.BUBBLE_PROXY,
      payload,
      'upload photos'
    )

    logSuccess('Photos uploaded', result)
    return result
  } catch (error) {
    logError('Failed to upload photos', error)
    throw error
  }
}

/**
 * Submit a complete listing via Supabase Edge Function
 * Sends all listing form data to Bubble and syncs to Supabase
 * Called AFTER user signup/login with complete form data
 * NO FALLBACK - Throws if Edge Function fails
 * @effectful
 * @param {string} listingId - Bubble ID of the existing listing to update
 * @param {string} userEmail - Email of the user (from signup or existing user)
 * @param {Object} listingData - Complete listing data from prepareListingSubmission()
 * @param {string} [userUniqueId] - Bubble user unique ID (from signup response)
 * @returns {Promise<Object>} - Updated listing data
 */
export async function submitListingFull(listingId, userEmail, listingData, userUniqueId = null) {
  logOperationStart('Submitting full listing via Edge Function', {
    'Listing ID': listingId,
    'User Email': userEmail,
    'User Unique ID': userUniqueId || 'Not provided',
    'Listing data keys': Object.keys(listingData || {})
  })

  if (!isNonEmptyString(listingId)) {
    throw new Error(ERROR_MESSAGES.LISTING_ID_REQUIRED)
  }

  if (!isNonEmptyString(userEmail)) {
    throw new Error(ERROR_MESSAGES.USER_EMAIL_REQUIRED)
  }

  if (!isValidObject(listingData)) {
    throw new Error(ERROR_MESSAGES.LISTING_DATA_REQUIRED)
  }

  try {
    const payload = buildPayload(ACTIONS.SUBMIT_LISTING, {
      listing_id: trimString(listingId),
      user_email: trimString(userEmail),
      user_unique_id: userUniqueId,
      listing_data: listingData
    })

    const result = await invokeEdgeFunction(
      EDGE_FUNCTIONS.BUBBLE_PROXY,
      payload,
      'submit listing'
    )

    logSuccess('Listing submitted and synced', result)
    return result
  } catch (error) {
    logError('Failed to submit listing', error)
    throw error
  }
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  LOG_PREFIX,
  EDGE_FUNCTIONS,
  ACTIONS,
  ERROR_MESSAGES
}
