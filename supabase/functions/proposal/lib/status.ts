/**
 * Status management utilities for Proposal Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Implements proposal status logic from Bubble Steps 5-7
 */

import { ProposalStatusName } from "./types.ts";

/**
 * Status transition rules
 * Maps current status to allowed next statuses
 *
 * Based on os_proposal_status option set and business rules
 */
export const STATUS_TRANSITIONS: Record<
  ProposalStatusName,
  ProposalStatusName[]
> = {
  // Pre-submission states
  sl_submitted_awaiting_rental_app: [
    "host_review",
    "cancelled_by_sl",
    "guest_ignored_suggestion",
  ],
  guest_submitted_awaiting_rental_app: ["host_review", "cancelled_by_guest"],
  sl_submitted_pending_confirmation: ["host_review", "cancelled_by_sl"],

  // Active workflow states
  host_review: [
    "host_counteroffer",
    "accepted_drafting_lease",
    "rejected_by_host",
    "cancelled_by_guest",
  ],
  host_counteroffer: [
    "accepted_drafting_lease",
    "cancelled_by_guest",
    "rejected_by_host",
  ],
  accepted_drafting_lease: [
    "lease_docs_for_review",
    "cancelled_by_guest",
    "cancelled_by_sl",
  ],
  lease_docs_for_review: [
    "lease_docs_for_signatures",
    "cancelled_by_guest",
    "cancelled_by_sl",
  ],
  lease_docs_for_signatures: [
    "lease_signed_awaiting_payment",
    "cancelled_by_guest",
    "cancelled_by_sl",
  ],
  lease_signed_awaiting_payment: [
    "payment_submitted_lease_activated",
    "cancelled_by_guest",
    "cancelled_by_sl",
  ],

  // Terminal states (no transitions out)
  payment_submitted_lease_activated: [],
  cancelled_by_guest: [],
  rejected_by_host: [],
  cancelled_by_sl: [],
  guest_ignored_suggestion: [],
};

/**
 * Status display information
 * Based on os_proposal_status table
 */
export const STATUS_DISPLAY: Record<
  ProposalStatusName,
  { display: string; stage: number }
> = {
  sl_submitted_awaiting_rental_app: {
    display: "Proposal Submitted for guest by Split Lease - Awaiting Rental Application",
    stage: 0,
  },
  guest_submitted_awaiting_rental_app: {
    display: "Proposal Submitted by guest - Awaiting Rental Application",
    stage: 0,
  },
  sl_submitted_pending_confirmation: {
    display: "Proposal Submitted for guest by Split Lease - Pending Confirmation",
    stage: 0,
  },
  host_review: {
    display: "Host Review",
    stage: 1,
  },
  host_counteroffer: {
    display: "Host Counteroffer Submitted / Awaiting Guest Review",
    stage: 2,
  },
  accepted_drafting_lease: {
    display: "Proposal or Counteroffer Accepted / Drafting Lease Documents",
    stage: 3,
  },
  lease_docs_for_review: {
    display: "Lease Documents Sent for Review",
    stage: 4,
  },
  lease_docs_for_signatures: {
    display: "Lease Documents Sent for Signatures",
    stage: 5,
  },
  lease_signed_awaiting_payment: {
    display: "Lease Documents Signed / Awaiting Initial payment",
    stage: 6,
  },
  payment_submitted_lease_activated: {
    display: "Initial Payment Submitted / Lease activated",
    stage: 7,
  },
  cancelled_by_guest: {
    display: "Proposal Cancelled by Guest",
    stage: -1,
  },
  rejected_by_host: {
    display: "Proposal Rejected by Host",
    stage: -1,
  },
  cancelled_by_sl: {
    display: "Proposal Cancelled by Split Lease",
    stage: -1,
  },
  guest_ignored_suggestion: {
    display: "Guest Ignored Suggestion",
    stage: -1,
  },
};

/**
 * Determine initial status based on rental application state
 * Mirrors Bubble workflow Steps 5-7
 *
 * @param hasRentalApplication - Whether the guest has a rental application record
 * @param rentalAppSubmitted - Whether the rental application has been submitted
 * @param overrideStatus - Optional status to use instead of calculated one
 * @returns Initial status for the proposal
 */
export function determineInitialStatus(
  hasRentalApplication: boolean,
  rentalAppSubmitted: boolean,
  overrideStatus?: ProposalStatusName
): ProposalStatusName {
  // Step 7: If status parameter provided, use it
  if (overrideStatus && isValidStatus(overrideStatus)) {
    return overrideStatus;
  }

  // Step 5: If rental application is submitted → Host Review
  if (hasRentalApplication && rentalAppSubmitted) {
    return "host_review";
  }

  // Step 6: If rental application NOT submitted → Awaiting Rental Application
  return "guest_submitted_awaiting_rental_app";
}

/**
 * Check if a status name is valid
 *
 * @param status - Status to validate
 * @returns true if status is valid
 */
export function isValidStatus(status: string): status is ProposalStatusName {
  return status in STATUS_TRANSITIONS;
}

/**
 * Validate that a status transition is allowed
 *
 * @param currentStatus - Current proposal status
 * @param newStatus - Requested new status
 * @returns true if transition is allowed
 */
export function isValidStatusTransition(
  currentStatus: ProposalStatusName,
  newStatus: ProposalStatusName
): boolean {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions?.includes(newStatus) ?? false;
}

/**
 * Check if a status is terminal (cannot transition further)
 *
 * @param status - Status to check
 * @returns true if status is terminal
 */
export function isTerminalStatus(status: ProposalStatusName): boolean {
  const transitions = STATUS_TRANSITIONS[status];
  return !transitions || transitions.length === 0;
}

/**
 * Check if a status is a cancellation/rejection status
 *
 * @param status - Status to check
 * @returns true if status represents cancellation or rejection
 */
export function isCancelledStatus(status: ProposalStatusName): boolean {
  return [
    "cancelled_by_guest",
    "cancelled_by_sl",
    "rejected_by_host",
    "guest_ignored_suggestion",
  ].includes(status);
}

/**
 * Check if a status is in the active workflow (not pre-submission or terminal)
 *
 * @param status - Status to check
 * @returns true if status is in active workflow
 */
export function isActiveWorkflowStatus(status: ProposalStatusName): boolean {
  const stage = getStatusStage(status);
  return stage > 0 && stage <= 7;
}

/**
 * Get status stage number for UI display
 *
 * @param status - Status to get stage for
 * @returns Stage number (0 = pre-submission, 1-7 = active, -1 = terminal)
 */
export function getStatusStage(status: ProposalStatusName): number {
  return STATUS_DISPLAY[status]?.stage ?? -1;
}

/**
 * Get display name for a status
 *
 * @param status - Status to get display name for
 * @returns Human-readable display name
 */
export function getStatusDisplayName(status: ProposalStatusName): string {
  return STATUS_DISPLAY[status]?.display ?? status;
}

/**
 * Get all valid next statuses from current status
 *
 * @param currentStatus - Current status
 * @returns Array of valid next statuses
 */
export function getValidNextStatuses(
  currentStatus: ProposalStatusName
): ProposalStatusName[] {
  return STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Check if user can cancel the proposal based on current status and role
 *
 * @param currentStatus - Current proposal status
 * @param userRole - Role of the user (guest, host, admin)
 * @returns true if user can cancel
 */
export function canUserCancel(
  currentStatus: ProposalStatusName,
  userRole: "guest" | "host" | "admin"
): boolean {
  // Already cancelled
  if (isCancelledStatus(currentStatus)) {
    return false;
  }

  // Admin can always cancel
  if (userRole === "admin") {
    return true;
  }

  // Guest can cancel at most stages
  if (userRole === "guest") {
    const guestCanCancel = [
      "sl_submitted_awaiting_rental_app",
      "guest_submitted_awaiting_rental_app",
      "sl_submitted_pending_confirmation",
      "host_review",
      "host_counteroffer",
      "accepted_drafting_lease",
      "lease_docs_for_review",
      "lease_docs_for_signatures",
      "lease_signed_awaiting_payment",
    ];
    return guestCanCancel.includes(currentStatus);
  }

  // Host can reject at host_review or host_counteroffer stages
  if (userRole === "host") {
    const hostCanReject = ["host_review", "host_counteroffer"];
    return hostCanReject.includes(currentStatus);
  }

  return false;
}

/**
 * Get the appropriate cancellation status based on user role
 *
 * @param userRole - Role of the user cancelling
 * @returns Appropriate cancellation status
 */
export function getCancellationStatus(
  userRole: "guest" | "host" | "admin"
): ProposalStatusName {
  switch (userRole) {
    case "guest":
      return "cancelled_by_guest";
    case "host":
      return "rejected_by_host";
    case "admin":
      return "cancelled_by_sl";
    default:
      return "cancelled_by_sl";
  }
}

/**
 * Create a history entry for status change
 *
 * @param newStatus - New status being set
 * @param actor - Who made the change (optional)
 * @returns Formatted history entry string
 */
export function createStatusHistoryEntry(
  newStatus: ProposalStatusName,
  actor?: string
): string {
  const timestamp = new Date().toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const displayName = getStatusDisplayName(newStatus);
  const actorSuffix = actor ? ` by ${actor}` : "";

  return `Status changed to "${displayName}"${actorSuffix} on ${timestamp}`;
}
