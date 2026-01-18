// Cloudflare Pages Function to handle FAQ inquiries
// Sends inquiries to Slack channels via webhooks

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
    const { name, email, inquiry } = await request.json();

    // Validate inputs
    if (!name || !email || !inquiry) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }),
        {
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        {
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Create Slack message
    const slackMessage = {
      text: `*New FAQ Inquiry*\n\n*Name:* ${name}\n*Email:* ${email}\n*Inquiry:*\n${inquiry}`
    };

    // Get Slack webhook URLs from environment variables
    const webhookAcquisition = context.env.SLACK_WEBHOOK_ACQUISITION;
    const webhookGeneral = context.env.SLACK_WEBHOOK_GENERAL;

    if (!webhookAcquisition || !webhookGeneral) {
      console.error('Missing Slack webhook environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: corsHeaders
        }
      );
    }

    const webhooks = [webhookAcquisition, webhookGeneral];

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
        JSON.stringify({ error: 'Failed to send inquiry to Slack' }),
        {
          status: 500,
          headers: corsHeaders
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({ success: true, message: 'Inquiry sent successfully' }),
      {
        status: 200,
        headers: corsHeaders
      }
    );

  } catch (error) {
    console.error('Error processing FAQ inquiry:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
}
