/**
 * CreateProposalFlowV2 - Shared Island Component
 * Complete proposal creation flow with user details, move-in, and days selection
 * Architecture: ESM + React Islands pattern
 *
 * This component embeds ListingScheduleSelector to handle ALL pricing calculations.
 * No price calculations should happen outside of ListingScheduleSelector.
 */

import { useState, useEffect, useMemo } from 'react';
import ReviewSection from './CreateProposalFlowV2Components/ReviewSection.jsx';
import UserDetailsSection from './CreateProposalFlowV2Components/UserDetailsSection.jsx';
import MoveInSection from './CreateProposalFlowV2Components/MoveInSection.jsx';
import DaysSelectionSection from './CreateProposalFlowV2Components/DaysSelectionSection.jsx';
import { calculatePrice } from '../../lib/scheduleSelector/priceCalculations.js';
import { calculateNightsFromDays } from '../../lib/scheduleSelector/nightCalculations.js';
import '../../styles/create-proposal-flow-v2.css';

// Day name constants for check-in/check-out calculation
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Flow order constants for step navigation
// Section IDs: 1 = Review, 2 = User Details, 3 = Move-in, 4 = Days Selection

// FULL flow (for pages where days/move-in NOT pre-selected, e.g., FavoriteListingsPage):
// User Details -> Move-in (reservation span) -> Days -> Review
// Move-in comes before Days so reservation span is set for accurate price calculations
const FULL_FIRST_PROPOSAL_FLOW = [2, 3, 4, 1];

// SHORT flow (for pages where days/move-in ARE pre-selected, e.g., ViewSplitLeasePage):
// User Details -> Review
const SHORT_FIRST_PROPOSAL_FLOW = [2, 1];

// Returning users start at Review and can edit any section (hub-and-spoke model)
const RETURNING_USER_START = 1;

/**
 * Custom hook to lock body scroll when a modal/popup is open
 * Prevents background content from scrolling when popup is visible
 */
const useBodyScrollLock = () => {
  useEffect(() => {
    // Save original body overflow style
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Lock body scroll
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Cleanup: restore original styles when component unmounts
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);
};

// localStorage key prefix for proposal draft data
const PROPOSAL_DRAFT_KEY_PREFIX = 'splitlease_proposal_draft_';

/**
 * Get saved proposal draft from localStorage
 * @param {string} listingId - The listing ID
 * @returns {Object|null} Saved user details or null
 */
const getSavedProposalDraft = (listingId) => {
  if (!listingId) return null;
  try {
    const saved = localStorage.getItem(`${PROPOSAL_DRAFT_KEY_PREFIX}${listingId}`);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.warn('Failed to load proposal draft:', e);
    return null;
  }
};

/**
 * Save proposal draft to localStorage
 * @param {string} listingId - The listing ID
 * @param {Object} data - User details to save
 */
const saveProposalDraft = (listingId, data) => {
  if (!listingId) return;
  try {
    localStorage.setItem(`${PROPOSAL_DRAFT_KEY_PREFIX}${listingId}`, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save proposal draft:', e);
  }
};

/**
 * Clear proposal draft from localStorage
 * @param {string} listingId - The listing ID
 */
const clearProposalDraft = (listingId) => {
  if (!listingId) return;
  try {
    localStorage.removeItem(`${PROPOSAL_DRAFT_KEY_PREFIX}${listingId}`);
  } catch (e) {
    console.warn('Failed to clear proposal draft:', e);
  }
};

/**
 * CreateProposalFlowV2 Component
 * @param {Object} listing - The listing object
 * @param {string} moveInDate - Pre-selected move-in date from parent
 * @param {Array} daysSelected - Array of selected day objects from ListingScheduleSelector (INITIAL ONLY)
 * @param {number} nightsSelected - Number of nights selected (INITIAL ONLY)
 * @param {number} reservationSpan - Number of weeks for reservation
 * @param {Object} pricingBreakdown - Pricing breakdown from parent (INITIAL ONLY)
 * @param {Object} zatConfig - ZAT price configuration object
 * @param {boolean} isFirstProposal - Whether this is the user's first proposal (true = first, false = subsequent)
 * @param {boolean} useFullFlow - Whether to use full sequential flow (days + move-in steps). Default false = short flow (User Info -> Review)
 * @param {Object} existingUserData - User's saved profile data for prefilling (aboutMe, needForSpace, specialNeeds)
 * @param {Function} onClose - Callback when modal closes
 * @param {Function} onSubmit - Callback when proposal is submitted
 */
export default function CreateProposalFlowV2({
  listing,
  moveInDate,
  daysSelected = [],
  nightsSelected = 0,
  reservationSpan = 13,
  pricingBreakdown = null,
  zatConfig = null,
  isFirstProposal = true,
  useFullFlow = false,
  existingUserData = null,
  onClose,
  onSubmit
}) {
  // Lock body scroll when popup is open
  useBodyScrollLock();

  // Get listing ID for localStorage key
  const listingId = listing?._id;

  // Load saved draft from localStorage on mount
  const savedDraft = getSavedProposalDraft(listingId);
  const hasSavedDraft = savedDraft && (savedDraft.needForSpace || savedDraft.aboutYourself);

  // Determine which flow to use based on useFullFlow and isFirstProposal
  // - useFullFlow=true (FavoriteListingsPage): ALWAYS use full flow for ALL users
  //   User Details -> Days -> Move-in -> Review (ignores isFirstProposal)
  // - useFullFlow=false (ViewSplitLeasePage):
  //   - First proposal: User Details -> Review (short flow)
  //   - Returning user: Start on Review (hub-and-spoke)
  const activeFlow = useFullFlow ? FULL_FIRST_PROPOSAL_FLOW : SHORT_FIRST_PROPOSAL_FLOW;

  // Determine if we should use sequential flow
  // - useFullFlow=true: ALWAYS sequential (for FavoriteListingsPage)
  // - useFullFlow=false: Only sequential for first-time users (for ViewSplitLeasePage)
  const useSequentialFlow = useFullFlow || isFirstProposal;

  const [currentSection, setCurrentSection] = useState(
    useSequentialFlow ? activeFlow[0] : RETURNING_USER_START
  );

  // Track position in the flow for sequential navigation (0 = first step, 1 = second step, etc.)
  const [flowStepIndex, setFlowStepIndex] = useState(0);

  // Track if we're editing from Review (hub-and-spoke pattern)
  // When true, "Next" returns directly to Review instead of continuing sequence
  const [isEditingFromReview, setIsEditingFromReview] = useState(false);

  // Internal state for pricing (managed by ListingScheduleSelector in DaysSelectionSection)
  const [internalPricingBreakdown, setInternalPricingBreakdown] = useState(pricingBreakdown);
  const [internalDaysSelected, setInternalDaysSelected] = useState(daysSelected);
  const [internalNightsSelected, setInternalNightsSelected] = useState(nightsSelected);

  // Log initial data received from parent
  useEffect(() => {
    console.log('📋 CreateProposalFlowV2 initialized with data from View page:', {
      moveInDate,
      daysSelected,
      nightsSelected,
      reservationSpan,
      isFirstProposal,
      hasExistingUserData: !!(existingUserData?.needForSpace || existingUserData?.aboutYourself),
      pricingBreakdown: {
        pricePerNight: pricingBreakdown?.pricePerNight,
        fourWeekRent: pricingBreakdown?.fourWeekRent,
        reservationTotal: pricingBreakdown?.reservationTotal,
        valid: pricingBreakdown?.valid
      }
    });

    // Debug: Log the exact isFirstProposal value and type
    console.log('🔍 isFirstProposal debug:', {
      value: isFirstProposal,
      type: typeof isFirstProposal,
      strictEquals0: isFirstProposal === 0,
      strictEqualsTrue: isFirstProposal === true,
      strictEqualsFalse: isFirstProposal === false
    });

    if (hasSavedDraft) {
      console.log('📂 Loaded saved proposal draft from localStorage:', savedDraft);
    }

    if (existingUserData) {
      console.log('👤 User profile data available for prefilling:', {
        needForSpace: existingUserData.needForSpace ? 'present' : 'empty',
        aboutYourself: existingUserData.aboutYourself ? 'present' : 'empty',
        hasUniqueRequirements: existingUserData.hasUniqueRequirements
      });
    }

    console.log(`📍 Starting flow: ${useSequentialFlow
      ? `Sequential flow (${useFullFlow ? 'full' : 'short'}) [${activeFlow.join(' -> ')}], starting at step 1 (section ${activeFlow[0]})`
      : '1 (Review - returning user, hub-and-spoke model)'
    }`);
  }, []);

  // Convert day objects to day names for compatibility
  const dayObjectsToNames = (dayObjects) => {
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayObjects.map(dayObj => dayMap[dayObj.dayOfWeek]);
  };

  const dayNamesToObjects = (dayNames) => {
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames.map(name => {
      const dayOfWeek = dayMap.indexOf(name);
      return {
        id: `day-${dayOfWeek}`,
        dayOfWeek,
        name,
        abbreviation: name.substring(0, 3),
        isSelected: true
      };
    });
  };

  // Calculate check-in and check-out days from selected days
  // Check-in = first selected day, Check-out = last selected day (NOT day after)
  // This matches the ListingScheduleSelector behavior on ViewSplitLeasePage
  const calculateCheckInCheckOut = (dayObjs) => {
    if (!dayObjs || dayObjs.length === 0) return { checkIn: 'Monday', checkOut: 'Friday' };

    // Sort day objects by dayOfWeek
    const sorted = [...dayObjs].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    const dayNumbers = sorted.map(d => d.dayOfWeek);

    // Check for wrap-around case (both Saturday and Sunday present)
    const hasSaturday = dayNumbers.includes(6);
    const hasSunday = dayNumbers.includes(0);

    if (hasSaturday && hasSunday && dayObjs.length < 7) {
      // Find the gap in the selection to determine wrap-around
      let gapIndex = -1;
      for (let i = 0; i < dayNumbers.length - 1; i++) {
        if (dayNumbers[i + 1] - dayNumbers[i] > 1) {
          gapIndex = i + 1;
          break;
        }
      }

      if (gapIndex !== -1) {
        // Wrap-around case: check-in is the first day after the gap
        // check-out is the last day before the gap
        const checkInDayNumber = dayNumbers[gapIndex];
        const checkOutDayNumber = dayNumbers[gapIndex - 1];
        return {
          checkIn: DAY_NAMES[checkInDayNumber],
          checkOut: DAY_NAMES[checkOutDayNumber]
        };
      }
    }

    // Standard case: check-in = first day, check-out = last selected day
    const checkInDayNumber = dayNumbers[0];
    const checkOutDayNumber = dayNumbers[dayNumbers.length - 1];

    return {
      checkIn: DAY_NAMES[checkInDayNumber],
      checkOut: DAY_NAMES[checkOutDayNumber]
    };
  };

  const { checkIn: initialCheckIn, checkOut: initialCheckOut } = calculateCheckInCheckOut(daysSelected);

  // Calculate first 4 weeks total from pricing breakdown
  const calculateFirstFourWeeks = (breakdown) => {
    const fourWeekRent = breakdown?.fourWeekRent || 0;
    const damageDeposit = listing?.['💰Damage Deposit'] || 0;
    const maintenanceFee = listing?.['💰Cleaning Cost / Maintenance Fee'] || 0;
    return fourWeekRent + damageDeposit + maintenanceFee;
  };

  // Merge existing user data with saved draft (props take priority over localStorage)
  const mergedUserData = {
    needForSpace: existingUserData?.needForSpace || savedDraft?.needForSpace || '',
    aboutYourself: existingUserData?.aboutYourself || savedDraft?.aboutYourself || '',
    hasUniqueRequirements: existingUserData?.hasUniqueRequirements ?? savedDraft?.hasUniqueRequirements ?? false,
    uniqueRequirements: existingUserData?.uniqueRequirements || savedDraft?.uniqueRequirements || ''
  };

  const [proposalData, setProposalData] = useState({
    // Pre-filled from listing page
    moveInDate: moveInDate || '',
    daysSelected: dayObjectsToNames(daysSelected),
    reservationSpan: reservationSpan || 13,
    checkInDay: initialCheckIn,
    checkOutDay: initialCheckOut,

    // User information (pre-filled from props or localStorage draft)
    needForSpace: mergedUserData.needForSpace,
    aboutYourself: mergedUserData.aboutYourself,
    hasUniqueRequirements: mergedUserData.hasUniqueRequirements,
    uniqueRequirements: mergedUserData.uniqueRequirements,

    // Optional move-in flexibility
    moveInRange: '',

    // Pricing (ONLY from ListingScheduleSelector - initialized from parent)
    pricePerNight: pricingBreakdown?.pricePerNight || 0,
    numberOfNights: nightsSelected * reservationSpan,
    totalPrice: pricingBreakdown?.reservationTotal || 0,
    pricePerFourWeeks: pricingBreakdown?.fourWeekRent || 0,
    damageDeposit: listing?.['💰Damage Deposit'] || 0,
    maintenanceFee: listing?.['💰Cleaning Cost / Maintenance Fee'] || 0,
    firstFourWeeksTotal: calculateFirstFourWeeks(pricingBreakdown),

    // Listing reference
    listingId: listing?._id,
    listingAddress: listing?.Name || listing?.address
  });

  // Update pricing when internal pricing breakdown changes (from ListingScheduleSelector)
  useEffect(() => {
    if (internalPricingBreakdown && internalPricingBreakdown.valid) {
      console.log('💰 Updating proposal data with pricing from ListingScheduleSelector:', internalPricingBreakdown);

      // Calculate derived values
      const nightsPerWeek = internalDaysSelected.length - 1; // nights = days - 1
      const totalNights = nightsPerWeek * proposalData.reservationSpan;
      const firstFourWeeksTotal = calculateFirstFourWeeks(internalPricingBreakdown);

      setProposalData(prev => ({
        ...prev,
        pricePerNight: internalPricingBreakdown.pricePerNight,
        pricePerFourWeeks: internalPricingBreakdown.fourWeekRent,
        totalPrice: internalPricingBreakdown.reservationTotal,
        numberOfNights: totalNights,
        firstFourWeeksTotal: firstFourWeeksTotal
      }));
    }
  }, [internalPricingBreakdown, internalDaysSelected, proposalData.reservationSpan]);

  // Save user details to localStorage when they change
  useEffect(() => {
    if (!listingId) return;

    const userDetailsToSave = {
      needForSpace: proposalData.needForSpace,
      aboutYourself: proposalData.aboutYourself,
      hasUniqueRequirements: proposalData.hasUniqueRequirements,
      uniqueRequirements: proposalData.uniqueRequirements
    };

    // Only save if there's actual content to save
    if (userDetailsToSave.needForSpace || userDetailsToSave.aboutYourself) {
      saveProposalDraft(listingId, userDetailsToSave);
      console.log('💾 Saved proposal draft to localStorage');
    }
  }, [
    listingId,
    proposalData.needForSpace,
    proposalData.aboutYourself,
    proposalData.hasUniqueRequirements,
    proposalData.uniqueRequirements
  ]);

  // Prepare listing data for price calculation (same structure as DaysSelectionSection)
  const pricingListing = useMemo(() => {
    if (!listing) return null;
    return {
      id: listing._id,
      minimumNights: listing['Minimum Nights'] || 2,
      maximumNights: listing['Maximum Nights'] || 7,
      'rental type': listing['rental type'] || 'Nightly',
      'Weeks offered': listing['Weeks offered'] || 'Every week',
      '💰Unit Markup': listing['💰Unit Markup'] || 0,
      '💰Nightly Host Rate for 2 nights': listing['💰Nightly Host Rate for 2 nights'],
      '💰Nightly Host Rate for 3 nights': listing['💰Nightly Host Rate for 3 nights'],
      '💰Nightly Host Rate for 4 nights': listing['💰Nightly Host Rate for 4 nights'],
      '💰Nightly Host Rate for 5 nights': listing['💰Nightly Host Rate for 5 nights'],
      '💰Nightly Host Rate for 7 nights': listing['💰Nightly Host Rate for 7 nights'],
      '💰Weekly Host Rate': listing['💰Weekly Host Rate'],
      '💰Monthly Host Rate': listing['💰Monthly Host Rate'],
      '💰Price Override': listing['💰Price Override'],
      '💰Cleaning Cost / Maintenance Fee': listing['💰Cleaning Cost / Maintenance Fee'],
      '💰Damage Deposit': listing['💰Damage Deposit']
    };
  }, [listing]);

  // Recalculate prices when reservationSpan changes (mirrors main page behavior)
  useEffect(() => {
    // Skip if no days selected or no listing data
    if (!internalDaysSelected || internalDaysSelected.length < 2 || !pricingListing) {
      return;
    }

    console.log('📊 Recalculating prices due to reservationSpan change:', proposalData.reservationSpan);

    // Calculate nights from selected days
    const selectedNights = calculateNightsFromDays(internalDaysSelected);

    if (selectedNights.length === 0) {
      return;
    }

    // Recalculate pricing with new reservation span
    const newPriceBreakdown = calculatePrice(
      selectedNights,
      pricingListing,
      proposalData.reservationSpan,
      zatConfig
    );

    console.log('💰 New price breakdown after reservationSpan change:', newPriceBreakdown);

    // Update internal pricing state (this triggers the existing useEffect to update proposalData)
    setInternalPricingBreakdown(newPriceBreakdown);
  }, [proposalData.reservationSpan, pricingListing, zatConfig]);

  const updateProposalData = (field, value) => {
    // Handle full pricing breakdown object from DaysSelectionSection
    if (field === 'pricingBreakdown' && value && typeof value === 'object') {
      console.log('💰 Received full pricing breakdown from DaysSelectionSection:', value);
      setInternalPricingBreakdown(value);
      return;
    }

    // Handle special cases for pricing fields - these should come from ListingScheduleSelector
    if (field === 'pricePerNight' || field === 'pricePerFourWeeks' || field === 'totalPrice') {
      // Update both internal state and proposal data for pricing fields
      console.log(`💰 Pricing field '${field}' updated to:`, value);

      // If we receive a full pricing breakdown, update internal state
      if (field === 'pricePerNight' && typeof value === 'object') {
        setInternalPricingBreakdown(value);
        return;
      }
    }

    // Handle days selection updates
    if (field === 'daysSelected' && Array.isArray(value)) {
      // value is an array of day names, convert to objects
      const dayObjs = dayNamesToObjects(value);
      setInternalDaysSelected(dayObjs);
      setInternalNightsSelected(value.length - 1);

      // Recalculate check-in/check-out
      const { checkIn, checkOut } = calculateCheckInCheckOut(dayObjs);
      setProposalData(prev => ({
        ...prev,
        daysSelected: value,
        checkInDay: checkIn,
        checkOutDay: checkOut
      }));
      return;
    }

    setProposalData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Edit handlers - take user to specific section from Review
  // Sets isEditingFromReview flag so "Next" returns directly to Review (hub-and-spoke pattern)
  const handleEditUserDetails = () => {
    setCurrentSection(2);
    setIsEditingFromReview(true);
    console.log('📝 Edit: Jumping to User Details (section 2) from Review');
  };

  const handleEditMoveIn = () => {
    setCurrentSection(3);
    setIsEditingFromReview(true);
    console.log('📝 Edit: Jumping to Move-in (section 3) from Review');
  };

  const handleEditDays = () => {
    setCurrentSection(4);
    setIsEditingFromReview(true);
    console.log('📝 Edit: Jumping to Days Selection (section 4) from Review');
  };

  // Navigation - handles both sequential flow and hub-and-spoke editing from Review
  const handleNext = () => {
    if (!validateCurrentSection()) return;

    // If we're editing from Review (hub-and-spoke), return directly to Review
    if (isEditingFromReview) {
      setCurrentSection(1);
      setIsEditingFromReview(false);
      // Also update flowStepIndex to point to Review section
      const reviewIndex = activeFlow.indexOf(1);
      if (reviewIndex !== -1) {
        setFlowStepIndex(reviewIndex);
      }
      console.log('📍 Edit complete: Returning to Review section');
      return;
    }

    if (useSequentialFlow) {
      // Sequential flow (full flow for FavoriteListingsPage, short flow for first-time on ViewSplitLeasePage)
      const nextIndex = flowStepIndex + 1;
      if (nextIndex < activeFlow.length) {
        setFlowStepIndex(nextIndex);
        setCurrentSection(activeFlow[nextIndex]);
        console.log(`📍 Sequential flow (${useFullFlow ? 'full' : 'short'}): Moving to step ${nextIndex + 1} (section ${activeFlow[nextIndex]})`);
      }
      // If at last step (Review), handleSubmit will be called instead
    } else {
      // Hub-and-spoke for returning users on ViewSplitLeasePage: always return to Review
      setCurrentSection(1);
      console.log('📍 Returning user (hub-and-spoke): Back to Review section');
    }
  };

  const handleBack = () => {
    // If editing from Review, "Go back" should also return to Review
    if (isEditingFromReview) {
      setCurrentSection(1);
      setIsEditingFromReview(false);
      const reviewIndex = activeFlow.indexOf(1);
      if (reviewIndex !== -1) {
        setFlowStepIndex(reviewIndex);
      }
      console.log('📍 Edit cancelled: Returning to Review section');
      return;
    }

    if (useSequentialFlow) {
      // Sequential back navigation (flow depends on useFullFlow prop)
      if (flowStepIndex > 0) {
        const prevIndex = flowStepIndex - 1;
        setFlowStepIndex(prevIndex);
        setCurrentSection(activeFlow[prevIndex]);
        console.log(`📍 Sequential flow (${useFullFlow ? 'full' : 'short'}): Going back to step ${prevIndex + 1} (section ${activeFlow[prevIndex]})`);
      }
      // If at first step (User Details), no back navigation available
    } else {
      // Hub-and-spoke for returning users on ViewSplitLeasePage: from any edit section, return to Review
      if (currentSection !== 1) {
        setCurrentSection(1);
        console.log('📍 Returning user (hub-and-spoke): Back to Review section');
      }
    }
  };

  const validateCurrentSection = () => {
    switch (currentSection) {
      case 2: // User Details
        if (!proposalData.needForSpace || !proposalData.aboutYourself) {
          alert('Please fill in all required fields (minimum 10 words each)');
          return false;
        }
        if (proposalData.hasUniqueRequirements && !proposalData.uniqueRequirements) {
          alert('Please describe your unique requirements');
          return false;
        }
        return true;
      case 3: // Move-in
        if (!proposalData.moveInDate) {
          alert('Please select a move-in date');
          return false;
        }
        return true;
      case 4: // Days Selection
        if (!proposalData.daysSelected || proposalData.daysSelected.length === 0) {
          alert('Please select at least one day');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = () => {
    // Convert day names back to day objects for submission
    const submissionData = {
      ...proposalData,
      daysSelectedObjects: dayNamesToObjects(proposalData.daysSelected)
    };

    // Clear draft from localStorage on successful submission
    clearProposalDraft(listingId);
    console.log('🗑️ Cleared proposal draft from localStorage');

    onSubmit(submissionData);
  };

  const renderSection = () => {
    switch (currentSection) {
      case 1: // Review Section
        return (
          <ReviewSection
            data={proposalData}
            listing={listing}
            onEditUserDetails={handleEditUserDetails}
            onEditMoveIn={handleEditMoveIn}
            onEditDays={handleEditDays}
          />
        );
      case 2: // User Details
        return (
          <UserDetailsSection
            data={proposalData}
            updateData={updateProposalData}
          />
        );
      case 3: // Move-in & Reservation
        return (
          <MoveInSection
            data={proposalData}
            updateData={updateProposalData}
            listing={listing}
          />
        );
      case 4: // Days Selection
        return (
          <DaysSelectionSection
            data={proposalData}
            updateData={updateProposalData}
            listing={listing}
            zatConfig={zatConfig}
          />
        );
      default:
        return null;
    }
  };

  const getSectionTitle = () => {
    switch (currentSection) {
      case 1:
        return 'Confirm Proposal';
      case 2:
        return 'Create Proposal';
      case 3:
        return 'Adjust Proposal';
      case 4:
        return 'Adjust Proposal';
      default:
        return 'Create Proposal';
    }
  };

  const getSectionSubtitle = () => {
    if (currentSection === 2) {
      return "Start the conversation! After submitting a proposal, you'll begin a negotiation process with the host to finalize the details of your booking.";
    }
    return null;
  };

  return (
    <div className="create-proposal-popup">
      <div className="proposal-container">
        <div className="proposal-header">
          <div className="proposal-header-top" style={{ marginBottom: getSectionSubtitle() ? '15px' : '0' }}>
            <div className="proposal-title">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#31135D"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginRight: '8px', verticalAlign: 'middle' }}
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              {getSectionTitle()}
            </div>
            <button className="close-button" onClick={onClose}>
              ✕
            </button>
          </div>
          {getSectionSubtitle() && (
            <p className="proposal-subtitle">
              {getSectionSubtitle()}
            </p>
          )}
        </div>

        <div className="proposal-content">
          {renderSection()}
        </div>

        <div className="navigation-buttons">
          {/* Show back button:
              - When editing from Review: always show (to cancel and return)
              - For sequential flow: show if not on first step (flowStepIndex > 0)
              - For hub-and-spoke: show if not on Review section (currentSection !== 1) */}
          {(isEditingFromReview || (useSequentialFlow ? flowStepIndex > 0 : currentSection !== 1)) && (
            <button className="nav-button back" onClick={handleBack}>
              {isEditingFromReview ? 'Cancel' : 'Go back'}
            </button>
          )}
          {currentSection === 1 ? (
            <button className="nav-button next" onClick={handleSubmit}>
              Submit Proposal
            </button>
          ) : (
            <button className="nav-button next" onClick={handleNext}>
              {/* Button text based on context:
                  - When editing from Review: "Save & Review"
                  - For sequential flow: "Review Proposal" on the step before Review, "Next" otherwise
                  - For hub-and-spoke: "Next" on User Details, "Yes, Continue" on other sections */}
              {isEditingFromReview
                ? 'Save & Review'
                : useSequentialFlow
                  ? (flowStepIndex === activeFlow.length - 2 ? 'Review Proposal' : 'Next')
                  : (currentSection === 2 ? 'Next' : 'Yes, Continue')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
