/**
 * AI Service - Client for AI Gateway Edge Function
 * Split Lease
 *
 * Provides functions to call AI-powered features through Supabase Edge Functions
 */

import { supabase } from './supabase';

/**
 * Generate a listing description using AI based on property details
 *
 * @param {Object} listingData - The listing data to generate description from
 * @param {string} listingData.listingName - Name of the listing
 * @param {string} listingData.address - Full address
 * @param {string} listingData.neighborhood - Neighborhood name
 * @param {string} listingData.typeOfSpace - Type of space (e.g., "Private Room", "Entire Place")
 * @param {number} listingData.bedrooms - Number of bedrooms (0 = Studio)
 * @param {number} listingData.beds - Number of beds
 * @param {number} listingData.bathrooms - Number of bathrooms
 * @param {string} listingData.kitchenType - Kitchen type (e.g., "Full Kitchen", "Kitchenette")
 * @param {string[]} listingData.amenitiesInsideUnit - Array of in-unit amenities
 * @param {string[]} listingData.amenitiesOutsideUnit - Array of building amenities
 * @returns {Promise<string>} Generated description
 * @throws {Error} If generation fails
 */
export async function generateListingDescription(listingData) {
  console.log('[aiService] Generating listing description with data:', listingData);

  // Get current session for auth
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('You must be logged in to generate a description');
  }

  // Format amenities arrays as comma-separated strings
  const amenitiesInUnit = Array.isArray(listingData.amenitiesInsideUnit)
    ? listingData.amenitiesInsideUnit.join(', ')
    : listingData.amenitiesInsideUnit || '';

  const amenitiesOutside = Array.isArray(listingData.amenitiesOutsideUnit)
    ? listingData.amenitiesOutsideUnit.join(', ')
    : listingData.amenitiesOutsideUnit || '';

  // Prepare variables for the prompt
  const variables = {
    listingName: listingData.listingName || '',
    address: listingData.address || '',
    neighborhood: listingData.neighborhood || '',
    typeOfSpace: listingData.typeOfSpace || '',
    bedrooms: listingData.bedrooms ?? '',
    beds: listingData.beds ?? '',
    bathrooms: listingData.bathrooms ?? '',
    kitchenType: listingData.kitchenType || '',
    amenitiesInsideUnit: amenitiesInUnit || 'None specified',
    amenitiesOutsideUnit: amenitiesOutside || 'None specified',
  };

  console.log('[aiService] Calling ai-gateway with variables:', variables);

  const { data, error } = await supabase.functions.invoke('ai-gateway', {
    body: {
      action: 'complete',
      payload: {
        prompt_key: 'listing-description',
        variables,
      },
    },
  });

  if (error) {
    console.error('[aiService] Edge Function error:', error);
    throw new Error(`Failed to generate description: ${error.message}`);
  }

  if (!data?.success) {
    console.error('[aiService] AI Gateway error:', data?.error);
    throw new Error(data?.error || 'Failed to generate description');
  }

  console.log('[aiService] Generated description:', data.data?.content);
  return data.data?.content || '';
}

/**
 * Extract listing data from localStorage draft for AI generation
 * Reads the selfListingDraft from localStorage and extracts relevant fields
 *
 * @returns {Object} Extracted listing data suitable for generateListingDescription
 */
export function extractListingDataFromDraft() {
  const draftJson = localStorage.getItem('selfListingDraft');

  if (!draftJson) {
    console.warn('[aiService] No draft found in localStorage');
    return null;
  }

  try {
    const draft = JSON.parse(draftJson);

    return {
      listingName: draft.spaceSnapshot?.listingName || '',
      address: draft.spaceSnapshot?.address?.fullAddress || '',
      neighborhood: draft.spaceSnapshot?.address?.neighborhood || '',
      typeOfSpace: draft.spaceSnapshot?.typeOfSpace || '',
      bedrooms: draft.spaceSnapshot?.bedrooms ?? 0,
      beds: draft.spaceSnapshot?.beds ?? 0,
      bathrooms: draft.spaceSnapshot?.bathrooms ?? 0,
      kitchenType: draft.spaceSnapshot?.typeOfKitchen || '',
      amenitiesInsideUnit: draft.features?.amenitiesInsideUnit || [],
      amenitiesOutsideUnit: draft.features?.amenitiesOutsideUnit || [],
    };
  } catch (error) {
    console.error('[aiService] Error parsing draft from localStorage:', error);
    return null;
  }
}
