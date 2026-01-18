/**
 * RightPanel Component
 *
 * Right sidebar for the Messaging Page showing:
 * - Contact profile (avatar, name, role badge, stats)
 * - Proposal progress timeline (collapsible)
 * - Listing details card
 * - Quick action buttons
 *
 * Hidden on screens < 1200px via CSS media query.
 */

import { useState } from 'react';

/**
 * Get initials from a name string
 */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Format a date string to a short format
 */
function formatShortDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Map proposal status to timeline stages
 */
function getTimelineStages(proposalStatus) {
  const stages = [
    { key: 'submitted', label: 'Submitted' },
    { key: 'under_review', label: 'Under Review' },
    { key: 'negotiation', label: 'Negotiation' },
    { key: 'accepted', label: 'Accepted' },
  ];

  const statusMap = {
    submitted: 0,
    pending: 1,
    under_review: 1,
    negotiation: 2,
    counter: 2,
    accepted: 3,
    approved: 3,
    declined: -1,
    rejected: -1,
  };

  const currentIndex = statusMap[proposalStatus?.toLowerCase()] ?? 1;

  return stages.map((stage, index) => ({
    ...stage,
    status: index < currentIndex ? 'completed' :
      index === currentIndex ? 'current' : 'pending',
  }));
}

/**
 * Timeline Item sub-component
 */
function TimelineItem({ status, label, date }) {
  return (
    <div className={`timeline-item timeline-item--${status}`}>
      <div className="timeline-item__dot" />
      <div className="timeline-item__label">{label}</div>
      {date && <div className="timeline-item__date">{date}</div>}
    </div>
  );
}

/**
 * Loading skeleton for the right panel
 */
function LoadingSkeleton() {
  return (
    <div className="right-panel__loading">
      <div className="right-panel__loading-spinner" />
    </div>
  );
}

/**
 * @param {object} props
 * @param {object} props.threadInfo - Thread info (contact_name, proposal_id, listing_id, etc.)
 * @param {object} props.proposalData - Extended proposal data
 * @param {object} props.listingData - Extended listing data
 * @param {string} props.userType - 'Host' or 'Guest'
 * @param {function} props.onAction - Handler for action button clicks
 * @param {boolean} props.isLoading - Loading state
 */
export default function RightPanel({
  threadInfo,
  proposalData,
  listingData,
  userType,
  onAction,
  isLoading,
}) {
  const [isProgressOpen, setIsProgressOpen] = useState(true);

  // Determine contact's role (opposite of current user)
  const contactRole = userType === 'Host' ? 'Guest' : 'Host';

  // Get timeline stages based on proposal status
  const timelineStages = getTimelineStages(proposalData?.status);

  // Format dates for display
  const dateRange = proposalData?.startDate && proposalData?.endDate
    ? `${formatShortDate(proposalData.startDate)} - ${formatShortDate(proposalData.endDate)}`
    : 'Not set';

  // Check if proposal is actionable (pending status for hosts)
  const isPendingProposal = ['pending', 'submitted', 'under_review'].includes(
    proposalData?.status?.toLowerCase()
  );

  return (
    <div className="right-panel">
      {/* Loading State */}
      {isLoading && <LoadingSkeleton />}

      {/* Contact Profile Section */}
      {!isLoading && (
        <div className="panel-profile">
          <div className="panel-profile__avatar">
            {threadInfo?.contact_avatar ? (
              <img src={threadInfo.contact_avatar} alt="" />
            ) : (
              <span className="panel-profile__avatar-initials">
                {getInitials(threadInfo?.contact_name)}
              </span>
            )}
          </div>
          <h3 className="panel-profile__name">
            {threadInfo?.contact_name || 'Unknown'}
          </h3>
          <span className={`panel-profile__badge panel-profile__badge--${contactRole.toLowerCase()}`}>
            {contactRole}
          </span>
          <div className="panel-profile__stats">
            <div className="panel-profile__stat">
              <span className="panel-profile__stat-label">Response Rate</span>
              <span className="panel-profile__stat-value">98%</span>
            </div>
            <div className="panel-profile__stat">
              <span className="panel-profile__stat-label">Response Time</span>
              <span className="panel-profile__stat-value">&lt;1 hour</span>
            </div>
            <div className="panel-profile__stat">
              <span className="panel-profile__stat-label">Member Since</span>
              <span className="panel-profile__stat-value">2024</span>
            </div>
          </div>
          <button
            className="panel-profile__btn"
            onClick={() => onAction?.('view_profile')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            View Profile
          </button>
        </div>
      )}

      {/* Proposal Progress Section (Collapsible) */}
      {!isLoading && proposalData && (
        <div className="panel-section">
          <button
            className="panel-section__header"
            onClick={() => setIsProgressOpen(!isProgressOpen)}
            type="button"
          >
            Proposal Progress
            <svg
              className={`panel-section__chevron ${isProgressOpen ? 'panel-section__chevron--open' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {isProgressOpen && (
            <div className="panel-section__content">
              <div className="proposal-timeline">
                {timelineStages.map((stage) => (
                  <TimelineItem
                    key={stage.key}
                    status={stage.status}
                    label={stage.label}
                    date={stage.status === 'completed' ? formatShortDate(proposalData.modifiedDate) : null}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Listing Details Card */}
      {!isLoading && listingData && (
        <div className="panel-listing-card">
          <div className="panel-listing-card__image">
            {listingData.primaryImage ? (
              <img src={listingData.primaryImage} alt="" />
            ) : (
              <div style={{ background: '#E0E0E0', width: '100%', height: '100%' }} />
            )}
            <span className="panel-listing-card__badge">
              {listingData.listingType || 'Flexible'}
            </span>
          </div>
          <h4 className="panel-listing-card__name">{listingData.name}</h4>
          <p className="panel-listing-card__location">{listingData.address}</p>
          <div className="panel-listing-card__info-grid">
            <div className="panel-listing-card__info-item">
              <span className="panel-listing-card__info-label">Dates</span>
              <span className="panel-listing-card__info-value">{dateRange}</span>
            </div>
            <div className="panel-listing-card__info-item">
              <span className="panel-listing-card__info-label">Days/Week</span>
              <span className="panel-listing-card__info-value">
                {proposalData?.daysPerWeek ?? '-'}
              </span>
            </div>
            <div className="panel-listing-card__info-item">
              <span className="panel-listing-card__info-label">Price</span>
              <span className="panel-listing-card__info-value">
                ${proposalData?.totalMonthlyPrice ?? listingData.monthlyRate ?? '-'}/mo
              </span>
            </div>
          </div>
          <a
            href={`/listing?id=${listingData.id}`}
            className="panel-listing-card__link"
            onClick={(e) => {
              e.preventDefault();
              onAction?.('view_listing');
            }}
          >
            View Listing
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      )}

      {/* Quick Actions */}
      {!isLoading && (
        <div className="quick-actions">
          {/* Host-only actions for pending proposals */}
          {userType === 'Host' && isPendingProposal && (
            <>
              <button
                className="quick-actions__btn quick-actions__btn--primary"
                onClick={() => onAction?.('accept')}
                type="button"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Accept Proposal
              </button>
              <button
                className="quick-actions__btn quick-actions__btn--secondary"
                onClick={() => onAction?.('counter')}
                type="button"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Counter Proposal
              </button>
            </>
          )}

          {/* Video call - available to all */}
          <button
            className="quick-actions__btn quick-actions__btn--secondary"
            onClick={() => onAction?.('video')}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            Schedule Video Call
          </button>

          {/* Decline - Host only for pending */}
          {userType === 'Host' && isPendingProposal && (
            <button
              className="quick-actions__btn quick-actions__btn--danger"
              onClick={() => onAction?.('decline')}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Decline
            </button>
          )}
        </div>
      )}
    </div>
  );
}
