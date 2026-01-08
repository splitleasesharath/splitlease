/**
 * Create Mockup Proposal Handler
 * Split Lease - listing/handlers
 *
 * Creates a demonstration proposal when a host submits their first listing.
 * This helps new hosts understand how the proposal review process works.
 *
 * Features:
 * - Supports all rental types (Monthly, Weekly, Nightly)
 * - Uses mock guest user (splitleasefrederick@gmail.com)
 * - Calculates realistic pricing from listing configuration
 * - Sets move-in date 14-20 days in future (adjusted for check-in day)
 * - Status set to "Host Review" for immediate visibility
 *
 * NO FALLBACK PRINCIPLE: Non-blocking - failures don't affect listing submission
 *
 * @module listing/handlers/createMockupProposal
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enqueueBubbleSync, triggerQueueProcessing } from '../../_shared/queueSync.ts';
import { parseJsonArray } from '../../_shared/jsonUtils.ts';
import { addUserProposal } from '../../_shared/junctionHelpers.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[createMockupProposal]'
const USER_TABLE = 'user'
const LISTING_TABLE = 'listing'
const PROPOSAL_TABLE = 'proposal'
const MOCK_GUEST_EMAIL = 'splitleasefrederick@gmail.com'
const DEFAULT_RENTAL_TYPE = 'nightly'
const DAYS_UNTIL_MOVE_IN = 14
const MOVE_IN_WINDOW_DAYS = 6

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface CreateMockupProposalPayload {
  readonly listingId: string;
  readonly hostUserId: string;
  readonly hostEmail: string;
}

interface MockGuestData {
  readonly _id: string;
  readonly email: string;
  readonly 'About Me / Bio'?: string;
  readonly 'need for Space'?: string;
  readonly 'special needs'?: string;
  readonly 'About - reasons to host me'?: string;
  readonly 'Rental Application'?: string;
  readonly 'Proposals List'?: string[];
}

interface ListingData {
  readonly _id: string;
  readonly 'rental type'?: string;
  readonly 'Host User'?: string;
  readonly 'Days Available (List of Days)'?: number[];
  readonly 'Nights Available (List of Nights) '?: number[];
  readonly '💰Weekly Host Rate'?: number;
  readonly '💰Monthly Host Rate'?: number;
  readonly '💰Nightly Host Rate for 2 nights'?: number;
  readonly '💰Nightly Host Rate for 3 nights'?: number;
  readonly '💰Nightly Host Rate for 4 nights'?: number;
  readonly '💰Nightly Host Rate for 5 nights'?: number;
  readonly '💰Nightly Host Rate for 7 nights'?: number;
  readonly '💰Cleaning Cost / Maintenance Fee'?: number;
  readonly '💰Damage Deposit'?: number;
  readonly 'Features - House Rules'?: string[];
  readonly 'Location - Address'?: Record<string, unknown>;
  readonly 'Location - slightly different address'?: string;
  readonly 'pricing_list'?: unknown;
}

interface DayNightConfig {
  readonly daysSelected: readonly number[];
  readonly nightsSelected: readonly number[];
  readonly checkIn: number;
  readonly checkOut: number;
  readonly checkInDayJS: number;
  readonly nightsPerWeek: number;
  readonly reservationSpanWeeks: number;
}

interface MoveInDates {
  readonly moveInStart: Date;
  readonly moveInEnd: Date;
}

interface PricingResult {
  readonly nightlyPrice: number;
  readonly fourWeekRent: number;
  readonly estimatedBookingTotal: number;
  readonly hostCompensationPerNight: number;
  readonly totalHostCompensation: number;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if mock guest data exists
 * @pure
 */
const hasMockGuestData = (guest: MockGuestData | null | undefined): guest is MockGuestData =>
  guest !== null && guest !== undefined

/**
 * Check if listing data exists
 * @pure
 */
const hasListingData = (listing: ListingData | null | undefined): listing is ListingData =>
  listing !== null && listing !== undefined

/**
 * Check if available nights count is high (full availability)
 * @pure
 */
const hasFullAvailability = (availableNights: readonly number[]): boolean =>
  availableNights.length > 5

// ─────────────────────────────────────────────────────────────
// Calculators
// ─────────────────────────────────────────────────────────────

/**
 * Get nightly rate based on number of nights from listing pricing
 * @pure
 */
const getNightlyRateForNights = (listing: ListingData, nightsPerWeek: number): number => {
  const rateMap: Readonly<Record<number, number | undefined>> = Object.freeze({
    2: listing['💰Nightly Host Rate for 2 nights'],
    3: listing['💰Nightly Host Rate for 3 nights'],
    4: listing['💰Nightly Host Rate for 4 nights'],
    5: listing['💰Nightly Host Rate for 5 nights'],
    7: listing['💰Nightly Host Rate for 7 nights'],
  })

  // Try exact match first
  if (rateMap[nightsPerWeek] !== undefined && rateMap[nightsPerWeek]! > 0) {
    return rateMap[nightsPerWeek]!
  }

  // For 6 nights, use 7-night rate
  if (nightsPerWeek === 6 && rateMap[7] && rateMap[7] > 0) {
    return rateMap[7]!
  }

  // Fallback to weekly rate divided by nights, or 0
  if (listing['💰Weekly Host Rate'] && nightsPerWeek > 0) {
    return Math.round(listing['💰Weekly Host Rate'] / nightsPerWeek * 100) / 100
  }

  return 0
}

/**
 * Calculate move-in date adjusted for the check-in day
 * Move-in should be 14-20 days in future, landing on the correct check-in day
 * @pure (uses current date)
 */
const calculateMoveInDates = (checkInDayJS: number): MoveInDates => {
  const today = new Date()
  const moveInStart = new Date(today)

  // Start 14 days from now
  moveInStart.setDate(today.getDate() + DAYS_UNTIL_MOVE_IN)

  // Adjust to the correct check-in day (e.g., Monday for Monthly)
  const currentDayJS = moveInStart.getDay()
  const daysUntilCheckIn = (checkInDayJS - currentDayJS + 7) % 7

  if (daysUntilCheckIn !== 0) {
    moveInStart.setDate(moveInStart.getDate() + daysUntilCheckIn)
  }

  // Move-in end is 6 days after start (gives a 7-day window)
  const moveInEnd = new Date(moveInStart)
  moveInEnd.setDate(moveInStart.getDate() + MOVE_IN_WINDOW_DAYS)

  return { moveInStart, moveInEnd }
}

/**
 * Calculate move-out date based on move-in and duration
 * @pure
 */
const calculateMoveOutDate = (
  moveInStart: Date,
  reservationSpanWeeks: number,
  nightsPerWeek: number
): Date => {
  const daysToAdd = (reservationSpanWeeks - 1) * 7 + nightsPerWeek
  const moveOut = new Date(moveInStart)
  moveOut.setDate(moveOut.getDate() + daysToAdd)
  return moveOut
}

/**
 * Calculate complementary nights (nights available but not selected)
 * @pure
 */
const calculateComplementaryNights = (
  availableNights: readonly number[],
  selectedNights: readonly number[]
): number[] => {
  if (!availableNights || !Array.isArray(availableNights)) return []
  if (!selectedNights || !Array.isArray(selectedNights)) return [...availableNights]
  return availableNights.filter((night) => !selectedNights.includes(night))
}

/**
 * Round to two decimal places
 * @pure
 */
const roundToCents = (value: number): number =>
  Math.round(value * 100) / 100

// ─────────────────────────────────────────────────────────────
// Day/Night Configuration Builders
// ─────────────────────────────────────────────────────────────

/**
 * Monthly rental configuration
 * @pure
 */
const buildMonthlyConfig = (): DayNightConfig =>
  Object.freeze({
    daysSelected: Object.freeze([2, 3, 4, 5, 6]),  // Mon-Fri
    nightsSelected: Object.freeze([2, 3, 4, 5]),   // Mon-Thu nights
    checkIn: 2,                                     // Monday
    checkOut: 6,                                    // Friday
    checkInDayJS: 1,                               // Monday in JS (0-6)
    nightsPerWeek: 4,
    reservationSpanWeeks: 13,                      // ~3 months
  })

/**
 * Weekly rental configuration
 * @pure
 */
const buildWeeklyConfig = (): DayNightConfig =>
  Object.freeze({
    daysSelected: Object.freeze([2, 3, 4, 5, 6]),    // Mon-Fri
    nightsSelected: Object.freeze([2, 3, 4, 5, 6]),  // Mon-Fri nights
    checkIn: 2,                                       // Monday
    checkOut: 7,                                      // Saturday (check out morning)
    checkInDayJS: 1,                                 // Monday in JS
    nightsPerWeek: 5,
    reservationSpanWeeks: 4,                         // 1 month
  })

/**
 * Full availability nightly configuration
 * @pure
 */
const buildFullNightlyConfig = (): DayNightConfig =>
  Object.freeze({
    daysSelected: Object.freeze([1, 2, 3, 4, 5, 6, 7]),    // All days
    nightsSelected: Object.freeze([1, 2, 3, 4, 5, 6, 7]),  // All nights
    checkIn: 1,                                              // Sunday
    checkOut: 1,                                             // Sunday (next week)
    checkInDayJS: 0,                                        // Sunday in JS
    nightsPerWeek: 7,
    reservationSpanWeeks: 4,
  })

/**
 * Build nightly config from listing availability
 * @pure
 */
const buildPartialNightlyConfig = (
  availableDays: readonly number[],
  availableNights: readonly number[]
): DayNightConfig => {
  const nightsCount = availableNights.length || 4
  const sortedDays = availableDays.length > 0
    ? [...availableDays].sort((a, b) => a - b)
    : [2, 3, 4, 5, 6]
  const sortedNights = availableNights.length > 0
    ? [...availableNights].sort((a, b) => a - b)
    : [2, 3, 4, 5]

  const checkInDay = sortedDays[0] || 2
  let checkOutDay = (sortedDays[sortedDays.length - 1] || 6) + 1
  if (checkOutDay > 7) checkOutDay = 1

  return Object.freeze({
    daysSelected: Object.freeze(sortedDays),
    nightsSelected: Object.freeze(sortedNights),
    checkIn: checkInDay,
    checkOut: checkOutDay,
    checkInDayJS: checkInDay - 1,
    nightsPerWeek: nightsCount,
    reservationSpanWeeks: 4,
  })
}

/**
 * Get day/night configuration based on rental type
 * All values in Bubble format (1-7, Sun=1)
 * @pure
 */
const getDayNightConfig = (rentalType: string, listing: ListingData): DayNightConfig => {
  const rentalTypeLower = (rentalType || DEFAULT_RENTAL_TYPE).toLowerCase()

  // Parse available nights from listing
  const availableNights = parseJsonArray<number>(
    listing['Nights Available (List of Nights) '],
    'Nights Available'
  )
  const availableDays = parseJsonArray<number>(
    listing['Days Available (List of Days)'],
    'Days Available'
  )

  switch (rentalTypeLower) {
    case 'monthly':
      return buildMonthlyConfig()

    case 'weekly':
      return buildWeeklyConfig()

    case 'nightly':
    default:
      return hasFullAvailability(availableNights)
        ? buildFullNightlyConfig()
        : buildPartialNightlyConfig(availableDays, availableNights)
  }
}

// ─────────────────────────────────────────────────────────────
// Pricing Calculators
// ─────────────────────────────────────────────────────────────

/**
 * Calculate monthly pricing
 * @pure
 */
const calculateMonthlyPricing = (
  listing: ListingData,
  nightsPerWeek: number,
  reservationSpanWeeks: number
): PricingResult => {
  const nightlyPrice = listing['💰Nightly Host Rate for 4 nights'] || 0
  const fourWeekRent = nightlyPrice * nightsPerWeek * 4
  const monthlyRate = listing['💰Monthly Host Rate'] || fourWeekRent
  const totalHostCompensation = monthlyRate * (reservationSpanWeeks / 4)

  return Object.freeze({
    nightlyPrice: roundToCents(nightlyPrice),
    fourWeekRent: roundToCents(fourWeekRent),
    estimatedBookingTotal: roundToCents(totalHostCompensation),
    hostCompensationPerNight: roundToCents(nightlyPrice),
    totalHostCompensation: roundToCents(totalHostCompensation),
  })
}

/**
 * Calculate weekly pricing
 * @pure
 */
const calculateWeeklyPricing = (
  listing: ListingData,
  reservationSpanWeeks: number
): PricingResult => {
  const nightlyPrice = listing['💰Nightly Host Rate for 5 nights'] || 0
  const weeklyRate = listing['💰Weekly Host Rate'] || 0
  const fourWeekRent = weeklyRate * 4
  const totalHostCompensation = weeklyRate * reservationSpanWeeks

  return Object.freeze({
    nightlyPrice: roundToCents(nightlyPrice),
    fourWeekRent: roundToCents(fourWeekRent),
    estimatedBookingTotal: roundToCents(totalHostCompensation),
    hostCompensationPerNight: roundToCents(nightlyPrice),
    totalHostCompensation: roundToCents(totalHostCompensation),
  })
}

/**
 * Calculate nightly pricing
 * @pure
 */
const calculateNightlyPricing = (
  listing: ListingData,
  nightsPerWeek: number,
  reservationSpanWeeks: number
): PricingResult => {
  const nightlyPrice = getNightlyRateForNights(listing, nightsPerWeek)
  const fourWeekRent = nightlyPrice * nightsPerWeek * 4
  const totalHostCompensation = nightlyPrice * nightsPerWeek * reservationSpanWeeks

  return Object.freeze({
    nightlyPrice: roundToCents(nightlyPrice),
    fourWeekRent: roundToCents(fourWeekRent),
    estimatedBookingTotal: roundToCents(totalHostCompensation),
    hostCompensationPerNight: roundToCents(nightlyPrice),
    totalHostCompensation: roundToCents(totalHostCompensation),
  })
}

/**
 * Calculate pricing based on rental type and listing configuration
 *
 * IMPORTANT: In Bubble workflow, "host compensation" is the PER-NIGHT host rate,
 * NOT the total. The total compensation is calculated as:
 *   - Nightly: host_compensation (per night) * nights_per_week * weeks
 *   - Weekly: weekly_rate * weeks
 *   - Monthly: monthly_rate * months
 *
 * @pure
 */
const calculatePricing = (
  rentalType: string,
  listing: ListingData,
  nightsPerWeek: number,
  reservationSpanWeeks: number
): PricingResult => {
  const rentalTypeLower = (rentalType || DEFAULT_RENTAL_TYPE).toLowerCase()

  switch (rentalTypeLower) {
    case 'monthly':
      return calculateMonthlyPricing(listing, nightsPerWeek, reservationSpanWeeks)

    case 'weekly':
      return calculateWeeklyPricing(listing, reservationSpanWeeks)

    case 'nightly':
    default:
      return calculateNightlyPricing(listing, nightsPerWeek, reservationSpanWeeks)
  }
}

// ─────────────────────────────────────────────────────────────
// Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build history entry for mockup proposal
 * @pure (uses current date)
 */
const buildHistoryEntry = (): string => {
  const formattedDate = new Date().toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
  return `Mockup proposal created on ${formattedDate} - This is a demonstration proposal to help you understand the proposal review process.`
}

/**
 * Get reservation span text
 * @pure
 */
const getReservationSpanText = (weeks: number): string =>
  weeks <= 4 ? '1_month' : weeks <= 8 ? '2_months' : '3_months'

/**
 * Build the complete proposal data object
 * @pure
 */
const buildProposalData = (params: {
  proposalId: string;
  listingId: string;
  guestData: MockGuestData;
  hostUserId: string;
  hostEmail: string;
  listingData: ListingData;
  rentalType: string;
  config: DayNightConfig;
  dates: { moveInStart: Date; moveInEnd: Date; moveOut: Date };
  pricing: PricingResult;
  complementaryNights: number[];
  availableDays: readonly number[];
  timestamp: string;
}): Record<string, unknown> => {
  const {
    proposalId, listingId, guestData, hostUserId, hostEmail,
    listingData, rentalType, config, dates, pricing,
    complementaryNights, availableDays, timestamp
  } = params

  return {
    _id: proposalId,

    // Core relationships
    Listing: listingId,
    Guest: guestData._id,
    'Host User': hostUserId,
    'Created By': guestData._id,

    // Guest info (from mock guest)
    'Guest email': guestData.email,
    'Guest flexibility': 'Flexible',
    'preferred gender': 'any',
    'need for space': guestData['need for Space'] || 'Looking for a comfortable place to stay',
    about_yourself: guestData['About Me / Bio'] || 'Split Lease Demo Guest',
    special_needs: guestData['special needs'] || null,
    Comment: guestData['About - reasons to host me'] ||
      'This is a demonstration proposal to show you how the proposal review process works. ' +
      'When real guests apply, their information will appear here. You can approve, negotiate, or decline proposals.',

    // Dates
    'Move in range start': dates.moveInStart.toISOString(),
    'Move in range end': dates.moveInEnd.toISOString(),
    'Move-out': dates.moveOut.toISOString(),
    'move-in range (text)': `${dates.moveInStart.toLocaleDateString('en-US')} - ${dates.moveInEnd.toLocaleDateString('en-US')}`,

    // Duration
    'Reservation Span': getReservationSpanText(config.reservationSpanWeeks),
    'Reservation Span (Weeks)': config.reservationSpanWeeks,
    'actual weeks during reservation span': config.reservationSpanWeeks,
    'duration in months': Math.floor(config.reservationSpanWeeks / 4),

    // Day/Night selection (Bubble format 1-7)
    'Days Selected': [...config.daysSelected],
    'Nights Selected (Nights list)': [...config.nightsSelected],
    'nights per week (num)': config.nightsPerWeek,
    'check in day': config.checkIn,
    'check out day': config.checkOut,
    'Days Available': availableDays.length > 0 ? [...availableDays] : [...config.daysSelected],
    'Complementary Nights': complementaryNights,

    // Pricing
    'proposal nightly price': pricing.nightlyPrice,
    '4 week rent': pricing.fourWeekRent,
    'Total Price for Reservation (guest)': pricing.estimatedBookingTotal,
    'Total Compensation (proposal - host)': pricing.totalHostCompensation,
    'host compensation': pricing.hostCompensationPerNight,
    '4 week compensation': pricing.fourWeekRent,
    'cleaning fee': listingData['💰Cleaning Cost / Maintenance Fee'] || 0,
    'damage deposit': listingData['💰Damage Deposit'] || 0,
    'nightly price for map (text)': `$${Math.round(pricing.nightlyPrice)}`,

    // From listing
    'rental type': rentalType,
    'House Rules': listingData['Features - House Rules'],
    'Location - Address': listingData['Location - Address'],
    'Location - Address slightly different': listingData['Location - slightly different address'],

    // Status & metadata
    Status: 'Host Review',
    'Order Ranking': 1,
    History: [buildHistoryEntry()],
    'Is Finalized': false,
    Deleted: false,

    // Related records
    'rental application': guestData['Rental Application'],
    'rental app requested': false,
    'host email': hostEmail,

    // Timestamps
    'Created Date': timestamp,
    'Modified Date': timestamp,
  }
}

/**
 * Build sync queue item
 * @pure
 */
const buildSyncQueueItem = (
  proposalId: string,
  proposalData: Record<string, unknown>
): { correlationId: string; items: readonly { sequence: number; table: string; recordId: string; operation: string; payload: Record<string, unknown> }[] } =>
  Object.freeze({
    correlationId: `mockup_proposal:${proposalId}`,
    items: Object.freeze([{
      sequence: 1,
      table: PROPOSAL_TABLE,
      recordId: proposalId,
      operation: 'INSERT',
      payload: proposalData,
    }])
  })

// ─────────────────────────────────────────────────────────────
// Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Fetch mock guest user
 * @effectful (database query)
 */
async function fetchMockGuest(supabase: SupabaseClient): Promise<MockGuestData | null> {
  console.log(`${LOG_PREFIX} Step 1: Fetching mock guest...`)

  const { data: mockGuest, error } = await supabase
    .from(USER_TABLE)
    .select(`
      _id,
      email,
      "About Me / Bio",
      "need for Space",
      "special needs",
      "About - reasons to host me",
      "Rental Application",
      "Proposals List"
    `)
    .eq('email', MOCK_GUEST_EMAIL)
    .single()

  if (error || !hasMockGuestData(mockGuest)) {
    console.warn(`${LOG_PREFIX} Mock guest not found, skipping mockup creation`)
    console.warn(`${LOG_PREFIX} Error:`, error?.message)
    return null
  }

  console.log(`${LOG_PREFIX} Mock guest found:`, mockGuest._id)
  return mockGuest as MockGuestData
}

/**
 * Fetch listing data
 * @effectful (database query)
 */
async function fetchListingData(
  supabase: SupabaseClient,
  listingId: string
): Promise<ListingData | null> {
  console.log(`${LOG_PREFIX} Step 2: Fetching listing data...`)

  const { data: listing, error } = await supabase
    .from(LISTING_TABLE)
    .select(`
      _id,
      "rental type",
      "Host User",
      "Days Available (List of Days)",
      "Nights Available (List of Nights) ",
      "💰Weekly Host Rate",
      "💰Monthly Host Rate",
      "💰Nightly Host Rate for 2 nights",
      "💰Nightly Host Rate for 3 nights",
      "💰Nightly Host Rate for 4 nights",
      "💰Nightly Host Rate for 5 nights",
      "💰Nightly Host Rate for 7 nights",
      "💰Cleaning Cost / Maintenance Fee",
      "💰Damage Deposit",
      "Features - House Rules",
      "Location - Address",
      "Location - slightly different address",
      "pricing_list"
    `)
    .eq('_id', listingId)
    .single()

  if (error || !hasListingData(listing)) {
    console.error(`${LOG_PREFIX} Listing not found:`, error?.message)
    return null
  }

  return listing as ListingData
}

/**
 * Generate proposal ID
 * @effectful (database RPC)
 */
async function generateProposalId(supabase: SupabaseClient): Promise<string | null> {
  console.log(`${LOG_PREFIX} Step 6: Generating proposal ID...`)

  const { data: proposalId, error } = await supabase.rpc('generate_bubble_id')

  if (error || !proposalId) {
    console.error(`${LOG_PREFIX} ID generation failed:`, error)
    return null
  }

  console.log(`${LOG_PREFIX} Generated proposal ID:`, proposalId)
  return proposalId
}

/**
 * Insert proposal into Supabase
 * @effectful (database mutation)
 */
async function insertProposal(
  supabase: SupabaseClient,
  proposalData: Record<string, unknown>
): Promise<boolean> {
  console.log(`${LOG_PREFIX} Step 8: Inserting proposal...`)

  const { error } = await supabase
    .from(PROPOSAL_TABLE)
    .insert(proposalData)

  if (error) {
    console.error(`${LOG_PREFIX} Insert failed:`, error)
    return false
  }

  console.log(`${LOG_PREFIX} Proposal inserted successfully`)
  return true
}

/**
 * Update host user's Proposals List
 * @effectful (database queries, mutations)
 */
async function updateHostProposalsList(
  supabase: SupabaseClient,
  hostUserId: string,
  proposalId: string,
  timestamp: string
): Promise<void> {
  console.log(`${LOG_PREFIX} Step 9: Updating host Proposals List...`)

  const { data: hostUser, error: hostUserError } = await supabase
    .from(USER_TABLE)
    .select('_id, "Proposals List"')
    .eq('_id', hostUserId)
    .single()

  if (hostUserError || !hostUser) {
    console.warn(`${LOG_PREFIX} Host user not found for Proposals List update`)
    return
  }

  const currentProposals = parseJsonArray<string>(hostUser['Proposals List'], 'Host Proposals List')
  const updatedProposals = [...currentProposals, proposalId]

  const { error: updateError } = await supabase
    .from(USER_TABLE)
    .update({
      'Proposals List': updatedProposals,
      'Modified Date': timestamp,
    })
    .eq('_id', hostUserId)

  if (updateError) {
    console.warn(`${LOG_PREFIX} Failed to update host Proposals List:`, updateError)
  } else {
    console.log(`${LOG_PREFIX} Host Proposals List updated`)
  }

  // Dual-write to junction table
  await addUserProposal(supabase, hostUserId, proposalId, 'host')
}

/**
 * Queue Bubble sync (fire-and-forget)
 * @effectful (database mutation, HTTP request)
 */
async function queueBubbleSync(
  supabase: SupabaseClient,
  proposalId: string,
  proposalData: Record<string, unknown>
): Promise<void> {
  console.log(`${LOG_PREFIX} Step 10: Queueing Bubble sync...`)

  try {
    const syncItem = buildSyncQueueItem(proposalId, proposalData)
    await enqueueBubbleSync(supabase, syncItem)

    console.log(`${LOG_PREFIX} Bubble sync queued for`, proposalId)
    triggerQueueProcessing()
  } catch (syncError) {
    console.warn(`${LOG_PREFIX} Queue sync failed (non-blocking):`, syncError)
  }
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Create a mockup proposal for a first-time host
 *
 * This is a NON-BLOCKING operation - failures are logged but don't
 * affect the main listing submission flow.
 *
 * @effectful (database mutations, HTTP requests, console logging)
 */
export async function handleCreateMockupProposal(
  supabase: SupabaseClient,
  payload: CreateMockupProposalPayload
): Promise<void> {
  const { listingId, hostUserId, hostEmail } = payload

  console.log(`${LOG_PREFIX} ========== START ==========`)
  console.log(`${LOG_PREFIX} Listing:`, listingId)
  console.log(`${LOG_PREFIX} Host User:`, hostUserId)

  try {
    // Step 1: Fetch mock guest user
    const guestData = await fetchMockGuest(supabase)
    if (!guestData) return

    // Step 2: Fetch listing data
    const listingData = await fetchListingData(supabase, listingId)
    if (!listingData) return

    const rentalType = listingData['rental type'] || DEFAULT_RENTAL_TYPE
    console.log(`${LOG_PREFIX} Rental type:`, rentalType)

    // Step 2.5: Get host user ID from listing
    console.log(`${LOG_PREFIX} Step 2.5: Getting host user ID...`)
    const resolvedHostUserId = listingData['Host User'] || hostUserId
    console.log(`${LOG_PREFIX} Host User ID:`, resolvedHostUserId)

    // Step 3: Calculate day/night configuration
    console.log(`${LOG_PREFIX} Step 3: Calculating day/night config...`)
    const config = getDayNightConfig(rentalType, listingData)
    console.log(`${LOG_PREFIX} Days selected:`, config.daysSelected)
    console.log(`${LOG_PREFIX} Nights selected:`, config.nightsSelected)
    console.log(`${LOG_PREFIX} Reservation weeks:`, config.reservationSpanWeeks)

    // Step 4: Calculate dates
    console.log(`${LOG_PREFIX} Step 4: Calculating dates...`)
    const { moveInStart, moveInEnd } = calculateMoveInDates(config.checkInDayJS)
    const moveOut = calculateMoveOutDate(moveInStart, config.reservationSpanWeeks, config.nightsPerWeek)
    console.log(`${LOG_PREFIX} Move-in start:`, moveInStart.toISOString())
    console.log(`${LOG_PREFIX} Move-in end:`, moveInEnd.toISOString())
    console.log(`${LOG_PREFIX} Move-out:`, moveOut.toISOString())

    // Step 5: Calculate pricing
    console.log(`${LOG_PREFIX} Step 5: Calculating pricing...`)
    const pricing = calculatePricing(rentalType, listingData, config.nightsPerWeek, config.reservationSpanWeeks)
    console.log(`${LOG_PREFIX} Pricing calculated:`, {
      nightlyPrice: pricing.nightlyPrice,
      fourWeekRent: pricing.fourWeekRent,
      hostCompensationPerNight: pricing.hostCompensationPerNight,
      totalHostCompensation: pricing.totalHostCompensation,
      estimatedBookingTotal: pricing.estimatedBookingTotal
    })

    // Step 6: Generate proposal ID
    const proposalId = await generateProposalId(supabase)
    if (!proposalId) return

    // Step 7: Build proposal data
    console.log(`${LOG_PREFIX} Step 7: Building proposal data...`)
    const now = new Date().toISOString()

    const availableNights = parseJsonArray<number>(
      listingData['Nights Available (List of Nights) '],
      'Nights Available'
    )
    const complementaryNights = calculateComplementaryNights(availableNights, config.nightsSelected)

    const availableDays = parseJsonArray<number>(
      listingData['Days Available (List of Days)'],
      'Days Available'
    )

    const proposalData = buildProposalData({
      proposalId,
      listingId,
      guestData,
      hostUserId: resolvedHostUserId,
      hostEmail,
      listingData,
      rentalType,
      config,
      dates: { moveInStart, moveInEnd, moveOut },
      pricing,
      complementaryNights,
      availableDays,
      timestamp: now,
    })

    // Step 8: Insert proposal into Supabase
    const inserted = await insertProposal(supabase, proposalData)
    if (!inserted) return

    // Step 9: Update host user's Proposals List
    await updateHostProposalsList(supabase, resolvedHostUserId, proposalId, now)

    // Step 10: Queue Bubble sync
    await queueBubbleSync(supabase, proposalId, proposalData)

    console.log(`${LOG_PREFIX} ========== SUCCESS ==========`)
    console.log(`${LOG_PREFIX} Mockup proposal created:`, proposalId)

  } catch (error) {
    // Non-blocking - log the error but don't propagate
    console.error(`${LOG_PREFIX} ========== ERROR ==========`)
    console.error(`${LOG_PREFIX} Failed to create mockup proposal:`, error)
    // Do not throw - this is a non-blocking operation
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
  USER_TABLE,
  LISTING_TABLE,
  PROPOSAL_TABLE,
  MOCK_GUEST_EMAIL,
  DEFAULT_RENTAL_TYPE,
  DAYS_UNTIL_MOVE_IN,
  MOVE_IN_WINDOW_DAYS,

  // Predicates
  hasMockGuestData,
  hasListingData,
  hasFullAvailability,

  // Calculators
  getNightlyRateForNights,
  calculateMoveInDates,
  calculateMoveOutDate,
  calculateComplementaryNights,
  roundToCents,

  // Day/Night Config Builders
  buildMonthlyConfig,
  buildWeeklyConfig,
  buildFullNightlyConfig,
  buildPartialNightlyConfig,
  getDayNightConfig,

  // Pricing Calculators
  calculateMonthlyPricing,
  calculateWeeklyPricing,
  calculateNightlyPricing,
  calculatePricing,

  // Builders
  buildHistoryEntry,
  getReservationSpanText,
  buildProposalData,
  buildSyncQueueItem,

  // Query Helpers
  fetchMockGuest,
  fetchListingData,
  generateProposalId,
  insertProposal,
  updateHostProposalsList,
  queueBubbleSync,
})
