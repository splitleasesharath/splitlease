import React, { useState } from 'react';
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

  const handleChange = (field: keyof Pricing, value: any) => {
    onChange({ ...data, [field]: value });
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate damage deposit
    if (data.damageDeposit < 500) {
      newErrors.damageDeposit = 'Damage deposit must be at least $500';
    }

    // Rental type specific validation
    if (rentalType === 'Monthly') {
      if (!data.monthlyCompensation || data.monthlyCompensation <= 0) {
        newErrors.monthlyCompensation = 'Monthly compensation is required';
      }
    } else if (rentalType === 'Weekly') {
      if (!data.weeklyCompensation || data.weeklyCompensation <= 0) {
        newErrors.weeklyCompensation = 'Weekly compensation is required';
      }
    } else if (rentalType === 'Nightly') {
      if (!data.nightlyPricing || data.nightlyPricing.oneNightPrice <= 0) {
        newErrors.nightlyPricing = '1-night price is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext();
    }
  };

  return (
    <div className="section-container pricing-section">
      <h2 className="section-title">Pricing</h2>
      <p className="section-subtitle">Set your rental rates and fees</p>

      {/* Nightly Pricing Interface */}
      {rentalType === 'Nightly' && (
        <div className="nightly-pricing">
          <h3>Nightly Rate Calculator</h3>
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
                  cumulativeNight2: prices.n1 + prices.n2,
                  cumulativeNight3: prices.n1 + prices.n2 + prices.n3,
                  cumulativeNight4: prices.n1 + prices.n2 + prices.n3 + prices.n4,
                  cumulativeNight5: prices.n1 + prices.n2 + prices.n3 + prices.n4 + prices.n5
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
                value={data.monthlyCompensation || 1850}
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
