/**
 * useVisitReviewerHouseManualLogic Hook
 *
 * Business logic hook for the VisitReviewerHouseManual component.
 * Follows the Hollow Component Pattern - all state and logic lives here.
 *
 * NO ANONYMOUS ACCESS: User must be authenticated as the visit's guest.
 *
 * @module islands/shared/VisitReviewerHouseManual/useVisitReviewerHouseManualLogic
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import visitReviewerService from './visitReviewerService.js';
import { adaptHouseManualForViewer, groupSectionsByCategory } from '../../../logic/processors/houseManual/adaptHouseManualForViewer.js';
import { canAccessManual, canSubmitReview } from '../../../logic/rules/houseManual/canAccessManual.js';
import { isTokenExpired, validateTokenStatus } from '../../../logic/rules/houseManual/isManualExpired.js';
import { checkAuthStatus, getUserId } from '../../../lib/auth.js';

/**
 * @typedef {Object} ReviewFormData
 * @property {string} reviewText - Written review text
 * @property {number|null} overallRating - Overall rating 1-5
 * @property {number|null} cleanlinessRating - Cleanliness rating 1-5
 * @property {number|null} accuracyRating - Accuracy rating 1-5
 * @property {number|null} communicationRating - Host communication rating 1-5
 * @property {number|null} locationRating - Location rating 1-5
 * @property {number|null} valueRating - Value rating 1-5
 * @property {number|null} checkInRating - Check-in experience rating 1-5
 */

/**
 * Initial review form state
 * @returns {ReviewFormData}
 */
const createInitialReviewFormData = () => ({
  reviewText: '',
  overallRating: null,
  cleanlinessRating: null,
  accuracyRating: null,
  communicationRating: null,
  locationRating: null,
  valueRating: null,
  checkInRating: null,
});

/**
 * @param {Object} props - Hook parameters
 * @param {string} props.visitId - Visit ID to load
 * @param {string} [props.accessToken] - Optional magic link access token
 * @param {function} [props.onAccessDenied] - Callback when access is denied
 * @param {function} [props.onReviewSubmitted] - Callback after successful review submission
 */
export default function useVisitReviewerHouseManualLogic({
  visitId,
  accessToken = null,
  onAccessDenied = null,
  onReviewSubmitted = null,
}) {
  // ─────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────

  const [houseManual, setHouseManual] = useState(null);
  const [visit, setVisit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessDeniedReason, setAccessDeniedReason] = useState(null);

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Review form state
  const [reviewFormData, setReviewFormData] = useState(createInitialReviewFormData);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Section state
  const [expandedSections, setExpandedSections] = useState({});
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Engagement tracking
  const [hasTrackedLinkSaw, setHasTrackedLinkSaw] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await checkAuthStatus();
      setIsAuthenticated(isAuth);

      if (isAuth) {
        const userId = getUserId();
        setCurrentUserId(userId);
      }
    };

    checkAuth();
  }, []);

  // Load house manual data when auth is ready
  useEffect(() => {
    if (visitId) {
      loadManualData();
    }
  }, [visitId, isAuthenticated, currentUserId]);

  // Track link_saw engagement on first load
  useEffect(() => {
    if (visit?.id && !hasTrackedLinkSaw && !visit.linkSaw) {
      trackLinkSaw();
    }
  }, [visit?.id, hasTrackedLinkSaw, visit?.linkSaw]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (reviewError || reviewSuccess) {
      const timer = setTimeout(() => {
        setReviewError(null);
        setReviewSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [reviewError, reviewSuccess]);

  // ─────────────────────────────────────────────────────────────
  // Data Loading
  // ─────────────────────────────────────────────────────────────

  const loadManualData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAccessDeniedReason(null);

    try {
      // Fetch visit manual data
      const result = await visitReviewerService.fetchVisitManual({
        visitId,
        accessToken,
      });

      if (result.status !== 'success') {
        throw new Error(result.message || 'Failed to load house manual');
      }

      // Adapt the response data
      const adaptedData = adaptHouseManualForViewer({ response: result.data });

      // Check access permissions
      const accessCheck = canAccessManual({
        currentUserId,
        visitGuestId: adaptedData.visit.guestId,
        isAuthenticated,
      });

      if (!accessCheck.canAccess) {
        setAccessDeniedReason(accessCheck.denyReason);
        if (onAccessDenied) {
          onAccessDenied(accessCheck.denyReason);
        }
        setIsLoading(false);
        return;
      }

      // Set state with adapted data
      setHouseManual(adaptedData.houseManual);
      setVisit(adaptedData.visit);
      setReviewSubmitted(adaptedData.visit.hasReviewed);

      // Initialize expanded sections (first one open by default)
      if (adaptedData.houseManual.sections?.length > 0) {
        const initialExpanded = { [adaptedData.houseManual.sections[0].id]: true };
        setExpandedSections(initialExpanded);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load house manual');
    } finally {
      setIsLoading(false);
    }
  }, [visitId, accessToken, isAuthenticated, currentUserId, onAccessDenied]);

  // ─────────────────────────────────────────────────────────────
  // Computed Values
  // ─────────────────────────────────────────────────────────────

  const groupedSections = useMemo(() => {
    if (!houseManual?.sections) {
      return { essentials: [], living: [], local: [], other: [] };
    }
    return groupSectionsByCategory({ sections: houseManual.sections });
  }, [houseManual?.sections]);

  const canUserSubmitReview = useMemo(() => {
    return canSubmitReview({
      userId: currentUserId,
      visitGuestId: visit?.guestId,
      hasReviewed: reviewSubmitted,
    });
  }, [currentUserId, visit?.guestId, reviewSubmitted]);

  const canSubmitReviewForm = useMemo(() => {
    // Must have review text and at least overall rating
    return (
      reviewFormData.reviewText.trim().length >= 10 &&
      reviewFormData.overallRating !== null &&
      !isSubmittingReview
    );
  }, [reviewFormData.reviewText, reviewFormData.overallRating, isSubmittingReview]);

  const sectionCount = useMemo(() => {
    return houseManual?.sections?.length || 0;
  }, [houseManual?.sections]);

  const hasAccessDenied = useMemo(() => {
    return Boolean(accessDeniedReason);
  }, [accessDeniedReason]);

  // ─────────────────────────────────────────────────────────────
  // Section Handlers
  // ─────────────────────────────────────────────────────────────

  const toggleSection = useCallback((sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const expandAllSections = useCallback(() => {
    if (!houseManual?.sections) return;

    const allExpanded = {};
    houseManual.sections.forEach((section) => {
      allExpanded[section.id] = true;
    });
    setExpandedSections(allExpanded);
  }, [houseManual?.sections]);

  const collapseAllSections = useCallback(() => {
    setExpandedSections({});
  }, []);

  const isSectionExpanded = useCallback(
    (sectionId) => {
      return Boolean(expandedSections[sectionId]);
    },
    [expandedSections]
  );

  // ─────────────────────────────────────────────────────────────
  // Review Form Handlers
  // ─────────────────────────────────────────────────────────────

  const handleReviewTextChange = useCallback((e) => {
    setReviewFormData((prev) => ({
      ...prev,
      reviewText: e.target.value,
    }));
    setReviewError(null);
  }, []);

  const handleRatingChange = useCallback((field, value) => {
    setReviewFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setReviewError(null);
  }, []);

  const handleShowReviewForm = useCallback(() => {
    setShowReviewForm(true);
    setReviewError(null);
  }, []);

  const handleHideReviewForm = useCallback(() => {
    setShowReviewForm(false);
    setReviewFormData(createInitialReviewFormData());
    setReviewError(null);
  }, []);

  const handleSubmitReview = useCallback(async () => {
    if (!canSubmitReviewForm) return;

    setIsSubmittingReview(true);
    setReviewError(null);

    try {
      // Build review payload with only filled ratings
      const review = {
        reviewText: reviewFormData.reviewText.trim(),
      };

      // Add ratings if provided
      const ratingFields = [
        'overallRating',
        'cleanlinessRating',
        'accuracyRating',
        'communicationRating',
        'locationRating',
        'valueRating',
        'checkInRating',
      ];

      ratingFields.forEach((field) => {
        if (reviewFormData[field] !== null) {
          review[field] = reviewFormData[field];
        }
      });

      const result = await visitReviewerService.submitGuestReview({
        visitId,
        review,
      });

      if (result.status !== 'success') {
        throw new Error(result.message || 'Failed to submit review');
      }

      // Success
      setReviewSubmitted(true);
      setReviewSuccess(true);
      setShowReviewForm(false);
      setReviewFormData(createInitialReviewFormData());

      // Update visit state
      setVisit((prev) => ({
        ...prev,
        hasReviewed: true,
      }));

      if (onReviewSubmitted) {
        onReviewSubmitted(result.data);
      }
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  }, [visitId, reviewFormData, canSubmitReviewForm, onReviewSubmitted]);

  // ─────────────────────────────────────────────────────────────
  // Engagement Tracking
  // ─────────────────────────────────────────────────────────────

  const trackLinkSaw = useCallback(async () => {
    if (!visitId || hasTrackedLinkSaw) return;

    try {
      await visitReviewerService.trackEngagement({
        visitId,
        eventType: 'link_saw',
      });
      setHasTrackedLinkSaw(true);
    } catch (err) {
      // Silent fail for tracking - not critical
      console.warn('Failed to track link_saw:', err);
    }
  }, [visitId, hasTrackedLinkSaw]);

  const trackMapSaw = useCallback(async () => {
    if (!visitId) return;

    try {
      await visitReviewerService.trackEngagement({
        visitId,
        eventType: 'map_saw',
      });
    } catch (err) {
      console.warn('Failed to track map_saw:', err);
    }
  }, [visitId]);

  const trackNarrationHeard = useCallback(async () => {
    if (!visitId) return;

    try {
      await visitReviewerService.trackEngagement({
        visitId,
        eventType: 'narration_heard',
      });
    } catch (err) {
      console.warn('Failed to track narration_heard:', err);
    }
  }, [visitId]);

  // ─────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────

  return {
    // Data
    houseManual,
    visit,
    groupedSections,
    sectionCount,

    // Loading/Error state
    isLoading,
    error,
    hasAccessDenied,
    accessDeniedReason,

    // Auth state
    isAuthenticated,
    currentUserId,

    // Section handlers
    expandedSections,
    toggleSection,
    expandAllSections,
    collapseAllSections,
    isSectionExpanded,

    // Review form
    showReviewForm,
    reviewFormData,
    reviewSubmitted,
    reviewSuccess,
    reviewError,
    isSubmittingReview,
    canUserSubmitReview,
    canSubmitReviewForm,
    handleReviewTextChange,
    handleRatingChange,
    handleShowReviewForm,
    handleHideReviewForm,
    handleSubmitReview,

    // Engagement tracking
    trackMapSaw,
    trackNarrationHeard,

    // Reload
    loadManualData,
  };
}
