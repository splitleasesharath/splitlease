import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

/**
 * usePricingLogic - Custom hook to manage all pricing logic for PricingEditSection
 * Extracts state management, validation, and business logic from the UI component
 */
export function usePricingLogic(listing, isOwner = true) {
  // State for rental type selection
  const [selectedRentalType, setSelectedRentalType] = useState(
    listing?.leaseStyle || 'Nightly'
  );

  // State for selected nights (for Nightly rental type)
  const [selectedNights, setSelectedNights] = useState(
    listing?.nightsAvailable || []
  );

  // State for pricing inputs
  const [damageDeposit, setDamageDeposit] = useState(
    listing?.damageDeposit || 500
  );
  const [maintenanceFee, setMaintenanceFee] = useState(
    listing?.maintenanceFee || 125
  );

  // Nightly pricing (weekly compensation for 2-7 nights)
  const [nightlyPricing, setNightlyPricing] = useState({
    2: listing?.weeklyCompensation?.[2] || 0,
    3: listing?.weeklyCompensation?.[3] || 0,
    4: listing?.weeklyCompensation?.[4] || 0,
    5: listing?.weeklyCompensation?.[5] || 0,
  });

  // Weekly pricing
  const [weeksOffered, setWeeksOffered] = useState(listing?.weeksOffered || '');
  const [weeklyRate, setWeeklyRate] = useState(listing?.weeklyHostRate || 0);

  // Monthly pricing
  const [monthlyRate, setMonthlyRate] = useState(listing?.monthlyHostRate || 0);
  const [monthlyAgreement, setMonthlyAgreement] = useState('agree');

  // Min/max nights per week
  const [minNights, setMinNights] = useState(listing?.nightsPerWeekMin || 2);
  const [maxNights, setMaxNights] = useState(listing?.nightsPerWeekMax || 7);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Informational text state
  const [activeInfoTooltip, setActiveInfoTooltip] = useState(null);

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Detect if any changes have been made compared to original listing
  const hasChanges = useMemo(() => {
    // Check rental type change
    if (selectedRentalType !== (listing?.leaseStyle || 'Nightly')) return true;

    // Check common fields
    if (damageDeposit !== (listing?.damageDeposit || 500)) return true;
    if (maintenanceFee !== (listing?.maintenanceFee || 125)) return true;

    // Check nightly-specific fields
    if (selectedRentalType === 'Nightly') {
      const originalNights = listing?.nightsAvailable || [];
      if (selectedNights.length !== originalNights.length) return true;
      if (!selectedNights.every((n) => originalNights.includes(n))) return true;
      if (minNights !== (listing?.nightsPerWeekMin || 2)) return true;
      if (maxNights !== (listing?.nightsPerWeekMax || 7)) return true;
      // Check pricing changes
      const originalComp = listing?.weeklyCompensation || {};
      if (nightlyPricing[2] !== (originalComp[2] || 0)) return true;
      if (nightlyPricing[3] !== (originalComp[3] || 0)) return true;
      if (nightlyPricing[4] !== (originalComp[4] || 0)) return true;
      if (nightlyPricing[5] !== (originalComp[5] || 0)) return true;
    }

    // Check weekly-specific fields
    if (selectedRentalType === 'Weekly') {
      if (weeklyRate !== (listing?.weeklyRate || 0)) return true;
    }

    // Check monthly-specific fields
    if (selectedRentalType === 'Monthly') {
      if (monthlyRate !== (listing?.monthlyHostRate || 0)) return true;
    }

    return false;
  }, [
    selectedRentalType,
    damageDeposit,
    maintenanceFee,
    selectedNights,
    minNights,
    maxNights,
    nightlyPricing,
    weeklyRate,
    monthlyRate,
    listing,
  ]);

  // Update selected nights when rental type changes
  useEffect(() => {
    if (selectedRentalType !== 'Nightly') {
      // Reset to all nights for non-nightly types
      setSelectedNights([
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ]);
    }
  }, [selectedRentalType]);

  // Handle night selection change
  const handleNightSelectionChange = useCallback((nights) => {
    setSelectedNights(nights);
  }, []);

  // Handle select all nights
  const handleSelectAllNights = useCallback(() => {
    setSelectedNights([
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ]);
  }, []);

  // Calculate nightly rate from weekly compensation
  const calculateNightlyRate = (weeklyComp, nightCount) => {
    if (!weeklyComp || nightCount === 0) return 0;
    return Math.round(weeklyComp / nightCount);
  };

  // Validate form based on rental type
  const isFormValid = useCallback(() => {
    // Check owner permission
    if (!isOwner) return false;

    // Damage deposit must be at least $500
    if (damageDeposit < 500) return false;

    // Validate based on rental type
    switch (selectedRentalType) {
      case 'Nightly':
        // Must have at least 2 nights selected
        if (selectedNights.length < 2) return false;
        // Must have pricing for all visible night counts
        if (selectedNights.length >= 2 && !nightlyPricing[2]) return false;
        if (selectedNights.length >= 3 && !nightlyPricing[3]) return false;
        if (selectedNights.length >= 4 && !nightlyPricing[4]) return false;
        if (selectedNights.length >= 5 && !nightlyPricing[5]) return false;
        return true;

      case 'Weekly':
        return weeksOffered !== '' && weeklyRate > 0;

      case 'Monthly':
        return (
          monthlyAgreement === 'agree' &&
          monthlyRate >= 1000 &&
          monthlyRate <= 10000
        );

      default:
        return false;
    }
  }, [
    isOwner,
    damageDeposit,
    selectedRentalType,
    selectedNights,
    nightlyPricing,
    weeksOffered,
    weeklyRate,
    monthlyAgreement,
    monthlyRate,
  ]);

  // Get save button text based on validation
  const getSaveButtonText = () => {
    if (!isOwner) return 'View Only';
    if (selectedRentalType === 'Nightly' && selectedNights.length < 2) {
      return 'Choose more Nights';
    }
    return 'Save';
  };

  // Build a human-readable list of what changed
  const getChangeSummary = () => {
    const changes = [];
    const originalLeaseStyle = listing?.leaseStyle || 'Nightly';

    // Check lease style change
    if (selectedRentalType !== originalLeaseStyle) {
      changes.push(`Lease style: ${originalLeaseStyle} → ${selectedRentalType}`);
    }

    // Check common fields
    if (damageDeposit !== (listing?.damageDeposit || 500)) {
      changes.push(`Damage deposit: $${listing?.damageDeposit || 500} → $${damageDeposit}`);
    }
    if (maintenanceFee !== (listing?.maintenanceFee || 125)) {
      changes.push(`Maintenance fee: $${listing?.maintenanceFee || 125} → $${maintenanceFee}`);
    }

    // Rental-type specific changes
    if (selectedRentalType === 'Nightly') {
      const originalNights = listing?.nightsAvailable || [];
      if (selectedNights.length !== originalNights.length ||
          !selectedNights.every((n) => originalNights.includes(n))) {
        changes.push(`Available nights updated (${selectedNights.length} nights)`);
      }
      if (minNights !== (listing?.nightsPerWeekMin || 2) ||
          maxNights !== (listing?.nightsPerWeekMax || 7)) {
        changes.push(`Nights range: ${minNights}-${maxNights}`);
      }
      // Check if any pricing changed
      const originalComp = listing?.weeklyCompensation || {};
      const pricingChanged = [2, 3, 4, 5].some(
        (n) => nightlyPricing[n] !== (originalComp[n] || 0)
      );
      if (pricingChanged) {
        changes.push('Nightly rates updated');
      }
    } else if (selectedRentalType === 'Weekly') {
      if (weeklyRate !== (listing?.weeklyHostRate || 0)) {
        changes.push(`Weekly rate: $${weeklyRate}/week`);
      }
      if (weeksOffered !== (listing?.weeksOffered || '')) {
        const patternLabels = {
          '1': '1 week on/off',
          '2': '2 weeks on/off',
          '3': '1 on, 3 off',
          'custom': 'Custom',
        };
        changes.push(`Weekly pattern: ${patternLabels[weeksOffered] || weeksOffered}`);
      }
    } else if (selectedRentalType === 'Monthly') {
      if (monthlyRate !== (listing?.monthlyHostRate || 0)) {
        changes.push(`Monthly rate: $${monthlyRate}/month`);
      }
    }

    return changes;
  };

  // Handle info tooltip toggle
  const handleInfoClick = (tooltipId) => (e) => {
    e.stopPropagation();
    setActiveInfoTooltip(activeInfoTooltip === tooltipId ? null : tooltipId);
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return {
    // State
    selectedRentalType,
    setSelectedRentalType,
    selectedNights,
    setSelectedNights,
    damageDeposit,
    setDamageDeposit,
    maintenanceFee,
    setMaintenanceFee,
    nightlyPricing,
    setNightlyPricing,
    weeksOffered,
    setWeeksOffered,
    weeklyRate,
    setWeeklyRate,
    monthlyRate,
    setMonthlyRate,
    monthlyAgreement,
    setMonthlyAgreement,
    minNights,
    setMinNights,
    maxNights,
    setMaxNights,
    isSaving,
    setIsSaving,
    activeInfoTooltip,
    setActiveInfoTooltip,
    showConfirmModal,
    setShowConfirmModal,

    // Computed values
    hasChanges,

    // Handlers
    handleNightSelectionChange,
    handleSelectAllNights,
    calculateNightlyRate,
    isFormValid,
    getSaveButtonText,
    getChangeSummary,
    handleInfoClick,
    formatCurrency,
  };
}
