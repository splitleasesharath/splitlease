/**
 * Listing Full Submission Handler
 * Priority: CRITICAL
 *
 * Handles full listing submission with all form data:
 * 1. Update listing in Bubble with all fields - REQUIRED
 * 2. Attach user to listing (via user_email or user_id) - REQUIRED
 * 3. Fetch updated listing data from Bubble - REQUIRED
 * 4. Sync to Supabase (replica) - BEST EFFORT
 * 5. Return listing data to client
 *
 * This is called AFTER user signup/login, so we always have user info.
 */

import { BubbleSyncService } from '../../_shared/bubbleSync.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

/**
 * Bubble workflow parameter interface
 * Maps to the listing_full_submission_in_code workflow in Bubble
 */
interface ListingSubmissionParams {
  // Identifiers - REQUIRED
  listing_id: string;
  user_email: string;
  user_unique_id?: string; // Bubble user unique ID from signup

  // Basic Info
  name: string;
  type_of_space: string;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  type_of_kitchen: string;
  type_of_parking: string;

  // Address
  address: string;
  street_number: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  neighborhood: string;
  latitude: number | null;
  longitude: number | null;

  // Amenities (arrays)
  amenities_inside_unit: string[];
  amenities_outside_unit: string[];

  // Descriptions
  description_of_lodging: string;
  neighborhood_description: string;

  // Lease Style
  rental_type: string;
  available_nights: string[]; // ['sunday', 'monday', etc.]
  weekly_pattern: string;

  // Pricing
  damage_deposit: number;
  maintenance_fee: number;
  monthly_compensation: number | null;
  weekly_compensation: number | null;
  price_1_night: number | null;
  price_2_nights: number | null;
  price_3_nights: number | null;
  price_4_nights: number | null;
  price_5_nights: number | null;
  nightly_decay_rate: number | null;

  // Rules
  cancellation_policy: string;
  preferred_gender: string;
  number_of_guests: number;
  check_in_time: string;
  check_out_time: string;
  ideal_min_duration: number;
  ideal_max_duration: number;
  house_rules: string[];
  blocked_dates: string[]; // ISO date strings

  // Safety & Review
  safety_features: string[];
  square_footage: number | null;
  first_day_available: string;
  previous_reviews_link: string;
  optional_notes: string;

  // Status
  status: string;
  is_draft: boolean;
}

/**
 * Transform frontend BubbleListingPayload to workflow parameters
 * Converts PascalCase/space-separated keys to snake_case
 */
function transformPayloadToWorkflowParams(
  payload: Record<string, unknown>,
  listingId: string,
  userEmail: string,
  userUniqueId?: string
): ListingSubmissionParams {
  return {
    // Identifiers
    listing_id: listingId,
    user_email: userEmail,
    user_unique_id: userUniqueId,

    // Basic Info
    name: (payload['Name'] as string) || '',
    type_of_space: (payload['Type of Space'] as string) || '',
    bedrooms: (payload['Bedrooms'] as number) || 0,
    beds: (payload['Beds'] as number) || 0,
    bathrooms: (payload['Bathrooms'] as number) || 0,
    type_of_kitchen: (payload['Type of Kitchen'] as string) || '',
    type_of_parking: (payload['Type of Parking'] as string) || '',

    // Address
    address: (payload['Address'] as string) || '',
    street_number: (payload['Street Number'] as string) || '',
    street: (payload['Street'] as string) || '',
    city: (payload['City'] as string) || '',
    state: (payload['State'] as string) || '',
    zip: (payload['Zip'] as string) || '',
    neighborhood: (payload['Neighborhood'] as string) || '',
    latitude: (payload['Latitude'] as number) ?? null,
    longitude: (payload['Longitude'] as number) ?? null,

    // Amenities
    amenities_inside_unit: (payload['Amenities Inside Unit'] as string[]) || [],
    amenities_outside_unit: (payload['Amenities Outside Unit'] as string[]) || [],

    // Descriptions
    description_of_lodging: (payload['Description of Lodging'] as string) || '',
    neighborhood_description: (payload['Neighborhood Description'] as string) || '',

    // Lease Style
    rental_type: (payload['Rental Type'] as string) || '',
    available_nights: (payload['Available Nights'] as string[]) || [],
    weekly_pattern: (payload['Weekly Pattern'] as string) || '',

    // Pricing
    damage_deposit: (payload['Damage Deposit'] as number) || 500,
    maintenance_fee: (payload['Maintenance Fee'] as number) || 0,
    monthly_compensation: (payload['Monthly Compensation'] as number) ?? null,
    weekly_compensation: (payload['Weekly Compensation'] as number) ?? null,
    price_1_night: (payload['Price 1 night selected'] as number) ?? null,
    price_2_nights: (payload['Price 2 nights selected'] as number) ?? null,
    price_3_nights: (payload['Price 3 nights selected'] as number) ?? null,
    price_4_nights: (payload['Price 4 nights selected'] as number) ?? null,
    price_5_nights: (payload['Price 5 nights selected'] as number) ?? null,
    nightly_decay_rate: (payload['Nightly Decay Rate'] as number) ?? null,

    // Rules
    cancellation_policy: (payload['Cancellation Policy'] as string) || '',
    preferred_gender: (payload['Preferred Gender'] as string) || 'No Preference',
    number_of_guests: (payload['Number of Guests'] as number) || 2,
    check_in_time: (payload['Check-In Time'] as string) || '',
    check_out_time: (payload['Check-Out Time'] as string) || '',
    ideal_min_duration: (payload['Ideal Min Duration'] as number) || 6,
    ideal_max_duration: (payload['Ideal Max Duration'] as number) || 52,
    house_rules: (payload['House Rules'] as string[]) || [],
    blocked_dates: (payload['Blocked Dates'] as string[]) || [],

    // Safety & Review
    safety_features: (payload['Safety Features'] as string[]) || [],
    square_footage: (payload['Square Footage'] as number) ?? null,
    first_day_available: (payload['First Day Available'] as string) || '',
    previous_reviews_link: (payload['Previous Reviews Link'] as string) || '',
    optional_notes: (payload['Optional Notes'] as string) || '',

    // Status
    status: (payload['Status'] as string) || 'Pending Review',
    is_draft: (payload['Is Draft'] as boolean) ?? false,
  };
}

interface SubmitListingPayload {
  listing_id: string;
  user_email: string;
  user_unique_id?: string;
  listing_data: Record<string, unknown>;
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
 * Handle full listing submission
 * Called after user signup/login with complete form data
 */
export async function handleSubmit(
  payload: Record<string, unknown>
): Promise<SubmitListingResult> {
  console.log('[listing:submit] ========== SUBMIT LISTING ==========');
  console.log('[listing:submit] Payload keys:', Object.keys(payload));

  // Validate required fields
  validateRequiredFields(payload, ['listing_id', 'user_email', 'listing_data']);

  const { listing_id, user_email, user_unique_id, listing_data } = payload as SubmitListingPayload;

  // Initialize BubbleSyncService
  const bubbleBaseUrl = Deno.env.get('BUBBLE_API_BASE_URL');
  const bubbleApiKey = Deno.env.get('BUBBLE_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!bubbleBaseUrl || !bubbleApiKey || !supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required environment variables');
  }

  const syncService = new BubbleSyncService(
    bubbleBaseUrl,
    bubbleApiKey,
    supabaseUrl,
    supabaseServiceKey
  );

  console.log('[listing:submit] Listing ID:', listing_id);
  console.log('[listing:submit] User Email:', user_email);
  console.log('[listing:submit] User Unique ID:', user_unique_id || 'Not provided');

  // Transform the frontend payload to workflow parameters
  const workflowParams = transformPayloadToWorkflowParams(
    listing_data,
    listing_id,
    user_email,
    user_unique_id
  );

  console.log('[listing:submit] Workflow params:', JSON.stringify(workflowParams, null, 2));

  try {
    // Step 1: Update listing in Bubble (REQUIRED)
    console.log('[listing:submit] Step 1/3: Updating listing in Bubble...');

    // Call the Bubble workflow - it will update the listing and attach the user
    const result = await syncService.triggerWorkflowOnly(
      'listing_full_submission_in_code',
      workflowParams
    );

    console.log('[listing:submit] ✅ Step 1 complete - Bubble workflow triggered');
    console.log('[listing:submit] Workflow result:', result);

    // Step 2: Fetch updated listing data from Bubble (REQUIRED)
    console.log('[listing:submit] Step 2/3: Fetching updated listing from Bubble...');
    let listingData: Record<string, unknown> | null = null;
    try {
      listingData = await syncService.fetchBubbleObject('Listing', listing_id);
      console.log('[listing:submit] ✅ Step 2 complete - Listing fetched');
      console.log('[listing:submit] Listing Status:', listingData?.Status);
    } catch (fetchError) {
      console.error('[listing:submit] ⚠️ Step 2 failed - Could not fetch listing:', fetchError);
      // Return minimal success data if fetch fails
      return {
        _id: listing_id,
        listing_id: listing_id,
        status: 'Pending Review',
        name: workflowParams.name,
        message: 'Listing submitted successfully'
      };
    }

    // Step 3: Sync to Supabase (BEST EFFORT)
    console.log('[listing:submit] Step 3/3: Syncing to Supabase...');
    try {
      const dataToSync = { ...listingData, _id: listing_id };
      await syncService.syncToSupabase('listing', dataToSync);
      console.log('[listing:submit] ✅ Step 3 complete - Synced to Supabase');
    } catch (syncError) {
      console.error('[listing:submit] ⚠️ Step 3 failed - Supabase sync error:', syncError);
      console.log('[listing:submit] Continuing without Supabase sync...');
    }

    console.log('[listing:submit] ========== SUCCESS ==========');

    // Return the updated listing data
    return {
      _id: listing_id,
      listing_id: listing_id,
      status: (listingData?.Status as string) || 'Pending Review',
      name: (listingData?.Name as string) || workflowParams.name,
      message: 'Listing submitted successfully',
      ...listingData
    };
  } catch (error) {
    console.error('[listing:submit] ========== ERROR ==========');
    console.error('[listing:submit] Failed to submit listing:', error);
    throw error;
  }
}
