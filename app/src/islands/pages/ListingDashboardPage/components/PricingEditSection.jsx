import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { HostScheduleSelector } from '../../../shared/HostScheduleSelector';
import InformationalText from '../../../shared/InformationalText';
import { ConfirmModal } from '../../HostOverviewPage/components/HostOverviewModals';

// Rental type options with descriptions
const RENTAL_TYPES = [
  {
    id: 'Nightly',
    title: "Nightly's Display",
    description:
      'Rent out the same nights each week (e.g., every Thu-Sun from August to December). Ideal for hosts regularly away on certain nights, like weekends or work trips.',
    benefits: ['Keep your home on off-nights', 'Set your nightly rate'],
  },
  {
    id: 'Weekly',
    title: "Weekly's Display",
    description:
      'Lease specific weeks each month (e.g., two weeks on, two weeks off from August to December). Perfect for hosts who split their time between locations or travel part of each month.',
    benefits: ['Keep or lease unused weeks', 'Set your weekly rate'],
  },
  {
    id: 'Monthly',
    title: "Monthly's Display",
    description:
      'Standard month-to-month lease (e.g., continuous stay from August to December). Best for hosts who want steady occupancy with minimal management.',
    benefits: ['Continuous occupancy with stable income', 'Set your monthly rate'],
  },
];

// Weekly pattern options
const WEEKLY_PATTERNS = [
  { value: '', label: 'Select a Weekly Pattern' },
  { value: '1', label: '1 week on, 1 week off' },
  { value: '2', label: '2 weeks on, 2 weeks off' },
  { value: '3', label: '1 week on, 3 weeks off' },
  { value: 'custom', label: 'Custom pattern' },
];

/**
 * PricingEditSection - Full editing panel for pricing and lease style
 * Based on Bubble.io "Pricing and Availability" section
 */
export default function PricingEditSection({
  listing,
  onClose,
  onSave,
  isOwner = true,
}) {
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

  // Refs for informational text tooltips
  const pricingControlsInfoRef = useRef(null);
  const damageDepositInfoRef = useRef(null);
  const maintenanceFeeInfoRef = useRef(null);
  const nightsPerWeekInfoRef = useRef(null);
  const weeklyCompInfoRefs = {
    2: useRef(null),
    3: useRef(null),
    4: useRef(null),
    5: useRef(null),
  };
  const weeklyPricingInfoRef = useRef(null);
  const monthlyCompInfoRef = useRef(null);
  const monthlyAgreementInfoRef = useRef(null);

  // Informational text content
  const infoContent = {
    pricingControls: {
      title: 'Pricing Controls',
      content: 'Set your pricing preferences for your listing based on your chosen rental style. Your rates determine how much you earn when guests book.',
    },
    damageDeposit: {
      title: 'Damage Deposit',
      content: 'A refundable security deposit to cover potential damages during the stay. This protects your property and is returned to the guest if no damage occurs.',
      expandedContent: 'The minimum damage deposit is $500. This amount is held during the stay and refunded within 7 days after checkout, minus any deductions for damages.',
    },
    maintenanceFee: {
      title: 'Maintenance Fee',
      content: 'A recurring monthly fee to cover cleaning and maintenance costs between guest stays.',
      expandedContent: 'This fee helps ensure your property stays in top condition. It covers regular cleaning, minor repairs, and general upkeep.',
    },
    nightsPerWeek: {
      title: 'Nights Per Week',
      content: 'Set the minimum and maximum number of nights guests can book per week. This gives you control over your schedule while maximizing occupancy.',
    },
    weeklyComp: (nights) => ({
      title: `${nights}-Night Occupancy`,
      content: `Set the weekly rate you want to receive when guests book ${nights} nights per week.`,
      expandedContent: `Your nightly rate at ${nights} nights/week will be calculated by dividing your weekly compensation by ${nights}. Higher occupancy typically means lower per-night rates but more total earnings.`,
    }),
    weeklyPricing: {
      title: 'Weekly Rate',
      content: 'Set the weekly rate for your listing. This is the total amount you\'ll receive for each week a guest stays.',
    },
    monthlyComp: {
      title: 'Monthly Compensation',
      content: 'Set the monthly rate for your listing. This should be between $1,000 and $10,000.',
      expandedContent: 'Your monthly rate is the total you\'ll receive each month. Split Lease handles all guest payments and ensures consistent monthly income.',
    },
    monthlyAgreement: {
      title: 'Monthly Model Agreement',
      content: 'Our Split Lease Monthly model helps guests meet rent obligations through a subsidy. For financial stability, we may need to sublease unused nights.',
      expandedContent: 'If this arrangement isn\'t ideal for you, consider our Nightly or Weekly models which don\'t require this provision. These offer more flexibility in how your space is used.',
    },
  };

  // Handle info tooltip toggle
  const handleInfoClick = (tooltipId, ref) => (e) => {
    e.stopPropagation();
    setActiveInfoTooltip(activeInfoTooltip === tooltipId ? null : tooltipId);
  };

  // Handle back button click - show confirmation if changes exist
  const handleBackClick = useCallback(() => {
    console.log('🔙 Back button clicked, hasChanges:', hasChanges);
    if (hasChanges) {
      console.log('📋 Showing confirmation modal');
      setShowConfirmModal(true);
    } else {
      console.log('✅ No changes, closing directly');
      onClose();
    }
  }, [hasChanges, onClose]);

  // Handle confirmation modal confirm (discard changes)
  const handleConfirmDiscard = useCallback(() => {
    setShowConfirmModal(false);
    onClose();
  }, [onClose]);

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

  // Handle save
  const handleSave = async () => {
    if (!isFormValid()) return;

    setIsSaving(true);
    try {
      // Get change summary before saving
      const changeSummary = getChangeSummary();

      const updates = {
        'rental type': selectedRentalType,
        '💰Damage Deposit': damageDeposit,
        '💰Cleaning Cost / Maintenance Fee': maintenanceFee,
        'Minimum Nights': minNights,
        'Maximum Nights': maxNights,
      };

      // Add rental-type specific fields
      if (selectedRentalType === 'Nightly') {
        // Convert night IDs back to Bubble format (1-7)
        const nightMap = {
          sunday: 1,
          monday: 2,
          tuesday: 3,
          wednesday: 4,
          thursday: 5,
          friday: 6,
          saturday: 7,
        };
        const bubbleDays = selectedNights.map((n) => nightMap[n]).sort();
        updates['Days Available (List of Days)'] = JSON.stringify(bubbleDays);

        // Preserve 1-night rate if available (primarily set during listing creation)
        // Note: Dashboard currently doesn't have UI to edit 1-night rate directly
        if (listing?.pricing?.[1]) {
          updates['💰Nightly Host Rate for 1 night'] = listing.pricing[1];
        }

        // Calculate nightly rates from weekly compensation
        updates['💰Nightly Host Rate for 2 nights'] = calculateNightlyRate(
          nightlyPricing[2],
          2
        );
        updates['💰Nightly Host Rate for 3 nights'] = calculateNightlyRate(
          nightlyPricing[3],
          3
        );
        updates['💰Nightly Host Rate for 4 nights'] = calculateNightlyRate(
          nightlyPricing[4],
          4
        );
        updates['💰Nightly Host Rate for 5 nights'] = calculateNightlyRate(
          nightlyPricing[5],
          5
        );
        updates['💰Nightly Host Rate for 7 nights'] = calculateNightlyRate(
          nightlyPricing[5],
          7
        ); // Use 5-night rate for 7
      } else if (selectedRentalType === 'Weekly') {
        updates['Weeks offered'] = weeksOffered;
        updates['💰Weekly Host Rate'] = weeklyRate;
      } else if (selectedRentalType === 'Monthly') {
        updates['💰Monthly Host Rate'] = monthlyRate;
      }

      await onSave(updates);

      // Show success toast with change summary
      const toastContent = changeSummary.length > 0
        ? changeSummary.slice(0, 3).join(' • ') + (changeSummary.length > 3 ? ` (+${changeSummary.length - 3} more)` : '')
        : 'Pricing settings saved';

      window.showToast?.({
        title: 'Pricing Updated!',
        content: toastContent,
        type: 'success'
      });

      onClose();
    } catch (error) {
      console.error('Error saving pricing:', error);
      window.showToast?.({
        title: 'Save Failed',
        content: 'Failed to save pricing. Please try again.',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
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

  return (
    <div className="pricing-edit-overlay">
      <div className="pricing-edit-container">
        {/* Header with back button */}
        <div className="pricing-edit-header">
          <button className="pricing-edit-back" onClick={handleBackClick}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Go Back</span>
          </button>
        </div>

        {/* Main content */}
        <div className="pricing-edit-content">
          {/* Title and Save */}
          <div className="pricing-edit-title-row">
            <div className="pricing-edit-title">
              <h2>Pricing Controls</h2>
              <button
                ref={pricingControlsInfoRef}
                className="pricing-edit-help"
                onClick={handleInfoClick('pricingControls')}
                aria-label="Learn more about pricing controls"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>
            </div>
            <button
              className={`pricing-edit-save ${!isFormValid() ? 'pricing-edit-save--disabled' : ''}`}
              onClick={handleSave}
              disabled={!isFormValid() || isSaving}
            >
              {isSaving ? 'Saving...' : getSaveButtonText()}
            </button>
          </div>

          {/* Rental Type Selection */}
          <div className="pricing-edit-rental-types">
            {RENTAL_TYPES.map((type) => (
              <div
                key={type.id}
                className={`pricing-edit-rental-card ${
                  selectedRentalType === type.id
                    ? 'pricing-edit-rental-card--selected'
                    : ''
                } ${!isOwner ? 'pricing-edit-rental-card--disabled' : ''}`}
                onClick={() => isOwner && setSelectedRentalType(type.id)}
              >
                <div className="pricing-edit-rental-card__header">
                  <span className="pricing-edit-rental-card__title">
                    {type.title}
                  </span>
                  <svg
                    className="pricing-edit-rental-card__star"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <p className="pricing-edit-rental-card__description">
                  {type.description}
                </p>
                <ul className="pricing-edit-rental-card__benefits">
                  {type.benefits.map((benefit, idx) => (
                    <li key={idx}>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Common Fields: Damage Deposit & Maintenance Fee */}
          <div className="pricing-edit-common-fields">
            <div className="pricing-edit-field">
              <label>
                Damage Deposit*
                <button
                  ref={damageDepositInfoRef}
                  className="pricing-edit-field__help"
                  onClick={handleInfoClick('damageDeposit')}
                  aria-label="Learn more about damage deposit"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </button>
              </label>
              <input
                type="number"
                value={damageDeposit}
                onChange={(e) => setDamageDeposit(Number(e.target.value))}
                placeholder="$500 (min)"
                min={500}
                disabled={!isOwner}
              />
              <span className="pricing-edit-field__hint">Minimum: $500</span>
            </div>

            <div className="pricing-edit-field">
              <label>
                Monthly Maintenance Fee
                <button
                  ref={maintenanceFeeInfoRef}
                  className="pricing-edit-field__help"
                  onClick={handleInfoClick('maintenanceFee')}
                  aria-label="Learn more about maintenance fee"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </button>
              </label>
              <input
                type="number"
                value={maintenanceFee}
                onChange={(e) => setMaintenanceFee(Number(e.target.value))}
                placeholder="$125"
                disabled={!isOwner}
              />
            </div>
          </div>

          {/* Nightly-specific fields */}
          {selectedRentalType === 'Nightly' && (
            <div className="pricing-edit-nightly">
              {/* Schedule Selector */}
              <div className="pricing-edit-schedule">
                <div className="pricing-edit-schedule__header">
                  <label>Select Available Nights</label>
                  <button
                    className="pricing-edit-schedule__select-all"
                    onClick={handleSelectAllNights}
                    disabled={!isOwner}
                  >
                    Select All Nights
                  </button>
                </div>
                <HostScheduleSelector
                  selectedNights={selectedNights}
                  onSelectionChange={handleNightSelectionChange}
                  isClickable={isOwner}
                  mode="normal"
                />
                <div className="pricing-edit-schedule__legend">
                  <div className="pricing-edit-schedule__legend-item">
                    <span className="pricing-edit-schedule__legend-dot pricing-edit-schedule__legend-dot--selected" />
                    <span>{selectedNights.length} Nights Available</span>
                  </div>
                  <div className="pricing-edit-schedule__legend-item">
                    <span className="pricing-edit-schedule__legend-dot pricing-edit-schedule__legend-dot--unselected" />
                    <span>
                      {7 - selectedNights.length} Nights Not Available
                    </span>
                  </div>
                </div>
              </div>

              {/* Min/Max nights */}
              <div className="pricing-edit-nights-range">
                <label>
                  Ideal # of Nights Per Week
                  <button
                    ref={nightsPerWeekInfoRef}
                    className="pricing-edit-field__help"
                    onClick={handleInfoClick('nightsPerWeek')}
                    aria-label="Learn more about nights per week"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </button>
                </label>
                <div className="pricing-edit-nights-range__inputs">
                  <input
                    type="number"
                    value={minNights}
                    onChange={(e) => setMinNights(Number(e.target.value))}
                    min={2}
                    max={6}
                    disabled={!isOwner}
                  />
                  <span>to</span>
                  <input
                    type="number"
                    value={maxNights}
                    onChange={(e) => setMaxNights(Number(e.target.value))}
                    min={minNights}
                    max={7}
                    disabled={!isOwner}
                  />
                </div>
              </div>

              {/* Compensation Calculator */}
              <div className="pricing-edit-compensation">
                <h3>Weekly Compensation Rates</h3>
                <div className="pricing-edit-compensation__grid">
                  {[2, 3, 4, 5].map((nights) => {
                    if (selectedNights.length < nights) return null;
                    return (
                      <div
                        key={nights}
                        className="pricing-edit-compensation__item"
                      >
                        <label>
                          Your Compensation / Week @ {nights} nights / week
                          occupancy
                          <button
                            ref={weeklyCompInfoRefs[nights]}
                            className="pricing-edit-field__help"
                            onClick={handleInfoClick(`weeklyComp${nights}`)}
                            aria-label={`Learn more about ${nights}-night pricing`}
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                              <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                          </button>
                        </label>
                        <input
                          type="number"
                          value={nightlyPricing[nights]}
                          onChange={(e) =>
                            setNightlyPricing((prev) => ({
                              ...prev,
                              [nights]: Number(e.target.value),
                            }))
                          }
                          placeholder={`$${nights * 100} (weekly)`}
                          disabled={!isOwner}
                        />
                        <span className="pricing-edit-compensation__rate">
                          {formatCurrency(
                            calculateNightlyRate(nightlyPricing[nights], nights)
                          )}
                          /night
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Weekly-specific fields */}
          {selectedRentalType === 'Weekly' && (
            <div className="pricing-edit-weekly">
              <div className="pricing-edit-field">
                <label>Weeks Offered*</label>
                <select
                  value={weeksOffered}
                  onChange={(e) => setWeeksOffered(e.target.value)}
                  disabled={!isOwner}
                >
                  {WEEKLY_PATTERNS.map((pattern) => (
                    <option key={pattern.value} value={pattern.value}>
                      {pattern.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pricing-edit-field">
                <label>
                  Weekly Pricing*
                  <button
                    ref={weeklyPricingInfoRef}
                    className="pricing-edit-field__help"
                    onClick={handleInfoClick('weeklyPricing')}
                    aria-label="Learn more about weekly pricing"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </button>
                </label>
                <input
                  type="number"
                  value={weeklyRate}
                  onChange={(e) => setWeeklyRate(Number(e.target.value))}
                  placeholder="Define Weekly Rent"
                  disabled={!isOwner}
                />
              </div>
            </div>
          )}

          {/* Monthly-specific fields */}
          {selectedRentalType === 'Monthly' && (
            <div className="pricing-edit-monthly">
              <div className="pricing-edit-field">
                <label>
                  Monthly Host Compensation*
                  <button
                    ref={monthlyCompInfoRef}
                    className="pricing-edit-field__help"
                    onClick={handleInfoClick('monthlyComp')}
                    aria-label="Learn more about monthly compensation"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </button>
                </label>
                <input
                  type="number"
                  value={monthlyRate}
                  onChange={(e) => setMonthlyRate(Number(e.target.value))}
                  placeholder="Define Monthly Rent"
                  min={1000}
                  max={10000}
                  disabled={!isOwner}
                />
                <span className="pricing-edit-field__hint">
                  Please set an amount between $1,000 and $10,000 for your
                  listing
                </span>
              </div>

              {/* Agreement Section */}
              <div className="pricing-edit-agreement">
                <div className="pricing-edit-agreement__info">
                  <p>
                    Our Split Lease 'Monthly' model helps guests meet rent
                    obligations through a subsidy. For financial stability, we
                    may need to sublease unused nights. If this isn't ideal, our
                    other models might be more fitting for you, as they don't
                    require this provision.
                  </p>
                  <button
                    ref={monthlyAgreementInfoRef}
                    className="pricing-edit-field__help"
                    onClick={handleInfoClick('monthlyAgreement')}
                    aria-label="Learn more about monthly model agreement"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </button>
                </div>
                <div className="pricing-edit-agreement__options">
                  <label>
                    <input
                      type="radio"
                      name="monthlyAgreement"
                      value="agree"
                      checked={monthlyAgreement === 'agree'}
                      onChange={(e) => setMonthlyAgreement(e.target.value)}
                      disabled={!isOwner}
                    />
                    I agree
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="monthlyAgreement"
                      value="disagree"
                      checked={monthlyAgreement === 'disagree'}
                      onChange={(e) => setMonthlyAgreement(e.target.value)}
                      disabled={!isOwner}
                    />
                    No, I will select different style
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Save Button - More intuitive placement */}
          <div className="pricing-edit-footer">
            <button
              className={`pricing-edit-save-bottom ${!isFormValid() ? 'pricing-edit-save-bottom--disabled' : ''}`}
              onClick={handleSave}
              disabled={!isFormValid() || isSaving}
            >
              {isSaving ? 'Saving...' : getSaveButtonText()}
            </button>
          </div>
        </div>
      </div>

      {/* Informational Text Tooltips */}
      <InformationalText
        isOpen={activeInfoTooltip === 'pricingControls'}
        onClose={() => setActiveInfoTooltip(null)}
        triggerRef={pricingControlsInfoRef}
        title={infoContent.pricingControls.title}
        content={infoContent.pricingControls.content}
      />

      <InformationalText
        isOpen={activeInfoTooltip === 'damageDeposit'}
        onClose={() => setActiveInfoTooltip(null)}
        triggerRef={damageDepositInfoRef}
        title={infoContent.damageDeposit.title}
        content={infoContent.damageDeposit.content}
        expandedContent={infoContent.damageDeposit.expandedContent}
        showMoreAvailable={true}
      />

      <InformationalText
        isOpen={activeInfoTooltip === 'maintenanceFee'}
        onClose={() => setActiveInfoTooltip(null)}
        triggerRef={maintenanceFeeInfoRef}
        title={infoContent.maintenanceFee.title}
        content={infoContent.maintenanceFee.content}
        expandedContent={infoContent.maintenanceFee.expandedContent}
        showMoreAvailable={true}
      />

      <InformationalText
        isOpen={activeInfoTooltip === 'nightsPerWeek'}
        onClose={() => setActiveInfoTooltip(null)}
        triggerRef={nightsPerWeekInfoRef}
        title={infoContent.nightsPerWeek.title}
        content={infoContent.nightsPerWeek.content}
      />

      {/* Weekly Compensation Info Tooltips */}
      {[2, 3, 4, 5].map((nights) => (
        <InformationalText
          key={`weeklyComp${nights}`}
          isOpen={activeInfoTooltip === `weeklyComp${nights}`}
          onClose={() => setActiveInfoTooltip(null)}
          triggerRef={weeklyCompInfoRefs[nights]}
          title={infoContent.weeklyComp(nights).title}
          content={infoContent.weeklyComp(nights).content}
          expandedContent={infoContent.weeklyComp(nights).expandedContent}
          showMoreAvailable={true}
        />
      ))}

      <InformationalText
        isOpen={activeInfoTooltip === 'weeklyPricing'}
        onClose={() => setActiveInfoTooltip(null)}
        triggerRef={weeklyPricingInfoRef}
        title={infoContent.weeklyPricing.title}
        content={infoContent.weeklyPricing.content}
      />

      <InformationalText
        isOpen={activeInfoTooltip === 'monthlyComp'}
        onClose={() => setActiveInfoTooltip(null)}
        triggerRef={monthlyCompInfoRef}
        title={infoContent.monthlyComp.title}
        content={infoContent.monthlyComp.content}
        expandedContent={infoContent.monthlyComp.expandedContent}
        showMoreAvailable={true}
      />

      <InformationalText
        isOpen={activeInfoTooltip === 'monthlyAgreement'}
        onClose={() => setActiveInfoTooltip(null)}
        triggerRef={monthlyAgreementInfoRef}
        title={infoContent.monthlyAgreement.title}
        content={infoContent.monthlyAgreement.content}
        expandedContent={infoContent.monthlyAgreement.expandedContent}
        showMoreAvailable={true}
      />

      {/* Unsaved changes confirmation modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmDiscard}
        title="Discard Changes?"
        message="Are you sure you want to go back? Any unsaved changes will be lost."
        confirmText="Yes, Discard"
        cancelText="No, Keep Editing"
        variant="danger"
      />
    </div>
  );
}
