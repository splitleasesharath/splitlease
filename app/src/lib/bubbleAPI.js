/**
 * Bubble.io API Service
 *
 * Handles communication with Bubble.io backend workflows
 *
 * Configuration:
 * - VITE_BUBBLE_API_BASE_URL: Base URL for Bubble API (e.g., https://app.split.lease/version-test/api/1.1)
 * - VITE_BUBBLE_API_KEY: API key for authentication
 *
 * IMPORTANT: No fallbacks or hardcoded values. Environment variables are required.
 * The service will fail if these are not configured properly.
 */

/**
 * Get Bubble API configuration from environment variables
 * NO FALLBACKS - Will return undefined if env vars are missing, causing requests to fail explicitly
 */
const getBubbleConfig = () => {
  // Get base URL and API key from environment variables
  const baseUrl = import.meta.env.VITE_BUBBLE_API_BASE_URL;
  const apiKey = import.meta.env.VITE_BUBBLE_API_KEY;

  if (!baseUrl) {
    console.error('[Bubble API] ❌ Base URL not found in environment variables');
    console.error('[Bubble API] Please set VITE_BUBBLE_API_BASE_URL in your .env file');
    console.error('[Bubble API] Example: VITE_BUBBLE_API_BASE_URL=https://app.split.lease/version-test/api/1.1');
  }

  if (!apiKey) {
    console.error('[Bubble API] ❌ API key not found in environment variables');
    console.error('[Bubble API] Please set VITE_BUBBLE_API_KEY in your .env file');
  }

  // Return config even if missing - let it fail explicitly when used
  return {
    baseUrl,
    apiKey,
  };
};

/**
 * Trigger a Bubble.io backend workflow
 * @param {string} workflowName - Name of the workflow to trigger
 * @param {Object} parameters - Parameters to pass to the workflow
 * @returns {Promise<Object>} - Response from Bubble API
 */
export async function triggerBubbleWorkflow(workflowName, parameters = {}) {
  const config = getBubbleConfig();

  if (!config.apiKey) {
    throw new Error('Bubble API key is not configured');
  }

  const url = `${config.baseUrl}/wf/${workflowName}`;

  console.log(`[Bubble API] Triggering workflow: ${workflowName}`);
  console.log('[Bubble API] Parameters:', parameters);
  console.log('[Bubble API] URL:', url);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parameters),
    });

    console.log('[Bubble API] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Bubble API] Error response:', errorText);
      throw new Error(`Bubble workflow failed: ${response.status} ${response.statusText}`);
    }

    // Bubble workflows can return 200 with response or 204 No Content
    if (response.status === 204) {
      console.log('[Bubble API] Workflow triggered successfully (204 No Content)');
      return { success: true };
    }

    const data = await response.json();
    console.log('[Bubble API] Full workflow response:', data);
    console.log('[Bubble API] Response type:', typeof data);
    console.log('[Bubble API] Response keys:', Object.keys(data));

    // Log nested response if it exists
    if (data.response) {
      console.log('[Bubble API] Nested response:', data.response);
      console.log('[Bubble API] Nested response keys:', Object.keys(data.response));
    }

    return data;
  } catch (error) {
    console.error('[Bubble API] Failed to trigger workflow:', error);
    throw error;
  }
}

/**
 * Fetch a listing object from Bubble Data API by ID
 * @param {string} listingId - The unique ID of the listing
 * @returns {Promise<Object>} - Listing data from Bubble
 */
export async function getListingById(listingId) {
  const config = getBubbleConfig();

  if (!config.apiKey) {
    throw new Error('Bubble API key is not configured');
  }

  // Bubble Data API endpoint: /obj/<data_type>/<unique_id>
  const url = `${config.baseUrl}/obj/listing/${listingId}`;

  console.log('[Bubble API] Fetching listing by ID:', listingId);
  console.log('[Bubble API] URL:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });

    console.log('[Bubble API] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Bubble API] Error response:', errorText);
      throw new Error(`Failed to fetch listing: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Bubble API] Listing data:', data);
    console.log('[Bubble API] Listing name:', data.response?.Name);

    return data.response || data;
  } catch (error) {
    console.error('[Bubble API] Failed to fetch listing:', error);
    throw error;
  }
}

/**
 * Create a new listing via Bubble backend workflow
 * @param {string} listingName - Name of the listing to create
 * @param {string} [userEmail] - Email of the logged-in user (optional)
 * @returns {Promise<Object>} - Response containing listing ID
 */
export async function createListingInCode(listingName, userEmail = null) {
  const parameters = {
    listing_name: listingName,
  };

  // Only include user_email if provided (logged-in users)
  if (userEmail) {
    parameters.user_email = userEmail;
  }

  console.log('[Bubble API] Creating listing in code');
  console.log('[Bubble API] Listing name:', listingName);
  console.log('[Bubble API] User email:', userEmail || 'Not provided (logged out)');

  return await triggerBubbleWorkflow('listing_creation_in_code', parameters);
}
