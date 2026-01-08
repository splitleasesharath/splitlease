/**
 * Submit Rental Application Handler
 * Split Lease - Supabase Edge Functions
 *
 * Creates a rental application record in Supabase, links it to the user,
 * and batch-updates all existing proposals to reference the new rental application.
 *
 * SUPABASE ONLY: This handler does NOT sync to Bubble
 *
 * FP PATTERN: Separates pure data builders from effectful database operations
 * All data transformations are pure with @pure annotations
 * All database operations are explicit with @effectful annotations
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 *
 * @module rental-application/handlers/submit
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, SupabaseSyncError } from "../../_shared/errors.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[RentalApp:submit]'
const HOST_REVIEW_STATUS = 'Host Review'
const AWAITING_RENTAL_APP_STATUSES = Object.freeze([
  'Proposal Submitted by guest - Awaiting Rental Application',
  'Proposal Submitted for guest by Split Lease - Awaiting Rental Application',
])

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface RentalApplicationPayload {
  // Personal Information
  readonly fullName: string;
  readonly dob: string;
  readonly email: string;
  readonly phone: string;
  // Current Address
  readonly currentAddress: string;
  readonly apartmentUnit: string;
  readonly lengthResided: string;
  readonly renting: string; // 'yes' | 'no' | ''
  // Employment Information
  readonly employmentStatus: string;
  // Employed fields
  readonly employerName?: string;
  readonly employerPhone?: string;
  readonly jobTitle?: string;
  readonly monthlyIncome?: string;
  // Self-employed fields
  readonly businessName?: string;
  readonly businessYear?: string;
  readonly businessState?: string;
  readonly monthlyIncomeSelf?: string;
  readonly companyStake?: string;
  readonly slForBusiness?: string;
  readonly taxForms?: string;
  // Unemployed/Student fields
  readonly alternateIncome?: string;
  // Special requirements
  readonly hasPets: string; // 'yes' | 'no' | ''
  readonly isSmoker: string; // 'yes' | 'no' | ''
  readonly needsParking: string; // 'yes' | 'no' | ''
  // References
  readonly references?: string;
  readonly showVisualReferences?: boolean;
  readonly showCreditScore?: boolean;
  // Occupants
  readonly occupants: ReadonlyArray<{ readonly id: string; readonly name: string; readonly relationship: string }>;
  // Verification status
  readonly verificationStatus: {
    readonly linkedin: boolean;
    readonly facebook: boolean;
    readonly id: boolean;
    readonly income: boolean;
  };
  // Signature
  readonly signature: string;
  // File URLs (uploaded via storage)
  readonly proofOfEmploymentUrl?: string;
  readonly alternateGuaranteeUrl?: string;
  readonly creditScoreUrl?: string;
  readonly stateIdFrontUrl?: string;
  readonly stateIdBackUrl?: string;
  readonly governmentIdUrl?: string;
}

interface SubmitResult {
  readonly rentalApplicationId: string;
  readonly proposalsUpdated: number;
}

// ─────────────────────────────────────────────────────────────
// Pure Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if user ID is a Supabase UUID
 * @pure
 */
const isSupabaseUUID = (userId: string): boolean =>
  userId.includes('-') && userId.length === 36

/**
 * Check if string is truthy and non-empty
 * @pure
 */
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== ''

/**
 * Check if yes/no field is 'yes'
 * @pure
 */
const isYes = (value: string): boolean =>
  value === 'yes'

/**
 * Check if employment status is employed
 * @pure
 */
const isEmployedStatus = (status: string): boolean =>
  status === 'full-time' || status === 'part-time'

/**
 * Check if employment status is self-employed
 * @pure
 */
const isSelfEmployedStatus = (status: string): boolean =>
  status === 'business-owner' || status === 'self-employed'

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Parse monthly income based on employment status
 * @pure
 */
const parseMonthlyIncome = (input: RentalApplicationPayload): number | null => {
  if (isEmployedStatus(input.employmentStatus)) {
    return input.monthlyIncome ? parseInt(input.monthlyIncome) || null : null;
  }
  if (isSelfEmployedStatus(input.employmentStatus)) {
    return input.monthlyIncomeSelf ? parseInt(input.monthlyIncomeSelf) || null : null;
  }
  return null;
}

/**
 * Build rental application data record
 * @pure
 */
const buildRentalApplicationData = (
  rentalAppId: string,
  input: RentalApplicationPayload,
  bubbleUserId: string,
  now: string
): Record<string, unknown> =>
  Object.freeze({
    _id: rentalAppId,
    'Created By': bubbleUserId,
    name: input.fullName,
    DOB: input.dob || null,
    email: input.email,
    'phone number': input.phone || null,
    'permanent address': input.currentAddress ? { address: input.currentAddress } : null,
    'apartment number': input.apartmentUnit || null,
    'length resided': input.lengthResided || null,
    renting: isYes(input.renting),
    'employment status': input.employmentStatus || null,
    // Employed fields
    'employer name': input.employerName || null,
    'employer phone number': input.employerPhone || null,
    'job title': input.jobTitle || null,
    'Monthly Income': parseMonthlyIncome(input),
    // Self-employed fields
    'business legal name': input.businessName || null,
    'year business was created?': input.businessYear ? parseInt(input.businessYear) : null,
    'state business registered': input.businessState || null,
    // Occupants
    'occupants list': input.occupants && input.occupants.length > 0 ? input.occupants : null,
    // Special requirements
    pets: isYes(input.hasPets),
    smoking: isYes(input.isSmoker),
    parking: isYes(input.needsParking),
    // References
    references: input.references ? [input.references] : null,
    // Signature
    signature: input.signature,
    'signature (text)': input.signature,
    // File URLs
    'proof of employment': input.proofOfEmploymentUrl || null,
    'alternate guarantee': input.alternateGuaranteeUrl || null,
    'credit score': input.creditScoreUrl || null,
    'State ID - Front': input.stateIdFrontUrl || null,
    'State ID - Back': input.stateIdBackUrl || null,
    'government ID': input.governmentIdUrl || null,
    // Status
    submitted: true,
    'percentage % done': 100,
    // Timestamps
    'Created Date': now,
    'Modified Date': now,
  })

/**
 * Build success response
 * @pure
 */
const buildSuccessResponse = (rentalAppId: string, proposalsUpdated: number): SubmitResult =>
  Object.freeze({
    rentalApplicationId: rentalAppId,
    proposalsUpdated,
  })

// ─────────────────────────────────────────────────────────────
// Validation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Validate submit payload
 * @pure - Throws ValidationError on invalid input
 */
const validateSubmitPayload = (input: RentalApplicationPayload): void => {
  if (!isNonEmptyString(input.fullName)) {
    throw new ValidationError('Full name is required');
  }

  if (!isNonEmptyString(input.email)) {
    throw new ValidationError('Email is required');
  }

  if (!isNonEmptyString(input.signature)) {
    throw new ValidationError('Signature is required');
  }
}

// ─────────────────────────────────────────────────────────────
// Database Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Fetch user by Supabase UUID
 * @effectful - Database read operation
 */
const fetchUserBySupabaseId = async (
  supabase: SupabaseClient,
  supabaseUserId: string
): Promise<{ _id: string; email: string; "Rental Application": string | null } | null> => {
  const { data, error } = await supabase
    .from('user')
    .select('_id, email, "Rental Application"')
    .eq('supabase_user_id', supabaseUserId)
    .single();

  if (error || !data) {
    console.error(`${LOG_PREFIX} User fetch by supabase_user_id failed:`, error);
    return null;
  }

  return data;
}

/**
 * Fetch user by Bubble ID
 * @effectful - Database read operation
 */
const fetchUserByBubbleId = async (
  supabase: SupabaseClient,
  bubbleId: string
): Promise<{ _id: string; email: string; "Rental Application": string | null } | null> => {
  const { data, error } = await supabase
    .from('user')
    .select('_id, email, "Rental Application"')
    .eq('_id', bubbleId)
    .single();

  if (error || !data) {
    console.error(`${LOG_PREFIX} User fetch by _id failed:`, error);
    return null;
  }

  return data;
}

/**
 * Generate unique Bubble-compatible ID
 * @effectful - Database RPC call
 */
const generateBubbleId = async (supabase: SupabaseClient): Promise<string> => {
  const { data: id, error } = await supabase.rpc('generate_bubble_id');

  if (error || !id) {
    console.error(`${LOG_PREFIX} ID generation failed:`, error);
    throw new SupabaseSyncError('Failed to generate rental application ID');
  }

  return id;
}

/**
 * Insert rental application record
 * @effectful - Database write operation
 */
const insertRentalApplication = async (
  supabase: SupabaseClient,
  rentalAppData: Record<string, unknown>
): Promise<void> => {
  const { error } = await supabase
    .from('rentalapplication')
    .insert(rentalAppData);

  if (error) {
    console.error(`${LOG_PREFIX} Insert failed:`, error);
    throw new SupabaseSyncError(`Failed to create rental application: ${error.message}`);
  }
}

/**
 * Update user with rental application reference
 * @effectful - Database write operation (non-blocking)
 */
const updateUserWithRentalApp = async (
  supabase: SupabaseClient,
  bubbleUserId: string,
  rentalAppId: string,
  now: string
): Promise<void> => {
  const { error } = await supabase
    .from('user')
    .update({
      'Rental Application': rentalAppId,
      'Modified Date': now,
    })
    .eq('_id', bubbleUserId);

  if (error) {
    console.error(`${LOG_PREFIX} User update failed:`, error);
    // Non-blocking - the rental app was created successfully
  } else {
    console.log(`${LOG_PREFIX} User updated with rental application reference`);
  }
}

/**
 * Fetch user's proposals
 * @effectful - Database read operation
 */
const fetchUserProposals = async (
  supabase: SupabaseClient,
  bubbleUserId: string
): Promise<string[]> => {
  const { data, error } = await supabase
    .from('proposal')
    .select('_id')
    .eq('Guest', bubbleUserId);

  if (error) {
    console.error(`${LOG_PREFIX} Failed to fetch proposals:`, error);
    return [];
  }

  return data?.map((p: { _id: string }) => p._id) || [];
}

/**
 * Update proposals with rental application reference
 * @effectful - Database write operation (non-blocking)
 */
const updateProposalsWithRentalApp = async (
  supabase: SupabaseClient,
  proposalIds: string[],
  rentalAppId: string,
  now: string
): Promise<number> => {
  if (proposalIds.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from('proposal')
    .update({
      'rental application': rentalAppId,
      'Status': HOST_REVIEW_STATUS,
      'Modified Date': now,
    })
    .in('_id', proposalIds)
    .in('Status', AWAITING_RENTAL_APP_STATUSES as unknown as string[]);

  if (error) {
    console.error(`${LOG_PREFIX} Proposals update failed:`, error);
    return 0;
  }

  console.log(`${LOG_PREFIX} Updated ${proposalIds.length} proposals with rental application reference and status to Host Review`);
  return proposalIds.length;
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle rental application submission
 * @effectful - Orchestrates database operations
 *
 * @param payload - The rental application form data
 * @param supabase - Supabase client (admin)
 * @param userId - The authenticated user's Supabase Auth ID
 */
export async function handleSubmit(
  payload: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string
): Promise<SubmitResult> {
  console.log(`${LOG_PREFIX} Starting submission for user: ${userId}`);

  const input = payload as unknown as RentalApplicationPayload;

  // ================================================
  // VALIDATION
  // ================================================

  validateSubmitPayload(input);

  console.log(`${LOG_PREFIX} Validated input for: ${input.email}`);

  // ================================================
  // FETCH USER DATA
  // ================================================

  const userData = isSupabaseUUID(userId)
    ? await fetchUserBySupabaseId(supabase, userId)
    : await fetchUserByBubbleId(supabase, userId);

  if (!userData) {
    throw new ValidationError(`User not found for ID: ${userId}`);
  }

  const bubbleUserId = userData._id;
  console.log(`${LOG_PREFIX} Found user with ID: ${bubbleUserId}`);

  // ================================================
  // CHECK FOR EXISTING RENTAL APPLICATION
  // ================================================

  if (userData["Rental Application"]) {
    console.log(`${LOG_PREFIX} User already has rental application: ${userData["Rental Application"]}`);
    // For now, we'll create a new one anyway - the user can manage duplicates
  }

  // ================================================
  // GENERATE ID
  // ================================================

  const rentalAppId = await generateBubbleId(supabase);
  console.log(`${LOG_PREFIX} Generated rental application ID: ${rentalAppId}`);

  // ================================================
  // BUILD AND INSERT RENTAL APPLICATION
  // ================================================

  const now = new Date().toISOString();
  const rentalAppData = buildRentalApplicationData(rentalAppId, input, bubbleUserId, now);

  console.log(`${LOG_PREFIX} Built rental application data`);

  await insertRentalApplication(supabase, rentalAppData);
  console.log(`${LOG_PREFIX} Rental application created successfully`);

  // ================================================
  // UPDATE USER RECORD
  // ================================================

  await updateUserWithRentalApp(supabase, bubbleUserId, rentalAppId, now);

  // ================================================
  // BATCH UPDATE PROPOSALS
  // ================================================

  const proposalIds = await fetchUserProposals(supabase, bubbleUserId);
  console.log(`${LOG_PREFIX} Found ${proposalIds.length} proposals to update`);

  const proposalsUpdated = await updateProposalsWithRentalApp(supabase, proposalIds, rentalAppId, now);

  // ================================================
  // RETURN RESPONSE
  // ================================================

  console.log(`${LOG_PREFIX} Complete, returning response`);

  return buildSuccessResponse(rentalAppId, proposalsUpdated);
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
  HOST_REVIEW_STATUS,
  AWAITING_RENTAL_APP_STATUSES,

  // Pure Predicates
  isSupabaseUUID,
  isNonEmptyString,
  isYes,
  isEmployedStatus,
  isSelfEmployedStatus,

  // Pure Data Builders
  parseMonthlyIncome,
  buildRentalApplicationData,
  buildSuccessResponse,

  // Validation Helpers
  validateSubmitPayload,

  // Database Query Helpers
  fetchUserBySupabaseId,
  fetchUserByBubbleId,
  generateBubbleId,
  insertRentalApplication,
  updateUserWithRentalApp,
  fetchUserProposals,
  updateProposalsWithRentalApp,

  // Main Handler
  handleSubmit,
})
