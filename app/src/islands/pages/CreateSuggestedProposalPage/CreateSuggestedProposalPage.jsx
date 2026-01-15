/**
 * Create Suggested Proposal Page
 *
 * Internal tool for Split Lease agents to create proposals on behalf of guests.
 *
 * Follows the Hollow Component Pattern:
 * - This component contains ONLY JSX rendering
 * - ALL business logic is in useCreateSuggestedProposalLogic hook
 *
 * Architecture:
 * - Islands Architecture (independent React root)
 * - 3-Step Wizard: Select Listing → Select Guest → Configure Proposal
 * - Uses 0-indexed day format (0=Sunday through 6=Saturday)
 */

import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import { useCreateSuggestedProposalLogic } from './useCreateSuggestedProposalLogic.js';
import StepProgress from './components/StepProgress.jsx';
import ListingSearch from './components/ListingSearch.jsx';
import GuestSearch from './components/GuestSearch.jsx';
import GuestInfoForm from './components/GuestInfoForm.jsx';
import ProposalConfig from './components/ProposalConfig.jsx';
import PriceBreakdown from './components/PriceBreakdown.jsx';
import ValidationPanel from './components/ValidationPanel.jsx';
import ProposalSummary from './components/ProposalSummary.jsx';
import SuccessModal from './components/SuccessModal.jsx';
import ConfirmationPanel from './components/ConfirmationPanel.jsx';
import './CreateSuggestedProposalPage.css';

// ============================================================================
// LOADING STATE COMPONENT
// ============================================================================

function LoadingOverlay() {
  return (
    <div className="csp-loading-overlay">
      <div className="csp-spinner"></div>
      <p>Creating proposal...</p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT (HOLLOW - NO LOGIC)
// ============================================================================

export default function CreateSuggestedProposalPage() {
  const {
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

    // Calculated pricing
    pricing,

    // UI State
    isCreating,
    isConfirmationStep,
    validationErrors,
    createdProposal,
    createdThread,
    showSuccessModal,

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
  } = useCreateSuggestedProposalLogic();

  return (
    <>
      <Header />

      <main className="csp-main">
        <div className="csp-container">
          {/* Page Header */}
          <header className="csp-header">
            <div className="csp-header-left">
              <h1 className="csp-title">Quick Proposal Creation</h1>
              <p className="csp-subtitle">Create suggested proposals on behalf of guests</p>
            </div>
          </header>

          {/* Progress Steps */}
          <StepProgress currentStep={currentStep} />

          {/* Main Content */}
          <div className="csp-content-wrapper">
            {/* Left Panel - Steps */}
            <div className="csp-left-panel">
              {/* Step 1: Listing Selection */}
              <ListingSearch
                searchTerm={listingSearchTerm}
                searchResults={listingSearchResults}
                selectedListing={selectedListing}
                listingPhotos={listingPhotos}
                isSearching={isSearchingListings}
                onSearchChange={handleListingSearchChange}
                onSearchFocus={handleListingSearchFocus}
                onSelect={handleListingSelect}
                onClear={handleListingClear}
                onClearSearch={handleClearListingSearch}
              />

              {/* Step 2: Guest Selection (visible after listing selected) */}
              {currentStep >= 2 && (
                <GuestSearch
                  searchTerm={guestSearchTerm}
                  searchResults={guestSearchResults}
                  selectedGuest={selectedGuest}
                  existingProposalsCount={existingProposalsCount}
                  isConfirmed={isGuestConfirmed}
                  isSearching={isSearchingGuests}
                  onSearchChange={handleGuestSearchChange}
                  onSearchFocus={handleGuestSearchFocus}
                  onSelect={handleGuestSelect}
                  onConfirm={handleGuestConfirm}
                  onClear={handleGuestClear}
                  onClearSearch={handleClearGuestSearch}
                />
              )}

              {/* Step 3: Guest Info Form (visible after guest confirmed) */}
              {currentStep >= 3 && (
                <GuestInfoForm
                  guestName={selectedGuest?.['Name - First'] || selectedGuest?.['Name - Full'] || 'Guest'}
                  aboutMe={aboutMe}
                  needForSpace={needForSpace}
                  specialNeeds={specialNeeds}
                  onAboutMeChange={handleAboutMeChange}
                  onNeedForSpaceChange={handleNeedForSpaceChange}
                  onSpecialNeedsChange={handleSpecialNeedsChange}
                />
              )}
            </div>

            {/* Right Panel - Configuration (visible on Step 3) */}
            {currentStep >= 3 && (
              <div className="csp-right-panel">
                <ProposalConfig
                  proposalStatus={proposalStatus}
                  moveInDate={moveInDate}
                  moveInRange={moveInRange}
                  strictMoveIn={strictMoveIn}
                  selectedDays={selectedDays}
                  checkInDayName={checkInDayName}
                  checkOutDayName={checkOutDayName}
                  nightsCount={nightsCount}
                  reservationSpan={reservationSpan}
                  customWeeks={customWeeks}
                  onStatusChange={handleStatusChange}
                  onMoveInDateChange={handleMoveInDateChange}
                  onMoveInRangeChange={handleMoveInRangeChange}
                  onStrictMoveInChange={handleStrictMoveInChange}
                  onDayToggle={handleDayToggle}
                  onSelectFullTime={handleSelectFullTime}
                  onReservationSpanChange={handleReservationSpanChange}
                  onCustomWeeksChange={handleCustomWeeksChange}
                />

                <ValidationPanel
                  selectedDays={selectedDays}
                  nightsCount={nightsCount}
                  reservationWeeks={reservationSpan === 'custom' ? customWeeks : parseInt(reservationSpan) || 0}
                />

                <PriceBreakdown pricing={pricing} />
              </div>
            )}
          </div>

          {/* Proposal Summary (visible on Step 3) */}
          {currentStep >= 3 && (
            <ProposalSummary
              selectedListing={selectedListing}
              selectedGuest={selectedGuest}
              selectedDays={selectedDays}
              checkInDayIndex={checkInDayIndex}
              checkOutDayIndex={checkOutDayIndex}
              reservationWeeks={reservationSpan === 'custom' ? customWeeks : parseInt(reservationSpan) || 0}
              pricing={pricing}
            />
          )}

          {/* Confirmation Panel */}
          {isConfirmationStep && (
            <ConfirmationPanel onCancel={handleCancelConfirmation} />
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="csp-validation-messages">
              {validationErrors.map((error, index) => (
                <div key={index} className="csp-validation-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  {error}
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="csp-action-buttons">
            {currentStep >= 3 && (
              <button
                className="csp-btn csp-btn-secondary"
                onClick={handleGoBack}
              >
                Go Back
              </button>
            )}

            {!isConfirmationStep ? (
              <button
                className="csp-btn csp-btn-primary"
                onClick={handleFirstCreateClick}
                disabled={validationErrors.length > 0 || currentStep < 3}
              >
                Create Proposal
              </button>
            ) : (
              <button
                className="csp-btn csp-btn-success"
                onClick={handleConfirmProposal}
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Confirm Proposal Creation'}
              </button>
            )}
          </div>
        </div>

        {/* Loading Overlay */}
        {isCreating && <LoadingOverlay />}
      </main>

      <Footer />

      {/* Success Modal */}
      {showSuccessModal && (
        <SuccessModal
          proposalId={createdProposal?._id}
          threadId={createdThread?._id}
          onCreateAnother={handleCreateAnother}
          onClose={handleCloseSuccessModal}
        />
      )}
    </>
  );
}
