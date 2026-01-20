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
    <div className="hp7-links-row">
      <button
        type="button"
        className="hp7-link-item"
        onClick={onViewProfile}
      >
        <User size={12} />
        Full Profile
      </button>
      <button
        type="button"
        className="hp7-link-item"
        onClick={onMessage}
      >
        <MessageCircle size={12} />
        Message Guest
      </button>
      {showCompareTerms ? (
        <button
          type="button"
          className="hp7-link-item"
          onClick={onCompareTerms}
        >
          <GitCompare size={12} />
          Compare Terms
        </button>
      ) : (
        <button
          type="button"
          className="hp7-link-item"
          onClick={onScheduleMeeting}
        >
          <Video size={12} />
          Schedule Meeting
        </button>
      )}
    </div>
  );
}

export default QuickLinksRow;
