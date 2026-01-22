/**
 * ProposalCreationSection Component
 * Section for quick proposal creation
 */

import React from 'react';
import DaySelector from './DaySelector';
import ListingPreview from './ListingPreview';
import CalculatedFieldsDisplay from './CalculatedFieldsDisplay';

export default function ProposalCreationSection({
  // Listing
  listingIdInput,
  onListingIdChange,
  selectedListing,
  listingLoading,
  onLoadListing,
  // Guest
  guests,
  selectedProposalGuest,
  onProposalGuestSelection,
  // Date
  moveInDate,
  onMoveInDateChange,
  // Days
  dayLabels,
  selectedDayIndices,
  onDayToggle,
  onSelectFullTime,
  // Reservation
  reservationSpans,
  reservationWeeks,
  onReservationWeeksChange,
  // Pricing
  pricing,
  dayPattern,
  // Metadata
  recentProposalId,
  recentThreadId,
  // Actions
  onCreateProposal,
}) {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      onLoadListing();
    }
  };

  return (
    <section className="section">
      <h2 className="section-heading">Quick Proposal Creation</h2>
      <div className="section-content proposal-creation">
        <div className="proposal-grid">
          {/* Left Column - Form Inputs */}
          <div className="proposal-form">
            {/* Listing ID */}
            <div className="form-group">
              <label htmlFor="listingId">Listing Unique ID - START BY SELECTING A LISTING</label>
              <input
                type="text"
                id="listingId"
                className="text-input"
                placeholder="Enter Listing ID"
                value={listingIdInput}
                onChange={(e) => onListingIdChange(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button
                className={`btn btn-small btn-purple ${listingLoading ? 'loading' : ''}`}
                onClick={onLoadListing}
                disabled={listingLoading}
              >
                Load Listing
              </button>
            </div>

            {/* Guest Selection */}
            <div className="form-group">
              <label htmlFor="proposalGuestDropdown">Choose a Guest</label>
              <select
                id="proposalGuestDropdown"
                className="dropdown"
                value={selectedProposalGuest?.id || ''}
                onChange={(e) => onProposalGuestSelection(e.target.value)}
              >
                <option value="">Choose a guest</option>
                {guests.map((guest) => (
                  <option key={guest.id} value={guest.id}>
                    {guest.fullName || guest.email} ({guest.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Guest Email */}
            <div className="form-group">
              <label htmlFor="proposalGuestEmail">Guest Email</label>
              <input
                type="text"
                id="proposalGuestEmail"
                className="text-input readonly"
                readOnly
                placeholder="Insert guest email"
                value={selectedProposalGuest?.email || ''}
              />
            </div>

            {/* Move-in Date */}
            <div className="form-group">
              <label htmlFor="moveInDate">Move-in From</label>
              <div className="date-input-wrapper">
                <input
                  type="date"
                  id="moveInDate"
                  className="text-input date-input"
                  value={moveInDate}
                  onChange={(e) => onMoveInDateChange(e.target.value)}
                />
              </div>
            </div>

            {/* Day Selector */}
            <DaySelector
              dayLabels={dayLabels}
              selectedDayIndices={selectedDayIndices}
              onDayToggle={onDayToggle}
              onSelectFullTime={onSelectFullTime}
            />

            {/* Reservation Span */}
            <div className="form-group">
              <label htmlFor="reservationSpan">Reservation Span</label>
              <select
                id="reservationSpan"
                className="dropdown"
                value={reservationWeeks}
                onChange={(e) => onReservationWeeksChange(Number(e.target.value))}
              >
                {reservationSpans.map((span) => (
                  <option key={span.value} value={span.value}>
                    {span.label}
                  </option>
                ))}
              </select>
              <p className="help-text">
                Pricing is calculated automatically when you change the dropdown above.
              </p>
            </div>

            {/* Create Proposal Button */}
            <button
              className="btn btn-purple btn-large"
              onClick={onCreateProposal}
            >
              Create Proposal
            </button>
          </div>

          {/* Right Column - Calculated Fields & Listing Preview */}
          <div className="proposal-details">
            {/* Calculated Fields */}
            <CalculatedFieldsDisplay
              dayPattern={dayPattern}
              pricing={pricing}
              reservationWeeks={reservationWeeks}
            />

            {/* Metadata Display */}
            <div className="metadata-display">
              <div className="meta-field">
                <label>Recently Created Proposal ID:</label>
                <span>{recentProposalId || '-'}</span>
              </div>
              <div className="meta-field">
                <label>Recently Created Thread ID:</label>
                <span>{recentThreadId || '-'}</span>
              </div>
            </div>

            {/* Listing Preview */}
            <ListingPreview listing={selectedListing} />
          </div>
        </div>
      </div>
    </section>
  );
}
