import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  validateDaySelection,
  validateDayRemoval,
  isContiguous
} from '../../lib/scheduleSelector/validators.js';
import {
  calculateNightsFromDays,
  calculateCheckInCheckOut,
  countSelectedNights,
  calculateStartEndNightNumbers
} from '../../lib/scheduleSelector/nightCalculations.js';
import { calculatePrice } from '../../lib/scheduleSelector/priceCalculations.js';
import {
  sortDays,
  getNotSelectedDays,
  createAllDays,
  getUnusedNights,
  createNightsFromDays
} from '../../lib/scheduleSelector/dayHelpers.js';

/**
 * Custom hook for managing schedule selector state and logic
 */
export const useScheduleSelector = ({
  listing,
  initialSelectedDays = [],
  limitToFiveNights = false,
  reservationSpan = 13,
  zatConfig = null,
  onSelectionChange,
  onPriceChange,
  onScheduleChange
}) => {
  // Core selection state
  const [selectedDays, setSelectedDays] = useState(initialSelectedDays);
  const [errorState, setErrorState] = useState({
    hasError: false,
    errorType: null,
    errorMessage: ''
  });

  // Component state flags
  const [isClickable, setIsClickable] = useState(true);
  const [recalculateState, setRecalculateState] = useState(false);
  const [acceptableSchedule, setAcceptableSchedule] = useState(false);
  const [autobindListing, setAutobindListing] = useState(false);
  const [maxNightsWarningShown, setMaxNightsWarningShown] = useState(false);
  const [minNightsWarningShown, setMinNightsWarningShown] = useState(false);

  // Create all days based on listing availability
  const allDays = useMemo(() => {
    return createAllDays(listing.daysAvailable);
  }, [listing.daysAvailable]);

  // Calculate derived state using useMemo for performance
  const selectedNights = useMemo(() => {
    return calculateNightsFromDays(selectedDays);
  }, [selectedDays]);

  const notSelectedDays = useMemo(() => {
    return getNotSelectedDays(allDays, selectedDays);
  }, [allDays, selectedDays]);

  const { checkIn, checkOut } = useMemo(() => {
    return calculateCheckInCheckOut(selectedDays);
  }, [selectedDays]);

  const nightsCount = useMemo(() => {
    return countSelectedNights(selectedDays);
  }, [selectedDays]);

  const { startNightNumber, endNightNumber } = useMemo(() => {
    return calculateStartEndNightNumbers(selectedDays);
  }, [selectedDays]);

  const isSelectionContiguous = useMemo(() => {
    return isContiguous(selectedDays);
  }, [selectedDays]);

  // Calculate pricing
  const priceBreakdown = useMemo(() => {
    return calculatePrice(selectedNights, listing, reservationSpan, zatConfig);
  }, [selectedNights, listing, reservationSpan, zatConfig]);

  // Calculate unused nights
  const unusedNights = useMemo(() => {
    const allNights = createNightsFromDays(allDays);
    return getUnusedNights(allNights, selectedNights);
  }, [allDays, selectedNights]);

  // Create full schedule state
  const scheduleState = useMemo(() => ({
    selectedDays,
    notSelectedDays,
    selectedNights,
    unusedNights,
    selectedCheckinDays: selectedDays.filter((_, index) => index === 0),
    checkInDay: checkIn,
    checkOutDay: checkOut,
    startNight: startNightNumber,
    endNight: endNightNumber,
    startDayNumber: checkIn?.dayOfWeek ?? null,
    nightsCount,
    isContiguous: isSelectionContiguous,
    acceptableSchedule,
    autobindListing,
    limitToFiveNights,
    recalculateState,
    actualWeeksDaysAM: [],
    actualWeeksDaysPM: [],
    changeListings: [],
    changePricing: '',
    labels: [],
    listingNightlyN: [],
    monthly: [],
    priceMultiplier: [],
    numberOfMonths: null,
    otherReservation: [],
    proratedNights: [],
    reservationSpecificDays: [],
    guestDesiredUserDate: [],
    fourWeekRent: priceBreakdown.fourWeekRent ? [priceBreakdown.fourWeekRent] : [],
    totalReservation: [priceBreakdown.totalPrice],
    listingMaximumNights: listing.maximumNights
  }), [
    selectedDays,
    notSelectedDays,
    selectedNights,
    unusedNights,
    checkIn,
    checkOut,
    startNightNumber,
    endNightNumber,
    nightsCount,
    isSelectionContiguous,
    acceptableSchedule,
    autobindListing,
    limitToFiveNights,
    recalculateState,
    priceBreakdown,
    listing.maximumNights
  ]);

  // Notify parent components of changes
  useEffect(() => {
    onSelectionChange?.(selectedDays);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDays]);

  useEffect(() => {
    console.log('useEffect onPriceChange - priceBreakdown:', priceBreakdown);
    console.log('useEffect onPriceChange - callback exists:', !!onPriceChange);
    onPriceChange?.(priceBreakdown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceBreakdown]);

  useEffect(() => {
    onScheduleChange?.(scheduleState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleState]);

  // Handle day selection
  const handleDaySelect = useCallback((day) => {
    if (!isClickable) return false;

    // Apply limit to 5 nights if enabled
    const maxNights = limitToFiveNights ? 5 : listing.maximumNights;
    const listingWithLimit = { ...listing, maximumNights: maxNights };

    const validation = validateDaySelection(day, selectedDays, listingWithLimit);

    if (!validation.isValid) {
      // Check if this is a maximum nights error
      const isMaxNightsError = validation.error && validation.error.includes('Maximum');

      if (isMaxNightsError && !maxNightsWarningShown) {
        // Show warning once, then allow future selections
        setErrorState({
          hasError: true,
          errorType: 'maximum_nights_warning',
          errorMessage: validation.error || 'Cannot select this day'
        });
        setMaxNightsWarningShown(true);
        return false;
      } else if (isMaxNightsError && maxNightsWarningShown) {
        // Allow selection after warning has been shown
        const newSelection = sortDays([...selectedDays, day]);
        setSelectedDays(newSelection);
        setRecalculateState(true);
        return true;
      } else {
        // Other errors - show normally
        setErrorState({
          hasError: true,
          errorType: 'availability',
          errorMessage: validation.error || 'Cannot select this day'
        });
        return false;
      }
    }

    // Add and sort
    const newSelection = sortDays([...selectedDays, day]);
    setSelectedDays(newSelection);
    setErrorState({ hasError: false, errorType: null, errorMessage: '' });
    setRecalculateState(true);

    return true;
  }, [selectedDays, listing, isClickable, limitToFiveNights, maxNightsWarningShown]);

  // Handle day removal
  const handleDayRemove = useCallback((day) => {
    if (!isClickable) return false;

    const remainingDays = selectedDays.filter(d => d.dayOfWeek !== day.dayOfWeek);
    const remainingNights = remainingDays.length - 1;

    // Hardcoded absolute minimum is 2 nights (3 days)
    const ABSOLUTE_MIN_NIGHTS = 2;

    // Check absolute minimum first (always enforce)
    if (remainingNights < ABSOLUTE_MIN_NIGHTS) {
      setErrorState({
        hasError: true,
        errorType: 'absolute_minimum',
        errorMessage: `Minimum ${ABSOLUTE_MIN_NIGHTS} nights (${ABSOLUTE_MIN_NIGHTS + 1} days) required`
      });
      return false;
    }

    // Check host's minimum nights
    const validation = validateDayRemoval(day, selectedDays, listing.minimumNights);

    if (!validation.isValid) {
      const isMinNightsError = validation.error && validation.error.toLowerCase().includes('minimum');

      if (isMinNightsError && !minNightsWarningShown) {
        // Show warning once, then allow future removals
        setErrorState({
          hasError: true,
          errorType: 'minimum_nights_warning',
          errorMessage: validation.error || 'Cannot remove this day'
        });
        setMinNightsWarningShown(true);
        return false;
      } else if (isMinNightsError && minNightsWarningShown) {
        // Allow removal after warning has been shown (as long as above absolute minimum)
        const newSelection = selectedDays.filter(d => d.dayOfWeek !== day.dayOfWeek);
        setSelectedDays(newSelection);
        setRecalculateState(true);
        return true;
      } else {
        // Other errors (like contiguity) - show normally
        setErrorState({
          hasError: true,
          errorType: 'validation',
          errorMessage: validation.error || 'Cannot remove this day'
        });
        return false;
      }
    }

    const newSelection = selectedDays.filter(d => d.dayOfWeek !== day.dayOfWeek);
    setSelectedDays(newSelection);
    setErrorState({ hasError: false, errorType: null, errorMessage: '' });
    setRecalculateState(true);

    return true;
  }, [selectedDays, listing.minimumNights, isClickable, minNightsWarningShown]);

  // Handle day click (toggle selection)
  const handleDayClick = useCallback((day) => {
    const isSelected = selectedDays.some(d => d.dayOfWeek === day.dayOfWeek);

    if (isSelected) {
      return handleDayRemove(day);
    } else {
      return handleDaySelect(day);
    }
  }, [selectedDays, handleDaySelect, handleDayRemove]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedDays([]);
    setErrorState({ hasError: false, errorType: null, errorMessage: '' });
    setRecalculateState(true);
    setMaxNightsWarningShown(false);
    setMinNightsWarningShown(false);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setErrorState({ hasError: false, errorType: null, errorMessage: '' });
  }, []);

  // Set clickable state
  const setClickableState = useCallback((clickable) => {
    setIsClickable(clickable);
  }, []);

  // Check if schedule is acceptable
  useEffect(() => {
    const isAcceptable =
      selectedDays.length >= 2 &&
      isSelectionContiguous &&
      nightsCount >= listing.minimumNights;

    setAcceptableSchedule(isAcceptable);
  }, [selectedDays, isSelectionContiguous, nightsCount, listing.minimumNights]);

  return {
    // State
    selectedDays,
    selectedNights,
    notSelectedDays,
    unusedNights,
    checkInDay: checkIn,
    checkOutDay: checkOut,
    startNight: startNightNumber,
    endNight: endNightNumber,
    nightsCount,
    priceBreakdown,
    errorState,
    isClickable,
    isContiguous: isSelectionContiguous,
    acceptableSchedule,
    recalculateState,
    scheduleState,
    allDays,

    // Actions
    handleDayClick,
    handleDaySelect,
    handleDayRemove,
    clearSelection,
    clearError,
    setClickableState,
    setRecalculateState,
    setAutobindListing
  };
};
