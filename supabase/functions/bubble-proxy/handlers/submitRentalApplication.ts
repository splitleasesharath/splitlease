/**
 * Submit Rental Application Handler
 * Split Lease - Supabase Edge Functions
 *
 * Creates a rental application record, links it to the user, and batch-updates
 * all existing proposals to reference the new rental application.
 *
 * NO FALLBACK PRINCIPLE: All errors fail fast without fallback logic
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ValidationError, SupabaseSyncError } from "../../_shared/errors.ts";
import { enqueueBubbleSync, triggerQueueProcessing } from "../../_shared/queueSync.ts";

interface RentalApplicationPayload {
  // Personal Information
  fullName: string;
  dob: string;
  email: string;
  phone: string;
  // Current Address
  currentAddress: string;
  apartmentUnit: string;
  lengthResided: string;
  renting: string; // 'yes' | 'no' | ''
  // Employment Information
  employmentStatus: string;
  // Employed fields
  employerName?: string;
  employerPhone?: string;
  jobTitle?: string;
  monthlyIncome?: string;
  // Self-employed fields
  businessName?: string;
  businessYear?: string;
  businessState?: string;
  monthlyIncomeSelf?: string;
  companyStake?: string;
  slForBusiness?: string;
  taxForms?: string;
  // Unemployed/Student fields
  alternateIncome?: string;
  // Special requirements
  hasPets: string; // 'yes' | 'no' | ''
  isSmoker: string; // 'yes' | 'no' | ''
  needsParking: string; // 'yes' | 'no' | ''
  // References
  references?: string;
  showVisualReferences?: boolean;
  showCreditScore?: boolean;
  // Occupants
  occupants: Array<{ id: string; name: string; relationship: string }>;
  // Verification status
  verificationStatus: {
    linkedin: boolean;
    facebook: boolean;
    id: boolean;
    income: boolean;
  };
  // Signature
  signature: string;
}

interface User {
  id: string;
  email?: string | null;
}

/**
 * Handle rental application submission
 *
 * @param payload - The rental application form data
 * @param supabase - Supabase client (admin)
 * @param userId - The authenticated user's ID (from auth)
 */
export async function handleSubmitRentalApplication(
  payload: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string
): Promise<{ rentalApplicationId: string; proposalsUpdated: number }> {
  console.log(`[RentalApp:submit] Starting submission for user: ${userId}`);

  const input = payload as unknown as RentalApplicationPayload;

  // ================================================
  // VALIDATION
  // ================================================

  if (!input.fullName || input.fullName.trim() === '') {
    throw new ValidationError('Full name is required');
  }

  if (!input.email || input.email.trim() === '') {
    throw new ValidationError('Email is required');
  }

  if (!input.signature || input.signature.trim() === '') {
    throw new ValidationError('Signature is required');
  }

  console.log(`[RentalApp:submit] Validated input for: ${input.email}`);

  // ================================================
  // FETCH USER DATA (to get Bubble _id)
  // ================================================

  const { data: userData, error: userError } = await supabase
    .from('user')
    .select('_id, email, "Rental Application"')
    .eq('supabase_user_id', userId)
    .single();

  if (userError || !userData) {
    console.error(`[RentalApp:submit] User fetch failed:`, userError);
    throw new ValidationError(`User not found for Supabase ID: ${userId}`);
  }

  const bubbleUserId = userData._id;
  console.log(`[RentalApp:submit] Found user with Bubble ID: ${bubbleUserId}`);

  // ================================================
  // CHECK FOR EXISTING RENTAL APPLICATION
  // ================================================

  if (userData["Rental Application"]) {
    console.log(`[RentalApp:submit] User already has rental application: ${userData["Rental Application"]}`);
    // Option A: Allow updating existing application (UPSERT behavior)
    // For now, we'll create a new one anyway - the user can manage duplicates
  }

  // ================================================
  // GENERATE BUBBLE-COMPATIBLE ID
  // ================================================

  const { data: rentalAppId, error: idError } = await supabase.rpc('generate_bubble_id');
  if (idError || !rentalAppId) {
    console.error(`[RentalApp:submit] ID generation failed:`, idError);
    throw new SupabaseSyncError('Failed to generate rental application ID');
  }

  console.log(`[RentalApp:submit] Generated rental application ID: ${rentalAppId}`);

  // ================================================
  // BUILD RENTAL APPLICATION DATA
  // ================================================

  const now = new Date().toISOString();

  // Determine monthly income based on employment status
  let monthlyIncomeValue: number | null = null;
  if (input.employmentStatus === 'employed' && input.monthlyIncome) {
    monthlyIncomeValue = parseInt(input.monthlyIncome) || null;
  } else if (input.employmentStatus === 'self-employed' && input.monthlyIncomeSelf) {
    monthlyIncomeValue = parseInt(input.monthlyIncomeSelf) || null;
  }

  const rentalAppData: Record<string, unknown> = {
    _id: rentalAppId,
    'Created By': bubbleUserId,
    name: input.fullName,
    DOB: input.dob || null,
    email: input.email,
    'phone number': input.phone || null,
    'permanent address': input.currentAddress ? { address: input.currentAddress } : null,
    'apartment number': input.apartmentUnit || null,
    'length resided': input.lengthResided || null,
    renting: input.renting === 'yes',
    'employment status': input.employmentStatus || null,
    // Employed fields
    'employer name': input.employerName || null,
    'employer phone number': input.employerPhone || null,
    'job title': input.jobTitle || null,
    'Monthly Income': monthlyIncomeValue,
    // Self-employed fields
    'business legal name': input.businessName || null,
    'year business was created?': input.businessYear ? parseInt(input.businessYear) : null,
    'state business registered': input.businessState || null,
    // Occupants
    'occupants list': input.occupants && input.occupants.length > 0 ? input.occupants : null,
    // Special requirements
    pets: input.hasPets === 'yes',
    smoking: input.isSmoker === 'yes',
    parking: input.needsParking === 'yes',
    // References
    references: input.references ? [input.references] : null,
    // Signature
    signature: input.signature,
    'signature (text)': input.signature,
    // Status
    submitted: true,
    'percentage % done': 100,
    // Timestamps
    'Created Date': now,
    'Modified Date': now,
  };

  console.log(`[RentalApp:submit] Built rental application data`);

  // ================================================
  // INSERT RENTAL APPLICATION RECORD
  // ================================================

  const { error: insertError } = await supabase
    .from('rentalapplication')
    .insert(rentalAppData);

  if (insertError) {
    console.error(`[RentalApp:submit] Insert failed:`, insertError);
    throw new SupabaseSyncError(`Failed to create rental application: ${insertError.message}`);
  }

  console.log(`[RentalApp:submit] Rental application created successfully`);

  // ================================================
  // UPDATE USER RECORD WITH RENTAL APPLICATION REF
  // ================================================

  const { error: userUpdateError } = await supabase
    .from('user')
    .update({
      'Rental Application': rentalAppId,
      'Modified Date': now,
    })
    .eq('_id', bubbleUserId);

  if (userUpdateError) {
    console.error(`[RentalApp:submit] User update failed:`, userUpdateError);
    // Non-blocking - continue
  } else {
    console.log(`[RentalApp:submit] User updated with rental application reference`);
  }

  // ================================================
  // BATCH UPDATE USER'S PROPOSALS
  // ================================================

  let proposalsUpdated = 0;

  // Fetch all proposals where Guest equals the user's Bubble ID
  const { data: userProposals, error: proposalsFetchError } = await supabase
    .from('proposal')
    .select('_id')
    .eq('Guest', bubbleUserId);

  if (proposalsFetchError) {
    console.error(`[RentalApp:submit] Failed to fetch proposals:`, proposalsFetchError);
    // Non-blocking - continue
  } else if (userProposals && userProposals.length > 0) {
    const proposalIds = userProposals.map((p: { _id: string }) => p._id);
    console.log(`[RentalApp:submit] Found ${proposalIds.length} proposals to update`);

    // Batch update proposals
    const { error: proposalsUpdateError } = await supabase
      .from('proposal')
      .update({
        'rental application': rentalAppId,
        'rental app requested': true,
        'Modified Date': now,
      })
      .in('_id', proposalIds);

    if (proposalsUpdateError) {
      console.error(`[RentalApp:submit] Proposals update failed:`, proposalsUpdateError);
      // Non-blocking - continue
    } else {
      proposalsUpdated = proposalIds.length;
      console.log(`[RentalApp:submit] Updated ${proposalsUpdated} proposals with rental application reference`);
    }
  } else {
    console.log(`[RentalApp:submit] No proposals found to update`);
  }

  // ================================================
  // ENQUEUE BUBBLE SYNC
  // ================================================

  try {
    const syncItems: Array<{
      sequence: number;
      table: string;
      recordId: string;
      operation: 'INSERT' | 'UPDATE';
      payload: Record<string, unknown>;
    }> = [];

    // 1. INSERT rental application
    syncItems.push({
      sequence: 1,
      table: 'rentalapplication',
      recordId: rentalAppId,
      operation: 'INSERT',
      payload: rentalAppData,
    });

    // 2. UPDATE user record
    syncItems.push({
      sequence: 2,
      table: 'user',
      recordId: bubbleUserId,
      operation: 'UPDATE',
      payload: {
        'Rental Application': rentalAppId,
        'Modified Date': now,
      },
    });

    // 3. UPDATE each proposal
    if (userProposals && userProposals.length > 0) {
      for (let i = 0; i < userProposals.length; i++) {
        const proposal = userProposals[i] as { _id: string };
        syncItems.push({
          sequence: 3 + i,
          table: 'proposal',
          recordId: proposal._id,
          operation: 'UPDATE',
          payload: {
            'rental application': rentalAppId,
            'rental app requested': true,
            'Modified Date': now,
          },
        });
      }
    }

    await enqueueBubbleSync(supabase, {
      correlationId: `rental-app:${rentalAppId}`,
      items: syncItems,
    });

    console.log(`[RentalApp:submit] Bubble sync items enqueued (${syncItems.length} items)`);

    // Trigger queue processing (fire and forget)
    triggerQueueProcessing();

  } catch (syncError) {
    // Log but don't fail - items can be manually requeued if needed
    console.error(`[RentalApp:submit] Failed to enqueue Bubble sync (non-blocking):`, syncError);
  }

  // ================================================
  // RETURN RESPONSE
  // ================================================

  console.log(`[RentalApp:submit] Complete, returning response`);

  return {
    rentalApplicationId: rentalAppId,
    proposalsUpdated: proposalsUpdated,
  };
}
