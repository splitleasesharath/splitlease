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
 * Generate a listing title using AI based on property details
 *
 * @param {Object} listingData - The listing data to generate title from
 * @param {string} listingData.neighborhood - Neighborhood name
 * @param {string} listingData.typeOfSpace - Type of space (e.g., "Private Room", "Entire Place")
 * @param {number} listingData.bedrooms - Number of bedrooms (0 = Studio)
 * @param {string[]} listingData.amenitiesInsideUnit - Array of in-unit amenities
 * @returns {Promise<string>} Generated title
 * @throws {Error} If generation fails
 */
export async function generateListingTitle(listingData) {
  console.log('[aiService] Generating listing title with data:', listingData);

  // Format amenities array as comma-separated string (top 3 for brevity)
  const amenitiesInUnit = Array.isArray(listingData.amenitiesInsideUnit)
    ? listingData.amenitiesInsideUnit.slice(0, 3).join(', ')
    : listingData.amenitiesInsideUnit || '';

  // Prepare variables for the prompt
  const variables = {
    neighborhood: listingData.neighborhood || '',
    typeOfSpace: listingData.typeOfSpace || '',
    bedrooms: listingData.bedrooms ?? '',
    amenitiesInsideUnit: amenitiesInUnit || 'None specified',
  };

  console.log('[aiService] Calling ai-gateway for title with variables:', variables);

  const { data, error } = await supabase.functions.invoke('ai-gateway', {
    body: {
      action: 'complete',
      payload: {
        prompt_key: 'listing-title',
        variables,
      },
    },
  });

  if (error) {
    console.error('[aiService] Edge Function error:', error);
    throw new Error(`Failed to generate title: ${error.message}`);
  }

  if (!data?.success) {
    console.error('[aiService] AI Gateway error:', data?.error);
    throw new Error(data?.error || 'Failed to generate title');
  }

  // Clean up the response (remove quotes if present)
  let title = data.data?.content || '';
  title = title.trim().replace(/^["']|["']$/g, '');

  console.log('[aiService] Generated title:', title);
  return title;
}

/**
 * Generate a neighborhood description using AI based on address
 * Used as fallback when ZIP code lookup fails
 *
 * @param {Object} addressData - The address data to generate description from
 * @param {string} addressData.fullAddress - Full street address
 * @param {string} addressData.city - City name
 * @param {string} addressData.state - State abbreviation
 * @param {string} addressData.zip - ZIP code
 * @returns {Promise<string>} Generated neighborhood description
 * @throws {Error} If generation fails
 */
export async function generateNeighborhoodDescription(addressData) {
  console.log('[aiService] Generating neighborhood description for address:', addressData);

  const variables = {
    address: addressData.fullAddress || '',
    city: addressData.city || '',
    state: addressData.state || '',
    zipCode: addressData.zip || '',
  };

  console.log('[aiService] Calling ai-gateway for neighborhood with variables:', variables);

  const { data, error } = await supabase.functions.invoke('ai-gateway', {
    body: {
      action: 'complete',
      payload: {
        prompt_key: 'neighborhood-description',
        variables,
      },
    },
  });

  if (error) {
    console.error('[aiService] Edge Function error:', error);
    throw new Error(`Failed to generate neighborhood description: ${error.message}`);
  }

  if (!data?.success) {
    console.error('[aiService] AI Gateway error:', data?.error);
    throw new Error(data?.error || 'Failed to generate neighborhood description');
  }

  console.log('[aiService] Generated neighborhood description:', data.data?.content);
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
