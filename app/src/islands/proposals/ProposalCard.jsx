/**
 * ProposalCard Component
 *
 * Main proposal display card showing all proposal details
 * Based on live screenshots: pass1-lyla-proposal.png, pass2-william-with-action-buttons.png
 *
 * HOLLOW COMPONENT PATTERN:
 * - Receives all data and handlers as props
 * - Uses Logic Core rules for business logic decisions
 * - No direct database calls
 *
 * Layout:
 * - Left section: Listing info, schedule, dates, host info
 * - Right section: Property image, host badge, action buttons (desktop)
 * - House rules (collapsible if > 5)
 * - Pricing breakdown
 * - Action buttons (mobile/bottom)
 * - Rejection message (if rejected)
 */

import { useState } from 'react'
import SearchScheduleSelector from '../shared/SearchScheduleSelector.jsx'

// Import Logic Core rules for action button logic
import {
  canEditProposal,
  canCancelProposal,
  canAcceptProposal
} from '../../logic/index.js'

export default function ProposalCard({
  proposal,
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
  const [showAllRules, setShowAllRules] = useState(false)

  if (!proposal) return null

  const listing = proposal._listing || {}
  const host = proposal._host || {}
  const houseRules = proposal._houseRules || []

  // Get status from either processed or raw fields
  const status = proposal.status || proposal.Status || proposal['Proposal Status'] || ''
  const deleted = proposal.deleted === true || proposal.Deleted === true

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

  const nightsPerWeek = hasCounteroffer && proposal['hc nights per week']
    ? proposal['hc nights per week']
    : proposal['nights per week (num)']

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

  // Check-in/out
  const checkInDay = hasCounteroffer && proposal['hc check in day']
    ? proposal['hc check in day']
    : proposal['check in day']

  const checkOutDay = hasCounteroffer && proposal['hc check out day']
    ? proposal['hc check out day']
    : proposal['check out day']

  // Schedule day mapping for SearchScheduleSelector
  const dayMap = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  }

  const selectedDayIndices = daysSelected?.map((day) => dayMap[day]) || []

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

  /**
   * Determine which action buttons to show using Logic Core rules
   */
  function getActionButtons() {
    const buttons = []

    // Use Logic Core rules to determine permissions
    let canEdit = false
    let canCancel = false

    try {
      canEdit = canEditProposal({ proposalStatus: status, deleted })
    } catch {
      // Fallback if Logic Core fails
      canEdit = ['Draft', 'Pending', 'Host Countered', 'Awaiting Host Review', 'Under Review'].some(
        (s) => status?.includes(s)
      )
    }

    try {
      canCancel = canCancelProposal({ proposalStatus: status, deleted })
    } catch {
      // Fallback if Logic Core fails
      canCancel = !status?.includes('Cancelled') && !status?.includes('Rejected') && !status?.includes('Completed')
    }

    // Status-based primary action buttons
    if (status === 'Awaiting Host Review' || status === 'Under Review') {
      if (canEdit) {
        buttons.push({
          label: 'Modify Proposal',
          onClick: onModifyProposal,
          variant: 'success',
        })
      }
      buttons.push({
        label: 'Delete Proposal',
        onClick: onDeleteProposal,
        variant: 'danger',
      })
    } else if ((status === 'Host Counteroffer Submitted' || status?.includes('Host Countered')) && hasCounteroffer) {
      buttons.push({
        label: 'Review Counteroffer',
        onClick: onReviewCounteroffer,
        variant: 'primary',
      })
      if (canCancel) {
        buttons.push({
          label: 'Cancel Proposal',
          onClick: onCancelProposal,
          variant: 'danger',
        })
      }
    } else if (status === 'Awaiting Rental Application' || status?.includes('Awaiting Rental')) {
      buttons.push({
        label: 'Submit Rental Application',
        onClick: onSubmitRentalApplication,
        variant: 'primary',
      })
    } else if (status === 'Lease Documents Sent for Review' || status?.includes('Lease Documents Sent')) {
      buttons.push({
        label: 'Review Documents',
        onClick: onReviewDocuments,
        variant: 'primary',
      })
    } else if (status === 'Lease activated' || status === 'Completed') {
      buttons.push({
        label: 'Go to Leases',
        onClick: onGoToLeases,
        variant: 'primary',
      })
    } else if (status?.includes('Rejected') || status?.includes('Cancelled')) {
      buttons.push({
        label: 'Delete Proposal',
        onClick: onDeleteProposal,
        variant: 'danger',
      })
    }

    // Secondary action buttons (for active proposals)
    if (!status?.includes('Rejected') && !status?.includes('Cancelled') && !status?.includes('Completed')) {
      buttons.push({
        label: 'See Details',
        onClick: onSeeDetails,
        variant: 'secondary',
      })

      buttons.push({
        label: 'Request Virtual Meeting',
        onClick: onRequestVirtualMeeting,
        variant: 'secondary',
      })

      if (canCancel) {
        buttons.push({
          label: 'Cancel Proposal',
          onClick: onCancelProposal,
          variant: 'danger',
        })
      }
    }

    return buttons
  }

  const actionButtons = getActionButtons()

  // Rules to display
  const rulesToShow = showAllRules ? houseRules : houseRules.slice(0, 5)
  const hasMoreRules = houseRules.length > 5

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Rejection Message (if rejected) */}
      {status?.includes('Rejected') && proposal['reason for cancellation'] && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Proposal Rejected</h3>
              <div className="mt-1 text-sm text-red-700">{proposal['reason for cancellation']}</div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Desktop Layout: Two Columns */}
        <div className="lg:flex lg:gap-8">
          {/* LEFT SECTION */}
          <div className="lg:flex-1">
            {/* Listing Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{listing.Name || 'Property'}</h2>
              <p className="text-gray-600">
                {listing['Location - Hood']}, {listing['Location - Borough']}
              </p>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={onViewListing}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                >
                  View Listing
                </button>
                <button
                  onClick={onViewMap}
                  className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 text-sm font-medium"
                >
                  View Map
                </button>
              </div>
            </div>

            {/* Schedule */}
            <div className="mb-6">
              <p className="text-lg font-medium text-gray-900 mb-3">Duration: {reservationWeeks} Weeks</p>

              {/* Day Selector - Using SearchScheduleSelector */}
              <SearchScheduleSelector
                initialSelection={selectedDayIndices}
                onSelectionChange={() => {
                  // Read-only in proposal card - no changes allowed
                  console.log('Schedule selector clicked (read-only in proposal view)')
                }}
                minDays={2}
                requireContiguous={true}
              />
            </div>

            {/* Check-in/out Details */}
            <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Check-in</p>
                <p className="font-medium text-gray-900">{listing['NEW Date Check-in Time'] || '2:00 pm'}</p>
              </div>
              <div>
                <p className="text-gray-600">Check-out</p>
                <p className="font-medium text-gray-900">{listing['NEW Date Check-out Time'] || '11:00 am'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-600">Anticipated Move-in</p>
                <p className="font-medium text-gray-900">{moveInDate}</p>
              </div>
            </div>

            {/* Host Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-300 flex-shrink-0">
                  {host['Profile Photo'] ? (
                    <img
                      src={host['Profile Photo'].startsWith('//') ? `https:${host['Profile Photo']}` : host['Profile Photo']}
                      alt={host['Name - Full']}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl text-gray-600">
                      {host['Name - First']?.charAt(0) || 'H'}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{host['Name - First'] || 'Host'}</h4>
                    {proposal['is suggested by host'] && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                        Suggested
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={onViewHostProfile}
                      className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                    >
                      Host Profile
                    </button>
                    <button
                      onClick={onSendMessage}
                      className="px-3 py-1 border border-purple-600 text-purple-600 text-sm rounded hover:bg-purple-50"
                    >
                      Send a Message
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SECTION (Desktop) */}
          <div className="lg:w-96 mt-6 lg:mt-0">
            {/* Property Image */}
            {listing['Features - Photos']?.[0] && (
              <div className="relative mb-6">
                <img
                  src={listing['Features - Photos'][0]}
                  alt={listing.Name}
                  className="w-full h-64 object-cover rounded-lg"
                />
                {proposal['is suggested by host'] && (
                  <div className="absolute top-3 right-3 px-3 py-1 bg-purple-600 text-white text-sm font-medium rounded-lg shadow-lg">
                    Host Suggested
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* House Rules */}
        {houseRules.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">House Rules</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {rulesToShow.map((rule) => (
                <div key={rule._id} className="flex items-center gap-2 text-sm text-gray-700">
                  {rule.Icon && <span>{rule.Icon}</span>}
                  <span>{rule.Name}</span>
                </div>
              ))}
            </div>
            {hasMoreRules && (
              <button
                onClick={() => setShowAllRules(!showAllRules)}
                className="mt-3 text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                {showAllRules ? 'Show Less' : `Show All (${houseRules.length})`}
              </button>
            )}
          </div>
        )}

        {/* Pricing Section */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="bg-gray-100 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-gray-600">Total {formatCurrency(totalPrice)}</span>
              <span className="text-2xl font-bold">{formatCurrency(nightlyPrice)} / night</span>
            </div>
            <div className="text-sm text-gray-600">No maintenance fee</div>
            {damageDeposit > 0 && (
              <div className="text-sm text-gray-900">Damage deposit {formatCurrency(damageDeposit)}</div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {actionButtons.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            {actionButtons.map((button, index) => (
              <button
                key={index}
                onClick={button.onClick}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  button.variant === 'primary'
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : button.variant === 'success'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : button.variant === 'danger'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {button.label}
              </button>
            ))}
          </div>
        )}

        {/* Proposal Metadata */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-sm text-gray-500">
          <div className="flex justify-between">
            <span>Proposal ID: {(proposal._id || proposal.id || '').slice(0, 8)}...</span>
            <span>
              Created: {new Date(proposal['Created Date'] || proposal.createdDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
