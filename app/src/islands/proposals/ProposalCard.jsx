/**
 * ProposalCard Component - REDESIGNED
 *
 * Two-column layout matching the SL6/pages/guest-proposals design:
 * - Left column: Listing details, schedule, pricing, actions
 * - Right column: Host profile card with property photo background
 *
 * HOLLOW COMPONENT PATTERN:
 * - Receives ALL pre-computed state and handlers as props
 * - NO internal business logic calculations
 * - NO direct database calls
 * - Uses props from parent hook (useGuestProposalsPageLogic)
 */

import { useState } from 'react'

// Helper to render weekly schedule with circular badges
function WeeklySchedule({ daysSelected }) {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return (
    <div className="weekly-schedule">
      {days.map((day, index) => {
        const isSelected = daysSelected && daysSelected.includes(dayNames[index])
        return (
          <div key={index} className={`day-badge ${isSelected ? 'selected' : 'unselected'}`}>
            {day}
          </div>
        )
      })}
    </div>
  )
}

export default function ProposalCard({
  proposal,
  currentUser,
  // Pre-computed values from Logic Core (via hook)
  statusConfig,
  canEdit,
  canCancel,
  canAccept,
  canSubmitApp,
  canRequestVM,
  vmStateInfo,
  cancelButtonText,
  formatPrice: formatPriceProp,
  formatDate: formatDateProp,
  // Event handlers
  onViewListing,
  onViewMap,
  onViewHostProfile,
  onSendMessage,
  onDeleteProposal,
  onCancelProposal,
  onModifyProposal,
  onReviewCounteroffer,
  onRequestVirtualMeeting,
  onSubmitRentalApplication,
  onReviewDocuments,
  onGoToLeases,
  onSeeDetails,
}) {
  const [showHouseRules, setShowHouseRules] = useState(false)

  if (!proposal) return null

  const listing = proposal._listing || {}
  const host = proposal._host || {}
  const houseRules = proposal._houseRules || []

  // Get status from either processed or raw fields
  const status = proposal.status || proposal.Status || proposal['Proposal Status'] || ''

  // Use counteroffer terms if they exist, otherwise original terms
  const hasCounteroffer = proposal.hasCounteroffer || proposal['counter offer happened']

  // Extract terms (handles both processed and raw field names)
  const moveInDate = hasCounteroffer && proposal['hc move in date']
    ? new Date(proposal['hc move in date']).toLocaleDateString()
    : proposal['Move in range start']
      ? new Date(proposal['Move in range start']).toLocaleDateString()
      : 'Not specified'

  const reservationWeeks = hasCounteroffer && proposal['hc reservation span (weeks)']
    ? proposal['hc reservation span (weeks)']
    : proposal['Reservation Span (Weeks)']

  // Parse Days Selected - it's stored as JSON string in database
  let daysSelected = hasCounteroffer && proposal['hc days selected']
    ? proposal['hc days selected']
    : proposal['Days Selected']

  // Parse JSON string if needed
  if (typeof daysSelected === 'string') {
    try {
      daysSelected = JSON.parse(daysSelected)
    } catch {
      daysSelected = []
    }
  }

  // Ensure it's an array
  if (!Array.isArray(daysSelected)) {
    daysSelected = []
  }

  // Get check-in/out days
  const checkInDay = hasCounteroffer && proposal['hc check in day']
    ? proposal['hc check in day']
    : proposal['check in day'] || (daysSelected.length > 0 ? daysSelected[0] : 'Friday')

  const checkOutDay = hasCounteroffer && proposal['hc check out day']
    ? proposal['hc check out day']
    : proposal['check out day'] || (daysSelected.length > 0 ? daysSelected[daysSelected.length - 1] : 'Sunday')

  // Pricing
  const totalPrice = hasCounteroffer && proposal['hc total price']
    ? proposal['hc total price']
    : proposal['Total Price for Reservation (guest)']

  const nightlyPrice = hasCounteroffer && proposal['hc nightly price']
    ? proposal['hc nightly price']
    : proposal['proposal nightly price']

  const cleaningFee = hasCounteroffer && proposal['hc cleaning fee']
    ? proposal['hc cleaning fee']
    : proposal['cleaning fee']

  const damageDeposit = hasCounteroffer && proposal['hc damage deposit']
    ? proposal['hc damage deposit']
    : proposal['damage deposit']

  // Format currency
  function formatCurrency(amount) {
    if (!amount) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Get featured photo URL
  const featuredPhotoUrl = listing['Features - Photos']?.[0] ||
    listing.featuredPhotoUrl ||
    (listing['Features - Photos Expanded']?.[0]?.['Photo URL'])

  // Get host photo URL
  const hostPhotoUrl = host['Profile Photo']?.startsWith('//')
    ? `https:${host['Profile Photo']}`
    : host['Profile Photo']

  // Get status banner configuration
  const getStatusBannerConfig = () => {
    if (status?.includes('Rejected')) {
      return { color: 'red', label: 'Proposal Rejected' }
    }
    if (status?.includes('Cancelled')) {
      return { color: 'red', label: 'Proposal Cancelled' }
    }
    if (status?.includes('Accepted') || status?.includes('Lease activated')) {
      return { color: 'green', label: status }
    }
    if (status?.includes('Counteroffer') || hasCounteroffer) {
      return { color: 'yellow', label: 'Host has made a counteroffer' }
    }
    if (status?.includes('Lease Documents')) {
      return { color: 'blue', label: 'Lease Documents Ready for Review' }
    }
    return null
  }

  const statusBanner = getStatusBannerConfig()

  /**
   * Build action buttons using pre-computed props from Logic Core
   */
  function getActionButtons() {
    const buttons = []

    // Status-based primary action buttons
    if (status === 'Awaiting Host Review' || status === 'Under Review') {
      if (canEdit) {
        buttons.push({
          label: 'Modify Proposal',
          onClick: onModifyProposal,
          className: 'btn-modify-proposal',
        })
      }
      buttons.push({
        label: 'Delete Proposal',
        onClick: onDeleteProposal,
        className: 'btn-delete-proposal',
      })
    } else if ((status === 'Host Counteroffer Submitted' || status?.includes('Host Countered')) && hasCounteroffer) {
      buttons.push({
        label: 'Review Counteroffer',
        onClick: onReviewCounteroffer,
        className: 'btn-primary-action btn-review-counteroffer',
      })
      if (canCancel) {
        buttons.push({
          label: cancelButtonText || 'Decline Counteroffer',
          onClick: onCancelProposal,
          className: 'btn-delete-proposal',
        })
      }
    } else if (canSubmitApp) {
      buttons.push({
        label: 'Submit Rental Application',
        onClick: onSubmitRentalApplication,
        className: 'btn-primary-action',
      })
    } else if (status === 'Lease Documents Sent for Review' || status?.includes('Lease Documents Sent')) {
      buttons.push({
        label: 'Review Documents',
        onClick: onReviewDocuments,
        className: 'btn-primary-action btn-review-docs',
      })
    } else if (status === 'Lease activated' || status === 'Completed') {
      buttons.push({
        label: 'Go to Leases',
        onClick: onGoToLeases,
        className: 'btn-primary-action',
      })
    } else if (status?.includes('Rejected') || status?.includes('Cancelled')) {
      buttons.push({
        label: 'Delete Proposal',
        onClick: onDeleteProposal,
        className: 'btn-delete-proposal',
      })
    }

    // Secondary action buttons (for active proposals)
    if (!status?.includes('Rejected') && !status?.includes('Cancelled') && !status?.includes('Completed')) {
      buttons.push({
        label: 'See Details',
        onClick: onSeeDetails,
        className: 'btn-see-details',
      })

      // Virtual Meeting button
      if (canRequestVM) {
        const vmLabel = vmStateInfo?.buttonText || 'Request Virtual Meeting'
        buttons.push({
          label: vmLabel,
          onClick: onRequestVirtualMeeting,
          className: 'btn-request-meeting',
        })
      }

      // Cancel button
      if (canCancel) {
        buttons.push({
          label: cancelButtonText || 'Cancel Proposal',
          onClick: onCancelProposal,
          className: 'btn-cancel-proposal',
        })
      }
    }

    return buttons
  }

  const actionButtons = getActionButtons()

  return (
    <div className="proposal-card">
      {/* Status Banner */}
      {statusBanner && !status?.includes('Pending') && (
        <div className={`status-banner status-${statusBanner.color}`}>
          <strong>{statusBanner.label}</strong>
          {proposal['reason for cancellation'] && (
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
              Reason: {proposal['reason for cancellation']}
            </p>
          )}
        </div>
      )}

      {/* Counteroffer Banner */}
      {hasCounteroffer && !status?.includes('Rejected') && !status?.includes('Cancelled') && (
        <div className="counteroffer-banner">
          <div className="banner-icon">&#9999;&#65039;</div>
          <div className="banner-content">
            <h3 className="banner-title">Host has proposed changes</h3>
            <p className="banner-description">Review the counteroffer to see modified terms</p>
          </div>
          <button className="btn-compare-terms" onClick={onReviewCounteroffer}>
            Compare Terms
          </button>
        </div>
      )}

      {/* Main Content: Two Column Layout */}
      <div className="proposal-content">
        {/* Left Column: Listing Details */}
        <div className="proposal-left">
          {/* Listing Header */}
          <div className="listing-header">
            <h1 className="listing-title">{listing.Name || listing.name || 'Property'}</h1>
            <p className="listing-subtitle">
              {listing['Location - Hood'] || listing.hoodName}
              {(listing['Location - Hood'] || listing.hoodName) && (listing['Location - Borough'] || listing.boroughName) && ', '}
              {listing['Location - Borough'] || listing.boroughName}
            </p>
            <div className="listing-actions">
              <button className="btn-view-listing" onClick={onViewListing}>
                View Listing
              </button>
              <button className="btn-view-map" onClick={onViewMap}>
                View Map
              </button>
            </div>
          </div>

          {/* Schedule Section */}
          <div className="schedule-section">
            <p className="schedule-days">Check-in: {checkInDay} - Check-out: {checkOutDay}</p>
            <p className="duration-text">
              Duration <span className="duration-value">{reservationWeeks} Weeks</span>
            </p>
            <WeeklySchedule daysSelected={daysSelected} />
            <div className="schedule-times">
              <p>Check-in {listing['NEW Date Check-in Time'] || listing.checkInTime || '2:00 pm'} Check-out {listing['NEW Date Check-out Time'] || listing.checkOutTime || '11:00 am'}</p>
              <p>Anticipated Move-in {moveInDate}</p>
            </div>

            {/* House Rules Accordion */}
            {houseRules.length > 0 && (
              <div className="house-rules-accordion">
                <button
                  className="house-rules-toggle"
                  onClick={() => setShowHouseRules(!showHouseRules)}
                  aria-expanded={showHouseRules}
                >
                  <span>See House Rules ({houseRules.length})</span>
                  <span className={`toggle-icon ${showHouseRules ? 'open' : ''}`}>&#9660;</span>
                </button>
                {showHouseRules && (
                  <div className="house-rules-content">
                    <ul className="house-rules-list">
                      {houseRules.map((rule, index) => (
                        <li key={rule._id || index} className="house-rule-item">
                          <span className="rule-bullet">&bull;</span>
                          <span className="rule-text">{rule.Name || rule.name || rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pricing Section */}
          <div className="pricing-section">
            <div className="pricing-grid">
              <div className="pricing-details-left">
                <p className="total-price">Total {formatCurrency(totalPrice)}</p>
                <p className="fee-note">No maintenance fee</p>
                {damageDeposit > 0 && (
                  <p className="deposit">Damage deposit {formatCurrency(damageDeposit)}</p>
                )}
                {cleaningFee > 0 && (
                  <p className="cleaning-fee">Cleaning fee {formatCurrency(cleaningFee)}</p>
                )}
              </div>
              <div className="pricing-details-right">
                <p className="nightly-rate">
                  <span className="rate-amount">{formatCurrency(nightlyPrice)}</span>
                  <span className="rate-label"> / night</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            {actionButtons.length > 0 && (
              <div className="proposal-actions">
                {actionButtons.map((button, index) => (
                  <button key={index} className={button.className} onClick={button.onClick}>
                    {button.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Host Profile Card */}
        <div className="proposal-right">
          <div className="host-profile-card">
            {/* Background: Listing Photo */}
            <div className="host-card-background">
              {featuredPhotoUrl && (
                <img
                  src={featuredPhotoUrl}
                  alt={listing.Name || listing.name || 'Property'}
                  className="property-photo"
                />
              )}
            </div>
            {/* Overlay: Host Info */}
            <div className="host-card-overlay">
              {hostPhotoUrl ? (
                <img src={hostPhotoUrl} alt={host['Name - Full'] || 'Host'} className="host-avatar" />
              ) : (
                <div
                  className="host-avatar"
                  style={{
                    background: '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    color: '#6b7280',
                  }}
                >
                  {(host['Name - First'] || 'H').charAt(0)}
                </div>
              )}
              <p className="host-name-label">{host['Name - First'] || host['Name - Full'] || 'Host'}</p>
              <button className="btn-host-profile" onClick={onViewHostProfile}>
                Host Profile
              </button>
              <button className="btn-send-message" onClick={onSendMessage}>
                Send a Message
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Proposal Metadata */}
      <div className="proposal-metadata" style={{ padding: '1rem 2rem 2rem' }}>
        Proposal ID: {(proposal._id || proposal.id || '').slice(0, 16)}... - Created on:{' '}
        {proposal['Created Date'] || proposal.createdDate
          ? new Date(proposal['Created Date'] || proposal.createdDate).toLocaleDateString()
          : 'N/A'}
      </div>
    </div>
  )
}
