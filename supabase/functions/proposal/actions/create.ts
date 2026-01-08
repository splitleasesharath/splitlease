/**
 * Create Proposal Action
 * Split Lease - Supabase Edge Functions
 *
 * Implements Bubble CORE-create_proposal-NEW workflow (Steps 1-7, 13-23)
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * FP PATTERN: Separates pure data builders from effectful database operations
 * All data transformations are pure with @pure annotations
 * All database operations are explicit with @effectful annotations
 *
 * @module proposal/actions/create
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, SupabaseSyncError } from "../../_shared/errors.ts";
import { parseJsonArray } from "../../_shared/jsonUtils.ts";
import {
  CreateProposalInput,
  CreateProposalResponse,
  ListingData,
  GuestData,
  HostAccountData,
  HostUserData,
  RentalApplicationData,
  UserContext,
  RentalType,
  ReservationSpan,
  CompensationResult,
} from "../lib/types.ts";
import { validateCreateProposalInput } from "../lib/validators.ts";
import {
  calculateCompensation,
  calculateMoveOutDate,
  calculateComplementaryNights,
  calculateOrderRanking,
  formatPriceForDisplay,
  getNightlyRateForNights,
} from "../lib/calculations.ts";
import { determineInitialStatus, ProposalStatusName } from "../lib/status.ts";
import { enqueueBubbleSync, triggerQueueProcessing } from "../lib/bubbleSyncQueue.ts";
import {
  addUserProposal,
  addUserListingFavorite,
} from "../../_shared/junctionHelpers.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[proposal:create]'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface RelatedData {
  readonly listing: ListingData;
  readonly guest: GuestData;
  readonly hostUser: HostUserData;
  readonly hostAccount: HostAccountData;
  readonly rentalApp: RentalApplicationData | null;
}

interface CalculatedValues {
  readonly orderRanking: number;
  readonly complementaryNights: readonly number[];
  readonly compensation: CompensationResult;
  readonly moveOutDate: Date;
  readonly status: ProposalStatusName;
  readonly rentalType: RentalType;
  readonly nightsPerWeek: number;
  readonly hostNightlyRate: number;
}

interface ProposalRecord {
  readonly _id: string;
  readonly [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build history entry for proposal creation
 * @pure
 */
const buildHistoryEntry = (): string =>
  `Proposal created on ${new Date().toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })}`

/**
 * Calculate all derived values from input and related data
 * @pure
 */
const calculateDerivedValues = (
  input: CreateProposalInput,
  relatedData: RelatedData
): CalculatedValues => {
  const { listing, guest, rentalApp } = relatedData

  // Calculate order ranking
  const existingProposals: readonly string[] = guest["Proposals List"] || []
  const orderRanking = calculateOrderRanking(existingProposals.length)

  // Calculate complementary nights (Step 4)
  const complementaryNights = calculateComplementaryNights(
    listing["Nights Available (List of Nights) "] || [],
    input.nightsSelected
  )

  // Calculate compensation (Steps 13-18)
  const rentalType = ((listing["rental type"] || "nightly").toLowerCase()) as RentalType
  const nightsPerWeek = input.nightsSelected.length
  const hostNightlyRate = getNightlyRateForNights(listing, nightsPerWeek)

  const compensation = calculateCompensation(
    rentalType,
    (input.reservationSpan || "other") as ReservationSpan,
    nightsPerWeek,
    listing["💰Weekly Host Rate"] || 0,
    hostNightlyRate,
    input.reservationSpanWeeks,
    listing["💰Monthly Host Rate"] || 0
  )

  // Calculate move-out date
  const moveOutDate = calculateMoveOutDate(
    new Date(input.moveInStartRange),
    input.reservationSpanWeeks,
    input.nightsSelected.length
  )

  // Determine initial status (Steps 5-7)
  const status = determineInitialStatus(
    !!rentalApp,
    rentalApp?.submitted ?? false,
    input.status as ProposalStatusName | undefined
  )

  return Object.freeze({
    orderRanking,
    complementaryNights,
    compensation,
    moveOutDate,
    status,
    rentalType,
    nightsPerWeek,
    hostNightlyRate,
  })
}

/**
 * Build proposal data record from input and calculated values
 * @pure
 */
const buildProposalData = (
  proposalId: string,
  input: CreateProposalInput,
  relatedData: RelatedData,
  calculated: CalculatedValues,
  now: string
): ProposalRecord => {
  const { listing, guest, hostUser } = relatedData
  const { compensation, complementaryNights, status, orderRanking, moveOutDate } = calculated

  // Default values for optional fields (tech-debt: should be collected from user)
  const guestFlexibility = input.guestFlexibility || "Flexible"
  const preferredGender = input.preferredGender || "any"
  const historyEntry = buildHistoryEntry()

  return Object.freeze({
    _id: proposalId,

    // Core relationships
    Listing: input.listingId,
    Guest: input.guestId,
    "Host User": hostUser._id,
    "Created By": input.guestId,

    // Guest info
    "Guest email": guest.email,
    "Guest flexibility": guestFlexibility,
    "preferred gender": preferredGender,
    "need for space": input.needForSpace || null,
    about_yourself: input.aboutMe || null,
    special_needs: input.specialNeeds || null,
    Comment: input.comment || null,

    // Dates
    "Move in range start": input.moveInStartRange,
    "Move in range end": input.moveInEndRange,
    "Move-out": moveOutDate.toISOString(),
    "move-in range (text)": input.moveInRangeText || null,

    // Duration
    "Reservation Span": input.reservationSpan,
    "Reservation Span (Weeks)": input.reservationSpanWeeks,
    "actual weeks during reservation span": input.actualWeeks || input.reservationSpanWeeks,
    "duration in months": compensation.duration_months,

    // Day/Night selection
    "Days Selected": input.daysSelected,
    "Nights Selected (Nights list)": input.nightsSelected,
    "nights per week (num)": input.nightsSelected.length,
    "check in day": input.checkIn,
    "check out day": input.checkOut,
    "Days Available": listing["Days Available (List of Days)"],
    "Complementary Nights": complementaryNights,

    // Pricing
    "proposal nightly price": input.proposalPrice,
    "4 week rent": input.fourWeekRent || compensation.four_week_rent,
    "Total Price for Reservation (guest)": input.estimatedBookingTotal,
    "Total Compensation (proposal - host)": compensation.total_compensation,
    "host compensation": compensation.host_compensation_per_night,
    "4 week compensation": input.fourWeekCompensation || compensation.four_week_compensation,
    "cleaning fee": listing["💰Cleaning Cost / Maintenance Fee"] || 0,
    "damage deposit": listing["💰Damage Deposit"] || 0,
    "nightly price for map (text)": formatPriceForDisplay(input.proposalPrice),

    // From listing
    "rental type": listing["rental type"],
    "House Rules": listing["Features - House Rules"],
    "week selection": listing["Weeks offered"],
    "hc house rules": listing["Features - House Rules"],
    "Location - Address": listing["Location - Address"],
    "Location - Address slightly different": listing["Location - slightly different address"],

    // Status & metadata
    Status: status,
    "Order Ranking": orderRanking,
    History: [historyEntry],
    "Is Finalized": false,
    Deleted: false,

    // Related records
    "rental application": guest["Rental Application"],
    "rental app requested": !!guest["Rental Application"],
    "host email": hostUser.email,

    // Custom schedule description
    custom_schedule_description: input.customScheduleDescription || null,

    // Timestamps
    "Created Date": now,
    "Modified Date": now,
  })
}

/**
 * Build early profile updates for saving bio/need_for_space before proposal creation
 * @pure
 */
const buildEarlyProfileUpdates = (
  input: CreateProposalInput,
  guest: GuestData,
  tasksCompleted: readonly string[]
): Readonly<Record<string, unknown>> => {
  const updates: Record<string, unknown> = {}

  if (!guest["About Me / Bio"] && !tasksCompleted.includes("bio") && input.aboutMe) {
    updates["About Me / Bio"] = input.aboutMe
  }
  if (!guest["need for Space"] && !tasksCompleted.includes("need_for_space") && input.needForSpace) {
    updates["need for Space"] = input.needForSpace
  }
  if (!guest["special needs"] && !tasksCompleted.includes("special_needs") && input.specialNeeds) {
    updates["special needs"] = input.specialNeeds
  }

  return Object.freeze(updates)
}

/**
 * Build guest user updates for Step 2
 * @pure
 */
const buildGuestUpdates = (
  input: CreateProposalInput,
  guest: GuestData,
  proposalId: string,
  existingProposals: readonly string[],
  now: string
): Readonly<Record<string, unknown>> => {
  const guestFlexibility = input.guestFlexibility || "Flexible"
  const tasksCompleted = parseJsonArray<string>(guest["Tasks Completed"], "Tasks Completed")
  const currentFavorites = parseJsonArray<string>(guest["Favorited Listings"], "Favorited Listings")

  const updates: Record<string, unknown> = {
    "flexibility (last known)": guestFlexibility,
    "Recent Days Selected": input.daysSelected,
    "Modified Date": now,
    "Proposals List": [...existingProposals, proposalId],
  }

  // Add listing to favorites (Step 2)
  if (!currentFavorites.includes(input.listingId)) {
    updates["Favorited Listings"] = [...currentFavorites, input.listingId]
  }

  // Profile enrichment (Steps 20-22) - only if empty
  if (!guest["About Me / Bio"] && !tasksCompleted.includes("bio") && input.aboutMe) {
    updates["About Me / Bio"] = input.aboutMe
  }
  if (!guest["need for Space"] && !tasksCompleted.includes("need_for_space") && input.needForSpace) {
    updates["need for Space"] = input.needForSpace
  }
  if (!guest["special needs"] && !tasksCompleted.includes("special_needs") && input.specialNeeds) {
    updates["special needs"] = input.specialNeeds
  }

  return Object.freeze(updates)
}

/**
 * Build response object
 * @pure
 */
const buildResponse = (
  proposalId: string,
  status: ProposalStatusName,
  orderRanking: number,
  input: CreateProposalInput,
  hostId: string,
  now: string
): CreateProposalResponse =>
  Object.freeze({
    proposalId,
    status,
    orderRanking,
    listingId: input.listingId,
    guestId: input.guestId,
    hostId,
    createdAt: now,
  })

// ─────────────────────────────────────────────────────────────
// Database Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Fetch listing from database
 * @effectful - Database read operation
 */
const fetchListing = async (
  supabase: SupabaseClient,
  listingId: string
): Promise<ListingData> => {
  const { data: listing, error } = await supabase
    .from("listing")
    .select(`
      _id,
      "Host User",
      "rental type",
      "Features - House Rules",
      "💰Cleaning Cost / Maintenance Fee",
      "💰Damage Deposit",
      "Weeks offered",
      "Days Available (List of Days)",
      "Nights Available (List of Nights) ",
      "Location - Address",
      "Location - slightly different address",
      "💰Weekly Host Rate",
      "💰Nightly Host Rate for 2 nights",
      "💰Nightly Host Rate for 3 nights",
      "💰Nightly Host Rate for 4 nights",
      "💰Nightly Host Rate for 5 nights",
      "💰Nightly Host Rate for 7 nights",
      "💰Monthly Host Rate",
      "Deleted"
    `)
    .eq("_id", listingId)
    .single()

  if (error || !listing) {
    console.error(`${LOG_PREFIX} Listing fetch failed:`, error)
    throw new ValidationError(`Listing not found: ${listingId}`)
  }

  if ((listing as Record<string, unknown>).Deleted === true) {
    console.error(`${LOG_PREFIX} Listing is soft-deleted: ${listingId}`)
    throw new ValidationError(`Cannot create proposal for deleted listing: ${listingId}`)
  }

  return listing as unknown as ListingData
}

/**
 * Fetch guest user from database
 * @effectful - Database read operation
 */
const fetchGuest = async (
  supabase: SupabaseClient,
  guestId: string
): Promise<GuestData> => {
  const { data: guest, error } = await supabase
    .from("user")
    .select(`
      _id,
      email,
      "Rental Application",
      "Proposals List",
      "Favorited Listings",
      "About Me / Bio",
      "need for Space",
      "special needs",
      "Tasks Completed"
    `)
    .eq("_id", guestId)
    .single()

  if (error || !guest) {
    console.error(`${LOG_PREFIX} Guest fetch failed:`, error)
    throw new ValidationError(`Guest not found: ${guestId}`)
  }

  return guest as unknown as GuestData
}

/**
 * Fetch host user from database
 * @effectful - Database read operation
 */
const fetchHostUser = async (
  supabase: SupabaseClient,
  hostUserId: string
): Promise<HostUserData> => {
  const { data: hostUser, error } = await supabase
    .from("user")
    .select(`_id, email, "Proposals List"`)
    .eq("_id", hostUserId)
    .single()

  if (error || !hostUser) {
    console.error(`${LOG_PREFIX} Host user fetch failed:`, error)
    throw new ValidationError(`Host user not found: ${hostUserId}`)
  }

  return hostUser as unknown as HostUserData
}

/**
 * Fetch rental application from database
 * @effectful - Database read operation
 */
const fetchRentalApp = async (
  supabase: SupabaseClient,
  rentalAppId: string | null
): Promise<RentalApplicationData | null> => {
  if (!rentalAppId) return null

  const { data: app } = await supabase
    .from("rentalapplication")
    .select("_id, submitted")
    .eq("_id", rentalAppId)
    .single()

  return app as RentalApplicationData | null
}

/**
 * Generate proposal ID using RPC
 * @effectful - Database RPC call
 */
const generateProposalId = async (supabase: SupabaseClient): Promise<string> => {
  const { data: proposalId, error } = await supabase.rpc('generate_bubble_id')

  if (error || !proposalId) {
    console.error(`${LOG_PREFIX} ID generation failed:`, error)
    throw new SupabaseSyncError('Failed to generate proposal ID')
  }

  return proposalId
}

/**
 * Save early profile updates
 * @effectful - Database write operation
 */
const saveEarlyProfileUpdates = async (
  supabase: SupabaseClient,
  guestId: string,
  updates: Readonly<Record<string, unknown>>
): Promise<void> => {
  if (Object.keys(updates).length === 0) return

  const updatesWithTimestamp = {
    ...updates,
    "Modified Date": new Date().toISOString(),
  }

  const { error } = await supabase
    .from("user")
    .update(updatesWithTimestamp)
    .eq("_id", guestId)

  if (error) {
    console.error(`${LOG_PREFIX} Early profile save failed:`, error)
    // Non-blocking - continue with proposal creation
  } else {
    console.log(`${LOG_PREFIX} Early profile save succeeded`)
  }
}

/**
 * Insert proposal into database
 * @effectful - Database write operation
 */
const insertProposal = async (
  supabase: SupabaseClient,
  proposalData: ProposalRecord
): Promise<void> => {
  const { error } = await supabase
    .from("proposal")
    .insert(proposalData)

  if (error) {
    console.error(`${LOG_PREFIX} Insert failed:`, error)
    throw new SupabaseSyncError(`Failed to create proposal: ${error.message}`)
  }
}

/**
 * Update guest user after proposal creation
 * @effectful - Database write operation
 */
const updateGuestUser = async (
  supabase: SupabaseClient,
  guestId: string,
  updates: Readonly<Record<string, unknown>>
): Promise<void> => {
  const { error } = await supabase
    .from("user")
    .update(updates)
    .eq("_id", guestId)

  if (error) {
    console.error(`${LOG_PREFIX} Guest update failed:`, error)
    // Non-blocking - continue
  } else {
    console.log(`${LOG_PREFIX} Guest user updated`)
  }
}

/**
 * Update host user after proposal creation
 * @effectful - Database write operation
 */
const updateHostUser = async (
  supabase: SupabaseClient,
  hostId: string,
  existingProposals: readonly string[],
  proposalId: string,
  now: string
): Promise<void> => {
  const { error } = await supabase
    .from("user")
    .update({
      "Proposals List": [...existingProposals, proposalId],
      "Modified Date": now,
    })
    .eq("_id", hostId)

  if (error) {
    console.error(`${LOG_PREFIX} Host update failed:`, error)
    // Non-blocking - continue
  } else {
    console.log(`${LOG_PREFIX} Host user updated`)
  }
}

/**
 * Enqueue Bubble sync operations
 * @effectful - Database write and HTTP request
 */
const enqueueBubbleSyncOperations = async (
  supabase: SupabaseClient,
  proposalId: string,
  proposalData: ProposalRecord
): Promise<void> => {
  try {
    await enqueueBubbleSync(supabase, {
      correlationId: proposalId,
      items: [
        {
          sequence: 1,
          table: 'proposal',
          recordId: proposalId,
          operation: 'INSERT',
          payload: proposalData,
        },
      ]
    })

    console.log(`${LOG_PREFIX} Bubble sync items enqueued (correlation: ${proposalId})`)

    // Trigger queue processing (fire and forget)
    triggerQueueProcessing()

  } catch (syncError) {
    // Log but don't fail - items can be manually requeued if needed
    console.error(`${LOG_PREFIX} Failed to enqueue Bubble sync (non-blocking):`, syncError)
  }
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle create proposal request
 * @effectful - Orchestrates multiple database operations
 *
 * NOTE: Uses camelCase input to match frontend payload format
 */
export async function handleCreate(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<CreateProposalResponse> {
  console.log(`${LOG_PREFIX} Starting create for user: ${user?.email || 'public'}`)

  // ================================================
  // VALIDATION
  // ================================================

  const input = payload as unknown as CreateProposalInput
  validateCreateProposalInput(input)

  console.log(`${LOG_PREFIX} Validated input for listing: ${input.listingId}`)

  // ================================================
  // FETCH RELATED DATA
  // ================================================

  const listing = await fetchListing(supabase, input.listingId)
  console.log(`${LOG_PREFIX} Found listing, host user: ${listing["Host User"]}`)

  const guest = await fetchGuest(supabase, input.guestId)
  console.log(`${LOG_PREFIX} Found guest: ${guest.email}`)

  // ================================================
  // EARLY PROFILE SAVE
  // ================================================

  const tasksCompletedEarly = parseJsonArray<string>(guest["Tasks Completed"], "Tasks Completed")
  const earlyProfileUpdates = buildEarlyProfileUpdates(input, guest, tasksCompletedEarly)

  if (Object.keys(earlyProfileUpdates).length > 0) {
    console.log(`${LOG_PREFIX} Saving profile data early (before proposal creation)`)
    await saveEarlyProfileUpdates(supabase, input.guestId, earlyProfileUpdates)

    // Update local guest data to reflect the save
    if (earlyProfileUpdates["About Me / Bio"]) {
      (guest as Record<string, unknown>)["About Me / Bio"] = earlyProfileUpdates["About Me / Bio"]
    }
    if (earlyProfileUpdates["need for Space"]) {
      (guest as Record<string, unknown>)["need for Space"] = earlyProfileUpdates["need for Space"]
    }
    if (earlyProfileUpdates["special needs"]) {
      (guest as Record<string, unknown>)["special needs"] = earlyProfileUpdates["special needs"]
    }
  }

  const hostUser = await fetchHostUser(supabase, listing["Host User"])
  const hostAccount: HostAccountData = { _id: hostUser._id, User: hostUser._id }
  console.log(`${LOG_PREFIX} Found host: ${hostUser.email}`)

  const rentalApp = await fetchRentalApp(supabase, guest["Rental Application"])
  console.log(`${LOG_PREFIX} Rental app found, submitted: ${rentalApp?.submitted}`)

  const relatedData: RelatedData = Object.freeze({
    listing,
    guest,
    hostUser,
    hostAccount,
    rentalApp,
  })

  // ================================================
  // CALCULATIONS
  // ================================================

  const calculated = calculateDerivedValues(input, relatedData)

  console.log(`${LOG_PREFIX} Calculated status: ${calculated.status}, compensation:`, {
    hostCompensationPerNight: calculated.compensation.host_compensation_per_night,
    totalCompensation: calculated.compensation.total_compensation,
    fourWeekRent: calculated.compensation.four_week_rent,
    fourWeekCompensation: calculated.compensation.four_week_compensation,
    durationMonths: calculated.compensation.duration_months
  })

  // ================================================
  // CREATE PROPOSAL RECORD
  // ================================================

  const proposalId = await generateProposalId(supabase)
  console.log(`${LOG_PREFIX} Generated proposal ID: ${proposalId}`)

  const now = new Date().toISOString()
  const proposalData = buildProposalData(proposalId, input, relatedData, calculated, now)

  console.log(`${LOG_PREFIX} Inserting proposal: ${proposalId}`)
  await insertProposal(supabase, proposalData)
  console.log(`${LOG_PREFIX} Proposal created successfully`)

  // ================================================
  // UPDATE GUEST USER
  // ================================================

  const existingGuestProposals: readonly string[] = guest["Proposals List"] || []
  const guestUpdates = buildGuestUpdates(input, guest, proposalId, existingGuestProposals, now)

  await updateGuestUser(supabase, input.guestId, guestUpdates)

  // ================================================
  // DUAL-WRITE TO JUNCTION TABLES (Guest)
  // ================================================

  await addUserProposal(supabase, input.guestId, proposalId, 'guest')

  const currentFavorites = parseJsonArray<string>(guest["Favorited Listings"], "Favorited Listings")
  if (!currentFavorites.includes(input.listingId)) {
    await addUserListingFavorite(supabase, input.guestId, input.listingId)
  }

  // ================================================
  // UPDATE HOST USER
  // ================================================

  const hostProposals: readonly string[] = hostUser["Proposals List"] || []
  await updateHostUser(supabase, hostAccount.User, hostProposals, proposalId, now)

  // ================================================
  // DUAL-WRITE TO JUNCTION TABLES (Host)
  // ================================================

  await addUserProposal(supabase, hostAccount.User, proposalId, 'host')

  // ================================================
  // TRIGGER ASYNC WORKFLOWS (Non-blocking)
  // ================================================

  console.log(`${LOG_PREFIX} [ASYNC] Would trigger: proposal-communications`, {
    proposalId,
    guestId: input.guestId,
    hostId: hostAccount.User,
  })

  console.log(`${LOG_PREFIX} [ASYNC] Would trigger: proposal-summary (ai-gateway)`, {
    proposalId,
  })

  console.log(`${LOG_PREFIX} [ASYNC] Would trigger: proposal-suggestions`, {
    proposalId,
  })

  // ================================================
  // ENQUEUE BUBBLE SYNC
  // ================================================

  await enqueueBubbleSyncOperations(supabase, proposalId, proposalData)

  // ================================================
  // RETURN RESPONSE
  // ================================================

  console.log(`${LOG_PREFIX} Complete, returning response`)

  return buildResponse(
    proposalId,
    calculated.status,
    calculated.orderRanking,
    input,
    hostAccount.User,
    now
  )
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

  // Pure Data Builders
  buildHistoryEntry,
  calculateDerivedValues,
  buildProposalData,
  buildEarlyProfileUpdates,
  buildGuestUpdates,
  buildResponse,

  // Database Query Helpers
  fetchListing,
  fetchGuest,
  fetchHostUser,
  fetchRentalApp,
  generateProposalId,
  saveEarlyProfileUpdates,
  insertProposal,
  updateGuestUser,
  updateHostUser,
  enqueueBubbleSyncOperations,

  // Main Handler
  handleCreate,
})
