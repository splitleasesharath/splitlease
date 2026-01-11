// Cloudflare Pages Function to handle listing import requests
// Sends import requests to Slack channels via webhooks

// CORS headers used by all handlers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Handle CORS preflight OPTIONS requests
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

// Handle POST requests
export async function onRequestPost(context) {
  const { request } = context;

  try {
    // Parse the request body
    const { listingUrl, emailAddress, userId, userName } = await request.json();

    // Validate inputs
    if (!listingUrl || !emailAddress) {
      return new Response(
        JSON.stringify({ error: 'Listing URL and email address are required' }),
        {
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        {
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Build user info line if available
    const userInfo = userName ? `*Host:* ${userName}${userId ? ` (${userId})` : ''}\n` : '';

    // Create Slack message with rich formatting
    const slackMessage = {
      text: `*📥 New Listing Import Request*\n\n${userInfo}*Listing URL:* ${listingUrl}\n*Email:* ${emailAddress}\n*Submitted:* ${new Date().toISOString()}`
    };

    // Get Slack webhook URLs from environment variables
    const webhookAddingListings = context.env.SLACK_WEBHOOK_ADDINGLISTINGS;
    const webhookGeneral = context.env.SLACK_WEBHOOK_GENERAL;

    if (!webhookAddingListings || !webhookGeneral) {
      console.error('Missing Slack webhook environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: corsHeaders
        }
      );
    }

    const webhooks = [webhookAddingListings, webhookGeneral];

    // Send to both Slack channels
    const results = await Promise.allSettled(
      webhooks.map(webhook =>
        fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackMessage)
        })
      )
    );

    // Check if at least one succeeded
    const hasSuccess = results.some(result => result.status === 'fulfilled' && result.value.ok);

    if (!hasSuccess) {
      console.error('All Slack webhooks failed:', results);
      return new Response(
        JSON.stringify({ error: 'Failed to send import request to Slack' }),
        {
          status: 500,
          headers: corsHeaders
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({ success: true, message: 'Import request submitted successfully' }),
      {
        status: 200,
        headers: corsHeaders
      }
    );

  } catch (error) {
    console.error('Error processing import listing request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
}



