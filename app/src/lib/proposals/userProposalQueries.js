/**
 * User Proposal Query Functions
 * Implements user."Proposals List" approach per user requirement
 *
 * Data flow:
 * 1. Get user ID from authenticated session (NOT from URL)
 * 2. Fetch user data with "Proposals List" array
 * 3. Extract proposal IDs from the array
 * 4. Fetch proposals by those specific IDs
 * 5. Fetch related listings and hosts (nested fetches)
 * 6. Return user + proposals + selected proposal
 *
 * @module lib/proposals/userProposalQueries
 */

import { supabase } from '../supabase.js'
import { getUserIdFromSession, getProposalIdFromQuery } from './urlParser.js'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[userProposalQueries]'

const CANCELLED_BY_GUEST_STATUS = 'Proposal Cancelled by Guest'

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is nullish
 * @pure
 */
const isNullish = (value) => value === null || value === undefined

/**
 * Check if array is valid and non-empty
 * @pure
 */
const isNonEmptyArray = (arr) =>
  Array.isArray(arr) && arr.length > 0

/**
 * Check if proposal is valid (not deleted and not cancelled by guest)
 * @pure
 */
const isValidProposal = (proposal) => {
  if (!proposal) return false
  if (proposal.Deleted === true) return false
  if (proposal.Status === CANCELLED_BY_GUEST_STATUS) return false
  return true
}

/**
 * Check if photo is embedded (object format)
 * @pure
 */
const isEmbeddedPhoto = (photo) =>
  typeof photo === 'object' && photo !== null

// ─────────────────────────────────────────────────────────────
// Logging Helpers (Effectful)
// ─────────────────────────────────────────────────────────────

/**
 * @effectful
 */
const logInfo = (message, data) => {
  if (data !== undefined) {
    console.log(`${LOG_PREFIX} ${message}:`, data)
  } else {
    console.log(`${LOG_PREFIX} ${message}`)
  }
}

/**
 * @effectful
 */
const logError = (message, error) => {
  console.error(`${LOG_PREFIX} ${message}:`, error)
}

/**
 * @effectful
 */
const logWarning = (message, data) => {
  if (data !== undefined) {
    console.warn(`${LOG_PREFIX} ${message}:`, data)
  } else {
    console.warn(`${LOG_PREFIX} ${message}`)
  }
}

// ─────────────────────────────────────────────────────────────
// Pure Data Extraction Functions
// ─────────────────────────────────────────────────────────────

/**
 * Extract unique IDs from array of objects
 * @pure
 */
const extractUniqueIds = (items, key) =>
  [...new Set(items.map(item => item[key]).filter(Boolean))]

/**
 * Parse JSON string to array safely
 * @pure
 */
const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return []
    }
  }
  return []
}

/**
 * Extract photos from listing field
 * @pure
 */
const extractPhotosFromField = (photosField) => {
  if (Array.isArray(photosField)) return photosField
  if (typeof photosField === 'string') {
    try {
      return JSON.parse(photosField)
    } catch {
      return []
    }
  }
  return []
}

/**
 * Normalize photo URL (add https: if needed)
 * @pure
 */
const normalizePhotoUrl = (url) => {
  if (!url) return ''
  return url.startsWith('//') ? `https:${url}` : url
}

/**
 * Extract featured photo URL from embedded photos
 * @pure
 */
const extractFeaturedPhotoUrl = (photos) => {
  if (!isNonEmptyArray(photos)) return null
  if (!isEmbeddedPhoto(photos[0])) return null

  const mainPhoto = photos.find(p => p.toggleMainPhoto) || photos[0]
  const photoUrl = mainPhoto.url || mainPhoto.Photo || ''
  return normalizePhotoUrl(photoUrl) || null
}

/**
 * Build lookup map from array
 * @pure
 */
const buildLookupMap = (items, keyExtractor, valueExtractor = (item) => item) =>
  new Map(items.map(item => [keyExtractor(item), valueExtractor(item)]))

/**
 * Build empty result
 * @pure
 */
const buildEmptyResult = (user) => Object.freeze({
  user,
  proposals: [],
  selectedProposal: null
})

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * STEP 1: Fetch user data with Proposals List
 * @effectful
 * @param {string} userId - User ID from URL path
 * @returns {Promise<Object>} User object with Proposals List
 */
export async function fetchUserWithProposalList(userId) {
  const { data, error } = await supabase
    .from('user')
    .select(`
      _id,
      "Name - First",
      "Name - Last",
      "Name - Full",
      "Profile Photo",
      "email as text",
      "Proposals List"
    `)
    .eq('_id', userId)
    .maybeSingle()

  if (error) {
    logError('Error fetching user', error)
    throw new Error(`Failed to fetch user: ${error.message}`)
  }

  if (!data) {
    logError('User not found with ID', userId)
    throw new Error(`User with ID ${userId} not found. Please check the URL.`)
  }

  logInfo('User fetched', data['Name - First'] || data['Name - Full'])
  return data
}

/**
 * STEP 2: Extract proposal IDs from user's Proposals List
 *
 * After migration, Proposals List is a native text[] array.
 * Supabase client returns text[] as JavaScript array directly.
 * @pure
 * @param {Object} user - User object with Proposals List
 * @returns {Array<string>} Array of proposal IDs
 */
export function extractProposalIds(user) {
  const proposalsList = user['Proposals List']

  if (!isNonEmptyArray(proposalsList)) {
    logWarning('User has no Proposals List or invalid format')
    return []
  }

  logInfo(`Extracted ${proposalsList.length} proposal IDs from user's Proposals List`)
  return proposalsList
}

/**
 * STEP 3: Fetch proposals by their IDs from user's Proposals List
 * Note: Some proposal IDs may be orphaned (don't exist in proposal table)
 * @effectful
 * @param {Array<string>} proposalIds - Array of proposal IDs from user's list
 * @returns {Promise<Array<Object>>} Array of proposal objects with nested data
 */
export async function fetchProposalsByIds(proposalIds) {
  if (!isNonEmptyArray(proposalIds)) {
    logWarning('No proposal IDs to fetch')
    return []
  }

  // Step 1: Fetch all proposals by IDs
  const { data: proposals, error: proposalError } = await supabase
    .from('proposal')
    .select(`
      _id,
      "Status",
      "Deleted",
      "Guest",
      "Listing",
      "Days Selected",
      "Nights Selected (Nights list)",
      "Reservation Span (Weeks)",
      "nights per week (num)",
      "check in day",
      "check out day",
      "Move in range start",
      "Move in range end",
      "Total Price for Reservation (guest)",
      "proposal nightly price",
      "cleaning fee",
      "damage deposit",
      "counter offer happened",
      "hc days selected",
      "hc reservation span (weeks)",
      "hc total price",
      "hc nightly price",
      "Created Date",
      "Modified Date",
      "about_yourself",
      "special_needs",
      "reason for cancellation",
      "rental application",
      "virtual meeting",
      "Is Finalized",
      "House Rules",
      "remindersByGuest (number)",
      "guest documents review finalized?"
    `)
    .in('_id', proposalIds)
    .order('Created Date', { ascending: false })

  if (proposalError) {
    logError('Error fetching proposals', proposalError)
    throw new Error(`Failed to fetch proposals: ${proposalError.message}`)
  }

  // Filter out deleted proposals and proposals cancelled by guest
  const validProposals = (proposals || []).filter(isValidProposal)

  if (validProposals.length === 0) {
    logInfo('No valid proposals found')
    return []
  }

  // Log if some proposals were orphaned
  if (validProposals.length < proposalIds.length) {
    logWarning(`Found ${validProposals.length} proposals out of ${proposalIds.length} IDs (${proposalIds.length - validProposals.length} orphaned/filtered)`)
  } else {
    logInfo(`Fetched ${validProposals.length} proposals from user's list`)
  }

  // Step 2: Extract unique listing IDs from proposals
  const listingIds = extractUniqueIds(validProposals, 'Listing')

  if (listingIds.length === 0) {
    logWarning('No listings found for proposals')
    return validProposals.map(p => ({ ...p, listing: null }))
  }

  logInfo(`Fetching ${listingIds.length} unique listings`)

  // Step 3: Fetch all listings
  const { data: listings, error: listingError } = await supabase
    .from('listing')
    .select(`
      _id,
      "Name",
      "Description",
      "Location - Address",
      "Location - slightly different address",
      "Location - Borough",
      "Location - Hood",
      "Features - Photos",
      "Features - House Rules",
      "NEW Date Check-in Time",
      "NEW Date Check-out Time",
      "Host User",
      "House manual"
    `)
    .in('_id', listingIds)

  if (listingError) {
    logError('Error fetching listings', listingError)
    return validProposals.map(p => ({ ...p, listing: null }))
  }

  // Step 3.25: Extract featured photos from embedded format or fetch from listing_photo
  logInfo(`Extracting featured photos for ${listingIds.length} listings`)

  // First, try to extract photos from embedded Features - Photos field (new format)
  const embeddedPhotoMap = new Map()
  const listingsNeedingPhotoFetch = []

  ;(listings || []).forEach(listing => {
    const photos = extractPhotosFromField(listing['Features - Photos'])
    const featuredUrl = extractFeaturedPhotoUrl(photos)

    if (featuredUrl) {
      embeddedPhotoMap.set(listing._id, featuredUrl)
    } else if (photos.length === 0 || !isEmbeddedPhoto(photos[0])) {
      // Legacy format - need to fetch from listing_photo table
      listingsNeedingPhotoFetch.push(listing._id)
    }
  })

  logInfo(`Found ${embeddedPhotoMap.size} embedded photos, ${listingsNeedingPhotoFetch.length} need fetch`)

  // Only fetch from listing_photo table for listings without embedded photos
  let featuredPhotos = []
  if (listingsNeedingPhotoFetch.length > 0) {
    const { data: fetchedPhotos, error: photoError } = await supabase
      .from('listing_photo')
      .select(`
        _id,
        "Listing",
        "Photo"
      `)
      .in('"Listing"', listingsNeedingPhotoFetch)
      .eq('"toggleMainPhoto"', true)
      .eq('"Active"', true)

    if (photoError) {
      logError('Error fetching featured photos', photoError)
    } else {
      featuredPhotos = fetchedPhotos || []
      logInfo(`Fetched ${featuredPhotos.length} photos from listing_photo table`)
    }
  }

  // Step 3.5: Fetch borough, neighborhood, and house rules names from lookup tables
  const boroughIds = extractUniqueIds(listings || [], 'Location - Borough')
  const hoodIds = extractUniqueIds(listings || [], 'Location - Hood')

  // Collect all house rule IDs from all proposals
  const allHouseRuleIds = [...new Set(
    validProposals
      .flatMap(p => parseJsonArray(p['House Rules']))
      .filter(Boolean)
  )]

  logInfo(`Fetching ${boroughIds.length} boroughs, ${hoodIds.length} neighborhoods, ${allHouseRuleIds.length} house rules`)

  let boroughs = []
  let hoods = []

  if (boroughIds.length > 0) {
    const { data: boroughsData, error: boroughError } = await supabase
      .schema('reference_table')
      .from('zat_geo_borough_toplevel')
      .select('_id, "Display Borough"')
      .in('_id', boroughIds)

    if (!boroughError) {
      boroughs = boroughsData || []
      logInfo(`Fetched ${boroughs.length} boroughs`)
    }
  }

  if (hoodIds.length > 0) {
    const { data: hoodsData, error: hoodError } = await supabase
      .schema('reference_table')
      .from('zat_geo_hood_mediumlevel')
      .select('_id, "Display"')
      .in('_id', hoodIds)

    if (!hoodError) {
      hoods = hoodsData || []
      logInfo(`Fetched ${hoods.length} neighborhoods`)
    }
  }

  // Step 3.6: Fetch house rules names from lookup table
  let houseRules = []
  if (allHouseRuleIds.length > 0) {
    const { data: houseRulesData, error: houseRulesError } = await supabase
      .schema('reference_table')
      .from('zat_features_houserule')
      .select('_id, "Name"')
      .in('_id', allHouseRuleIds)

    if (!houseRulesError) {
      houseRules = houseRulesData || []
      logInfo(`Fetched ${houseRules.length} house rules`)
    } else {
      logError('Error fetching house rules', houseRulesError)
    }
  }

  // Step 4: Extract unique host user IDs from listings
  const hostUserIds = extractUniqueIds(listings || [], 'Host User')

  logInfo(`Fetching ${hostUserIds.length} unique hosts`)

  let hosts = []
  if (hostUserIds.length > 0) {
    const { data: hostsData, error: hostError } = await supabase
      .from('user')
      .select(`
        _id,
        "Name - First",
        "Name - Last",
        "Name - Full",
        "Profile Photo",
        "About Me / Bio",
        "Verify - Linked In ID",
        "Verify - Phone",
        "user verified?"
      `)
      .in('_id', hostUserIds)

    if (hostError) {
      logError('Error fetching hosts', hostError)
    } else {
      hosts = hostsData || []
      logInfo(`Fetched ${hosts.length} hosts`)
    }
  }

  // Step 5.5: Extract unique guest IDs from proposals and fetch guest user data
  const guestIds = extractUniqueIds(validProposals, 'Guest')

  logInfo(`Fetching ${guestIds.length} unique guests`)

  let guests = []
  if (guestIds.length > 0) {
    const { data: guestsData, error: guestError } = await supabase
      .from('user')
      .select(`
        _id,
        "Name - First",
        "Name - Last",
        "Name - Full",
        "Profile Photo",
        "About Me / Bio",
        "Verify - Linked In ID",
        "Verify - Phone",
        "user verified?",
        "ID documents submitted?"
      `)
      .in('_id', guestIds)

    if (guestError) {
      logError('Error fetching guests', guestError)
    } else {
      guests = guestsData || []
      logInfo(`Fetched ${guests.length} guests`)
    }
  }

  // Step 6: Fetch virtual meetings for all proposals
  logInfo(`Fetching virtual meetings for ${validProposals.length} proposals`)

  const proposalIdsForVM = extractUniqueIds(validProposals, '_id')
  let virtualMeetings = []

  if (proposalIdsForVM.length > 0) {
    const { data: vmData, error: vmError } = await supabase
      .from('virtualmeetingschedulesandlinks')
      .select(`
        _id,
        "booked date",
        "confirmedBySplitLease",
        "meeting link",
        "meeting declined",
        "requested by",
        "suggested dates and times",
        "guest name",
        "host name",
        "proposal"
      `)
      .in('proposal', proposalIdsForVM)

    if (vmError) {
      logError('Error fetching virtual meetings', vmError)
    } else {
      virtualMeetings = vmData || []
      logInfo(`Fetched ${virtualMeetings.length} virtual meetings`)
    }
  }

  // Step 7: Create lookup maps for efficient joining
  const vmMap = buildLookupMap(virtualMeetings, vm => vm.proposal)
  const listingMap = buildLookupMap(listings || [], l => l._id)
  const hostMap = buildLookupMap(hosts, h => h._id)
  const guestMap = buildLookupMap(guests, g => g._id)
  const boroughMap = buildLookupMap(boroughs, b => b._id, b => b['Display Borough'])
  const hoodMap = buildLookupMap(hoods, h => h._id, h => h['Display'])
  const houseRulesMap = buildLookupMap(houseRules, r => r._id, r => r.Name)

  // Merge embedded + fetched photos
  const featuredPhotoMap = new Map([
    ...embeddedPhotoMap.entries(),
    ...(featuredPhotos || []).map(p => [p.Listing, p.Photo])
  ])

  // Step 8: Manually join the data
  const enrichedProposals = validProposals.map((proposal) => {
    const listing = listingMap.get(proposal.Listing)
    const host = listing ? hostMap.get(listing['Host User']) : null
    const guest = guestMap.get(proposal.Guest)
    const boroughName = listing ? boroughMap.get(listing['Location - Borough']) : null
    const hoodName = listing ? hoodMap.get(listing['Location - Hood']) : null
    const featuredPhotoUrl = listing ? featuredPhotoMap.get(listing._id) : null
    const virtualMeeting = vmMap.get(proposal._id) || null

    // Resolve house rules IDs to names
    const proposalHouseRuleIds = parseJsonArray(proposal['House Rules'])
    const houseRulesResolved = proposalHouseRuleIds
      .map(id => houseRulesMap.get(id))
      .filter(Boolean)

    return {
      ...proposal,
      listing: listing ? {
        ...listing,
        host,
        boroughName,
        hoodName,
        featuredPhotoUrl,
        hasHouseManual: Boolean(listing['House manual'])
      } : null,
      guest: guest || null,
      virtualMeeting,
      houseRules: houseRulesResolved
    }
  })

  logInfo(`Successfully enriched ${enrichedProposals.length} proposals with listing and host data`)
  return enrichedProposals
}

/**
 * COMPLETE FLOW: Get user's proposals from authenticated session
 * This is the main function to call from components
 *
 * User ID comes from secure storage (session), NOT from URL.
 * This ensures users can only view their own proposals.
 * @effectful
 * @returns {Promise<{user: Object, proposals: Array, selectedProposal: Object|null}>}
 */
export async function fetchUserProposalsFromUrl() {
  // Step 1: Get user ID from authenticated session (NOT URL)
  const userId = getUserIdFromSession()
  if (isNullish(userId)) {
    throw new Error('NOT_AUTHENTICATED')
  }

  // Step 2: Fetch user data with Proposals List
  const user = await fetchUserWithProposalList(userId)

  // Step 3: Extract proposal IDs from user's Proposals List
  const proposalIds = extractProposalIds(user)

  // Handle case where user has no proposals
  if (!isNonEmptyArray(proposalIds)) {
    logInfo('User has no proposal IDs in their Proposals List')
    return buildEmptyResult(user)
  }

  // Step 4: Fetch proposals by those specific IDs
  const proposals = await fetchProposalsByIds(proposalIds)

  if (!isNonEmptyArray(proposals)) {
    logInfo('No valid proposals found (all IDs may be orphaned)')
    return buildEmptyResult(user)
  }

  // Step 5: Check for preselected proposal
  const preselectedId = getProposalIdFromQuery()
  let selectedProposal = null

  if (preselectedId) {
    selectedProposal = proposals.find(p => p._id === preselectedId)
    if (!selectedProposal) {
      logWarning(`Preselected proposal ${preselectedId} not found, defaulting to first`)
      selectedProposal = proposals[0] || null
    } else {
      logInfo('Using preselected proposal', preselectedId)
    }
  } else {
    selectedProposal = proposals[0] || null
    logInfo('Defaulting to first proposal')
  }

  return Object.freeze({
    user,
    proposals,
    selectedProposal
  })
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  LOG_PREFIX,
  CANCELLED_BY_GUEST_STATUS,

  // Predicates
  isNullish,
  isNonEmptyArray,
  isValidProposal,
  isEmbeddedPhoto,

  // Pure helpers
  extractUniqueIds,
  parseJsonArray,
  extractPhotosFromField,
  normalizePhotoUrl,
  extractFeaturedPhotoUrl,
  buildLookupMap,
  buildEmptyResult
})
