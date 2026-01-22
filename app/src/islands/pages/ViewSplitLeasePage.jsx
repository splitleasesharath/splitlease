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
import CreateProposalFlowV2, { clearProposalDraft } from '../shared/CreateProposalFlowV2.jsx';
import ListingScheduleSelector from '../shared/ListingScheduleSelector.jsx';
import GoogleMap from '../shared/GoogleMap.jsx';
import ContactHostMessaging from '../shared/ContactHostMessaging.jsx';
import InformationalText from '../shared/InformationalText.jsx';
import SignUpLoginModal from '../shared/SignUpLoginModal.jsx';
import ProposalSuccessModal from '../modals/ProposalSuccessModal.jsx';
import FavoriteButton from '../shared/FavoriteButton/FavoriteButton.jsx';
import { initializeLookups } from '../../lib/dataLookups.js';
import { checkAuthStatus, validateTokenAndFetchUser, getSessionId, getUserId, getUserType } from '../../lib/auth.js';
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
import { logger } from '../../lib/logger.js';
import { toast } from '../../lib/toastService.js';
// NOTE: adaptDaysToBubble removed - database now uses 0-indexed days natively
import '../../styles/listing-schedule-selector.css';
import '../../styles/components/toast.css';
import styles from './ViewSplitLeasePage.module.css';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get initial schedule selection from URL parameter
 * URL format: ?days-selected=2,3,4,5,6 (0-based, where 0=Sunday, matching JS Date.getDay())
 * Returns: Array of Day objects (0-based, where 0=Sunday)
 */
function getInitialScheduleFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const daysParam = urlParams.get('days-selected');

  if (!daysParam) {
    logger.debug('📅 ViewSplitLeasePage: No days-selected URL param, using empty initial selection');
    return [];
  }

  try {
    // Parse 0-based indices from URL (matching SearchPage and JS Date.getDay() convention)
    const dayIndices = daysParam.split(',').map(d => parseInt(d.trim(), 10));
    const validDays = dayIndices.filter(d => d >= 0 && d <= 6); // Validate 0-based range (0=Sun...6=Sat)

    if (validDays.length > 0) {
      // Convert to Day objects using createDay
      const dayObjects = validDays.map(dayIndex => createDay(dayIndex, true));
      logger.debug('📅 ViewSplitLeasePage: Loaded schedule from URL:', {
        urlParam: daysParam,
        dayIndices: validDays,
        dayObjects: dayObjects.map(d => d.name)
      });
      return dayObjects;
    }
  } catch (e) {
    logger.warn('⚠️ ViewSplitLeasePage: Failed to parse days-selected URL parameter:', e);
  }

  return [];
}

/**
 * Get initial reservation span from URL parameter
 * URL format: ?reservation-span=13 (weeks)
 * Returns: Number or null if not provided/invalid
 */
function getInitialReservationSpanFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const spanParam = urlParams.get('reservation-span');

  if (!spanParam) return null;

  const parsed = parseInt(spanParam, 10);
  if (!isNaN(parsed) && parsed > 0) {
    logger.debug('📅 ViewSplitLeasePage: Loaded reservation span from URL:', parsed);
    return parsed;
  }

  return null;
}

/**
 * Get initial move-in date from URL parameter
 * URL format: ?move-in=2025-02-15 (YYYY-MM-DD)
 * Returns: String (YYYY-MM-DD) or null if not provided/invalid
 */
function getInitialMoveInFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const moveInParam = urlParams.get('move-in');

  if (!moveInParam) return null;

  // Basic validation: YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(moveInParam)) {
    logger.debug('📅 ViewSplitLeasePage: Loaded move-in date from URL:', moveInParam);
    return moveInParam;
  }

  return null;
}

/**
 * Fetch informational texts from Supabase
 */
async function fetchInformationalTexts() {
  // Use environment variables instead of hardcoded values
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    logger.error('❌ Missing Supabase environment variables');
    return {};
  }

  try {
    logger.debug('🔍 Fetching informational texts from Supabase...');
    logger.debug('🌐 Using Supabase URL:', SUPABASE_URL);

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

    logger.debug('📡 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('❌ Failed to fetch informational texts:', response.statusText, errorText);
      return {};
    }

    const data = await response.json();
    logger.debug('📦 Raw data received:', data?.length, 'items');
    logger.debug('📦 First item structure:', data?.[0] ? Object.keys(data[0]) : 'No items');

    // Create a lookup object by tag-title
    const textsByTag = {};
    data.forEach((item, index) => {
      const tag = item['Information Tag-Title'];
      if (!tag) {
        logger.warn(`⚠️ Item ${index} has no Information Tag-Title:`, item);
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
        logger.debug(`✅ Found "${tag}":`, {
          desktop: item['Desktop copy']?.substring(0, 50) + '...',
          mobile: item['Mobile copy']?.substring(0, 50) + '...',
          showMore: item['show more available?']
        });
      }
    });

    logger.debug('📚 Fetched informational texts:', Object.keys(textsByTag).length, 'total');
    logger.debug('🎯 Required tags present:', {
      'aligned schedule with move-in': !!textsByTag['aligned schedule with move-in'],
      'move-in flexibility': !!textsByTag['move-in flexibility'],
      'Reservation Span': !!textsByTag['Reservation Span']
    });

    return textsByTag;
  } catch (error) {
    logger.error('❌ Error fetching informational texts:', error);
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
    <div className={styles.schedulePatternContainer}>
      <div className={styles.schedulePatternHeader}>
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
        <span className={styles.schedulePatternLabel}>
          {patternInfo.cycleDescription}
        </span>
      </div>
      <div className={styles.schedulePatternContent}>
        <span className={styles.schedulePatternWeeks}>{patternInfo.actualWeeks} actual weeks</span>
        <span className={styles.schedulePatternSpan}> of stay within {reservationSpan}-week span</span>
      </div>
    </div>
  );
}

// ============================================================================
// LOADING AND ERROR STATES
// ============================================================================

function LoadingState() {
  return (
    <div className={styles.loadingStateContainer}>
      <div className={styles.loadingSpinner}></div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className={styles.errorStateContainer}>
      <div className={styles.errorIcon}>⚠️</div>
      <h2 className={styles.errorTitle}>
        Property Not Found
      </h2>
      <p className={styles.errorMessage}>
        {message || 'The property you are looking for does not exist or has been removed.'}
      </p>
      <a href="/search.html" className={styles.errorButton}>
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
function PhotoGallery({ photos, listingName, onPhotoClick, isMobile }) {
  const photoCount = photos.length;

  // On mobile: always show single image with "Show all" button
  if (isMobile) {
    return (
      <div className={styles.photoGalleryMobileContainer}>
        <div onClick={() => onPhotoClick(0)} className={styles.photoGalleryMobileImage}>
          <img
            src={photos[0].Photo}
            alt={`${listingName} - main`}
            className={styles.photoGalleryMobileImg}
          />
        </div>
        {photoCount > 1 && (
          <button onClick={() => onPhotoClick(0)} className={styles.photoGalleryShowAllButton}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Show all {photoCount}
          </button>
        )}
      </div>
    );
  }

  // Desktop: Determine grid class based on photo count
  const getGridClass = () => {
    const baseClass = styles.photoGalleryDesktopGrid;
    if (photoCount === 1) return `${baseClass} ${styles.photoGalleryDesktopGrid1}`;
    if (photoCount === 2) return `${baseClass} ${styles.photoGalleryDesktopGrid2}`;
    if (photoCount === 3) return `${baseClass} ${styles.photoGalleryDesktopGrid3}`;
    if (photoCount === 4) return `${baseClass} ${styles.photoGalleryDesktopGrid4}`;
    return `${baseClass} ${styles.photoGalleryDesktopGrid5Plus}`;
  };

  // Render based on photo count
  if (photoCount === 1) {
    return (
      <div className={getGridClass()}>
        <div onClick={() => onPhotoClick(0)} className={styles.photoGalleryImageWrapper}>
          <img
            src={photos[0].Photo}
            alt={`${listingName} - main`}
            className={styles.photoGalleryImage}
          />
        </div>
      </div>
    );
  }

  if (photoCount === 2) {
    return (
      <div className={getGridClass()}>
        {photos.map((photo, idx) => (
          <div key={photo._id} onClick={() => onPhotoClick(idx)} className={styles.photoGalleryImageWrapper}>
            <img
              src={photo.Photo}
              alt={`${listingName} - ${idx + 1}`}
              className={styles.photoGalleryImage}
            />
          </div>
        ))}
      </div>
    );
  }

  if (photoCount === 3) {
    return (
      <div className={getGridClass()}>
        <div onClick={() => onPhotoClick(0)} className={`${styles.photoGalleryImageWrapper} ${styles.photoGalleryImageWrapperSpan2}`}>
          <img
            src={photos[0].Photo}
            alt={`${listingName} - main`}
            className={styles.photoGalleryImage}
          />
        </div>
        {photos.slice(1, 3).map((photo, idx) => (
          <div key={photo._id} onClick={() => onPhotoClick(idx + 1)} className={styles.photoGalleryImageWrapper}>
            <img
              src={photo['Photo (thumbnail)'] || photo.Photo}
              alt={`${listingName} - ${idx + 2}`}
              className={styles.photoGalleryImage}
            />
          </div>
        ))}
      </div>
    );
  }

  if (photoCount === 4) {
    return (
      <div className={getGridClass()}>
        <div onClick={() => onPhotoClick(0)} className={`${styles.photoGalleryImageWrapper} ${styles.photoGalleryImageWrapperSpan3}`}>
          <img
            src={photos[0].Photo}
            alt={`${listingName} - main`}
            className={styles.photoGalleryImage}
          />
        </div>
        {photos.slice(1, 4).map((photo, idx) => (
          <div key={photo._id} onClick={() => onPhotoClick(idx + 1)} className={styles.photoGalleryImageWrapper}>
            <img
              src={photo['Photo (thumbnail)'] || photo.Photo}
              alt={`${listingName} - ${idx + 2}`}
              className={styles.photoGalleryImage}
            />
          </div>
        ))}
      </div>
    );
  }

  // 5+ photos - Classic Pinterest layout (desktop only, mobile handled above)
  const photosToShow = photos.slice(1, 5);

  return (
    <div className={getGridClass()}>
      <div onClick={() => onPhotoClick(0)} className={`${styles.photoGalleryImageWrapper} ${styles.photoGalleryImageWrapperSpan2}`}>
        <img
          src={photos[0].Photo}
          alt={`${listingName} - main`}
          className={styles.photoGalleryImage}
        />
      </div>
      {photosToShow.map((photo, idx) => (
        <div key={photo._id} onClick={() => onPhotoClick(idx + 1)} className={styles.photoGalleryImageWrapper}>
          <img
            src={photo['Photo (thumbnail)'] || photo.Photo}
            alt={`${listingName} - ${idx + 2}`}
            className={styles.photoGalleryImage}
          />
          {idx === 3 && photoCount > 5 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPhotoClick(0);
              }}
              className={styles.photoGalleryDesktopShowAll}
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

  // Booking widget state - initialize from URL parameters if available
  const [moveInDate, setMoveInDate] = useState(() => getInitialMoveInFromUrl());
  const [strictMode, setStrictMode] = useState(false);
  const [selectedDayObjects, setSelectedDayObjects] = useState(() => getInitialScheduleFromUrl()); // Day objects from URL param or empty
  const [reservationSpan, setReservationSpan] = useState(() => getInitialReservationSpanFromUrl() || 13); // URL value or 13 weeks default
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingProposalData, setPendingProposalData] = useState(null);
  const [loggedInUserData, setLoggedInUserData] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successProposalId, setSuccessProposalId] = useState(null);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [existingProposalForListing, setExistingProposalForListing] = useState(null);

  // Custom schedule state - for users who want to specify a different recurrent pattern
  const [customScheduleDescription, setCustomScheduleDescription] = useState('');
  const [showCustomScheduleInput, setShowCustomScheduleInput] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Favorite state
  const [isFavorited, setIsFavorited] = useState(false);

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
    const daysToAdd = (firstDayOfWeek - minDayOfWeek + 7) % 7;

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
  // Also validate URL-provided move-in date is not before minimum (2 weeks from today)
  useEffect(() => {
    if (selectedDayObjects.length > 0) {
      // If move-in date was provided via URL, validate it's not before minimum
      if (moveInDate) {
        const providedDate = new Date(moveInDate);
        const minDate = new Date(minMoveInDate);

        if (providedDate < minDate) {
          // URL date is in the past, use smart calculation instead
          const dayNumbers = selectedDayObjects.map(day => day.dayOfWeek);
          const smartDate = calculateSmartMoveInDate(dayNumbers);
          setMoveInDate(smartDate);
          logger.debug('📅 ViewSplitLeasePage: URL move-in date was before minimum, using smart date:', smartDate);
        }
      } else {
        // No URL date provided, calculate smart default
        const dayNumbers = selectedDayObjects.map(day => day.dayOfWeek);
        const smartDate = calculateSmartMoveInDate(dayNumbers);
        setMoveInDate(smartDate);
        logger.debug('📅 ViewSplitLeasePage: Set initial move-in date from URL selection:', smartDate);
      }
    }
  }, []); // Run only once on mount - empty deps to prevent recalculation on state changes

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
    logger.debug('🎯 activeInfoTooltip changed to:', activeInfoTooltip);
    logger.debug('🔗 Refs status:', {
      moveInInfoRef: !!moveInInfoRef.current,
      reservationSpanInfoRef: !!reservationSpanInfoRef.current,
      flexibilityInfoRef: !!flexibilityInfoRef.current
    });
  }, [activeInfoTooltip]);

  // Debug: Log when informationalTexts are loaded
  useEffect(() => {
    if (Object.keys(informationalTexts).length > 0) {
      logger.debug('📚 informationalTexts loaded with', Object.keys(informationalTexts).length, 'entries');
      logger.debug('🎯 Specific tags:', {
        'aligned schedule with move-in': informationalTexts['aligned schedule with move-in'],
        'move-in flexibility': informationalTexts['move-in flexibility'],
        'Reservation Span': informationalTexts['Reservation Span']
      });
    }
  }, [informationalTexts]);

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  const [mobileBookingExpanded, setMobileBookingExpanded] = useState(false);

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
          // CRITICAL: Use clearOnFailure: false to preserve session if Edge Function fails
          const userData = await validateTokenAndFetchUser({ clearOnFailure: false });
          if (userData) {
            setLoggedInUserData(userData);
            logger.debug('👤 ViewSplitLeasePage: User data loaded:', userData.firstName);
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
        logger.debug('📋 ViewSplitLeasePage: Listing data fetched:', {
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
        logger.error('Error initializing page:', err);
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
      logger.debug('🗺️ ViewSplitLeasePage: Auto-zooming map on initial load');

      // Wait for map to fully initialize before calling zoomToListing
      // Same 600ms timeout as handleLocationClick
      setTimeout(() => {
        if (mapRef.current && listing) {
          logger.debug('🗺️ ViewSplitLeasePage: Calling zoomToListing for initial auto-zoom');
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
        logger.debug('🔍 ViewSplitLeasePage: Checking for existing proposals for listing:', listing._id);

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
          logger.error('Error checking for existing proposals:', error);
          setExistingProposalForListing(null);
          return;
        }

        if (existingProposals && existingProposals.length > 0) {
          logger.debug('📋 ViewSplitLeasePage: User already has a proposal for this listing:', existingProposals[0]);
          setExistingProposalForListing(existingProposals[0]);
        } else {
          logger.debug('✅ ViewSplitLeasePage: No existing proposal found for this listing');
          setExistingProposalForListing(null);
        }
      } catch (err) {
        logger.error('Error checking for existing proposals:', err);
        setExistingProposalForListing(null);
      }
    }

    checkExistingProposal();
  }, [loggedInUserData?.userId, listing?._id]);

  // Check if listing is favorited
  useEffect(() => {
    async function checkIfFavorited() {
      if (!loggedInUserData?.userId || !listing?._id) {
        setIsFavorited(false);
        return;
      }
      try {
        const { data: userData, error } = await supabase
          .from('user')
          .select('"Favorited Listings"')
          .eq('_id', loggedInUserData.userId)
          .single();
        if (error) {
          setIsFavorited(false);
          return;
        }
        const favorites = userData?.['Favorited Listings'] || [];
        setIsFavorited(favorites.includes(listing._id));
      } catch {
        setIsFavorited(false);
      }
    }
    checkIfFavorited();
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
    logger.debug('=== PRICE CHANGE CALLBACK ===');
    logger.debug('Received price breakdown:', newPriceBreakdown);
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
      toast.warning('Please select a valid contiguous schedule');
      return;
    }

    if (!moveInDate) {
      toast.warning('Please select a move-in date');
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

      logger.debug('📤 Submitting proposal to Edge Function...');
      logger.debug('   Guest ID:', guestId);
      logger.debug('   Listing ID:', proposalData.listingId);

      // Days are already in JS format (0-6) - database now uses 0-indexed natively
      // proposalData.daysSelectedObjects contains Day objects with dayOfWeek property
      const daysInJsFormat = proposalData.daysSelectedObjects?.map(d => d.dayOfWeek) || selectedDays;

      // Sort days in JS format first to detect wrap-around (Saturday/Sunday spanning)
      const sortedJsDays = [...daysInJsFormat].sort((a, b) => a - b);

      // Check for wrap-around case (both Saturday=6 and Sunday=0 present, but not all 7 days)
      const hasSaturday = sortedJsDays.includes(6);
      const hasSunday = sortedJsDays.includes(0);
      const isWrapAround = hasSaturday && hasSunday && daysInJsFormat.length < 7;

      let checkInDayJs, checkOutDayJs, nightsInJsFormat;

      if (isWrapAround) {
        // Find the gap in the sorted selection to determine wrap-around point
        let gapIndex = -1;
        for (let i = 0; i < sortedJsDays.length - 1; i++) {
          if (sortedJsDays[i + 1] - sortedJsDays[i] > 1) {
            gapIndex = i + 1;
            break;
          }
        }

        if (gapIndex !== -1) {
          // Wrap-around: check-in is the first day after the gap, check-out is the last day before gap
          checkInDayJs = sortedJsDays[gapIndex];
          checkOutDayJs = sortedJsDays[gapIndex - 1];

          // Reorder days to be in actual sequence (check-in to check-out)
          // e.g., [0, 6] with gap at index 1 → reorder to [6, 0] (Fri, Sat, Sun)
          const reorderedDays = [...sortedJsDays.slice(gapIndex), ...sortedJsDays.slice(0, gapIndex)];

          // Nights = all days except the last one (checkout day)
          nightsInJsFormat = reorderedDays.slice(0, -1);
        } else {
          // No gap found, use standard logic
          checkInDayJs = sortedJsDays[0];
          checkOutDayJs = sortedJsDays[sortedJsDays.length - 1];
          nightsInJsFormat = sortedJsDays.slice(0, -1);
        }
      } else {
        // Standard case: check-in = first day, check-out = last day
        checkInDayJs = sortedJsDays[0];
        checkOutDayJs = sortedJsDays[sortedJsDays.length - 1];
        // Nights = all days except the last one (checkout day)
        nightsInJsFormat = sortedJsDays.slice(0, -1);
      }

      // Use JS format directly (0-6) - database now uses 0-indexed natively
      const checkInDay = checkInDayJs;
      const checkOutDay = checkOutDayJs;
      const nightsSelected = nightsInJsFormat;

      // Format reservation span text
      const reservationSpanWeeks = proposalData.reservationSpan || reservationSpan;
      const reservationSpanText = reservationSpanWeeks === 13
        ? '13 weeks (3 months)'
        : reservationSpanWeeks === 20
          ? '20 weeks (approx. 5 months)'
          : `${reservationSpanWeeks} weeks`;

      // Build the Edge Function payload (using 0-indexed days)
      const edgeFunctionPayload = {
        guestId: guestId,
        listingId: proposalData.listingId,
        moveInStartRange: proposalData.moveInDate,
        moveInEndRange: proposalData.moveInDate, // Same as start if no flexibility
        daysSelected: daysInJsFormat,
        nightsSelected: nightsSelected,
        reservationSpan: reservationSpanText,
        reservationSpanWeeks: reservationSpanWeeks,
        checkIn: checkInDay,
        checkOut: checkOutDay,
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
        fourWeekCompensation: proposalData.pricePerFourWeeks,
        // Custom schedule description (user's freeform schedule request)
        customScheduleDescription: customScheduleDescription || ''
      };

      logger.debug('📋 Edge Function payload:', edgeFunctionPayload);
      logger.debug('📋 Payload field types:', {
        guestId: typeof edgeFunctionPayload.guestId,
        listingId: typeof edgeFunctionPayload.listingId,
        moveInStartRange: typeof edgeFunctionPayload.moveInStartRange,
        moveInEndRange: typeof edgeFunctionPayload.moveInEndRange,
        daysSelected: { type: typeof edgeFunctionPayload.daysSelected, isArray: Array.isArray(edgeFunctionPayload.daysSelected), value: edgeFunctionPayload.daysSelected },
        nightsSelected: { type: typeof edgeFunctionPayload.nightsSelected, isArray: Array.isArray(edgeFunctionPayload.nightsSelected), value: edgeFunctionPayload.nightsSelected },
        reservationSpan: typeof edgeFunctionPayload.reservationSpan,
        reservationSpanWeeks: typeof edgeFunctionPayload.reservationSpanWeeks,
        checkIn: typeof edgeFunctionPayload.checkIn,
        checkOut: typeof edgeFunctionPayload.checkOut,
        proposalPrice: typeof edgeFunctionPayload.proposalPrice,
        estimatedBookingTotal: typeof edgeFunctionPayload.estimatedBookingTotal,
      });

      // Call the proposal Edge Function (Supabase-native)
      const { data, error } = await supabase.functions.invoke('proposal', {
        body: {
          action: 'create',
          payload: edgeFunctionPayload
        }
      });

      if (error) {
        logger.error('❌ Edge Function error:', error);
        logger.error('❌ Error properties:', Object.keys(error));
        logger.error('❌ Error context:', error.context);

        // Extract actual error message from response context if available
        let errorMessage = error.message || 'Failed to submit proposal';

        // FunctionsHttpError has context.json() method or context as Response
        try {
          if (error.context && typeof error.context.json === 'function') {
            // context is a Response object
            const errorBody = await error.context.json();
            logger.error('❌ Edge Function error body (from json()):', errorBody);
            if (errorBody?.error) {
              errorMessage = errorBody.error;
            }
          } else if (error.context?.body) {
            // context.body might be a ReadableStream or string
            const errorBody = typeof error.context.body === 'string'
              ? JSON.parse(error.context.body)
              : error.context.body;
            logger.error('❌ Edge Function error body (from body):', errorBody);
            if (errorBody?.error) {
              errorMessage = errorBody.error;
            }
          }
        } catch (e) {
          logger.error('❌ Could not parse error body:', e);
        }

        throw new Error(errorMessage);
      }

      if (!data?.success) {
        logger.error('❌ Proposal submission failed:', data?.error);
        throw new Error(data?.error || 'Failed to submit proposal');
      }

      logger.debug('✅ Proposal submitted successfully:', data);
      logger.debug('   Proposal ID:', data.data?.proposalId);

      // Clear the localStorage draft on successful submission
      clearProposalDraft(proposalData.listingId);

      // Close the create proposal modal
      setIsProposalModalOpen(false);
      setPendingProposalData(null);

      // Store the proposal ID and show success modal
      const newProposalId = data.data?.proposalId;
      setSuccessProposalId(newProposalId);
      setShowSuccessModal(true);

      // Update existingProposalForListing so the button disables after modal closes
      setExistingProposalForListing({
        _id: newProposalId,
        Status: 'Pending Host Review',
        'Created Date': new Date().toISOString()
      });

      // Create messaging thread for the proposal (non-blocking)
      // DEBUG: Added diagnostic logging to investigate missing SplitBot messages regression
      try {
        console.log('🔍 [DEBUG] Starting messages Edge Function call...');
        console.log('🔍 [DEBUG] Proposal ID:', newProposalId);
        console.log('🔍 [DEBUG] Guest ID:', guestId);

        logger.debug('💬 Creating proposal messaging thread...');
        // Use the actual status returned from the Edge Function
        const actualProposalStatus = data.data?.status || 'Host Review';
        const actualHostId = data.data?.hostId || listing.host?.userId;
        // Extract AI-generated host summary from proposal response
        const aiHostSummary = data.data?.aiHostSummary || null;

        console.log('🔍 [DEBUG] Thread params prepared:', {
          proposalId: newProposalId,
          guestId: guestId,
          hostId: actualHostId,
          listingId: proposalData.listingId,
          proposalStatus: actualProposalStatus,
          hasAiHostSummary: !!aiHostSummary
        });

        logger.debug('   Thread params:', {
          proposalId: newProposalId,
          guestId: guestId,
          hostId: actualHostId,
          listingId: proposalData.listingId,
          proposalStatus: actualProposalStatus,
          hasAiHostSummary: !!aiHostSummary
        });

        console.log('🔍 [DEBUG] About to call supabase.functions.invoke("messages")...');

        const threadResponse = await supabase.functions.invoke('messages', {
          body: {
            action: 'create_proposal_thread',
            payload: {
              proposalId: newProposalId,
              guestId: guestId,
              hostId: actualHostId,
              listingId: proposalData.listingId,
              proposalStatus: actualProposalStatus,
              // Pass AI host summary so messages handler can use it for host message
              customHostMessage: aiHostSummary
            }
          }
        });

        console.log('🔍 [DEBUG] messages Edge Function returned:', {
          hasError: !!threadResponse.error,
          hasData: !!threadResponse.data,
          error: threadResponse.error,
          data: threadResponse.data
        });

        if (threadResponse.error) {
          console.error('🔍 [DEBUG] Thread creation FAILED:', threadResponse.error);
          logger.warn('⚠️ Thread creation failed (non-blocking):', threadResponse.error);
        } else {
          console.log('🔍 [DEBUG] Thread creation SUCCEEDED:', threadResponse.data);
          logger.debug('✅ Proposal thread created:', threadResponse.data);
        }
      } catch (threadError) {
        // Non-blocking - don't fail the proposal if thread creation fails
        console.error('🔍 [DEBUG] Thread creation EXCEPTION:', threadError);
        console.error('🔍 [DEBUG] Exception name:', threadError?.name);
        console.error('🔍 [DEBUG] Exception message:', threadError?.message);
        console.error('🔍 [DEBUG] Exception stack:', threadError?.stack);
        logger.warn('⚠️ Thread creation error (non-blocking):', threadError);
      }

    } catch (error) {
      logger.error('❌ Error submitting proposal:', error);

      // Provide user-friendly error messages for common failure cases
      let userMessage = error.message || 'Failed to submit proposal. Please try again.';

      // Network/CORS errors (Edge Function unavailable)
      if (error.message?.includes('Failed to send a request') ||
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError')) {
        userMessage = 'Unable to connect to our servers. Please check your internet connection and try again.';
      }
      // Timeout errors
      else if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
        userMessage = 'The request took too long. Please try again.';
      }
      // Duplicate proposal error (from Edge Function validation)
      else if (error.message?.includes('already have an active proposal')) {
        userMessage = error.message; // Keep the specific message
      }

      showToast(userMessage, 'error');
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  // Handle proposal submission - checks auth first
  const handleProposalSubmit = async (proposalData) => {
    logger.debug('📋 Proposal submission initiated:', proposalData);

    // Check if user is logged in
    const isLoggedIn = await checkAuthStatus();

    if (!isLoggedIn) {
      logger.debug('🔐 User not logged in, showing auth modal');
      // Store the proposal data for later submission
      setPendingProposalData(proposalData);
      // Close the proposal modal
      setIsProposalModalOpen(false);
      // Open auth modal
      setShowAuthModal(true);
      return;
    }

    // User is logged in, proceed with submission
    logger.debug('✅ User is logged in, submitting proposal');
    await submitProposal(proposalData);
  };

  // Handle successful authentication
  const handleAuthSuccess = async (authResult) => {
    logger.debug('🎉 Auth success:', authResult);

    // Close the auth modal
    setShowAuthModal(false);

    // Update the logged-in user data
    // CRITICAL: Use clearOnFailure: false to preserve session if Edge Function fails
    try {
      const userData = await validateTokenAndFetchUser({ clearOnFailure: false });
      if (userData) {
        setLoggedInUserData(userData);
        logger.debug('👤 User data updated after auth:', userData.firstName);
      }
    } catch (err) {
      logger.error('❌ Error fetching user data after auth:', err);
    }

    // If there's a pending proposal, submit it now
    if (pendingProposalData) {
      logger.debug('📤 Submitting pending proposal after auth');
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
        <div className="toast-container">
          <div className={`toast toast-${toast.type} show`}>
            {/* Icon */}
            {toast.type === 'success' && (
              <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {toast.type === 'info' && (
              <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12" strokeLinecap="round"/>
                <line x1="12" y1="8" x2="12.01" y2="8" strokeLinecap="round"/>
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round"/>
                <line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round"/>
              </svg>
            )}
            {toast.type === 'warning' && (
              <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round"/>
                <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round"/>
              </svg>
            )}

            {/* Content */}
            <div className="toast-content">
              <h4 className="toast-title">{toast.message}</h4>
            </div>

            {/* Close Button */}
            <button
              className="toast-close"
              onClick={() => setToast({ show: false, message: '', type: 'success' })}
              aria-label="Close notification"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/>
                <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <main className={styles.mainGrid}>

        {/* LEFT COLUMN - CONTENT */}
        <div className={styles.leftColumn}>

          {/* Photo Gallery - Magazine Editorial Style */}
          <section className={styles.section}>
            {listing.photos && listing.photos.length > 0 ? (
              <PhotoGallery photos={listing.photos} listingName={listing.Name} onPhotoClick={handlePhotoClick} isMobile={isMobile} />
            ) : (
              <div className={styles.noImagesPlaceholder}>
                No images available
              </div>
            )}
          </section>

          {/* Listing Header */}
          <section className={styles.section}>
            <h1 className={styles.listingTitle}>
              {listing.Name}
            </h1>
            <div className={styles.listingMeta}>
              {listing.resolvedNeighborhood && listing.resolvedBorough && (
                <span onClick={handleLocationClick} className={styles.locationLink}>
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
          <section className={styles.featuresGrid}>
            {listing['Kitchen Type'] && (
              <div className={styles.featureCard}>
                <div className={styles.featureIconWrapper}>
                  <img src="/assets/images/fridge.svg" alt="Kitchen" className={styles.featureIcon} />
                </div>
                <div className={styles.featureText}>{listing['Kitchen Type']}</div>
              </div>
            )}
            {listing['Features - Qty Bathrooms'] !== null && (
              <div className={styles.featureCard}>
                <div className={styles.featureIconWrapper}>
                  <img src="/assets/images/bath.svg" alt="Bathroom" className={styles.featureIcon} />
                </div>
                <div className={styles.featureText}>{listing['Features - Qty Bathrooms']} Bathroom(s)</div>
              </div>
            )}
            {listing['Features - Qty Bedrooms'] !== null && (
              <div className={styles.featureCard}>
                <div className={styles.featureIconWrapper}>
                  <img src="/assets/images/sleeping.svg" alt="Bedroom" className={styles.featureIcon} />
                </div>
                <div className={styles.featureText}>{listing['Features - Qty Bedrooms'] === 0 ? 'Studio' : `${listing['Features - Qty Bedrooms']} Bedroom${listing['Features - Qty Bedrooms'] === 1 ? '' : 's'}`}</div>
              </div>
            )}
            {listing['Features - Qty Beds'] !== null && (
              <div className={styles.featureCard}>
                <div className={styles.featureIconWrapper}>
                  <img src="/assets/images/bed.svg" alt="Bed" className={styles.featureIcon} />
                </div>
                <div className={styles.featureText}>{listing['Features - Qty Beds']} Bed(s)</div>
              </div>
            )}
          </section>

          {/* Description */}
          <section className={styles.sectionSmall}>
            <h2 className={styles.sectionTitle}>
              Description of Lodging
            </h2>
            <p className={styles.descriptionText}>
              {expandedSections.description
                ? listing.Description
                : listing.Description?.slice(0, 360)}
              {listing.Description?.length > 360 && !expandedSections.description && '...'}
            </p>
            {listing.Description?.length > 360 && (
              <button onClick={() => toggleSection('description')} className={styles.readMoreButton}>
                {expandedSections.description ? 'Read Less' : 'Read More'}
              </button>
            )}
          </section>

          {/* Storage Section */}
          {listing.storageOption && (
            <section className={styles.sectionSmall}>
              <h2 className={styles.sectionTitle}>
                Storage
              </h2>
              <div className={styles.infoCard}>
                <div className={styles.infoCardRow}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={styles.infoCardIcon}
                  >
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                  <div>
                    <div className={styles.infoCardTitle}>
                      {listing.storageOption.title}
                    </div>
                    <div className={styles.infoCardSubtext}>
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
            <section className={styles.sectionSmall}>
              <h2 className={styles.sectionTitle}>
                Neighborhood
              </h2>
              <p className={styles.descriptionText}>
                {expandedSections.neighborhood
                  ? listing['Description - Neighborhood']
                  : listing['Description - Neighborhood']?.slice(0, 500)}
                {listing['Description - Neighborhood']?.length > 500 &&
                 !expandedSections.neighborhood && '...'}
              </p>
              {listing['Description - Neighborhood']?.length > 500 && (
                <button onClick={() => toggleSection('neighborhood')} className={styles.readMoreButton}>
                  {expandedSections.neighborhood ? 'Read Less' : 'Read More'}
                </button>
              )}
            </section>
          )}

          {/* Commute Section */}
          {(listing.parkingOption || listing['Time to Station (commute)']) && (
            <section ref={commuteSectionRef} className={styles.sectionSmall}>
              <h2 className={styles.sectionTitle}>
                Commute
              </h2>
              <div className={styles.commuteList}>
                {listing.parkingOption && (
                  <div className={styles.infoCardRow}>
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={styles.infoCardIcon}
                    >
                      <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"></path>
                      <circle cx="6.5" cy="16.5" r="2.5"></circle>
                      <circle cx="16.5" cy="16.5" r="2.5"></circle>
                    </svg>
                    <div>
                      <div className={styles.infoCardTitle}>{listing.parkingOption.label}</div>
                      <div className={styles.infoCardSubtextSmall}>
                        Convenient parking for your car
                      </div>
                    </div>
                  </div>
                )}
                {listing['Time to Station (commute)'] && (
                  <div className={styles.infoCardRow}>
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={styles.infoCardIcon}
                    >
                      <rect x="3" y="6" width="18" height="11" rx="2"></rect>
                      <path d="M7 15h.01M17 15h.01M8 6v5M16 6v5"></path>
                      <path d="M3 12h18"></path>
                    </svg>
                    <div>
                      <div className={styles.infoCardTitle}>{listing['Time to Station (commute)']} to Metro</div>
                      <div className={styles.infoCardSubtextSmall}>
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
            <section ref={amenitiesSectionRef} className={styles.sectionSmall}>
              <h2 className={styles.sectionTitle}>
                Amenities
              </h2>

              {listing.amenitiesInUnit?.length > 0 && (
                <div className={styles.amenitiesGroup}>
                  <h3 className={styles.amenitiesSubtitle}>In-Unit</h3>
                  <div className={styles.amenitiesGrid}>
                    {listing.amenitiesInUnit.map(amenity => (
                      <div key={amenity.id} className={styles.amenityItem}>
                        {amenity.icon && (
                          <img src={amenity.icon} alt="" className={styles.amenityIcon} />
                        )}
                        <span className={styles.amenityText}>{amenity.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {listing.safetyFeatures?.length > 0 && (
                <div>
                  <h3 className={styles.amenitiesSubtitle}>Safety Features</h3>
                  <div className={styles.amenitiesGrid}>
                    {listing.safetyFeatures.map(feature => (
                      <div key={feature.id} className={styles.amenityItem}>
                        {feature.icon && (
                          <img src={feature.icon} alt="" className={styles.amenityIcon} />
                        )}
                        <span className={styles.amenityText}>{feature.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* House Rules */}
          {listing.houseRules?.length > 0 && (
            <section ref={houseRulesSectionRef} className={styles.sectionSmall}>
              <h2 className={styles.sectionTitle}>
                House Rules
              </h2>
              <div className={styles.houseRulesList}>
                {listing.houseRules.map(rule => (
                  <div key={rule.id} className={styles.houseRuleItem}>
                    {rule.icon && (
                      <img src={rule.icon} alt="" className={styles.houseRuleIcon} />
                    )}
                    <span className={styles.houseRuleText}>{rule.name}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Map Section */}
          <section ref={mapSectionRef} className={styles.sectionSmall}>
            <h2 className={styles.sectionTitle}>
              Map
            </h2>
            <div className={styles.mapContainer}>
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
                <div className={styles.mapPlaceholder}>
                  Loading map...
                </div>
              )}
            </div>
          </section>

          {/* Host Section */}
          {listing.host && (
            <section className={styles.sectionSmall}>
              <h2 className={styles.sectionTitle}>
                Meet Your Host
              </h2>
              <div className={styles.hostCard}>
                {listing.host['Profile Photo'] && (
                  <img
                    src={listing.host['Profile Photo']}
                    alt={listing.host['Name - First']}
                    className={styles.hostPhoto}
                  />
                )}
                <div className={styles.hostInfo}>
                  <div className={styles.hostName}>
                    {listing.host['Name - First']} {listing.host['Name - Last']?.charAt(0)}.
                  </div>
                  <div className={styles.hostLabel}>Host</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {/* Hide Message button for Host users - only Guests can message */}
                  {(loggedInUserData?.userType || getUserType()) !== 'Host' && (
                    <button
                      onClick={() => setShowContactHostModal(true)}
                      style={{
                        padding: isMobile ? '0.375rem 0.75rem' : '0.5rem 1rem',
                        background: COLORS.PRIMARY,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: isMobile ? '0.8125rem' : '0.875rem',
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
                        width={isMobile ? '14' : '16'}
                        height={isMobile ? '14' : '16'}
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
                  )}
                  {listing.host?.userId && (
                    <button
                      onClick={() => window.location.href = '/account-profile'}
                      className={styles.hostButtonSecondary}
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
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      <span>Profile</span>
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Cancellation Policy */}
          {listing.cancellationPolicy && (
            <section className={styles.sectionSmall}>
              <h2 className={styles.sectionTitle}>
                Cancellation Policy
              </h2>
              <div className={styles.cancellationCard}>
                <div className={styles.cancellationTitle}>
                  {listing.cancellationPolicy.display}
                </div>

                {/* Best Case */}
                {listing.cancellationPolicy.bestCaseText && (
                  <div className={styles.cancellationCase}>
                    <div className={styles.cancellationCaseBest}>
                      Best Case
                    </div>
                    <div className={styles.cancellationCaseText}>
                      {listing.cancellationPolicy.bestCaseText}
                    </div>
                  </div>
                )}

                {/* Medium Case */}
                {listing.cancellationPolicy.mediumCaseText && (
                  <div className={styles.cancellationCase}>
                    <div className={styles.cancellationCaseMedium}>
                      Medium Case
                    </div>
                    <div className={styles.cancellationCaseText}>
                      {listing.cancellationPolicy.mediumCaseText}
                    </div>
                  </div>
                )}

                {/* Worst Case */}
                {listing.cancellationPolicy.worstCaseText && (
                  <div className={styles.cancellationCase}>
                    <div className={styles.cancellationCaseWorst}>
                      Worst Case
                    </div>
                    <div className={styles.cancellationCaseText}>
                      {listing.cancellationPolicy.worstCaseText}
                    </div>
                  </div>
                )}

                {/* Summary Texts */}
                {listing.cancellationPolicy.summaryTexts && Array.isArray(listing.cancellationPolicy.summaryTexts) && listing.cancellationPolicy.summaryTexts.length > 0 && (
                  <div className={styles.cancellationSummary}>
                    <div className={styles.cancellationSummaryTitle}>
                      Summary:
                    </div>
                    <ul className={styles.cancellationSummaryList}>
                      {listing.cancellationPolicy.summaryTexts.map((text, idx) => (
                        <li key={idx}>{text}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Link to full policy page */}
                <div className={styles.cancellationLink}>
                  <a href="/policies#cancellation-and-refund-policy" className={styles.cancellationLinkAnchor}>
                    View full cancellation policy
                  </a>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN - BOOKING WIDGET (hidden on mobile) */}
        <div className={`${styles.bookingWidget} ${isMobile ? styles.hiddenMobile : ''}`}>
          {/* Price Display */}
          <div className={styles.bookingPriceDisplay} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div className={styles.bookingPriceAmount}>
              {pricingBreakdown?.valid && pricingBreakdown?.pricePerNight
                ? `$${Number.isInteger(pricingBreakdown.pricePerNight) ? pricingBreakdown.pricePerNight : pricingBreakdown.pricePerNight.toFixed(2)}`
                : 'Select Days'}
              <span className={styles.bookingPriceUnit}>/night</span>
            </div>
            <FavoriteButton
              listingId={listing?._id}
              userId={loggedInUserData?.userId}
              initialFavorited={isFavorited}
              onToggle={(newState) => {
                setIsFavorited(newState);
                const displayName = listing?.name || 'Listing';
                if (newState) {
                  showToast(`${displayName} added to favorites`, 'success');
                } else {
                  showToast(`${displayName} removed from favorites`, 'info');
                }
              }}
              onRequireAuth={() => setShowAuthModal(true)}
              size="large"
              variant="inline"
            />
          </div>

          {/* Move-in Date */}
          <div className={styles.bookingFieldGroup}>
            <label className={styles.bookingLabel}>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  logger.debug('Move-in text clicked, current state:', activeInfoTooltip);
                  setActiveInfoTooltip(activeInfoTooltip === 'moveIn' ? null : 'moveIn');
                }}
                className={styles.bookingLabelClickable}
              >
                Ideal Move-In
              </span>
              <svg
                ref={moveInInfoRef}
                onClick={(e) => {
                  e.stopPropagation();
                  logger.debug('Move-in info icon clicked, current state:', activeInfoTooltip);
                  setActiveInfoTooltip(activeInfoTooltip === 'moveIn' ? null : 'moveIn');
                }}
                className={styles.bookingInfoIcon}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </label>
            <div className={styles.bookingInputWrapper}>
              <input
                type="date"
                value={moveInDate || ''}
                min={minMoveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                className={styles.bookingDateInput}
              />
            </div>
            <div className={styles.bookingHelpText}>
              Minimum 2 weeks from today. Date auto-updates based on selected days.
            </div>
          </div>

          {/* Strict Mode */}
          <div className={styles.bookingCheckboxWrapper}>
            <input
              type="checkbox"
              checked={strictMode}
              onChange={() => setStrictMode(!strictMode)}
              className={styles.bookingCheckbox}
            />
            <label className={styles.bookingCheckboxLabel}>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveInfoTooltip(activeInfoTooltip === 'flexibility' ? null : 'flexibility');
                }}
                className={styles.bookingLabelClickable}
              >
                Strict (no negotiation on exact move in)
              </span>
              <svg
                ref={flexibilityInfoRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveInfoTooltip(activeInfoTooltip === 'flexibility' ? null : 'flexibility');
                }}
                className={styles.bookingInfoIcon}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </label>
          </div>

          {/* Weekly Schedule Selector - Only render on desktop to prevent race conditions with mobile instances */}
          {!isMobile && scheduleSelectorListing && (
            <div className={styles.bookingScheduleWrapper}>
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
          <div className={styles.bookingFieldGroup}>
            <label className={styles.bookingLabel}>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  logger.debug('Reservation span text clicked, current state:', activeInfoTooltip);
                  setActiveInfoTooltip(activeInfoTooltip === 'reservationSpan' ? null : 'reservationSpan');
                }}
                className={styles.bookingLabelClickable}
              >
                Reservation Span
              </span>
              <svg
                ref={reservationSpanInfoRef}
                onClick={(e) => {
                  e.stopPropagation();
                  logger.debug('Reservation span info icon clicked, current state:', activeInfoTooltip);
                  setActiveInfoTooltip(activeInfoTooltip === 'reservationSpan' ? null : 'reservationSpan');
                }}
                className={styles.bookingInfoIcon}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </label>
            <div className={styles.bookingSelectWrapper}>
              <select
                value={reservationSpan}
                onChange={(e) => setReservationSpan(Number(e.target.value))}
                className={styles.bookingSelect}
              >
                {[6, 7, 8, 9, 10, 12, 13, 16, 17, 20, 22, 26].map(weeks => (
                  <option key={weeks} value={weeks}>
                    {weeks} weeks {weeks >= 12 ? `(${Math.floor(weeks / 4)} months)` : ''}
                  </option>
                ))}
              </select>
              <div className={styles.bookingSelectArrow}></div>
            </div>
            {/* Schedule Pattern Highlight - shows actual weeks for alternating patterns */}
            <SchedulePatternHighlight
              reservationSpan={reservationSpan}
              weeksOffered={listing?.['Weeks offered']}
            />
          </div>

          {/* Price Breakdown */}
          <div className={styles.bookingPriceBreakdown}>
            {logger.debug('Rendering prices - pricingBreakdown:', pricingBreakdown)}
            <div className={styles.bookingPriceRow}>
              <span className={styles.bookingPriceLabel}>4-Week Rent</span>
              <span className={styles.bookingPriceValue}>
                {pricingBreakdown?.valid && pricingBreakdown?.fourWeekRent
                  ? formatPrice(pricingBreakdown.fourWeekRent)
                  : priceMessage || 'Please Add More Days'}
              </span>
            </div>
          </div>

          {/* Total Row */}
          <div className={styles.bookingTotalRow}>
            <span className={styles.bookingTotalLabel}>Reservation Estimated Total</span>
            <span className={styles.bookingTotalValue}>
              {pricingBreakdown?.valid && pricingBreakdown?.reservationTotal
                ? formatPrice(pricingBreakdown.reservationTotal)
                : priceMessage || 'Please Add More Days'}
            </span>
          </div>

          {/* Create Proposal Button */}
          <button
            onClick={() => {
              if (scheduleValidation?.valid && pricingBreakdown?.valid && !existingProposalForListing) {
                handleCreateProposal();
              }
            }}
            disabled={!scheduleValidation?.valid || !pricingBreakdown?.valid || !!existingProposalForListing}
            className={`${styles.bookingCreateButton} ${
              !existingProposalForListing && scheduleValidation?.valid && pricingBreakdown?.valid
                ? styles.bookingCreateButtonEnabled
                : styles.bookingCreateButtonDisabled
            }`}
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
              className={styles.bookingExistingProposalLink}
            >
              View your proposal in Dashboard
            </a>
          )}
        </div>
      </main>

      {/* Tutorial Modal */}
      {showTutorialModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowTutorialModal(false)}
        >
          <div
            className={styles.tutorialModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTutorialModal(false)}
              className={styles.tutorialModalClose}
            >
              ×
            </button>

            <h2 className={styles.tutorialModalTitle}>
              How to set a split schedule
            </h2>

            <p className={styles.tutorialModalText}>
              To create a valid split schedule, you must select consecutive days (for example, Monday through Friday).
              Non-consecutive selections like Monday, Wednesday, Friday are not allowed.
            </p>

            <div className={styles.tutorialModalHighlight}>
              <div className={styles.tutorialModalIcon}>🏢</div>
              <div className={styles.tutorialModalDescription}>
                Stay 2-5 nights a week, save up to 50% off of a comparable Airbnb
              </div>
            </div>

            <div className={styles.tutorialModalActions}>
              <button
                onClick={() => setShowTutorialModal(false)}
                className={styles.tutorialModalButtonPrimary}
              >
                Okay
              </button>
              <button
                onClick={() => window.location.href = '/faq.html'}
                className={styles.tutorialModalButtonSecondary}
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
          className={styles.photoModalOverlay}
          onClick={() => setShowPhotoModal(false)}
        >
          <button
            onClick={() => setShowPhotoModal(false)}
            className={styles.photoModalCloseTop}
          >
            ×
          </button>

          <img
            src={listing.photos[currentPhotoIndex]?.Photo}
            alt={`${listing.Name} - photo ${currentPhotoIndex + 1}`}
            className={styles.photoModalImage}
            onClick={(e) => e.stopPropagation()}
          />

          <div className={styles.photoModalControls}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPhotoIndex(prev => (prev > 0 ? prev - 1 : listing.photos.length - 1));
              }}
              className={styles.photoModalNavButton}
            >
              ← Previous
            </button>

            <span className={styles.photoModalCounter}>
              {currentPhotoIndex + 1} / {listing.photos.length}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPhotoIndex(prev => (prev < listing.photos.length - 1 ? prev + 1 : 0));
              }}
              className={styles.photoModalNavButton}
            >
              Next →
            </button>
          </div>

          <button
            onClick={() => setShowPhotoModal(false)}
            className={styles.photoModalCloseBottom}
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
          // For ViewSplitLeasePage: User starts on REVIEW only if they have previous proposals
          // First-time proposers (proposalCount === 0) always see UserDetailsSection first for verification
          isFirstProposal={
            !loggedInUserData || loggedInUserData.proposalCount === 0
          }
          existingUserData={loggedInUserData ? {
            needForSpace: loggedInUserData.needForSpace || '',
            aboutYourself: loggedInUserData.aboutMe || '',
            hasUniqueRequirements: !!loggedInUserData.specialNeeds,
            uniqueRequirements: loggedInUserData.specialNeeds || ''
          } : null}
          onClose={() => setIsProposalModalOpen(false)}
          onSubmit={handleProposalSubmit}
          isSubmitting={isSubmittingProposal}
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
          hasSubmittedRentalApp={loggedInUserData?.hasSubmittedRentalApp ?? false}
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
              userId: listing.host?.userId,  // User's Bubble ID for messaging
              name: listing.host ? `${listing.host['Name - First']} ${listing.host['Name - Last']?.charAt(0)}.` : 'Host'
            }
          }}
          onLoginRequired={() => {
            setShowContactHostModal(false);
            setShowAuthModal(true);
          }}
        />
      )}

      {/* Informational Text Tooltips */}
      {(() => {
        logger.debug('📚 Rendering InformationalText components:', {
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

      {/* Mobile Bottom Booking Bar - hide when proposal modal or photo gallery is open */}
      {isMobile && !isProposalModalOpen && !showPhotoModal && (
        <>
          {/* Overlay when expanded */}
          {mobileBookingExpanded && (
            <div
              onClick={() => setMobileBookingExpanded(false)}
              className={styles.mobileBookingOverlay}
            />
          )}

          {/* Bottom Bar */}
          <div
            className={`${styles.mobileBookingBar} ${mobileBookingExpanded ? styles.mobileBookingBarExpanded : ''}`}
          >
            {/* Collapsed View */}
            {!mobileBookingExpanded ? (
              <div className={styles.mobileBookingCollapsed}>
                {/* Schedule Selector Row */}
                {scheduleSelectorListing && (
                  <div className={styles.mobileBookingScheduleRow}>
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

                {/* Price and Continue Row */}
                <div className={styles.mobileBookingPriceRow}>
                  {/* Price Info */}
                  <div className={styles.mobileBookingPriceInfo} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className={styles.mobileBookingPriceAmount}>
                      {pricingBreakdown?.valid && pricingBreakdown?.pricePerNight
                        ? `$${Number.isInteger(pricingBreakdown.pricePerNight) ? pricingBreakdown.pricePerNight : pricingBreakdown.pricePerNight.toFixed(2)}`
                        : 'Select Days'}
                      <span className={styles.mobileBookingPriceUnit}>/night</span>
                    </div>
                    <FavoriteButton
                      listingId={listing?._id}
                      userId={loggedInUserData?.userId}
                      initialFavorited={isFavorited}
                      onToggle={(newState) => {
                        setIsFavorited(newState);
                        const displayName = listing?.name || 'Listing';
                        if (newState) {
                          showToast(`${displayName} added to favorites`, 'success');
                        } else {
                          showToast(`${displayName} removed from favorites`, 'info');
                        }
                      }}
                      onRequireAuth={() => setShowAuthModal(true)}
                      size="medium"
                      variant="inline"
                    />
                  </div>

                  {/* Continue Button */}
                  <button
                    onClick={() => setMobileBookingExpanded(true)}
                    className={styles.mobileBookingContinueButton}
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              /* Expanded View */
              <div className={styles.mobileBookingExpanded}>
                {/* Header with close button */}
                <div className={styles.mobileBookingHeader}>
                  <h3 className={styles.mobileBookingTitle}>
                    Complete Your Booking
                  </h3>
                  <button
                    onClick={() => setMobileBookingExpanded(false)}
                    className={styles.mobileBookingCloseButton}
                  >
                    ×
                  </button>
                </div>

                {/* Price Display */}
                <div className={styles.mobileBookingPriceDisplay}>
                  <div className={styles.mobileBookingPriceLarge}>
                    {pricingBreakdown?.valid && pricingBreakdown?.pricePerNight
                      ? `$${Number.isInteger(pricingBreakdown.pricePerNight) ? pricingBreakdown.pricePerNight : pricingBreakdown.pricePerNight.toFixed(2)}`
                      : 'Select Days'}
                    <span className={styles.mobileBookingPriceUnit}>/night</span>
                  </div>
                </div>

                {/* Move-in Date */}
                <div className={styles.mobileBookingFieldGroup}>
                  <label className={styles.mobileBookingLabel}>
                    Ideal Move-In
                  </label>
                  <input
                    type="date"
                    value={moveInDate || ''}
                    min={minMoveInDate}
                    onChange={(e) => setMoveInDate(e.target.value)}
                    className={styles.mobileBookingDateInput}
                  />
                </div>

                {/* Strict Mode - placed directly after Move-in Date for visual grouping */}
                <div className={styles.mobileBookingStrictMode}>
                  <input
                    type="checkbox"
                    checked={strictMode}
                    onChange={() => setStrictMode(!strictMode)}
                    className={styles.mobileBookingCheckbox}
                  />
                  <label className={styles.mobileBookingCheckboxLabel}>
                    Strict (no negotiation on exact move in)
                  </label>
                </div>

                {/* Weekly Schedule Selector */}
                {scheduleSelectorListing && (
                  <div className={styles.mobileBookingScheduleWrapper}>
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
                <div className={styles.mobileBookingFieldGroup}>
                  <label className={styles.mobileBookingLabel}>
                    Reservation Span
                  </label>
                  <select
                    value={reservationSpan}
                    onChange={(e) => setReservationSpan(Number(e.target.value))}
                    className={styles.mobileBookingSelectInput}
                  >
                    {[6, 7, 8, 9, 10, 12, 13, 16, 17, 20, 22, 26].map(weeks => (
                      <option key={weeks} value={weeks}>
                        {weeks} weeks {weeks >= 12 ? `(${Math.floor(weeks / 4)} months)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Breakdown */}
                <div className={styles.mobileBookingPriceBreakdown}>
                  <div className={styles.mobileBookingPriceBreakdownRow}>
                    <span className={styles.mobileBookingPriceBreakdownLabel}>4-Week Rent</span>
                    <span className={styles.mobileBookingPriceBreakdownValue}>
                      {pricingBreakdown?.valid && pricingBreakdown?.fourWeekRent
                        ? formatPrice(pricingBreakdown.fourWeekRent)
                        : '—'}
                    </span>
                  </div>
                  <div className={styles.mobileBookingTotalRow}>
                    <span className={styles.mobileBookingTotalLabel}>
                      Reservation Total
                    </span>
                    <span className={styles.mobileBookingTotalValue}>
                      {pricingBreakdown?.valid && pricingBreakdown?.reservationTotal
                        ? formatPrice(pricingBreakdown.reservationTotal)
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Create Proposal Button */}
                <button
                  onClick={() => {
                    if (scheduleValidation?.valid && pricingBreakdown?.valid && !existingProposalForListing) {
                      handleCreateProposal();
                    }
                  }}
                  disabled={!scheduleValidation?.valid || !pricingBreakdown?.valid || !!existingProposalForListing}
                  className={`${styles.mobileBookingCreateButton} ${
                    !existingProposalForListing && scheduleValidation?.valid && pricingBreakdown?.valid
                      ? styles.mobileBookingCreateButtonEnabled
                      : styles.mobileBookingCreateButtonDisabled
                  }`}
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
                    className={styles.mobileBookingExistingProposalLink}
                  >
                    View your proposal in Dashboard
                  </a>
                )}
              </div>
            )}
          </div>

        </>
      )}

      {/* Hide footer on mobile - page should end with proposal creation tool */}
      {!isMobile && <Footer />}
    </>
  );
}
