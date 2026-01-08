/**
 * Type definitions for Virtual Meeting Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * FP PATTERN: All interfaces use readonly modifiers for immutability
 *
 * @module virtual-meeting/lib/types
 */

// ─────────────────────────────────────────────────────────────
// Request Types - Create
// ─────────────────────────────────────────────────────────────

export interface CreateVirtualMeetingInput {
  readonly proposalId: string;           // Required: FK to proposal._id
  readonly timesSelected: readonly string[];      // Required: Array of ISO 8601 datetime strings (exactly 3)
  readonly requestedById: string;        // Required: FK to user._id (current user)
  readonly timezoneString?: string;      // Optional: default 'America/New_York'
  readonly isAlternativeTimes?: boolean; // Optional: true if suggesting alternative times
}

// ─────────────────────────────────────────────────────────────
// Response Types - Create
// ─────────────────────────────────────────────────────────────

export interface CreateVirtualMeetingResponse {
  readonly virtualMeetingId: string;
  readonly proposalId: string;
  readonly requestedById: string;
  readonly createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// Database Types
// ─────────────────────────────────────────────────────────────

export interface ProposalData {
  readonly _id: string;
  readonly Guest: string;
  readonly Listing: string;
  readonly 'Host User': string;
}

export interface ListingData {
  readonly _id: string;
  readonly 'Host User': string;
  readonly 'Created By': string;
}

export interface UserData {
  readonly _id: string;
  readonly email: string;
  readonly 'Name - First'?: string;
  readonly 'Name - Full'?: string;
}

export interface HostAccountData {
  readonly _id: string;
  readonly User: string;
}

export interface VirtualMeetingRecord {
  readonly _id: string;
  readonly 'Created By': string;
  readonly 'Created Date': string;
  readonly 'Modified Date': string;
  readonly host: string;
  readonly guest: string;
  readonly proposal: string;
  readonly 'requested by': string;
  readonly 'meeting duration': number;
  readonly 'suggested dates and times': readonly string[];
  readonly 'booked date': string | null;
  readonly confirmedBySplitLease: boolean;
  readonly 'meeting declined': boolean;
  readonly 'meeting link': string | null;
  readonly 'guest email': string | null;
  readonly 'guest name': string | null;
  readonly 'host email': string | null;
  readonly 'host name': string | null;
  readonly 'invitation sent to guest?': boolean;
  readonly 'invitation sent to host?': boolean;
  readonly 'end of meeting': string | null;
  readonly 'Listing (for Co-Host feature)': string | null;
  readonly pending: boolean;
}

// ─────────────────────────────────────────────────────────────
// User Context Type
// ─────────────────────────────────────────────────────────────

export interface UserContext {
  readonly id: string;
  readonly email: string;
}

// ─────────────────────────────────────────────────────────────
// Request/Response Types - Delete
// ─────────────────────────────────────────────────────────────

export interface DeleteVirtualMeetingInput {
  readonly virtualMeetingId: string;  // Required: _id of the virtual meeting to delete
  readonly proposalId: string;        // Required: _id of the associated proposal
}

export interface DeleteVirtualMeetingResponse {
  readonly deleted: boolean;
  readonly virtualMeetingId: string;
  readonly proposalId: string;
  readonly deletedAt: string;
}

// ─────────────────────────────────────────────────────────────
// Request/Response Types - Accept
// ─────────────────────────────────────────────────────────────

export interface AcceptVirtualMeetingInput {
  readonly proposalId: string;           // Required: FK to proposal._id
  readonly bookedDate: string;           // Required: ISO 8601 datetime (selected time slot)
  readonly userAcceptingId: string;      // Required: FK to user._id (user accepting)
}

export interface AcceptVirtualMeetingResponse {
  readonly success: boolean;
  readonly virtualMeetingId: string;
  readonly proposalId: string;
  readonly bookedDate: string;
  readonly updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// Request/Response Types - Decline
// ─────────────────────────────────────────────────────────────

export interface DeclineVirtualMeetingInput {
  readonly proposalId: string;           // Required: FK to proposal._id
}

export interface DeclineVirtualMeetingResponse {
  readonly success: boolean;
  readonly proposalId: string;
  readonly declinedAt: string;
}

// ─────────────────────────────────────────────────────────────
// Request/Response Types - Calendar Invite
// ─────────────────────────────────────────────────────────────

export interface SendCalendarInviteInput {
  readonly proposalId: string;           // Required: FK to proposal._id
  readonly userId: string;               // Required: FK to user._id (recipient)
}

export interface SendCalendarInviteResponse {
  readonly success: boolean;
  readonly proposalId: string;
  readonly userId: string;
  readonly triggeredAt: string;
}

// ─────────────────────────────────────────────────────────────
// Request/Response Types - Notify Participants
// ─────────────────────────────────────────────────────────────

export interface NotifyParticipantsInput {
  readonly hostId: string;               // Required: FK to user._id
  readonly guestId: string;              // Required: FK to user._id
  readonly virtualMeetingId: string;     // Required: FK to virtualmeetingschedulesandlinks._id
}

export interface NotifyParticipantsResponse {
  readonly success: boolean;
  readonly virtualMeetingId: string;
  readonly notifiedAt: string;
}
