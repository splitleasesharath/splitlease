/**
 * Status management utilities for Proposal Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Implements proposal status logic from Bubble Steps 5-7
 *
 * IMPORTANT: Uses Bubble's display format for all status values
 * to ensure compatibility with Bubble Data API.
 */

import { ProposalStatusName } from "./types.ts";

/**
 * Status transition rules
 * Maps current status to allowed next statuses
 *
 * Uses Bubble display format for compatibility with Bubble Data API
 */
export const STATUS_TRANSITIONS: Record<
  ProposalStatusName,
  ProposalStatusName[]
> = {
  // Pre-submission states
  "Proposal Submitted for guest by Split Lease - Awaiting Rental Application": [
    "Host Review",
    "Proposal Cancelled by Split Lease",
    "Guest Ignored Suggestion",
  ],
  "Proposal Submitted by guest - Awaiting Rental Application": [
    "Host Review",
    "Proposal Cancelled by Guest",
  ],
  "Proposal Submitted for guest by Split Lease - Pending Confirmation": [
    "Host Review",
    "Proposal Cancelled by Split Lease",
  ],

  // Active workflow states
  "Host Review": [
    "Host Counteroffer Submitted / Awaiting Guest Review",
    "Proposal or Counteroffer Accepted / Drafting Lease Documents",
    "Proposal Rejected by Host",
    "Proposal Cancelled by Guest",
  ],
  "Host Counteroffer Submitted / Awaiting Guest Review": [
    "Proposal or Counteroffer Accepted / Drafting Lease Documents",
    "Proposal Cancelled by Guest",
    "Proposal Rejected by Host",
  ],
  "Proposal or Counteroffer Accepted / Drafting Lease Documents": [
    "Lease Documents Sent for Review",
    "Proposal Cancelled by Guest",
    "Proposal Cancelled by Split Lease",
  ],
  "Lease Documents Sent for Review": [
    "Lease Documents Sent for Signatures",
    "Proposal Cancelled by Guest",
    "Proposal Cancelled by Split Lease",
  ],
  "Lease Documents Sent for Signatures": [
    "Lease Documents Signed / Awaiting Initial payment",
    "Proposal Cancelled by Guest",
    "Proposal Cancelled by Split Lease",
  ],
  "Lease Documents Signed / Awaiting Initial payment": [
    "Initial Payment Submitted / Lease activated",
    "Proposal Cancelled by Guest",
    "Proposal Cancelled by Split Lease",
  ],

  // Terminal states (no transitions out)
  "Initial Payment Submitted / Lease activated": [],
  "Proposal Cancelled by Guest": [],
  "Proposal Rejected by Host": [],
  "Proposal Cancelled by Split Lease": [],
  "Guest Ignored Suggestion": [],
};

/**
 * Status stage mapping for UI display
 * Stage 0 = pre-submission, 1-7 = active workflow, -1 = terminal
 */
export const STATUS_STAGES: Record<ProposalStatusName, number> = {
  "Proposal Submitted for guest by Split Lease - Awaiting Rental Application": 0,
  "Proposal Submitted by guest - Awaiting Rental Application": 0,
  "Proposal Submitted for guest by Split Lease - Pending Confirmation": 0,
  "Host Review": 1,
  "Host Counteroffer Submitted / Awaiting Guest Review": 2,
  "Proposal or Counteroffer Accepted / Drafting Lease Documents": 3,
  "Lease Documents Sent for Review": 4,
  "Lease Documents Sent for Signatures": 5,
  "Lease Documents Signed / Awaiting Initial payment": 6,
  "Initial Payment Submitted / Lease activated": 7,
  "Proposal Cancelled by Guest": -1,
  "Proposal Rejected by Host": -1,
  "Proposal Cancelled by Split Lease": -1,
  "Guest Ignored Suggestion": -1,
};

/**
 * Determine initial status based on rental application state
 * Mirrors Bubble workflow Steps 5-7
 *
 * @param hasRentalApplication - Whether the guest has a rental application record
 * @param rentalAppSubmitted - Whether the rental application has been submitted
 * @param overrideStatus - Optional status to use instead of calculated one
 * @returns Initial status for the proposal (Bubble display format)
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
    return "Host Review";
  }

  // Step 6: If rental application NOT submitted → Awaiting Rental Application
  return "Proposal Submitted by guest - Awaiting Rental Application";
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
    "Proposal Cancelled by Guest",
    "Proposal Cancelled by Split Lease",
    "Proposal Rejected by Host",
    "Guest Ignored Suggestion",
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
  return STATUS_STAGES[status] ?? -1;
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
    const guestCanCancel: ProposalStatusName[] = [
      "Proposal Submitted for guest by Split Lease - Awaiting Rental Application",
      "Proposal Submitted by guest - Awaiting Rental Application",
      "Proposal Submitted for guest by Split Lease - Pending Confirmation",
      "Host Review",
      "Host Counteroffer Submitted / Awaiting Guest Review",
      "Proposal or Counteroffer Accepted / Drafting Lease Documents",
      "Lease Documents Sent for Review",
      "Lease Documents Sent for Signatures",
      "Lease Documents Signed / Awaiting Initial payment",
    ];
    return guestCanCancel.includes(currentStatus);
  }

  // Host can reject at host_review or host_counteroffer stages
  if (userRole === "host") {
    const hostCanReject: ProposalStatusName[] = [
      "Host Review",
      "Host Counteroffer Submitted / Awaiting Guest Review",
    ];
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
      return "Proposal Cancelled by Guest";
    case "host":
      return "Proposal Rejected by Host";
    case "admin":
      return "Proposal Cancelled by Split Lease";
    default:
      return "Proposal Cancelled by Split Lease";
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

  const actorSuffix = actor ? ` by ${actor}` : "";

  return `Status changed to "${newStatus}"${actorSuffix} on ${timestamp}`;
}
