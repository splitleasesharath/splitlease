/**
 * CreateProposalFlowV2 - Shared Island Component
 * Complete proposal creation flow with user details, move-in, and days selection
 * Architecture: ESM + React Islands pattern
 *
 * This is adapted from the create-proposal-flow-v2 component in SL16
 */

import { useState, useEffect } from 'react';
import ReviewSection from './CreateProposalFlowV2Components/ReviewSection.jsx';
import UserDetailsSection from './CreateProposalFlowV2Components/UserDetailsSection.jsx';
import MoveInSection from './CreateProposalFlowV2Components/MoveInSection.jsx';
import DaysSelectionSection from './CreateProposalFlowV2Components/DaysSelectionSection.jsx';
import '../../styles/create-proposal-flow-v2.css';

/**
 * CreateProposalFlowV2 Component
 * @param {Object} listing - The listing object
 * @param {string} moveInDate - Pre-selected move-in date from parent
 * @param {Array} daysSelected - Array of selected day objects from ListingScheduleSelector
 * @param {number} nightsSelected - Number of nights selected
 * @param {number} reservationSpan - Number of weeks for reservation
 * @param {Object} pricingBreakdown - Pricing breakdown from parent
 * @param {Object} zatConfig - ZAT price configuration object
 * @param {boolean} hasExistingUserData - Whether user has previously entered data
 * @param {Object} existingUserData - Previously saved user data
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
  hasExistingUserData = false,
  existingUserData = null,
  onClose,
  onSubmit
}) {
  // Section flow: 1 = Review, 2 = User Details, 3 = Move-in, 4 = Days Selection
  const [currentSection, setCurrentSection] = useState(hasExistingUserData ? 1 : 2);

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

  const [proposalData, setProposalData] = useState({
    // Pre-filled from listing page
    moveInDate: moveInDate || '',
    daysSelected: dayObjectsToNames(daysSelected),
    reservationSpan: reservationSpan || 13,
    checkInDay: daysSelected.length > 0 ? dayObjectsToNames(daysSelected)[0] : 'Monday',
    checkOutDay: daysSelected.length > 0 ? dayObjectsToNames(daysSelected)[daysSelected.length - 1] : 'Friday',

    // User information (pre-filled if exists)
    needForSpace: existingUserData?.needForSpace || '',
    aboutYourself: existingUserData?.aboutYourself || '',
    hasUniqueRequirements: existingUserData?.hasUniqueRequirements || false,
    uniqueRequirements: existingUserData?.uniqueRequirements || '',

    // Optional move-in flexibility
    moveInRange: '',

    // Pricing (from parent or calculate)
    pricePerNight: pricingBreakdown?.pricePerNight || listing?.['💰Nightly Host Rate for 2 nights'] || 0,
    numberOfNights: nightsSelected * reservationSpan,
    totalPrice: pricingBreakdown?.reservationTotal || 0,
    pricePerFourWeeks: pricingBreakdown?.fourWeekRent || 0,
    damageDeposit: listing?.['💰Damage Deposit'] || 0,
    maintenanceFee: listing?.['💰Cleaning Cost / Maintenance Fee'] || 0,
    firstFourWeeksTotal: 0,

    // Listing reference
    listingId: listing?._id,
    listingAddress: listing?.Name || listing?.address
  });

  // Calculate pricing whenever relevant fields change
  useEffect(() => {
    calculatePricing();
  }, [
    proposalData.daysSelected,
    proposalData.reservationSpan,
    proposalData.pricePerNight
  ]);

  const calculatePricing = () => {
    const nightsPerWeek = proposalData.daysSelected.length;
    const totalNights = nightsPerWeek * proposalData.reservationSpan;
    const totalPrice = totalNights * proposalData.pricePerNight;
    const pricePerFourWeeks = nightsPerWeek * 4 * proposalData.pricePerNight;
    const firstFourWeeksTotal = pricePerFourWeeks + proposalData.damageDeposit + proposalData.maintenanceFee;

    setProposalData(prev => ({
      ...prev,
      numberOfNights: totalNights,
      totalPrice: totalPrice,
      pricePerFourWeeks: pricePerFourWeeks,
      firstFourWeeksTotal: firstFourWeeksTotal
    }));
  };

  const updateProposalData = (field, value) => {
    setProposalData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Edit handlers - take user to specific section from Review
  const handleEditUserDetails = () => {
    setCurrentSection(2);
  };

  const handleEditMoveIn = () => {
    setCurrentSection(3);
  };

  const handleEditDays = () => {
    setCurrentSection(4);
  };

  // Navigation - always return to Review (Section 1) after any edit
  const handleNext = () => {
    if (validateCurrentSection()) {
      setCurrentSection(1); // Always go back to Review
    }
  };

  const handleBack = () => {
    if (currentSection === 1) {
      // From Review, go to User Details to edit
      setCurrentSection(2);
    } else {
      // From any edit section, go back to Review
      setCurrentSection(1);
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
          <div className="proposal-header-top">
            <div className="proposal-title">
              📄 {getSectionTitle()}
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
          {currentSection !== 2 && (
            <button className="nav-button back" onClick={handleBack}>
              Go back
            </button>
          )}
          {currentSection === 1 ? (
            <button className="nav-button next" onClick={handleSubmit}>
              Submit Proposal
            </button>
          ) : (
            <button className="nav-button next" onClick={handleNext}>
              {currentSection === 2 ? 'Next' : 'Yes, Continue'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
