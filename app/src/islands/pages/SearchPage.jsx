/**
 * SearchPage Component - REFACTORED
 *
 * Following the "Hollow Component" pattern - this component is a UI shell.
 * All business logic delegated to hooks:
 * - useSearchPageLogic: listings, filters, geography, modals, fallback
 * - useSearchPageAuth: auth state, favorites, proposals
 *
 * REFACTORED FROM: ~2,226 lines
 * REFACTORED TO: ~1,400 lines
 *
 * CHANGES:
 * - Removed duplicate transformListing (now exported from hook)
 * - Removed inline fallback listings logic (now in useSearchPageLogic)
 * - Removed inline auth effects (now in useSearchPageAuth)
 * - Removed direct Supabase calls (now in hooks or proposalService)
 * - Uses JWT-derived authUserId for all auth operations (Golden Rule D)
 *
 * SECURITY: All user IDs derived from JWT via useAuthenticatedUser hook
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import GoogleMap from '../shared/GoogleMap.jsx';
import InformationalText from '../shared/InformationalText.jsx';
import ContactHostMessaging from '../shared/ContactHostMessaging.jsx';
import AiSignupMarketReport from '../shared/AiSignupMarketReport/AiSignupMarketReport.jsx';
import AuthAwareSearchScheduleSelector from '../shared/AuthAwareSearchScheduleSelector.jsx';
import SignUpLoginModal from '../shared/SignUpLoginModal.jsx';
import LoggedInAvatar from '../shared/LoggedInAvatar/LoggedInAvatar.jsx';
import CreateProposalFlowV2, { clearProposalDraft } from '../shared/CreateProposalFlowV2.jsx';
import { isGuest } from '../../logic/rules/users/isGuest.js';
import { isHost } from '../../logic/rules/users/isHost.js';
import { logger } from '../../lib/logger.js';
import { checkAuthStatus, logoutUser } from '../../lib/auth.js';
import { LISTING_CONFIG } from '../../lib/constants.js';
import { createDay } from '../../lib/scheduleSelector/dayHelpers.js';
import { calculateNextAvailableCheckIn } from '../../logic/calculators/scheduling/calculateNextAvailableCheckIn.js';
import { shiftMoveInDateIfPast } from '../../logic/calculators/scheduling/shiftMoveInDateIfPast.js';
import { calculateCheckInOutFromDays } from '../../logic/calculators/scheduling/calculateCheckInOutFromDays.js';
import { countSelectedNights } from '../../lib/scheduleSelector/nightCalculations.js';
import ProposalSuccessModal from '../modals/ProposalSuccessModal.jsx';
import CompactScheduleIndicator from './SearchPage/components/CompactScheduleIndicator.jsx';
import MobileFilterBar from './SearchPage/components/MobileFilterBar.jsx';
import { NeighborhoodSearchFilter } from './SearchPage/components/NeighborhoodFilters.jsx';
import { BoroughSearchFilter } from './SearchPage/components/BoroughFilters.jsx';
import PropertyCard from '../shared/ListingCard/PropertyCard.jsx';
import UsabilityPopup from '../shared/UsabilityPopup/UsabilityPopup.jsx';

// HOOKS - Hollow Component Pattern
import { useSearchPageLogic } from './useSearchPageLogic.js';
import { useSearchPageAuth } from './useSearchPageAuth.js';

// SERVICE - Centralized proposal API
import { createProposal, transformListingForProposal } from '../../lib/proposalService.js';

// ============================================================================
// Internal Components (UI-only, no business logic)
// ============================================================================

/**
 * ListingsGrid - Grid of property cards with lazy loading
 */
function ListingsGrid({
  listings,
  onLoadMore,
  hasMore,
  isLoading,
  onOpenContactModal,
  onOpenInfoModal,
  mapRef,
  isLoggedIn,
  userId,
  favoritedListingIds,
  onToggleFavorite,
  onRequireAuth,
  showCreateProposalButton,
  onOpenCreateProposalModal,
  proposalsByListingId,
  selectedNightsCount,
  showMessageButton
}) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { root: null, rootMargin: '100px', threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);

    return () => {
      if (sentinelRef.current) {
        observer.unobserve(sentinelRef.current);
      }
    };
  }, [hasMore, isLoading, onLoadMore]);

  return (
    <div className="listings-container">
      {listings.map((listing) => {
        const listingId = listing.id || listing._id;
        const isFavorited = favoritedListingIds?.has(listingId);
        const proposalForListing = proposalsByListingId?.get(listingId) || null;
        return (
          <PropertyCard
            key={listing.id}
            listing={listing}
            onLocationClick={(listing) => {
              if (mapRef.current) {
                mapRef.current.zoomToListing(listing.id);
              }
            }}
            onOpenContactModal={onOpenContactModal}
            onOpenInfoModal={onOpenInfoModal}
            isLoggedIn={isLoggedIn}
            isFavorited={isFavorited}
            userId={userId}
            onToggleFavorite={onToggleFavorite}
            onRequireAuth={onRequireAuth}
            showCreateProposalButton={showCreateProposalButton}
            onOpenCreateProposalModal={onOpenCreateProposalModal}
            proposalForListing={proposalForListing}
            selectedNightsCount={selectedNightsCount}
            variant="search"
          />
        );
      })}

      {hasMore && (
        <div ref={sentinelRef} className="lazy-load-sentinel">
          <div className="loading-more">
            <div className="spinner"></div>
            <span>Loading more listings...</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * LoadingState - Loading spinner
 */
function LoadingState() {
  return (
    <div className="loading-skeleton active">
      {[1, 2].map(i => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-image"></div>
          <div className="skeleton-content">
            <div className="skeleton-line" style={{ width: '60%' }}></div>
            <div className="skeleton-line" style={{ width: '80%' }}></div>
            <div className="skeleton-line" style={{ width: '40%' }}></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * ErrorState - Error message component
 */
function ErrorState({ message, onRetry }) {
  return (
    <div className="error-message">
      <img
        src="/assets/images/filter-error-illustration.png"
        alt="Adjust filters illustration"
        style={{ width: '200px', height: 'auto', marginBottom: '16px' }}
      />
      <h3>Unable to Load Listings</h3>
      <p>{message || 'We had trouble loading listings. Please try refreshing the page or adjusting your filters.'}</p>
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * EmptyState - No results found message
 */
function EmptyState({ onResetFilters }) {
  return (
    <div className="no-results-notice">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <h3>No Listings Found</h3>
      <p>No listings match your current filters. Try adjusting your selection.</p>
      <button className="reset-filters-btn" onClick={onResetFilters}>
        Reset Filters
      </button>
    </div>
  );
}

// ============================================================================
// Main SearchPage Component
// ============================================================================

export default function SearchPage() {
  // ==========================================================================
  // HOOK 1: Listings, Filters, Geography, Modals, Fallback
  // ==========================================================================
  const {
    // Loading & Error
    isLoading,
    error,
    // Listings
    allActiveListings,
    allListings,
    displayedListings,
    hasMore,
    // Fallback Listings (when filters return no results)
    fallbackListings,
    fallbackDisplayedListings,
    isFallbackLoading,
    hasFallbackMore,
    handleFallbackLoadMore,
    // Geography
    boroughs,
    neighborhoods,
    // Filters
    selectedBoroughs,
    selectedNeighborhoods,
    weekPattern,
    priceTier,
    sortBy,
    neighborhoodSearch,
    // UI State
    filterPanelActive,
    menuOpen,
    mobileMapVisible,
    // Modals
    isContactModalOpen,
    isInfoModalOpen,
    isAIResearchModalOpen,
    selectedListing,
    infoModalTriggerRef,
    informationalTexts,
    // Refs
    mapRef,
    // Handlers
    setSelectedBoroughs,
    setSelectedNeighborhoods,
    setWeekPattern,
    setPriceTier,
    setSortBy,
    setNeighborhoodSearch,
    handleResetFilters,
    setFilterPanelActive,
    setMenuOpen,
    setMobileMapVisible,
    handleLoadMore,
    fetchListings,
    handleOpenContactModal,
    handleCloseContactModal,
    handleOpenInfoModal,
    handleCloseInfoModal,
    handleOpenAIResearchModal,
    handleCloseAIResearchModal
  } = useSearchPageLogic();

  // ==========================================================================
  // HOOK 2: Auth State, Favorites, Proposals
  // ==========================================================================
  const {
    // Core Auth
    isLoggedIn,
    currentUser,
    authUserId,
    authenticatedUser,
    // Favorites
    favoritesCount,
    favoritedListingIds,
    handleToggleFavorite,
    // Proposals
    proposalsByListingId,
    setProposalsByListingId,
    zatConfig,
    loggedInUserData,
    setLoggedInUserData,
    lastProposalDefaults,
    reservationSpanForProposal,
    setReservationSpanForProposal,
    // Proposal Flow
    pendingProposalData,
    setPendingProposalData,
    showSuccessModal,
    setShowSuccessModal,
    successProposalId,
    setSuccessProposalId,
    isSubmittingProposal,
    setIsSubmittingProposal,
    showAuthModalForProposal,
    setShowAuthModalForProposal
  } = useSearchPageAuth();

  // ==========================================================================
  // UI-ONLY STATE (kept in component - not business logic)
  // ==========================================================================

  // Auth Modal (separate from login/logout flow)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState('login');

  // Proposal Flow UI
  const [isCreateProposalModalOpen, setIsCreateProposalModalOpen] = useState(false);
  const [selectedListingForProposal, setSelectedListingForProposal] = useState(null);
  const [selectedDayObjectsForProposal, setSelectedDayObjectsForProposal] = useState([]);
  const [moveInDateForProposal, setMoveInDateForProposal] = useState('');

  // Dynamic pricing from day selector
  const [selectedNightsCount, setSelectedNightsCount] = useState(4);

  // UI state for filter popup and headers
  const [filterPopupOpen, setFilterPopupOpen] = useState(false);
  const [mobileHeaderHidden, setMobileHeaderHidden] = useState(false);
  const [desktopHeaderCollapsed, setDesktopHeaderCollapsed] = useState(false);

  // Toast notification
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Refs
  const menuRef = useRef(null);

  // Track selected days from URL for check-in/check-out display
  const [selectedDaysForDisplay, setSelectedDaysForDisplay] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const daysParam = urlParams.get('days-selected');
    if (daysParam) {
      return daysParam.split(',').map(d => parseInt(d.trim(), 10)).filter(d => !isNaN(d) && d >= 0 && d <= 6);
    }
    return [1, 2, 3, 4, 5]; // Default: Mon-Fri
  });

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  // Calculate check-in and check-out day names
  const checkInOutDays = useMemo(() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const result = calculateCheckInOutFromDays(selectedDaysForDisplay);
    if (!result) return { checkIn: '', checkOut: '' };
    return {
      checkIn: dayNames[result.checkIn],
      checkOut: dayNames[result.checkOut]
    };
  }, [selectedDaysForDisplay]);

  // Calculate active filter count for mobile apply button
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedNeighborhoods.length > 0) count++;
    if (weekPattern !== 'every-week') count++;
    if (priceTier !== 'all') count++;
    if (sortBy !== 'recommended') count++;
    return count;
  }, [selectedNeighborhoods, weekPattern, priceTier, sortBy]);

  // Generate active filter tags
  const activeFilterTags = useMemo(() => {
    const tags = [];

    // Borough tag(s) - show when specific boroughs are selected
    if (selectedBoroughs.length > 0) {
      const boroughNames = selectedBoroughs
        .map(value => boroughs.find(b => b.value === value)?.name)
        .filter(Boolean);
      const label = boroughNames.length > 2
        ? `${boroughNames.slice(0, 2).join(', ')} +${boroughNames.length - 2}`
        : boroughNames.join(', ');
      tags.push({
        id: 'boroughs',
        icon: 'map-pin',
        label: label || `${selectedBoroughs.length} boroughs`,
        onRemove: () => setSelectedBoroughs([])
      });
    }

    if (selectedNeighborhoods.length > 0) {
      const neighborhoodNames = selectedNeighborhoods
        .map(id => neighborhoods.find(n => n.id === id)?.name)
        .filter(Boolean)
        .slice(0, 2);
      const label = neighborhoodNames.length > 2
        ? `${neighborhoodNames.join(', ')} +${selectedNeighborhoods.length - 2}`
        : neighborhoodNames.join(', ');
      tags.push({
        id: 'neighborhoods',
        icon: 'map-pin',
        label: label || `${selectedNeighborhoods.length} neighborhoods`,
        onRemove: () => setSelectedNeighborhoods([])
      });
    }

    if (priceTier && priceTier !== 'all') {
      const priceLabels = {
        'under-200': 'Under $200',
        '200-350': '$200-$350',
        '350-500': '$350-$500',
        '500-plus': '$500+'
      };
      tags.push({
        id: 'price',
        icon: 'dollar-sign',
        label: priceLabels[priceTier] || priceTier,
        onRemove: () => setPriceTier('all')
      });
    }

    if (weekPattern && weekPattern !== 'every-week') {
      const patternLabels = {
        'one-on-off': 'Every other week',
        'two-on-off': '2 weeks on/off',
        'one-three-off': '1 on, 3 off'
      };
      tags.push({
        id: 'weekPattern',
        icon: 'repeat',
        label: patternLabels[weekPattern] || weekPattern,
        onRemove: () => setWeekPattern('every-week')
      });
    }

    return tags;
  }, [selectedBoroughs, selectedNeighborhoods, priceTier, weekPattern, boroughs, neighborhoods]);

  // Determine if "Create Proposal" button should be visible
  const showCreateProposalButton = useMemo(() => {
    if (!isLoggedIn || !currentUser) return false;
    const userIsGuest = isGuest({ userType: currentUser.userType });
    const hasExistingProposals = (currentUser.proposalCount ?? 0) > 0;
    return userIsGuest && hasExistingProposals;
  }, [isLoggedIn, currentUser]);

  // Determine if "Message" button should be visible on listing cards
  const showMessageButton = useMemo(() => {
    if (!isLoggedIn || !currentUser) return true;
    const userIsHost = isHost({ userType: currentUser.userType });
    return !userIsHost;
  }, [isLoggedIn, currentUser]);

  // ==========================================================================
  // EFFECTS (UI-only)
  // ==========================================================================

  // Listen for URL changes to update selected days display
  useEffect(() => {
    const handleUrlChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const daysParam = urlParams.get('days-selected');
      if (daysParam) {
        const days = daysParam.split(',').map(d => parseInt(d.trim(), 10)).filter(d => !isNaN(d) && d >= 0 && d <= 6);
        setSelectedDaysForDisplay(days);
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('daysSelected', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('daysSelected', handleUrlChange);
    };
  }, []);

  // Close hamburger menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Header scroll hide/show effect
  useEffect(() => {
    let lastScrollY = 0;
    let ticking = false;

    const handleScroll = (e) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollElement = e.target;
          const currentScrollY = scrollElement.scrollTop || 0;
          const isMobile = window.innerWidth <= 768;
          const isDesktop = window.innerWidth >= 769;

          if (isMobile) {
            if (currentScrollY > 250 && currentScrollY > lastScrollY) {
              setMobileHeaderHidden(true);
            } else if (currentScrollY < lastScrollY) {
              setMobileHeaderHidden(false);
            }
            setDesktopHeaderCollapsed(false);
          } else if (isDesktop) {
            if (currentScrollY > 150 && currentScrollY > lastScrollY) {
              setDesktopHeaderCollapsed(true);
            } else if (currentScrollY < lastScrollY) {
              setDesktopHeaderCollapsed(false);
            }
            setMobileHeaderHidden(false);
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    const listingsContent = document.querySelector('.listings-content');

    if (listingsContent) {
      listingsContent.addEventListener('scroll', handleScroll, { passive: true });
      return () => listingsContent.removeEventListener('scroll', handleScroll);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mount SearchScheduleSelector component
  useEffect(() => {
    const mountPointDesktop = document.getElementById('schedule-selector-mount-point');
    const mountPointMobile = document.getElementById('schedule-selector-mount-point-mobile');
    const roots = [];

    const selectorProps = {
      onSelectionChange: (days) => {
        logger.debug('Schedule selector changed:', days);
        const nightsCount = countSelectedNights(days);
        setSelectedNightsCount(nightsCount);
      },
      onError: (error) => logger.error('AuthAwareSearchScheduleSelector error:', error),
      weekPattern: weekPattern
    };

    if (mountPointDesktop) {
      const rootDesktop = createRoot(mountPointDesktop);
      rootDesktop.render(<AuthAwareSearchScheduleSelector {...selectorProps} />);
      roots.push(rootDesktop);
    }

    if (mountPointMobile) {
      const rootMobile = createRoot(mountPointMobile);
      rootMobile.render(<AuthAwareSearchScheduleSelector {...selectorProps} />);
      roots.push(rootMobile);
    }

    return () => {
      roots.forEach(root => root.unmount());
    };
  }, [weekPattern]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const toggleFilterPopup = useCallback(() => {
    setFilterPopupOpen(prev => !prev);
  }, []);

  const closeFilterPopup = useCallback(() => {
    setFilterPopupOpen(false);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedBoroughs([]);
    setSelectedNeighborhoods([]);
    setPriceTier('all');
    setWeekPattern('every-week');
    setSortBy('recommended');
    closeFilterPopup();
  }, [closeFilterPopup]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Auth navigation handlers
  const handleNavigate = (path) => {
    window.location.href = path;
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      window.location.reload();
    } catch (error) {
      logger.error('[SearchPage] Logout error:', error);
    }
  };

  // Scroll to listing card when marker is clicked
  const scrollToListingCard = (listing) => {
    const listingId = listing.id || listing._id;
    const listingCard = document.querySelector(`[data-listing-id="${listingId}"]`);

    if (listingCard) {
      listingCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      listingCard.classList.add('listing-card--highlighted');
      setTimeout(() => {
        listingCard.classList.remove('listing-card--highlighted');
      }, 2000);
    }
  };

  // ==========================================================================
  // PROPOSAL HANDLERS
  // ==========================================================================

  const handleOpenCreateProposalModal = (listing) => {
    const urlParams = new URLSearchParams(window.location.search);
    const daysParam = urlParams.get('days-selected');

    let initialDays = [];
    if (daysParam) {
      try {
        const zeroBased = daysParam.split(',').map(d => parseInt(d.trim(), 10));
        initialDays = zeroBased
          .filter(d => d >= 0 && d <= 6)
          .map(dayIndex => createDay(dayIndex, true));
      } catch (e) {
        logger.warn('Failed to parse days from URL:', e);
      }
    }

    if (initialDays.length === 0) {
      initialDays = [1, 2, 3, 4, 5].map(dayIndex => createDay(dayIndex, true));
    }

    const today = new Date();
    const twoWeeksFromNow = new Date(today);
    twoWeeksFromNow.setDate(today.getDate() + 14);
    const minMoveInDate = twoWeeksFromNow.toISOString().split('T')[0];

    let smartMoveInDate = minMoveInDate;

    if (lastProposalDefaults?.moveInDate) {
      smartMoveInDate = shiftMoveInDateIfPast({
        previousMoveInDate: lastProposalDefaults.moveInDate,
        minDate: minMoveInDate
      }) || minMoveInDate;
    } else if (initialDays.length > 0) {
      try {
        const selectedDayIndices = initialDays.map(d => d.dayOfWeek);
        smartMoveInDate = calculateNextAvailableCheckIn({
          selectedDayIndices,
          minDate: minMoveInDate
        });
      } catch (err) {
        smartMoveInDate = minMoveInDate;
      }
    }

    const prefillReservationSpan = lastProposalDefaults?.reservationSpanWeeks || 13;

    setSelectedListingForProposal(listing);
    setSelectedDayObjectsForProposal(initialDays);
    setMoveInDateForProposal(smartMoveInDate);
    setReservationSpanForProposal(prefillReservationSpan);
    setIsCreateProposalModalOpen(true);
  };

  const handleCloseCreateProposalModal = () => {
    setIsCreateProposalModalOpen(false);
    setSelectedListingForProposal(null);
  };

  /**
   * Submit proposal using proposalService
   * SECURITY: Uses authUserId from JWT, not getSessionId()
   */
  const submitProposal = async (proposalData) => {
    setIsSubmittingProposal(true);

    try {
      // SECURITY: Use JWT-derived user ID (Golden Rule D)
      if (!authUserId) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Use centralized proposal service
      const result = await createProposal({
        guestId: authUserId, // JWT-derived, not getSessionId()
        listingId: selectedListingForProposal?.id || selectedListingForProposal?._id,
        moveInDate: proposalData.moveInDate,
        daysSelectedObjects: proposalData.daysSelectedObjects,
        reservationSpanWeeks: proposalData.reservationSpan || 13,
        pricing: {
          pricePerNight: proposalData.pricePerNight,
          pricePerFourWeeks: proposalData.pricePerFourWeeks,
          totalPrice: proposalData.totalPrice
        },
        details: {
          needForSpace: proposalData.needForSpace,
          aboutMe: proposalData.aboutYourself,
          specialNeeds: proposalData.hasUniqueRequirements ? proposalData.uniqueRequirements : '',
          moveInRangeText: proposalData.moveInRange
        }
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Success handling
      clearProposalDraft(proposalData.listingId);
      setIsCreateProposalModalOpen(false);
      setPendingProposalData(null);
      setSuccessProposalId(result.proposalId);
      setShowSuccessModal(true);

      // Update local state
      if (result.proposalId && selectedListingForProposal) {
        const listingId = selectedListingForProposal.id || selectedListingForProposal._id;
        setProposalsByListingId(prev => {
          const updated = new Map(prev);
          updated.set(listingId, { _id: result.proposalId });
          return updated;
        });
      }

    } catch (error) {
      logger.error('[SearchPage] Error submitting proposal:', error);
      showToast(error.message || 'Failed to submit proposal. Please try again.', 'error');
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  const handleCreateProposalSubmit = async (proposalData) => {
    const isAuthenticated = await checkAuthStatus();

    if (!isAuthenticated) {
      setPendingProposalData(proposalData);
      setIsCreateProposalModalOpen(false);
      setShowAuthModalForProposal(true);
      return;
    }

    await submitProposal(proposalData);
  };

  /**
   * Handle successful auth during proposal flow.
   * SECURITY: Uses authUserId from JWT, NOT getSessionId()
   */
  const handleAuthSuccessForProposal = async (authResult) => {
    setShowAuthModalForProposal(false);

    // Auth hook will auto-sync user data via useEffect when isAuthenticated changes.
    // We just need to wait briefly for the sync to complete, then submit.
    // NOTE: loggedInUserData is set by useSearchPageAuth hook, not here.

    if (pendingProposalData) {
      // Wait for auth hook to sync user data
      setTimeout(async () => {
        await submitProposal(pendingProposalData);
      }, 500);
    }
  };

  // ==========================================================================
  // RENDER - JSX only (no business logic in render)
  // ==========================================================================

  return (
    <div className="search-page">
      {/* Toast Notification */}
      {toast.show && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type} show`}>
            <div className="toast-content">
              <h4 className="toast-title">{toast.message}</h4>
            </div>
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

      {/* Two-column layout: Listings (left) + Map (right) */}
      <main className="two-column-layout">
        {/* LEFT COLUMN: Listings with filters */}
        <section className={`listings-column ${mobileHeaderHidden ? 'listings-column--header-hidden' : ''}`}>
          {/* Mobile Filter Bar */}
          <MobileFilterBar
            onFilterClick={() => setFilterPanelActive(!filterPanelActive)}
            isLoggedIn={isLoggedIn}
            currentUser={currentUser}
            favoritesCount={favoritesCount}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            onOpenAuthModal={() => {
              setAuthModalView('login');
              setIsAuthModalOpen(true);
            }}
            isHidden={mobileHeaderHidden}
          />

          {/* Floating Map Button - Mobile only */}
          <button
            className="mobile-map-fab"
            onClick={() => setMobileMapVisible(true)}
            aria-label="Open map view"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
              <line x1="8" y1="2" x2="8" y2="18"></line>
              <line x1="16" y1="6" x2="16" y2="22"></line>
            </svg>
            <span>Map</span>
          </button>

          {/* Mobile Schedule Selector */}
          <div className={`mobile-schedule-selector ${mobileHeaderHidden ? 'mobile-schedule-selector--hidden' : ''}`}>
            <div className="filter-group schedule-selector-group" id="schedule-selector-mount-point-mobile">
            </div>
          </div>

          {/* Compact Schedule Indicator */}
          <CompactScheduleIndicator isVisible={mobileHeaderHidden} />

          {/* Filter Section (Desktop) */}
          <div className={`filter-section ${activeFilterTags.length > 0 ? 'has-active-filters' : ''} ${desktopHeaderCollapsed ? 'filter-section--collapsed' : ''}`}>
            <div className="filter-bar">
              <div className="schedule-selector">
                <div className="filter-group schedule-selector-group" id="schedule-selector-mount-point">
                </div>
              </div>
              <div className="filter-popup-wrapper" id="topFilterWrapper">
                <button
                  className={`filter-toggle-btn-new ${filterPopupOpen ? 'active' : ''}`}
                  onClick={toggleFilterPopup}
                  aria-label="Open filters"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                  </svg>
                  {activeFilterTags.length > 0 && (
                    <span className="filter-badge">{activeFilterTags.length}</span>
                  )}
                </button>
              </div>
              <div className="filter-divider"></div>
              {checkInOutDays.checkIn && checkInOutDays.checkOut && (
                <div className="checkin-block">
                  <div className="checkin-details">
                    <div className="checkin-row">
                      <span className="label">Check-in:</span>
                      <span className="day">{checkInOutDays.checkIn}</span>
                    </div>
                    <div className="checkin-row">
                      <span className="label">Check-out:</span>
                      <span className="day">{checkInOutDays.checkOut}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filter Tags Row - Shows active filters as removable chips */}
          <div className={`filter-tags-row ${activeFilterTags.length > 0 ? 'has-filters' : ''} ${desktopHeaderCollapsed ? 'filter-tags-row--collapsed' : ''}`}>
            <button className="results-filter-btn" onClick={toggleFilterPopup}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              <span className="results-filter-badge">{activeFilterTags.length}</span>
            </button>

            <div className="filter-tags-single-row">
              {activeFilterTags.map((tag) => (
                <div key={tag.id} className="filter-tag filter-tag-sm">
                  {tag.icon === 'map-pin' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  )}
                  {tag.icon === 'dollar-sign' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                  )}
                  {tag.icon === 'repeat' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="17 1 21 5 17 9"></polyline>
                      <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                      <polyline points="7 23 3 19 7 15"></polyline>
                      <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                    </svg>
                  )}
                  {tag.label}
                  <button className="filter-tag-remove" onClick={tag.onRemove}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Filter Popup Modal */}
          <div className={`filter-popup ${filterPopupOpen ? 'open' : ''}`}>
            <div className="filter-popup-header">
              <h3 className="filter-popup-title">Filters</h3>
              <button className="filter-popup-clear" onClick={clearAllFilters}>
                Clear all
              </button>
            </div>

            <div className="filter-popup-body">
              {/* Row 1: Borough, Week Pattern, Price Range - 3 column grid */}
              {/* Borough Multi-Select */}
              <div className="filter-popup-group">
                <label className="filter-popup-label">BOROUGH</label>
                <BoroughSearchFilter
                  boroughs={boroughs}
                  selectedBoroughs={selectedBoroughs}
                  onBoroughsChange={setSelectedBoroughs}
                  searchInputId="boroughSearchPopup"
                />
              </div>

              {/* Week Pattern */}
              <div className="filter-popup-group">
                <label className="filter-popup-label">WEEK PATTERN</label>
                <select
                  className="filter-popup-select"
                  value={weekPattern}
                  onChange={(e) => setWeekPattern(e.target.value)}
                >
                  <option value="every-week">Every week</option>
                  <option value="one-on-off">One on, one off</option>
                  <option value="two-on-off">Two on, two off</option>
                  <option value="one-three-off">One on, three off</option>
                </select>
              </div>

              {/* Price Range */}
              <div className="filter-popup-group">
                <label className="filter-popup-label">PRICE RANGE</label>
                <select
                  className="filter-popup-select"
                  value={priceTier}
                  onChange={(e) => setPriceTier(e.target.value)}
                >
                  <option value="all">All Prices</option>
                  <option value="under-200">&lt; $200/night</option>
                  <option value="200-350">$200-$350/night</option>
                  <option value="350-500">$350-$500/night</option>
                  <option value="500-plus">$500+/night</option>
                </select>
              </div>

              {/* Row 2: Neighborhoods - full width search input */}
              <div className="filter-popup-group filter-popup-group--full-width">
                <label className="filter-popup-label">NEIGHBORHOODS</label>
                <NeighborhoodSearchFilter
                  neighborhoods={neighborhoods}
                  selectedNeighborhoods={selectedNeighborhoods}
                  onNeighborhoodsChange={setSelectedNeighborhoods}
                  neighborhoodSearch={neighborhoodSearch}
                  onNeighborhoodSearchChange={setNeighborhoodSearch}
                  searchInputId="neighborhoodSearchPopup"
                />
              </div>
            </div>

            <div className="filter-popup-footer">
              <button className="btn btn-secondary" onClick={closeFilterPopup}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={closeFilterPopup}>
                Apply Filters
              </button>
            </div>
          </div>

          {/* Filter Backdrop */}
          {filterPopupOpen && (
            <div className="filter-backdrop open" onClick={closeFilterPopup}></div>
          )}

          {/* Mobile Filter Bottom Sheet */}
          {filterPanelActive && (
            <>
              <div className="mobile-filter-backdrop" onClick={() => setFilterPanelActive(false)}></div>
              <div className="mobile-filter-sheet">
                {/* Grab Handle */}
                <div className="mobile-filter-handle"></div>

                {/* Header */}
                <div className="mobile-filter-header">
                  <div className="mobile-filter-header-content">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#31135D" strokeWidth="2">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                    <h2 className="mobile-filter-title">Filters</h2>
                  </div>
                  <button
                    className="mobile-filter-close"
                    onClick={() => setFilterPanelActive(false)}
                    aria-label="Close filters"
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/>
                      <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>

                {/* Body - Scrollable */}
                <div className="mobile-filter-body">
                  {/* Borough Multi-Select */}
                  <div className="mobile-filter-group">
                    <label className="mobile-filter-label">BOROUGH</label>
                    <BoroughSearchFilter
                      boroughs={boroughs}
                      selectedBoroughs={selectedBoroughs}
                      onBoroughsChange={setSelectedBoroughs}
                      searchInputId="boroughSearchMobile"
                    />
                  </div>

                  {/* Week Pattern */}
                  <div className="mobile-filter-group">
                    <label className="mobile-filter-label">WEEK PATTERN</label>
                    <select
                      className="mobile-filter-select"
                      value={weekPattern}
                      onChange={(e) => setWeekPattern(e.target.value)}
                    >
                      <option value="every-week">Every week</option>
                      <option value="one-on-off">One on, one off</option>
                      <option value="two-on-off">Two on, two off</option>
                      <option value="one-three-off">One on, three off</option>
                    </select>
                  </div>

                  {/* Price Range */}
                  <div className="mobile-filter-group">
                    <label className="mobile-filter-label">PRICE RANGE</label>
                    <select
                      className="mobile-filter-select"
                      value={priceTier}
                      onChange={(e) => setPriceTier(e.target.value)}
                    >
                      <option value="all">All Prices</option>
                      <option value="under-200">&lt; $200/night</option>
                      <option value="200-350">$200-$350/night</option>
                      <option value="350-500">$350-$500/night</option>
                      <option value="500-plus">$500+/night</option>
                    </select>
                  </div>

                  {/* Neighborhoods */}
                  <div className="mobile-filter-group">
                    <label className="mobile-filter-label">NEIGHBORHOODS</label>
                    <NeighborhoodSearchFilter
                      neighborhoods={neighborhoods}
                      selectedNeighborhoods={selectedNeighborhoods}
                      onNeighborhoodsChange={setSelectedNeighborhoods}
                      neighborhoodSearch={neighborhoodSearch}
                      onNeighborhoodSearchChange={setNeighborhoodSearch}
                      searchInputId="neighborhoodSearchMobile"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="mobile-filter-footer">
                  <button
                    className="mobile-filter-btn-secondary"
                    onClick={clearAllFilters}
                  >
                    Clear All
                  </button>
                  <button
                    className="mobile-filter-btn-primary"
                    onClick={() => setFilterPanelActive(false)}
                  >
                    Show {allListings.length} Results
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Results header */}
          <div className={`results-header ${mobileHeaderHidden ? 'results-header--hidden' : ''} ${desktopHeaderCollapsed ? 'results-header--desktop-hidden' : ''}`}>
            <span className="results-count">
              <strong>{allListings.length} listings</strong> in {selectedBoroughs.length === 0 ? 'NYC' : selectedBoroughs.length === 1 ? (boroughs.find(b => b.value === selectedBoroughs[0])?.name || 'NYC') : `${selectedBoroughs.length} boroughs`}
            </span>
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="recommended">Recommended</option>
              <option value="price-low">Price: Low to High</option>
              <option value="most-viewed">Most Viewed</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>

          {/* Listings content */}
          <div className="listings-content">
            {isLoading && <LoadingState />}

            {!isLoading && error && (
              <ErrorState message={error} onRetry={fetchListings} />
            )}

            {!isLoading && !error && allListings.length === 0 && (
              <>
                <EmptyState onResetFilters={handleResetFilters} />

                {isFallbackLoading && (
                  <div className="fallback-loading">
                    <p>Loading all available listings...</p>
                  </div>
                )}

                {!isFallbackLoading && fallbackListings.length > 0 && (
                  <div className="fallback-listings-section">
                    <div className="fallback-header">
                      <h3>Browse All Available Listings</h3>
                      <p>Showing {fallbackListings.length} listings across all NYC boroughs</p>
                    </div>
                    <ListingsGrid
                      listings={fallbackDisplayedListings}
                      onLoadMore={handleFallbackLoadMore}
                      hasMore={hasFallbackMore}
                      isLoading={false}
                      onOpenContactModal={handleOpenContactModal}
                      onOpenInfoModal={handleOpenInfoModal}
                      mapRef={mapRef}
                      isLoggedIn={isLoggedIn}
                      userId={authUserId}
                      favoritedListingIds={favoritedListingIds}
                      onToggleFavorite={handleToggleFavorite}
                      onRequireAuth={() => {
                        setAuthModalView('signup');
                        setIsAuthModalOpen(true);
                      }}
                      showCreateProposalButton={showCreateProposalButton}
                      onOpenCreateProposalModal={handleOpenCreateProposalModal}
                      proposalsByListingId={proposalsByListingId}
                      selectedNightsCount={selectedNightsCount}
                      showMessageButton={showMessageButton}
                    />
                  </div>
                )}
              </>
            )}

            {!isLoading && !error && allListings.length > 0 && (
              <ListingsGrid
                listings={displayedListings}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
                isLoading={isLoading}
                onOpenContactModal={handleOpenContactModal}
                onOpenInfoModal={handleOpenInfoModal}
                mapRef={mapRef}
                isLoggedIn={isLoggedIn}
                userId={authUserId}
                favoritedListingIds={favoritedListingIds}
                onToggleFavorite={handleToggleFavorite}
                onRequireAuth={() => {
                  setAuthModalView('signup');
                  setIsAuthModalOpen(true);
                }}
                showCreateProposalButton={showCreateProposalButton}
                onOpenCreateProposalModal={handleOpenCreateProposalModal}
                proposalsByListingId={proposalsByListingId}
                selectedNightsCount={selectedNightsCount}
                showMessageButton={showMessageButton}
              />
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Map */}
        <section className="map-column">
          <div className="map-header">
            <a href="/" className="map-logo">
              <img
                src="/assets/images/split-lease-purple-circle.png"
                alt="Split Lease Logo"
                className="logo-icon"
                width="36"
                height="36"
              />
              <span className="logo-text">Split Lease</span>
            </a>

            <div className="map-header-actions">
              {isLoggedIn && currentUser ? (
                <>
                  <a href="/favorite-listings" className="favorites-link" aria-label="My Favorite Listings">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    {favoritesCount > 0 && (
                      <span className="favorites-badge">{favoritesCount}</span>
                    )}
                  </a>
                  <LoggedInAvatar
                    user={currentUser}
                    currentPath="/search"
                    onNavigate={handleNavigate}
                    onLogout={handleLogout}
                  />
                </>
              ) : (
                <div ref={menuRef} style={{ position: 'relative' }}>
                  <button
                    className="hamburger-menu"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle menu"
                  >
                    <span>Menu</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                  </button>
                  {menuOpen && (
                    <div className="header-dropdown">
                      <a href="/guest-success">Success Stories</a>
                      <a href="#" onClick={(e) => {
                        e.preventDefault();
                        setMenuOpen(false);
                        setAuthModalView('login');
                        setIsAuthModalOpen(true);
                      }}>Sign In / Sign Up</a>
                      <a href="/why-split-lease">Understand Split Lease</a>
                      <a href="/faq">Explore FAQs</a>
                      <a href="/help-center">Support Centre</a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <GoogleMap
            ref={mapRef}
            listings={allActiveListings}
            filteredListings={allListings}
            selectedListing={null}
            selectedBorough={selectedBoroughs.length > 0 ? selectedBoroughs[0] : null}
            selectedNightsCount={selectedNightsCount}
            onMarkerClick={scrollToListingCard}
            onMessageClick={handleOpenContactModal}
            onAIResearchClick={handleOpenAIResearchModal}
            isLoggedIn={isLoggedIn}
            favoritedListingIds={favoritedListingIds}
            onToggleFavorite={handleToggleFavorite}
            userId={authUserId}
            onRequireAuth={() => {
              setAuthModalView('signup');
              setIsAuthModalOpen(true);
            }}
            showMessageButton={showMessageButton}
          />
        </section>
      </main>

      {/* Modals */}
      <ContactHostMessaging
        isOpen={isContactModalOpen}
        onClose={handleCloseContactModal}
        listing={selectedListing}
        onLoginRequired={() => {
          handleCloseContactModal();
          setAuthModalView('signup');
          setIsAuthModalOpen(true);
        }}
      />

      <InformationalText
        isOpen={isInfoModalOpen}
        onClose={handleCloseInfoModal}
        listing={selectedListing}
        triggerRef={infoModalTriggerRef}
        title="Pricing Information"
        content={informationalTexts['Price Starts']?.desktop || ''}
        expandedContent={informationalTexts['Price Starts']?.desktopPlus}
        showMoreAvailable={informationalTexts['Price Starts']?.showMore}
      />

      <AiSignupMarketReport
        isOpen={isAIResearchModalOpen}
        onClose={handleCloseAIResearchModal}
      />

      <SignUpLoginModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialView={authModalView}
        onAuthSuccess={() => {
          logger.debug('Auth successful from SearchPage');
        }}
      />

      {isCreateProposalModalOpen && selectedListingForProposal && (
        <CreateProposalFlowV2
          listing={transformListingForProposal(selectedListingForProposal)}
          moveInDate={moveInDateForProposal}
          daysSelected={selectedDayObjectsForProposal}
          nightsSelected={selectedDayObjectsForProposal.length > 0 ? selectedDayObjectsForProposal.length - 1 : 0}
          reservationSpan={reservationSpanForProposal}
          pricingBreakdown={null}
          zatConfig={zatConfig}
          isFirstProposal={!loggedInUserData || loggedInUserData.proposalCount === 0}
          useFullFlow={true}
          existingUserData={loggedInUserData ? {
            needForSpace: loggedInUserData.needForSpace || '',
            aboutYourself: loggedInUserData.aboutMe || '',
            hasUniqueRequirements: !!loggedInUserData.specialNeeds,
            uniqueRequirements: loggedInUserData.specialNeeds || ''
          } : null}
          onClose={handleCloseCreateProposalModal}
          onSubmit={handleCreateProposalSubmit}
          isSubmitting={isSubmittingProposal}
        />
      )}

      {showAuthModalForProposal && (
        <SignUpLoginModal
          isOpen={showAuthModalForProposal}
          onClose={() => {
            setShowAuthModalForProposal(false);
            setPendingProposalData(null);
          }}
          initialView="signup-step1"
          onAuthSuccess={handleAuthSuccessForProposal}
          defaultUserType="guest"
          skipReload={true}
        />
      )}

      {showSuccessModal && (
        <ProposalSuccessModal
          proposalId={successProposalId}
          listingName={selectedListingForProposal?.title || selectedListingForProposal?.Name}
          hasSubmittedRentalApp={loggedInUserData?.hasSubmittedRentalApp ?? false}
          onClose={() => {
            setShowSuccessModal(false);
            setSuccessProposalId(null);
            setSelectedListingForProposal(null);
          }}
        />
      )}

      {/* Mobile Map Modal */}
      {mobileMapVisible && (
        <div className="mobile-map-modal">
          <div className="mobile-map-header">
            <button
              className="mobile-map-close-btn"
              onClick={() => setMobileMapVisible(false)}
              aria-label="Close map"
            >
              X
            </button>
            <h2>Map View</h2>
          </div>
          <div className="mobile-map-content">
            <GoogleMap
              ref={mapRef}
              listings={allActiveListings}
              filteredListings={allListings}
              selectedListing={null}
              selectedBorough={selectedBoroughs.length > 0 ? selectedBoroughs[0] : null}
              selectedNightsCount={selectedNightsCount}
              onMarkerClick={() => {}}
              onMessageClick={handleOpenContactModal}
              onAIResearchClick={handleOpenAIResearchModal}
              isLoggedIn={isLoggedIn}
              favoritedListingIds={favoritedListingIds}
              onToggleFavorite={handleToggleFavorite}
              userId={authUserId}
              onRequireAuth={() => {
                setAuthModalView('signup');
                setIsAuthModalOpen(true);
              }}
              showMessageButton={showMessageButton}
            />
          </div>
        </div>
      )}

      <UsabilityPopup userData={authenticatedUser} />
    </div>
  );
}
