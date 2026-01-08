/**
 * Listing Full Submission Handler
 * Split Lease - listing/handlers
 *
 * STANDARDIZED FLOW (Supabase-first with queue-based Bubble sync):
 * 1. Validate listing exists in Supabase
 * 2. Update listing in Supabase with all form data
 * 3. Attach user to listing (via user_email or user_id)
 * 4. Queue UPDATE to Bubble (Data API) for async processing
 * 5. Return updated listing data
 *
 * This flow matches the proposal and auth-user patterns for uniformity.
 *
 * NO FALLBACK PRINCIPLE: Supabase update must succeed, Bubble sync is queued
 *
 * @module listing/handlers/submit
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { enqueueBubbleSync, triggerQueueProcessing } from '../../_shared/queueSync.ts';
import { parseJsonArray } from '../../_shared/jsonUtils.ts';
import { handleCreateMockupProposal } from './createMockupProposal.ts';
import { getGeoByZipCode } from '../../_shared/geoLookup.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[listing:submit]'
const LISTING_TABLE = 'listing'
const USER_TABLE = 'user'
const DEFAULT_STATUS = 'Pending Review'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/**
 * Listing submission data structure from frontend
 */
interface ListingSubmissionData {
  // Basic Info
  'Name'?: string;
  'Type of Space'?: string;
  'Bedrooms'?: number;
  'Beds'?: number;
  'Bathrooms'?: number;
  'Type of Kitchen'?: string;
  'Type of Parking'?: string;

  // Address
  'Address'?: string;
  'Street Number'?: string;
  'Street'?: string;
  'City'?: string;
  'State'?: string;
  'Zip'?: string;
  'Neighborhood'?: string;
  'Latitude'?: number;
  'Longitude'?: number;

  // Amenities
  'Amenities Inside Unit'?: string[];
  'Amenities Outside Unit'?: string[];

  // Descriptions
  'Description of Lodging'?: string;
  'Neighborhood Description'?: string;

  // Lease Style
  'Rental Type'?: string;
  'Available Nights'?: string[];
  'Weekly Pattern'?: string;

  // Pricing
  'Damage Deposit'?: number;
  'Maintenance Fee'?: number;
  'Monthly Compensation'?: number;
  'Weekly Compensation'?: number;
  'Price 1 night selected'?: number;
  'Price 2 nights selected'?: number;
  'Price 3 nights selected'?: number;
  'Price 4 nights selected'?: number;
  'Price 5 nights selected'?: number;
  'Price 6 nights selected'?: number;
  'Nightly Decay Rate'?: number;

  // Rules
  'Cancellation Policy'?: string;
  'Preferred Gender'?: string;
  'Number of Guests'?: number;
  'Check-In Time'?: string;
  'Check-Out Time'?: string;
  'Ideal Min Duration'?: number;
  'Ideal Max Duration'?: number;
  'House Rules'?: string[];
  'Blocked Dates'?: string[];

  // Safety & Review
  'Safety Features'?: string[];
  'Square Footage'?: number;
  'First Day Available'?: string;
  'Previous Reviews Link'?: string;
  'Optional Notes'?: string;

  // Status
  'Status'?: string;
  'Is Draft'?: boolean;

  // Additional fields
  [key: string]: unknown;
}

interface SubmitListingPayload {
  readonly listing_id: string;
  readonly user_email: string;
  readonly user_unique_id?: string;
  readonly listing_data: ListingSubmissionData;
}

export interface SubmitListingResult {
  readonly _id: string;
  readonly listing_id: string;
  readonly status: string;
  readonly name: string;
  readonly message: string;
  readonly [key: string]: unknown;
}

interface EnvConfig {
  readonly supabaseUrl: string;
  readonly supabaseServiceKey: string;
}

interface ListingRecord {
  readonly _id: string;
  readonly Name?: string;
  readonly Status?: string;
}

interface UserRecord {
  readonly _id: string;
}

interface GeoLookupResult {
  readonly boroughId: string | null;
  readonly hoodId: string | null;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if env variables are present
 * @pure
 */
const hasEnvVars = (
  supabaseUrl: string | undefined,
  supabaseServiceKey: string | undefined
): supabaseUrl is string =>
  Boolean(supabaseUrl && supabaseServiceKey)

/**
 * Check if listing record exists
 * @pure
 */
const hasListingRecord = (listing: ListingRecord | null | undefined): listing is ListingRecord =>
  listing !== null && listing !== undefined

/**
 * Check if user data exists
 * @pure
 */
const hasUserData = (userData: UserRecord | null | undefined): userData is UserRecord =>
  userData !== null && userData !== undefined && Boolean(userData._id)

/**
 * Check if this is the first listing for a user
 * @pure
 */
const isFirstListing = (listings: readonly string[]): boolean =>
  listings.length === 1

// ─────────────────────────────────────────────────────────────
// Config Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Get environment configuration
 * @effectful (reads environment variables)
 */
const getEnvConfig = (): EnvConfig => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!hasEnvVars(supabaseUrl, supabaseServiceKey)) {
    throw new Error('Missing required environment variables')
  }

  return Object.freeze({
    supabaseUrl,
    supabaseServiceKey: supabaseServiceKey!,
  })
}

/**
 * Create Supabase admin client
 * @pure (factory function)
 */
const createSupabaseClient = (config: EnvConfig): SupabaseClient =>
  createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

// ─────────────────────────────────────────────────────────────
// Field Mapping Constants
// ─────────────────────────────────────────────────────────────

/**
 * Direct field mappings (same name in frontend and Supabase)
 */
const DIRECT_FIELDS: readonly string[] = Object.freeze([
  'Name', 'Status', 'Active', 'Description of Lodging',
  'Bedrooms', 'Beds', 'Bathrooms', 'Address', 'City', 'State', 'Zip',
])

/**
 * Special field mappings (different column names)
 */
const FIELD_MAPPINGS: Readonly<Record<string, string>> = Object.freeze({
  'Type of Space': 'Features - Type of Space',
  'Type of Kitchen': 'Features - Kitchen',
  'Type of Parking': 'Features - Parking',
  'Neighborhood': 'Location - Hood',
  'Amenities Inside Unit': 'Features - Amenities In-Unit',
  'Amenities Outside Unit': 'Features - Amenities Building',
  'House Rules': 'Features - House Rules',
  'Safety Features': 'Features - Safety',
  'Rental Type': 'rental type',
  'Weekly Pattern': 'Weeks offered',
  'Damage Deposit': '💰Damage Deposit',
  'Maintenance Fee': '💰Cleaning Cost / Maintenance Fee',
  'Monthly Compensation': '💰Monthly Host Rate',
  'Weekly Compensation': '💰Weekly Host Rate',
  'Cancellation Policy': 'Cancellation Policy',
  'Preferred Gender': 'Guest - Preferred Gender',
  'Number of Guests': 'Guest - Number Allowed',
  'Check-In Time': 'Check-in Time',
  'Check-Out Time': 'Check-out Time',
  'Ideal Min Duration': 'Minimum Nights',
  'Ideal Max Duration': 'Maximum Nights',
  'First Day Available': ' First Available',
  'Square Footage': 'Square Footage',
  'Blocked Dates': 'Dates - Blocked',
})

/**
 * Nightly price field mappings
 */
const NIGHTLY_PRICE_MAPPINGS: Readonly<Record<string, string>> = Object.freeze({
  'Price 1 night selected': '💰Nightly Host Rate for 1 night',
  'Price 2 nights selected': '💰Nightly Host Rate for 2 nights',
  'Price 3 nights selected': '💰Nightly Host Rate for 3 nights',
  'Price 4 nights selected': '💰Nightly Host Rate for 4 nights',
  'Price 5 nights selected': '💰Nightly Host Rate for 5 nights',
  'Price 6 nights selected': '💰Nightly Host Rate for 6 nights',
})

// ─────────────────────────────────────────────────────────────
// Transformers
// ─────────────────────────────────────────────────────────────

/**
 * Map direct fields from source to target
 * @pure
 */
const mapDirectFields = (
  data: ListingSubmissionData,
  fields: readonly string[]
): Record<string, unknown> =>
  fields.reduce((acc, field) => {
    if (data[field] !== undefined) {
      acc[field] = data[field]
    }
    return acc
  }, {} as Record<string, unknown>)

/**
 * Map special fields using mapping object
 * @pure
 */
const mapSpecialFields = (
  data: ListingSubmissionData,
  mappings: Readonly<Record<string, string>>
): Record<string, unknown> =>
  Object.entries(mappings).reduce((acc, [sourceField, targetField]) => {
    if (data[sourceField] !== undefined) {
      acc[targetField] = data[sourceField]
    }
    return acc
  }, {} as Record<string, unknown>)

/**
 * Map available nights to both night and day columns
 * @pure
 */
const mapAvailableNights = (data: ListingSubmissionData): Record<string, unknown> => {
  if (data['Available Nights'] === undefined) return {}
  return {
    'Nights Available (List of Nights) ': data['Available Nights'],
    'Days Available (List of Days)': data['Available Nights'],
  }
}

/**
 * Map location address with coordinates
 * @pure
 */
const mapLocationAddress = (data: ListingSubmissionData): Record<string, unknown> => {
  if (data['Latitude'] === undefined || data['Longitude'] === undefined) return {}
  return {
    'Location - Address': {
      lat: data['Latitude'],
      lng: data['Longitude'],
      address: data['Address'] || '',
    }
  }
}

/**
 * Map frontend field names to Supabase column names
 * @pure
 */
const mapFieldsToSupabase = (data: ListingSubmissionData): Record<string, unknown> => ({
  ...mapDirectFields(data, DIRECT_FIELDS),
  ...mapSpecialFields(data, FIELD_MAPPINGS),
  ...mapSpecialFields(data, NIGHTLY_PRICE_MAPPINGS),
  ...mapAvailableNights(data),
  ...mapLocationAddress(data),
})

// ─────────────────────────────────────────────────────────────
// Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build update data with geo and user fields
 * @pure
 */
const buildUpdateData = (
  mappedData: Record<string, unknown>,
  timestamp: string,
  status: string,
  geoResult: GeoLookupResult,
  userId: string | null
): Record<string, unknown> => {
  const updateData: Record<string, unknown> = {
    ...mappedData,
    'Modified Date': timestamp,
    Status: status,
  }

  if (geoResult.boroughId) {
    updateData['Location - Borough'] = geoResult.boroughId
  }
  if (geoResult.hoodId) {
    updateData['Location - Hood'] = geoResult.hoodId
  }
  if (userId) {
    updateData['Host User'] = userId
    updateData['Created By'] = userId
  }

  return updateData
}

/**
 * Build sync queue item for listing update
 * @pure
 */
const buildSyncQueueItem = (
  listingId: string,
  updateData: Record<string, unknown>
): { correlationId: string; items: readonly { sequence: number; table: string; recordId: string; operation: string; bubbleId: string; payload: Record<string, unknown> }[] } =>
  Object.freeze({
    correlationId: `listing_submit:${listingId}:${Date.now()}`,
    items: Object.freeze([{
      sequence: 1,
      table: LISTING_TABLE,
      recordId: listingId,
      operation: 'UPDATE',
      bubbleId: listingId,
      payload: { ...updateData, _id: listingId },
    }])
  })

/**
 * Build success result
 * @pure
 */
const buildSuccessResult = (
  listingId: string,
  status: string,
  name: string,
  updateData: Record<string, unknown>
): SubmitListingResult =>
  Object.freeze({
    _id: listingId,
    listing_id: listingId,
    status,
    name,
    message: 'Listing submitted successfully',
    ...updateData
  }) as SubmitListingResult

// ─────────────────────────────────────────────────────────────
// Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Verify listing exists in Supabase
 * @effectful (database query)
 */
async function verifyListingExists(
  supabase: SupabaseClient,
  listingId: string
): Promise<ListingRecord> {
  console.log(`${LOG_PREFIX} Step 1/5: Verifying listing exists...`)

  const { data: listing, error } = await supabase
    .from(LISTING_TABLE)
    .select('_id, Name, Status')
    .eq('_id', listingId)
    .single()

  if (error || !hasListingRecord(listing)) {
    console.error(`${LOG_PREFIX} Listing not found:`, listingId)
    throw new Error(`Listing not found: ${listingId}`)
  }

  console.log(`${LOG_PREFIX} ✅ Step 1 complete - Listing exists:`, listing.Name)
  return listing as ListingRecord
}

/**
 * Look up user by email
 * @effectful (database query)
 */
async function lookupUserByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<string | null> {
  console.log(`${LOG_PREFIX} Step 2/5: Looking up user...`)

  const { data: userData } = await supabase
    .from(USER_TABLE)
    .select('_id')
    .eq('email', email.toLowerCase())
    .single()

  if (hasUserData(userData)) {
    console.log(`${LOG_PREFIX} ✅ Step 2 complete - User found:`, userData._id)
    return userData._id
  }

  console.log(`${LOG_PREFIX} ⚠️ Step 2 warning - User not found for email:`, email)
  return null
}

/**
 * Look up borough and hood from zip code
 * @effectful (database query)
 */
async function lookupGeoByZip(
  supabase: SupabaseClient,
  zipCode: string | undefined
): Promise<GeoLookupResult> {
  console.log(`${LOG_PREFIX} Step 2b/5: Looking up borough/hood from zip code...`)

  if (!zipCode) {
    console.log(`${LOG_PREFIX} ⚠️ No zip code provided, skipping geo lookup`)
    return { boroughId: null, hoodId: null }
  }

  const geoResult = await getGeoByZipCode(supabase, zipCode)
  const result: GeoLookupResult = {
    boroughId: geoResult.borough?._id ?? null,
    hoodId: geoResult.hood?._id ?? null,
  }

  if (result.boroughId) {
    console.log(`${LOG_PREFIX} ✅ Borough found:`, geoResult.borough?.displayName)
  }
  if (result.hoodId) {
    console.log(`${LOG_PREFIX} ✅ Hood found:`, geoResult.hood?.displayName)
  }

  return result
}

/**
 * Update listing in Supabase
 * @effectful (database mutation)
 */
async function updateListing(
  supabase: SupabaseClient,
  listingId: string,
  updateData: Record<string, unknown>
): Promise<void> {
  console.log(`${LOG_PREFIX} Step 3/5: Updating listing in Supabase...`)

  const { error } = await supabase
    .from(LISTING_TABLE)
    .update(updateData)
    .eq('_id', listingId)

  if (error) {
    console.error(`${LOG_PREFIX} Update failed:`, error)
    throw new Error(`Failed to update listing: ${error.message}`)
  }

  console.log(`${LOG_PREFIX} ✅ Step 3 complete - Listing updated in Supabase`)
}

/**
 * Queue Bubble sync (fire-and-forget)
 * @effectful (database mutation, HTTP request)
 */
async function queueBubbleSync(
  supabase: SupabaseClient,
  listingId: string,
  updateData: Record<string, unknown>
): Promise<void> {
  console.log(`${LOG_PREFIX} Step 4/5: Queueing Bubble sync...`)

  try {
    const syncItem = buildSyncQueueItem(listingId, updateData)
    await enqueueBubbleSync(supabase, syncItem)

    console.log(`${LOG_PREFIX} ✅ Step 4 complete - Bubble sync queued`)
    triggerQueueProcessing()
  } catch (syncError) {
    console.error(`${LOG_PREFIX} ⚠️ Step 4 warning - Queue error (non-blocking):`, syncError)
  }
}

/**
 * Check if first listing and create mockup proposal
 * @effectful (database queries, mutations)
 */
async function handleFirstListingMockup(
  supabase: SupabaseClient,
  userId: string | null,
  listingId: string,
  userEmail: string
): Promise<void> {
  if (!userId) {
    console.log(`${LOG_PREFIX} ⏭️ Step 5 skipped - User not found`)
    return
  }

  try {
    console.log(`${LOG_PREFIX} Step 5/5: Checking for first listing...`)

    const { data: hostUserData } = await supabase
      .from(USER_TABLE)
      .select('"Listings"')
      .eq('_id', userId)
      .single()

    const listings = parseJsonArray<string>(hostUserData?.Listings, 'user.Listings')

    if (isFirstListing(listings)) {
      console.log(`${LOG_PREFIX} First listing detected, creating mockup proposal`)

      await handleCreateMockupProposal(supabase, {
        listingId,
        hostUserId: userId,
        hostEmail: userEmail,
      })

      console.log(`${LOG_PREFIX} ✅ Step 5 complete - Mockup proposal created`)
    } else {
      console.log(`${LOG_PREFIX} ⏭️ Step 5 skipped - Not first listing (count: ${listings.length})`)
    }
  } catch (mockupError) {
    console.warn(`${LOG_PREFIX} ⚠️ Mockup proposal creation failed (non-blocking):`, mockupError)
  }
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle full listing submission with Supabase-first pattern
 * Called after user signup/login with complete form data
 *
 * @effectful (database mutations, HTTP requests, console logging)
 */
export async function handleSubmit(
  payload: Record<string, unknown>
): Promise<SubmitListingResult> {
  console.log(`${LOG_PREFIX} ========== SUBMIT LISTING (SUPABASE-FIRST) ==========`)
  console.log(`${LOG_PREFIX} Payload keys:`, Object.keys(payload))

  // Validate required fields
  validateRequiredFields(payload, ['listing_id', 'user_email', 'listing_data'])

  const { listing_id, user_email, user_unique_id, listing_data } = payload as SubmitListingPayload
  const config = getEnvConfig()
  const supabase = createSupabaseClient(config)

  console.log(`${LOG_PREFIX} Listing ID:`, listing_id)
  console.log(`${LOG_PREFIX} User Email:`, user_email)
  console.log(`${LOG_PREFIX} User Unique ID:`, user_unique_id || 'Not provided')

  try {
    // Step 1: Verify listing exists
    const existingListing = await verifyListingExists(supabase, listing_id)

    // Step 2: Look up user
    const userId = await lookupUserByEmail(supabase, user_email)

    // Step 2b: Look up borough and hood from zip code
    const geoResult = await lookupGeoByZip(supabase, listing_data['Zip'] as string | undefined)

    // Step 3: Update listing in Supabase
    const now = new Date().toISOString()
    const mappedData = mapFieldsToSupabase(listing_data)
    const status = (listing_data['Status'] as string) || DEFAULT_STATUS
    const updateData = buildUpdateData(mappedData, now, status, geoResult, userId)

    await updateListing(supabase, listing_id, updateData)

    // Step 4: Queue Bubble sync
    await queueBubbleSync(supabase, listing_id, updateData)

    // Step 5: Check if first listing and create mockup proposal
    await handleFirstListingMockup(supabase, userId, listing_id, user_email)

    console.log(`${LOG_PREFIX} ========== SUCCESS ==========`)

    const name = (listing_data['Name'] as string) || existingListing.Name || ''
    return buildSuccessResult(listing_id, status, name, updateData)

  } catch (error) {
    console.error(`${LOG_PREFIX} ========== ERROR ==========`)
    console.error(`${LOG_PREFIX} Failed to submit listing:`, error)
    throw error
  }
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
  LISTING_TABLE,
  USER_TABLE,
  DEFAULT_STATUS,
  DIRECT_FIELDS,
  FIELD_MAPPINGS,
  NIGHTLY_PRICE_MAPPINGS,

  // Predicates
  hasEnvVars,
  hasListingRecord,
  hasUserData,
  isFirstListing,

  // Config Helpers
  getEnvConfig,
  createSupabaseClient,

  // Transformers
  mapDirectFields,
  mapSpecialFields,
  mapAvailableNights,
  mapLocationAddress,
  mapFieldsToSupabase,

  // Builders
  buildUpdateData,
  buildSyncQueueItem,
  buildSuccessResult,

  // Query Helpers
  verifyListingExists,
  lookupUserByEmail,
  lookupGeoByZip,
  updateListing,
  queueBubbleSync,
  handleFirstListingMockup,
})
