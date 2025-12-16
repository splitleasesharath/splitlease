/**
 * AI Parse Profile - Edge Function
 * Split Lease
 *
 * This edge function processes the AI parsing queue asynchronously.
 * It parses freeform signup text using GPT-4 and populates user profiles.
 *
 * Actions:
 * - queue: Add a new parsing job to the queue (non-blocking)
 * - process: Process a single job from the queue
 * - process_batch: Process multiple pending jobs
 *
 * The parsing flow:
 * 1. Fetch reference data (boroughs, schedules)
 * 2. Call GPT-4 to parse freeform text into structured sections
 * 3. Extract data using regex patterns
 * 4. Match against database tables (boroughs, neighborhoods)
 * 5. Update user profile with parsed data
 * 6. Find and favorite matching listings
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { complete } from '../_shared/openai.ts';
import { ValidationError } from '../_shared/errors.ts';

console.log('[ai-parse-profile] Edge Function started');

// ============================================================================
// Types
// ============================================================================

interface QueueJobPayload {
  user_id: string;
  email: string;
  freeform_text: string;
}

interface ExtractedData {
  biography: string | null;
  specialNeeds: string | null;
  needForSpace: string | null;
  reasonsToHostMe: string | null;
  creditScore: number | null;
  lastName: string | null;
  fullName: string | null;
  idealDaysSchedule: string[] | null;
  preferredBorough: string | null;
  transportationMedium: string | null;
  storedItems: string[] | null;
  preferredWeeklySchedule: string | null;
  email: string | null;
  preferredHoods: string[] | null;
  // New fields for better extraction
  reservationSpan: string | null;  // Duration like "17 weeks", "3 months"
  moveInRange: string | null;      // When they want to move in
  commutingInfo: string | null;    // Commuting details
}

interface MatchedIds {
  boroughId: string | null;
  hoodIds: string[];
  dayIds: number[];
}

// ============================================================================
// GPT-4 Parsing Prompt (Replicated from Bubble)
// ============================================================================

function buildParsingPrompt(
  textInputted: string,
  availableBoroughs: string[],
  availableSchedules: string[]
): string {
  return `A guest user signed up on our site using the freeform text —-${textInputted}---- please create a text that answers to the following sections: Biography, Special Needs, Need for Space, Reasons to Host me, Credit Score, Last Name, Full Name, Ideal Days Schedule (just separate the days with commas, for example: Monday,Tuesday,Wednesday,Thursday, don't put space between commas separation, just the day and a comma), Preferred Borough (for this category just focus on listing separated by commas the boroughs or locations desired, nothing else, don't include space between the borough and comma, for example: Manhattan,Brooklyn,Queens. The list of boroughs we have on our system is ${availableBoroughs.join(',')} create on your answer the list of boroughs inputted that also matches with the ones on our system), Transportation Medium, Stored Items (for these stored items follow the same structure as above, separate each item by commas and no space between them), Preferred Weekly Schedule (for this one just answer one of the following weekly schedules: ${availableSchedules.join(',')}), email (for this section i want you to print what you found on the text as a valid email, if by any chance you fixed a typo error like guest@mail and the user didn't input the .com, just add your reasoning to why and how you fixed the email, if the email is valid since the beginning, no explanation needed), Preferred Hoods (on this case, if there's any specific indication of what hood inside of the borough or what address the user inputted just print a list of hoods as you did for boroughs, for example if the user mentioned that is looking something near the empire states, then your list of preferred hoods should be something like: Midtown,Midtown South,FiDi,Hell's Kitchen - the idea is you include every neighborhood/hood that is near any location mentioned by the user), Reservation Span (extract the duration/length of stay mentioned, for example: 17 weeks, 3 months, 6 months, 1 year - include the number and unit like weeks or months), Move In Range (when does the user want to move in or start, for example: immediately, next month, January 2024, ASAP), Commuting Info (any commuting or travel patterns mentioned, like commuting to a specific city weekly, traveling for work, etc) — The idea is that you generate a text following the next format with each of the labels listed above.

Please start each paragraph with the labels I gave above but without heading formats like ### or **, for example 'Special Needs.' It is very important, a matter of life or death, that you respect the labels format I gave above and after each label you add a dot '.' also, END each section with a dot '.' for example 'Special Needs. I travel with my cat, he is very calm and independent, he does not cause issues but i definitely need one part of the apartment dedicated to his toys and spaces.', and DON'T include dots inside the content of each section, just use commas or something different since dots are the ones I'm using for my data manipulation later. If there's nothing in the text related to that label, just avoid entirely to include that section. It is a matter of LIFE or DEATH that you respect the formats provided above, including that the content of each section starts with a capital letter.

After finishing, take a look again to each section and replace every dot '.' inside the section, meaning that the borders are not considered, with a comma ','. For example, sometimes you write 2 a.m., that should be replaced by 2 am, without the dots. Respect the last character of each section to be a dot '.'`;
}

// ============================================================================
// Regex Extraction Utilities
// ============================================================================

function extractSection(content: string, label: string): string | null {
  // Pattern: "Label. Content." - Non-greedy match until next period
  const pattern = new RegExp(`${label}\\.\\s*([^]*?)(?=\\n[A-Z][a-z]+ [A-Z]|\\n[A-Z][a-z]+\\.|$)`, 'i');
  const match = content.match(pattern);

  if (match && match[1]) {
    // Clean up: remove trailing period and whitespace
    let result = match[1].trim();
    if (result.endsWith('.')) {
      result = result.slice(0, -1).trim();
    }
    return result || null;
  }
  return null;
}

function extractCommaSeparatedList(content: string, label: string): string[] | null {
  const section = extractSection(content, label);
  if (!section) return null;

  return section
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

function extractNumber(content: string, label: string): number | null {
  const section = extractSection(content, label);
  if (!section) return null;

  const numMatch = section.match(/\d+/);
  return numMatch ? parseInt(numMatch[0], 10) : null;
}

function extractAllData(gptResponse: string): ExtractedData {
  return {
    biography: extractSection(gptResponse, 'Biography'),
    specialNeeds: extractSection(gptResponse, 'Special Needs'),
    needForSpace: extractSection(gptResponse, 'Need for Space'),
    reasonsToHostMe: extractSection(gptResponse, 'Reasons to Host me'),
    creditScore: extractNumber(gptResponse, 'Credit Score'),
    lastName: extractSection(gptResponse, 'Last Name'),
    fullName: extractSection(gptResponse, 'Full Name'),
    idealDaysSchedule: extractCommaSeparatedList(gptResponse, 'Ideal Days Schedule'),
    preferredBorough: extractSection(gptResponse, 'Preferred Borough'),
    transportationMedium: extractSection(gptResponse, 'Transportation Medium'),
    storedItems: extractCommaSeparatedList(gptResponse, 'Stored Items'),
    preferredWeeklySchedule: extractSection(gptResponse, 'Preferred Weekly Schedule'),
    email: extractSection(gptResponse, 'email'),
    preferredHoods: extractCommaSeparatedList(gptResponse, 'Preferred Hoods'),
    // New fields
    reservationSpan: extractSection(gptResponse, 'Reservation Span'),
    moveInRange: extractSection(gptResponse, 'Move In Range'),
    commutingInfo: extractSection(gptResponse, 'Commuting Info'),
  };
}

// ============================================================================
// Database Matching
// ============================================================================

async function matchBoroughId(
  supabase: ReturnType<typeof createClient>,
  boroughName: string | null
): Promise<string | null> {
  if (!boroughName) return null;

  // Split comma-separated boroughs and take the first one
  const firstBorough = boroughName.split(',')[0].trim();

  const { data, error } = await supabase
    .schema('reference_table')
    .from('zat_geo_borough_toplevel')
    .select('_id')
    .ilike('"Display Borough"', `%${firstBorough}%`)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[ai-parse-profile] Error matching borough:', error);
    return null;
  }

  return data?._id || null;
}

async function matchHoodIds(
  supabase: ReturnType<typeof createClient>,
  hoodNames: string[] | null
): Promise<string[]> {
  if (!hoodNames || hoodNames.length === 0) return [];

  const matchedIds: string[] = [];

  for (const hoodName of hoodNames) {
    const { data, error } = await supabase
      .schema('reference_table')
      .from('zat_geo_hood_mediumlevel')
      .select('_id')
      .ilike('"Display"', `%${hoodName}%`)
      .limit(1)
      .maybeSingle();

    if (!error && data?._id) {
      matchedIds.push(data._id);
    }
  }

  return matchedIds;
}

function matchDayIds(dayNames: string[] | null): number[] {
  if (!dayNames || dayNames.length === 0) return [];

  // Map day names to JavaScript day indices (0=Sunday, 6=Saturday)
  const dayMap: Record<string, number> = {
    'sunday': 0,
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6,
  };

  return dayNames
    .map(day => dayMap[day.toLowerCase()])
    .filter(dayNum => dayNum !== undefined);
}

// ============================================================================
// Listing Matching & Favoriting
// ============================================================================

async function findAndFavoriteMatchingListings(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  matchedIds: MatchedIds
): Promise<string[]> {
  console.log('[ai-parse-profile] Finding matching listings for user:', userId);

  // Build query based on user preferences
  let query = supabase
    .from('listing')
    .select('_id, "Name", "Location - Borough", "Location - Hood"')
    .eq('"Active"', true)
    .eq('"Approved"', true);

  // Filter by borough if specified
  if (matchedIds.boroughId) {
    query = query.eq('"Location - Borough"', matchedIds.boroughId);
  }

  // Filter by hoods if specified
  if (matchedIds.hoodIds.length > 0) {
    query = query.in('"Location - Hood"', matchedIds.hoodIds);
  }

  // Limit to 10 listings
  query = query.limit(10);

  const { data: listings, error } = await query;

  if (error) {
    console.error('[ai-parse-profile] Error finding listings:', error);
    return [];
  }

  if (!listings || listings.length === 0) {
    console.log('[ai-parse-profile] No matching listings found');
    return [];
  }

  const listingIds = listings.map((l: { _id: string }) => l._id);
  console.log('[ai-parse-profile] Found', listingIds.length, 'matching listings');

  // Get current favorites
  const { data: userData, error: userError } = await supabase
    .from('user')
    .select('"Favorited Listings"')
    .eq('_id', userId)
    .single();

  if (userError) {
    console.error('[ai-parse-profile] Error fetching user favorites:', userError);
    return listingIds;
  }

  // Parse existing favorites (could be string or array)
  let existingFavorites: string[] = [];
  const rawFavorites = userData?.['Favorited Listings'];
  if (rawFavorites) {
    if (typeof rawFavorites === 'string') {
      try {
        existingFavorites = JSON.parse(rawFavorites);
      } catch {
        existingFavorites = [];
      }
    } else if (Array.isArray(rawFavorites)) {
      existingFavorites = rawFavorites;
    }
  }

  // Merge with existing favorites
  const newFavorites = [...new Set([...existingFavorites, ...listingIds])];

  // Update user's favorites
  const { error: updateError } = await supabase
    .from('user')
    .update({ 'Favorited Listings': newFavorites })
    .eq('_id', userId);

  if (updateError) {
    console.error('[ai-parse-profile] Error updating favorites:', updateError);
  } else {
    console.log('[ai-parse-profile] Updated user favorites with', listingIds.length, 'new listings');
  }

  return listingIds;
}

// ============================================================================
// Queue Management
// ============================================================================

async function addToQueue(
  supabase: ReturnType<typeof createClient>,
  payload: QueueJobPayload
): Promise<{ success: boolean; jobId: string }> {
  console.log('[ai-parse-profile] Adding job to queue for user:', payload.user_id);

  const { data, error } = await supabase
    .from('ai_parsing_queue')
    .insert({
      user_id: payload.user_id,
      email: payload.email,
      freeform_text: payload.freeform_text,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[ai-parse-profile] Error adding to queue:', error);
    throw new Error(`Failed to queue parsing job: ${error.message}`);
  }

  console.log('[ai-parse-profile] Job queued successfully:', data.id);
  return { success: true, jobId: data.id };
}

async function processJob(
  supabase: ReturnType<typeof createClient>,
  jobId: string
): Promise<{ success: boolean; data?: ExtractedData; error?: string }> {
  console.log('[ai-parse-profile] Processing job:', jobId);

  // 1. Fetch the job
  const { data: job, error: fetchError } = await supabase
    .from('ai_parsing_queue')
    .select('*')
    .eq('id', jobId)
    .single();

  if (fetchError || !job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  if (job.status === 'completed') {
    console.log('[ai-parse-profile] Job already completed');
    return { success: true, data: job.extracted_data };
  }

  if (job.attempts >= job.max_attempts) {
    console.log('[ai-parse-profile] Job exceeded max attempts');
    return { success: false, error: 'Max attempts exceeded' };
  }

  // 2. Mark as processing
  await supabase
    .from('ai_parsing_queue')
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
      attempts: job.attempts + 1,
    })
    .eq('id', jobId);

  try {
    // 3. Fetch reference data
    console.log('[ai-parse-profile] Fetching reference data...');

    const { data: boroughs } = await supabase
      .schema('reference_table')
      .from('zat_geo_borough_toplevel')
      .select('"Display Borough"');

    const availableBoroughs = boroughs?.map((b: { 'Display Borough': string }) => b['Display Borough']) || [
      'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island',
      'Bergen County NJ', 'Hudson County NJ', 'Essex County NJ'
    ];

    const availableSchedules = [
      'Every week',
      'Every other week',
      'First and third week',
      'Second and fourth week',
      'First week only',
      'Second week only',
      'Third week only',
      'Fourth week only'
    ];

    // 4. Call GPT-4
    console.log('[ai-parse-profile] Calling GPT-4...');

    const prompt = buildParsingPrompt(
      job.freeform_text,
      availableBoroughs,
      availableSchedules
    );

    const gptResponse = await complete(
      [{ role: 'user', content: prompt }],
      {
        model: 'gpt-4o',
        temperature: 0.3,
        maxTokens: 2000,
      }
    );

    if (!gptResponse) {
      throw new Error('No response from GPT-4');
    }

    console.log('[ai-parse-profile] GPT response received');

    // 5. Extract data
    const extractedData = extractAllData(gptResponse.content);
    console.log('[ai-parse-profile] Extracted data:', JSON.stringify(extractedData, null, 2));

    // 6. Match against database
    const boroughId = await matchBoroughId(supabase, extractedData.preferredBorough);
    const hoodIds = await matchHoodIds(supabase, extractedData.preferredHoods);
    const dayIds = matchDayIds(extractedData.idealDaysSchedule);

    const matchedIds: MatchedIds = { boroughId, hoodIds, dayIds };
    console.log('[ai-parse-profile] Matched IDs:', matchedIds);

    // 7. Update user profile
    console.log('[ai-parse-profile] Updating user profile...');

    const userUpdate: Record<string, unknown> = {
      'freeform ai signup text': job.freeform_text,
      'freeform ai signup text (chatgpt generation)': gptResponse.content,
      'Modified Date': new Date().toISOString(),
    };

    if (extractedData.biography) {
      userUpdate['About Me / Bio'] = extractedData.biography;
    }
    if (extractedData.specialNeeds) {
      userUpdate['special needs'] = extractedData.specialNeeds;
    }
    if (extractedData.needForSpace) {
      userUpdate['need for Space'] = extractedData.needForSpace;
    }
    if (extractedData.reasonsToHostMe) {
      userUpdate['About - reasons to host me'] = extractedData.reasonsToHostMe;
    }
    if (extractedData.creditScore) {
      userUpdate['credit score'] = extractedData.creditScore;
    }
    if (extractedData.lastName) {
      userUpdate['Name - Last'] = extractedData.lastName;
    }
    if (extractedData.fullName) {
      userUpdate['Name - Full'] = extractedData.fullName;
    }
    if (extractedData.transportationMedium) {
      userUpdate['transportation medium'] = extractedData.transportationMedium;
    }
    if (extractedData.preferredWeeklySchedule) {
      userUpdate['Preferred weekly schedule'] = extractedData.preferredWeeklySchedule;
    }
    if (boroughId) {
      userUpdate['Preferred Borough'] = boroughId;
    }
    if (hoodIds.length > 0) {
      userUpdate['Preferred Hoods'] = hoodIds;
    }
    if (dayIds.length > 0) {
      userUpdate['Recent Days Selected'] = dayIds;
    }
    if (extractedData.storedItems && extractedData.storedItems.length > 0) {
      userUpdate['About - Commonly Stored Items'] = extractedData.storedItems;
    }
    // New fields for reservation span, move-in range, and commuting
    if (extractedData.reservationSpan) {
      userUpdate['reservation span'] = extractedData.reservationSpan;
    }
    if (extractedData.moveInRange) {
      userUpdate['Move-in range'] = extractedData.moveInRange;
    }
    if (extractedData.commutingInfo) {
      // Store commuting info in special needs or a dedicated field
      // Append to special needs if it exists, otherwise set it
      if (extractedData.specialNeeds) {
        userUpdate['special needs'] = `${extractedData.specialNeeds}. Commuting: ${extractedData.commutingInfo}`;
      } else {
        userUpdate['special needs'] = `Commuting: ${extractedData.commutingInfo}`;
      }
    }

    const { error: updateError } = await supabase
      .from('user')
      .update(userUpdate)
      .eq('_id', job.user_id);

    if (updateError) {
      throw new Error(`Failed to update user: ${updateError.message}`);
    }

    // 8. Favorite matching listings
    const favoritedListings = await findAndFavoriteMatchingListings(
      supabase,
      job.user_id,
      matchedIds
    );

    // 9. Mark job as completed
    await supabase
      .from('ai_parsing_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        gpt_response: gptResponse.content,
        extracted_data: extractedData,
        matched_ids: matchedIds,
        favorited_listings: favoritedListings,
      })
      .eq('id', jobId);

    console.log('[ai-parse-profile] Job completed successfully');
    return { success: true, data: extractedData };

  } catch (error) {
    console.error('[ai-parse-profile] Error processing job:', error);

    // Mark as failed
    await supabase
      .from('ai_parsing_queue')
      .update({
        status: 'failed',
        last_error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', jobId);

    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function processBatch(
  supabase: ReturnType<typeof createClient>,
  limit: number = 5
): Promise<{ processed: number; successful: number; failed: number }> {
  console.log('[ai-parse-profile] Processing batch of up to', limit, 'jobs');

  // Fetch pending jobs
  const { data: jobs, error: fetchError } = await supabase
    .from('ai_parsing_queue')
    .select('id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (fetchError) {
    throw new Error(`Failed to fetch jobs: ${fetchError.message}`);
  }

  if (!jobs || jobs.length === 0) {
    console.log('[ai-parse-profile] No pending jobs');
    return { processed: 0, successful: 0, failed: 0 };
  }

  console.log('[ai-parse-profile] Found', jobs.length, 'pending jobs');

  let successful = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      const result = await processJob(supabase, job.id);
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { processed: jobs.length, successful, failed };
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('[ai-parse-profile] ========== NEW REQUEST ==========');
    console.log('[ai-parse-profile] Method:', req.method);

    if (req.method !== 'POST') {
      throw new Error('Method not allowed. Use POST.');
    }

    const body = await req.json();
    const { action, payload } = body;

    console.log('[ai-parse-profile] Action:', action);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    let result;

    switch (action) {
      case 'queue': {
        // Add a new job to the queue (non-blocking for user)
        if (!payload?.user_id || !payload?.email || !payload?.freeform_text) {
          throw new ValidationError('user_id, email, and freeform_text are required');
        }
        result = await addToQueue(supabase, payload);
        break;
      }

      case 'process': {
        // Process a specific job
        if (!payload?.job_id) {
          throw new ValidationError('job_id is required');
        }
        result = await processJob(supabase, payload.job_id);
        break;
      }

      case 'process_batch': {
        // Process multiple pending jobs
        const limit = payload?.limit || 5;
        result = await processBatch(supabase, limit);
        break;
      }

      case 'queue_and_process': {
        // Queue and immediately process (for backward compatibility)
        if (!payload?.user_id || !payload?.email || !payload?.freeform_text) {
          throw new ValidationError('user_id, email, and freeform_text are required');
        }
        const queueResult = await addToQueue(supabase, payload);
        result = await processJob(supabase, queueResult.jobId);
        break;
      }

      default:
        throw new ValidationError(`Unknown action: ${action}. Valid actions: queue, process, process_batch, queue_and_process`);
    }

    console.log('[ai-parse-profile] ========== SUCCESS ==========');

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[ai-parse-profile] ========== ERROR ==========');
    console.error('[ai-parse-profile] Error:', error);

    const statusCode = error instanceof ValidationError ? 400 : 500;

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
