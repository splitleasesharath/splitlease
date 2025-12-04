/**
 * Slack Service - Cloudflare Pages Function Proxy
 *
 * Handles Slack-related operations via Cloudflare Pages Functions.
 * Uses /api/faq-inquiry endpoint (Cloudflare Pages Function).
 *
 * NOTE: Switched from Supabase Edge Functions due to known bug where
 * secrets don't propagate to Edge Functions (GitHub issue #38329).
 * Cloudflare Pages Functions work correctly with secrets.
 *
 * NO FALLBACK: If the function fails, we fail.
 *
 * @module slackService
 */

/**
 * Send an FAQ inquiry to Slack channels via Cloudflare Pages Function
 * NO FALLBACK - Throws if function fails
 *
 * @param {Object} inquiry - The inquiry data
 * @param {string} inquiry.name - Name of the person submitting
 * @param {string} inquiry.email - Email of the person submitting
 * @param {string} inquiry.inquiry - The inquiry message
 * @returns {Promise<Object>} - Success response with message
 */
export async function sendFaqInquiry({ name, email, inquiry }) {
  console.log('[Slack Service] Sending FAQ inquiry via Cloudflare Pages Function');

  if (!name?.trim() || !email?.trim() || !inquiry?.trim()) {
    throw new Error('All fields are required');
  }

  try {
    const response = await fetch('/api/faq-inquiry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        inquiry: inquiry.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Slack Service] Cloudflare Function error:', data);
      throw new Error(data.error || 'Failed to send inquiry');
    }

    if (!data.success) {
      throw new Error(data.error || 'Unknown error');
    }

    console.log('[Slack Service] FAQ inquiry sent successfully');
    return data;
  } catch (error) {
    console.error('[Slack Service] Failed to send FAQ inquiry:', error);
    throw error;
  }
}
