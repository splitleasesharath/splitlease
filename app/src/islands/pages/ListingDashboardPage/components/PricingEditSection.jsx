import { useState, useEffect, useCallback } from 'react';
import { HostScheduleSelector } from '../../../shared/HostScheduleSelector';

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
  const [weeksOffered, setWeeksOffered] = useState('');
  const [weeklyRate, setWeeklyRate] = useState(listing?.weeklyRate || 0);

  // Monthly pricing
  const [monthlyRate, setMonthlyRate] = useState(listing?.monthlyHostRate || 0);
  const [monthlyAgreement, setMonthlyAgreement] = useState('agree');

  // Min/max nights per week
  const [minNights, setMinNights] = useState(listing?.nightsPerWeekMin || 2);
  const [maxNights, setMaxNights] = useState(listing?.nightsPerWeekMax || 7);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

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

  // Handle save
  const handleSave = async () => {
    if (!isFormValid()) return;

    setIsSaving(true);
    try {
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
        updates['Weeks Offered'] = weeksOffered;
        updates['💰Weekly Host Rate'] = weeklyRate;
      } else if (selectedRentalType === 'Monthly') {
        updates['💰Monthly Host Rate'] = monthlyRate;
      }

      await onSave(updates);
      onClose();
    } catch (error) {
      console.error('Error saving pricing:', error);
      alert('Failed to save pricing. Please try again.');
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
          <button className="pricing-edit-back" onClick={onClose}>
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
                className="pricing-edit-help"
                onClick={() =>
                  alert(
                    'Set your pricing preferences for your listing based on your chosen rental style.'
                  )
                }
              >
                ?
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
                  className="pricing-edit-field__help"
                  onClick={() =>
                    alert(
                      'A refundable security deposit to cover potential damages during the stay.'
                    )
                  }
                >
                  ?
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
                  className="pricing-edit-field__help"
                  onClick={() =>
                    alert(
                      'A recurring fee to cover cleaning and maintenance costs.'
                    )
                  }
                >
                  ?
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
                  listing={{ nightsAvailable: selectedNights }}
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
                    className="pricing-edit-field__help"
                    onClick={() =>
                      alert(
                        'Set the minimum and maximum number of nights guests can book per week.'
                      )
                    }
                  >
                    ?
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
                            className="pricing-edit-field__help"
                            onClick={() =>
                              alert(
                                `Set the weekly rate you want to receive when guests book ${nights} nights per week.`
                              )
                            }
                          >
                            ?
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
                    className="pricing-edit-field__help"
                    onClick={() =>
                      alert('Set the weekly rate for your listing.')
                    }
                  >
                    ?
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
                    className="pricing-edit-field__help"
                    onClick={() =>
                      alert('Set the monthly rate for your listing.')
                    }
                  >
                    ?
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
                    className="pricing-edit-field__help"
                    onClick={() =>
                      alert(
                        'Learn more about our Monthly rental model and how it works.'
                      )
                    }
                  >
                    ?
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
        </div>
      </div>
    </div>
  );
}
