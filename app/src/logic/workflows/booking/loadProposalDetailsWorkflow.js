/**
 * Workflow: Load complete proposal details with all enrichments.
 *
 * @intent Orchestrate loading and processing of proposal data from Supabase.
 * @rule Separates infrastructure (fetching) from domain logic (processing).
 * @rule Fetches raw data, then transforms via processors.
 * @rule Returns processed, validated proposal object ready for UI consumption.
 *
 * This workflow replaces the mixed fetcher/transformer pattern from proposalDataFetcher.js
 * by explicitly separating:
 * - Data fetching (infrastructure - still uses Supabase client)
 * - Data processing (domain logic - uses Logic Core processors)
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const ERROR_MESSAGES = Object.freeze({
  MISSING_PROPOSAL: 'loadProposalDetailsWorkflow: rawProposal is required',
  MISSING_SUPABASE: 'loadProposalDetailsWorkflow: supabase client is required',
  PROCESSING_FAILED: 'Failed to process proposal data'
})

const DB_FIELD_NAMES = Object.freeze({
  ID: '_id',
  LISTING: 'Listing',
  GUEST: 'Guest',
  CREATED_BY: 'Created By',
  HOUSE_RULES: 'House Rules',
  VIRTUAL_MEETING: 'virtual meeting'
})

const USER_SELECT_FIELDS = Object.freeze(`
  _id,
  "Name - First",
  "Name - Full",
  "Profile Photo",
  "About Me / Bio",
  "email as text",
  "Phone Number (as text)",
  "Verify - Linked In ID",
  "Verify - Phone",
  "is email confirmed",
  "user verified?"
`)

const TABLE_NAMES = Object.freeze({
  PROPOSAL: 'proposal',
  LISTING: 'listing',
  USER: 'user',
  HOUSE_RULES: 'zat_features_houserule',
  VIRTUAL_MEETING: 'virtualmeetingschedulesandlinks'
})

const SCHEMA_NAMES = Object.freeze({
  REFERENCE: 'reference_table'
})

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is truthy
 * @pure
 */
const isTruthy = (value) => Boolean(value)

/**
 * Check if value is a function
 * @pure
 */
const isFunction = (value) => typeof value === 'function'

/**
 * Check if array is non-empty
 * @pure
 */
const hasElements = (arr) => Array.isArray(arr) && arr.length > 0

// ─────────────────────────────────────────────────────────────
// Safe Processing Helpers (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Safely process data with processor function
 * @pure (given pure processor)
 */
const safeProcess = (processor, data, params) => {
  if (!isFunction(processor) || !data) {
    return data
  }
  try {
    return processor(params)
  } catch (err) {
    console.warn(`Warning: Processing failed: ${err.message}`)
    return data
  }
}

/**
 * Build basic proposal structure without processor
 * @pure
 */
const buildBasicProposalStructure = (rawProposal, listing, guest, host) =>
  Object.freeze({
    ...rawProposal,
    _listing: listing,
    _guest: guest,
    _host: host
  })

/**
 * Attach enrichments to proposal
 * @pure
 */
const attachEnrichments = (proposal, houseRules, virtualMeeting) => {
  const enriched = { ...proposal }
  if (houseRules) {
    enriched._houseRules = houseRules
  }
  if (virtualMeeting) {
    enriched._virtualMeeting = virtualMeeting
  }
  return enriched
}

// ─────────────────────────────────────────────────────────────
// Main Workflow
// ─────────────────────────────────────────────────────────────

/**
 * Load complete proposal details with all enrichments
 *
 * @param {object} params - Named parameters.
 * @param {object} params.supabase - Supabase client instance.
 * @param {object} params.rawProposal - Base proposal object (minimal data).
 * @param {function} [params.processListingData] - Listing processor function.
 * @param {function} [params.processUserData] - User processor function.
 * @param {function} [params.processProposalData] - Proposal processor function.
 * @returns {Promise<object>} Fully enriched and processed proposal object.
 *
 * @throws {Error} If rawProposal is missing.
 * @throws {Error} If supabase is missing.
 * @throws {Error} If critical data cannot be loaded.
 *
 * @example
 * const enrichedProposal = await loadProposalDetailsWorkflow({
 *   supabase,
 *   rawProposal: { _id: 'abc123', Listing: 'xyz', Guest: '456' },
 *   processProposalData,
 *   processUserData,
 *   processListingData
 * })
 */
export async function loadProposalDetailsWorkflow({
  supabase,
  rawProposal,
  processListingData,
  processUserData,
  processProposalData
}) {
  // Validation
  if (!isTruthy(rawProposal)) {
    throw new Error(ERROR_MESSAGES.MISSING_PROPOSAL)
  }

  if (!isTruthy(supabase)) {
    throw new Error(ERROR_MESSAGES.MISSING_SUPABASE)
  }

  // Step 1: Fetch listing data (effectful)
  let processedListing = null
  if (rawProposal[DB_FIELD_NAMES.LISTING]) {
    const { data: listingData, error: listingError } = await supabase
      .from(TABLE_NAMES.LISTING)
      .select('*')
      .eq(DB_FIELD_NAMES.ID, rawProposal[DB_FIELD_NAMES.LISTING])
      .single()

    if (!listingError && listingData) {
      processedListing = safeProcess(
        processListingData,
        listingData,
        { rawListing: listingData }
      )
    }
  }

  // Step 2: Fetch guest user data (effectful)
  let processedGuest = null
  if (rawProposal[DB_FIELD_NAMES.GUEST]) {
    const { data: guestData, error: guestError } = await supabase
      .from(TABLE_NAMES.USER)
      .select(USER_SELECT_FIELDS)
      .eq(DB_FIELD_NAMES.ID, rawProposal[DB_FIELD_NAMES.GUEST])
      .single()

    if (!guestError && guestData) {
      processedGuest = safeProcess(
        processUserData,
        guestData,
        { rawUser: guestData }
      )
    }
  }

  // Step 3: Fetch host user data (effectful)
  let processedHost = null
  if (processedListing && processedListing[DB_FIELD_NAMES.CREATED_BY]) {
    const { data: hostData, error: hostError } = await supabase
      .from(TABLE_NAMES.USER)
      .select(USER_SELECT_FIELDS)
      .eq(DB_FIELD_NAMES.ID, processedListing[DB_FIELD_NAMES.CREATED_BY])
      .single()

    if (!hostError && hostData) {
      processedHost = safeProcess(
        processUserData,
        hostData,
        { rawUser: hostData }
      )
    }
  }

  // Step 4: Fetch house rules (effectful)
  let houseRules = null
  const houseRuleIds = rawProposal[DB_FIELD_NAMES.HOUSE_RULES]
  if (hasElements(houseRuleIds)) {
    const { data: rulesData, error: rulesError } = await supabase
      .schema(SCHEMA_NAMES.REFERENCE)
      .from(TABLE_NAMES.HOUSE_RULES)
      .select(`${DB_FIELD_NAMES.ID}, Name, Icon`)
      .in(DB_FIELD_NAMES.ID, houseRuleIds)

    if (!rulesError && rulesData) {
      houseRules = rulesData
    }
  }

  // Step 5: Fetch virtual meeting data (effectful)
  let virtualMeeting = null
  if (rawProposal[DB_FIELD_NAMES.VIRTUAL_MEETING]) {
    const { data: vmData, error: vmError } = await supabase
      .from(TABLE_NAMES.VIRTUAL_MEETING)
      .select('*')
      .eq(DB_FIELD_NAMES.ID, rawProposal[DB_FIELD_NAMES.VIRTUAL_MEETING])
      .single()

    if (!vmError && vmData) {
      virtualMeeting = vmData
    }
  }

  // Step 6: Process proposal with all enriched data (pure)
  let processedProposal
  if (isFunction(processProposalData)) {
    try {
      processedProposal = processProposalData({
        rawProposal,
        listing: processedListing,
        guest: processedGuest,
        host: processedHost
      })
    } catch (err) {
      throw new Error(`${ERROR_MESSAGES.PROCESSING_FAILED}: ${err.message}`)
    }
  } else {
    processedProposal = buildBasicProposalStructure(
      rawProposal,
      processedListing,
      processedGuest,
      processedHost
    )
  }

  // Step 7: Attach enrichments (pure)
  return attachEnrichments(processedProposal, houseRules, virtualMeeting)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  ERROR_MESSAGES,
  DB_FIELD_NAMES,
  TABLE_NAMES,
  SCHEMA_NAMES,
  USER_SELECT_FIELDS
}
