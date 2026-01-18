import { useRef } from 'react';
import HostScheduleSelector from '../../../../shared/HostScheduleSelector/HostScheduleSelector.jsx';
import InformationalText from '../../../../shared/InformationalText';

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
 * PricingForm - Handles all form inputs for pricing configuration
 * Displays rental type selection and type-specific pricing fields
 */
export function PricingForm({ pricingLogic, isOwner }) {
  const {
    selectedRentalType,
    setSelectedRentalType,
    selectedNights,
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
    activeInfoTooltip,
    handleNightSelectionChange,
    handleSelectAllNights,
    calculateNightlyRate,
    handleInfoClick,
    formatCurrency,
  } = pricingLogic;

  // Refs for informational text tooltips
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

  return (
    <>
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

      {/* Informational Text Tooltips */}
      <InformationalText
        isOpen={activeInfoTooltip === 'damageDeposit'}
        onClose={() => pricingLogic.setActiveInfoTooltip(null)}
        triggerRef={damageDepositInfoRef}
        title={infoContent.damageDeposit.title}
        content={infoContent.damageDeposit.content}
        expandedContent={infoContent.damageDeposit.expandedContent}
        showMoreAvailable={true}
      />

      <InformationalText
        isOpen={activeInfoTooltip === 'maintenanceFee'}
        onClose={() => pricingLogic.setActiveInfoTooltip(null)}
        triggerRef={maintenanceFeeInfoRef}
        title={infoContent.maintenanceFee.title}
        content={infoContent.maintenanceFee.content}
        expandedContent={infoContent.maintenanceFee.expandedContent}
        showMoreAvailable={true}
      />

      <InformationalText
        isOpen={activeInfoTooltip === 'nightsPerWeek'}
        onClose={() => pricingLogic.setActiveInfoTooltip(null)}
        triggerRef={nightsPerWeekInfoRef}
        title={infoContent.nightsPerWeek.title}
        content={infoContent.nightsPerWeek.content}
      />

      {/* Weekly Compensation Info Tooltips */}
      {[2, 3, 4, 5].map((nights) => (
        <InformationalText
          key={`weeklyComp${nights}`}
          isOpen={activeInfoTooltip === `weeklyComp${nights}`}
          onClose={() => pricingLogic.setActiveInfoTooltip(null)}
          triggerRef={weeklyCompInfoRefs[nights]}
          title={infoContent.weeklyComp(nights).title}
          content={infoContent.weeklyComp(nights).content}
          expandedContent={infoContent.weeklyComp(nights).expandedContent}
          showMoreAvailable={true}
        />
      ))}

      <InformationalText
        isOpen={activeInfoTooltip === 'weeklyPricing'}
        onClose={() => pricingLogic.setActiveInfoTooltip(null)}
        triggerRef={weeklyPricingInfoRef}
        title={infoContent.weeklyPricing.title}
        content={infoContent.weeklyPricing.content}
      />

      <InformationalText
        isOpen={activeInfoTooltip === 'monthlyComp'}
        onClose={() => pricingLogic.setActiveInfoTooltip(null)}
        triggerRef={monthlyCompInfoRef}
        title={infoContent.monthlyComp.title}
        content={infoContent.monthlyComp.content}
        expandedContent={infoContent.monthlyComp.expandedContent}
        showMoreAvailable={true}
      />

      <InformationalText
        isOpen={activeInfoTooltip === 'monthlyAgreement'}
        onClose={() => pricingLogic.setActiveInfoTooltip(null)}
        triggerRef={monthlyAgreementInfoRef}
        title={infoContent.monthlyAgreement.title}
        content={infoContent.monthlyAgreement.content}
        expandedContent={infoContent.monthlyAgreement.expandedContent}
        showMoreAvailable={true}
      />
    </>
  );
}
