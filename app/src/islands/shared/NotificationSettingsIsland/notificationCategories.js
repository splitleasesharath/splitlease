/**
 * Notification Categories Configuration
 * Maps UI display to database column names
 */
export const NOTIFICATION_CATEGORIES = [
  {
    id: 'message_forwarding',
    label: 'Message Forwarding',
    description: 'Receive forwarded messages via your preferred channel',
    smsColumn: 'message_forwarding_sms',
    emailColumn: 'message_forwarding_email'
  },
  {
    id: 'payment_reminders',
    label: 'Payment Reminders',
    description: 'Billing and payment notifications',
    smsColumn: 'payment_reminders_sms',
    emailColumn: 'payment_reminders_email'
  },
  {
    id: 'promotional',
    label: 'Promotional',
    description: 'Marketing and promotional content',
    smsColumn: 'promotional_sms',
    emailColumn: 'promotional_email'
  },
  {
    id: 'reservation_updates',
    label: 'Reservation Updates',
    description: 'Changes to your bookings',
    smsColumn: 'reservation_updates_sms',
    emailColumn: 'reservation_updates_email'
  },
  {
    id: 'lease_requests',
    label: 'Lease Requests',
    description: 'Lease-related inquiries',
    smsColumn: 'lease_requests_sms',
    emailColumn: 'lease_requests_email'
  },
  {
    id: 'proposal_updates',
    label: 'Proposal Updates',
    description: 'Changes to proposals',
    smsColumn: 'proposal_updates_sms',
    emailColumn: 'proposal_updates_email'
  },
  {
    id: 'checkin_checkout',
    label: 'Check-in/Check-out Reminders',
    description: 'Guest arrival and departure alerts',
    smsColumn: 'checkin_checkout_sms',
    emailColumn: 'checkin_checkout_email'
  },
  {
    id: 'reviews',
    label: 'Reviews',
    description: 'Rating and feedback notifications',
    smsColumn: 'reviews_sms',
    emailColumn: 'reviews_email'
  },
  {
    id: 'tips_insights',
    label: 'Tips / Market Insights',
    description: 'Educational content and market analysis',
    smsColumn: 'tips_insights_sms',
    emailColumn: 'tips_insights_email'
  },
  {
    id: 'account_assistance',
    label: 'Account Access Assistance',
    description: 'Help with account login and permissions',
    smsColumn: 'account_assistance_sms',
    emailColumn: 'account_assistance_email'
  },
  {
    id: 'virtual_meetings',
    label: 'Virtual Meetings',
    description: 'Video and online meeting notifications',
    smsColumn: 'virtual_meetings_sms',
    emailColumn: 'virtual_meetings_email'
  }
];

/**
 * Get all column names for database queries
 */
export function getAllPreferenceColumns() {
  const columns = ['id', 'user_id', 'created_at', 'updated_at'];
  NOTIFICATION_CATEGORIES.forEach(cat => {
    columns.push(cat.smsColumn);
    columns.push(cat.emailColumn);
  });
  return columns;
}

/**
 * Get default preferences object (all false)
 */
export function getDefaultPreferences() {
  const defaults = {};
  NOTIFICATION_CATEGORIES.forEach(cat => {
    defaults[cat.smsColumn] = false;
    defaults[cat.emailColumn] = false;
  });
  return defaults;
}
