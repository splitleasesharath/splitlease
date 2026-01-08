/**
 * Slack Service - Cloudflare Pages Function Proxy
 *
 * Handles Slack-related operations via Cloudflare Pages Functions.
 * Uses /api/faq-inquiry endpoint (Cloudflare Pages Function).
 *
 * NOTE: Switched from Supabase Edge Functions due to known bug where
 * secrets don't propagate to Edge Functions (GitHub issue #38329).
 * Cloudflare Pages Functions work correctly with secrets.
 *
 * NO FALLBACK: If the function fails, we fail.
 *
 * @module lib/slackService
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[Slack Service]'

const ENDPOINTS = Object.freeze({
  FAQ_INQUIRY: '/api/faq-inquiry'
})

const ERROR_MESSAGES = Object.freeze({
  ALL_FIELDS_REQUIRED: 'All fields are required',
  SEND_FAILED: 'Failed to send inquiry',
  UNKNOWN_ERROR: 'Unknown error'
})

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is a non-empty string after trimming
 * @pure
 */
const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0

/**
 * Check if all inquiry fields are valid
 * @pure
 */
const isValidInquiry = ({ name, email, inquiry }) =>
  isNonEmptyString(name) && isNonEmptyString(email) && isNonEmptyString(inquiry)

// ─────────────────────────────────────────────────────────────
// Pure Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Trim string safely
 * @pure
 */
const trimString = (value) => (value || '').trim()

/**
 * Build request body for FAQ inquiry
 * @pure
 */
const buildInquiryBody = ({ name, email, inquiry }) =>
  JSON.stringify({
    name: trimString(name),
    email: trimString(email),
    inquiry: trimString(inquiry)
  })

/**
 * Extract error message from response data
 * @pure
 */
const extractErrorMessage = (data, defaultMessage) =>
  data?.error || defaultMessage

// ─────────────────────────────────────────────────────────────
// Logging Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Log operation start
 * @effectful
 */
const logStart = (message) => {
  console.log(`${LOG_PREFIX} ${message}`)
}

/**
 * Log success
 * @effectful
 */
const logSuccess = (message) => {
  console.log(`${LOG_PREFIX} ${message}`)
}

/**
 * Log error
 * @effectful
 */
const logError = (message, error) => {
  console.error(`${LOG_PREFIX} ${message}:`, error)
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Send an FAQ inquiry to Slack channels via Cloudflare Pages Function
 * NO FALLBACK - Throws if function fails
 * @effectful
 * @param {Object} inquiry - The inquiry data
 * @param {string} inquiry.name - Name of the person submitting
 * @param {string} inquiry.email - Email of the person submitting
 * @param {string} inquiry.inquiry - The inquiry message
 * @returns {Promise<Object>} - Success response with message
 */
export async function sendFaqInquiry({ name, email, inquiry }) {
  logStart('Sending FAQ inquiry via Cloudflare Pages Function')

  if (!isValidInquiry({ name, email, inquiry })) {
    throw new Error(ERROR_MESSAGES.ALL_FIELDS_REQUIRED)
  }

  try {
    const response = await fetch(ENDPOINTS.FAQ_INQUIRY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: buildInquiryBody({ name, email, inquiry })
    })

    const data = await response.json()

    if (!response.ok) {
      logError('Cloudflare Function error', data)
      throw new Error(extractErrorMessage(data, ERROR_MESSAGES.SEND_FAILED))
    }

    if (!data.success) {
      throw new Error(extractErrorMessage(data, ERROR_MESSAGES.UNKNOWN_ERROR))
    }

    logSuccess('FAQ inquiry sent successfully')
    return data
  } catch (error) {
    logError('Failed to send FAQ inquiry', error)
    throw error
  }
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  LOG_PREFIX,
  ENDPOINTS,
  ERROR_MESSAGES
}
