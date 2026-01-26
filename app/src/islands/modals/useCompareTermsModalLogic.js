/**
 * useCompareTermsModalLogic Hook
 *
 * Hollow Component pattern - all business logic for CompareTermsModal
 * extracted into this reusable hook.
 *
 * Implements the 7-step acceptance workflow from Bubble spec:
 * 1. Show success alert (48-hour timeline message)
 * 2. Calculate lease numbering format
 * 3. Set state: Number of zeros
 * 4. Calculate 4-week compensation (original proposal)
 * 5. Update proposal status -> "Drafting Lease Documents"
 * 6. Calculate 4-week rent (counteroffer terms)
 * 7. Schedule API workflow: CORE-create-lease (TODO: Edge Function)
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase.js';
import { acceptCounteroffer, declineCounteroffer, getTermsComparison } from '../../logic/workflows/proposals/counterofferWorkflow.js';
import { formatPrice, formatDate } from '../../lib/proposals/dataTransformers.js';
import { DAY_NAMES } from '../../lib/dayUtils.js';

/**
 * Parse days selected array to consistent format
 * @param {Array|string} daysSelected - Days selected (array or JSON string)
 * @returns {number[]} Array of day indices (0-6)
 */
function parseDaysSelected(daysSelected) {
  let days = daysSelected || [];

  if (typeof days === 'string') {
    try {
      days = JSON.parse(days);
    } catch (e) {
      return [];
    }
  }

  if (!Array.isArray(days)) return [];

  return days.map(day => {
    if (typeof day === 'number') return day;
    if (typeof day === 'string') {
      const trimmed = day.trim();
      const numericValue = parseInt(trimmed, 10);
      if (!isNaN(numericValue) && String(numericValue) === trimmed) {
        return numericValue;
      }
      const dayIndex = DAY_NAMES.indexOf(trimmed);
      return dayIndex >= 0 ? dayIndex : -1;
    }
    return -1;
  }).filter(d => d >= 0 && d <= 6);
}

/**
 * Get day name from index
 * @param {number} dayIndex - Day index (0-6)
 * @returns {string} Day name
 */
function getDayNameFromIndex(dayIndex) {
  if (typeof dayIndex !== 'number' || dayIndex < 0 || dayIndex > 6) {
    return 'N/A';
  }
  return DAY_NAMES[dayIndex];
}

/**
 * useCompareTermsModalLogic Hook
 *
 * @param {Object} options - Hook options
 * @param {Object} options.proposal - Proposal object with original and HC terms
 * @param {Function} options.onClose - Callback when modal closes
 * @param {Function} options.onAcceptCounteroffer - Callback after successful acceptance
 * @param {Function} options.onCancelProposal - Callback to trigger cancel modal
 * @returns {Object} Hook state and handlers
 */
export function useCompareTermsModalLogic({
  proposal,
  onClose,
  onAcceptCounteroffer,
  onCancelProposal
}) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Get terms comparison using workflow function
  const termsComparison = useMemo(() => {
    if (!proposal) return null;
    try {
      return getTermsComparison(proposal);
    } catch (e) {
      console.error('[useCompareTermsModalLogic] Error getting terms comparison:', e);
      return null;
    }
  }, [proposal]);

  // Parse and format original terms for display
  const originalTerms = useMemo(() => {
    if (!proposal) return null;

    const moveInStart = proposal['Move in range start'];
    const moveInEnd = proposal['Move in range end'];
    const daysSelected = parseDaysSelected(proposal['Days Selected']);
    const checkInDay = proposal['check in day'];
    const checkOutDay = proposal['check out day'];
    const nightsPerWeek = proposal['nights per week (num)'] || daysSelected.length || 0;
    const reservationWeeks = proposal['Reservation Span (Weeks)'] || 0;
    const nightlyPrice = proposal['proposal nightly price'] || 0;
    const totalPrice = proposal['Total Price for Reservation (guest)'] || 0;
    const cleaningFee = proposal['cleaning fee'] || 0;
    const damageDeposit = proposal['damage deposit'] || 0;
    const maintenanceFee = proposal['maintenance fee'] || 0;

    // Calculate derived fields
    const nightsReserved = nightsPerWeek * reservationWeeks;
    const pricePerFourWeeks = nightlyPrice * nightsPerWeek * 4;
    const nightsPerFourWeeks = nightsPerWeek * 4;
    const maintenanceFeePerFourWeeks = maintenanceFee * 4;
    const initialPayment = totalPrice + cleaningFee + damageDeposit;

    return {
      moveInStart,
      moveInEnd,
      moveInDisplay: moveInEnd && moveInEnd !== moveInStart
        ? `${formatDate(moveInStart)} - ${formatDate(moveInEnd)}`
        : formatDate(moveInStart) || 'TBD',
      daysSelected,
      checkInDay: typeof checkInDay === 'number' ? checkInDay : parseInt(checkInDay, 10),
      checkOutDay: typeof checkOutDay === 'number' ? checkOutDay : parseInt(checkOutDay, 10),
      checkInDayName: getDayNameFromIndex(typeof checkInDay === 'number' ? checkInDay : parseInt(checkInDay, 10)),
      checkOutDayName: getDayNameFromIndex(typeof checkOutDay === 'number' ? checkOutDay : parseInt(checkOutDay, 10)),
      nightsPerWeek,
      reservationWeeks,
      nightlyPrice,
      nightlyPriceFormatted: formatPrice(nightlyPrice, false),
      totalPrice,
      totalPriceFormatted: formatPrice(totalPrice, false),
      cleaningFee,
      cleaningFeeFormatted: formatPrice(cleaningFee, false),
      damageDeposit,
      damageDepositFormatted: formatPrice(damageDeposit, false),
      maintenanceFee,
      maintenanceFeeFormatted: formatPrice(maintenanceFee, false),
      nightsReserved,
      pricePerFourWeeks,
      pricePerFourWeeksFormatted: formatPrice(pricePerFourWeeks, false),
      nightsPerFourWeeks,
      maintenanceFeePerFourWeeks,
      maintenanceFeePerFourWeeksFormatted: formatPrice(maintenanceFeePerFourWeeks, false),
      initialPayment,
      initialPaymentFormatted: formatPrice(initialPayment, false)
    };
  }, [proposal]);

  // Parse and format counteroffer terms for display
  const counterofferTerms = useMemo(() => {
    if (!proposal) return null;

    const moveInDate = proposal['hc move in date'];
    const daysSelected = parseDaysSelected(proposal['hc days selected'] || proposal['Days Selected']);
    const checkInDay = proposal['hc check in day'] ?? proposal['check in day'];
    const checkOutDay = proposal['hc check out day'] ?? proposal['check out day'];
    const nightsPerWeek = proposal['hc nights per week'] ?? proposal['nights per week (num)'] ?? daysSelected.length ?? 0;
    const reservationWeeks = proposal['hc reservation span (weeks)'] ?? proposal['Reservation Span (Weeks)'] ?? 0;
    const nightlyPrice = proposal['hc nightly price'] ?? proposal['proposal nightly price'] ?? 0;
    const totalPrice = proposal['hc total price'] ?? proposal['Total Price for Reservation (guest)'] ?? 0;
    const cleaningFee = proposal['hc cleaning fee'] ?? proposal['cleaning fee'] ?? 0;
    const damageDeposit = proposal['hc damage deposit'] ?? proposal['damage deposit'] ?? 0;
    const maintenanceFee = proposal['hc maintenance fee'] ?? proposal['maintenance fee'] ?? 0;

    // Calculate derived fields
    const nightsReserved = nightsPerWeek * reservationWeeks;
    const pricePerFourWeeks = nightlyPrice * nightsPerWeek * 4;
    const nightsPerFourWeeks = nightsPerWeek * 4;
    const maintenanceFeePerFourWeeks = maintenanceFee * 4;
    const initialPayment = totalPrice + cleaningFee + damageDeposit;

    return {
      moveInDate,
      moveInDisplay: formatDate(moveInDate) || 'TBD',
      daysSelected,
      checkInDay: typeof checkInDay === 'number' ? checkInDay : parseInt(checkInDay, 10),
      checkOutDay: typeof checkOutDay === 'number' ? checkOutDay : parseInt(checkOutDay, 10),
      checkInDayName: getDayNameFromIndex(typeof checkInDay === 'number' ? checkInDay : parseInt(checkInDay, 10)),
      checkOutDayName: getDayNameFromIndex(typeof checkOutDay === 'number' ? checkOutDay : parseInt(checkOutDay, 10)),
      nightsPerWeek,
      reservationWeeks,
      nightlyPrice,
      nightlyPriceFormatted: formatPrice(nightlyPrice, false),
      totalPrice,
      totalPriceFormatted: formatPrice(totalPrice, false),
      cleaningFee,
      cleaningFeeFormatted: formatPrice(cleaningFee, false),
      damageDeposit,
      damageDepositFormatted: formatPrice(damageDeposit, false),
      maintenanceFee,
      maintenanceFeeFormatted: formatPrice(maintenanceFee, false),
      nightsReserved,
      pricePerFourWeeks,
      pricePerFourWeeksFormatted: formatPrice(pricePerFourWeeks, false),
      nightsPerFourWeeks,
      maintenanceFeePerFourWeeks,
      maintenanceFeePerFourWeeksFormatted: formatPrice(maintenanceFeePerFourWeeks, false),
      initialPayment,
      initialPaymentFormatted: formatPrice(initialPayment, false)
    };
  }, [proposal]);

  // Get negotiation summaries
  const negotiationSummaries = useMemo(() => {
    return proposal?.negotiationSummaries || [];
  }, [proposal]);

  // Get house rules
  const houseRules = useMemo(() => {
    const rules = proposal?.houseRules || proposal?.listing?.houseRules || [];
    return Array.isArray(rules) ? rules : [];
  }, [proposal]);

  // Listing info
  const listingInfo = useMemo(() => {
    const listing = proposal?.listing;
    return {
      name: listing?.Name || 'Property',
      checkInTime: listing?.['Check in time'] || listing?.['NEW Date Check-in Time'] || '2:00 PM',
      checkOutTime: listing?.['Check Out time'] || listing?.['NEW Date Check-out Time'] || '11:00 AM'
    };
  }, [proposal]);

  /**
   * Handle Accept Counteroffer - 7-Step Workflow
   */
  const handleAcceptCounteroffer = useCallback(async () => {
    if (!proposal?._id) {
      setError('Proposal ID is missing');
      return;
    }

    setIsAccepting(true);
    setError(null);

    try {
      // Step 2-3: Calculate lease numbering format
      const { count: leaseCount, error: countError } = await supabase
        .from('bookings_leases')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.warn('[useCompareTermsModalLogic] Could not count leases:', countError);
      }

      const numberOfZeros = (leaseCount || 0) < 10 ? 4 : (leaseCount || 0) < 100 ? 3 : 2;

      // Step 4: Calculate 4-week compensation (from ORIGINAL proposal)
      const originalNightsPerWeek = proposal['nights per week (num)'] || 0;
      const originalNightlyPrice = proposal['proposal nightly price'] || 0;
      const fourWeekCompensation = originalNightsPerWeek * 4 * originalNightlyPrice;

      // Step 5: Update proposal status via workflow
      await acceptCounteroffer(proposal._id);

      // Step 6: Calculate 4-week rent (from COUNTEROFFER terms)
      const counterofferNightsPerWeek = proposal['hc nights per week'] || originalNightsPerWeek;
      const counterofferNightlyPrice = proposal['hc nightly price'] || originalNightlyPrice;
      const fourWeekRent = counterofferNightsPerWeek * 4 * counterofferNightlyPrice;

      // Step 7: Call lease creation Edge Function
      console.log('[useCompareTermsModalLogic] Creating lease with parameters:', {
        proposalId: proposal._id,
        numberOfZeros,
        fourWeekRent,
        isCounteroffer: 'yes',
        fourWeekCompensation
      });

      const leaseResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lease`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create',
            payload: {
              proposalId: proposal._id,
              isCounteroffer: 'yes',
              fourWeekRent,
              fourWeekCompensation,
              numberOfZeros,
            },
          }),
        }
      );

      const leaseResult = await leaseResponse.json();
      if (!leaseResult.success) {
        throw new Error(leaseResult.error || 'Failed to create lease');
      }

      console.log('[useCompareTermsModalLogic] Lease created:', leaseResult.data);

      // Step 1 (at end): Show success message
      alert('We will work on drafting a lease for you. Please give us 48 hours to finalize your lease with the terms proposed by your host.');

      // Trigger callback
      if (onAcceptCounteroffer) {
        onAcceptCounteroffer();
      }

      // Close modal
      onClose();

    } catch (err) {
      console.error('[useCompareTermsModalLogic] Error accepting counteroffer:', err);
      setError(err.message || 'Failed to accept counteroffer. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  }, [proposal, onAcceptCounteroffer, onClose]);

  /**
   * Handle Cancel/Decline Counteroffer
   */
  const handleCancelProposal = useCallback((reason) => {
    setShowCancelModal(true);
    if (onCancelProposal) {
      onCancelProposal();
    }
  }, [onCancelProposal]);

  /**
   * Handle Cancel Modal Confirm
   */
  const handleCancelConfirm = useCallback(async (reason) => {
    if (!proposal?._id) return;

    setIsCancelling(true);
    setError(null);

    try {
      await declineCounteroffer(proposal._id, reason);
      setShowCancelModal(false);
      onClose();
      // Reload to update UI
      window.location.reload();
    } catch (err) {
      console.error('[useCompareTermsModalLogic] Error declining counteroffer:', err);
      setError(err.message || 'Failed to decline counteroffer. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  }, [proposal, onClose]);

  /**
   * Handle Close Modal
   */
  const handleClose = useCallback(() => {
    if (!isAccepting && !isCancelling) {
      onClose();
    }
  }, [isAccepting, isCancelling, onClose]);

  /**
   * Handle Close Cancel Modal
   */
  const handleCloseCancelModal = useCallback(() => {
    if (!isCancelling) {
      setShowCancelModal(false);
    }
  }, [isCancelling]);

  /**
   * Toggle expanded/collapsed view of full document
   */
  const handleToggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return {
    // Loading states
    isAccepting,
    isCancelling,
    isLoading: isAccepting || isCancelling,
    error,

    // Data
    originalTerms,
    counterofferTerms,
    termsComparison,
    negotiationSummaries,
    houseRules,
    listingInfo,

    // Cancel modal state
    showCancelModal,

    // Expanded state
    isExpanded,

    // Handlers
    handleAcceptCounteroffer,
    handleCancelProposal,
    handleCancelConfirm,
    handleClose,
    handleCloseCancelModal,
    handleToggleExpanded
  };
}

export default useCompareTermsModalLogic;
