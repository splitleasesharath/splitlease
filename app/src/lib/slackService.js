/**
 * Slack Service - Edge Function Proxy
 *
 * Handles Slack-related operations via Supabase Edge Functions.
 * NO FALLBACK: If Edge Function fails, we fail.
 *
 * @module slackService
 */

import { supabase } from './supabase.js';

/**
 * Send an FAQ inquiry to Slack channels via Edge Function
 * NO FALLBACK - Throws if Edge Function fails
 *
 * @param {Object} inquiry - The inquiry data
 * @param {string} inquiry.name - Name of the person submitting
 * @param {string} inquiry.email - Email of the person submitting
 * @param {string} inquiry.inquiry - The inquiry message
 * @returns {Promise<Object>} - Success response with message
 */
export async function sendFaqInquiry({ name, email, inquiry }) {
  console.log('[Slack Service] Sending FAQ inquiry via Edge Function');

  if (!name?.trim() || !email?.trim() || !inquiry?.trim()) {
    throw new Error('All fields are required');
  }

  try {
    const { data, error } = await supabase.functions.invoke('slack', {
      body: {
        action: 'faq_inquiry',
        payload: {
          name: name.trim(),
          email: email.trim(),
          inquiry: inquiry.trim(),
        },
      },
    });

    if (error) {
      console.error('[Slack Service] Edge Function error:', error);
      throw new Error(error.message || 'Failed to send inquiry');
    }

    if (!data.success) {
      throw new Error(data.error || 'Unknown error');
    }

    console.log('[Slack Service] FAQ inquiry sent successfully');
    return data.data;
  } catch (error) {
    console.error('[Slack Service] Failed to send FAQ inquiry:', error);
    throw error;
  }
}
