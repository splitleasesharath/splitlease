/**
 * Guest Relationships API Client
 *
 * Client for interacting with the guest-management Edge Function
 * and related messaging services.
 */

import supabase from './supabase.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = window.ENV?.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;

/**
 * Get the current user's access token for authenticated requests
 */
async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Make an authenticated request to an Edge Function
 */
async function callEdgeFunction(functionName, action, payload = {}) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ action, payload })
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return data.data;
}

// ============================================================================
// GUEST MANAGEMENT API
// ============================================================================

/**
 * Search for guests by name, email, or phone
 * @param {Object} params
 * @param {string} params.query - Search query
 * @param {'name'|'email'|'phone'|'all'} [params.searchType='all'] - Search type
 * @param {number} [params.limit=20] - Max results
 */
export async function searchGuests({ query, searchType = 'all', limit = 20 }) {
  return callEdgeFunction('guest-management', 'search_guests', {
    query,
    searchType,
    limit
  });
}

/**
 * Get a single guest with full details
 * @param {string} guestId - Guest ID
 * @param {Object} [options]
 * @param {boolean} [options.includeHistory=true] - Include activity history
 * @param {boolean} [options.includeArticles=true] - Include assigned articles
 */
export async function getGuest(guestId, options = {}) {
  const { includeHistory = true, includeArticles = true } = options;
  return callEdgeFunction('guest-management', 'get_guest', {
    guestId,
    includeHistory,
    includeArticles
  });
}

/**
 * Create a new guest account
 * @param {Object} guestData
 * @param {string} guestData.firstName
 * @param {string} guestData.lastName
 * @param {string} guestData.email
 * @param {string} [guestData.phoneNumber]
 * @param {string} [guestData.birthDate]
 * @param {'guest'|'host'|'corporate'|'admin'} [guestData.userType='guest']
 */
export async function createGuest(guestData) {
  return callEdgeFunction('guest-management', 'create_guest', guestData);
}

/**
 * Get activity history for a guest
 * @param {string} guestId
 * @param {Object} [options]
 * @param {number} [options.limit=50]
 * @param {number} [options.offset=0]
 */
export async function getGuestHistory(guestId, options = {}) {
  const { limit = 50, offset = 0 } = options;
  return callEdgeFunction('guest-management', 'get_guest_history', {
    guestId,
    limit,
    offset
  });
}

/**
 * Assign a knowledge article to a guest
 * @param {string} guestId
 * @param {string} articleId
 */
export async function assignArticle(guestId, articleId) {
  return callEdgeFunction('guest-management', 'assign_article', {
    guestId,
    articleId
  });
}

/**
 * Remove a knowledge article assignment from a guest
 * @param {string} guestId
 * @param {string} articleId
 */
export async function removeArticle(guestId, articleId) {
  return callEdgeFunction('guest-management', 'remove_article', {
    guestId,
    articleId
  });
}

/**
 * List all knowledge base articles
 * @param {Object} [options]
 * @param {string} [options.category] - Filter by category
 * @param {number} [options.limit=50]
 * @param {number} [options.offset=0]
 */
export async function listArticles(options = {}) {
  return callEdgeFunction('guest-management', 'list_articles', options);
}

// ============================================================================
// MESSAGING API (using existing send-email and send-sms functions)
// ============================================================================

/**
 * Send an email to a guest
 * @param {Object} emailData
 * @param {string} emailData.to - Recipient email
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.body - Email body (HTML or plain text)
 * @param {string} [emailData.bcc] - BCC email for Slack integration
 */
export async function sendEmailToGuest({ to, subject, body, bcc }) {
  return callEdgeFunction('send-email', 'send', {
    to,
    subject,
    body,
    bcc: bcc || 'noisybubble-aaaafnhc4jdlagc3jg3cdatmi@splitlease.slack.com'
  });
}

/**
 * Send an SMS to a guest
 * @param {Object} smsData
 * @param {string} smsData.to - Recipient phone (E.164 format: +1XXXXXXXXXX)
 * @param {string} smsData.body - SMS message body
 */
export async function sendSMSToGuest({ to, body }) {
  return callEdgeFunction('send-sms', 'send', {
    to,
    body
  });
}

// ============================================================================
// LISTINGS API (using existing listing function)
// ============================================================================

/**
 * Search listings
 * @param {Object} [filters] - Search filters
 * @param {number} [limit=20] - Max results
 */
export async function searchListings(filters = {}, limit = 20) {
  return callEdgeFunction('listing', 'search', {
    filters,
    limit
  });
}

/**
 * Get a specific listing
 * @param {string} listingId
 */
export async function getListing(listingId) {
  return callEdgeFunction('listing', 'get', { id: listingId });
}

// ============================================================================
// PROPOSALS API (using existing proposal function)
// ============================================================================

/**
 * Get proposals for a user
 * @param {string} userId
 * @param {Object} [options]
 * @param {'all'|'current'|'suggested'} [options.type='all']
 */
export async function getUserProposals(userId, options = {}) {
  const { type = 'all' } = options;
  return callEdgeFunction('proposal', 'get', {
    userId,
    type
  });
}

/**
 * Get proposals for a listing
 * @param {string} listingId
 */
export async function getListingProposals(listingId) {
  return callEdgeFunction('proposal', 'get', {
    listingId
  });
}

export default {
  // Guest management
  searchGuests,
  getGuest,
  createGuest,
  getGuestHistory,
  assignArticle,
  removeArticle,
  listArticles,
  // Messaging
  sendEmailToGuest,
  sendSMSToGuest,
  // Listings
  searchListings,
  getListing,
  // Proposals
  getUserProposals,
  getListingProposals
};
