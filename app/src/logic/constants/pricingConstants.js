/**
 * Centralized pricing constants for the Split Lease platform.
 * These values affect guest-facing prices across the application.
 */
export const PRICING_CONSTANTS = {
  /** Full-time stay discount (7 nights/week) as decimal */
  FULL_TIME_DISCOUNT_RATE: 0.13,

  /** Site markup applied to all bookings as decimal */
  SITE_MARKUP_RATE: 0.17,

  /** Minimum nights for full-time discount eligibility */
  FULL_TIME_NIGHTS_THRESHOLD: 7,

  /** Valid night range for pricing calculations */
  MIN_NIGHTS: 2,
  MAX_NIGHTS: 7,

  /** Standard billing cycle in weeks */
  BILLING_CYCLE_WEEKS: 4
};
