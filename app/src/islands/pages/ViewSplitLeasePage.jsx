/**
 * View Split Lease Page - Complete Rebuild
 * Matches original Bubble.io design with 100% fidelity
 * Architecture: ESM + React Islands pattern
 *
 * IMPORTANT: This is a comprehensive rebuild based on documentation and original page inspection
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import CreateProposalFlow from './ViewSplitLeasePageComponents/CreateProposalFlow.jsx';
import CreateProposalFlowV2 from '../shared/CreateProposalFlowV2.jsx';
import ListingScheduleSelector from '../shared/ListingScheduleSelector.jsx';
import GoogleMap from '../shared/GoogleMap.jsx';
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

  // Calculate minimum move-in date (2 weeks from today)
  const minMoveInDate = useMemo(() => {
    const today = new Date();
    const twoWeeksFromNow = new Date(today);
    twoWeeksFromNow.setDate(today.getDate() + 14);
    return twoWeeksFromNow.toISOString().split('T')[0];
  }, []);

  // Convert Day objects to array of numbers for compatibility with existing code
  const selectedDays = selectedDayObjects.map(day => day.dayOfWeek);

  // Calculate smart default move-in date based on selected days
  // If user selects Wed-Sat, default to next Wednesday after 2 weeks
  const calculateSmartMoveInDate = useCallback((selectedDayNumbers) => {
    if (!selectedDayNumbers || selectedDayNumbers.length === 0) {
      return minMoveInDate;
    }

    // Get the first selected day (check-in day)
    const sortedDays = [...selectedDayNumbers].sort((a, b) => a - b);
    const firstDayOfWeek = sortedDays[0];

    // Start from the minimum date (2 weeks from today)
    const minDate = new Date(minMoveInDate);
    const minDayOfWeek = minDate.getDay();

    // Calculate days to add to get to the next occurrence of the first selected day
    let daysToAdd = (firstDayOfWeek - minDayOfWeek + 7) % 7;

    // If it's the same day, we're already on the right day
    if (daysToAdd === 0) {
      return minMoveInDate;
    }

    // Add the days to get to the next occurrence of the selected day
    const smartDate = new Date(minDate);
    smartDate.setDate(minDate.getDate() + daysToAdd);

    return smartDate.toISOString().split('T')[0];
  }, [minMoveInDate]);

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
  const [shouldLoadMap, setShouldLoadMap] = useState(false);

  // Section references for navigation
  const mapRef = useRef(null);
  const mapSectionRef = useRef(null);
  const commuteSectionRef = useRef(null);
  const amenitiesSectionRef = useRef(null);
  const houseRulesSectionRef = useRef(null);
  const hasAutoZoomedRef = useRef(false); // Track if we've auto-zoomed on initial load

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
        console.log('📋 ViewSplitLeasePage: Listing data fetched:', {
          id: listingData._id,
          name: listingData.Name,
          amenitiesInUnit: listingData.amenitiesInUnit,
          safetyFeatures: listingData.safetyFeatures,
          houseRules: listingData.houseRules,
          coordinates: listingData.coordinates,
          slightlyDifferentAddress: listingData['Location - slightly different address'],
          hasAmenitiesInUnit: listingData.amenitiesInUnit?.length > 0,
          hasSafetyFeatures: listingData.safetyFeatures?.length > 0,
          hasHouseRules: listingData.houseRules?.length > 0,
          hasCoordinates: !!(listingData.coordinates?.lat && listingData.coordinates?.lng)
        });
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
  // LAZY LOADING FOR MAP
  // ============================================================================

  useEffect(() => {
    // Set up Intersection Observer to lazy load the map when user scrolls near it
    if (!mapSectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Load map when section is within 200px of viewport
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            setShouldLoadMap(true);
            // Once loaded, we can stop observing
            observer.disconnect();
          }
        });
      },
      {
        // Start loading when map section is 200px away from viewport
        rootMargin: '200px',
        threshold: 0
      }
    );

    observer.observe(mapSectionRef.current);

    return () => observer.disconnect();
  }, [listing]); // Re-run when listing data is available

  // ============================================================================
  // AUTO-ZOOM MAP ON INITIAL LOAD
  // ============================================================================

  useEffect(() => {
    // Automatically center and zoom the map when it loads for the first time
    // This replicates the behavior of clicking "Located in" link, but without scrolling
    if (shouldLoadMap && mapRef.current && listing && !hasAutoZoomedRef.current) {
      console.log('🗺️ ViewSplitLeasePage: Auto-zooming map on initial load');

      // Wait for map to fully initialize before calling zoomToListing
      // Same 600ms timeout as handleLocationClick
      setTimeout(() => {
        if (mapRef.current && listing) {
          console.log('🗺️ ViewSplitLeasePage: Calling zoomToListing for initial auto-zoom');
          mapRef.current.zoomToListing(listing._id);
          hasAutoZoomedRef.current = true;
        }
      }, 600);
    }
  }, [shouldLoadMap, listing]);

  // ============================================================================
  // UPDATE DOCUMENT TITLE
  // ============================================================================

  useEffect(() => {
    // Update the browser tab title with the listing name
    if (listing?.Name) {
      document.title = `${listing.Name} | Split Lease`;
    }
  }, [listing]);

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

    // Automatically set smart default move-in date when days are selected
    if (dayNumbers.length > 0) {
      const smartDate = calculateSmartMoveInDate(dayNumbers);
      setMoveInDate(smartDate);
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

  const handleProposalSubmit = async (proposalData) => {
    console.log('Proposal submitted:', proposalData);

    // TODO: Integrate with your backend API to submit the proposal
    // Example:
    // try {
    //   const response = await fetch('/api/proposals', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(proposalData)
    //   });
    //
    //   if (response.ok) {
    //     alert('Proposal submitted successfully!');
    //     setIsProposalModalOpen(false);
    //     // Redirect to success page or proposals page
    //   } else {
    //     alert('Failed to submit proposal. Please try again.');
    //   }
    // } catch (error) {
    //   console.error('Error submitting proposal:', error);
    //   alert('An error occurred. Please try again.');
    // }

    // For now, just show success and close modal
    alert('Proposal submitted successfully! (Backend integration pending)');
    setIsProposalModalOpen(false);
  };

  const scrollToSection = (sectionRef, shouldZoomMap = false) => {
    if (sectionRef.current) {
      // If scrolling to map section, ensure map is loaded
      if (shouldZoomMap && !shouldLoadMap) {
        setShouldLoadMap(true);
      }

      // Scroll with offset to account for fixed header (80px height + some padding)
      const yOffset = -100;
      const element = sectionRef.current;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;

      window.scrollTo({ top: y, behavior: 'smooth' });

      // After scrolling, center the map on the listing's location if needed
      if (shouldZoomMap) {
        setTimeout(() => {
          if (mapRef.current && listing) {
            mapRef.current.zoomToListing(listing._id);
          }
        }, 600);
      }
    }
  };

  const handleLocationClick = () => scrollToSection(mapSectionRef, true);
  const handleCommuteClick = () => scrollToSection(commuteSectionRef);
  const handleAmenitiesClick = () => scrollToSection(amenitiesSectionRef);
  const handleHouseRulesClick = () => scrollToSection(houseRulesSectionRef);
  const handleMapClick = () => scrollToSection(mapSectionRef, true);

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
        paddingTop: 'calc(100px + 2rem)', // Increased from 80px to prevent header overlap
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 440px',
        gap: '2rem'
      }}>

        {/* LEFT COLUMN - CONTENT */}
        <div className="left-column">

          {/* Photo Gallery - Magazine Editorial Style */}
          <section style={{ marginBottom: '2rem' }}>
            {listing.photos && listing.photos.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr',
                gridTemplateRows: '200px 200px',
                gap: '10px'
              }}>
                {/* Large image spanning 2 rows on the left */}
                <div
                  onClick={() => handlePhotoClick(0)}
                  style={{
                    gridRow: '1 / 3',
                    cursor: 'pointer',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  <img
                    src={listing.photos[0].Photo}
                    alt={`${listing.Name} - main`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                </div>

                {/* Four smaller images on the right (2x2 grid) */}
                {listing.photos.slice(1, 5).map((photo, idx) => (
                  <div
                    key={photo._id}
                    onClick={() => handlePhotoClick(idx + 1)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    <img
                      src={photo['Photo (thumbnail)'] || photo.Photo}
                      alt={`${listing.Name} - ${idx + 2}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                    {/* Show "Show All Photos" button on the last image if there are more photos */}
                    {idx === 3 && listing.photos.length > 5 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePhotoClick(0);
                        }}
                        style={{
                          position: 'absolute',
                          bottom: '12px',
                          right: '12px',
                          background: 'white',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>📷</span>
                        <span>Show All Photos</span>
                      </button>
                    )}
                  </div>
                ))}

                {/* Fill empty slots if less than 5 photos */}
                {listing.photos.length < 5 && Array.from({ length: 5 - listing.photos.length }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    style={{
                      borderRadius: '12px',
                      background: COLORS.BG_LIGHT,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: COLORS.TEXT_LIGHT,
                      fontSize: '0.875rem'
                    }}
                  >
                    {/* Empty slot */}
                  </div>
                ))}
              </div>
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
                <span
                  onClick={handleLocationClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.color = COLORS.PRIMARY}
                  onMouseLeave={(e) => e.target.style.color = COLORS.TEXT_LIGHT}
                >
                  Located in {listing.resolvedNeighborhood}, {listing.resolvedBorough}
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
                <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '2rem' }}>
                  <img src="/assets/images/fridge.svg" alt="Kitchen" style={{ width: '2rem', height: '2rem' }} />
                </div>
                <div>{listing['Kitchen Type']}</div>
              </div>
            )}
            {listing['Features - Qty Bathrooms'] !== null && (
              <div style={{ textAlign: 'center', padding: '1rem', background: COLORS.BG_LIGHT, borderRadius: '8px' }}>
                <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '2rem' }}>
                  <img src="/assets/images/bath.svg" alt="Bathroom" style={{ width: '2rem', height: '2rem' }} />
                </div>
                <div>{listing['Features - Qty Bathrooms']} Bathroom(s)</div>
              </div>
            )}
            {listing['Features - Qty Bedrooms'] !== null && (
              <div style={{ textAlign: 'center', padding: '1rem', background: COLORS.BG_LIGHT, borderRadius: '8px' }}>
                <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '2rem' }}>
                  <img src="/assets/images/sleeping.svg" alt="Bedroom" style={{ width: '2rem', height: '2rem' }} />
                </div>
                <div>{listing.resolvedTypeOfSpace === 'Studio' ? 'Studio' : `${listing['Features - Qty Bedrooms']} Bedrooms`}</div>
              </div>
            )}
            {listing['Features - Qty Beds'] !== null && (
              <div style={{ textAlign: 'center', padding: '1rem', background: COLORS.BG_LIGHT, borderRadius: '8px' }}>
                <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '2rem' }}>
                  <img src="/assets/images/bed.svg" alt="Bed" style={{ width: '2rem', height: '2rem' }} />
                </div>
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

          {/* Storage Section */}
          {listing.storageOption && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '1rem',
                color: COLORS.TEXT_DARK
              }}>
                Storage
              </h2>
              <div style={{
                padding: '1.5rem',
                background: COLORS.BG_LIGHT,
                borderRadius: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'start',
                  gap: '1rem'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>📦</span>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                      {listing.storageOption.title}
                    </div>
                    <div style={{ color: COLORS.TEXT_LIGHT, fontSize: '0.9375rem' }}>
                      {listing.storageOption.summaryGuest ||
                       'Store your things between stays, ready when you return.'}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Neighborhood Description */}
          {listing['Description - Neighborhood'] && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '1rem',
                color: COLORS.TEXT_DARK
              }}>
                Neighborhood
              </h2>
              <p style={{
                lineHeight: '1.6',
                color: COLORS.TEXT_LIGHT,
                whiteSpace: 'pre-wrap'
              }}>
                {expandedSections.neighborhood
                  ? listing['Description - Neighborhood']
                  : listing['Description - Neighborhood']?.slice(0, 500)}
                {listing['Description - Neighborhood']?.length > 500 &&
                 !expandedSections.neighborhood && '...'}
              </p>
              {listing['Description - Neighborhood']?.length > 500 && (
                <button
                  onClick={() => toggleSection('neighborhood')}
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
                  {expandedSections.neighborhood ? 'Read Less' : 'Read More'}
                </button>
              )}
            </section>
          )}

          {/* Commute Section */}
          {(listing.parkingOption || listing['Time to Station (commute)']) && (
            <section ref={commuteSectionRef} style={{ marginBottom: '2rem' }}>
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
            <section ref={amenitiesSectionRef} style={{ marginBottom: '2rem' }}>
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
            <section ref={houseRulesSectionRef} style={{ marginBottom: '2rem' }}>
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

          {/* Map Section */}
          <section ref={mapSectionRef} style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              marginBottom: '1rem',
              color: COLORS.TEXT_DARK
            }}>
              Map
            </h2>
            <div style={{
              height: '400px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: `1px solid ${COLORS.BG_LIGHT}`,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.BG_LIGHT
            }}>
              {shouldLoadMap ? (
                <GoogleMap
                  ref={mapRef}
                  listings={listing && listing.coordinates ? [{
                    id: listing._id,
                    title: listing.Name,
                    coordinates: listing.coordinates,
                    price: {
                      starting: listing['Standarized Minimum Nightly Price (Filter)'] || 0
                    },
                    location: listing.resolvedBorough,
                    type: listing.resolvedTypeOfSpace,
                    bedrooms: listing['Features - Qty Bedrooms'] || 0,
                    bathrooms: listing['Features - Qty Bathrooms'] || 0,
                    images: listing.photos?.map(p => p.Photo) || [],
                    borough: listing.resolvedBorough
                  }] : []}
                  filteredListings={listing && listing.coordinates ? [{
                    id: listing._id,
                    title: listing.Name,
                    coordinates: listing.coordinates,
                    price: {
                      starting: listing['Standarized Minimum Nightly Price (Filter)'] || 0
                    },
                    location: listing.resolvedBorough,
                    type: listing.resolvedTypeOfSpace,
                    bedrooms: listing['Features - Qty Bedrooms'] || 0,
                    bathrooms: listing['Features - Qty Bathrooms'] || 0,
                    images: listing.photos?.map(p => p.Photo) || [],
                    borough: listing.resolvedBorough
                  }] : []}
                  selectedBorough={listing.resolvedBorough}
                  simpleMode={true}
                  initialZoom={17}
                  disableAutoZoom={false}
                />
              ) : (
                <div style={{
                  color: COLORS.TEXT_LIGHT,
                  fontSize: '0.9rem',
                  textAlign: 'center'
                }}>
                  Loading map...
                </div>
              )}
            </div>
          </section>

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
          {listing.cancellationPolicy && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '1rem',
                color: COLORS.TEXT_DARK
              }}>
                Cancellation Policy
              </h2>
              <div style={{
                padding: '1.5rem',
                background: COLORS.BG_LIGHT,
                borderRadius: '12px',
                border: `1px solid ${COLORS.BG_LIGHT}`
              }}>
                <div style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  color: COLORS.PRIMARY
                }}>
                  {listing.cancellationPolicy.display}
                </div>

                {/* Best Case */}
                {listing.cancellationPolicy.bestCaseText && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: '600', color: '#16a34a', marginBottom: '0.25rem' }}>
                      ✓ Best Case
                    </div>
                    <div style={{ color: COLORS.TEXT_LIGHT, fontSize: '0.9375rem', lineHeight: '1.6' }}>
                      {listing.cancellationPolicy.bestCaseText}
                    </div>
                  </div>
                )}

                {/* Medium Case */}
                {listing.cancellationPolicy.mediumCaseText && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: '600', color: '#ea580c', marginBottom: '0.25rem' }}>
                      ⚠ Medium Case
                    </div>
                    <div style={{ color: COLORS.TEXT_LIGHT, fontSize: '0.9375rem', lineHeight: '1.6' }}>
                      {listing.cancellationPolicy.mediumCaseText}
                    </div>
                  </div>
                )}

                {/* Worst Case */}
                {listing.cancellationPolicy.worstCaseText && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: '600', color: '#dc2626', marginBottom: '0.25rem' }}>
                      ✕ Worst Case
                    </div>
                    <div style={{ color: COLORS.TEXT_LIGHT, fontSize: '0.9375rem', lineHeight: '1.6' }}>
                      {listing.cancellationPolicy.worstCaseText}
                    </div>
                  </div>
                )}

                {/* Summary Texts */}
                {listing.cancellationPolicy.summaryTexts && Array.isArray(listing.cancellationPolicy.summaryTexts) && listing.cancellationPolicy.summaryTexts.length > 0 && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid #e5e7eb` }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                      Summary:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', color: COLORS.TEXT_LIGHT, fontSize: '0.875rem', lineHeight: '1.6' }}>
                      {listing.cancellationPolicy.summaryTexts.map((text, idx) => (
                        <li key={idx} style={{ marginBottom: '0.25rem' }}>{text}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Link to full policy page */}
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid #e5e7eb` }}>
                  <a
                    href="/policies#cancellation-and-refund-policy"
                    style={{
                      color: COLORS.PRIMARY,
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                  >
                    View full cancellation policy →
                  </a>
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
            top: isMobile ? 'auto' : '20px',
            alignSelf: 'flex-start',
            maxHeight: 'calc(100vh - 40px)',
            overflowY: 'auto',
            height: 'fit-content',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            padding: '28px',
            background: 'white',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 1px rgba(0, 0, 0, 0.05)',
            backdropFilter: 'blur(10px)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 24px 70px rgba(0, 0, 0, 0.35), 0 0 1px rgba(0, 0, 0, 0.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 1px rgba(0, 0, 0, 0.05)';
            }
          }}
        >
          {/* Price Display */}
          <div style={{
            background: 'linear-gradient(135deg, #f8f9ff 0%, #faf5ff 100%)',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '22px',
            border: '1px solid #e9d5ff'
          }}>
            <div style={{
              fontSize: '36px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #6B46C1 0%, #9333ea 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-1px',
              display: 'inline-block'
            }}>
              {pricingBreakdown?.valid && pricingBreakdown?.pricePerNight
                ? `$${Number.isInteger(pricingBreakdown.pricePerNight) ? pricingBreakdown.pricePerNight : pricingBreakdown.pricePerNight.toFixed(2)}`
                : 'Select Days'}
              <span style={{
                fontSize: '18px',
                color: '#6B7280',
                fontWeight: '500',
                background: 'none',
                WebkitTextFillColor: '#6B7280'
              }}>/night</span>
            </div>
          </div>

          {/* Move-in Date */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#6B46C1',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Ideal Move-In
              <svg
                style={{ width: '16px', height: '16px', color: '#9CA3AF', cursor: 'help' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </label>
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <input
                type="date"
                value={moveInDate || ''}
                min={minMoveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: '500',
                  color: '#111827',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  background: 'white',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#6B46C1';
                  e.target.style.boxShadow = '0 4px 6px rgba(107, 70, 193, 0.1)';
                }}
                onMouseLeave={(e) => {
                  if (document.activeElement !== e.target) {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                  }
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#6B46C1';
                  e.target.style.boxShadow = '0 0 0 4px rgba(107, 70, 193, 0.15)';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E5E7EB';
                  e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                  e.target.style.transform = '';
                }}
              />
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6B7280',
              lineHeight: '1.4',
              marginBottom: '14px',
              fontWeight: '400',
              paddingLeft: '4px'
            }}>
              Minimum 2 weeks from today. Date auto-updates based on selected days.
            </div>
          </div>

          {/* Strict Mode */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginBottom: '20px',
              padding: '12px',
              background: 'linear-gradient(135deg, #f8f9ff 0%, #faf5ff 100%)',
              borderRadius: '10px',
              border: '1px solid #e9d5ff',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onClick={() => setStrictMode(!strictMode)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #f5f3ff 0%, #faf5ff 100%)';
              e.currentTarget.style.borderColor = '#d8b4fe';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #f8f9ff 0%, #faf5ff 100%)';
              e.currentTarget.style.borderColor = '#e9d5ff';
            }}
          >
            <input
              type="checkbox"
              checked={strictMode}
              onChange={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer',
                accentColor: '#6B46C1',
                marginTop: '2px',
                flexShrink: 0
              }}
            />
            <label style={{
              fontSize: '14px',
              color: '#111827',
              cursor: 'pointer',
              userSelect: 'none',
              lineHeight: '1.5',
              fontWeight: '500'
            }}>
              Strict (no negotiation on exact move in)
              <svg
                style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  verticalAlign: 'middle',
                  marginLeft: '2px',
                  opacity: 0.6
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </label>
          </div>

          {/* Weekly Schedule Selector */}
          {scheduleSelectorListing && (
            <div style={{
              marginBottom: '20px',
              padding: '16px',
              background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
              borderRadius: '12px',
              border: '1px solid #E5E7EB'
            }}>
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
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#6B46C1',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Reservation Span
              <svg
                style={{ width: '16px', height: '16px', color: '#9CA3AF', cursor: 'help' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={reservationSpan}
                onChange={(e) => setReservationSpan(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  paddingRight: '40px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: '500',
                  color: '#111827',
                  background: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  appearance: 'none',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#6B46C1';
                  e.target.style.boxShadow = '0 4px 6px rgba(107, 70, 193, 0.1)';
                }}
                onMouseLeave={(e) => {
                  if (document.activeElement !== e.target) {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                  }
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#6B46C1';
                  e.target.style.boxShadow = '0 0 0 4px rgba(107, 70, 193, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E5E7EB';
                  e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                }}
              >
                {[6, 7, 8, 9, 10, 12, 13, 16, 17, 20, 22, 26].map(weeks => (
                  <option key={weeks} value={weeks}>
                    {weeks} weeks {weeks >= 12 ? `(${Math.floor(weeks / 4)} months)` : ''}
                  </option>
                ))}
              </select>
              <div style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '0',
                height: '0',
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: '5px solid #6B46C1',
                pointerEvents: 'none'
              }}></div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div style={{
            marginBottom: '20px',
            padding: '14px',
            background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)',
            borderRadius: '10px',
            border: '1px solid #E5E7EB'
          }}>
            {console.log('Rendering prices - pricingBreakdown:', pricingBreakdown)}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0',
              fontSize: '15px'
            }}>
              <span style={{ color: '#111827', fontWeight: '500' }}>4-Week Rent</span>
              <span style={{ color: '#111827', fontWeight: '700', fontSize: '16px' }}>
                {pricingBreakdown?.valid && pricingBreakdown?.fourWeekRent
                  ? formatPrice(pricingBreakdown.fourWeekRent)
                  : priceMessage || 'Please Add More Days'}
              </span>
            </div>
          </div>

          {/* Total Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 0',
            borderTop: '2px solid #E5E7EB',
            marginBottom: '20px'
          }}>
            <span style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#111827'
            }}>Reservation Estimated Total</span>
            <span style={{
              fontSize: '28px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #6B46C1 0%, #9333ea 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {pricingBreakdown?.valid && pricingBreakdown?.reservationTotal
                ? formatPrice(pricingBreakdown.reservationTotal)
                : priceMessage || 'Please Add More Days'}
            </span>
          </div>

          {/* Create Proposal Button */}
          <button
            onClick={(e) => {
              if (scheduleValidation?.valid && pricingBreakdown?.valid) {
                e.target.style.transform = 'scale(0.98)';
                setTimeout(() => {
                  e.target.style.transform = '';
                }, 150);
                handleCreateProposal();
              }
            }}
            disabled={!scheduleValidation?.valid || !pricingBreakdown?.valid}
            style={{
              width: '100%',
              padding: '14px',
              background: scheduleValidation?.valid && pricingBreakdown?.valid
                ? 'linear-gradient(135deg, #6B46C1 0%, #9333ea 100%)'
                : '#D1D5DB',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: scheduleValidation?.valid && pricingBreakdown?.valid ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: scheduleValidation?.valid && pricingBreakdown?.valid
                ? '0 4px 14px rgba(107, 70, 193, 0.4)'
                : 'none',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (scheduleValidation?.valid && pricingBreakdown?.valid) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 24px rgba(107, 70, 193, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (scheduleValidation?.valid && pricingBreakdown?.valid) {
                e.target.style.transform = '';
                e.target.style.boxShadow = '0 4px 14px rgba(107, 70, 193, 0.4)';
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
            zIndex: 1000,
            padding: isMobile ? '1rem' : '2rem'
          }}
          onClick={() => setShowPhotoModal(false)}
        >
          <button
            onClick={() => setShowPhotoModal(false)}
            style={{
              position: 'absolute',
              top: isMobile ? '1rem' : '2rem',
              right: isMobile ? '1rem' : '2rem',
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
              justifyContent: 'center',
              zIndex: 1002
            }}
          >
            ×
          </button>

          <img
            src={listing.photos[currentPhotoIndex]?.Photo}
            alt={`${listing.Name} - photo ${currentPhotoIndex + 1}`}
            style={{
              maxWidth: isMobile ? '90vw' : '85vw',
              maxHeight: isMobile ? '60vh' : '70vh',
              objectFit: 'contain',
              marginBottom: isMobile ? '8rem' : '6rem'
            }}
            onClick={(e) => e.stopPropagation()}
          />

          <div style={{
            position: 'absolute',
            bottom: isMobile ? '5rem' : '6rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: isMobile ? '0.5rem' : '1.5rem',
            alignItems: 'center',
            flexWrap: isMobile ? 'nowrap' : 'nowrap',
            zIndex: 1001
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
                padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: isMobile ? '0.875rem' : '1rem',
                whiteSpace: 'nowrap'
              }}
            >
              ← Previous
            </button>

            <span style={{
              color: 'white',
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              whiteSpace: 'nowrap',
              minWidth: isMobile ? '60px' : '80px',
              textAlign: 'center'
            }}>
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
                padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: isMobile ? '0.875rem' : '1rem',
                whiteSpace: 'nowrap'
              }}
            >
              Next →
            </button>
          </div>

          <button
            onClick={() => setShowPhotoModal(false)}
            style={{
              position: 'absolute',
              bottom: isMobile ? '1.5rem' : '2rem',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'white',
              border: 'none',
              color: COLORS.TEXT_DARK,
              padding: isMobile ? '0.5rem 2rem' : '0.75rem 2.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: isMobile ? '0.875rem' : '1rem',
              zIndex: 1001
            }}
          >
            Close
          </button>
        </div>
      )}

      {/* Create Proposal Modal - V2 */}
      {isProposalModalOpen && (
        <CreateProposalFlowV2
          listing={listing}
          moveInDate={moveInDate}
          daysSelected={selectedDayObjects}
          nightsSelected={nightsSelected}
          reservationSpan={reservationSpan}
          pricingBreakdown={priceBreakdown}
          hasExistingUserData={false}
          existingUserData={null}
          onClose={() => setIsProposalModalOpen(false)}
          onSubmit={handleProposalSubmit}
        />
      )}

      <Footer />
    </>
  );
}
