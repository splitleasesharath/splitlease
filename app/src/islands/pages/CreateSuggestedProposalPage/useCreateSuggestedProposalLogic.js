/**
 * useCreateSuggestedProposalLogic
 *
 * All business logic for the Create Suggested Proposal page.
 * Follows the Four-Layer Logic Architecture.
 *
 * Day Indexing: Uses 0-indexed format (0=Sunday through 6=Saturday)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PROPOSAL_STATUSES } from '../../../logic/constants/proposalStatuses.js';
import { DAY_NAMES, getDayName } from '../../../lib/dayUtils.js';
import { calculateCheckInCheckOut } from '../../../lib/scheduleSelector/nightCalculations.js';
import {
  searchListings,
  getDefaultListings,
  searchGuests,
  getDefaultGuests,
  getListingPhotos,
  getUserProposalsForListing,
  createSuggestedProposal
} from './suggestedProposalService.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_STATUS = PROPOSAL_STATUSES.SUGGESTED_PROPOSAL_PENDING_CONFIRMATION.key;

const RESERVATION_SPAN_OPTIONS = [
  { value: '6', label: '6 weeks' },
  { value: '8', label: '8 weeks' },
  { value: '12', label: '12 weeks' },
  { value: '16', label: '16 weeks' },
  { value: '26', label: '26 weeks' },
  { value: '52', label: '52 weeks' },
  { value: 'custom', label: 'Other (specify weeks)' }
];

const MOVE_IN_RANGE_OPTIONS = [
  { value: 7, label: '1 week' },
  { value: 14, label: '2 weeks' },
  { value: 21, label: '3 weeks' },
  { value: 30, label: '1 month' }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get tomorrow's date as YYYY-MM-DD string
 */
function getTomorrowDateString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

/**
 * Debounce function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Calculate pricing based on listing and configuration
 * Uses simple calculation - integrate with pricing calculators for production
 */
function calculatePricing(listing, nightsPerWeek, weeks) {
  if (!listing || !nightsPerWeek || !weeks) {
    return null;
  }

  // Get nightly rate from listing (check various field names)
  const nightlyPrice =
    listing[`💰Nightly Host Rate for ${nightsPerWeek} nights`] ||
    listing['💰Nightly Host Rate for 4 nights'] ||
    listing['nightly price'] ||
    0;

  const cleaningFee = listing['💰Cleaning Cost / Maintenance Fee'] || 0;
  const damageDeposit = listing['💰Damage Deposit'] || 0;

  const totalNights = nightsPerWeek * weeks;
  const fourWeekRent = nightlyPrice * nightsPerWeek * 4;
  const reservationTotal = nightlyPrice * totalNights;
  const grandTotal = reservationTotal + cleaningFee;

  // Host compensation (85% is typical)
  const hostCompensation = grandTotal * 0.85;

  return {
    nightlyPrice,
    nightsPerWeek,
    numberOfWeeks: weeks,
    totalNights,
    fourWeekRent,
    cleaningFee,
    damageDeposit,
    reservationTotal,
    grandTotal,
    hostCompensation,
    initialPayment: fourWeekRent + damageDeposit
  };
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useCreateSuggestedProposalLogic() {
  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------

  // Step navigation
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 - Listing
  const [listingSearchTerm, setListingSearchTerm] = useState('');
  const [listingSearchResults, setListingSearchResults] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [listingPhotos, setListingPhotos] = useState([]);
  const [isSearchingListings, setIsSearchingListings] = useState(false);

  // Step 2 - Guest
  const [guestSearchTerm, setGuestSearchTerm] = useState('');
  const [guestSearchResults, setGuestSearchResults] = useState([]);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [existingProposalsCount, setExistingProposalsCount] = useState(0);
  const [isGuestConfirmed, setIsGuestConfirmed] = useState(false);
  const [isSearchingGuests, setIsSearchingGuests] = useState(false);

  // Step 3 - Guest Info
  const [aboutMe, setAboutMe] = useState('');
  const [needForSpace, setNeedForSpace] = useState('');
  const [specialNeeds, setSpecialNeeds] = useState('');

  // Step 3 - Configuration
  const [proposalStatus, setProposalStatus] = useState(DEFAULT_STATUS);
  const [moveInDate, setMoveInDate] = useState(getTomorrowDateString());
  const [moveInRange, setMoveInRange] = useState(14);
  const [strictMoveIn, setStrictMoveIn] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]); // 0-indexed integers
  const [reservationSpan, setReservationSpan] = useState('');
  const [customWeeks, setCustomWeeks] = useState(null);

  // UI State
  const [isCreating, setIsCreating] = useState(false);
  const [isConfirmationStep, setIsConfirmationStep] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [createdProposal, setCreatedProposal] = useState(null);
  const [createdThread, setCreatedThread] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // -------------------------------------------------------------------------
  // COMPUTED VALUES
  // -------------------------------------------------------------------------

  const nightsPerWeek = selectedDays.length;
  const nightsCount = Math.max(0, selectedDays.length - 1);

  // Calculate check-in/check-out using the same logic as ViewSplitLeasePage
  const { checkInDayIndex, checkOutDayIndex, checkInDayName, checkOutDayName } = useMemo(() => {
    if (selectedDays.length === 0) {
      return {
        checkInDayIndex: null,
        checkOutDayIndex: null,
        checkInDayName: null,
        checkOutDayName: null
      };
    }

    // Convert day indices to day objects for calculateCheckInCheckOut
    const dayObjects = selectedDays.map(dayIndex => ({
      dayOfWeek: dayIndex,
      name: DAY_NAMES[dayIndex]
    }));

    const { checkIn, checkOut } = calculateCheckInCheckOut(dayObjects);

    return {
      checkInDayIndex: checkIn?.dayOfWeek ?? null,
      checkOutDayIndex: checkOut?.dayOfWeek ?? null,
      checkInDayName: checkIn?.name ?? null,
      checkOutDayName: checkOut?.name ?? null
    };
  }, [selectedDays]);

  const reservationWeeks = useMemo(() => {
    if (reservationSpan === 'custom') {
      return parseInt(customWeeks) || 0;
    }
    return parseInt(reservationSpan) || 0;
  }, [reservationSpan, customWeeks]);

  const pricing = useMemo(() => {
    return calculatePricing(selectedListing, nightsPerWeek, reservationWeeks);
  }, [selectedListing, nightsPerWeek, reservationWeeks]);

  // -------------------------------------------------------------------------
  // VALIDATION
  // -------------------------------------------------------------------------

  useEffect(() => {
    const errors = [];

    if (currentStep >= 1 && !selectedListing) {
      errors.push('Please select a listing');
    }

    if (currentStep >= 2 && (!selectedGuest || !isGuestConfirmed)) {
      errors.push('Please select and confirm a guest');
    }

    if (currentStep >= 3) {
      if (!reservationSpan && !moveInDate) {
        errors.push('Fill out reservation span OR move-in date to proceed');
      }

      if (selectedDays.length < 3) {
        errors.push('Please select at least 3 days');
      }

      if (reservationSpan === 'custom') {
        const weeks = parseInt(customWeeks);
        if (!weeks || weeks < 6 || weeks > 52) {
          errors.push('Number of weeks must be between 6 and 52');
        }
      }

      if (pricing && pricing.grandTotal <= 0 && reservationSpan) {
        errors.push('Price calculation is invalid');
      }
    }

    setValidationErrors(errors);
  }, [
    currentStep,
    selectedListing,
    selectedGuest,
    isGuestConfirmed,
    reservationSpan,
    moveInDate,
    selectedDays,
    customWeeks,
    pricing
  ]);

  // -------------------------------------------------------------------------
  // LISTING SEARCH
  // -------------------------------------------------------------------------

  // Load default listings on mount
  useEffect(() => {
    const loadDefaults = async () => {
      setIsSearchingListings(true);
      try {
        const { data, error } = await getDefaultListings();
        if (error) {
          console.error('[CreateSuggestedProposal] Default listings error:', error);
        } else {
          setListingSearchResults(data || []);
        }
      } finally {
        setIsSearchingListings(false);
      }
    };
    loadDefaults();
  }, []);

  const debouncedListingSearch = useCallback(
    debounce(async (term) => {
      setIsSearchingListings(true);
      try {
        // Empty search = show defaults with valid pricing
        if (term.length === 0) {
          const { data, error } = await getDefaultListings();
          if (error) {
            console.error('[CreateSuggestedProposal] Default listings error:', error);
            setListingSearchResults([]);
          } else {
            setListingSearchResults(data || []);
          }
        } else {
          // Search by term
          const { data, error } = await searchListings(term);
          if (error) {
            console.error('[CreateSuggestedProposal] Listing search error:', error);
            setListingSearchResults([]);
          } else {
            setListingSearchResults(data || []);
          }
        }
      } finally {
        setIsSearchingListings(false);
      }
    }, 300),
    []
  );

  const handleListingSearchChange = useCallback((e) => {
    const term = e.target.value;
    setListingSearchTerm(term);
    debouncedListingSearch(term);
  }, [debouncedListingSearch]);

  // Handler for when listing search box receives focus
  const handleListingSearchFocus = useCallback(async () => {
    if (listingSearchResults.length === 0 && !selectedListing) {
      setIsSearchingListings(true);
      try {
        const { data, error } = await getDefaultListings();
        if (!error) {
          setListingSearchResults(data || []);
        }
      } finally {
        setIsSearchingListings(false);
      }
    }
  }, [listingSearchResults.length, selectedListing]);

  const handleListingSelect = useCallback(async (listing) => {
    setSelectedListing(listing);
    setListingSearchTerm('');
    setListingSearchResults([]);

    // Fetch photos
    const { data: photos } = await getListingPhotos(listing._id);
    setListingPhotos(photos || []);

    // Move to step 2
    setCurrentStep(2);
  }, []);

  const handleListingClear = useCallback(() => {
    setSelectedListing(null);
    setListingPhotos([]);
    setCurrentStep(1);
    // Also reset guest selection
    setSelectedGuest(null);
    setIsGuestConfirmed(false);
    setExistingProposalsCount(0);
  }, []);

  const handleClearListingSearch = useCallback(() => {
    setListingSearchTerm('');
    setListingSearchResults([]);
  }, []);

  // -------------------------------------------------------------------------
  // GUEST SEARCH
  // -------------------------------------------------------------------------

  // Load default guests when step 2 becomes active
  useEffect(() => {
    if (currentStep === 2 && guestSearchResults.length === 0 && !selectedGuest) {
      const loadDefaults = async () => {
        setIsSearchingGuests(true);
        try {
          const { data, error } = await getDefaultGuests();
          if (error) {
            console.error('[CreateSuggestedProposal] Default guests error:', error);
          } else {
            setGuestSearchResults(data || []);
          }
        } finally {
          setIsSearchingGuests(false);
        }
      };
      loadDefaults();
    }
  }, [currentStep, guestSearchResults.length, selectedGuest]);

  const debouncedGuestSearch = useCallback(
    debounce(async (term) => {
      setIsSearchingGuests(true);
      try {
        // Empty search = show default guest list
        if (term.length === 0) {
          const { data, error } = await getDefaultGuests();
          if (error) {
            console.error('[CreateSuggestedProposal] Default guests error:', error);
            setGuestSearchResults([]);
          } else {
            setGuestSearchResults(data || []);
          }
        } else {
          // Search by term (already filtered to guests only)
          const { data, error } = await searchGuests(term);
          if (error) {
            console.error('[CreateSuggestedProposal] Guest search error:', error);
            setGuestSearchResults([]);
          } else {
            setGuestSearchResults(data || []);
          }
        }
      } finally {
        setIsSearchingGuests(false);
      }
    }, 300),
    []
  );

  const handleGuestSearchChange = useCallback((e) => {
    const term = e.target.value;
    setGuestSearchTerm(term);
    debouncedGuestSearch(term);
  }, [debouncedGuestSearch]);

  // Handler for when guest search box receives focus
  const handleGuestSearchFocus = useCallback(async () => {
    if (guestSearchResults.length === 0 && !selectedGuest) {
      setIsSearchingGuests(true);
      try {
        const { data, error } = await getDefaultGuests();
        if (!error) {
          setGuestSearchResults(data || []);
        }
      } finally {
        setIsSearchingGuests(false);
      }
    }
  }, [guestSearchResults.length, selectedGuest]);

  const handleGuestSelect = useCallback(async (guest) => {
    setSelectedGuest(guest);
    setGuestSearchTerm('');
    setGuestSearchResults([]);
    setIsGuestConfirmed(false);

    // Check for existing proposals
    if (selectedListing) {
      const { data } = await getUserProposalsForListing(guest._id, selectedListing._id);
      setExistingProposalsCount(data?.length || 0);
    }

    // Pre-fill about me if available
    if (guest['About Me / Bio']) {
      setAboutMe(guest['About Me / Bio']);
    }
  }, [selectedListing]);

  const handleGuestConfirm = useCallback(() => {
    setIsGuestConfirmed(true);
    setCurrentStep(3);
  }, []);

  const handleGuestClear = useCallback(() => {
    setSelectedGuest(null);
    setIsGuestConfirmed(false);
    setExistingProposalsCount(0);
    setCurrentStep(2);
    // Reset step 3 fields
    setAboutMe('');
    setNeedForSpace('');
    setSpecialNeeds('');
  }, []);

  const handleClearGuestSearch = useCallback(() => {
    setGuestSearchTerm('');
    setGuestSearchResults([]);
  }, []);

  // -------------------------------------------------------------------------
  // GUEST INFO HANDLERS
  // -------------------------------------------------------------------------

  const handleAboutMeChange = useCallback((e) => {
    setAboutMe(e.target.value);
  }, []);

  const handleNeedForSpaceChange = useCallback((e) => {
    setNeedForSpace(e.target.value);
  }, []);

  const handleSpecialNeedsChange = useCallback((e) => {
    setSpecialNeeds(e.target.value);
  }, []);

  // -------------------------------------------------------------------------
  // CONFIGURATION HANDLERS
  // -------------------------------------------------------------------------

  const handleStatusChange = useCallback((e) => {
    setProposalStatus(e.target.value);
  }, []);

  const handleMoveInDateChange = useCallback((e) => {
    setMoveInDate(e.target.value);
  }, []);

  const handleMoveInRangeChange = useCallback((e) => {
    setMoveInRange(parseInt(e.target.value));
  }, []);

  const handleStrictMoveInChange = useCallback((e) => {
    setStrictMoveIn(e.target.checked);
  }, []);

  const handleDayToggle = useCallback((dayIndex) => {
    setSelectedDays(prev => {
      if (prev.includes(dayIndex)) {
        return prev.filter(d => d !== dayIndex);
      } else {
        return [...prev, dayIndex].sort((a, b) => a - b);
      }
    });
  }, []);

  const handleSelectFullTime = useCallback(() => {
    // Select all days (0-6)
    setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
  }, []);

  const handleReservationSpanChange = useCallback((e) => {
    setReservationSpan(e.target.value);
    if (e.target.value !== 'custom') {
      setCustomWeeks(null);
    }
  }, []);

  const handleCustomWeeksChange = useCallback((e) => {
    setCustomWeeks(e.target.value);
  }, []);

  // -------------------------------------------------------------------------
  // NAVIGATION
  // -------------------------------------------------------------------------

  const handleGoBack = useCallback(() => {
    if (isGuestConfirmed) {
      setIsGuestConfirmed(false);
      setCurrentStep(2);
    }
    setIsConfirmationStep(false);
  }, [isGuestConfirmed]);

  // -------------------------------------------------------------------------
  // SUBMISSION
  // -------------------------------------------------------------------------

  const handleFirstCreateClick = useCallback(() => {
    if (validationErrors.length > 0) return;
    setIsConfirmationStep(true);
  }, [validationErrors]);

  const handleCancelConfirmation = useCallback(() => {
    setIsConfirmationStep(false);
  }, []);

  const handleConfirmProposal = useCallback(async () => {
    if (validationErrors.length > 0 || isCreating) return;

    setIsCreating(true);

    try {
      const moveInDateObj = new Date(moveInDate);
      const moveInEndObj = new Date(moveInDateObj);
      moveInEndObj.setDate(moveInEndObj.getDate() + moveInRange);

      const proposalData = {
        // References
        listingId: selectedListing._id,
        guestId: selectedGuest._id,
        guestEmail: selectedGuest.email,
        hostUserId: selectedListing['Host User'],
        hostEmail: selectedListing['Host email'],

        // Status
        status: proposalStatus,

        // Dates
        moveInStart: moveInDateObj.toISOString(),
        moveInEnd: moveInEndObj.toISOString(),

        // Schedule (0-indexed days)
        daysSelected: selectedDays,
        checkInDayIndex,
        checkOutDayIndex,
        nightsPerWeek: selectedDays.length,

        // Reservation
        reservationSpan: reservationSpan === 'custom' ? `${customWeeks} weeks` : `${reservationSpan} weeks`,
        reservationWeeks,
        rentalType: selectedListing['rental type'],

        // Pricing
        fourWeekRent: pricing?.fourWeekRent || 0,
        totalPrice: pricing?.grandTotal || 0,
        hostCompensation: pricing?.hostCompensation || 0,
        cleaningFee: pricing?.cleaningFee || 0,
        damageDeposit: pricing?.damageDeposit || 0,
        nightlyPrice: pricing?.nightlyPrice || 0,

        // User Info
        aboutMe,
        needForSpace,
        specialNeeds
      };

      const { data, error } = await createSuggestedProposal(proposalData);

      if (error) {
        throw new Error(error);
      }

      setCreatedProposal(data.proposal);
      setCreatedThread(data.thread);
      setShowSuccessModal(true);
      setIsConfirmationStep(false);

    } catch (error) {
      console.error('[CreateSuggestedProposal] Creation error:', error);
      setValidationErrors([`Failed to create proposal: ${error.message}`]);
    } finally {
      setIsCreating(false);
    }
  }, [
    validationErrors,
    isCreating,
    selectedListing,
    selectedGuest,
    proposalStatus,
    moveInDate,
    moveInRange,
    selectedDays,
    checkInDayIndex,
    checkOutDayIndex,
    reservationSpan,
    customWeeks,
    reservationWeeks,
    pricing,
    aboutMe,
    needForSpace,
    specialNeeds
  ]);

  // -------------------------------------------------------------------------
  // SUCCESS MODAL
  // -------------------------------------------------------------------------

  const handleCreateAnother = useCallback(() => {
    // Reset all state
    setCurrentStep(1);
    setListingSearchTerm('');
    setListingSearchResults([]);
    setSelectedListing(null);
    setListingPhotos([]);
    setGuestSearchTerm('');
    setGuestSearchResults([]);
    setSelectedGuest(null);
    setExistingProposalsCount(0);
    setIsGuestConfirmed(false);
    setAboutMe('');
    setNeedForSpace('');
    setSpecialNeeds('');
    setProposalStatus(DEFAULT_STATUS);
    setMoveInDate(getTomorrowDateString());
    setMoveInRange(14);
    setStrictMoveIn(false);
    setSelectedDays([]);
    setReservationSpan('');
    setCustomWeeks(null);
    setIsConfirmationStep(false);
    setCreatedProposal(null);
    setCreatedThread(null);
    setShowSuccessModal(false);
  }, []);

  const handleCloseSuccessModal = useCallback(() => {
    setShowSuccessModal(false);
  }, []);

  // -------------------------------------------------------------------------
  // RETURN
  // -------------------------------------------------------------------------

  return {
    // Step state
    currentStep,

    // Step 1 - Listing
    listingSearchTerm,
    listingSearchResults,
    selectedListing,
    listingPhotos,
    isSearchingListings,

    // Step 2 - Guest
    guestSearchTerm,
    guestSearchResults,
    selectedGuest,
    existingProposalsCount,
    isGuestConfirmed,
    isSearchingGuests,

    // Step 3 - Guest Info
    aboutMe,
    needForSpace,
    specialNeeds,

    // Step 3 - Configuration
    proposalStatus,
    moveInDate,
    moveInRange,
    strictMoveIn,
    selectedDays,
    reservationSpan,
    customWeeks,

    // Computed (from selected days)
    checkInDayIndex,
    checkOutDayIndex,
    checkInDayName,
    checkOutDayName,
    nightsCount,
    pricing,

    // UI State
    isCreating,
    isConfirmationStep,
    validationErrors,
    createdProposal,
    createdThread,
    showSuccessModal,

    // Constants for components
    RESERVATION_SPAN_OPTIONS,
    MOVE_IN_RANGE_OPTIONS,
    DAY_NAMES,

    // Handlers - Navigation
    handleGoBack,

    // Handlers - Listing Search
    handleListingSearchChange,
    handleListingSearchFocus,
    handleListingSelect,
    handleListingClear,
    handleClearListingSearch,

    // Handlers - Guest Search
    handleGuestSearchChange,
    handleGuestSearchFocus,
    handleGuestSelect,
    handleGuestConfirm,
    handleGuestClear,
    handleClearGuestSearch,

    // Handlers - Guest Info
    handleAboutMeChange,
    handleNeedForSpaceChange,
    handleSpecialNeedsChange,

    // Handlers - Configuration
    handleStatusChange,
    handleMoveInDateChange,
    handleMoveInRangeChange,
    handleStrictMoveInChange,
    handleDayToggle,
    handleSelectFullTime,
    handleReservationSpanChange,
    handleCustomWeeksChange,

    // Handlers - Submission
    handleFirstCreateClick,
    handleConfirmProposal,
    handleCancelConfirmation,

    // Handlers - Success Modal
    handleCreateAnother,
    handleCloseSuccessModal
  };
}
