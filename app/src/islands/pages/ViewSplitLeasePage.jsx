/**
 * View Split Lease Page - Complete Rebuild
 * Matches original Bubble.io design with 100% fidelity
 * Architecture: ESM + React Islands pattern
 *
 * IMPORTANT: This is a comprehensive rebuild based on documentation and original page inspection
 */

import { useState, useEffect, useCallback } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import CreateProposalFlow from './ViewSplitLeasePageComponents/CreateProposalFlow.jsx';
import ListingScheduleSelector from '../shared/ListingScheduleSelector.jsx';
import { initializeLookups } from '../../lib/dataLookups.js';
import { fetchListingComplete, getListingIdFromUrl, fetchZatPriceConfiguration } from '../../lib/listingDataFetcher.js';
import {
  calculatePricingBreakdown,
  formatPrice,
  getPriceDisplayMessage
} from '../../lib/priceCalculations.js';
import {
  isContiguousSelection,
  validateScheduleSelection,
  calculateCheckInOutDays,
  getBlockedDatesList,
  calculateNightsFromDays
} from '../../lib/availabilityValidation.js';
import { DAY_ABBREVIATIONS, DEFAULTS, COLORS } from '../../lib/constants.js';
import { createDay } from '../../lib/scheduleSelector/dayHelpers.js';
import '../../styles/listing-schedule-selector.css';

// ============================================================================
// LOADING AND ERROR STATES
// ============================================================================

function LoadingState() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '60vh',
      padding: '2rem'
    }}>
      <div style={{
        width: '60px',
        height: '60px',
        border: `4px solid ${COLORS.BG_LIGHT}`,
        borderTop: `4px solid ${COLORS.PRIMARY}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '4rem 2rem',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
      <h2 style={{
        fontSize: '2rem',
        fontWeight: '700',
        marginBottom: '1rem',
        color: COLORS.TEXT_DARK
      }}>
        Property Not Found
      </h2>
      <p style={{
        fontSize: '1.125rem',
        color: COLORS.TEXT_LIGHT,
        marginBottom: '2rem'
      }}>
        {message || 'The property you are looking for does not exist or has been removed.'}
      </p>
      <a
        href="/search.html"
        style={{
          display: 'inline-block',
          padding: '1rem 2rem',
          background: COLORS.PRIMARY,
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.background = COLORS.PRIMARY_HOVER}
        onMouseLeave={(e) => e.target.style.background = COLORS.PRIMARY}
      >
        Browse All Listings
      </a>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function ViewSplitLeasePage() {
  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [listing, setListing] = useState(null);
  const [zatConfig, setZatConfig] = useState(null);

  // Booking widget state
  const [moveInDate, setMoveInDate] = useState(null);
  const [strictMode, setStrictMode] = useState(false);
  const [selectedDayObjects, setSelectedDayObjects] = useState([]); // Day objects from new component
  const [reservationSpan, setReservationSpan] = useState(13); // 13 weeks default
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [priceBreakdown, setPriceBreakdown] = useState(null);

  // Convert Day objects to array of numbers for compatibility with existing code
  const selectedDays = selectedDayObjects.map(day => day.dayOfWeek);

  // UI state
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [expandedSections, setExpandedSections] = useState({
    description: false,
    neighborhood: false,
    blockedDates: false
  });

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    async function initialize() {
      try {
        // Initialize lookup caches
        await initializeLookups();

        // Fetch ZAT price configuration
        const zatConfigData = await fetchZatPriceConfiguration();
        setZatConfig(zatConfigData);

        // Get listing ID from URL
        const listingId = getListingIdFromUrl();
        if (!listingId) {
          throw new Error('No listing ID provided in URL');
        }

        // Fetch complete listing data
        const listingData = await fetchListingComplete(listingId);
        setListing(listingData);
        setLoading(false);

      } catch (err) {
        console.error('Error initializing page:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    initialize();

    // Set up responsive listener
    const mediaQuery = window.matchMedia('(max-width: 900px)');
    setIsMobile(mediaQuery.matches);

    const handleResize = (e) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handleResize);

    return () => mediaQuery.removeEventListener('change', handleResize);
  }, []);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  // Convert day names to numbers helper
  const convertDayNamesToNumbers = (dayNames) => {
    if (!dayNames || !Array.isArray(dayNames)) return [0, 1, 2, 3, 4, 5, 6];

    const dayNameMap = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };

    const numbers = dayNames.map(name => dayNameMap[name]).filter(num => num !== undefined);
    return numbers.length > 0 ? numbers : [0, 1, 2, 3, 4, 5, 6];
  };

  // Prepare listing data for ListingScheduleSelector component
  const scheduleSelectorListing = listing ? {
    id: listing._id,
    firstAvailable: new Date(listing[' First Available']),
    lastAvailable: new Date(listing['Last Available']),
    numberOfNightsAvailable: listing['# of nights available'] || 7,
    active: listing.Active,
    approved: listing.Approved,
    datesBlocked: listing['Dates - Blocked'] || [],
    complete: listing.Complete,
    confirmedAvailability: listing.confirmedAvailability,
    checkInTime: listing['NEW Date Check-in Time'] || '3:00 pm',
    checkOutTime: listing['NEW Date Check-out Time'] || '11:00 am',
    nightsAvailableList: [],
    nightsAvailableNumbers: listing['Nights Available (numbers)'] || [0, 1, 2, 3, 4, 5, 6],
    nightsNotAvailable: [],
    minimumNights: listing['Minimum Nights'] || 2,
    maximumNights: listing['Maximum Nights'] || 7,
    daysAvailable: convertDayNamesToNumbers(listing['Days Available (List of Days)']),
    daysNotAvailable: [],
    // Pricing fields for calculation
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
  } : null;

  // Initialize with Monday-Friday (1-5) as default
  useEffect(() => {
    if (selectedDayObjects.length === 0) {
      const defaultDays = DEFAULTS.DEFAULT_SELECTED_DAYS.map(dayNum => createDay(dayNum, true));
      setSelectedDayObjects(defaultDays);
    }
  }, []);

  const scheduleValidation = listing ? validateScheduleSelection(selectedDays, listing) : null;
  const nightsSelected = calculateNightsFromDays(selectedDays);
  const { checkInName, checkOutName } = calculateCheckInOutDays(selectedDays);

  // Use price breakdown from ListingScheduleSelector (calculated internally)
  const pricingBreakdown = priceBreakdown;

  const priceMessage = !scheduleValidation?.valid || !pricingBreakdown?.valid
    ? getPriceDisplayMessage(selectedDays.length)
    : null;

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleScheduleChange = (newSelectedDays) => {
    setSelectedDayObjects(newSelectedDays);

    // Check if non-contiguous (triggers tutorial)
    const dayNumbers = newSelectedDays.map(d => d.dayOfWeek);
    if (dayNumbers.length > 0 && !isContiguousSelection(dayNumbers)) {
      setShowTutorialModal(true);
    }
  };

  const handlePriceChange = useCallback((newPriceBreakdown) => {
    console.log('=== PRICE CHANGE CALLBACK ===');
    console.log('Received price breakdown:', newPriceBreakdown);
    // Only update if the values have actually changed to prevent infinite loops
    setPriceBreakdown((prev) => {
      if (!prev ||
          prev.fourWeekRent !== newPriceBreakdown.fourWeekRent ||
          prev.reservationTotal !== newPriceBreakdown.reservationTotal ||
          prev.nightlyRate !== newPriceBreakdown.nightlyRate) {
        return newPriceBreakdown;
      }
      return prev;
    });
  }, []);

  const handlePhotoClick = (index) => {
    setCurrentPhotoIndex(index);
    setShowPhotoModal(true);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleCreateProposal = () => {
    // Validate before opening modal
    if (!scheduleValidation?.valid) {
      alert('Please select a valid contiguous schedule');
      return;
    }

    if (!moveInDate) {
      alert('Please select a move-in date');
      return;
    }

    setIsProposalModalOpen(true);
  };

  // ============================================================================
  // RENDER LOGIC
  // ============================================================================

  if (loading) {
    return (
      <>
        <Header />
        <main style={{ minHeight: '70vh', paddingTop: 'calc(80px + 2rem)' }}>
          <LoadingState />
        </main>
        <Footer />
      </>
    );
  }

  if (error || !listing) {
    return (
      <>
        <Header />
        <main style={{ minHeight: '70vh', paddingTop: 'calc(80px + 2rem)' }}>
          <ErrorState message={error} />
        </main>
        <Footer />
      </>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <>
      <Header />

      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '2rem',
        paddingTop: 'calc(80px + 2rem)',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 400px',
        gap: '2rem'
      }}>

        {/* LEFT COLUMN - CONTENT */}
        <div className="left-column">

          {/* Photo Gallery */}
          <section style={{ marginBottom: '2rem' }}>
            {listing.photos && listing.photos.length > 0 ? (
              <>
                <div
                  onClick={() => handlePhotoClick(0)}
                  style={{
                    cursor: 'pointer',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    marginBottom: '1rem'
                  }}
                >
                  <img
                    src={listing.photos[0].Photo}
                    alt={`${listing.Name} - main`}
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                </div>

                {listing.photos.length > 1 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.75rem'
                  }}>
                    {listing.photos.slice(1, 4).map((photo, idx) => (
                      <div
                        key={photo._id}
                        onClick={() => handlePhotoClick(idx + 1)}
                        style={{
                          cursor: 'pointer',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          position: 'relative'
                        }}
                      >
                        <img
                          src={photo['Photo (thumbnail)'] || photo.Photo}
                          alt={`${listing.Name} - ${idx + 2}`}
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            display: 'block'
                          }}
                        />
                        {idx === 2 && listing.photos.length > 4 && (
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '1.25rem',
                            fontWeight: '700'
                          }}>
                            +{listing.photos.length - 4}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{
                width: '100%',
                height: '400px',
                background: COLORS.BG_LIGHT,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: COLORS.TEXT_LIGHT
              }}>
                No images available
              </div>
            )}
          </section>

          {/* Listing Header */}
          <section style={{ marginBottom: '2rem' }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              marginBottom: '1rem',
              color: COLORS.TEXT_DARK
            }}>
              {listing.Name}
            </h1>
            <div style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              color: COLORS.TEXT_LIGHT
            }}>
              {listing.resolvedNeighborhood && listing.resolvedBorough && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📍 Located in {listing.resolvedNeighborhood}, {listing.resolvedBorough}
                </span>
              )}
              {listing.resolvedTypeOfSpace && (
                <span>
                  {listing.resolvedTypeOfSpace} - {listing['Features - Qty Guests']} guests max
                </span>
              )}
            </div>
          </section>

          {/* Features Grid */}
          <section style={{
            marginBottom: '2rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem'
          }}>
            {listing['Kitchen Type'] && (
              <div style={{ textAlign: 'center', padding: '1rem', background: COLORS.BG_LIGHT, borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🍳</div>
                <div>{listing['Kitchen Type']}</div>
              </div>
            )}
            {listing['Features - Qty Bathrooms'] !== null && (
              <div style={{ textAlign: 'center', padding: '1rem', background: COLORS.BG_LIGHT, borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚿</div>
                <div>{listing['Features - Qty Bathrooms']} Bathroom(s)</div>
              </div>
            )}
            {listing['Features - Qty Bedrooms'] !== null && (
              <div style={{ textAlign: 'center', padding: '1rem', background: COLORS.BG_LIGHT, borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛏️</div>
                <div>{listing.resolvedTypeOfSpace === 'Studio' ? 'Studio' : `${listing['Features - Qty Bedrooms']} Bedrooms`}</div>
              </div>
            )}
            {listing['Features - Qty Beds'] !== null && (
              <div style={{ textAlign: 'center', padding: '1rem', background: COLORS.BG_LIGHT, borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛌</div>
                <div>{listing['Features - Qty Beds']} Bed(s)</div>
              </div>
            )}
          </section>

          {/* Description */}
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              marginBottom: '1rem',
              color: COLORS.TEXT_DARK
            }}>
              Description of Lodging
            </h2>
            <p style={{
              lineHeight: '1.6',
              color: COLORS.TEXT_LIGHT,
              whiteSpace: 'pre-wrap'
            }}>
              {expandedSections.description
                ? listing.Description
                : listing.Description?.slice(0, 360)}
              {listing.Description?.length > 360 && !expandedSections.description && '...'}
            </p>
            {listing.Description?.length > 360 && (
              <button
                onClick={() => toggleSection('description')}
                style={{
                  marginTop: '0.5rem',
                  background: 'none',
                  border: 'none',
                  color: COLORS.PRIMARY,
                  cursor: 'pointer',
                  fontWeight: '600',
                  textDecoration: 'underline'
                }}
              >
                {expandedSections.description ? 'Read Less' : 'Read More'}
              </button>
            )}
          </section>

          {/* Commute Section */}
          {(listing.parkingOption || listing['Time to Station (commute)']) && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '1rem',
                color: COLORS.TEXT_DARK
              }}>
                Commute
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {listing.parkingOption && (
                  <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>🚗</span>
                    <div>
                      <div style={{ fontWeight: '600' }}>{listing.parkingOption.label}</div>
                      <div style={{ color: COLORS.TEXT_LIGHT, fontSize: '0.875rem' }}>
                        Convenient parking for your car
                      </div>
                    </div>
                  </div>
                )}
                {listing['Time to Station (commute)'] && (
                  <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>🚇</span>
                    <div>
                      <div style={{ fontWeight: '600' }}>{listing['Time to Station (commute)']} to Metro</div>
                      <div style={{ color: COLORS.TEXT_LIGHT, fontSize: '0.875rem' }}>
                        Quick walk to nearest station
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Amenities Section */}
          {(listing.amenitiesInUnit?.length > 0 || listing.safetyFeatures?.length > 0) && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '1rem',
                color: COLORS.TEXT_DARK
              }}>
                Amenities
              </h2>

              {listing.amenitiesInUnit?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontWeight: '600', marginBottom: '0.75rem' }}>In-Unit</h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '0.75rem'
                  }}>
                    {listing.amenitiesInUnit.map(amenity => (
                      <div
                        key={amenity.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem'
                        }}
                      >
                        {amenity.icon && (
                          <img src={amenity.icon} alt="" style={{ width: '24px', height: '24px' }} />
                        )}
                        <span style={{ fontSize: '0.875rem' }}>{amenity.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {listing.safetyFeatures?.length > 0 && (
                <div>
                  <h3 style={{ fontWeight: '600', marginBottom: '0.75rem' }}>Safety Features</h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '0.75rem'
                  }}>
                    {listing.safetyFeatures.map(feature => (
                      <div
                        key={feature.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem'
                        }}
                      >
                        {feature.icon && (
                          <img src={feature.icon} alt="" style={{ width: '24px', height: '24px' }} />
                        )}
                        <span style={{ fontSize: '0.875rem' }}>{feature.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* House Rules */}
          {listing.houseRules?.length > 0 && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '1rem',
                color: COLORS.TEXT_DARK
              }}>
                House Rules
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {listing.houseRules.map(rule => (
                  <div
                    key={rule.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem'
                    }}
                  >
                    {rule.icon && (
                      <img src={rule.icon} alt="" style={{ width: '24px', height: '24px' }} />
                    )}
                    <span>{rule.name}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Host Section */}
          {listing.host && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '1rem',
                color: COLORS.TEXT_DARK
              }}>
                Meet Your Host
              </h2>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1.5rem',
                background: COLORS.BG_LIGHT,
                borderRadius: '12px'
              }}>
                {listing.host['Profile Photo'] && (
                  <img
                    src={listing.host['Profile Photo']}
                    alt={listing.host['Name - First']}
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                )}
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                    {listing.host['Name - First']} {listing.host['Name - Last']?.charAt(0)}.
                  </div>
                  <div style={{ color: COLORS.TEXT_LIGHT }}>Host</div>
                </div>
              </div>
            </section>
          )}

          {/* Cancellation Policy */}
          {listing['Cancellation Policy'] && (
            <section style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
                <div>
                  <span style={{ fontWeight: '600' }}>Cancellation Policy: </span>
                  <span>{listing['Cancellation Policy']}</span>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN - BOOKING WIDGET */}
        <div
          className="booking-widget"
          style={{
            position: isMobile ? 'static' : 'sticky',
            top: isMobile ? 'auto' : '2rem',
            height: 'fit-content',
            border: `1px solid ${COLORS.BG_LIGHT}`,
            borderRadius: '12px',
            padding: '1.5rem',
            background: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          {/* Price Display */}
          <div style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: COLORS.PRIMARY,
            marginBottom: '1.5rem',
            textAlign: 'left'
          }}>
            {pricingBreakdown?.valid && pricingBreakdown?.pricePerNight
              ? `$${Number.isInteger(pricingBreakdown.pricePerNight) ? pricingBreakdown.pricePerNight : pricingBreakdown.pricePerNight.toFixed(2)}/night`
              : 'Please select or deselect days to see pricing'}
          </div>

          {/* Move-in Date */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '0.5rem',
              fontSize: '0.875rem'
            }}>
              Ideal Move-In
            </label>
            <input
              type="date"
              value={moveInDate || ''}
              onChange={(e) => setMoveInDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${COLORS.BG_LIGHT}`,
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>

          {/* Strict Mode */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}>
              <input
                type="checkbox"
                checked={strictMode}
                onChange={(e) => setStrictMode(e.target.checked)}
              />
              <span>Strict (no negotiation on exact move in)</span>
            </label>
          </div>

          {/* Weekly Schedule Selector */}
          {scheduleSelectorListing && (
            <div style={{ marginBottom: '1.5rem' }}>
              <ListingScheduleSelector
                listing={scheduleSelectorListing}
                initialSelectedDays={selectedDayObjects}
                limitToFiveNights={false}
                reservationSpan={reservationSpan}
                zatConfig={zatConfig}
                onSelectionChange={handleScheduleChange}
                onPriceChange={handlePriceChange}
                showPricing={false}
              />
            </div>
          )}

          {/* Reservation Span */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '0.5rem',
              fontSize: '0.875rem'
            }}>
              Reservation Span
            </label>
            <select
              value={reservationSpan}
              onChange={(e) => setReservationSpan(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${COLORS.BG_LIGHT}`,
                borderRadius: '8px',
                fontSize: '1rem',
                background: 'white'
              }}
            >
              {[6, 7, 8, 9, 10, 12, 13, 16, 17, 20, 22, 26].map(weeks => (
                <option key={weeks} value={weeks}>
                  {weeks} weeks {weeks >= 12 ? `(${Math.floor(weeks / 4)} months)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Price Breakdown */}
          <div style={{
            marginBottom: '1.5rem',
            paddingTop: '1.5rem',
            borderTop: `1px solid ${COLORS.BG_LIGHT}`
          }}>
            {console.log('Rendering prices - pricingBreakdown:', pricingBreakdown)}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
              fontSize: '0.875rem'
            }}>
              <span>4-Week Rent:</span>
              <span style={{ fontWeight: '600' }}>
                {pricingBreakdown?.valid && pricingBreakdown?.fourWeekRent
                  ? formatPrice(pricingBreakdown.fourWeekRent)
                  : priceMessage || 'Please Add More Days'}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1rem',
              fontWeight: '700'
            }}>
              <span>Reservation Estimated Total:</span>
              <span style={{ color: COLORS.PRIMARY }}>
                {pricingBreakdown?.valid && pricingBreakdown?.reservationTotal
                  ? formatPrice(pricingBreakdown.reservationTotal)
                  : priceMessage || 'Please Add More Days'}
              </span>
            </div>
          </div>

          {/* Create Proposal Button */}
          <button
            onClick={handleCreateProposal}
            disabled={!scheduleValidation?.valid || !pricingBreakdown?.valid}
            style={{
              width: '100%',
              padding: '1rem',
              background: scheduleValidation?.valid && pricingBreakdown?.valid
                ? COLORS.PRIMARY
                : COLORS.TEXT_LIGHT,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: scheduleValidation?.valid && pricingBreakdown?.valid ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => {
              if (scheduleValidation?.valid && pricingBreakdown?.valid) {
                e.target.style.background = COLORS.PRIMARY_HOVER;
              }
            }}
            onMouseLeave={(e) => {
              if (scheduleValidation?.valid && pricingBreakdown?.valid) {
                e.target.style.background = COLORS.PRIMARY;
              }
            }}
          >
            {pricingBreakdown?.valid && pricingBreakdown?.pricePerNight
              ? `Create Proposal at $${Number.isInteger(pricingBreakdown.pricePerNight) ? pricingBreakdown.pricePerNight : pricingBreakdown.pricePerNight.toFixed(2)}/night`
              : 'Update Split Schedule Above'}
          </button>
        </div>
      </main>

      {/* Tutorial Modal */}
      {showTutorialModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setShowTutorialModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '500px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTutorialModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: COLORS.TEXT_LIGHT
              }}
            >
              ×
            </button>

            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              marginBottom: '1rem',
              color: COLORS.TEXT_DARK
            }}>
              How to set a split schedule
            </h2>

            <p style={{
              lineHeight: '1.6',
              color: COLORS.TEXT_LIGHT,
              marginBottom: '1.5rem'
            }}>
              To create a valid split schedule, you must select consecutive days (for example, Monday through Friday).
              Non-consecutive selections like Monday, Wednesday, Friday are not allowed.
            </p>

            <div style={{
              padding: '1rem',
              background: COLORS.BG_LIGHT,
              borderRadius: '8px',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏢</div>
              <div style={{ fontSize: '0.875rem', color: COLORS.TEXT_DARK }}>
                Stay 2-5 nights a week, save up to 50% off of a comparable Airbnb
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setShowTutorialModal(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: COLORS.PRIMARY,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Okay
              </button>
              <button
                onClick={() => window.location.href = '/faq.html'}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'white',
                  color: COLORS.PRIMARY,
                  border: `2px solid ${COLORS.PRIMARY}`,
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Take me to FAQ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {showPhotoModal && listing.photos && listing.photos.length > 0 && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowPhotoModal(false)}
        >
          <button
            onClick={() => setShowPhotoModal(false)}
            style={{
              position: 'absolute',
              top: '2rem',
              right: '2rem',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              fontSize: '2rem',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>

          <img
            src={listing.photos[currentPhotoIndex]?.Photo}
            alt={`${listing.Name} - photo ${currentPhotoIndex + 1}`}
            style={{
              maxWidth: '90vw',
              maxHeight: '80vh',
              objectFit: 'contain'
            }}
            onClick={(e) => e.stopPropagation()}
          />

          <div style={{
            position: 'absolute',
            bottom: '2rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center'
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPhotoIndex(prev => (prev > 0 ? prev - 1 : listing.photos.length - 1));
              }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              ← Previous
            </button>

            <span style={{ color: 'white', fontSize: '0.875rem' }}>
              {currentPhotoIndex + 1} / {listing.photos.length}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPhotoIndex(prev => (prev < listing.photos.length - 1 ? prev + 1 : 0));
              }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Next →
            </button>
          </div>

          <button
            onClick={() => setShowPhotoModal(false)}
            style={{
              position: 'absolute',
              bottom: '2rem',
              background: 'white',
              border: 'none',
              color: COLORS.TEXT_DARK,
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              marginTop: '1rem'
            }}
          >
            Close
          </button>
        </div>
      )}

      {/* Create Proposal Modal */}
      {isProposalModalOpen && (
        <CreateProposalFlow
          listing={listing}
          moveInDate={moveInDate}
          selectedDays={selectedDays}
          reservationSpan={reservationSpan}
          strictMode={strictMode}
          pricingBreakdown={pricingBreakdown}
          onClose={() => setIsProposalModalOpen(false)}
        />
      )}

      <Footer />
    </>
  );
}
