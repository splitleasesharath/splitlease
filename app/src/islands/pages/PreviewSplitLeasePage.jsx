/**
 * Preview Split Lease Page - Host Preview Mode
 * Based on ViewSplitLeasePage but designed for hosts to preview their listing
 * - No proposal creation functionality (booking widget is display-only)
 * - Edit buttons to invoke EditListingDetails component for each section
 * - Host-only access (should verify host owns the listing)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import ListingScheduleSelector from '../shared/ListingScheduleSelector.jsx';
import GoogleMap from '../shared/GoogleMap.jsx';
import { EditListingDetails } from '../shared/EditListingDetails/EditListingDetails.jsx';
import { initializeLookups } from '../../lib/dataLookups.js';
import { checkAuthStatus, validateTokenAndFetchUser } from '../../lib/auth.js';
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
import { DAY_ABBREVIATIONS, DEFAULTS, COLORS, SCHEDULE_PATTERNS } from '../../lib/constants.js';
import { createDay } from '../../lib/scheduleSelector/dayHelpers.js';
import '../../styles/listing-schedule-selector.css';

// ============================================================================
// EDIT BUTTON COMPONENT
// ============================================================================

/**
 * Reusable edit button that appears next to section headers
 */
function EditSectionButton({ onClick, label = 'Edit' }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        background: 'transparent',
        border: `1px solid ${COLORS.PRIMARY}`,
        borderRadius: '6px',
        color: COLORS.PRIMARY,
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginLeft: '10px'
      }}
      onMouseEnter={(e) => {
        e.target.style.background = COLORS.PRIMARY;
        e.target.style.color = 'white';
      }}
      onMouseLeave={(e) => {
        e.target.style.background = 'transparent';
        e.target.style.color = COLORS.PRIMARY;
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
      {label}
    </button>
  );
}

// ============================================================================
// SECTION HEADER WITH EDIT BUTTON
// ============================================================================

function SectionHeader({ title, onEdit, editSection }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      marginBottom: '0.75rem'
    }}>
      <h2 style={{
        fontSize: '1.125rem',
        fontWeight: '600',
        color: COLORS.TEXT_DARK,
        margin: 0
      }}>
        {title}
      </h2>
      {onEdit && (
        <EditSectionButton onClick={() => onEdit(editSection)} />
      )}
    </div>
  );
}

// ============================================================================
// SCHEDULE PATTERN HELPERS
// ============================================================================

function calculateActualWeeks(reservationSpan, weeksOffered) {
  const pattern = (weeksOffered || 'Every week').toLowerCase().trim();

  if (pattern === 'every week' || pattern === '') {
    return {
      actualWeeks: reservationSpan,
      cycleDescription: null,
      showHighlight: false
    };
  }

  if (pattern.includes('one week on') && pattern.includes('one week off')) {
    const cycles = reservationSpan / 2;
    const actualWeeks = Math.floor(cycles);
    return {
      actualWeeks,
      cycleDescription: '1 week on, 1 week off',
      showHighlight: true,
      weeksOn: 1,
      weeksOff: 1
    };
  }

  if (pattern.includes('two weeks on') && pattern.includes('two weeks off')) {
    const cycles = reservationSpan / 4;
    const actualWeeks = Math.floor(cycles * 2);
    return {
      actualWeeks,
      cycleDescription: '2 weeks on, 2 weeks off',
      showHighlight: true,
      weeksOn: 2,
      weeksOff: 2
    };
  }

  if (pattern.includes('one week on') && pattern.includes('three weeks off')) {
    const cycles = reservationSpan / 4;
    const actualWeeks = Math.floor(cycles);
    return {
      actualWeeks,
      cycleDescription: '1 week on, 3 weeks off',
      showHighlight: true,
      weeksOn: 1,
      weeksOff: 3
    };
  }

  return {
    actualWeeks: reservationSpan,
    cycleDescription: null,
    showHighlight: false
  };
}

function SchedulePatternHighlight({ reservationSpan, weeksOffered }) {
  const patternInfo = calculateActualWeeks(reservationSpan, weeksOffered);

  if (!patternInfo.showHighlight) {
    return null;
  }

  return (
    <div style={{
      marginTop: '8px',
      padding: '10px 12px',
      background: 'linear-gradient(135deg, #EDE9FE 0%, #F3E8FF 100%)',
      borderRadius: '8px',
      border: '1px solid #C4B5FD',
      fontSize: '13px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '4px'
      }}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#7C3AED"
          strokeWidth="2"
        >
          <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
        </svg>
        <span style={{
          fontWeight: '600',
          color: '#5B21B6',
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
          fontSize: '11px'
        }}>
          {patternInfo.cycleDescription}
        </span>
      </div>
      <div style={{ color: '#6B21A8' }}>
        <span style={{ fontWeight: '700' }}>{patternInfo.actualWeeks} actual weeks</span>
        <span style={{ color: '#7C3AED' }}> of stay within {reservationSpan}-week span</span>
      </div>
    </div>
  );
}

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
        href="/listing-dashboard"
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
        Back to Dashboard
      </a>
    </div>
  );
}

// ============================================================================
// PHOTO GALLERY COMPONENT
// ============================================================================

function PhotoGallery({ photos, listingName, onPhotoClick, onEdit }) {
  const photoCount = photos.length;

  const getGridStyle = () => {
    if (photoCount === 1) {
      return {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gridTemplateRows: '400px',
        gap: '10px'
      };
    } else if (photoCount === 2) {
      return {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '400px',
        gap: '10px'
      };
    } else if (photoCount === 3) {
      return {
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '200px 200px',
        gap: '10px'
      };
    } else if (photoCount === 4) {
      return {
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '133px 133px 133px',
        gap: '10px'
      };
    } else {
      return {
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr',
        gridTemplateRows: '200px 200px',
        gap: '10px'
      };
    }
  };

  const imageStyle = {
    cursor: 'pointer',
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative'
  };

  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Edit Photos Button */}
      {onEdit && (
        <button
          onClick={() => onEdit('photos')}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            background: 'white',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px',
            color: COLORS.TEXT_DARK
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit Photos
        </button>
      )}

      {photoCount === 1 ? (
        <div style={getGridStyle()}>
          <div onClick={() => onPhotoClick(0)} style={imageStyle}>
            <img src={photos[0].Photo} alt={`${listingName} - main`} style={imgStyle} />
          </div>
        </div>
      ) : photoCount === 2 ? (
        <div style={getGridStyle()}>
          {photos.map((photo, idx) => (
            <div key={photo._id} onClick={() => onPhotoClick(idx)} style={imageStyle}>
              <img src={photo.Photo} alt={`${listingName} - ${idx + 1}`} style={imgStyle} />
            </div>
          ))}
        </div>
      ) : photoCount === 3 ? (
        <div style={getGridStyle()}>
          <div onClick={() => onPhotoClick(0)} style={{ ...imageStyle, gridRow: '1 / 3' }}>
            <img src={photos[0].Photo} alt={`${listingName} - main`} style={imgStyle} />
          </div>
          {photos.slice(1, 3).map((photo, idx) => (
            <div key={photo._id} onClick={() => onPhotoClick(idx + 1)} style={imageStyle}>
              <img src={photo['Photo (thumbnail)'] || photo.Photo} alt={`${listingName} - ${idx + 2}`} style={imgStyle} />
            </div>
          ))}
        </div>
      ) : photoCount === 4 ? (
        <div style={getGridStyle()}>
          <div onClick={() => onPhotoClick(0)} style={{ ...imageStyle, gridRow: '1 / 4' }}>
            <img src={photos[0].Photo} alt={`${listingName} - main`} style={imgStyle} />
          </div>
          {photos.slice(1, 4).map((photo, idx) => (
            <div key={photo._id} onClick={() => onPhotoClick(idx + 1)} style={imageStyle}>
              <img src={photo['Photo (thumbnail)'] || photo.Photo} alt={`${listingName} - ${idx + 2}`} style={imgStyle} />
            </div>
          ))}
        </div>
      ) : (
        <div style={getGridStyle()}>
          <div onClick={() => onPhotoClick(0)} style={{ ...imageStyle, gridRow: '1 / 3' }}>
            <img src={photos[0].Photo} alt={`${listingName} - main`} style={imgStyle} />
          </div>
          {photos.slice(1, 5).map((photo, idx) => (
            <div key={photo._id} onClick={() => onPhotoClick(idx + 1)} style={imageStyle}>
              <img src={photo['Photo (thumbnail)'] || photo.Photo} alt={`${listingName} - ${idx + 2}`} style={imgStyle} />
              {idx === 3 && photoCount > 5 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPhotoClick(0);
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
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <span>Show All Photos</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HOST PREVIEW BANNER
// ============================================================================

function HostPreviewBanner() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #EDE9FE 0%, #FDF4FF 100%)',
      border: '1px solid #C4B5FD',
      borderRadius: '12px',
      padding: '16px 20px',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#7C3AED"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
      <div>
        <div style={{ fontWeight: '600', color: '#5B21B6', marginBottom: '2px' }}>
          Host Preview Mode
        </div>
        <div style={{ fontSize: '13px', color: '#7C3AED' }}>
          This is how guests will see your listing. Click the edit buttons to make changes.
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function PreviewSplitLeasePage() {
  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [listing, setListing] = useState(null);
  const [zatConfig, setZatConfig] = useState(null);
  const [loggedInUserData, setLoggedInUserData] = useState(null);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSection, setEditSection] = useState(null);

  // Booking widget state (display only - no proposal creation)
  const [moveInDate, setMoveInDate] = useState(null);
  const [selectedDayObjects, setSelectedDayObjects] = useState([]);
  const [reservationSpan, setReservationSpan] = useState(13);
  const [priceBreakdown, setPriceBreakdown] = useState(null);

  // Calculate minimum move-in date (2 weeks from today)
  const minMoveInDate = useMemo(() => {
    const today = new Date();
    const twoWeeksFromNow = new Date(today);
    twoWeeksFromNow.setDate(today.getDate() + 14);
    return twoWeeksFromNow.toISOString().split('T')[0];
  }, []);

  // Convert Day objects to array of numbers
  const selectedDays = selectedDayObjects.map(day => day.dayOfWeek);

  // UI state
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

  // Section references
  const mapRef = useRef(null);
  const mapSectionRef = useRef(null);
  const commuteSectionRef = useRef(null);
  const amenitiesSectionRef = useRef(null);
  const houseRulesSectionRef = useRef(null);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    async function initialize() {
      try {
        await initializeLookups();

        // Check auth status - but don't redirect, just track it
        // Preview page should work even if auth check fails in new tab
        const isLoggedIn = await checkAuthStatus();
        if (isLoggedIn) {
          const userData = await validateTokenAndFetchUser();
          if (userData) {
            setLoggedInUserData(userData);
          }
        } else {
          console.log('⚠️ PreviewSplitLeasePage: User not authenticated, continuing in read-only mode');
        }

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
        console.error('Error initializing preview page:', err);
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

  // Lazy loading for map
  useEffect(() => {
    if (!mapSectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            setShouldLoadMap(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px', threshold: 0 }
    );

    observer.observe(mapSectionRef.current);
    return () => observer.disconnect();
  }, [listing]);

  // Update document title
  useEffect(() => {
    if (listing?.Name) {
      document.title = `Preview: ${listing.Name} | Split Lease`;
    }
  }, [listing]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const convertDayNamesToNumbers = (dayNames) => {
    if (!dayNames || !Array.isArray(dayNames)) return [0, 1, 2, 3, 4, 5, 6];

    const dayNameMap = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };

    const numbers = dayNames.map(name => dayNameMap[name]).filter(num => num !== undefined);
    return numbers.length > 0 ? numbers : [0, 1, 2, 3, 4, 5, 6];
  };

  const scheduleSelectorListing = useMemo(() => listing ? {
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
  } : null, [listing]);

  // Initialize default days
  useEffect(() => {
    if (selectedDayObjects.length === 0) {
      const defaultDays = DEFAULTS.DEFAULT_SELECTED_DAYS.map(dayNum => createDay(dayNum, true));
      setSelectedDayObjects(defaultDays);
    }
  }, []);

  const scheduleValidation = listing ? validateScheduleSelection(selectedDays, listing) : null;
  const nightsSelected = calculateNightsFromDays(selectedDays);
  const pricingBreakdown = priceBreakdown;

  const priceMessage = !scheduleValidation?.valid || !pricingBreakdown?.valid
    ? getPriceDisplayMessage(selectedDays.length)
    : null;

  const mapListings = useMemo(() => {
    if (!listing || !listing.coordinates) return [];
    return [{
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
    }];
  }, [listing]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleScheduleChange = (newSelectedDays) => {
    setSelectedDayObjects(newSelectedDays);
  };

  const handlePriceChange = useCallback((newPriceBreakdown) => {
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

  const handleOpenEditModal = (section) => {
    setEditSection(section);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditSection(null);
  };

  const handleSaveEdit = async (updatedListing) => {
    // Update the local listing state with the new data
    setListing(prev => ({ ...prev, ...updatedListing }));
    handleCloseEditModal();
  };

  const handleUpdateListing = async (id, updates) => {
    // TODO: Implement API call to update listing
    console.log('Updating listing:', id, updates);
    // For now, just return the updates
    return { ...listing, ...updates };
  };

  const scrollToSection = (sectionRef, shouldZoomMap = false) => {
    if (sectionRef.current) {
      if (shouldZoomMap && !shouldLoadMap) {
        setShouldLoadMap(true);
      }

      const yOffset = -100;
      const element = sectionRef.current;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;

      window.scrollTo({ top: y, behavior: 'smooth' });

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
        paddingTop: 'calc(100px + 2rem)',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 440px',
        gap: '2rem'
      }}>

        {/* LEFT COLUMN - CONTENT */}
        <div className="left-column">

          {/* Host Preview Banner */}
          <HostPreviewBanner />

          {/* Photo Gallery */}
          <section style={{ marginBottom: '2rem' }}>
            {listing.photos && listing.photos.length > 0 ? (
              <PhotoGallery
                photos={listing.photos}
                listingName={listing.Name}
                onPhotoClick={handlePhotoClick}
                onEdit={handleOpenEditModal}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '400px',
                background: COLORS.BG_LIGHT,
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: COLORS.TEXT_LIGHT,
                gap: '12px'
              }}>
                <span>No images available</span>
                <EditSectionButton onClick={() => handleOpenEditModal('photos')} label="Add Photos" />
              </div>
            )}
          </section>

          {/* Listing Header */}
          <section style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: COLORS.TEXT_DARK,
                margin: 0
              }}>
                {listing.Name}
              </h1>
              <EditSectionButton onClick={() => handleOpenEditModal('name')} />
            </div>
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
            gap: '1rem',
            position: 'relative'
          }}>
            <div style={{ position: 'absolute', top: '-30px', right: '0' }}>
              <EditSectionButton onClick={() => handleOpenEditModal('details')} label="Edit Details" />
            </div>
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
                <div>{listing['Features - Qty Bedrooms'] === 0 ? 'Studio' : `${listing['Features - Qty Bedrooms']} Bedroom${listing['Features - Qty Bedrooms'] === 1 ? '' : 's'}`}</div>
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
          <section style={{ marginBottom: '1.5rem' }}>
            <SectionHeader
              title="Description of Lodging"
              onEdit={handleOpenEditModal}
              editSection="description"
            />
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
            <section style={{ marginBottom: '1.5rem' }}>
              <SectionHeader
                title="Storage"
                onEdit={handleOpenEditModal}
                editSection="details"
              />
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
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ minWidth: '24px', minHeight: '24px', color: COLORS.PRIMARY }}
                  >
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
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
            <section style={{ marginBottom: '1.5rem' }}>
              <SectionHeader
                title="Neighborhood"
                onEdit={handleOpenEditModal}
                editSection="neighborhood"
              />
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
            <section ref={commuteSectionRef} style={{ marginBottom: '1.5rem' }}>
              <SectionHeader
                title="Commute"
                onEdit={handleOpenEditModal}
                editSection="details"
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {listing.parkingOption && (
                  <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ minWidth: '24px', minHeight: '24px', color: COLORS.PRIMARY }}
                    >
                      <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"></path>
                      <circle cx="6.5" cy="16.5" r="2.5"></circle>
                      <circle cx="16.5" cy="16.5" r="2.5"></circle>
                    </svg>
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
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ minWidth: '24px', minHeight: '24px', color: COLORS.PRIMARY }}
                    >
                      <rect x="3" y="6" width="18" height="11" rx="2"></rect>
                      <path d="M7 15h.01M17 15h.01M8 6v5M16 6v5"></path>
                      <path d="M3 12h18"></path>
                    </svg>
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
            <section ref={amenitiesSectionRef} style={{ marginBottom: '1.5rem' }}>
              <SectionHeader
                title="Amenities"
                onEdit={handleOpenEditModal}
                editSection="amenities"
              />

              {listing.amenitiesInUnit?.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: COLORS.TEXT_LIGHT, textTransform: 'uppercase', letterSpacing: '0.5px' }}>In-Unit</h3>
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
                  <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: COLORS.TEXT_LIGHT, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Safety Features</h3>
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
            <section ref={houseRulesSectionRef} style={{ marginBottom: '1.5rem' }}>
              <SectionHeader
                title="House Rules"
                onEdit={handleOpenEditModal}
                editSection="rules"
              />
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
          <section ref={mapSectionRef} style={{ marginBottom: '1.5rem' }}>
            <SectionHeader
              title="Map"
              onEdit={handleOpenEditModal}
              editSection="location"
            />
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
                  listings={mapListings}
                  filteredListings={mapListings}
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

          {/* Cancellation Policy */}
          {listing.cancellationPolicy && (
            <section style={{ marginBottom: '1.5rem' }}>
              <SectionHeader
                title="Cancellation Policy"
                onEdit={handleOpenEditModal}
                editSection="availability"
              />
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

                {listing.cancellationPolicy.bestCaseText && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: '600', color: '#16a34a', marginBottom: '0.25rem' }}>
                      Best Case
                    </div>
                    <div style={{ color: COLORS.TEXT_LIGHT, fontSize: '0.9375rem', lineHeight: '1.6' }}>
                      {listing.cancellationPolicy.bestCaseText}
                    </div>
                  </div>
                )}

                {listing.cancellationPolicy.mediumCaseText && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: '600', color: '#ea580c', marginBottom: '0.25rem' }}>
                      Medium Case
                    </div>
                    <div style={{ color: COLORS.TEXT_LIGHT, fontSize: '0.9375rem', lineHeight: '1.6' }}>
                      {listing.cancellationPolicy.mediumCaseText}
                    </div>
                  </div>
                )}

                {listing.cancellationPolicy.worstCaseText && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: '600', color: '#dc2626', marginBottom: '0.25rem' }}>
                      Worst Case
                    </div>
                    <div style={{ color: COLORS.TEXT_LIGHT, fontSize: '0.9375rem', lineHeight: '1.6' }}>
                      {listing.cancellationPolicy.worstCaseText}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN - BOOKING WIDGET (Preview Only) */}
        <div
          className="booking-widget"
          style={{
            position: isMobile ? 'static' : 'sticky',
            top: isMobile ? 'auto' : 'calc(80px + 20px)',
            alignSelf: 'flex-start',
            maxHeight: 'calc(100vh - 80px - 40px)',
            overflowY: 'auto',
            height: 'fit-content',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            padding: '28px',
            background: 'white',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 1px rgba(0, 0, 0, 0.05)',
            backdropFilter: 'blur(10px)'
          }}
        >
          {/* Preview Mode Indicator */}
          <div style={{
            background: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)',
            border: '1px solid #22C55E',
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16A34A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#166534' }}>
              Host View - Your Compensation
            </span>
          </div>

          {/* Host Rate Display - Single Price */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            padding: '12px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid #86efac'
          }}>
            {/* Show Weekly or Monthly rate if rental type is Weekly/Monthly */}
            {listing?.['rental type'] === 'Weekly' && listing?.['💰Weekly Host Rate'] ? (
              <>
                <div style={{
                  fontSize: '32px',
                  fontWeight: '800',
                  color: '#166534',
                  letterSpacing: '-1px',
                  display: 'inline-block'
                }}>
                  ${listing['💰Weekly Host Rate']}
                  <span style={{
                    fontSize: '16px',
                    color: '#6B7280',
                    fontWeight: '500'
                  }}>/week</span>
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                  Your weekly host rate
                </div>
              </>
            ) : listing?.['rental type'] === 'Monthly' && listing?.['💰Monthly Host Rate'] ? (
              <>
                <div style={{
                  fontSize: '32px',
                  fontWeight: '800',
                  color: '#166534',
                  letterSpacing: '-1px',
                  display: 'inline-block'
                }}>
                  ${listing['💰Monthly Host Rate']}
                  <span style={{
                    fontSize: '16px',
                    color: '#6B7280',
                    fontWeight: '500'
                  }}>/month</span>
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                  Your monthly host rate
                </div>
              </>
            ) : (
              <>
                <div style={{
                  fontSize: '32px',
                  fontWeight: '800',
                  color: '#166534',
                  letterSpacing: '-1px',
                  display: 'inline-block'
                }}>
                  {(() => {
                    // Get the host rate based on nights selected
                    const rateKey = `💰Nightly Host Rate for ${nightsSelected} nights`;
                    const rate = listing?.[rateKey] || listing?.['💰Nightly Host Rate for 4 nights'];
                    return rate ? `$${rate}` : 'Select Days';
                  })()}
                  <span style={{
                    fontSize: '16px',
                    color: '#6B7280',
                    fontWeight: '500'
                  }}>/night</span>
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                  Your rate for {nightsSelected} nights selected
                </div>
              </>
            )}
          </div>

          {/* Move-in Date */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#31135d',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Ideal Move-In
              <svg
                style={{ width: '16px', height: '16px', color: '#9CA3AF' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </label>
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
                background: 'white',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}
            />
          </div>

          {/* Weekly Schedule Selector */}
          {scheduleSelectorListing && (
            <div style={{
              marginBottom: '14px',
              padding: '12px',
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
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#31135d',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Reservation Span
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
                  appearance: 'none',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
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
                borderTop: '5px solid #31135d',
                pointerEvents: 'none'
              }}></div>
            </div>
            <SchedulePatternHighlight
              reservationSpan={reservationSpan}
              weeksOffered={listing?.['Weeks offered']}
            />
          </div>

          {/* Host Compensation Estimate */}
          <div style={{
            marginBottom: '12px',
            padding: '12px',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
            borderRadius: '10px',
            border: '1px solid #86efac'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '15px',
              marginBottom: '8px'
            }}>
              <span style={{ color: '#111827', fontWeight: '500' }}>4-Week Compensation</span>
              <span style={{ color: '#166534', fontWeight: '700', fontSize: '16px' }}>
                {(() => {
                  if (listing?.['rental type'] === 'Weekly' && listing?.['💰Weekly Host Rate']) {
                    return formatPrice(listing['💰Weekly Host Rate'] * 4);
                  } else if (listing?.['rental type'] === 'Monthly' && listing?.['💰Monthly Host Rate']) {
                    return formatPrice(listing['💰Monthly Host Rate']);
                  } else {
                    const rateKey = `💰Nightly Host Rate for ${nightsSelected} nights`;
                    const rate = listing?.[rateKey] || listing?.['💰Nightly Host Rate for 4 nights'];
                    return rate ? formatPrice(rate * nightsSelected * 4) : 'Select Days';
                  }
                })()}
              </span>
            </div>
          </div>

          {/* Total Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderTop: '2px solid #E5E7EB',
            marginBottom: '10px'
          }}>
            <span style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#111827'
            }}>Est. {reservationSpan}-Week Total</span>
            <span style={{
              fontSize: '28px',
              fontWeight: '800',
              color: '#166534'
            }}>
              {(() => {
                if (listing?.['rental type'] === 'Weekly' && listing?.['💰Weekly Host Rate']) {
                  return formatPrice(listing['💰Weekly Host Rate'] * reservationSpan);
                } else if (listing?.['rental type'] === 'Monthly' && listing?.['💰Monthly Host Rate']) {
                  return formatPrice(listing['💰Monthly Host Rate'] * (reservationSpan / 4));
                } else {
                  const rateKey = `💰Nightly Host Rate for ${nightsSelected} nights`;
                  const rate = listing?.[rateKey] || listing?.['💰Nightly Host Rate for 4 nights'];
                  return rate ? formatPrice(rate * nightsSelected * reservationSpan) : 'Select Days';
                }
              })()}
            </span>
          </div>

          {/* Back to Dashboard Button */}
          <button
            onClick={() => window.location.href = `/listing-dashboard.html?id=${listing?._id}`}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #31135d 0%, #4c1d95 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 12px rgba(49, 19, 93, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </main>

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
            x
          </button>

          <img
            src={listing.photos[currentPhotoIndex]?.Photo}
            alt={`${listing.Name} - photo ${currentPhotoIndex + 1}`}
            style={{
              maxWidth: isMobile ? '95vw' : '90vw',
              maxHeight: isMobile ? '75vh' : '80vh',
              objectFit: 'contain',
              marginBottom: isMobile ? '6rem' : '5rem'
            }}
            onClick={(e) => e.stopPropagation()}
          />

          <div style={{
            position: 'absolute',
            bottom: isMobile ? '4rem' : '5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: isMobile ? '0.5rem' : '1.5rem',
            alignItems: 'center',
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
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Previous
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
              Next
            </button>
          </div>

          <button
            onClick={() => setShowPhotoModal(false)}
            style={{
              position: 'absolute',
              bottom: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'white',
              border: 'none',
              color: COLORS.TEXT_DARK,
              padding: '0.75rem 2.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              zIndex: 1001
            }}
          >
            Close
          </button>
        </div>
      )}

      {/* Edit Listing Details Modal */}
      {editModalOpen && listing && (
        <EditListingDetails
          listing={listing}
          editSection={editSection}
          onClose={handleCloseEditModal}
          onSave={handleSaveEdit}
          updateListing={handleUpdateListing}
        />
      )}

      <Footer />
    </>
  );
}
