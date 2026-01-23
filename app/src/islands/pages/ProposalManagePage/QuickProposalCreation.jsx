/**
 * Quick Proposal Creation Wizard
 *
 * 4-step wizard for admin to create proposals:
 * 1. Search and select listing
 * 2. Search and select guest
 * 3. Enter proposal details (schedule, dates, etc.)
 * 4. Confirmation
 *
 * Uses local state for wizard navigation (no React Router)
 * Queries Supabase directly for listing/guest search
 */

import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { PROPOSAL_STATUSES, DAYS_OF_WEEK, DEFAULT_ADMIN_PROPOSAL_STATUS } from './constants.js';

// ============================================================================
// SEARCH COMPONENTS
// ============================================================================

/**
 * Search results item for listings
 */
function ListingSearchItem({ listing, onSelect }) {
  return (
    <div className="pm-search-result-item" onClick={() => onSelect(listing)}>
      <div className="pm-search-result-content">
        {listing.coverPhoto && (
          <img
            src={listing.coverPhoto}
            alt={listing.name}
            className="pm-search-result-photo"
          />
        )}
        <div className="pm-search-result-details">
          <p className="pm-search-result-name">{listing.name}</p>
          <p className="pm-search-result-secondary">{listing.address}</p>
          <p className="pm-search-result-id">ID: {listing._id}</p>
          {listing.host && (
            <p className="pm-search-result-host">
              Host: {listing.host.fullName || listing.host.email}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Search results item for guests
 */
function GuestSearchItem({ guest, onSelect }) {
  return (
    <div className="pm-search-result-item" onClick={() => onSelect(guest)}>
      <div className="pm-search-result-content">
        {guest.profilePhoto && (
          <img
            src={guest.profilePhoto}
            alt={guest.fullName}
            className="pm-search-result-photo pm-search-result-avatar"
          />
        )}
        <div className="pm-search-result-details">
          <p className="pm-search-result-name">{guest.fullName || `${guest.firstName} ${guest.lastName}`}</p>
          <p className="pm-search-result-secondary">{guest.email}</p>
          {guest.phoneNumber && (
            <p className="pm-search-result-id">{guest.phoneNumber}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * QuickProposalCreation component
 * @param {Object} props
 * @param {Function} props.onCreateProposal - Handler for proposal creation
 * @param {Function} props.onClose - Handler for closing the form
 */
export default function QuickProposalCreation({ onCreateProposal, onClose }) {
  const [step, setStep] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Search results
  const [listingResults, setListingResults] = useState([]);
  const [guestResults, setGuestResults] = useState([]);

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Listing selection
    selectedListing: null,
    listingSearch: '',

    // Step 2: Guest selection
    selectedGuest: null,
    guestSearch: '',

    // Step 3: Proposal details
    guestAbout: '',
    guestNeedForSpace: '',
    guestSpecialNeeds: '',
    proposalStatus: DEFAULT_ADMIN_PROPOSAL_STATUS,
    moveInDate: '',
    reservationSpanWeeks: 13,
    weeklySchedule: [false, false, false, false, false, false, false],
    strictMoveIn: false,
    isFullTime: false,

    // Step 4: Results
    recentlyCreatedProposalId: null,
    recentlyCreatedThreadId: null
  });

  // ============================================================================
  // SEARCH HANDLERS
  // ============================================================================

  /**
   * Search listings by name, address, or ID
   */
  const searchListings = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setListingResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('listing')
        .select(`
          _id,
          Name,
          "Full Address",
          "rental type",
          "Cover Photo",
          "Host User"
        `)
        .or(`Name.ilike.%${query}%,_id.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;

      // Fetch host info for each listing
      const hostIds = [...new Set(data?.map(l => l['Host User']).filter(Boolean))];
      let hostMap = {};

      if (hostIds.length > 0) {
        const { data: hosts } = await supabase
          .from('user')
          .select('_id, "Name - Full", email')
          .in('_id', hostIds);

        hosts?.forEach(h => {
          hostMap[h._id] = { fullName: h['Name - Full'], email: h.email };
        });
      }

      const normalizedResults = data?.map(l => ({
        _id: l._id,
        name: l.Name || 'Unnamed Listing',
        address: l['Full Address'] || '',
        rentalType: l['rental type'] || '',
        coverPhoto: l['Cover Photo'] || null,
        host: hostMap[l['Host User']] || null
      })) || [];

      setListingResults(normalizedResults);
    } catch (err) {
      console.error('[QuickProposalCreation] Listing search error:', err);
      setListingResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Search guests by name, email, or phone
   */
  const searchGuests = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setGuestResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('user')
        .select(`
          _id,
          "Name - Full",
          "Name - First",
          "Name - Last",
          email,
          "Phone Number",
          "Profile Photo",
          "About Me / Bio",
          "need for space",
          "Special needs"
        `)
        .or(`"Name - Full".ilike.%${query}%,email.ilike.%${query}%,"Phone Number".ilike.%${query}%`)
        .limit(20);

      if (error) throw error;

      const normalizedResults = data?.map(g => ({
        _id: g._id,
        fullName: g['Name - Full'] || '',
        firstName: g['Name - First'] || '',
        lastName: g['Name - Last'] || '',
        email: g.email || '',
        phoneNumber: g['Phone Number'] || '',
        profilePhoto: g['Profile Photo'] || null,
        aboutMe: g['About Me / Bio'] || '',
        needForSpace: g['need for space'] || '',
        specialNeeds: g['Special needs'] || ''
      })) || [];

      setGuestResults(normalizedResults);
    } catch (err) {
      console.error('[QuickProposalCreation] Guest search error:', err);
      setGuestResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // ============================================================================
  // SELECTION HANDLERS
  // ============================================================================

  const handleListingSelect = (listing) => {
    setFormData(prev => ({ ...prev, selectedListing: listing }));
    setListingResults([]);
    setStep(2);
  };

  const handleGuestSelect = (guest) => {
    setFormData(prev => ({
      ...prev,
      selectedGuest: guest,
      guestAbout: guest.aboutMe || '',
      guestNeedForSpace: guest.needForSpace || '',
      guestSpecialNeeds: guest.specialNeeds || ''
    }));
    setGuestResults([]);
    setStep(3);
  };

  // ============================================================================
  // SCHEDULE HANDLERS
  // ============================================================================

  const handleScheduleToggle = (dayIndex) => {
    const newSchedule = [...formData.weeklySchedule];
    newSchedule[dayIndex] = !newSchedule[dayIndex];
    setFormData(prev => ({
      ...prev,
      weeklySchedule: newSchedule,
      isFullTime: newSchedule.every(Boolean)
    }));
  };

  const handleSelectFullTime = () => {
    setFormData(prev => ({
      ...prev,
      weeklySchedule: [true, true, true, true, true, true, true],
      isFullTime: true
    }));
  };

  // ============================================================================
  // PRICING CALCULATION
  // ============================================================================

  const calculatePricing = () => {
    if (!formData.selectedListing) return {};

    // This is a simplified calculation - in production would use pricing service
    const nightlyPrice = formData.selectedListing.nightlyPrice || 150; // Default estimate
    const reservationSpanWeeks = formData.reservationSpanWeeks || 0;
    const activeDays = formData.weeklySchedule.filter(Boolean).length;
    const totalNights = activeDays * reservationSpanWeeks;
    const totalReservationPrice = nightlyPrice * totalNights;
    const pricePerFourWeeks = reservationSpanWeeks > 0
      ? (totalReservationPrice / reservationSpanWeeks) * 4
      : 0;

    return {
      nightlyPrice,
      totalNights,
      totalReservationPrice,
      pricePerFourWeeks,
      numberOfWeeks: reservationSpanWeeks
    };
  };

  const pricing = calculatePricing();

  // ============================================================================
  // CREATE PROPOSAL
  // ============================================================================

  const handleCreateProposal = async () => {
    setIsCreating(true);
    try {
      const result = await onCreateProposal({
        selectedListing: formData.selectedListing,
        selectedGuest: formData.selectedGuest,
        guestAbout: formData.guestAbout,
        guestNeedForSpace: formData.guestNeedForSpace,
        guestSpecialNeeds: formData.guestSpecialNeeds,
        proposalStatus: formData.proposalStatus,
        moveInDate: formData.moveInDate,
        reservationSpanWeeks: formData.reservationSpanWeeks,
        weeklySchedule: formData.weeklySchedule,
        strictMoveIn: formData.strictMoveIn,
        isFullTime: formData.isFullTime,
        pricing
      });

      if (result.success) {
        setFormData(prev => ({
          ...prev,
          recentlyCreatedProposalId: result.proposalId || 'Created',
          recentlyCreatedThreadId: result.threadId || null
        }));
        setStep(4);
      } else {
        alert(`Failed to create proposal: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('[QuickProposalCreation] Create error:', err);
      alert('Failed to create proposal. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // ============================================================================
  // RESET / CREATE ANOTHER
  // ============================================================================

  const handleCreateAnother = () => {
    setFormData({
      selectedListing: null,
      listingSearch: '',
      selectedGuest: null,
      guestSearch: '',
      guestAbout: '',
      guestNeedForSpace: '',
      guestSpecialNeeds: '',
      proposalStatus: DEFAULT_ADMIN_PROPOSAL_STATUS,
      moveInDate: '',
      reservationSpanWeeks: 13,
      weeklySchedule: [false, false, false, false, false, false, false],
      strictMoveIn: false,
      isFullTime: false,
      recentlyCreatedProposalId: null,
      recentlyCreatedThreadId: null
    });
    setListingResults([]);
    setGuestResults([]);
    setStep(1);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="pm-quick-creation">
      <div className="pm-creation-header">
        <h2 className="pm-creation-title">Quick Proposal Creation</h2>
        {onClose && (
          <button className="pm-close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        )}
      </div>

      {/* Step 1: Listing Selection */}
      {step >= 1 && (
        <div className={`pm-creation-step ${step === 1 ? 'active' : 'completed'}`}>
          <div className="pm-step-header">
            <div className="pm-step-badge">{step > 1 ? '\u2713' : '1'}</div>
            <div className="pm-step-content">
              <label className="pm-step-label">
                Select Listing (search by name, address, or ID)
              </label>
              {step === 1 && (
                <>
                  <input
                    type="text"
                    className="pm-searchbox"
                    placeholder="Search listing name, address, or ID..."
                    value={formData.listingSearch}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, listingSearch: e.target.value }));
                      searchListings(e.target.value);
                    }}
                  />
                  {isSearching && <p className="pm-searching-text">Searching...</p>}
                  {listingResults.length > 0 && (
                    <div className="pm-search-results">
                      {listingResults.map(listing => (
                        <ListingSearchItem
                          key={listing._id}
                          listing={listing}
                          onSelect={handleListingSelect}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
              {formData.selectedListing && (
                <div className="pm-selected-item">
                  {formData.selectedListing.coverPhoto && (
                    <img
                      src={formData.selectedListing.coverPhoto}
                      alt={formData.selectedListing.name}
                      className="pm-selected-photo"
                    />
                  )}
                  <div className="pm-selected-details">
                    <p className="pm-selected-name">{formData.selectedListing.name}</p>
                    <p className="pm-selected-secondary">{formData.selectedListing.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Guest Selection */}
      {step >= 2 && (
        <div className={`pm-creation-step ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
          <div className="pm-step-header">
            <div className="pm-step-badge">{step > 2 ? '\u2713' : '2'}</div>
            <div className="pm-step-content">
              <label className="pm-step-label">Select Guest</label>
              {step === 2 && (
                <>
                  <input
                    type="text"
                    className="pm-searchbox"
                    placeholder="Search guest name, email, or phone..."
                    value={formData.guestSearch}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, guestSearch: e.target.value }));
                      searchGuests(e.target.value);
                    }}
                  />
                  {isSearching && <p className="pm-searching-text">Searching...</p>}
                  {guestResults.length > 0 && (
                    <div className="pm-search-results">
                      {guestResults.map(guest => (
                        <GuestSearchItem
                          key={guest._id}
                          guest={guest}
                          onSelect={handleGuestSelect}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
              {formData.selectedGuest && (
                <div className="pm-selected-item">
                  {formData.selectedGuest.profilePhoto && (
                    <img
                      src={formData.selectedGuest.profilePhoto}
                      alt={formData.selectedGuest.fullName}
                      className="pm-selected-photo pm-selected-avatar"
                    />
                  )}
                  <div className="pm-selected-details">
                    <p className="pm-selected-name">
                      {formData.selectedGuest.fullName || `${formData.selectedGuest.firstName} ${formData.selectedGuest.lastName}`}
                    </p>
                    <p className="pm-selected-secondary">{formData.selectedGuest.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Proposal Details */}
      {step === 3 && formData.selectedGuest && (
        <div className="pm-creation-step active pm-proposal-details">
          <div className="pm-proposal-form">
            <div className="pm-form-group">
              <label className="pm-form-label">
                Tell us about {formData.selectedGuest.firstName || 'the guest'}:
              </label>
              <textarea
                className="pm-form-textarea"
                placeholder="About Me / Bio"
                value={formData.guestAbout}
                onChange={(e) => setFormData(prev => ({ ...prev, guestAbout: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="pm-form-group">
              <label className="pm-form-label">
                Why does {formData.selectedGuest.firstName || 'the guest'} want this space?
              </label>
              <textarea
                className="pm-form-textarea"
                placeholder="Need for Space"
                value={formData.guestNeedForSpace}
                onChange={(e) => setFormData(prev => ({ ...prev, guestNeedForSpace: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="pm-form-group">
              <label className="pm-form-label">
                Special requirements
              </label>
              <textarea
                className="pm-form-textarea"
                placeholder="Special needs"
                value={formData.guestSpecialNeeds}
                onChange={(e) => setFormData(prev => ({ ...prev, guestSpecialNeeds: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="pm-form-group">
              <label className="pm-form-label">Proposal status</label>
              <select
                className="pm-select"
                value={formData.proposalStatus}
                onChange={(e) => setFormData(prev => ({ ...prev, proposalStatus: e.target.value }))}
              >
                {PROPOSAL_STATUSES.map((status, index) => (
                  <option key={index} value={status}>
                    {status || '(empty)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="pm-form-group">
              <label className="pm-form-label">Move-in From</label>
              <input
                type="date"
                className="pm-date-picker"
                value={formData.moveInDate}
                onChange={(e) => setFormData(prev => ({ ...prev, moveInDate: e.target.value }))}
              />
            </div>

            <div className="pm-form-group">
              <label className="pm-form-label">Reservation Span (# of Weeks)</label>
              <input
                type="number"
                className="pm-form-input"
                min="1"
                max="52"
                value={formData.reservationSpanWeeks}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  reservationSpanWeeks: parseInt(e.target.value) || 0
                }))}
              />
            </div>

            <div className="pm-form-group">
              <label className="pm-form-label">Weekly Schedule</label>
              <div className="pm-days-selector">
                {DAYS_OF_WEEK.map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`pm-day-btn ${formData.weeklySchedule[index] ? 'active' : ''}`}
                    onClick={() => handleScheduleToggle(index)}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="pm-btn pm-btn-full-time"
                onClick={handleSelectFullTime}
              >
                Select Full Time
              </button>
            </div>

            <div className="pm-form-group">
              <label className="pm-checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.strictMoveIn}
                  onChange={(e) => setFormData(prev => ({ ...prev, strictMoveIn: e.target.checked }))}
                />
                Strict (no negotiation on exact move in)
              </label>
            </div>

            {/* Pricing Display */}
            {formData.reservationSpanWeeks > 0 && (
              <div className="pm-pricing-summary">
                <h3 className="pm-pricing-title">Pricing Estimate</h3>
                <div className="pm-pricing-details">
                  <div className="pm-pricing-row">
                    <span>Price per night:</span>
                    <span className="pm-price-value">${pricing.nightlyPrice?.toFixed(2)}</span>
                  </div>
                  <div className="pm-pricing-row">
                    <span>Number of nights:</span>
                    <span className="pm-price-value">{pricing.totalNights}</span>
                  </div>
                  <div className="pm-pricing-row">
                    <span>Number of weeks:</span>
                    <span className="pm-price-value">{pricing.numberOfWeeks}</span>
                  </div>
                  <div className="pm-pricing-row">
                    <span>Total Reservation Price:</span>
                    <span className="pm-price-value">${pricing.totalReservationPrice?.toFixed(2)}</span>
                  </div>
                  <div className="pm-pricing-row">
                    <span>Price per 4 weeks:</span>
                    <span className="pm-price-value">${pricing.pricePerFourWeeks?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pm-form-actions">
              <button
                type="button"
                className="pm-btn pm-btn-create"
                onClick={handleCreateProposal}
                disabled={isCreating || !formData.moveInDate || formData.reservationSpanWeeks < 1}
              >
                {isCreating ? 'Creating...' : 'Create Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <div className="pm-creation-step active pm-confirmation">
          <div className="pm-confirmation-content">
            <div className="pm-success-icon">{'\u2713'}</div>
            <h3 className="pm-confirmation-title">Proposal Created Successfully!</h3>
            <div className="pm-confirmation-details">
              <p>
                <strong>Proposal ID:</strong> {formData.recentlyCreatedProposalId}
              </p>
              {formData.recentlyCreatedThreadId && (
                <p>
                  <strong>Thread ID:</strong> {formData.recentlyCreatedThreadId}
                </p>
              )}
            </div>
            <button
              type="button"
              className="pm-btn pm-btn-create-another"
              onClick={handleCreateAnother}
            >
              Go To Create Another Proposal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
