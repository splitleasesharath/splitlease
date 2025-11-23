/**
 * Bubble.io API Service
 *
 * Handles communication with Bubble.io backend workflows
 */

const BUBBLE_CONFIG = {
  appDomain: 'app.split.lease',
  apiVersion: '1.1',
};

/**
 * Get Bubble API configuration
 */
const getBubbleConfig = () => {
  // Try to get API key from environment variable
  const apiKey = import.meta.env.VITE_BUBBLE_API_KEY;

  if (!apiKey) {
    console.error('[Bubble API] API key not found in environment variables');
  }

  return {
    baseUrl: `https://${BUBBLE_CONFIG.appDomain}/api/${BUBBLE_CONFIG.apiVersion}`,
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
