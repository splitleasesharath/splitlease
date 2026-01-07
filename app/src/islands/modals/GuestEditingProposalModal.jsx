/**
 * GuestEditingProposalModal - Complete popup for guest proposal editing
 *
 * Based on Bubble.io reusable element with view state machine
 * Implements 4-view state machine: 'pristine' | 'editing' | 'general' | 'cancel'
 *
 * View States & Flow:
 * - 'pristine': Initial state when modal opens → "Close" + "Edit Proposal"
 * - 'editing': User is actively editing fields → "Cancel edits" + "Display New Terms"
 * - 'general': User reviewed new terms, ready to submit → "Close" + "Submit Proposal Edits"
 * - 'cancel': Cancel proposal modal is shown (handled by separate CancelProposalModal)
 *
 * State Transitions:
 * pristine → editing (click "Edit Proposal")
 * editing → pristine (click "Cancel edits")
 * editing → general (click "Display New Terms")
 * general → closed (click "Close" or "Submit Proposal Edits")
 *
 * Features:
 * - Day/Night selector for schedule editing
 * - Move-in date and flexible range input
 * - Reservation span dropdown with custom weeks
 * - Price breakdown display
 * - Responsive design with mobile support
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { executeCancelProposal } from '../../logic/workflows/proposals/cancelProposalWorkflow.js'
import CancelProposalModal from './CancelProposalModal.jsx'
import './GuestEditingProposalModal.css'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Days of the week with 0-based indexing (matching JavaScript Date.getDay())
 * 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
 */
const DAYS_OF_WEEK = [
  { id: 0, name: 'Sunday', shortName: 'Sun', singleLetter: 'S', dayIndex: 0 },
  { id: 1, name: 'Monday', shortName: 'Mon', singleLetter: 'M', dayIndex: 1 },
  { id: 2, name: 'Tuesday', shortName: 'Tue', singleLetter: 'T', dayIndex: 2 },
  { id: 3, name: 'Wednesday', shortName: 'Wed', singleLetter: 'W', dayIndex: 3 },
  { id: 4, name: 'Thursday', shortName: 'Thu', singleLetter: 'T', dayIndex: 4 },
  { id: 5, name: 'Friday', shortName: 'Fri', singleLetter: 'F', dayIndex: 5 },
  { id: 6, name: 'Saturday', shortName: 'Sat', singleLetter: 'S', dayIndex: 6 }
]

const RESERVATION_SPAN_OPTIONS = [
  { id: '2-weeks', display: '2 weeks', weeks: 2, months: 0, type: 'weeks' },
  { id: '4-weeks', display: '4 weeks', weeks: 4, months: 0, type: 'weeks' },
  { id: '1-month', display: '1 month', weeks: 4, months: 1, type: 'months' },
  { id: '2-months', display: '2 months', weeks: 8, months: 2, type: 'months' },
  { id: '3-months', display: '3 months', weeks: 13, months: 3, type: 'months' },
  { id: '6-months', display: '6 months', weeks: 26, months: 6, type: 'months' },
  { id: '12-months', display: '12 months', weeks: 52, months: 12, type: 'months' },
  { id: 'other', display: 'Other (wks)', weeks: 0, months: 0, type: 'other' }
]

const AVG_DAYS_PER_MONTH = 30.44

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(value) {
  if (value === undefined || value === null || isNaN(value)) {
    return '$0.00'
  }
  return '$' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatDateFull(date) {
  if (!date || !(date instanceof Date)) return ''
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

function formatDateShort(date) {
  if (!date || !(date instanceof Date)) return ''
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

function formatDate(date, isSmallScreen = false) {
  return isSmallScreen ? formatDateShort(date) : formatDateFull(date)
}

function calculateActualWeeksUsed(weeksReservationSpanNumber, weekSelectionPeriod) {
  if (!weekSelectionPeriod || weekSelectionPeriod === 0) return 0
  return Math.ceil(weeksReservationSpanNumber / weekSelectionPeriod)
}

function calculateNightsReserved(
  rentalType,
  weeksReservationSpanNumber,
  weekSelectionPeriod,
  nightsSelectedCount,
  reservationSpan
) {
  switch (rentalType) {
    case 'Nightly':
      const actualWeeks = calculateActualWeeksUsed(weeksReservationSpanNumber, weekSelectionPeriod)
      return actualWeeks * nightsSelectedCount
    case 'Weekly':
      return calculateActualWeeksUsed(weeksReservationSpanNumber, weekSelectionPeriod)
    case 'Monthly':
      if (reservationSpan?.type === 'other') {
        const monthsFromWeeks = (weeksReservationSpanNumber * 7) / AVG_DAYS_PER_MONTH
        return monthsFromWeeks.toFixed(2)
      }
      return reservationSpan?.months?.toFixed(2) || '0.00'
    default:
      return 0
  }
}

function isUserGuest(userType) {
  return userType === 'guest' || userType === 'A Guest (I would like to rent a space)'
}

function getCompensationLabel(rentalType) {
  switch (rentalType) {
    case 'Nightly': return 'Compensation /night'
    case 'Weekly': return 'Compensation /Week'
    case 'Monthly': return 'Compensation /31 days'
    default: return 'Compensation /night'
  }
}

function getReservedLabel(rentalType) {
  switch (rentalType) {
    case 'Nightly': return 'Nights reserved'
    case 'Weekly': return 'Weeks reserved'
    case 'Monthly': return 'Months reserved'
    default: return 'Nights reserved'
  }
}

function get4WeekPriceLabel(rentalType) {
  switch (rentalType) {
    case 'Weekly': return 'Price per 4 calendar weeks'
    default: return 'Price per 4 weeks'
  }
}

// ============================================================================
// SUB-COMPONENT: DayNightSelector
// ============================================================================

function DayNightSelector({
  days = DAYS_OF_WEEK,
  selectedDays,
  selectedNights,
  onDayToggle,
  onNightToggle,
  checkInDay,
  checkOutDay,
  onCheckInSelect,
  onCheckOutSelect,
  disabled = false
}) {
  const handleDayClick = useCallback((dayIndex) => {
    if (disabled) return
    onDayToggle(dayIndex)
    onNightToggle(dayIndex)
  }, [disabled, onDayToggle, onNightToggle])

  const dayToDayOption = useCallback((day) => ({
    display: day.name,
    dayIndex: day.dayIndex,
    first3Letters: day.shortName
  }), [])

  const isDaySelected = useCallback((dayIndex) => {
    return selectedDays.includes(dayIndex)
  }, [selectedDays])

  const isCheckInDay = useCallback((day) => {
    return checkInDay?.dayIndex === day.dayIndex
  }, [checkInDay])

  const isCheckOutDay = useCallback((day) => {
    return checkOutDay?.dayIndex === day.dayIndex
  }, [checkOutDay])

  const selectedDaysCount = selectedDays.length
  const selectedNightsCount = selectedNights.length

  return (
    <div className="day-night-selector">
      {/* Day/Night Grid */}
      <div className="dns-grid">
        {/* Calendar icon */}
        <div className="dns-calendar-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Day buttons */}
        {days.map((day) => (
          <button
            key={day.id}
            type="button"
            className={`dns-day-button ${isDaySelected(day.id) ? 'dns-day-button--selected' : ''} ${isCheckInDay(day) ? 'dns-day-button--check-in' : ''} ${isCheckOutDay(day) ? 'dns-day-button--check-out' : ''}`}
            onClick={() => handleDayClick(day.id)}
            disabled={disabled}
            title={day.name}
          >
            <span className="dns-day-label">{day.singleLetter}</span>
          </button>
        ))}

        {/* Info icon */}
        <div className="dns-info-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="9" stroke="#6366F1" strokeWidth="2"/>
            <text x="10" y="14" textAnchor="middle" fontSize="12" fill="#6366F1" fontWeight="bold">i</text>
          </svg>
        </div>
      </div>

      {/* Selection summary */}
      <div className="dns-summary">
        <p className="dns-summary-text">
          <strong>{selectedDaysCount}</strong> days, <strong>{selectedNightsCount}</strong> nights selected
        </p>
      </div>

      {/* Check-in/Check-out selection */}
      <div className="dns-checkin-checkout">
        <div className="dns-checkbox-row">
          <input
            type="checkbox"
            id="dns-checkin-checkbox"
            checked={selectedDaysCount > 0}
            readOnly
            className="dns-checkbox"
          />
          <label htmlFor="dns-checkin-checkbox" className="dns-checkbox-label">
            Check-in day is <strong>{checkInDay?.display || 'Not set'}</strong>
          </label>
        </div>

        <div className="dns-checkbox-row">
          <input
            type="checkbox"
            id="dns-checkout-checkbox"
            checked={!!checkOutDay}
            readOnly
            className="dns-checkbox"
          />
          <label htmlFor="dns-checkout-checkbox" className="dns-checkbox-label">
            Check-out day is <strong>{checkOutDay?.display || 'Not set'}</strong>
          </label>
        </div>
      </div>

      {/* Day selection row with labels */}
      <div className="dns-day-labels">
        {days.map((day) => (
          <div
            key={`label-${day.id}`}
            className={`dns-day-label-item ${isDaySelected(day.id) ? 'dns-day-label-item--selected' : ''}`}
          >
            <span className="dns-single-letter">{day.singleLetter}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// SUB-COMPONENT: ReservationPriceBreakdown
// ============================================================================

function ReservationPriceBreakdown({
  listing,
  proposal,
  moveInDate,
  checkInDay,
  checkOutDay,
  reservationSpan,
  weeksReservationSpanNumber,
  nightsSelected,
  houseRulesToDisplay = [],
  pricePerNight = 0,
  totalPriceForReservation = 0,
  priceRentPer4Weeks = 0,
  user,
  isVisible = true,
  isHouseRulesVisible = false,
  onHouseRulesClick,
  pageWidth = 1200
}) {
  if (!isVisible) {
    return null
  }

  const effectiveRentalType = proposal?.rentalType || listing?.rentalType || 'Nightly'
  const effectiveWeekSelection = proposal?.weekSelection
  const effectiveHostCompensation = proposal?.hostCompensation ?? 0
  const effectiveDamageDeposit = proposal?.damageDeposit ?? proposal?.['damage deposit'] ?? 0
  const effectiveCleaningFee = proposal?.cleaningFee ?? proposal?.['cleaning fee'] ?? 0

  const isGuest = isUserGuest(user?.watching?.type) || isUserGuest(user?.watching?.typeUserSignup) || user?.type === 'guest'
  const nightsSelectedCount = nightsSelected?.length || 0
  const isFullTime = nightsSelectedCount === 7
  const isWeeklyRental = effectiveRentalType === 'Weekly'

  const isSmallScreen = pageWidth < 900
  const isVerySmallScreen = pageWidth < 380
  const isTinyScreen = pageWidth < 350

  const weekPeriod = effectiveWeekSelection?.period || 1
  const actualWeeksUsed = calculateActualWeeksUsed(weeksReservationSpanNumber, weekPeriod)
  const nightsReserved = calculateNightsReserved(
    effectiveRentalType,
    weeksReservationSpanNumber,
    weekPeriod,
    nightsSelectedCount,
    reservationSpan
  )

  const compensationLabel = getCompensationLabel(effectiveRentalType)
  const reservedLabel = getReservedLabel(effectiveRentalType)
  const price4WeekLabel = get4WeekPriceLabel(effectiveRentalType)

  const getHouseRulesLabel = () => {
    const count = houseRulesToDisplay?.length || proposal?.hcHouseRules?.length || 0
    if (count === 0) {
      return isGuest ? 'No House Rules' : "You Don't Have any House Rules"
    }
    const clickText = isHouseRulesVisible ? '(click to hide)' : '(click to see)'
    const baseLabel = isGuest ? 'House Rules' : 'Your House Rules'
    return (
      <>
        {baseLabel} <span className="rpb-small-text">{clickText}</span>
      </>
    )
  }

  const getReservationLengthLabel = () => {
    if (isVerySmallScreen) return 'Duration'
    return 'Reservation Length'
  }

  const getReservationLengthValue = () => {
    if (reservationSpan?.type === 'other' || isTinyScreen) {
      return `${weeksReservationSpanNumber} weeks`
    }
    return reservationSpan?.display || `${weeksReservationSpanNumber} weeks`
  }

  const getCheckInLabel = () => isFullTime ? 'Occupancy' : 'Check-in'
  const getCheckInValue = () => isFullTime ? 'Full Time' : (checkInDay?.display || 'Not set')

  return (
    <div className="reservation-price-breakdown">
      {/* Note: Header removed - parent GuestEditingProposalModal already has "Proposal Details" in gep-header */}

      {/* Move-in Section */}
      <div className="rpb-row">
        <span className="rpb-label">Move-in</span>
        <span className="rpb-value">
          {formatDate(moveInDate, isSmallScreen)}
        </span>
      </div>

      {/* Check-in Section */}
      <div className="rpb-row">
        <span className="rpb-label">{getCheckInLabel()}</span>
        <span className="rpb-value">{getCheckInValue()}</span>
      </div>

      {/* Check-out Section - Hidden when full-time (7 nights) */}
      {!isFullTime && (
        <div className="rpb-row">
          <span className="rpb-label">Check-out</span>
          <span className="rpb-value">{checkOutDay?.display || 'Not set'}</span>
        </div>
      )}

      {/* Reservation Length Section */}
      <div className="rpb-row">
        <span className="rpb-label">{getReservationLengthLabel()}</span>
        <span className="rpb-value">{getReservationLengthValue()}</span>
      </div>

      {/* House Rules Section */}
      <div className="rpb-row">
        <span
          className={`rpb-label rpb-house-rules-label ${isTinyScreen ? 'rpb-label--small' : ''}`}
          onClick={onHouseRulesClick}
        >
          {getHouseRulesLabel()}
        </span>
        <span className={`rpb-value ${isTinyScreen ? 'rpb-value--small' : ''}`}>
          {houseRulesToDisplay?.length || proposal?.hcHouseRules?.length || 0}
        </span>
      </div>

      <hr className="rpb-divider" />

      {/* Weekly Pattern Section - Only for Weekly rentals */}
      {isWeeklyRental && (
        <>
          <div className="rpb-row">
            <span className="rpb-label rpb-label--regular">Weekly Pattern</span>
            <span className="rpb-value rpb-value--regular">
              {isSmallScreen && effectiveWeekSelection?.displayMobile
                ? effectiveWeekSelection.displayMobile
                : effectiveWeekSelection?.display || ''}
            </span>
          </div>

          <div className="rpb-row">
            <span className="rpb-label rpb-label--regular">Actual Weeks Used</span>
            <span className="rpb-value rpb-value--regular">
              {actualWeeksUsed}
            </span>
          </div>
        </>
      )}

      {/* Compensation/night Section - Hidden from guests */}
      {!isGuest && (
        <div className="rpb-row">
          <span className={`rpb-label rpb-label--large ${isVerySmallScreen ? 'rpb-label--responsive' : ''}`}>
            {compensationLabel}
          </span>
          <span className="rpb-value">
            {formatCurrency(effectiveHostCompensation)}
          </span>
        </div>
      )}

      {/* Price per night Section - Only for guests */}
      {isGuest && (
        <div className="rpb-row rpb-row--white">
          <span className={`rpb-label rpb-label--regular rpb-label--large ${pageWidth < 700 ? 'rpb-label--responsive-large' : ''}`}>
            Price per night
          </span>
          <span className={`rpb-value rpb-value--regular rpb-value--large ${pageWidth < 700 ? 'rpb-value--responsive-large' : ''}`}>
            {formatCurrency(pricePerNight)}
          </span>
        </div>
      )}

      {/* Nights/Weeks/Months Reserved Section */}
      <div className="rpb-row">
        <span className="rpb-label rpb-label--regular">{reservedLabel}</span>
        <span className="rpb-value rpb-value--regular">
          x {nightsReserved}
        </span>
      </div>

      <hr className="rpb-divider" />

      {/* Total Compensation Section - Hidden from guests */}
      {!isGuest && (
        <div className="rpb-row">
          <span className={`rpb-label rpb-label--regular rpb-label--large ${isVerySmallScreen ? 'rpb-label--responsive' : ''}`}>
            Total Compensation <span className="rpb-small-text">*Excluding Maintenance Fee and Damage Deposit</span>
          </span>
          <span className={`rpb-value rpb-value--regular rpb-value--large ${pageWidth < 700 ? 'rpb-value--responsive-large' : ''}`}>
            {formatCurrency(totalPriceForReservation)}
          </span>
        </div>
      )}

      {/* Total Price for Reservation - Only for guests */}
      {isGuest && (
        <>
          <hr className="rpb-divider rpb-divider--thick" />
          <div className="rpb-row">
            <span className={`rpb-label rpb-label--regular rpb-label--large ${pageWidth < 700 ? 'rpb-label--responsive-large' : ''}`}>
              Total Price for Reservation
            </span>
            <span className={`rpb-value rpb-value--regular rpb-value--large ${pageWidth < 700 ? 'rpb-value--responsive-large' : ''}`}>
              {formatCurrency(totalPriceForReservation)}
            </span>
          </div>
        </>
      )}

      <hr className="rpb-divider rpb-divider--thick" />

      {/* Price per 4 weeks - Only for guests */}
      {isGuest && (
        <div className="rpb-row rpb-row--white">
          <span className={`rpb-label rpb-label--regular rpb-label--large ${pageWidth < 700 ? 'rpb-label--responsive-large' : ''}`}>
            {price4WeekLabel}
          </span>
          <span className={`rpb-value rpb-value--regular rpb-value--large ${pageWidth < 700 ? 'rpb-value--responsive-large' : ''}`}>
            {formatCurrency(priceRentPer4Weeks)}
          </span>
        </div>
      )}

      {/* Damage Deposit Section */}
      <div className="rpb-row">
        <span className="rpb-label rpb-label--regular rpb-label--small">
          Refundable Damage Deposit<span className="rpb-asterisk">*</span>
        </span>
        <span className="rpb-value rpb-value--regular rpb-value--small">
          {formatCurrency(effectiveDamageDeposit)}
        </span>
      </div>

      {/* Maintenance Fee Section */}
      <div className="rpb-row">
        <span className="rpb-label rpb-label--regular rpb-label--small">
          Maintenance Fee<span className="rpb-asterisk">*</span> <span className="rpb-small-text">*see terms of use</span>
        </span>
        <span className="rpb-value rpb-value--regular rpb-value--small">
          {formatCurrency(effectiveCleaningFee)}
        </span>
      </div>

      {/* Disclaimer */}
      <p className="rpb-disclaimer">
        *Refundable Damage Deposit is held with Split Lease
      </p>

      {/* House Rules Expanded Section */}
      {isHouseRulesVisible && houseRulesToDisplay?.length > 0 && (
        <div className="rpb-house-rules-expanded">
          <h4 className="rpb-house-rules-title">House Rules:</h4>
          <ul className="rpb-house-rules-list">
            {houseRulesToDisplay.map((rule, index) => (
              <li key={index} className="rpb-house-rule-item">{rule}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT: GuestEditingProposalModal
// ============================================================================

export default function GuestEditingProposalModal({
  proposal,
  listing,
  user,
  initialView = 'pristine',
  isVisible = true,
  isInternalUsage = false,
  pageWidth = 1200,
  onClose,
  onProposalUpdate,
  onProposalCancel,
  onAlert,
  pricePerNight = 0,
  totalPriceForReservation = 0,
  priceRentPer4Weeks = 0
}) {
  // View state machine: 'pristine' | 'editing' | 'general' | 'cancel'
  const [view, setView] = useState(initialView)

  // Form state for editing
  const [formState, setFormState] = useState(() => ({
    moveInDate: proposal?.hcMoveInDate ? new Date(proposal.hcMoveInDate) :
                proposal?.['hc Move-in Date'] ? new Date(proposal['hc Move-in Date']) :
                proposal?.['Move in range start'] ? new Date(proposal['Move in range start']) :
                new Date(),
    flexibleMoveInRange: proposal?.moveInRangeText || proposal?.['Move in range text'] || '',
    reservationSpan: RESERVATION_SPAN_OPTIONS.find(s => s.weeks === (proposal?.reservationSpanWeeks || proposal?.['Reservation Span (Weeks)'])) || RESERVATION_SPAN_OPTIONS[1],
    numberOfWeeks: proposal?.reservationSpanWeeks || proposal?.['Reservation Span (Weeks)'] || 4,
    selectedDays: [1, 2, 3, 4, 5], // Default Monday-Friday
    selectedNights: [1, 2, 3, 4], // Default 4 nights
    checkInDay: { display: 'Monday', dayIndex: 1, first3Letters: 'Mon' },
    checkOutDay: { display: 'Friday', dayIndex: 5, first3Letters: 'Fri' }
  }))

  // Price breakdown visibility state
  const [isPriceBreakdownVisible, setIsPriceBreakdownVisible] = useState(true)

  // House rules visibility
  const [isHouseRulesVisible, setIsHouseRulesVisible] = useState(false)

  // Schedule and financial section hover state
  const [isScheduleHovered, setIsScheduleHovered] = useState(false)

  // Open for first time flag for initial state setup
  const [openForFirstTime, setOpenForFirstTime] = useState(true)

  // Responsive checks
  const isSmallScreen = pageWidth < 900

  // Proposal status check (>= 3 means accepted/completed)
  const proposalStatus = proposal?.status?.usualOrder ||
                         proposal?.['Status - Usual Order'] ||
                         proposal?.Status?.usualOrder ||
                         0
  const isStatusAccepted = proposalStatus >= 3

  // Computed visibility conditions from Bubble conditionals
  const showMainView = view !== 'cancel'
  const showEditingPortion = view === 'editing'
  const showBreakdownDetails = view === 'general' || view === 'pristine'
  const showScheduleFinancial = isStatusAccepted || view === 'editing' || isInternalUsage
  const showButtons = view === 'editing' || view === 'general' || view === 'pristine' || isStatusAccepted || isInternalUsage
  const isPristine = view === 'pristine'

  // Handle initial state setup when proposal changes
  useEffect(() => {
    if (proposal && openForFirstTime) {
      const moveInDateValue = proposal?.hcMoveInDate || proposal?.['hc Move-in Date'] || proposal?.['Move in range start']
      const weeksValue = proposal?.reservationSpanWeeks || proposal?.['Reservation Span (Weeks)'] || 4

      setFormState(prev => ({
        ...prev,
        moveInDate: moveInDateValue ? new Date(moveInDateValue) : new Date(),
        numberOfWeeks: weeksValue,
        reservationSpan: RESERVATION_SPAN_OPTIONS.find(s => s.weeks === weeksValue) || RESERVATION_SPAN_OPTIONS[1]
      }))
      setOpenForFirstTime(false)
    }
  }, [proposal, openForFirstTime])

  // Create reservation span object for price breakdown
  const reservationSpan = useMemo(() => {
    const span = formState.reservationSpan
    return {
      weeks: span?.weeks || formState.numberOfWeeks,
      months: span?.months || Math.floor(formState.numberOfWeeks / 4),
      weeksInThisPeriod: formState.numberOfWeeks,
      display: span?.display || `${formState.numberOfWeeks} weeks`,
      type: span?.type || 'weeks'
    }
  }, [formState.reservationSpan, formState.numberOfWeeks])

  // Handle close - reset to pristine state for next opening
  const handleClose = useCallback(() => {
    setView('pristine')
    onClose?.()
  }, [onClose])

  // Handle back button - go back one step in the state machine
  const handleBack = useCallback(() => {
    if (view === 'editing') {
      setView('pristine')
    } else {
      handleClose()
    }
  }, [view, handleClose])

  // Handle schedule and financial click
  const handleScheduleFinancialClick = useCallback(() => {
    if (view !== 'editing') {
      setView('editing')
    } else {
      setView('general')
    }
  }, [view])

  // Handle "Edit Proposal" button click from pristine state
  const handleStartEditing = useCallback(() => {
    setView('editing')
  }, [])

  // Handle form field changes
  const handleMoveInDateChange = useCallback((e) => {
    const date = new Date(e.target.value)
    setFormState(prev => ({ ...prev, moveInDate: date }))
  }, [])

  const handleFlexibleMoveInChange = useCallback((e) => {
    setFormState(prev => ({ ...prev, flexibleMoveInRange: e.target.value }))
  }, [])

  const handleReservationSpanChange = useCallback((e) => {
    const spanId = e.target.value
    const span = RESERVATION_SPAN_OPTIONS.find(s => s.id === spanId)
    setFormState(prev => ({
      ...prev,
      reservationSpan: span || null,
      numberOfWeeks: span?.type === 'other' ? prev.numberOfWeeks : (span?.weeks || prev.numberOfWeeks)
    }))
  }, [])

  const handleNumberOfWeeksChange = useCallback((e) => {
    const weeks = parseInt(e.target.value) || 0
    setFormState(prev => ({ ...prev, numberOfWeeks: weeks }))
  }, [])

  const handleDaysChange = useCallback((days) => {
    setFormState(prev => ({ ...prev, selectedDays: days }))
  }, [])

  const handleNightsChange = useCallback((nights) => {
    setFormState(prev => ({ ...prev, selectedNights: nights }))
  }, [])

  const handleCheckInChange = useCallback((day) => {
    setFormState(prev => ({ ...prev, checkInDay: day }))
  }, [])

  const handleCheckOutChange = useCallback((day) => {
    setFormState(prev => ({ ...prev, checkOutDay: day }))
  }, [])

  // Handle house rules click
  const handleHouseRulesClick = useCallback(() => {
    setIsHouseRulesVisible(prev => !prev)
  }, [])

  // Handle display new terms button - transitions from editing to general (review) state
  const handleDisplayNewTerms = useCallback(() => {
    setIsPriceBreakdownVisible(true)
    setView('general')
    onAlert?.({
      text: 'New terms calculated',
      alertType: 'information',
      showOnLive: true
    })
  }, [onAlert])

  // Handle submit proposal edits
  const handleSubmitProposalEdits = useCallback(() => {
    if (!proposal) return

    const payload = {
      proposal: proposal,
      nightsSelected: formState.selectedNights,
      daysSelected: formState.selectedDays,
      checkIn: formState.checkInDay,
      checkOut: formState.checkOutDay,
      reservationSpan: formState.reservationSpan || RESERVATION_SPAN_OPTIONS[0],
      numberOfWeeks: formState.numberOfWeeks,
      moveInDate: formState.moveInDate,
      fourWeekRent: priceRentPer4Weeks,
      nightlyPrice: pricePerNight,
      totalPrice: totalPriceForReservation
    }

    onProposalUpdate?.(payload)

    onAlert?.({
      text: 'Proposal updated successfully',
      alertType: 'success',
      showOnLive: true
    })

    handleClose()
  }, [
    proposal,
    formState,
    priceRentPer4Weeks,
    pricePerNight,
    totalPriceForReservation,
    onProposalUpdate,
    onAlert,
    handleClose
  ])

  // Handle cancel edits button - return to pristine state (discard edits)
  const handleCancelEdits = useCallback(() => {
    setView('pristine')
  }, [])

  // Handle initiate cancel proposal
  const handleInitiateCancelProposal = useCallback(() => {
    setView('cancel')
  }, [])

  // Handle cancel proposal confirmation
  const handleConfirmCancel = useCallback(async (reason) => {
    // Get proposal ID from the proposal object
    const proposalId = proposal?._id;

    if (!proposalId) {
      onAlert?.({
        text: 'Unable to cancel: proposal ID not found',
        alertType: 'error',
        showOnLive: true
      });
      return;
    }

    try {
      // Execute the cancellation in Supabase
      await executeCancelProposal(proposalId, reason || undefined);

      // Notify parent component
      onProposalCancel?.(reason);

      // Show success message
      onAlert?.({
        text: 'Proposal cancelled successfully',
        alertType: 'success',
        showOnLive: true
      });

      // Close the modal
      handleClose();
    } catch (error) {
      console.error('[GuestEditingProposalModal] Error cancelling proposal:', error);
      onAlert?.({
        text: `Failed to cancel proposal: ${error.message}`,
        alertType: 'error',
        showOnLive: true
      });
    }
  }, [proposal, onProposalCancel, onAlert, handleClose])

  // Handle cancel modal dismiss
  const handleDismissCancel = useCallback(() => {
    setView('general')
  }, [])

  // Get user context for price breakdown
  const userContext = useMemo(() => ({
    watching: {
      type: user?.type || 'guest',
      typeUserSignup: user?.typeUserSignup || 'A Guest (I would like to rent a space)'
    },
    type: 'guest'
  }), [user])

  // Get house rules from proposal or listing
  const houseRulesToDisplay = useMemo(() => {
    return proposal?.hcHouseRules ||
           proposal?.['hc House Rules'] ||
           listing?.['House Rules'] ||
           []
  }, [proposal, listing])

  // Don't render if not visible
  if (!isVisible) {
    return null
  }

  return (
    <div className="guest-editing-proposal-modal-overlay" onClick={handleClose}>
      <div className="guest-editing-proposal" onClick={(e) => e.stopPropagation()}>
        {/* Main view for editing and reviewing */}
        {showMainView && (
          <div className={`gep-main-view ${view === 'editing' ? 'gep-main-view--editing' : ''}`}>
            {/* Header */}
            <div className="gep-header">
              <button
                type="button"
                className="gep-back-button"
                onClick={handleBack}
                aria-label="Back"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div className="gep-header-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h2 className="gep-title">Proposal Details</h2>
              </div>

              <button
                type="button"
                className="gep-close-button"
                onClick={handleClose}
                aria-label="Close"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Guest comment section */}
            {(proposal?.guestCommentToEditSuggestedProposal || proposal?.['Guest Comment to Edit Suggested Proposal']) && (
              <div className="gep-guest-comment">
                <p className="gep-guest-comment-text">
                  Guest's comment to update suggested proposal: {proposal.guestCommentToEditSuggestedProposal || proposal['Guest Comment to Edit Suggested Proposal']}
                </p>
              </div>
            )}

            {/* Editing portion - conditionally visible */}
            {showEditingPortion && (
              <div className="gep-editing-portion">
                {/* Day/Night Selector */}
                <DayNightSelector
                  days={DAYS_OF_WEEK}
                  selectedDays={formState.selectedDays}
                  selectedNights={formState.selectedNights}
                  onDayToggle={(dayIndex) => {
                    const newDays = formState.selectedDays.includes(dayIndex)
                      ? formState.selectedDays.filter(d => d !== dayIndex)
                      : [...formState.selectedDays, dayIndex]
                    handleDaysChange(newDays)
                  }}
                  onNightToggle={(nightIndex) => {
                    const newNights = formState.selectedNights.includes(nightIndex)
                      ? formState.selectedNights.filter(n => n !== nightIndex)
                      : [...formState.selectedNights, nightIndex]
                    handleNightsChange(newNights)
                  }}
                  checkInDay={formState.checkInDay}
                  checkOutDay={formState.checkOutDay}
                  onCheckInSelect={handleCheckInChange}
                  onCheckOutSelect={handleCheckOutChange}
                />

                {/* Move-In Date Section */}
                <div className="gep-form-section">
                  <label className="gep-form-label">Move-In Date</label>
                  <div className="gep-date-input-container">
                    <input
                      type="date"
                      className="gep-date-input"
                      value={formState.moveInDate instanceof Date && !isNaN(formState.moveInDate)
                        ? formState.moveInDate.toISOString().split('T')[0]
                        : ''}
                      onChange={handleMoveInDateChange}
                      placeholder="Move-in"
                    />
                    <button type="button" className="gep-calendar-button" aria-label="Open calendar">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                        <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                  <p className="gep-date-display">
                    Move-in: {formatDate(formState.moveInDate, isSmallScreen)}
                  </p>
                </div>

                {/* Flexible Move-In Date Section */}
                <div className="gep-form-section">
                  <label className="gep-form-label">
                    Flexible move-in date?
                    <button type="button" className="gep-info-button" aria-label="More info">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/>
                        <text x="10" y="14" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">?</text>
                      </svg>
                    </button>
                  </label>
                  <textarea
                    className="gep-textarea"
                    value={formState.flexibleMoveInRange}
                    onChange={handleFlexibleMoveInChange}
                    placeholder="Type here your move-in range..."
                    rows={2}
                  />
                </div>

                {/* Reservation Span Section */}
                <div className="gep-form-section">
                  <label className="gep-form-label">Reservation Span</label>
                  <select
                    className="gep-select"
                    value={formState.reservationSpan?.id || ''}
                    onChange={handleReservationSpanChange}
                  >
                    <option value="" disabled>Reservation Span</option>
                    {RESERVATION_SPAN_OPTIONS.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.display}
                      </option>
                    ))}
                  </select>

                  {/* Number of weeks - shown when "Other" is selected */}
                  {formState.reservationSpan?.type === 'other' && (
                    <div className="gep-weeks-input-section">
                      <label className="gep-form-label-small"># of Weeks</label>
                      <input
                        type="number"
                        className="gep-number-input"
                        value={formState.numberOfWeeks}
                        onChange={handleNumberOfWeeksChange}
                        placeholder="Enter # of Weeks"
                        min={1}
                      />
                    </div>
                  )}
                </div>

                {/* Weekly Pattern Display */}
                <div className="gep-weekly-pattern">
                  <span className="gep-weekly-pattern-label">Weekly Pattern:</span>
                  <span className="gep-weekly-pattern-value">
                    {proposal?.weekSelection?.display ||
                     proposal?.['Week Selection']?.display ||
                     'Not set'}
                  </span>
                </div>

                {/* Schedule Selector Placeholder */}
                <div className="gep-schedule-selector-placeholder">
                  <p className="gep-placeholder-text">Schedule Selector</p>
                </div>
              </div>
            )}

            {/* Breakdown details - conditionally visible */}
            {showBreakdownDetails && (
              <div className="gep-breakdown-details">
                <ReservationPriceBreakdown
                  listing={listing || proposal?._listing}
                  proposal={proposal}
                  moveInDate={formState.moveInDate}
                  checkInDay={formState.checkInDay}
                  checkOutDay={formState.checkOutDay}
                  reservationSpan={reservationSpan}
                  weeksReservationSpanNumber={formState.numberOfWeeks}
                  nightsSelected={formState.selectedNights}
                  houseRulesToDisplay={houseRulesToDisplay}
                  pricePerNight={pricePerNight || proposal?.['proposal nightly price'] || 0}
                  totalPriceForReservation={totalPriceForReservation || proposal?.['Total Price for Reservation (guest)'] || 0}
                  priceRentPer4Weeks={priceRentPer4Weeks || proposal?.['Price Rent per 4 weeks'] || 0}
                  user={userContext}
                  isVisible={true}
                  isHouseRulesVisible={isHouseRulesVisible}
                  onHouseRulesClick={handleHouseRulesClick}
                  pageWidth={pageWidth}
                />
              </div>
            )}

            {/* Schedule and financial section - conditionally visible */}
            {showScheduleFinancial && (
              <div
                className={`gep-schedule-financial ${isScheduleHovered ? 'gep-schedule-financial--hovered' : ''}`}
                onClick={handleScheduleFinancialClick}
                onMouseEnter={() => setIsScheduleHovered(true)}
                onMouseLeave={() => setIsScheduleHovered(false)}
              >
                <div className="gep-schedule-financial-content">
                  <span className="gep-schedule-financial-label">
                    Edit Proposal Terms (Nights, Weeks, Move-in date)
                  </span>
                  <svg
                    className={`gep-expand-icon ${view === 'editing' ? 'gep-expand-icon--expanded' : ''}`}
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            )}

            {/* Buttons section - conditionally visible */}
            {showButtons && (
              <div className="gep-buttons">
                {view === 'pristine' ? (
                  /* Pristine state: User just opened modal, hasn't edited anything */
                  <>
                    <button
                      type="button"
                      className="gep-button gep-button--secondary"
                      onClick={handleClose}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="gep-button gep-button--primary"
                      onClick={handleStartEditing}
                    >
                      Edit Proposal
                    </button>
                  </>
                ) : view === 'editing' ? (
                  /* Editing state: User is actively changing fields */
                  <>
                    <button
                      type="button"
                      className="gep-button gep-button--secondary"
                      onClick={handleCancelEdits}
                    >
                      Cancel edits
                    </button>
                    <button
                      type="button"
                      className="gep-button gep-button--primary"
                      onClick={handleDisplayNewTerms}
                    >
                      Display New Terms
                    </button>
                  </>
                ) : (
                  /* General state: User has reviewed new terms, ready to submit */
                  <>
                    <button
                      type="button"
                      className="gep-button gep-button--secondary"
                      onClick={handleClose}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="gep-button gep-button--primary"
                      onClick={handleSubmitProposalEdits}
                    >
                      Submit Proposal Edits
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Cancel Proposal Button - HIDDEN: cancellation now handled by separate CancelProposalModal shared island */}
            {/* Keeping code for reference while CancelProposalModal issues are resolved */}
            {false && view === 'general' && (
              <div className="gep-cancel-section">
                <button
                  type="button"
                  className="gep-button gep-button--destructive-outline"
                  onClick={handleInitiateCancelProposal}
                >
                  Cancel Proposal
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cancel proposal modal */}
        <CancelProposalModal
          isOpen={view === 'cancel'}
          proposal={proposal}
          listing={listing || proposal?._listing}
          userType="guest"
          onClose={handleDismissCancel}
          onConfirm={handleConfirmCancel}
        />
      </div>
    </div>
  )
}
