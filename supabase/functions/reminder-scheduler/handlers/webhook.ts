/**
 * Webhook Handler for Delivery Tracking
 * Split Lease - Reminder House Manual Feature
 *
 * Handles webhooks from SendGrid and Twilio to update delivery status
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { WebhookPayload, DeliveryStatus } from "../lib/types.ts";

/**
 * Map SendGrid events to delivery status
 */
const mapSendGridEvent = (event: string): DeliveryStatus | null => {
  switch (event) {
    case 'delivered':
      return 'delivered';
    case 'bounce':
    case 'blocked':
      return 'bounced';
    case 'dropped':
    case 'deferred':
      return 'failed';
    case 'open':
      return null; // Special handling for opens
    default:
      return null;
  }
};

/**
 * Map Twilio events to delivery status
 */
const mapTwilioEvent = (event: string): DeliveryStatus | null => {
  switch (event) {
    case 'delivered':
      return 'delivered';
    case 'failed':
    case 'undelivered':
      return 'failed';
    default:
      return null;
  }
};

/**
 * Handle SendGrid webhook
 */
export const handleSendGridWebhook = async (
  payload: WebhookPayload,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ updated: boolean }> => {
  console.log('[webhook:sendgrid] Processing event:', payload.event);

  if (!payload.messageId) {
    console.warn('[webhook:sendgrid] No message ID provided');
    return { updated: false };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Handle open event separately
  if (payload.event === 'open') {
    const { error } = await supabase
      .from('remindersfromhousemanual')
      .update({
        opened_at: payload.timestamp || new Date().toISOString(),
      })
      .eq('sendgrid_message_id', payload.messageId);

    if (error) {
      console.error('[webhook:sendgrid] Update error:', error);
      return { updated: false };
    }

    console.log('[webhook:sendgrid] Marked as opened');
    return { updated: true };
  }

  // Map event to delivery status
  const deliveryStatus = mapSendGridEvent(payload.event);

  if (!deliveryStatus) {
    console.log('[webhook:sendgrid] Unhandled event:', payload.event);
    return { updated: false };
  }

  // Update reminder
  const updates: Record<string, unknown> = {
    delivery_status: deliveryStatus,
  };

  if (deliveryStatus === 'delivered') {
    updates.delivered_at = payload.timestamp || new Date().toISOString();
  }

  const { error } = await supabase
    .from('remindersfromhousemanual')
    .update(updates)
    .eq('sendgrid_message_id', payload.messageId);

  if (error) {
    console.error('[webhook:sendgrid] Update error:', error);
    return { updated: false };
  }

  console.log('[webhook:sendgrid] Updated status to:', deliveryStatus);
  return { updated: true };
};

/**
 * Handle Twilio webhook
 */
export const handleTwilioWebhook = async (
  payload: WebhookPayload,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ updated: boolean }> => {
  console.log('[webhook:twilio] Processing event:', payload.event);

  if (!payload.messageSid) {
    console.warn('[webhook:twilio] No message SID provided');
    return { updated: false };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Map event to delivery status
  const deliveryStatus = mapTwilioEvent(payload.event);

  if (!deliveryStatus) {
    console.log('[webhook:twilio] Unhandled event:', payload.event);
    return { updated: false };
  }

  // Update reminder
  const updates: Record<string, unknown> = {
    delivery_status: deliveryStatus,
  };

  if (deliveryStatus === 'delivered') {
    updates.delivered_at = payload.timestamp || new Date().toISOString();
  }

  const { error } = await supabase
    .from('remindersfromhousemanual')
    .update(updates)
    .eq('twilio_message_sid', payload.messageSid);

  if (error) {
    console.error('[webhook:twilio] Update error:', error);
    return { updated: false };
  }

  console.log('[webhook:twilio] Updated status to:', deliveryStatus);
  return { updated: true };
};
