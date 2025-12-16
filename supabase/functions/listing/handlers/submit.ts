/**
 * Listing Full Submission Handler
 * Priority: CRITICAL
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
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { enqueueBubbleSync, triggerQueueProcessing } from '../../_shared/queueSync.ts';
import { parseJsonArray } from '../../_shared/jsonUtils.ts';
import { handleCreateMockupProposal } from './createMockupProposal.ts';

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
  listing_id: string;
  user_email: string;
  user_unique_id?: string;
  listing_data: ListingSubmissionData;
}

interface SubmitListingResult {
  _id: string;
  listing_id: string;
  status: string;
  name: string;
  message: string;
  [key: string]: unknown;
}

/**
 * Map frontend field names to Supabase column names
 * Some Supabase columns have different names or special characters
 */
function mapFieldsToSupabase(data: ListingSubmissionData): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  // Direct mappings (same name)
  const directFields = [
    'Name', 'Status', 'Active', 'Description of Lodging',
    'Bedrooms', 'Beds', 'Bathrooms', 'Address', 'City', 'State', 'Zip',
  ];

  for (const field of directFields) {
    if (data[field] !== undefined) {
      mapped[field] = data[field];
    }
  }

  // Special mappings (different column names)
  if (data['Type of Space'] !== undefined) {
    mapped['Features - Type of Space'] = data['Type of Space'];
  }
  if (data['Type of Kitchen'] !== undefined) {
    mapped['Features - Kitchen'] = data['Type of Kitchen'];
  }
  if (data['Type of Parking'] !== undefined) {
    mapped['Features - Parking'] = data['Type of Parking'];
  }
  if (data['Neighborhood'] !== undefined) {
    mapped['Location - Hood'] = data['Neighborhood'];
  }
  if (data['Amenities Inside Unit'] !== undefined) {
    mapped['Features - Amenities In-Unit'] = data['Amenities Inside Unit'];
  }
  if (data['Amenities Outside Unit'] !== undefined) {
    mapped['Features - Amenities Building'] = data['Amenities Outside Unit'];
  }
  if (data['House Rules'] !== undefined) {
    mapped['Features - House Rules'] = data['House Rules'];
  }
  if (data['Safety Features'] !== undefined) {
    mapped['Features - Safety'] = data['Safety Features'];
  }
  if (data['Rental Type'] !== undefined) {
    mapped['rental type'] = data['Rental Type'];
  }
  if (data['Available Nights'] !== undefined) {
    mapped['Nights Available (List of Nights) '] = data['Available Nights'];
    mapped['Days Available (List of Days)'] = data['Available Nights'];
  }
  if (data['Weekly Pattern'] !== undefined) {
    mapped['Weeks offered'] = data['Weekly Pattern'];
  }
  if (data['Damage Deposit'] !== undefined) {
    mapped['💰Damage Deposit'] = data['Damage Deposit'];
  }
  if (data['Maintenance Fee'] !== undefined) {
    mapped['💰Cleaning Cost / Maintenance Fee'] = data['Maintenance Fee'];
  }
  if (data['Monthly Compensation'] !== undefined) {
    mapped['💰Monthly Host Rate'] = data['Monthly Compensation'];
  }
  if (data['Weekly Compensation'] !== undefined) {
    mapped['💰Weekly Host Rate'] = data['Weekly Compensation'];
  }
  if (data['Cancellation Policy'] !== undefined) {
    mapped['Cancellation Policy'] = data['Cancellation Policy'];
  }
  if (data['Preferred Gender'] !== undefined) {
    mapped['Guest - Preferred Gender'] = data['Preferred Gender'];
  }
  if (data['Number of Guests'] !== undefined) {
    mapped['Guest - Number Allowed'] = data['Number of Guests'];
  }
  if (data['Check-In Time'] !== undefined) {
    mapped['Check-in Time'] = data['Check-In Time'];
  }
  if (data['Check-Out Time'] !== undefined) {
    mapped['Check-out Time'] = data['Check-Out Time'];
  }
  if (data['Ideal Min Duration'] !== undefined) {
    mapped['Minimum Nights'] = data['Ideal Min Duration'];
  }
  if (data['Ideal Max Duration'] !== undefined) {
    mapped['Maximum Nights'] = data['Ideal Max Duration'];
  }
  if (data['First Day Available'] !== undefined) {
    mapped[' First Available'] = data['First Day Available'];
  }
  if (data['Square Footage'] !== undefined) {
    mapped['Square Footage'] = data['Square Footage'];
  }
  if (data['Latitude'] !== undefined && data['Longitude'] !== undefined) {
    mapped['Location - Address'] = {
      lat: data['Latitude'],
      lng: data['Longitude'],
      address: data['Address'] || '',
    };
  }

  // Map nightly prices
  if (data['Price 2 nights selected'] !== undefined) {
    mapped['💰Nightly Host Rate for 2 nights'] = data['Price 2 nights selected'];
  }
  if (data['Price 3 nights selected'] !== undefined) {
    mapped['💰Nightly Host Rate for 3 nights'] = data['Price 3 nights selected'];
  }
  if (data['Price 4 nights selected'] !== undefined) {
    mapped['💰Nightly Host Rate for 4 nights'] = data['Price 4 nights selected'];
  }
  if (data['Price 5 nights selected'] !== undefined) {
    mapped['💰Nightly Host Rate for 5 nights'] = data['Price 5 nights selected'];
  }

  return mapped;
}

/**
 * Handle full listing submission with Supabase-first pattern
 * Called after user signup/login with complete form data
 */
export async function handleSubmit(
  payload: Record<string, unknown>
): Promise<SubmitListingResult> {
  console.log('[listing:submit] ========== SUBMIT LISTING (SUPABASE-FIRST) ==========');
  console.log('[listing:submit] Payload keys:', Object.keys(payload));

  // Validate required fields
  validateRequiredFields(payload, ['listing_id', 'user_email', 'listing_data']);

  const { listing_id, user_email, user_unique_id, listing_data } = payload as SubmitListingPayload;

  // Get environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required environment variables');
  }

  // Initialize Supabase admin client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('[listing:submit] Listing ID:', listing_id);
  console.log('[listing:submit] User Email:', user_email);
  console.log('[listing:submit] User Unique ID:', user_unique_id || 'Not provided');

  try {
    // Step 1: Verify listing exists
    console.log('[listing:submit] Step 1/5: Verifying listing exists...');
    const { data: existingListing, error: fetchError } = await supabase
      .from('listing')
      .select('_id, Name, Status')
      .eq('_id', listing_id)
      .single();

    if (fetchError || !existingListing) {
      console.error('[listing:submit] Listing not found:', listing_id);
      throw new Error(`Listing not found: ${listing_id}`);
    }

    console.log('[listing:submit] ✅ Step 1 complete - Listing exists:', existingListing.Name);

    // Step 2: Look up user
    console.log('[listing:submit] Step 2/5: Looking up user...');
    const { data: userData } = await supabase
      .from('user')
      .select('_id')
      .eq('email', user_email.toLowerCase())
      .single();

    let userId: string | null = null;

    if (userData) {
      userId = userData._id;
      console.log('[listing:submit] ✅ Step 2 complete - User found:', userId);
    } else {
      console.log('[listing:submit] ⚠️ Step 2 warning - User not found for email:', user_email);
    }

    // Step 3: Update listing in Supabase
    console.log('[listing:submit] Step 3/5: Updating listing in Supabase...');
    const now = new Date().toISOString();

    // Map frontend fields to Supabase columns
    const mappedData = mapFieldsToSupabase(listing_data);

    // Build update object
    const updateData: Record<string, unknown> = {
      ...mappedData,
      'Modified Date': now,
      Status: listing_data['Status'] || 'Pending Review',
    };

    // Attach user if found (new pattern: Host / Landlord = user._id, not account_host._id)
    if (userId) {
      updateData['Host / Landlord'] = userId;
      updateData['Created By'] = userId;
    }

    const { error: updateError } = await supabase
      .from('listing')
      .update(updateData)
      .eq('_id', listing_id);

    if (updateError) {
      console.error('[listing:submit] Update failed:', updateError);
      throw new Error(`Failed to update listing: ${updateError.message}`);
    }

    console.log('[listing:submit] ✅ Step 3 complete - Listing updated in Supabase');

    // Step 4: Queue Bubble sync (UPDATE operation)
    console.log('[listing:submit] Step 4/5: Queueing Bubble sync...');
    try {
      await enqueueBubbleSync(supabase, {
        correlationId: `listing_submit:${listing_id}:${Date.now()}`,
        items: [{
          sequence: 1,
          table: 'listing',
          recordId: listing_id,
          operation: 'UPDATE',
          bubbleId: listing_id,  // The _id is the bubble_id
          payload: {
            ...updateData,
            _id: listing_id,
          },
        }]
      });

      console.log('[listing:submit] ✅ Step 4 complete - Bubble sync queued');

      // Trigger queue processing (fire-and-forget)
      // pg_cron will also process the queue as a fallback
      triggerQueueProcessing();
    } catch (syncError) {
      // Log but don't fail - sync can be retried via pg_cron
      console.error('[listing:submit] ⚠️ Step 4 warning - Queue error (non-blocking):', syncError);
    }

    // Step 5: Check if first listing and create mockup proposal
    if (userId) {
      try {
        console.log('[listing:submit] Step 5/5: Checking for first listing...');

        // Get user's listings count directly from user table
        const { data: hostUserData } = await supabase
          .from('user')
          .select('"Listings"')
          .eq('_id', userId)
          .single();

        const listings = parseJsonArray<string>(hostUserData?.Listings, 'user.Listings');

        if (listings.length === 1) {
          console.log('[listing:submit] First listing detected, creating mockup proposal');

          await handleCreateMockupProposal(supabase, {
            listingId: listing_id,
            hostUserId: userId,
            hostEmail: user_email,
          });

          console.log('[listing:submit] ✅ Step 5 complete - Mockup proposal created');
        } else {
          console.log(`[listing:submit] ⏭️ Step 5 skipped - Not first listing (count: ${listings.length})`);
        }
      } catch (mockupError) {
        // Non-blocking - log but don't fail listing submission
        console.warn('[listing:submit] ⚠️ Mockup proposal creation failed (non-blocking):', mockupError);
      }
    } else {
      console.log('[listing:submit] ⏭️ Step 5 skipped - User not found');
    }

    console.log('[listing:submit] ========== SUCCESS ==========');

    // Return the updated listing data
    return {
      _id: listing_id,
      listing_id: listing_id,
      status: (listing_data['Status'] as string) || 'Pending Review',
      name: (listing_data['Name'] as string) || existingListing.Name,
      message: 'Listing submitted successfully',
      ...updateData
    };
  } catch (error) {
    console.error('[listing:submit] ========== ERROR ==========');
    console.error('[listing:submit] Failed to submit listing:', error);
    throw error;
  }
}
