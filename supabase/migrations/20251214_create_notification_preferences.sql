-- Migration: Create notification_preferences table
-- Purpose: Supabase-native table for user notification preferences
-- Replaces dependency on Bubble-synced notificationsettingsos_lists_ table

-- ============================================================================
-- CREATE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  
  -- Message Forwarding
  message_forwarding_sms BOOLEAN NOT NULL DEFAULT false,
  message_forwarding_email BOOLEAN NOT NULL DEFAULT false,
  
  -- Payment Reminders
  payment_reminders_sms BOOLEAN NOT NULL DEFAULT false,
  payment_reminders_email BOOLEAN NOT NULL DEFAULT false,
  
  -- Promotional
  promotional_sms BOOLEAN NOT NULL DEFAULT false,
  promotional_email BOOLEAN NOT NULL DEFAULT false,
  
  -- Reservation Updates
  reservation_updates_sms BOOLEAN NOT NULL DEFAULT false,
  reservation_updates_email BOOLEAN NOT NULL DEFAULT false,
  
  -- Lease Requests
  lease_requests_sms BOOLEAN NOT NULL DEFAULT false,
  lease_requests_email BOOLEAN NOT NULL DEFAULT false,
  
  -- Proposal Updates
  proposal_updates_sms BOOLEAN NOT NULL DEFAULT false,
  proposal_updates_email BOOLEAN NOT NULL DEFAULT false,
  
  -- Check-in/Check-out Reminders
  checkin_checkout_sms BOOLEAN NOT NULL DEFAULT false,
  checkin_checkout_email BOOLEAN NOT NULL DEFAULT false,
  
  -- Reviews
  reviews_sms BOOLEAN NOT NULL DEFAULT false,
  reviews_email BOOLEAN NOT NULL DEFAULT false,
  
  -- Tips / Market Insights
  tips_insights_sms BOOLEAN NOT NULL DEFAULT false,
  tips_insights_email BOOLEAN NOT NULL DEFAULT false,
  
  -- Account Access Assistance
  account_assistance_sms BOOLEAN NOT NULL DEFAULT false,
  account_assistance_email BOOLEAN NOT NULL DEFAULT false,
  
  -- Virtual Meetings
  virtual_meetings_sms BOOLEAN NOT NULL DEFAULT false,
  virtual_meetings_email BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT notification_preferences_user_id_unique UNIQUE (user_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id 
  ON notification_preferences (user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own preferences
CREATE POLICY "Users can read own notification preferences"
  ON notification_preferences
  FOR SELECT
  USING (true);  -- Allow all reads (user_id filtering done in app)

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (true);  -- Allow all inserts (user_id set by app)

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences
  FOR UPDATE
  USING (true)  -- Allow all updates (user_id filtering done in app)
  WITH CHECK (true);

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE notification_preferences IS 'User notification preferences for SMS and Email channels across 11 categories';
COMMENT ON COLUMN notification_preferences.user_id IS 'Reference to user._id (Bubble user ID)';
COMMENT ON COLUMN notification_preferences.message_forwarding_sms IS 'Receive forwarded messages via SMS';
COMMENT ON COLUMN notification_preferences.message_forwarding_email IS 'Receive forwarded messages via Email';
COMMENT ON COLUMN notification_preferences.payment_reminders_sms IS 'Billing and payment notifications via SMS';
COMMENT ON COLUMN notification_preferences.payment_reminders_email IS 'Billing and payment notifications via Email';
COMMENT ON COLUMN notification_preferences.promotional_sms IS 'Marketing and promotional content via SMS';
COMMENT ON COLUMN notification_preferences.promotional_email IS 'Marketing and promotional content via Email';
COMMENT ON COLUMN notification_preferences.reservation_updates_sms IS 'Booking changes via SMS';
COMMENT ON COLUMN notification_preferences.reservation_updates_email IS 'Booking changes via Email';
COMMENT ON COLUMN notification_preferences.lease_requests_sms IS 'Lease inquiries via SMS';
COMMENT ON COLUMN notification_preferences.lease_requests_email IS 'Lease inquiries via Email';
COMMENT ON COLUMN notification_preferences.proposal_updates_sms IS 'Proposal changes via SMS';
COMMENT ON COLUMN notification_preferences.proposal_updates_email IS 'Proposal changes via Email';
COMMENT ON COLUMN notification_preferences.checkin_checkout_sms IS 'Guest arrival/departure alerts via SMS';
COMMENT ON COLUMN notification_preferences.checkin_checkout_email IS 'Guest arrival/departure alerts via Email';
COMMENT ON COLUMN notification_preferences.reviews_sms IS 'Rating and feedback notifications via SMS';
COMMENT ON COLUMN notification_preferences.reviews_email IS 'Rating and feedback notifications via Email';
COMMENT ON COLUMN notification_preferences.tips_insights_sms IS 'Educational content and market analysis via SMS';
COMMENT ON COLUMN notification_preferences.tips_insights_email IS 'Educational content and market analysis via Email';
COMMENT ON COLUMN notification_preferences.account_assistance_sms IS 'Account login and permissions help via SMS';
COMMENT ON COLUMN notification_preferences.account_assistance_email IS 'Account login and permissions help via Email';
COMMENT ON COLUMN notification_preferences.virtual_meetings_sms IS 'Video/online meeting notifications via SMS';
COMMENT ON COLUMN notification_preferences.virtual_meetings_email IS 'Video/online meeting notifications via Email';
