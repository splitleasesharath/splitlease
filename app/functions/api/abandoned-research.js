// Cloudflare Pages Function to handle abandoned market research alerts
// Sends notifications to Slack when users close the modal with typed content

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
    const { text, sessionInfo } = await request.json();

    // Validate inputs - text is required
    if (!text || !text.trim()) {
      return new Response(
        JSON.stringify({ error: 'Text content is required' }),
        {
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Extract session info with defaults
    const {
      timestamp = new Date().toISOString(),
      url = 'unknown',
      userAgent = 'unknown',
      referrer = 'none'
    } = sessionInfo || {};

    // Truncate text if too long (Slack has message limits)
    const truncatedText = text.length > 2000
      ? text.substring(0, 2000) + '... (truncated)'
      : text;

    // Create Slack message with rich formatting
    const slackMessage = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 Abandoned Market Research',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*User started typing but closed the modal without submitting*`
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*What they wrote:*\n\`\`\`${truncatedText}\`\`\``
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `📅 *Time:* ${timestamp}`
            },
            {
              type: 'mrkdwn',
              text: `🌐 *Page:* ${url}`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🔗 *Referrer:* ${referrer}`
            }
          ]
        }
      ],
      // Fallback text for notifications
      text: `Abandoned Market Research: "${truncatedText.substring(0, 100)}..."`
    };

    // Get Slack webhook URL from environment variables
    // Using GENERAL channel for abandoned research alerts
    const webhookGeneral = context.env.SLACK_WEBHOOK_GENERAL;

    if (!webhookGeneral) {
      console.error('Missing SLACK_WEBHOOK_GENERAL environment variable');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: corsHeaders
        }
      );
    }

    // Send to Slack general channel
    const response = await fetch(webhookGeneral, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage)
    });

    if (!response.ok) {
      console.error('Slack webhook failed:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to send notification to Slack' }),
        {
          status: 500,
          headers: corsHeaders
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent successfully' }),
      {
        status: 200,
        headers: corsHeaders
      }
    );

  } catch (error) {
    console.error('Error processing abandoned research alert:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
}
