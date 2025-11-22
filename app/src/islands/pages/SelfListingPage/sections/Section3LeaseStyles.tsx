import React, { useState } from 'react';
import type { LeaseStylesConfig, RentalType, WeeklyPattern } from '../types/listing.types';

interface Section3Props {
  data: LeaseStylesConfig;
  onChange: (data: LeaseStylesConfig) => void;
  onNext: () => void;
  onBack: () => void;
}

export const Section3LeaseStyles: React.FC<Section3Props> = ({
  data,
  onChange,
  onNext,
  onBack
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleRentalTypeChange = (type: RentalType) => {
    const newData: LeaseStylesConfig = {
      ...data,
      rentalType: type
    };

    // Reset type-specific fields when switching
    if (type === 'Nightly') {
      newData.availableNights = {
        sunday: true,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true
      };
      delete newData.weeklyPattern;
      delete newData.subsidyAgreement;
    } else if (type === 'Weekly') {
      delete newData.availableNights;
      newData.weeklyPattern = '';
      delete newData.subsidyAgreement;
    } else if (type === 'Monthly') {
      delete newData.availableNights;
      delete newData.weeklyPattern;
      // Don't set subsidyAgreement automatically, let user select
    }

    onChange(newData);
    setErrors({});
  };

  const toggleNight = (day: keyof NonNullable<LeaseStylesConfig['availableNights']>) => {
    if (data.availableNights) {
      onChange({
        ...data,
        availableNights: {
          ...data.availableNights,
          [day]: !data.availableNights[day]
        }
      });
    }
  };

  const selectAllNights = () => {
    onChange({
      ...data,
      availableNights: {
        sunday: true,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true
      }
    });
  };

  const getAvailableNightsCount = () => {
    if (!data.availableNights) return 0;
    return Object.values(data.availableNights).filter((v) => v).length;
  };

  const getNotAvailableNightsCount = () => {
    return 7 - getAvailableNightsCount();
  };

  const handleWeeklyPatternChange = (pattern: WeeklyPattern) => {
    onChange({ ...data, weeklyPattern: pattern });
    setErrors({});
  };

  const handleMonthlyAgreement = (agreed: boolean) => {
    onChange({ ...data, subsidyAgreement: agreed });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (data.rentalType === 'Weekly' && !data.weeklyPattern) {
      newErrors.weeklyPattern = 'Please select a weekly pattern';
    }

    if (data.rentalType === 'Monthly' && !data.subsidyAgreement) {
      newErrors.subsidyAgreement = 'You must agree to the subsidy terms for monthly rentals';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext();
    }
  };

  const weeklyPatterns: WeeklyPattern[] = [
    'One week on, one week off',
    'Two weeks on, two weeks off',
    'One week on, three weeks off'
  ];

  return (
    <div className="section-container lease-styles-section">
      <h2 className="section-title">Lease Styles</h2>
      <p className="section-subtitle">Choose your rental frequency</p>

      {/* Rental Type Selection */}
      <div className="rental-type-selector">
        <div
          className={`rental-type-card ${data.rentalType === 'Nightly' ? 'selected' : ''}`}
          onClick={() => handleRentalTypeChange('Nightly')}
          role="button"
          tabIndex={0}
        >
          <div className="rental-type-icon">🌙</div>
          <h3>Nightly</h3>
          <p>Rent by the night with flexible availability</p>
        </div>

        <div
          className={`rental-type-card ${data.rentalType === 'Weekly' ? 'selected' : ''}`}
          onClick={() => handleRentalTypeChange('Weekly')}
          role="button"
          tabIndex={0}
        >
          <div className="rental-type-icon">📅</div>
          <h3>Weekly</h3>
          <p>Rent in weekly patterns</p>
        </div>

        <div
          className={`rental-type-card ${data.rentalType === 'Monthly' ? 'selected' : ''}`}
          onClick={() => handleRentalTypeChange('Monthly')}
          role="button"
          tabIndex={0}
        >
          <div className="rental-type-icon">📆</div>
          <h3>Monthly</h3>
          <p>Traditional month-to-month rental</p>
        </div>
      </div>

      {/* Nightly Configuration */}
      {data.rentalType === 'Nightly' && data.availableNights && (
        <div className="nightly-config">
          <h3>Select Available Nights</h3>
          <p>Choose which nights of the week you want to offer</p>

          <div className="days-selector">
            {(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const).map((day) => (
              <button
                key={day}
                type="button"
                className={`day-button ${data.availableNights![day] ? 'selected' : ''}`}
                onClick={() => toggleNight(day)}
              >
                <div className="day-letter">{day.charAt(0).toUpperCase()}</div>
                <div className="day-status">
                  {data.availableNights![day] ? 'Available Night' : 'Not Available Night'}
                </div>
              </button>
            ))}
          </div>

          <div className="nights-counter">
            <span>
              {getAvailableNightsCount()} Nights Available, {getNotAvailableNightsCount()} Nights
              Not Available
            </span>
            {getNotAvailableNightsCount() > 0 && (
              <button type="button" className="btn-link" onClick={selectAllNights}>
                select all nights
              </button>
            )}
          </div>
        </div>
      )}

      {/* Weekly Configuration */}
      {data.rentalType === 'Weekly' && (
        <div className="weekly-config">
          <h3>Weekly Pattern You're Offering</h3>
          <p className="info-text">This pattern is independent of the beginning of the month</p>

          <select
            value={data.weeklyPattern || ''}
            onChange={(e) => handleWeeklyPatternChange(e.target.value as WeeklyPattern)}
            className={errors.weeklyPattern ? 'input-error' : ''}
          >
            <option value="">Select a pattern</option>
            {weeklyPatterns.map((pattern) => (
              <option key={pattern} value={pattern}>
                {pattern}
              </option>
            ))}
          </select>
          {errors.weeklyPattern && (
            <span className="error-message">{errors.weeklyPattern}</span>
          )}
        </div>
      )}

      {/* Monthly Configuration - Inline Agreement */}
      {data.rentalType === 'Monthly' && (
        <div className="monthly-config">
          <h3>Monthly Lease Agreement</h3>
          <div className="agreement-text">
            <p>
              Our Split Lease 'Monthly' model helps guests meet rent obligations through a
              subsidy. For financial stability, we may need to sublease unused nights. If this
              isn't ideal, our other models might be more fitting for you, as they don't require
              this provision.
            </p>
          </div>

          <div className="agreement-options">
            <label className={`radio-label ${data.subsidyAgreement === true ? 'selected' : ''}`}>
              <input
                type="radio"
                name="subsidyAgreement"
                checked={data.subsidyAgreement === true}
                onChange={() => handleMonthlyAgreement(true)}
              />
              <span>I agree to the monthly subsidy terms</span>
            </label>

            <label className={`radio-label ${data.subsidyAgreement === false ? 'selected' : ''}`}>
              <input
                type="radio"
                name="subsidyAgreement"
                checked={data.subsidyAgreement === false}
                onChange={() => handleMonthlyAgreement(false)}
              />
              <span>No, I will select a different rental style</span>
            </label>
          </div>

          {errors.subsidyAgreement && (
            <span className="error-message">{errors.subsidyAgreement}</span>
          )}
        </div>
      )}

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
