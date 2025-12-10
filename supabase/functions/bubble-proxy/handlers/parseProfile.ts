/**
 * Parse Profile Handler - AI-powered freeform text parsing
 *
 * This handler parses user's freeform signup text using GPT-4 to extract
 * structured data and update their profile. It also matches listings
 * and auto-favorites ones that match the user's preferences.
 *
 * Flow:
 * 1. Call GPT-4 to parse freeform text into structured sections
 * 2. Extract data from GPT response using regex
 * 3. Match extracted values against database tables (boroughs, hoods, etc.)
 * 4. Update user profile with extracted data
 * 5. Find matching listings and add to favorites
 *
 * Based on Bubble workflow: ai-signup-guest (Steps 13-20)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { complete } from '../../_shared/openai.ts';
import { ValidationError } from '../../_shared/errors.ts';

// ============================================================================
// Types
// ============================================================================

interface ParseProfilePayload {
  user_id: string;
  email: string;
  text_inputted: string;
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
}

interface MatchedIds {
  boroughId: string | null;
  hoodIds: string[];
  dayIds: string[];
}

// ============================================================================
// GPT-4 Parsing Prompt
// ============================================================================

function buildParsingPrompt(textInputted: string, availableBoroughs: string[], availableSchedules: string[]): string {
  return `A guest user signed up on our site using the freeform text —-${textInputted}---- please create a text that answers to the following sections: Biography, Special Needs, Need for Space, Reasons to Host me, Credit Score, Last Name, Full Name, Ideal Days Schedule (just separate the days with commas, for example: Monday,Tuesday,Wednesday,Thursday, don't put space between commas separation, just the day and a comma), Preferred Borough (for this category just focus on listing separated by commas the boroughs or locations desired, nothing else, don't include space between the borough and comma, for example: Manhattan,Brooklyn,Queens. The list of boroughs we have on our system is ${availableBoroughs.join(',')} create on your answer the list of boroughs inputted that also matches with the ones on our system), Transportation Medium, Stored Items (for these stored items follow the same structure as above, separate each item by commas and no space between them), Preferred Weekly Schedule (for this one just answer one of the following weekly schedules: ${availableSchedules.join(',')}), email (for this section i want you to print what you found on the text as a valid email, if by any chance you fixed a typo error like guest@mail and the user didn't input the .com, just add your reasoning to why and how you fixed the email, if the email is valid since the beginning, no explanation needed), Preferred Hoods (on this case, if there's any specific indication of what hood inside of the borough or what address the user inputted just print a list of hoods as you did for boroughs, for example if the user mentioned that is looking something near the empire states, then your list of preferred hoods should be something like: Midtown,Midtown South,FiDi,Hell's Kitchen - the idea is you include every neighborhood/hood that is near any location mentioned by the user) — The idea is that you generate a text following the next format with each of the labels listed above.

Please start each paragraph with the labels I gave above but without heading formats like ### or **, for example 'Special Needs.' It is very important, a matter of life or death, that you respect the labels format I gave above and after each label you add a dot '.' also, END each section with a dot '.' for example 'Special Needs. I travel with my cat, he is very calm and independent, he does not cause issues but i definitely need one part of the apartment dedicated to his toys and spaces.', and DON'T include dots inside the content of each section, just use commas or something different since dots are the ones I'm using for my data manipulation later. If there's nothing in the text related to that label, just avoid entirely to include that section. It is a matter of LIFE or DEATH that you respect the formats provided above, including that the content of each section starts with a capital letter.

After finishing, take a look again to each section and replace every dot '.' inside the section, meaning that the borders are not considered, with a comma ','. For example, sometimes you write 2 a.m., that should be replaced by 2 am, without the dots. Respect the last character of each section to be a dot '.'`;
}

// ============================================================================
// Regex Extraction Utilities
// ============================================================================

function extractSection(content: string, label: string): string | null {
  // Pattern: "Label. Content."
  const pattern = new RegExp(`${label}\\.\\s*([^.]*?)\\.`, 'i');
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
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
  };
}

// ============================================================================
// Database Matching
// ============================================================================

async function matchBoroughId(
  supabase: any,
  boroughName: string | null
): Promise<string | null> {
  if (!boroughName) return null;

  // Split comma-separated boroughs and take the first one
  const firstBorough = boroughName.split(',')[0].trim();

  const { data, error } = await supabase
    .from('zat_geo_borough_toplevel')
    .select('_id')
    .ilike('Display Borough', `%${firstBorough}%`)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[parseProfile] Error matching borough:', error);
    return null;
  }

  return data?._id || null;
}

async function matchHoodIds(
  supabase: any,
  hoodNames: string[] | null
): Promise<string[]> {
  if (!hoodNames || hoodNames.length === 0) return [];

  const matchedIds: string[] = [];

  for (const hoodName of hoodNames) {
    const { data, error } = await supabase
      .from('zat_geo_hood_mediumlevel')
      .select('_id')
      .ilike('Display', `%${hoodName}%`)
      .limit(1)
      .maybeSingle();

    if (!error && data?._id) {
      matchedIds.push(data._id);
    }
  }

  return matchedIds;
}

async function matchDayIds(
  supabase: any,
  dayNames: string[] | null
): Promise<string[]> {
  if (!dayNames || dayNames.length === 0) return [];

  // Map day names to standard day IDs
  // Using the All Days table if it exists, otherwise using known IDs
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
    .filter(dayNum => dayNum !== undefined)
    .map(dayNum => dayNum.toString());
}

// ============================================================================
// Listing Matching & Favoriting
// ============================================================================

async function findAndFavoriteMatchingListings(
  supabase: any,
  userId: string,
  extractedData: ExtractedData,
  matchedIds: MatchedIds
): Promise<string[]> {
  console.log('[parseProfile] Finding matching listings for user:', userId);

  // Build query based on user preferences
  let query = supabase
    .from('listing')
    .select('_id, Name, "Location - Borough", "Location - Hood"')
    .eq('Active', true)
    .eq('Approved', true);

  // Filter by borough if specified
  if (matchedIds.boroughId) {
    query = query.eq('Location - Borough', matchedIds.boroughId);
  }

  // Filter by hoods if specified
  if (matchedIds.hoodIds.length > 0) {
    query = query.in('Location - Hood', matchedIds.hoodIds);
  }

  // Limit to 10 listings
  query = query.limit(10);

  const { data: listings, error } = await query;

  if (error) {
    console.error('[parseProfile] Error finding listings:', error);
    return [];
  }

  if (!listings || listings.length === 0) {
    console.log('[parseProfile] No matching listings found');
    return [];
  }

  const listingIds = listings.map((l: any) => l._id);
  console.log('[parseProfile] Found', listingIds.length, 'matching listings');

  // Get current favorites
  const { data: userData, error: userError } = await supabase
    .from('user')
    .select('"Favorited Listings"')
    .eq('_id', userId)
    .single();

  if (userError) {
    console.error('[parseProfile] Error fetching user favorites:', userError);
    return listingIds;
  }

  // Merge with existing favorites
  const existingFavorites = userData?.['Favorited Listings'] || [];
  const newFavorites = [...new Set([...existingFavorites, ...listingIds])];

  // Update user's favorites
  const { error: updateError } = await supabase
    .from('user')
    .update({ 'Favorited Listings': newFavorites })
    .eq('_id', userId);

  if (updateError) {
    console.error('[parseProfile] Error updating favorites:', updateError);
  } else {
    console.log('[parseProfile] Updated user favorites with', listingIds.length, 'new listings');
  }

  // Also update each listing's "Users that favorite" field
  for (const listingId of listingIds) {
    const { data: listingData } = await supabase
      .from('listing')
      .select('"Users that favorite"')
      .eq('_id', listingId)
      .single();

    const currentUsers = listingData?.['Users that favorite'] || [];
    if (!currentUsers.includes(userId)) {
      await supabase
        .from('listing')
        .update({ 'Users that favorite': [...currentUsers, userId] })
        .eq('_id', listingId);
    }
  }

  return listingIds;
}

// ============================================================================
// Main Handler
// ============================================================================

export async function handleParseProfile(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: ParseProfilePayload
): Promise<any> {
  console.log('[parseProfile] ========== PARSE PROFILE ==========');
  console.log('[parseProfile] User ID:', payload.user_id);
  console.log('[parseProfile] Email:', payload.email);
  console.log('[parseProfile] Text length:', payload.text_inputted?.length || 0);

  // Validate required fields
  if (!payload.user_id) {
    throw new ValidationError('user_id is required');
  }
  if (!payload.text_inputted) {
    throw new ValidationError('text_inputted is required');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // ========== STEP 1: Get reference data for prompt ==========
  console.log('[parseProfile] Step 1: Fetching reference data...');

  // Get available boroughs
  const { data: boroughs } = await supabase
    .from('zat_geo_borough_toplevel')
    .select('"Display Borough"');

  const availableBoroughs = boroughs?.map((b: any) => b['Display Borough']) || [
    'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island',
    'Bergen County NJ', 'Hudson County NJ', 'Essex County NJ'
  ];

  // Weekly schedule options
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

  // ========== STEP 2: Call GPT-4 to parse text ==========
  console.log('[parseProfile] Step 2: Calling GPT-4 to parse text...');

  const prompt = buildParsingPrompt(
    payload.text_inputted,
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

  console.log('[parseProfile] GPT Response length:', gptResponse?.length || 0);
  console.log('[parseProfile] GPT Response preview:', gptResponse?.substring(0, 200) || 'No response');

  if (!gptResponse) {
    throw new Error('Failed to get response from GPT-4');
  }

  // ========== STEP 3: Extract structured data ==========
  console.log('[parseProfile] Step 3: Extracting structured data...');

  const extractedData = extractAllData(gptResponse);
  console.log('[parseProfile] Extracted data:', JSON.stringify(extractedData, null, 2));

  // ========== STEP 4: Match against database ==========
  console.log('[parseProfile] Step 4: Matching against database...');

  const boroughId = await matchBoroughId(supabase, extractedData.preferredBorough);
  const hoodIds = await matchHoodIds(supabase, extractedData.preferredHoods);
  const dayIds = await matchDayIds(supabase, extractedData.idealDaysSchedule);

  const matchedIds: MatchedIds = { boroughId, hoodIds, dayIds };
  console.log('[parseProfile] Matched IDs:', matchedIds);

  // ========== STEP 5: Update user profile ==========
  console.log('[parseProfile] Step 5: Updating user profile...');

  const userUpdate: Record<string, any> = {
    'freeform ai signup text': payload.text_inputted,
    'freeform ai signup text (chatgpt generation)': gptResponse,
    'Modified Date': new Date().toISOString(),
  };

  // Add extracted fields if present
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

  const { error: updateError } = await supabase
    .from('user')
    .update(userUpdate)
    .eq('_id', payload.user_id);

  if (updateError) {
    console.error('[parseProfile] Error updating user:', updateError);
    throw new Error(`Failed to update user profile: ${updateError.message}`);
  }

  console.log('[parseProfile] User profile updated successfully');

  // ========== STEP 6: Find and favorite matching listings ==========
  console.log('[parseProfile] Step 6: Finding and favoriting listings...');

  const favoritedListingIds = await findAndFavoriteMatchingListings(
    supabase,
    payload.user_id,
    extractedData,
    matchedIds
  );

  // ========== DONE ==========
  console.log('[parseProfile] ========== SUCCESS ==========');

  return {
    success: true,
    data: {
      user_id: payload.user_id,
      extracted_data: extractedData,
      matched_ids: matchedIds,
      favorited_listings: favoritedListingIds,
      gpt_response_preview: gptResponse.substring(0, 500),
    }
  };
}
