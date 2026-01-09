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

/**
 * Send abandoned market research alert to Slack
 * Called when user closes the AI market research modal with typed content
 * NO FALLBACK - Fire and forget (non-blocking)
 *
 * @param {Object} data - The abandoned research data
 * @param {string} data.text - The text the user typed before abandoning
 * @param {Object} data.sessionInfo - Session metadata (url, timestamp, etc.)
 * @returns {Promise<Object>} - Success response or error
 */
export async function sendAbandonedResearch({ text, sessionInfo }) {
  console.log('[Slack Service] Sending abandoned research alert');

  if (!text?.trim()) {
    console.log('[Slack Service] No text to send, skipping');
    return { success: false, skipped: true };
  }

  try {
    const response = await fetch('/api/abandoned-research', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.trim(),
        sessionInfo: {
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          referrer: document.referrer || 'direct',
          ...sessionInfo,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Slack Service] Abandoned research alert error:', data);
      // Don't throw - this is fire-and-forget
      return { success: false, error: data.error };
    }

    console.log('[Slack Service] Abandoned research alert sent successfully');
    return data;
  } catch (error) {
    // Log but don't throw - we don't want to interrupt user flow
    console.error('[Slack Service] Failed to send abandoned research alert:', error);
    return { success: false, error: error.message };
  }
}
