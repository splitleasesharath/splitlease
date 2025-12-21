/**
 * HostEditingProposal - Host interface for reviewing, editing, and counteroffering proposals
 *
 * Features:
 * - Review proposal terms from guests
 * - Edit/counteroffer proposal terms (move-in date, schedule, duration, house rules)
 * - Real-time price breakdown preview
 * - Accept proposal as-is or with modifications
 * - Reject proposals with optional reason
 *
 * Based on the external host-editing-proposal repository pattern
 */

import { useState, useEffect, useCallback } from 'react'
import {
  PROPOSAL_STATUSES,
  RESERVATION_SPANS,
  formatDate,
  addWeeks,
  findReservationSpanByWeeks,
  getDayName,
  getCheckInDay,
  getCheckOutDay,
  nightsToDays,
  nightNamesToIndices,
  nightIndicesToNames
} from './types'
import { ReservationPriceBreakdown } from './ReservationPriceBreakdown'
import { ScheduleSelector } from './ScheduleSelector'
import { DateInput, ReservationSpanDropdown, NumberInput, HouseRulesMultiSelect } from './FormInputs'
import './HostEditingProposal.css'

/**
 * HostEditingProposal Component
 *
 * @param {Object} props
 * @param {Object} props.proposal - The proposal data
 * @param {Array} props.availableHouseRules - List of available house rules
 * @param {boolean} props.isInternalUsage - Flag for internal usage mode
 * @param {function} props.onAcceptAsIs - Callback when proposal is accepted without changes
 * @param {function} props.onCounteroffer - Callback when counteroffer is submitted
 * @param {function} props.onReject - Callback when proposal is rejected
 * @param {function} props.onCancel - Callback when editing is cancelled
 * @param {function} props.onAlert - Callback to display notifications
 */
export function HostEditingProposal({
  proposal,
  availableHouseRules = [],
  isInternalUsage = false,
  onAcceptAsIs,
  onCounteroffer,
  onReject,
  onCancel,
  onAlert
}) {
  // State management
  const [view, setView] = useState('general') // 'general' | 'editing'
  const [isFirstOpen, setIsFirstOpen] = useState(true)
  const [proceedButtonLocked, setProceedButtonLocked] = useState(false)

  // Extract proposal data with fallbacks
  // Handles both camelCase and database field names (with spaces)
  const getProposalDate = (field, fallback = null) => {
    const value = proposal?.[field] || proposal?.[field.replace(/([A-Z])/g, ' $1').trim()]
    if (!value) return fallback ? new Date(fallback) : new Date()
    return new Date(value)
  }

  const getProposalValue = (field, fallback) => {
    return proposal?.[field] ??
           proposal?.[field.replace(/([A-Z])/g, ' $1').trim()] ??
           fallback
  }

  /**
   * Extract and normalize house rules from proposal or listing
   * Handles multiple formats:
   * - Array of strings (rule names): ["No Smoking", "No Parties"]
   * - Array of IDs (Bubble format): ["1556151847445x748291628265310200"]
   * - Array of objects: [{id, name}, ...]
   * Returns array of {id, name} objects matching availableHouseRules format
   */
  const extractHouseRules = () => {
    // Try proposal first, then listing
    const rawRules = proposal?.houseRules ||
                     proposal?.['House Rules'] ||
                     proposal?.['Features - House Rules'] ||
                     listing?.houseRules ||
                     listing?.['Features - House Rules'] ||
                     []

    if (!Array.isArray(rawRules) || rawRules.length === 0) {
      return []
    }

    // If already in correct format (objects with id and name)
    if (rawRules[0] && typeof rawRules[0] === 'object' && rawRules[0].id) {
      return rawRules
    }

    // If array of strings, try to match with availableHouseRules
    if (typeof rawRules[0] === 'string') {
      // Check if they look like Bubble IDs (long numeric strings with x)
      const looksLikeIds = rawRules[0].includes('x') && rawRules[0].length > 20

      if (looksLikeIds) {
        // Match by ID
        return rawRules
          .map(id => availableHouseRules.find(r => r.id === id))
          .filter(Boolean)
      } else {
        // Match by name (case-insensitive)
        return rawRules
          .map(name => availableHouseRules.find(r =>
            r.name?.toLowerCase() === name?.toLowerCase()
          ))
          .filter(Boolean)
      }
    }

    return []
  }

  /**
   * Extract nights selected from proposal, handling multiple formats:
   * - Database: "Nights Selected (Nights list)" = [0, 5] (indices)
   * - Alternative: "nightsSelected" = ['Sunday Night', 'Friday Night'] (names)
   * Returns array of night names for component use
   */
  const extractNightsSelected = () => {
    // Try database format first: array of indices
    const nightIndices = proposal?.['Nights Selected (Nights list)']
    if (Array.isArray(nightIndices) && nightIndices.length > 0 && typeof nightIndices[0] === 'number') {
      return nightIndicesToNames(nightIndices)
    }
    // Try camelCase format (already names)
    const nightNames = proposal?.nightsSelected
    if (Array.isArray(nightNames) && nightNames.length > 0) {
      return nightNames
    }
    // Default fallback
    return ['Monday Night', 'Tuesday Night', 'Wednesday Night', 'Thursday Night']
  }

  /**
   * Extract check-in day from proposal
   */
  const extractCheckInDay = () => {
    return proposal?.['check in day'] || proposal?.checkInDay || 'Monday'
  }

  /**
   * Extract check-out day from proposal
   */
  const extractCheckOutDay = () => {
    return proposal?.['check out day'] || proposal?.checkOutDay || 'Friday'
  }

  /**
   * Extract reservation span weeks from proposal
   */
  const extractReservationSpanWeeks = () => {
    return proposal?.['Reservation Span (Weeks)'] || proposal?.reservationSpanWeeks || 8
  }

  // Form state - holds edited values
  const [editedMoveInDate, setEditedMoveInDate] = useState(() =>
    getProposalDate('moveInRangeStart', proposal?.['Move in range start'])
  )
  const [editedReservationSpan, setEditedReservationSpan] = useState(() => {
    const weeks = extractReservationSpanWeeks()
    const span = findReservationSpanByWeeks(weeks)
    // If weeks doesn't match any standard span, use 'other'
    if (!span) {
      return RESERVATION_SPANS.find(s => s.value === 'other')
    }
    return span
  })
  const [editedWeeks, setEditedWeeks] = useState(() =>
    extractReservationSpanWeeks()
  )
  const [editedCheckInDay, setEditedCheckInDay] = useState(() =>
    extractCheckInDay()
  )
  const [editedCheckOutDay, setEditedCheckOutDay] = useState(() =>
    extractCheckOutDay()
  )
  const [editedNightsSelected, setEditedNightsSelected] = useState(() =>
    extractNightsSelected()
  )
  const [editedDaysSelected, setEditedDaysSelected] = useState(() =>
    getProposalValue('daysSelected', ['Monday', 'Tuesday', 'Wednesday', 'Thursday'])
  )
  const [editedHouseRules, setEditedHouseRules] = useState([])
  const [houseRulesInitialized, setHouseRulesInitialized] = useState(false)

  // Initialize house rules when availableHouseRules becomes available
  useEffect(() => {
    if (availableHouseRules.length > 0 && !houseRulesInitialized) {
      const normalizedRules = extractHouseRules()
      setEditedHouseRules(normalizedRules)
      setHouseRulesInitialized(true)
      console.log('[HostEditingProposal] Initialized house rules:', normalizedRules)
    }
  }, [availableHouseRules, houseRulesInitialized])

  // Popup states
  const [showConfirmPopup, setShowConfirmPopup] = useState(false)
  const [showRejectSection, setShowRejectSection] = useState(false)
  const [rejectStep, setRejectStep] = useState(1) // 1 = confirm intent, 2 = select reason
  const [rejectReason, setRejectReason] = useState('')

  // Rejection reason options
  const REJECTION_REASONS = [
    { id: 'another_guest', label: 'Already have another guest' },
    { id: 'price_change', label: 'Decided to change the price of my listing for that time frame' },
    { id: 'different_schedule', label: 'Want a different schedule' },
    { id: 'other', label: 'Other / Do not want to say' }
  ]

  // Collapsible state
  const [isEditSectionExpanded, setIsEditSectionExpanded] = useState(false)

  // Initialize values based on proposal status
  useEffect(() => {
    if (isFirstOpen && proposal) {
      const status = proposal?.status || proposal?.Status
      const statusInfo = PROPOSAL_STATUSES[status] || { usualOrder: 0 }
      const useCounterOfferValues = statusInfo.usualOrder >= 3

      if (useCounterOfferValues) {
        const hcMoveInDate = proposal?.hcMoveInDate || proposal?.['hc Move-in Date']
        if (hcMoveInDate) {
          setEditedMoveInDate(new Date(hcMoveInDate))
        }

        const hcReservationSpan = proposal?.hcReservationSpan || proposal?.['hc Reservation Span']
        if (hcReservationSpan) {
          setEditedReservationSpan(hcReservationSpan)
        }

        const hcWeeks = proposal?.hcReservationSpanWeeks || proposal?.['hc Reservation Span Weeks']
        if (hcWeeks) {
          setEditedWeeks(hcWeeks)
        }

        const hcCheckInDay = proposal?.hcCheckInDay || proposal?.['hc Check-in Day']
        if (hcCheckInDay) {
          setEditedCheckInDay(hcCheckInDay)
        }

        const hcCheckOutDay = proposal?.hcCheckOutDay || proposal?.['hc Check-out Day']
        if (hcCheckOutDay) {
          setEditedCheckOutDay(hcCheckOutDay)
        }

        const hcNightsSelected = proposal?.hcNightsSelected || proposal?.['hc Nights Selected']
        if (hcNightsSelected) {
          setEditedNightsSelected(hcNightsSelected)
        }

        const hcDaysSelected = proposal?.hcDaysSelected || proposal?.['hc Days Selected']
        if (hcDaysSelected) {
          setEditedDaysSelected(hcDaysSelected)
        }

        const hcHouseRules = proposal?.hcHouseRules || proposal?.['hc House Rules']
        if (hcHouseRules) {
          setEditedHouseRules(hcHouseRules)
        }
      }

      setIsFirstOpen(false)
    }
  }, [proposal, isFirstOpen])

  // Check if any values have changed
  // Uses the same extraction functions as initialization to ensure consistent comparison
  const hasChanges = useCallback(() => {
    const originalMoveIn = getProposalDate('moveInRangeStart', proposal?.['Move in range start'])
    const dateChanged = formatDate(originalMoveIn, 'short') !== formatDate(editedMoveInDate, 'short')

    const originalWeeks = extractReservationSpanWeeks()
    // Use same fallback logic as initialization: if no matching span, use 'other'
    const originalSpan = findReservationSpanByWeeks(originalWeeks) ||
                         RESERVATION_SPANS.find(s => s.value === 'other')
    const spanChanged = originalWeeks !== editedWeeks ||
                        originalSpan?.value !== editedReservationSpan?.value

    // Use extraction functions for consistent field name handling
    const originalCheckIn = extractCheckInDay()
    const originalCheckOut = extractCheckOutDay()
    const scheduleChanged = originalCheckIn !== editedCheckInDay ||
                           originalCheckOut !== editedCheckOutDay

    // Only compare house rules if they have been initialized
    // Before initialization, editedHouseRules is [] which would cause false positives
    let rulesChanged = false
    if (houseRulesInitialized) {
      const originalRules = getProposalValue('houseRules', [])
      const originalRuleIds = new Set(originalRules.map(r => r.id))
      const editedRuleIds = new Set(editedHouseRules.map(r => r.id))
      rulesChanged = originalRuleIds.size !== editedRuleIds.size ||
                    [...originalRuleIds].some(id => !editedRuleIds.has(id))
    }

    // Debug logging
    console.log('[hasChanges] Comparison:', {
      dateChanged,
      originalMoveIn: formatDate(originalMoveIn, 'short'),
      editedMoveIn: formatDate(editedMoveInDate, 'short'),
      spanChanged,
      originalWeeks,
      editedWeeks,
      originalSpanValue: originalSpan?.value,
      editedSpanValue: editedReservationSpan?.value,
      scheduleChanged,
      originalCheckIn,
      editedCheckInDay,
      originalCheckOut,
      editedCheckOutDay,
      rulesChanged,
      houseRulesInitialized,
      editedRulesCount: editedHouseRules.length,
      result: dateChanged || spanChanged || scheduleChanged || rulesChanged
    })

    return dateChanged || spanChanged || scheduleChanged || rulesChanged
  }, [proposal, editedMoveInDate, editedWeeks, editedReservationSpan, editedCheckInDay, editedCheckOutDay, editedHouseRules, houseRulesInitialized])

  // Calculate approximate move-out date
  const approxMoveOut = addWeeks(editedMoveInDate, editedWeeks)

  // Calculate host compensation (host-facing view, no guest pricing)
  const nightsPerWeek = editedNightsSelected.length
  const totalNights = nightsPerWeek * editedWeeks
  const nightlyPrice = getProposalValue('proposalNightlyPrice', 0) ||
                       getProposalValue('proposal nightly price', 0) || 100
  const nightlyCompensation = nightlyPrice * 0.85 // 85% goes to host
  const totalCompensation = nightlyCompensation * totalNights
  const compensationPer4Weeks = editedWeeks > 0 ? (totalCompensation / editedWeeks) * 4 : 0

  // Calculate original compensation values for comparison
  const originalNightsPerWeek = extractNightsSelected().length
  const originalWeeksValue = extractReservationSpanWeeks()
  const originalTotalNights = originalNightsPerWeek * originalWeeksValue
  const originalTotalCompensation = nightlyCompensation * originalTotalNights
  const originalCompensationPer4Weeks = originalWeeksValue > 0
    ? (originalTotalCompensation / originalWeeksValue) * 4
    : 0

  // Handlers
  const handleToggleView = () => {
    setView(view === 'general' ? 'editing' : 'general')
  }

  const handleToggleEditSection = () => {
    const willExpand = !isEditSectionExpanded
    setIsEditSectionExpanded(willExpand)
    setView(willExpand ? 'editing' : 'general')
  }

  // Handler for edit button clicks from breakdown - opens edit section
  const handleEditField = (field) => {
    setIsEditSectionExpanded(true)
    setView('editing')
    // Could add logic to scroll to specific field if needed
  }

  const handleScheduleChange = (data) => {
    setEditedCheckInDay(data.checkInDay)
    setEditedCheckOutDay(data.checkOutDay)
    setEditedNightsSelected(data.nightsSelected)
    setEditedDaysSelected(data.daysSelected)
  }

  // Update Proposal button takes user to preview (breakdown) view
  const handleUpdateProposal = () => {
    setView('general')
    setIsEditSectionExpanded(false)
  }

  // From preview, user can confirm to show the final popup
  const handleConfirmFromPreview = () => {
    setShowConfirmPopup(true)
  }

  const handleConfirmProceed = async () => {
    if (proceedButtonLocked) return
    setProceedButtonLocked(true)

    try {
      if (!hasChanges()) {
        // Accept as-is
        if (onAcceptAsIs) {
          await onAcceptAsIs(proposal)
        }
        onAlert?.({
          type: 'information',
          title: 'Proposal Accepted!',
          content: 'The proposal has been accepted as-is.'
        })
      } else {
        // Counteroffer
        if (onCounteroffer) {
          await onCounteroffer({
            proposal,
            numberOfWeeks: editedWeeks,
            reservationSpan: editedReservationSpan,
            checkIn: editedCheckInDay,
            checkOut: editedCheckOutDay,
            nightsSelected: editedNightsSelected,
            daysSelected: editedDaysSelected,
            newHouseRules: editedHouseRules,
            moveInDate: editedMoveInDate
          })
        }
        onAlert?.({
          type: 'information',
          title: 'Modifications submitted!',
          content: 'Awaiting Guest Review.'
        })
      }

      setShowConfirmPopup(false)
      setView('general')
    } catch (error) {
      onAlert?.({
        type: 'error',
        title: 'Error',
        content: 'Failed to process your request. Please try again.'
      })
    } finally {
      setProceedButtonLocked(false)
    }
  }

  const handleReject = async () => {
    if (onReject) {
      try {
        // Find the label for the selected reason to pass human-readable text
        const selectedReason = REJECTION_REASONS.find(r => r.id === rejectReason)
        const reasonText = selectedReason?.label || rejectReason

        await onReject(proposal, reasonText)
        onAlert?.({
          type: 'information',
          title: 'Proposal Rejected',
          content: 'The proposal has been rejected.'
        })
        setShowRejectSection(false)
        setRejectStep(1)
        setRejectReason('')
      } catch (error) {
        onAlert?.({
          type: 'error',
          title: 'Error',
          content: 'Failed to reject proposal. Please try again.'
        })
      }
    }
  }

  const handleCancel = () => {
    setView('general')
    setIsFirstOpen(true)
    onCancel?.()
  }

  // Get guest and listing info
  const guest = proposal?.guest || proposal?._guest || {}
  const listing = proposal?.listing || proposal?._listing || {}
  const guestName = `${guest?.firstName || guest?.['First Name'] || ''} ${guest?.lastName || guest?.['Last Name'] || ''}`.trim() || 'Guest'
  const listingTitle = listing?.title || listing?.Name || 'Listing'

  // Get original values for comparison (using the same extraction functions as form initialization)
  const originalWeeks = extractReservationSpanWeeks()
  const originalSpanMatch = findReservationSpanByWeeks(originalWeeks)
  const originalValues = {
    moveInDate: getProposalDate('moveInRangeStart', proposal?.['Move in range start']),
    checkInDay: extractCheckInDay(),
    checkOutDay: extractCheckOutDay(),
    reservationSpan: originalSpanMatch || RESERVATION_SPANS.find(s => s.value === 'other'),
    weeksReservationSpan: originalWeeks,
    houseRules: getProposalValue('houseRules', []),
    nightsSelected: extractNightsSelected()
  }

  return (
    <div className="hep-container">
      {/* Header */}
      <div className="hep-section-header">
        <h2 className="hep-title-main">Review Proposal Terms</h2>
        <div className="hep-header-actions">
          <button
            type="button"
            className="hep-icon hep-icon-edit"
            onClick={handleToggleView}
            title="Edit proposal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            type="button"
            className="hep-icon hep-icon-close"
            onClick={handleCancel}
            title="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Guest Info */}
      <div className="hep-description hep-mb-16">
        Reviewing proposal from <strong>{guestName}</strong> for <strong>{listingTitle}</strong>
      </div>

      {/* Collapsible Edit Section */}
      <div
        className="hep-collapsible"
        onClick={handleToggleEditSection}
      >
        <span className="hep-collapsible-title">Edit Proposal Terms</span>
        <svg
          className={`hep-collapsible-icon ${isEditSectionExpanded ? 'hep-collapsible-icon--expanded' : ''}`}
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Editing Form */}
      <div className={`hep-animate-collapse ${isEditSectionExpanded && view === 'editing' ? 'expanded' : 'collapsed'}`}>
        <div className="hep-editing-terms">
          <h3 className="hep-title-section hep-mb-16">Proposal Details</h3>

          {/* Schedule Selector */}
          <div className="hep-form-group">
            <label className="hep-label">Schedule Selection</label>
            <ScheduleSelector
              initialNightsSelected={editedNightsSelected}
              availableNights={listing?.nightsAvailable || listing?.['Nights Available']}
              onChange={handleScheduleChange}
              disabled={isInternalUsage || listing?.rentalType === 'Weekly'}
            />
          </div>

          {/* Move-in Date */}
          <div className="hep-form-group">
            <label className="hep-label">Your convenient move-in date</label>
            <DateInput
              value={editedMoveInDate}
              onChange={setEditedMoveInDate}
              placeholder="Move-in"
              minDate={new Date()}
            />
            <div className="hep-text-value hep-mt-8">
              Move-in suggestion: {formatDate(originalValues.moveInDate)}
            </div>
          </div>

          {/* Reservation Span */}
          <div className="hep-form-row">
            <div className="hep-form-group">
              <label className="hep-label">Reservation Span</label>
              <ReservationSpanDropdown
                value={editedReservationSpan}
                onChange={(span) => {
                  setEditedReservationSpan(span)
                  if (span.value !== 'other') {
                    setEditedWeeks(span.weeks)
                  }
                }}
                options={RESERVATION_SPANS}
                placeholder="Select reservation span"
              />
            </div>
            {editedReservationSpan?.value === 'other' && (
              <div className="hep-form-group">
                <label className="hep-label"># of weeks</label>
                <NumberInput
                  value={editedWeeks}
                  onChange={setEditedWeeks}
                  placeholder="Enter # Weeks"
                  min={1}
                  max={52}
                />
              </div>
            )}
          </div>

          {/* House Rules */}
          <div className="hep-form-group">
            <label className="hep-label">House Rules</label>
            <HouseRulesMultiSelect
              value={editedHouseRules}
              onChange={setEditedHouseRules}
              options={availableHouseRules}
              placeholder="Choose some options..."
            />
          </div>

          {/* Approximate Move-out */}
          <div className="hep-proposal-row hep-mt-16">
            <span className="hep-row-label">Approximate Move-out</span>
            <span className="hep-text-value">{formatDate(approxMoveOut)}</span>
          </div>

          {/* Actions */}
          <div className="hep-actions-row">
            <button
              type="button"
              className="hep-btn hep-btn-cancel"
              onClick={handleCancel}
            >
              Cancel edits
            </button>
            <button
              type="button"
              className="hep-btn hep-btn-primary"
              onClick={handleUpdateProposal}
            >
              Update Proposal
            </button>
          </div>
        </div>
      </div>

      {/* Reservation Price Breakdown - shown in general view or as preview */}
      {view === 'general' && (
        <>
          <ReservationPriceBreakdown
            moveInDate={editedMoveInDate}
            checkInDay={editedCheckInDay}
            checkOutDay={editedCheckOutDay}
            reservationSpan={editedReservationSpan}
            weeksReservationSpan={editedWeeks}
            houseRules={editedHouseRules}
            nightsSelected={editedNightsSelected}
            nightlyCompensation={nightlyCompensation}
            totalCompensation={totalCompensation}
            hostCompensationPer4Weeks={compensationPer4Weeks}
            originalTotalCompensation={originalTotalCompensation}
            originalCompensationPer4Weeks={originalCompensationPer4Weeks}
            isVisible={true}
            originalValues={originalValues}
            onEditField={handleEditField}
          />

          {/* Reject Proposal Section (expanded) */}
          {showRejectSection && (
            <div className="hep-reject-section">
              <div className="hep-reject-header">
                <svg className="hep-icon-reject" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 7L5 7M14 11V17M10 11V17M5 7L6 19C6 20.1046 6.89543 21 8 21H16C17.1046 21 18 20.1046 18 19L19 7M9 7V4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="hep-reject-title">Reject Proposal</span>
              </div>
              <p className="hep-reject-warning">This action cannot be undone</p>
              <p className="hep-reject-confirmation">
                Are you sure you want to reject this proposal from <strong>{guestName}</strong>?
              </p>

              {/* Step 2: Rejection reason selection (shown after first confirmation) */}
              {rejectStep === 2 && (
                <div className="hep-reject-reasons">
                  {REJECTION_REASONS.map((reason) => (
                    <label key={reason.id} className="hep-reject-reason-option">
                      <input
                        type="radio"
                        name="rejectReason"
                        value={reason.id}
                        checked={rejectReason === reason.id}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <span className="hep-reject-reason-label">{reason.label}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="hep-reject-actions">
                <button
                  type="button"
                  className="hep-btn hep-btn-cancel"
                  onClick={() => {
                    setShowRejectSection(false)
                    setRejectStep(1)
                    setRejectReason('')
                  }}
                >
                  Cancel
                </button>
                {rejectStep === 1 ? (
                  <button
                    type="button"
                    className="hep-btn hep-btn-destructive"
                    onClick={() => setRejectStep(2)}
                  >
                    Yes, Reject
                  </button>
                ) : (
                  <button
                    type="button"
                    className="hep-btn hep-btn-destructive"
                    onClick={handleReject}
                    disabled={!rejectReason}
                  >
                    Yes, Reject
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Primary Actions Row - Submit/Accept and Reject side by side */}
          {!showRejectSection && (
            <div className="hep-primary-actions">
              <button
                type="button"
                className="hep-btn hep-btn-reject-outline"
                onClick={() => setShowRejectSection(true)}
              >
                Reject Proposal
              </button>
              <button
                type="button"
                className="hep-btn hep-btn-primary hep-btn-primary-large"
                onClick={handleConfirmFromPreview}
                disabled={proceedButtonLocked}
              >
                {hasChanges() ? 'Submit Edits' : 'Accept As-Is'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Confirmation Popup */}
      {showConfirmPopup && (
        <div className="hep-popup-overlay">
          <div className="hep-popup">
            <h3 className="hep-popup-title">
              {hasChanges() ? 'Confirm Counteroffer' : 'Accept Proposal'}
            </h3>
            <p className="hep-popup-content">
              {hasChanges()
                ? 'You have made changes to the proposal terms. This will send a counteroffer to the guest for their review.'
                : 'You are accepting the proposal as-is without any modifications.'}
            </p>
            <div className="hep-popup-actions">
              <button
                type="button"
                className="hep-btn hep-btn-cancel"
                onClick={() => setShowConfirmPopup(false)}
              >
                No, Go Back
              </button>
              <button
                type="button"
                className="hep-btn hep-btn-primary"
                onClick={handleConfirmProceed}
                disabled={proceedButtonLocked}
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
