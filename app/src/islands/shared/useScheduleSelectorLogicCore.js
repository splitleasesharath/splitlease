/**
 * useScheduleSelectorLogicCore - Logic hook using Logic Core functions
 * This is the refactored version that uses the Logic Core architecture.
 *
 * ARCHITECTURE: This hook orchestrates Logic Core functions (no business logic inside).
 * - Calculators for pure math
 * - Rules for boolean predicates
 * - Workflows for orchestration
 * - Processors for data transformation
 *
 * The component using this hook should be "hollow" (presentation only).
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { isScheduleContiguous } from '../../logic/rules/scheduling/isScheduleContiguous.js'
import { calculateCheckInOutDays } from '../../logic/calculators/scheduling/calculateCheckInOutDays.js'
import { calculateNightsFromDays } from '../../logic/calculators/scheduling/calculateNightsFromDays.js'
import { calculatePrice } from '../../lib/scheduleSelector/priceCalculations.js' // TODO: Migrate to Logic Core
import {
  sortDays,
  getNotSelectedDays,
  createAllDays,
  getUnusedNights,
  createNightsFromDays
} from '../../lib/scheduleSelector/dayHelpers.js' // Infrastructure - factory functions

/**
 * Custom hook for managing schedule selector state and logic.
 * Uses Logic Core functions for all business logic.
 *
 * @param {object} params - Configuration parameters.
 * @param {object} params.listing - Listing object with availability and pricing.
 * @param {Array} params.initialSelectedDays - Initially selected days.
 * @param {boolean} params.limitToFiveNights - Whether to limit to 5 nights.
 * @param {number} params.reservationSpan - Reservation span in weeks.
 * @param {object} params.zatConfig - ZAT pricing configuration.
 * @param {Function} params.onSelectionChange - Callback when selection changes.
 * @param {Function} params.onPriceChange - Callback when price changes.
 * @param {Function} params.onScheduleChange - Callback when schedule state changes.
 * @returns {object} Schedule state and action handlers.
 */
export const useScheduleSelectorLogicCore = ({
  listing,
  initialSelectedDays = [],
  limitToFiveNights = false,
  reservationSpan = 13,
  zatConfig = null,
  onSelectionChange,
  onPriceChange,
  onScheduleChange
}) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [selectedDays, setSelectedDays] = useState(initialSelectedDays)
  const [errorState, setErrorState] = useState({
    hasError: false,
    errorType: null,
    errorMessage: ''
  })
  const [isClickable, setIsClickable] = useState(true)
  const [recalculateState, setRecalculateState] = useState(false)
  const [acceptableSchedule, setAcceptableSchedule] = useState(false)
  const [maxNightsWarningShown, setMaxNightsWarningShown] = useState(false)
  const [minNightsWarningShown, setMinNightsWarningShown] = useState(false)

  // ============================================================================
  // INFRASTRUCTURE (Factory functions - not business logic)
  // ============================================================================

  const allDays = useMemo(() => {
    return createAllDays(listing.daysAvailable)
  }, [listing.daysAvailable])

  // ============================================================================
  // LOGIC CORE CALCULATIONS (Using Logic Core functions)
  // ============================================================================

  // Calculate nights using Logic Core
  const nightsCount = useMemo(() => {
    if (selectedDays.length === 0) return 0
    const dayIndices = selectedDays.map(d => d.dayOfWeek)
    return calculateNightsFromDays({ selectedDays: dayIndices })
  }, [selectedDays])

  // Calculate check-in/out using Logic Core
  const { checkInDay, checkOutDay, checkInName, checkOutName } = useMemo(() => {
    if (selectedDays.length === 0) {
      return {
        checkInDay: null,
        checkOutDay: null,
        checkInName: null,
        checkOutName: null
      }
    }
    const dayIndices = selectedDays.map(d => d.dayOfWeek)
    return calculateCheckInOutDays({ selectedDays: dayIndices })
  }, [selectedDays])

  // Check contiguity using Logic Core
  const isContiguous = useMemo(() => {
    if (selectedDays.length === 0) return false
    const dayIndices = selectedDays.map(d => d.dayOfWeek)
    return isScheduleContiguous({ selectedDayIndices: dayIndices })
  }, [selectedDays])

  // Calculate pricing (TODO: Migrate pricing to Logic Core)
  const selectedNights = useMemo(() => {
    return createNightsFromDays(selectedDays)
  }, [selectedDays])

  const priceBreakdown = useMemo(() => {
    return calculatePrice(selectedNights, listing, reservationSpan, zatConfig)
  }, [selectedNights, listing, reservationSpan, zatConfig])

  // Calculate unused nights (infrastructure)
  const notSelectedDays = useMemo(() => {
    return getNotSelectedDays(allDays, selectedDays)
  }, [allDays, selectedDays])

  const unusedNights = useMemo(() => {
    const allNights = createNightsFromDays(allDays)
    return getUnusedNights(allNights, selectedNights)
  }, [allDays, selectedNights])

  // ============================================================================
  // SCHEDULE STATE (Orchestrated data for parent components)
  // ============================================================================

  const scheduleState = useMemo(() => ({
    selectedDays,
    notSelectedDays,
    selectedNights,
    unusedNights,
    checkInDay: checkInDay !== null ? allDays.find(d => d.dayOfWeek === checkInDay) : null,
    checkOutDay: checkOutDay !== null ? allDays.find(d => d.dayOfWeek === checkOutDay) : null,
    checkInName,
    checkOutName,
    nightsCount,
    isContiguous,
    acceptableSchedule,
    recalculateState,
    fourWeekRent: priceBreakdown.fourWeekRent ? [priceBreakdown.fourWeekRent] : [],
    totalReservation: [priceBreakdown.totalPrice],
    listingMaximumNights: listing.maximumNights,
    limitToFiveNights
  }), [
    selectedDays,
    notSelectedDays,
    selectedNights,
    unusedNights,
    allDays,
    checkInDay,
    checkOutDay,
    checkInName,
    checkOutName,
    nightsCount,
    isContiguous,
    acceptableSchedule,
    recalculateState,
    priceBreakdown,
    listing.maximumNights,
    limitToFiveNights
  ])

  // ============================================================================
  // EFFECTS (Notify parent components)
  // ============================================================================

  useEffect(() => {
    onSelectionChange?.(selectedDays)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDays])

  useEffect(() => {
    onPriceChange?.(priceBreakdown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceBreakdown])

  useEffect(() => {
    onScheduleChange?.(scheduleState)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleState])

  // Check if schedule is acceptable
  useEffect(() => {
    const minNights = listing.minimumNights || 2
    const isAcceptable =
      selectedDays.length >= 2 &&
      isContiguous &&
      nightsCount >= minNights

    setAcceptableSchedule(isAcceptable)
  }, [selectedDays, isContiguous, nightsCount, listing.minimumNights])

  // ============================================================================
  // ACTIONS (User interactions)
  // ============================================================================

  const handleDaySelect = useCallback((day) => {
    if (!isClickable) return false

    // Simple validation logic (UI-level)
    const maxNights = limitToFiveNights ? 5 : listing.maximumNights

    // Check if already selected
    if (selectedDays.some(d => d.dayOfWeek === day.dayOfWeek)) {
      return false
    }

    // Check maximum
    if (maxNights && selectedDays.length >= maxNights) {
      if (!maxNightsWarningShown) {
        setErrorState({
          hasError: true,
          errorType: 'maximum_nights_warning',
          errorMessage: `Maximum ${maxNights} nights allowed`
        })
        setMaxNightsWarningShown(true)
        return false
      }
      // Allow after warning shown
    }

    // Check if day is available
    if (!day.isAvailable) {
      setErrorState({
        hasError: true,
        errorType: 'availability',
        errorMessage: 'This day is not available'
      })
      return false
    }

    // Add and sort
    const newSelection = sortDays([...selectedDays, day])

    // Check contiguity using Logic Core
    const newDayIndices = newSelection.map(d => d.dayOfWeek)
    const stillContiguous = isScheduleContiguous({ selectedDayIndices: newDayIndices })

    if (!stillContiguous && newSelection.length > 1) {
      setErrorState({
        hasError: true,
        errorType: 'contiguity',
        errorMessage: 'Days must be consecutive'
      })
      return false
    }

    setSelectedDays(newSelection)
    setErrorState({ hasError: false, errorType: null, errorMessage: '' })
    setRecalculateState(true)

    return true
  }, [selectedDays, listing.maximumNights, isClickable, limitToFiveNights, maxNightsWarningShown])

  const handleDayRemove = useCallback((day) => {
    if (!isClickable) return false

    const remainingDays = selectedDays.filter(d => d.dayOfWeek !== day.dayOfWeek)

    // Absolute minimum is 2 nights (3 days)
    const ABSOLUTE_MIN_NIGHTS = 2

    if (remainingDays.length - 1 < ABSOLUTE_MIN_NIGHTS) {
      setErrorState({
        hasError: true,
        errorType: 'absolute_minimum',
        errorMessage: `Minimum ${ABSOLUTE_MIN_NIGHTS} nights required`
      })
      return false
    }

    // Check host's minimum
    const minNights = listing.minimumNights || 2
    if (remainingDays.length - 1 < minNights) {
      if (!minNightsWarningShown) {
        setErrorState({
          hasError: true,
          errorType: 'minimum_nights_warning',
          errorMessage: `Host prefers at least ${minNights} nights`
        })
        setMinNightsWarningShown(true)
        return false
      }
      // Allow after warning shown
    }

    // Check contiguity after removal
    if (remainingDays.length > 1) {
      const remainingIndices = remainingDays.map(d => d.dayOfWeek)
      const stillContiguous = isScheduleContiguous({ selectedDayIndices: remainingIndices })

      if (!stillContiguous) {
        setErrorState({
          hasError: true,
          errorType: 'contiguity',
          errorMessage: 'Removal would create non-consecutive selection'
        })
        return false
      }
    }

    setSelectedDays(remainingDays)
    setErrorState({ hasError: false, errorType: null, errorMessage: '' })
    setRecalculateState(true)

    return true
  }, [selectedDays, listing.minimumNights, isClickable, minNightsWarningShown])

  const handleDayClick = useCallback((day) => {
    const isSelected = selectedDays.some(d => d.dayOfWeek === day.dayOfWeek)

    if (isSelected) {
      return handleDayRemove(day)
    } else {
      return handleDaySelect(day)
    }
  }, [selectedDays, handleDaySelect, handleDayRemove])

  const clearSelection = useCallback(() => {
    setSelectedDays([])
    setErrorState({ hasError: false, errorType: null, errorMessage: '' })
    setRecalculateState(true)
    setMaxNightsWarningShown(false)
    setMinNightsWarningShown(false)
  }, [])

  const clearError = useCallback(() => {
    setErrorState({ hasError: false, errorType: null, errorMessage: '' })
  }, [])

  // ============================================================================
  // RETURN API
  // ============================================================================

  return {
    // State (read-only for component)
    selectedDays,
    selectedNights,
    notSelectedDays,
    unusedNights,
    checkInDay: checkInDay !== null ? allDays.find(d => d.dayOfWeek === checkInDay) : null,
    checkOutDay: checkOutDay !== null ? allDays.find(d => d.dayOfWeek === checkOutDay) : null,
    checkInName,
    checkOutName,
    nightsCount,
    priceBreakdown,
    errorState,
    isClickable,
    isContiguous,
    acceptableSchedule,
    recalculateState,
    scheduleState,
    allDays,

    // Actions (for user interactions)
    handleDayClick,
    handleDaySelect,
    handleDayRemove,
    clearSelection,
    clearError,
    setIsClickable,
    setRecalculateState
  }
}
