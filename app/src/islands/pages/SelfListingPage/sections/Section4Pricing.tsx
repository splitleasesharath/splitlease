import React, { useState, useCallback } from 'react';
import type { Pricing, NightlyPricing, RentalType } from '../types/listing.types';
import { NightlyPriceSlider } from '../components/NightlyPriceSlider';

interface Section4Props {
  data: Pricing;
  rentalType: RentalType;
  onChange: (data: Pricing) => void;
  onNext: () => void;
  onBack: () => void;
}

export const Section4Pricing: React.FC<Section4Props> = ({
  data,
  rentalType,
  onChange,
  onNext,
  onBack
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Scroll to first error field
  const scrollToFirstError = useCallback((errorKeys: string[]) => {
    if (errorKeys.length === 0) return;
    const firstErrorKey = errorKeys[0];
    const element = document.getElementById(firstErrorKey);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();
    }
  }, []);

  const handleChange = (field: keyof Pricing, value: any) => {
    onChange({ ...data, [field]: value });
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const validateForm = (): string[] => {
    const newErrors: Record<string, string> = {};
    const errorOrder: string[] = [];

    // Rental type specific validation (check first as it's at the top)
    if (rentalType === 'Monthly') {
      if (!data.monthlyCompensation || data.monthlyCompensation <= 0) {
        newErrors.monthlyCompensation = 'Monthly compensation is required';
        errorOrder.push('monthlyCompensation');
      }
    } else if (rentalType === 'Weekly') {
      if (!data.weeklyCompensation || data.weeklyCompensation <= 0) {
        newErrors.weeklyCompensation = 'Weekly compensation is required';
        errorOrder.push('weeklyCompensation');
      }
    } else if (rentalType === 'Nightly') {
      if (!data.nightlyPricing || data.nightlyPricing.oneNightPrice <= 0) {
        newErrors.nightlyPricing = '1-night price is required';
        errorOrder.push('nightlyPricing');
      }
    }

    // Validate damage deposit
    if (data.damageDeposit < 500) {
      newErrors.damageDeposit = 'Damage deposit must be at least $500';
      errorOrder.push('damageDeposit');
    }

    setErrors(newErrors);
    return errorOrder;
  };

  const handleNext = () => {
    const errorKeys = validateForm();
    if (errorKeys.length === 0) {
      onNext();
    } else {
      scrollToFirstError(errorKeys);
    }
  };

  return (
    <div className="section-container pricing-section">
      <h2 className="section-title">Pricing</h2>
      <p className="section-subtitle">Set your rental rates and fees</p>

      {/* Nightly Pricing Interface */}
      {rentalType === 'Nightly' && (
        <div className="nightly-pricing" id="nightlyPricing">
          <p className="pricing-description" style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '20px' }}>
            Set your base rate. Longer stays get automatic discounts to encourage bookings.
          </p>
          <NightlyPriceSlider
            initialP1={data.nightlyPricing?.oneNightPrice || 99}
            initialDecay={data.nightlyPricing?.decayPerNight || 0.956}
            onPricesChange={(prices) => {
              const nightlyPricing: NightlyPricing = {
                oneNightPrice: prices.p1,
                decayPerNight: prices.decay,
                fiveNightTotal: prices.n1 + prices.n2 + prices.n3 + prices.n4 + prices.n5,
                calculatedRates: {
                  night1: prices.n1,
                  night2: prices.n2,
                  night3: prices.n3,
                  night4: prices.n4,
                  night5: prices.n5,
                  night6: prices.n6,
                  night7: prices.n7,
                  cumulativeNight2: prices.n1 + prices.n2,
                  cumulativeNight3: prices.n1 + prices.n2 + prices.n3,
                  cumulativeNight4: prices.n1 + prices.n2 + prices.n3 + prices.n4,
                  cumulativeNight5: prices.n1 + prices.n2 + prices.n3 + prices.n4 + prices.n5,
                  cumulativeNight6: prices.n1 + prices.n2 + prices.n3 + prices.n4 + prices.n5 + prices.n6,
                  cumulativeNight7: prices.n1 + prices.n2 + prices.n3 + prices.n4 + prices.n5 + prices.n6 + prices.n7
                }
              };
              onChange({ ...data, nightlyPricing });
            }}
          />
          {errors.nightlyPricing && (
            <span className="error-message">{errors.nightlyPricing}</span>
          )}
        </div>
      )}

      {/* Weekly Pricing Interface */}
      {rentalType === 'Weekly' && (
        <div className="weekly-pricing">
          <div className="form-group">
            <label htmlFor="weeklyCompensation">
              Weekly Compensation<span className="required">*</span>
            </label>
            <div className="price-input-group">
              <span className="currency-symbol">$</span>
              <input
                type="number"
                id="weeklyCompensation"
                placeholder="600 (example)"
                value={data.weeklyCompensation || ''}
                onChange={(e) =>
                  handleChange('weeklyCompensation', parseInt(e.target.value) || 0)
                }
                className={errors.weeklyCompensation ? 'input-error' : ''}
              />
            </div>
            {errors.weeklyCompensation && (
              <span className="error-message">{errors.weeklyCompensation}</span>
            )}
          </div>
        </div>
      )}

      {/* Monthly Pricing Interface */}
      {rentalType === 'Monthly' && (
        <div className="monthly-pricing">
          <div className="form-group">
            <label htmlFor="monthlyCompensation">
              Monthly Compensation<span className="required">*</span>
            </label>
            <div className="price-input-group">
              <span className="currency-symbol">$</span>
              <input
                type="number"
                id="monthlyCompensation"
                placeholder="1850 (example)"
                value={data.monthlyCompensation || ''}
                onChange={(e) =>
                  handleChange('monthlyCompensation', parseInt(e.target.value) || 0)
                }
                className={errors.monthlyCompensation ? 'input-error' : ''}
              />
            </div>
            {errors.monthlyCompensation && (
              <span className="error-message">{errors.monthlyCompensation}</span>
            )}
          </div>
        </div>
      )}

      {/* Common Fields for All Rental Types */}
      <div className="common-pricing-fields">
        <div className="form-group">
          <label htmlFor="damageDeposit">
            Damage Deposit<span className="required">*</span>
            <span className="field-note"> (minimum $500)</span>
          </label>
          <div className="price-input-group">
            <span className="currency-symbol">$</span>
            <input
              type="number"
              id="damageDeposit"
              min="500"
              value={data.damageDeposit}
              onChange={(e) => handleChange('damageDeposit', parseInt(e.target.value) || 500)}
              className={errors.damageDeposit ? 'input-error' : ''}
            />
          </div>
          {errors.damageDeposit && (
            <span className="error-message">{errors.damageDeposit}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="maintenanceFee">Monthly Maintenance/Cleaning Fee (Optional)</label>
          <div className="price-input-group">
            <span className="currency-symbol">$</span>
            <input
              type="number"
              id="maintenanceFee"
              min="0"
              placeholder="0"
              value={data.maintenanceFee}
              onChange={(e) => handleChange('maintenanceFee', parseInt(e.target.value) || 0)}
            />
          </div>
          <small className="field-hint">This fee will be charged monthly</small>
        </div>
      </div>

      {/* Navigation */}
      <div className="section-navigation">
        <button type="button" className="btn-back" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn-next" onClick={handleNext}>
          Next
        </button>
      </div>
    </div>
  );
};
