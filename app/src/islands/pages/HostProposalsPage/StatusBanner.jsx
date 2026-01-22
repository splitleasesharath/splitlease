/**
 * StatusBanner Component (V7 Design)
 *
 * A colored banner displaying status information with icon and message.
 * Colors vary by status type:
 * - Purple: Action needed (new proposal)
 * - Yellow: Guest counteroffer
 * - Green: Accepted
 * - Red: Declined/Cancelled
 *
 * Part of the Host Proposals V7 redesign.
 */
import React from 'react';
import { Inbox, Repeat, Check, Clock, X } from 'lucide-react';

/**
 * Simple time ago formatter
 * @param {Date} date - The date to format
 * @returns {string} Human-readable time difference
 */
function formatDistanceToNow(date) {
  if (!date) return '';
  const now = new Date();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  }
  if (diffHours > 0) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  if (diffMinutes > 0) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }
  return 'just now';
}

/**
 * Get status banner configuration
 * @param {Object} proposal - The proposal object
 * @returns {{ variant: string, icon: Component, title: string, message: string }}
 */
function getStatusBannerConfig(proposal) {
  const status = typeof proposal?.status === 'string'
    ? proposal.status
    : (proposal?.status?.id || proposal?.status?._id || '');

  const submittedAt = proposal?.created_at || proposal?.Created_Date;
  const timeAgo = submittedAt ? formatDistanceToNow(new Date(submittedAt)) : '';

  // Guest counteroffer
  if (proposal?.has_guest_counteroffer || proposal?.guest_counteroffer || proposal?.last_modified_by === 'guest') {
    const guestName = proposal?.guest?.name || proposal?.guest?.first_name || 'Guest';
    return {
      variant: 'warning',
      icon: Repeat,
      title: 'Guest Counteroffer',
      message: `${guestName} proposed different terms`
    };
  }

  // Status-based configs
  const configs = {
    proposal_submitted: {
      variant: 'action-needed',
      icon: Inbox,
      title: 'New Proposal',
      message: timeAgo ? `Submitted ${timeAgo}` : 'Awaiting your review'
    },
    host_review: {
      variant: 'action-needed',
      icon: Inbox,
      title: 'New Proposal',
      message: timeAgo ? `Submitted ${timeAgo}` : 'Awaiting your review'
    },
    host_counteroffer: {
      variant: 'default',
      icon: Clock,
      title: 'Counteroffer Sent',
      message: 'Waiting for guest response'
    },
    accepted: {
      variant: 'success',
      icon: Check,
      title: 'Accepted',
      message: 'Waiting for guest to complete rental application'
    },
    lease_documents_sent: {
      variant: 'success',
      icon: Check,
      title: 'Lease Documents Sent',
      message: 'Waiting for signatures'
    },
    lease_documents_signatures: {
      variant: 'success',
      icon: Check,
      title: 'Awaiting Signatures',
      message: 'Documents sent for signing'
    },
    lease_signed: {
      variant: 'success',
      icon: Check,
      title: 'Lease Signed',
      message: 'Waiting for initial payment'
    },
    payment_submitted: {
      variant: 'success',
      icon: Check,
      title: 'Active Lease',
      message: 'Payment received, lease is active'
    },
    cancelled_by_guest: {
      variant: 'declined',
      icon: X,
      title: 'Cancelled',
      message: 'Guest cancelled this proposal'
    },
    rejected_by_host: {
      variant: 'declined',
      icon: X,
      title: 'Declined',
      message: proposal?.decline_reason || 'You declined this proposal'
    },
    cancelled_by_splitlease: {
      variant: 'declined',
      icon: X,
      title: 'Cancelled',
      message: 'Cancelled by Split Lease'
    }
  };

  return configs[status] || {
    variant: 'default',
    icon: Clock,
    title: 'Pending',
    message: 'Awaiting action'
  };
}

/**
 * StatusBanner displays the status information banner
 * Uses role="status" for polite announcements to screen readers
 *
 * @param {Object} props
 * @param {Object} props.proposal - The proposal object
 */
export function StatusBanner({ proposal }) {
  const config = getStatusBannerConfig(proposal);
  const IconComponent = config.icon;

  // Determine if this is an urgent status that needs immediate announcement
  const isUrgent = config.variant === 'action-needed' || config.variant === 'warning';

  return (
    <div
      className={`hp7-status-banner ${config.variant}`}
      role="status"
      aria-live={isUrgent ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <span className="hp7-status-icon" aria-hidden="true">
        <IconComponent size={10} />
      </span>
      <div className="hp7-status-text">
        <strong>{config.title}</strong>
        <span aria-hidden="true"> — </span>
        <span className="visually-hidden">: </span>
        {config.message}
      </div>
    </div>
  );
}

export default StatusBanner;
