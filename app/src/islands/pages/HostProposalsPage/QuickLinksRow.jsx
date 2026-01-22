/**
 * QuickLinksRow Component (V7 Design)
 *
 * Action links row with:
 * - Full Profile (user icon)
 * - Message Guest (message-circle icon)
 * - Schedule Meeting (video icon)
 *
 * Part of the Host Proposals V7 redesign.
 */
import React from 'react';
import { User, MessageCircle, Video, GitCompare } from 'lucide-react';

/**
 * QuickLinksRow displays action links for the proposal
 *
 * @param {Object} props
 * @param {Function} props.onViewProfile - View full profile callback
 * @param {Function} props.onMessage - Message guest callback
 * @param {Function} props.onScheduleMeeting - Schedule meeting callback
 * @param {Function} props.onCompareTerms - Compare terms callback (for counteroffers)
 * @param {boolean} props.showCompareTerms - Whether to show compare terms link
 */
export function QuickLinksRow({
  onViewProfile,
  onMessage,
  onScheduleMeeting,
  onCompareTerms,
  showCompareTerms = false
}) {
  return (
    <nav className="hp7-links-row" aria-label="Quick actions">
      <button
        type="button"
        className="hp7-link-item"
        onClick={onViewProfile}
        aria-label="View guest's full profile"
      >
        <User size={12} aria-hidden="true" />
        <span>Full Profile</span>
      </button>
      <button
        type="button"
        className="hp7-link-item"
        onClick={onMessage}
        aria-label="Send message to guest"
      >
        <MessageCircle size={12} aria-hidden="true" />
        <span>Message Guest</span>
      </button>
      {showCompareTerms ? (
        <button
          type="button"
          className="hp7-link-item"
          onClick={onCompareTerms}
          aria-label="Compare original and counter terms"
        >
          <GitCompare size={12} aria-hidden="true" />
          <span>Compare Terms</span>
        </button>
      ) : (
        <button
          type="button"
          className="hp7-link-item"
          onClick={onScheduleMeeting}
          aria-label="Schedule a video meeting with guest"
        >
          <Video size={12} aria-hidden="true" />
          <span>Schedule Meeting</span>
        </button>
      )}
    </nav>
  );
}

export default QuickLinksRow;
