/**
 * ActionButtonsRow Component (V7 Design)
 *
 * Context-sensitive action buttons based on proposal status:
 * - New: Accept (green), Modify (outline), Decline (danger)
 * - Guest Counter: Accept Counter, Counter Again, Decline
 * - Accepted: Remind Guest (primary), Schedule Meeting, Message
 * - Host Counter: Edit Counter, Message, Withdraw
 * - Declined: Remove only
 *
 * Part of the Host Proposals V7 redesign.
 */
import React from 'react';
import {
  Check,
  SlidersHorizontal,
  X,
  Repeat,
  Bell,
  Video,
  MessageCircle,
  Pencil,
  XCircle,
  Trash2
} from 'lucide-react';

/**
 * Get the status key from a proposal
 * @param {Object} proposal - The proposal object
 * @returns {string} The status key
 */
function getStatusKey(proposal) {
  const status = proposal?.status;
  if (!status) return '';
  if (typeof status === 'string') return status;
  return status.id || status._id || status.key || '';
}

/**
 * Check if proposal has guest counteroffer
 * @param {Object} proposal - The proposal object
 * @returns {boolean} True if has guest counteroffer
 */
function hasGuestCounteroffer(proposal) {
  if (proposal?.has_guest_counteroffer) return true;
  if (proposal?.guest_counteroffer) return true;
  const statusKey = getStatusKey(proposal);
  if (
    proposal?.last_modified_by === 'guest' &&
    (statusKey === 'host_review' || statusKey === 'proposal_submitted')
  ) {
    return true;
  }
  return false;
}

/**
 * Check if proposal is awaiting rental application submission from guest
 * @param {string} statusKey - The status key
 * @returns {boolean} True if awaiting rental app
 */
function isAwaitingRentalApp(statusKey) {
  return statusKey === 'Proposal Submitted by guest - Awaiting Rental Application' ||
         statusKey === 'Proposal Submitted for guest by Split Lease - Awaiting Rental Application';
}

/**
 * ActionButtonsRow displays context-sensitive action buttons
 *
 * @param {Object} props
 * @param {Object} props.proposal - The proposal object
 * @param {Function} props.onAccept - Accept proposal callback
 * @param {Function} props.onModify - Modify/counter proposal callback
 * @param {Function} props.onDecline - Decline proposal callback
 * @param {Function} props.onRemindGuest - Remind guest callback
 * @param {Function} props.onMessage - Message guest callback
 * @param {Function} props.onScheduleMeeting - Schedule meeting callback
 * @param {Function} props.onEditCounter - Edit counteroffer callback
 * @param {Function} props.onWithdraw - Withdraw counteroffer callback
 * @param {Function} props.onRemove - Remove proposal callback
 * @param {Function} props.onRequestRentalApp - Request rental app reminder callback
 */
export function ActionButtonsRow({
  proposal,
  onAccept,
  onModify,
  onDecline,
  onRemindGuest,
  onMessage,
  onScheduleMeeting,
  onEditCounter,
  onWithdraw,
  onRemove,
  onRequestRentalApp
}) {
  const statusKey = getStatusKey(proposal);
  const isGuestCounter = hasGuestCounteroffer(proposal);

  // Guest Counteroffer - needs host response
  if (isGuestCounter) {
    return (
      <div className="hp7-actions-row">
        <button
          type="button"
          className="hp7-btn hp7-btn-success"
          onClick={onAccept}
        >
          <Check size={14} />
          Accept Counter
        </button>
        <button
          type="button"
          className="hp7-btn hp7-btn-outline"
          onClick={onModify}
        >
          <Repeat size={14} />
          Counter Again
        </button>
        <button
          type="button"
          className="hp7-btn hp7-btn-danger"
          onClick={onDecline}
        >
          <X size={14} />
          Decline
        </button>
      </div>
    );
  }

  // Awaiting Rental Application - guest needs to submit rental app before host can review
  if (isAwaitingRentalApp(statusKey)) {
    return (
      <div className="hp7-actions-row">
        <button
          type="button"
          className="hp7-btn hp7-btn-primary"
          onClick={onRequestRentalApp}
        >
          <Bell size={14} />
          Send Reminder
        </button>
        <button
          type="button"
          className="hp7-btn hp7-btn-ghost"
          onClick={onMessage}
        >
          <MessageCircle size={14} />
          Message
        </button>
      </div>
    );
  }

  // New proposal - needs review
  if (statusKey === 'proposal_submitted' || statusKey === 'host_review') {
    return (
      <div className="hp7-actions-row">
        <button
          type="button"
          className="hp7-btn hp7-btn-success"
          onClick={onAccept}
        >
          <Check size={14} />
          Accept
        </button>
        <button
          type="button"
          className="hp7-btn hp7-btn-outline"
          onClick={onModify}
        >
          <SlidersHorizontal size={14} />
          Modify
        </button>
        <button
          type="button"
          className="hp7-btn hp7-btn-danger"
          onClick={onDecline}
        >
          <X size={14} />
          Decline
        </button>
      </div>
    );
  }

  // Host counteroffer - waiting for guest
  if (statusKey === 'host_counteroffer') {
    return (
      <div className="hp7-actions-row">
        <button
          type="button"
          className="hp7-btn hp7-btn-ghost"
          onClick={onEditCounter}
        >
          <Pencil size={14} />
          Edit Counter
        </button>
        <button
          type="button"
          className="hp7-btn hp7-btn-ghost"
          onClick={onMessage}
        >
          <MessageCircle size={14} />
          Message
        </button>
        <button
          type="button"
          className="hp7-btn hp7-btn-danger"
          onClick={onWithdraw}
        >
          <XCircle size={14} />
          Withdraw
        </button>
      </div>
    );
  }

  // Accepted - in progress
  if (statusKey === 'accepted' || statusKey.startsWith('lease_')) {
    return (
      <div className="hp7-actions-row">
        <button
          type="button"
          className="hp7-btn hp7-btn-primary"
          onClick={onRemindGuest}
        >
          <Bell size={14} />
          Remind Guest
        </button>
        <button
          type="button"
          className="hp7-btn hp7-btn-outline"
          onClick={onScheduleMeeting}
        >
          <Video size={14} />
          Schedule Meeting
        </button>
        <button
          type="button"
          className="hp7-btn hp7-btn-ghost"
          onClick={onMessage}
        >
          <MessageCircle size={14} />
          Message
        </button>
      </div>
    );
  }

  // Declined/Cancelled - remove only
  if (
    statusKey === 'rejected_by_host' ||
    statusKey === 'cancelled_by_guest' ||
    statusKey === 'cancelled_by_splitlease'
  ) {
    return (
      <div className="hp7-actions-row">
        <button
          type="button"
          className="hp7-btn hp7-btn-ghost"
          onClick={onRemove}
        >
          <Trash2 size={14} />
          Remove
        </button>
      </div>
    );
  }

  // Active lease - message only
  if (statusKey === 'payment_submitted') {
    return (
      <div className="hp7-actions-row">
        <button
          type="button"
          className="hp7-btn hp7-btn-primary"
          onClick={onMessage}
        >
          <MessageCircle size={14} />
          Message Guest
        </button>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="hp7-actions-row">
      <button
        type="button"
        className="hp7-btn hp7-btn-ghost"
        onClick={onMessage}
      >
        <MessageCircle size={14} />
        Message
      </button>
    </div>
  );
}

export default ActionButtonsRow;
