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
import CreateProposalFlowV2 from '../shared/CreateProposalFlowV2.jsx';
import ListingScheduleSelector from '../shared/ListingScheduleSelector.jsx';
import GoogleMap from '../shared/GoogleMap.jsx';
import ContactHostMessaging from '../shared/ContactHostMessaging.jsx';
import InformationalText from '../shared/InformationalText.jsx';
import SignUpLoginModal from '../shared/SignUpLoginModal.jsx';
import ProposalSuccessModal from '../modals/ProposalSuccessModal.jsx';
import { initializeLookups } from '../../lib/dataLookups.js';
import { checkAuthStatus, validateTokenAndFetchUser, getSessionId } from '../../lib/auth.js';
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
import { supabase } from '../../lib/supabase.js';
import { adaptDaysToBubble } from '../../logic/processors/external/adaptDaysToBubble.js';
import '../../styles/listing-schedule-selector.css';
import '../../styles/components/toast.css';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get initial schedule selection from URL parameter
 * URL format: ?days-selected=1,2,3,4 (1-based, where 1=Sunday)
 * Returns: Array of Day objects (0-based, where 0=Sunday)
 */
function getInitialScheduleFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const daysParam = urlParams.get('days-selected');

  if (!daysParam) {
    console.log('📅 ViewSplitLeasePage: No days-selected URL param, using empty initial selection');
    return [];
  }

  try {
    // Parse 1-based indices from URL and convert to 0-based
    const oneBased = daysParam.split(',').map(d => parseInt(d.trim(), 10));
    const zeroBased = oneBased
      .filter(d => d >= 1 && d <= 7) // Validate 1-based range
      .map(d => d - 1); // Convert to 0-based (1→0, 2→1, etc.)

    if (zeroBased.length > 0) {
      // Convert to Day objects using createDay
      const dayObjects = zeroBased.map(dayIndex => createDay(dayIndex, true));
      console.log('📅 ViewSplitLeasePage: Loaded schedule from URL:', {
        urlParam: daysParam,
        oneBased,
        zeroBased,
        dayObjects: dayObjects.map(d => d.name)
      });
      return dayObjects;
    }
  } catch (e) {
    console.warn('⚠️ ViewSplitLeasePage: Failed to parse days-selected URL parameter:', e);
  }

  return [];
}

/**
 * Fetch informational texts from Supabase
 */
async function fetchInformationalTexts() {
  // Use environment variables instead of hardcoded values
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase environment variables');
    return {};
  }

  try {
    console.log('🔍 Fetching informational texts from Supabase...');
    console.log('🌐 Using Supabase URL:', SUPABASE_URL);

    // Use select=* to get all columns (safer with special characters in column names)
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/informationaltexts?select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('📡 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to fetch informational texts:', response.statusText, errorText);
      return {};
    }

    const data = await response.json();
    console.log('📦 Raw data received:', data?.length, 'items');
    console.log('📦 First item structure:', data?.[0] ? Object.keys(data[0]) : 'No items');

    // Create a lookup object by tag-title
    const textsByTag = {};
    data.forEach((item, index) => {
      const tag = item['Information Tag-Title'];
      if (!tag) {
        console.warn(`⚠️ Item ${index} has no Information Tag-Title:`, item);
        return;
      }

      textsByTag[tag] = {
        id: item._id,
        title: tag,
        desktop: item['Desktop copy'],
        mobile: item['Mobile copy'],
        desktopPlus: item['Desktop+ copy'],
        showMore: item['show more available?']
      };

      // Debug the specific tags we need
      if (tag === 'aligned schedule with move-in' ||
          tag === 'move-in flexibility' ||
          tag === 'Reservation Span') {
        console.log(`✅ Found "${tag}":`, {
          desktop: item['Desktop copy']?.substring(0, 50) + '...',
          mobile: item['Mobile copy']?.substring(0, 50) + '...',
          showMore: item['show more available?']
        });
      }
    });

    console.log('📚 Fetched informational texts:', Object.keys(textsByTag).length, 'total');
    console.log('🎯 Required tags present:', {
      'aligned schedule with move-in': !!textsByTag['aligned schedule with move-in'],
      'move-in flexibility': !!textsByTag['move-in flexibility'],
      'Reservation Span': !!textsByTag['Reservation Span']
    });

    return textsByTag;
  } catch (error) {
    console.error('❌ Error fetching informational texts:', error);
    return {};
  }
}

// ============================================================================
// SCHEDULE PATTERN HELPERS
// ============================================================================

/**
 * Calculate actual weeks from reservation span based on schedule pattern
 * @param {number} reservationSpan - Total weeks in the reservation span
 * @param {string} weeksOffered - Schedule pattern from listing
 * @returns {object} { actualWeeks, cycleDescription, showHighlight }
 */
function calculateActualWeeks(reservationSpan, weeksOffered) {
  // Normalize the pattern string for comparison
  const pattern = (weeksOffered || 'Every week').toLowerCase().trim();

  // Every week or nightly/monthly patterns - no highlighting needed
  if (pattern === 'every week' || pattern === '') {
    return {
      actualWeeks: reservationSpan,
      cycleDescription: null,
      showHighlight: false
    };
  }

  // One week on, one week off - 2 week cycle, guest gets 1 week per cycle
  if (pattern.includes('one week on') && pattern.includes('one week off')) {
    const cycles = reservationSpan / 2;
    const actualWeeks = Math.floor(cycles); // 1 week per 2-week cycle
    return {
      actualWeeks,
      cycleDescription: '1 week on, 1 week off',
      showHighlight: true,
      weeksOn: 1,
      weeksOff: 1
    };
  }

  // Two weeks on, two weeks off - 4 week cycle, guest gets 2 weeks per cycle
  if (pattern.includes('two weeks on') && pattern.includes('two weeks off')) {
    const cycles = reservationSpan / 4;
    const actualWeeks = Math.floor(cycles * 2); // 2 weeks per 4-week cycle
    return {
      actualWeeks,
      cycleDescription: '2 weeks on, 2 weeks off',
      showHighlight: true,
      weeksOn: 2,
      weeksOff: 2
    };
  }

  // One week on, three weeks off - 4 week cycle, guest gets 1 week per cycle
  if (pattern.includes('one week on') && pattern.includes('three weeks off')) {
    const cycles = reservationSpan / 4;
    const actualWeeks = Math.floor(cycles); // 1 week per 4-week cycle
    return {
      actualWeeks,
      cycleDescription: '1 week on, 3 weeks off',
      showHighlight: true,
      weeksOn: 1,
      weeksOff: 3
    };
  }

  // Default: treat as every week
  return {
    actualWeeks: reservationSpan,
    cycleDescription: null,
    showHighlight: false
  };
}

/**
 * Component to display schedule pattern info when applicable
 */
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
// PHOTO GALLERY COMPONENT
// ============================================================================

/**
 * Adaptive photo gallery that adjusts layout based on number of photos
 * - 1 photo: Single large image
 * - 2 photos: Two equal side-by-side
 * - 3 photos: Large left + 2 stacked right
 * - 4 photos: 2x2 grid
 * - 5+ photos: Classic Pinterest layout (large left + 4 smaller right)
 */
function PhotoGallery({ photos, listingName, onPhotoClick }) {
  const photoCount = photos.length;

  // Determine grid style based on photo count
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
      // 5+ photos
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

  // Render based on photo count
  if (photoCount === 1) {
    return (
      <div style={getGridStyle()}>
        <div onClick={() => onPhotoClick(0)} style={imageStyle}>
          <img
            src={photos[0].Photo}
            alt={`${listingName} - main`}
            style={imgStyle}
          />
        </div>
      </div>
    );
  }

  if (photoCount === 2) {
    return (
      <div style={getGridStyle()}>
        {photos.map((photo, idx) => (
          <div key={photo._id} onClick={() => onPhotoClick(idx)} style={imageStyle}>
            <img
              src={photo.Photo}
              alt={`${listingName} - ${idx + 1}`}
              style={imgStyle}
            />
          </div>
        ))}
      </div>
    );
  }

  if (photoCount === 3) {
    return (
      <div style={getGridStyle()}>
        <div
          onClick={() => onPhotoClick(0)}
          style={{ ...imageStyle, gridRow: '1 / 3' }}
        >
          <img
            src={photos[0].Photo}
            alt={`${listingName} - main`}
            style={imgStyle}
          />
        </div>
        {photos.slice(1, 3).map((photo, idx) => (
          <div key={photo._id} onClick={() => onPhotoClick(idx + 1)} style={imageStyle}>
            <img
              src={photo['Photo (thumbnail)'] || photo.Photo}
              alt={`${listingName} - ${idx + 2}`}
              style={imgStyle}
            />
          </div>
        ))}
      </div>
    );
  }

  if (photoCount === 4) {
    return (
      <div style={getGridStyle()}>
        <div
          onClick={() => onPhotoClick(0)}
          style={{ ...imageStyle, gridRow: '1 / 4' }}
        >
          <img
            src={photos[0].Photo}
            alt={`${listingName} - main`}
            style={imgStyle}
          />
        </div>
        {photos.slice(1, 4).map((photo, idx) => (
          <div key={photo._id} onClick={() => onPhotoClick(idx + 1)} style={imageStyle}>
            <img
              src={photo['Photo (thumbnail)'] || photo.Photo}
              alt={`${listingName} - ${idx + 2}`}
              style={imgStyle}
            />
          </div>
        ))}
      </div>
    );
  }

  // 5+ photos - Classic Pinterest layout
  return (
    <div style={getGridStyle()}>
      <div
        onClick={() => onPhotoClick(0)}
        style={{ ...imageStyle, gridRow: '1 / 3' }}
      >
        <img
          src={photos[0].Photo}
          alt={`${listingName} - main`}
          style={imgStyle}
        />
      </div>
      {photos.slice(1, 5).map((photo, idx) => (
        <div key={photo._id} onClick={() => onPhotoClick(idx + 1)} style={imageStyle}>
          <img
            src={photo['Photo (thumbnail)'] || photo.Photo}
            alt={`${listingName} - ${idx + 2}`}
            style={imgStyle}
          />
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
  const [informationalTexts, setInformationalTexts] = useState({});

  // Booking widget state
  const [moveInDate, setMoveInDate] = useState(null);
  const [strictMode, setStrictMode] = useState(false);
  const [selectedDayObjects, setSelectedDayObjects] = useState(() => getInitialScheduleFromUrl()); // Day objects from URL param or empty
  const [reservationSpan, setReservationSpan] = useState(13); // 13 weeks default
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingProposalData, setPendingProposalData] = useState(null);
  const [loggedInUserData, setLoggedInUserData] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successProposalId, setSuccessProposalId] = useState(null);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [existingProposalForListing, setExistingProposalForListing] = useState(null);

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Show toast notification helper
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

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

  // Set initial move-in date if days were loaded from URL
  useEffect(() => {
    if (selectedDayObjects.length > 0 && !moveInDate) {
      const dayNumbers = selectedDayObjects.map(day => day.dayOfWeek);
      const smartDate = calculateSmartMoveInDate(dayNumbers);
      setMoveInDate(smartDate);
      console.log('📅 ViewSplitLeasePage: Set initial move-in date from URL selection:', smartDate);
    }
  }, [selectedDayObjects, moveInDate, calculateSmartMoveInDate]);

  // UI state
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showContactHostModal, setShowContactHostModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    description: false,
    neighborhood: false,
    blockedDates: false
  });

  // Informational text state
  const [activeInfoTooltip, setActiveInfoTooltip] = useState(null);
  const moveInInfoRef = useRef(null);
  const reservationSpanInfoRef = useRef(null);
  const flexibilityInfoRef = useRef(null);

  // Debug: Log when activeInfoTooltip changes
  useEffect(() => {
    console.log('🎯 activeInfoTooltip changed to:', activeInfoTooltip);
    console.log('🔗 Refs status:', {
      moveInInfoRef: !!moveInInfoRef.current,
      reservationSpanInfoRef: !!reservationSpanInfoRef.current,
      flexibilityInfoRef: !!flexibilityInfoRef.current
    });
  }, [activeInfoTooltip]);

  // Debug: Log when informationalTexts are loaded
  useEffect(() => {
    if (Object.keys(informationalTexts).length > 0) {
      console.log('📚 informationalTexts loaded with', Object.keys(informationalTexts).length, 'entries');
      console.log('🎯 Specific tags:', {
        'aligned schedule with move-in': informationalTexts['aligned schedule with move-in'],
        'move-in flexibility': informationalTexts['move-in flexibility'],
        'Reservation Span': informationalTexts['Reservation Span']
      });
    }
  }, [informationalTexts]);

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

        // Check auth status and fetch user data if logged in
        const isLoggedIn = await checkAuthStatus();
        if (isLoggedIn) {
          const userData = await validateTokenAndFetchUser();
          if (userData) {
            setLoggedInUserData(userData);
            console.log('👤 ViewSplitLeasePage: User data loaded:', userData.firstName);
          }
        }

        // Fetch ZAT price configuration
        const zatConfigData = await fetchZatPriceConfiguration();
        setZatConfig(zatConfigData);

        // Fetch informational texts
        const infoTexts = await fetchInformationalTexts();
        setInformationalTexts(infoTexts);

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
  // CHECK FOR EXISTING PROPOSAL
  // ============================================================================

  useEffect(() => {
    // Check if logged-in user already has a proposal for this listing
    async function checkExistingProposal() {
      if (!loggedInUserData?.userId || !listing?._id) {
        setExistingProposalForListing(null);
        return;
      }

      try {
        console.log('🔍 ViewSplitLeasePage: Checking for existing proposals for listing:', listing._id);

        const { data: existingProposals, error } = await supabase
          .from('proposal')
          .select('_id, "Status", "Created Date"')
          .eq('"Guest"', loggedInUserData.userId)
          .eq('"Listing"', listing._id)
          .neq('"Status"', 'Proposal Cancelled by Guest')
          .or('"Deleted".is.null,"Deleted".eq.false')
          .order('"Created Date"', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error checking for existing proposals:', error);
          setExistingProposalForListing(null);
          return;
        }

        if (existingProposals && existingProposals.length > 0) {
          console.log('📋 ViewSplitLeasePage: User already has a proposal for this listing:', existingProposals[0]);
          setExistingProposalForListing(existingProposals[0]);
        } else {
          console.log('✅ ViewSplitLeasePage: No existing proposal found for this listing');
          setExistingProposalForListing(null);
        }
      } catch (err) {
        console.error('Error checking for existing proposals:', err);
        setExistingProposalForListing(null);
      }
    }

    checkExistingProposal();
  }, [loggedInUserData?.userId, listing?._id]);

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
  // Memoize to prevent unnecessary re-renders and map resets
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
  } : null, [listing]);

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

  // Memoize map listings to prevent unnecessary GoogleMap re-renders
  // This prevents the map from resetting when modals open/close
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

  // Submit proposal to backend (after auth is confirmed)
  const submitProposal = async (proposalData) => {
    setIsSubmittingProposal(true);

    try {
      // Get the guest ID (Bubble user _id)
      const guestId = loggedInUserData?.userId || getSessionId();

      if (!guestId) {
        throw new Error('User ID not found. Please log in again.');
      }

      console.log('📤 Submitting proposal to Edge Function...');
      console.log('   Guest ID:', guestId);
      console.log('   Listing ID:', proposalData.listingId);

      // Convert days from JS format (0-6) to Bubble format (1-7)
      // proposalData.daysSelectedObjects contains Day objects with dayOfWeek property
      const daysInJsFormat = proposalData.daysSelectedObjects?.map(d => d.dayOfWeek) || selectedDays;
      const daysInBubbleFormat = adaptDaysToBubble({ zeroBasedDays: daysInJsFormat });

      // Calculate nights from days (nights = days without the last checkout day)
      // For consecutive days [1,2,3,4,5] (Mon-Fri), nights are [1,2,3,4] (Mon-Thu)
      const sortedDays = [...daysInBubbleFormat].sort((a, b) => a - b);
      const nightsInBubbleFormat = sortedDays.slice(0, -1); // Remove last day (checkout day)

      // Get check-in and check-out days in Bubble format
      const checkInDayBubble = sortedDays[0];
      const checkOutDayBubble = sortedDays[sortedDays.length - 1];

      // Format reservation span text
      const reservationSpanWeeks = proposalData.reservationSpan || reservationSpan;
      const reservationSpanText = reservationSpanWeeks === 13
        ? '13 weeks (3 months)'
        : reservationSpanWeeks === 20
          ? '20 weeks (approx. 5 months)'
          : `${reservationSpanWeeks} weeks`;

      // Build the Edge Function payload
      const edgeFunctionPayload = {
        guestId: guestId,
        listingId: proposalData.listingId,
        moveInStartRange: proposalData.moveInDate,
        moveInEndRange: proposalData.moveInDate, // Same as start if no flexibility
        daysSelected: daysInBubbleFormat,
        nightsSelected: nightsInBubbleFormat,
        reservationSpan: reservationSpanText,
        reservationSpanWeeks: reservationSpanWeeks,
        checkIn: checkInDayBubble,
        checkOut: checkOutDayBubble,
        proposalPrice: proposalData.pricePerNight,
        fourWeekRent: proposalData.pricePerFourWeeks,
        hostCompensation: proposalData.pricePerFourWeeks, // Same as 4-week rent for now
        needForSpace: proposalData.needForSpace || '',
        aboutMe: proposalData.aboutYourself || '',
        estimatedBookingTotal: proposalData.totalPrice,
        // Optional fields
        specialNeeds: proposalData.hasUniqueRequirements ? proposalData.uniqueRequirements : '',
        moveInRangeText: proposalData.moveInRange || '',
        flexibleMoveIn: !!proposalData.moveInRange,
        fourWeekCompensation: proposalData.pricePerFourWeeks
      };

      console.log('📋 Edge Function payload:', edgeFunctionPayload);

      // Call the proposal Edge Function (Supabase-native)
      const { data, error } = await supabase.functions.invoke('proposal', {
        body: {
          action: 'create',
          payload: edgeFunctionPayload
        }
      });

      if (error) {
        console.error('❌ Edge Function error:', error);
        throw new Error(error.message || 'Failed to submit proposal');
      }

      if (!data?.success) {
        console.error('❌ Proposal submission failed:', data?.error);
        throw new Error(data?.error || 'Failed to submit proposal');
      }

      console.log('✅ Proposal submitted successfully:', data);
      console.log('   Proposal ID:', data.data?.proposalId);

      // Close the create proposal modal
      setIsProposalModalOpen(false);
      setPendingProposalData(null);

      // Store the proposal ID and show success modal
      const newProposalId = data.data?.proposalId;
      setSuccessProposalId(newProposalId);
      setShowSuccessModal(true);

    } catch (error) {
      console.error('❌ Error submitting proposal:', error);
      showToast(error.message || 'Failed to submit proposal. Please try again.', 'error');
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  // Handle proposal submission - checks auth first
  const handleProposalSubmit = async (proposalData) => {
    console.log('📋 Proposal submission initiated:', proposalData);

    // Check if user is logged in
    const isLoggedIn = await checkAuthStatus();

    if (!isLoggedIn) {
      console.log('🔐 User not logged in, showing auth modal');
      // Store the proposal data for later submission
      setPendingProposalData(proposalData);
      // Close the proposal modal
      setIsProposalModalOpen(false);
      // Open auth modal
      setShowAuthModal(true);
      return;
    }

    // User is logged in, proceed with submission
    console.log('✅ User is logged in, submitting proposal');
    await submitProposal(proposalData);
  };

  // Handle successful authentication
  const handleAuthSuccess = async (authResult) => {
    console.log('🎉 Auth success:', authResult);

    // Close the auth modal
    setShowAuthModal(false);

    // Update the logged-in user data
    try {
      const userData = await validateTokenAndFetchUser();
      if (userData) {
        setLoggedInUserData(userData);
        console.log('👤 User data updated after auth:', userData.firstName);
      }
    } catch (err) {
      console.error('❌ Error fetching user data after auth:', err);
    }

    // If there's a pending proposal, submit it now
    if (pendingProposalData) {
      console.log('📤 Submitting pending proposal after auth');
      // Small delay to ensure auth state is fully updated
      setTimeout(async () => {
        await submitProposal(pendingProposalData);
      }, 500);
    }
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

      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast toast-${toast.type} show`}>
          <span className="toast-icon">
            {toast.type === 'success' && (
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            )}
            {toast.type === 'error' && (
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            )}
          </span>
          <span className="toast-message">{toast.message}</span>
        </div>
      )}

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
              <PhotoGallery photos={listing.photos} listingName={listing.Name} onPhotoClick={handlePhotoClick} />
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
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              marginBottom: '0.75rem',
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
            <section style={{ marginBottom: '1.5rem' }}>
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '0.75rem',
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
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '0.75rem',
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
            <section ref={commuteSectionRef} style={{ marginBottom: '1.5rem' }}>
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '0.75rem',
                color: COLORS.TEXT_DARK
              }}>
                Commute
              </h2>
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
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '0.75rem',
                color: COLORS.TEXT_DARK
              }}>
                Amenities
              </h2>

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
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '0.75rem',
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
          <section ref={mapSectionRef} style={{ marginBottom: '1.5rem' }}>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              marginBottom: '0.75rem',
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

          {/* Host Section */}
          {listing.host && (
            <section style={{ marginBottom: '1.5rem' }}>
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '0.75rem',
                color: COLORS.TEXT_DARK
              }}>
                Meet Your Host
              </h2>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                background: COLORS.BG_LIGHT,
                borderRadius: '10px'
              }}>
                {listing.host['Profile Photo'] && (
                  <img
                    src={listing.host['Profile Photo']}
                    alt={listing.host['Name - First']}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9375rem', fontWeight: '600', marginBottom: '0.125rem' }}>
                    {listing.host['Name - First']} {listing.host['Name - Last']?.charAt(0)}.
                  </div>
                  <div style={{ color: COLORS.TEXT_LIGHT, fontSize: '0.8125rem' }}>Host</div>
                </div>
                <button
                  onClick={() => setShowContactHostModal(true)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: COLORS.PRIMARY,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    boxShadow: '0 2px 6px rgba(49, 19, 93, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = COLORS.PRIMARY_HOVER;
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 3px 8px rgba(49, 19, 93, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = COLORS.PRIMARY;
                    e.target.style.transform = '';
                    e.target.style.boxShadow = '0 2px 6px rgba(49, 19, 93, 0.2)';
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
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span>Message</span>
                </button>
              </div>
            </section>
          )}

          {/* Cancellation Policy */}
          {listing.cancellationPolicy && (
            <section style={{ marginBottom: '1.5rem' }}>
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '0.75rem',
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
            padding: '12px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid #e9d5ff'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #31135d 0%, #31135d 100%)',
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
                fontSize: '16px',
                color: '#6B7280',
                fontWeight: '500',
                background: 'none',
                WebkitTextFillColor: '#6B7280'
              }}>/night</span>
            </div>
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
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Move-in text clicked, current state:', activeInfoTooltip);
                  setActiveInfoTooltip(activeInfoTooltip === 'moveIn' ? null : 'moveIn');
                }}
                style={{ cursor: 'pointer' }}
              >
                Ideal Move-In
              </span>
              <svg
                ref={moveInInfoRef}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Move-in info icon clicked, current state:', activeInfoTooltip);
                  setActiveInfoTooltip(activeInfoTooltip === 'moveIn' ? null : 'moveIn');
                }}
                style={{ width: '16px', height: '16px', color: '#9CA3AF', cursor: 'pointer' }}
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
                  e.target.style.borderColor = '#31135d';
                  e.target.style.boxShadow = '0 4px 6px rgba(49, 19, 93, 0.1)';
                }}
                onMouseLeave={(e) => {
                  if (document.activeElement !== e.target) {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                  }
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#31135d';
                  e.target.style.boxShadow = '0 0 0 4px rgba(49, 19, 93, 0.15)';
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
              marginBottom: '10px',
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
              marginBottom: '14px',
              padding: '12px',
              background: 'linear-gradient(135deg, #f8f9ff 0%, #faf5ff 100%)',
              borderRadius: '10px',
              border: '1px solid #e9d5ff',
              transition: 'all 0.2s ease'
            }}
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
              onChange={() => setStrictMode(!strictMode)}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer',
                accentColor: '#31135d',
                marginTop: '2px',
                flexShrink: 0
              }}
            />
            <label style={{
              fontSize: '14px',
              color: '#111827',
              userSelect: 'none',
              lineHeight: '1.5',
              fontWeight: '500'
            }}>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveInfoTooltip(activeInfoTooltip === 'flexibility' ? null : 'flexibility');
                }}
                style={{ cursor: 'pointer' }}
              >
                Strict (no negotiation on exact move in)
              </span>
              <svg
                ref={flexibilityInfoRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveInfoTooltip(activeInfoTooltip === 'flexibility' ? null : 'flexibility');
                }}
                style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  verticalAlign: 'middle',
                  marginLeft: '2px',
                  opacity: 0.6,
                  cursor: 'pointer'
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
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Reservation span text clicked, current state:', activeInfoTooltip);
                  setActiveInfoTooltip(activeInfoTooltip === 'reservationSpan' ? null : 'reservationSpan');
                }}
                style={{ cursor: 'pointer' }}
              >
                Reservation Span
              </span>
              <svg
                ref={reservationSpanInfoRef}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Reservation span info icon clicked, current state:', activeInfoTooltip);
                  setActiveInfoTooltip(activeInfoTooltip === 'reservationSpan' ? null : 'reservationSpan');
                }}
                style={{ width: '16px', height: '16px', color: '#9CA3AF', cursor: 'pointer' }}
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
                  e.target.style.borderColor = '#31135d';
                  e.target.style.boxShadow = '0 4px 6px rgba(49, 19, 93, 0.1)';
                }}
                onMouseLeave={(e) => {
                  if (document.activeElement !== e.target) {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                  }
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#31135d';
                  e.target.style.boxShadow = '0 0 0 4px rgba(49, 19, 93, 0.15)';
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
                borderTop: '5px solid #31135d',
                pointerEvents: 'none'
              }}></div>
            </div>
            {/* Schedule Pattern Highlight - shows actual weeks for alternating patterns */}
            <SchedulePatternHighlight
              reservationSpan={reservationSpan}
              weeksOffered={listing?.['Weeks offered']}
            />
          </div>

          {/* Price Breakdown */}
          <div style={{
            marginBottom: '12px',
            padding: '12px',
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
            padding: '12px 0',
            borderTop: '2px solid #E5E7EB',
            marginBottom: '10px'
          }}>
            <span style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#111827'
            }}>Reservation Estimated Total</span>
            <span style={{
              fontSize: '28px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #31135d 0%, #31135d 100%)',
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
              if (scheduleValidation?.valid && pricingBreakdown?.valid && !existingProposalForListing) {
                e.target.style.transform = 'scale(0.98)';
                setTimeout(() => {
                  e.target.style.transform = '';
                }, 150);
                handleCreateProposal();
              }
            }}
            disabled={!scheduleValidation?.valid || !pricingBreakdown?.valid || !!existingProposalForListing}
            style={{
              width: '100%',
              padding: '14px',
              background: existingProposalForListing
                ? '#D1D5DB'
                : scheduleValidation?.valid && pricingBreakdown?.valid
                  ? 'linear-gradient(135deg, #31135d 0%, #31135d 100%)'
                  : '#D1D5DB',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: existingProposalForListing || !scheduleValidation?.valid || !pricingBreakdown?.valid ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: !existingProposalForListing && scheduleValidation?.valid && pricingBreakdown?.valid
                ? '0 4px 14px rgba(49, 19, 93, 0.4)'
                : 'none',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (!existingProposalForListing && scheduleValidation?.valid && pricingBreakdown?.valid) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 24px rgba(49, 19, 93, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (!existingProposalForListing && scheduleValidation?.valid && pricingBreakdown?.valid) {
                e.target.style.transform = '';
                e.target.style.boxShadow = '0 4px 14px rgba(49, 19, 93, 0.4)';
              }
            }}
          >
            {existingProposalForListing
              ? 'Proposal Already Exists'
              : pricingBreakdown?.valid && pricingBreakdown?.pricePerNight
                ? `Create Proposal at $${Number.isInteger(pricingBreakdown.pricePerNight) ? pricingBreakdown.pricePerNight : pricingBreakdown.pricePerNight.toFixed(2)}/night`
                : 'Update Split Schedule Above'}
          </button>

          {/* Link to existing proposal */}
          {existingProposalForListing && loggedInUserData?.userId && (
            <a
              href={`/guest-proposals/${loggedInUserData.userId}?proposal=${existingProposalForListing._id}`}
              style={{
                display: 'block',
                textAlign: 'center',
                marginTop: '12px',
                color: '#31135d',
                fontSize: '14px',
                fontWeight: '500',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                e.target.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.target.style.textDecoration = 'none';
              }}
            >
              View your proposal in Dashboard
            </a>
          )}
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
              bottom: isMobile ? '1rem' : '1.5rem',
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
          zatConfig={zatConfig}
          // For ViewSplitLeasePage: User starts on REVIEW if they have proposals OR filled user info
          // This ensures returning users with existing data go straight to review (hub-and-spoke model)
          isFirstProposal={
            !loggedInUserData ||
            (loggedInUserData.proposalCount === 0 && !loggedInUserData.needForSpace && !loggedInUserData.aboutMe)
          }
          existingUserData={loggedInUserData ? {
            needForSpace: loggedInUserData.needForSpace || '',
            aboutYourself: loggedInUserData.aboutMe || '',
            hasUniqueRequirements: !!loggedInUserData.specialNeeds,
            uniqueRequirements: loggedInUserData.specialNeeds || ''
          } : null}
          onClose={() => setIsProposalModalOpen(false)}
          onSubmit={handleProposalSubmit}
        />
      )}

      {/* Auth Modal for Proposal Submission */}
      {showAuthModal && (
        <SignUpLoginModal
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            setPendingProposalData(null);
          }}
          initialView="signup-step1"
          onAuthSuccess={handleAuthSuccess}
          defaultUserType="guest"
          skipReload={true}
        />
      )}

      {/* Proposal Success Modal */}
      {showSuccessModal && (
        <ProposalSuccessModal
          proposalId={successProposalId}
          listingName={listing?.Name}
          onClose={() => {
            setShowSuccessModal(false);
            setSuccessProposalId(null);
          }}
        />
      )}

      {/* Contact Host Messaging Modal */}
      {showContactHostModal && listing && (
        <ContactHostMessaging
          isOpen={showContactHostModal}
          onClose={() => setShowContactHostModal(false)}
          listing={{
            id: listing._id,
            title: listing.Name,
            host: {
              name: listing.host ? `${listing.host['Name - First']} ${listing.host['Name - Last']?.charAt(0)}.` : 'Host'
            }
          }}
          userEmail={loggedInUserData?.email || ''}
          userName={loggedInUserData?.fullName || loggedInUserData?.firstName || ''}
        />
      )}

      {/* Informational Text Tooltips */}
      {(() => {
        console.log('📚 Rendering InformationalText components:', {
          hasAlignedSchedule: !!informationalTexts['aligned schedule with move-in'],
          hasMoveInFlexibility: !!informationalTexts['move-in flexibility'],
          hasReservationSpan: !!informationalTexts['Reservation Span'],
          activeTooltip: activeInfoTooltip,
          alignedScheduleContent: informationalTexts['aligned schedule with move-in']?.desktop,
          moveInFlexibilityContent: informationalTexts['move-in flexibility']?.desktop,
          reservationSpanContent: informationalTexts['Reservation Span']?.desktop
        });
        return null;
      })()}

      {informationalTexts['aligned schedule with move-in'] && (
        <InformationalText
          isOpen={activeInfoTooltip === 'moveIn'}
          onClose={() => setActiveInfoTooltip(null)}
          triggerRef={moveInInfoRef}
          title="Ideal Move-In"
          content={isMobile
            ? informationalTexts['aligned schedule with move-in'].mobile || informationalTexts['aligned schedule with move-in'].desktop
            : informationalTexts['aligned schedule with move-in'].desktop
          }
          expandedContent={informationalTexts['aligned schedule with move-in'].desktopPlus}
          showMoreAvailable={informationalTexts['aligned schedule with move-in'].showMore}
        />
      )}

      {informationalTexts['move-in flexibility'] && (
        <InformationalText
          isOpen={activeInfoTooltip === 'flexibility'}
          onClose={() => setActiveInfoTooltip(null)}
          triggerRef={flexibilityInfoRef}
          title="Move-In Flexibility"
          content={isMobile
            ? informationalTexts['move-in flexibility'].mobile || informationalTexts['move-in flexibility'].desktop
            : informationalTexts['move-in flexibility'].desktop
          }
          expandedContent={informationalTexts['move-in flexibility'].desktopPlus}
          showMoreAvailable={informationalTexts['move-in flexibility'].showMore}
        />
      )}

      {informationalTexts['Reservation Span'] && (
        <InformationalText
          isOpen={activeInfoTooltip === 'reservationSpan'}
          onClose={() => setActiveInfoTooltip(null)}
          triggerRef={reservationSpanInfoRef}
          title="Reservation Span"
          content={isMobile
            ? informationalTexts['Reservation Span'].mobile || informationalTexts['Reservation Span'].desktop
            : informationalTexts['Reservation Span'].desktop
          }
          expandedContent={informationalTexts['Reservation Span'].desktopPlus}
          showMoreAvailable={informationalTexts['Reservation Span'].showMore}
        />
      )}

      <Footer />
    </>
  );
}
