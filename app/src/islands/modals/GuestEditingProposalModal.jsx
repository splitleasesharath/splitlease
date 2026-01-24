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
    <div className="day-night-selector" role="group" aria-labelledby="dns-heading">
      <span id="dns-heading" className="gep-sr-only">Select days of the week for your stay</span>
      {/* Day buttons grid - matches mockup exactly */}
      <div className="dns-day-grid" role="group" aria-label="Days of the week">
        {days.map((day) => (
          <button
            key={day.id}
            type="button"
            className={`dns-day-btn ${isDaySelected(day.id) ? 'dns-day-btn--selected' : ''}`}
            onClick={() => handleDayClick(day.id)}
            disabled={disabled}
            title={day.name}
            aria-label={`${day.name}${isDaySelected(day.id) ? ', selected' : ''}`}
            aria-pressed={isDaySelected(day.id)}
          >
            {day.singleLetter}
          </button>
        ))}
      </div>

      {/* Schedule info container - combines check-in, check-out, and summary */}
      <div className="dns-schedule-info">
        <div className="dns-schedule-info-row">
          <span className="dns-schedule-info-label">Check-in:</span>
          <span className="dns-schedule-info-value">{checkInDay?.display || 'Not set'}</span>
        </div>
        <div className="dns-schedule-info-row">
          <span className="dns-schedule-info-label">Check-out:</span>
          <span className="dns-schedule-info-value">{checkOutDay?.display || 'Not set'}</span>
        </div>
        <div className="dns-schedule-info-divider"></div>
        <div className="dns-schedule-info-row">
          <span className="dns-schedule-info-summary">
            <strong>{selectedDaysCount}</strong> days, <strong>{selectedNightsCount}</strong> nights per week
          </span>
        </div>
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

  // Debug log to verify initial view state
  console.log('[GuestEditingProposalModal] initialView:', initialView, '| current view:', view)

  // Helper to parse days selected from proposal
  const parseDaysSelected = (proposal) => {
    let days = proposal?.['Days Selected'] || proposal?.['hc days selected'] || []
    if (typeof days === 'string') {
      try { days = JSON.parse(days) } catch (e) { days = [] }
    }
    if (!Array.isArray(days) || days.length === 0) return [1, 2, 3, 4, 5] // Default Mon-Fri

    // Convert to day indices (0=Sun, 1=Mon, etc.)
    return days.map(d => {
      if (typeof d === 'number') return d
      if (typeof d === 'string') {
        const trimmed = d.trim()
        const numericValue = parseInt(trimmed, 10)
        if (!isNaN(numericValue) && String(numericValue) === trimmed) return numericValue
        // Map day names to indices
        const dayNameMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 }
        return dayNameMap[trimmed] ?? -1
      }
      return -1
    }).filter(d => d >= 0 && d <= 6)
  }

  // Helper to parse check-in/check-out day from proposal
  // Database stores these as numeric strings ("5" for Friday) or day names ("Friday")
  const parseDayFromProposal = (dayValue, fallbackIndex = 1) => {
    if (dayValue === null || dayValue === undefined || dayValue === '') {
      const fallback = DAYS_OF_WEEK[fallbackIndex]
      return { display: fallback.name, dayIndex: fallback.dayIndex, first3Letters: fallback.shortName }
    }

    // Handle numeric value (number or numeric string like "5")
    const numericValue = typeof dayValue === 'number' ? dayValue : parseInt(String(dayValue).trim(), 10)
    if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 6) {
      const dayObj = DAYS_OF_WEEK[numericValue]
      return { display: dayObj.name, dayIndex: dayObj.dayIndex, first3Letters: dayObj.shortName }
    }

    // Handle day name string (e.g., "Friday", "Tuesday")
    const dayObj = DAYS_OF_WEEK.find(d => d.name === dayValue || d.shortName === dayValue)
    if (dayObj) {
      return { display: dayObj.name, dayIndex: dayObj.dayIndex, first3Letters: dayObj.shortName }
    }

    // Fallback if not found
    const fallback = DAYS_OF_WEEK[fallbackIndex]
    return { display: fallback.name, dayIndex: fallback.dayIndex, first3Letters: fallback.shortName }
  }

  // Form state for editing
  const [formState, setFormState] = useState(() => {
    const daysSelected = parseDaysSelected(proposal)
    const nightsCount = proposal?.['nights per week (num)'] || daysSelected.length - 1 || 4

    // Parse check-in and check-out days from proposal data
    const checkInDayValue = proposal?.['check in day'] || proposal?.checkInDay
    const checkOutDayValue = proposal?.['check out day'] || proposal?.checkOutDay

    return {
      moveInDate: proposal?.hcMoveInDate ? new Date(proposal.hcMoveInDate) :
                  proposal?.['hc Move-in Date'] ? new Date(proposal['hc Move-in Date']) :
                  proposal?.['Move in range start'] ? new Date(proposal['Move in range start']) :
                  new Date(),
      flexibleMoveInRange: proposal?.moveInRangeText || proposal?.['Move in range text'] || '',
      reservationSpan: RESERVATION_SPAN_OPTIONS.find(s => s.weeks === (proposal?.reservationSpanWeeks || proposal?.['Reservation Span (Weeks)'])) || RESERVATION_SPAN_OPTIONS[1],
      numberOfWeeks: proposal?.reservationSpanWeeks || proposal?.['Reservation Span (Weeks)'] || 4,
      selectedDays: daysSelected,
      selectedNights: daysSelected.slice(0, nightsCount), // Nights are a subset of selected days
      checkInDay: parseDayFromProposal(checkInDayValue, 1),   // Default to Monday (index 1)
      checkOutDay: parseDayFromProposal(checkOutDayValue, 5)  // Default to Friday (index 5)
    }
  })

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
      const daysSelected = parseDaysSelected(proposal)
      const nightsCount = proposal?.['nights per week (num)'] || daysSelected.length - 1 || 4

      // Parse check-in and check-out days from proposal data
      const checkInDayValue = proposal?.['check in day'] || proposal?.checkInDay
      const checkOutDayValue = proposal?.['check out day'] || proposal?.checkOutDay

      setFormState(prev => ({
        ...prev,
        moveInDate: moveInDateValue ? new Date(moveInDateValue) : new Date(),
        numberOfWeeks: weeksValue,
        reservationSpan: RESERVATION_SPAN_OPTIONS.find(s => s.weeks === weeksValue) || RESERVATION_SPAN_OPTIONS[1],
        selectedDays: daysSelected,
        selectedNights: daysSelected.slice(0, nightsCount),
        checkInDay: parseDayFromProposal(checkInDayValue, 1),
        checkOutDay: parseDayFromProposal(checkOutDayValue, 5)
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
    <div
      className="guest-editing-proposal-modal-overlay"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gep-modal-title"
    >
      <div
        className="guest-editing-proposal"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* Main view for editing and reviewing */}
        {showMainView && (
          <div className={`gep-main-view ${view === 'editing' ? 'gep-main-view--editing' : ''}`}>
            {/* Header - matches mockup exactly */}
            <div className="gep-header">
              {view === 'pristine' ? (
                /* Pristine header: icon + title/subtitle on left, close on right */
                <>
                  <div className="gep-header-left">
                    <div className="gep-header-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                    </div>
                    <div>
                      <h2 id="gep-modal-title" className="gep-header-title-text">Proposal Details</h2>
                      <p className="gep-header-subtitle">{listing?.title || listing?.Title || proposal?._listing?.title || 'Listing'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="gep-close-button"
                    onClick={handleClose}
                    aria-label="Close modal"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </>
              ) : (
                /* Editing/General header: left-aligned with back button, consistent with pristine */
                <>
                  <div className="gep-header-left">
                    <button
                      type="button"
                      className="gep-header-back-btn"
                      onClick={handleBack}
                      aria-label="Go back to previous view"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M15 18L9 12L15 6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <div>
                      <h2 id="gep-modal-title" className="gep-header-title-text">Edit Proposal</h2>
                      <p className="gep-header-subtitle">{listing?.title || listing?.Title || proposal?._listing?.title || 'Listing'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="gep-close-button"
                    onClick={handleClose}
                    aria-label="Close modal"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </>
              )}
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
                  <label htmlFor="gep-move-in-date" className="gep-form-label">Move-In Date</label>
                  <div className="gep-date-input-container">
                    <input
                      type="date"
                      id="gep-move-in-date"
                      className="gep-date-input"
                      value={formState.moveInDate instanceof Date && !isNaN(formState.moveInDate)
                        ? formState.moveInDate.toISOString().split('T')[0]
                        : ''}
                      onChange={handleMoveInDateChange}
                      aria-describedby="gep-move-in-display"
                    />
                    <button type="button" className="gep-calendar-button" aria-label="Open calendar picker">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                        <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                  <p id="gep-move-in-display" className="gep-date-display" aria-live="polite">
                    Move-in: {formatDate(formState.moveInDate, isSmallScreen)}
                  </p>
                </div>

                {/* Flexible Move-In Date Section */}
                <div className="gep-form-section">
                  <label htmlFor="gep-flexible-move-in" className="gep-form-label">
                    Flexible move-in date?
                    <button type="button" className="gep-info-button" aria-label="More information about flexible move-in dates">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/>
                        <text x="10" y="14" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">?</text>
                      </svg>
                    </button>
                  </label>
                  <textarea
                    id="gep-flexible-move-in"
                    className="gep-textarea"
                    value={formState.flexibleMoveInRange}
                    onChange={handleFlexibleMoveInChange}
                    placeholder="Type here your move-in range..."
                    rows={2}
                    aria-describedby="gep-flexible-hint"
                  />
                  <span id="gep-flexible-hint" className="gep-sr-only">Optionally describe a range of dates when you could move in</span>
                </div>

                {/* Reservation Span Section */}
                <div className="gep-form-section">
                  <label htmlFor="gep-reservation-span" className="gep-form-label">Reservation Span</label>
                  <select
                    id="gep-reservation-span"
                    className="gep-select"
                    value={formState.reservationSpan?.id || ''}
                    onChange={handleReservationSpanChange}
                    aria-describedby={formState.reservationSpan?.type === 'other' ? 'gep-weeks-section' : undefined}
                  >
                    <option value="" disabled>Select reservation length</option>
                    {RESERVATION_SPAN_OPTIONS.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.display}
                      </option>
                    ))}
                  </select>

                  {/* Number of weeks - shown when "Other" is selected */}
                  {formState.reservationSpan?.type === 'other' && (
                    <div id="gep-weeks-section" className="gep-weeks-input-section">
                      <label htmlFor="gep-num-weeks" className="gep-form-label-small"># of Weeks</label>
                      <input
                        type="number"
                        id="gep-num-weeks"
                        className="gep-number-input"
                        value={formState.numberOfWeeks}
                        onChange={handleNumberOfWeeksChange}
                        placeholder="Enter # of Weeks"
                        min={1}
                        aria-label="Number of weeks for reservation"
                      />
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Pristine document view - matches mockup exactly */}
            {view === 'pristine' && (
              <div className="gep-document-view" role="region" aria-label="Proposal details">
                {/* Detail rows using semantic definition list */}
                <dl className="gep-details-list">
                  <div className="gep-detail-row">
                    <dt className="gep-detail-label">Move-in</dt>
                    <dd className="gep-detail-value">{formatDate(formState.moveInDate, false)}</dd>
                  </div>
                  <div className="gep-detail-row">
                    <dt className="gep-detail-label">Check-in</dt>
                    <dd className="gep-detail-value">{formState.checkInDay?.display || 'Not set'}</dd>
                  </div>
                  <div className="gep-detail-row">
                    <dt className="gep-detail-label">Check-out</dt>
                    <dd className="gep-detail-value">{formState.checkOutDay?.display || 'Not set'}</dd>
                  </div>
                  <div className="gep-detail-row">
                    <dt className="gep-detail-label">Reservation Length</dt>
                    <dd className="gep-detail-value">{reservationSpan.display}</dd>
                  </div>
                  <div className="gep-detail-row">
                    <dt className="gep-detail-label">Weekly Pattern</dt>
                    <dd className="gep-detail-value">
                      {formState.checkInDay?.first3Letters || 'Mon'} - {formState.checkOutDay?.first3Letters || 'Fri'} ({formState.selectedNights.length} nights/week)
                    </dd>
                  </div>
                  <div className="gep-detail-row">
                    <dt className="gep-detail-label">House Rules</dt>
                    <dd className="gep-detail-value">{houseRulesToDisplay.length}</dd>
                  </div>
                </dl>

                {/* Pricing Breakdown section */}
                <div className="gep-pricing-section">
                  <div className="gep-pricing-title">Pricing Breakdown</div>
                  <div className="gep-pricing-row">
                    <span className="gep-pricing-label">Price per night</span>
                    <span className="gep-pricing-value">${(pricePerNight || 0).toFixed(2)}</span>
                  </div>
                  <div className="gep-pricing-row">
                    <span className="gep-pricing-label">{getReservedLabel(listing?.rentalType || 'Nightly')}</span>
                    <span className="gep-pricing-value">× {formState.selectedNights.length * formState.numberOfWeeks}</span>
                  </div>
                  <div className="gep-pricing-row gep-pricing-row--total">
                    <span className="gep-pricing-label">Total Price for Reservation</span>
                    <span className="gep-pricing-value">${(totalPriceForReservation || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Fees section */}
                <div className="gep-fees-section">
                  <div className="gep-fee-row">
                    <span className="gep-fee-label">{get4WeekPriceLabel(listing?.rentalType || 'Nightly')}</span>
                    <span className="gep-fee-value">${(priceRentPer4Weeks || 0).toFixed(2)}</span>
                  </div>
                  <div className="gep-fee-row">
                    <span className="gep-fee-label">Refundable Damage Deposit*</span>
                    <span className="gep-fee-value">${(listing?.damageDeposit || listing?.['Damage Deposit'] || 0).toFixed(2)}</span>
                  </div>
                  <div className="gep-fee-row">
                    <span className="gep-fee-label">Maintenance Fee* <span className="gep-fee-note">*see terms of use</span></span>
                    <span className="gep-fee-value">${(listing?.maintenanceFee || listing?.['Maintenance Fee'] || 0).toFixed(2)}</span>
                  </div>
                  <p className="gep-disclaimer">*Refundable Damage Deposit is held with Split Lease</p>
                </div>
              </div>
            )}

            {/* General breakdown details - for general view only */}
            {view === 'general' && (
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

          </div>
        )}

        {/* Buttons section - OUTSIDE gep-main-view so they stay pinned at bottom */}
        {showMainView && showButtons && (
          <div className={`gep-buttons ${view === 'pristine' ? 'gep-buttons--vertical' : ''}`}>
            {view === 'pristine' ? (
              /* Pristine state: User just opened modal, hasn't edited anything */
              /* Edit Proposal on top, Close on bottom - stacked vertically */
              <>
                <button
                  type="button"
                  className="gep-button gep-button--primary"
                  onClick={handleStartEditing}
                >
                  Edit Proposal
                </button>
                <button
                  type="button"
                  className="gep-button gep-button--secondary"
                  onClick={handleClose}
                >
                  Close
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
