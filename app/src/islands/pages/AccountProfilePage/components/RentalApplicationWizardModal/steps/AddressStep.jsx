/**
 * AddressStep.jsx
 *
 * Step 2: Current Address
 * Fields: currentAddress, apartmentUnit, lengthResided, renting
 */

import React, { useEffect, useRef } from 'react';

export default function AddressStep({
  formData,
  fieldErrors,
  fieldValid,
  onFieldChange,
  onFieldBlur,
  addressInputRef,
}) {
  const autocompleteRef = useRef(null);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!addressInputRef?.current || !window.google?.maps?.places) return;

    const autocomplete = new window.google.maps.places.Autocomplete(
      addressInputRef.current,
      {
        types: ['address'],
        componentRestrictions: { country: 'us' }
      }
    );

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        onFieldChange('currentAddress', place.formatted_address);
      }
    });

    autocompleteRef.current = autocomplete;

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [addressInputRef, onFieldChange]);

  return (
    <div className="wizard-step address-step">
      <p className="wizard-step__intro">
        Where do you currently live?
      </p>

      <div className="wizard-form-group">
        <label htmlFor="currentAddress" className="wizard-label">
          Current Address <span className="required">*</span>
        </label>
        <input
          type="text"
          id="currentAddress"
          ref={addressInputRef}
          className={`wizard-input ${fieldErrors.currentAddress ? 'wizard-input--error' : ''} ${fieldValid.currentAddress ? 'wizard-input--valid' : ''}`}
          value={formData.currentAddress || ''}
          onChange={(e) => onFieldChange('currentAddress', e.target.value)}
          onBlur={() => onFieldBlur('currentAddress')}
          placeholder="Start typing your address..."
        />
        {fieldErrors.currentAddress && (
          <span className="wizard-error">{fieldErrors.currentAddress}</span>
        )}
      </div>

      <div className="wizard-form-group">
        <label htmlFor="apartmentUnit" className="wizard-label">
          Apartment/Unit Number
        </label>
        <input
          type="text"
          id="apartmentUnit"
          className="wizard-input"
          value={formData.apartmentUnit || ''}
          onChange={(e) => onFieldChange('apartmentUnit', e.target.value)}
          placeholder="Apt 4B (optional)"
        />
      </div>

      <div className="wizard-form-group">
        <label htmlFor="lengthResided" className="wizard-label">
          How long have you lived here? <span className="required">*</span>
        </label>
        <select
          id="lengthResided"
          className={`wizard-select ${fieldErrors.lengthResided ? 'wizard-input--error' : ''} ${fieldValid.lengthResided ? 'wizard-input--valid' : ''}`}
          value={formData.lengthResided || ''}
          onChange={(e) => onFieldChange('lengthResided', e.target.value)}
          onBlur={() => onFieldBlur('lengthResided')}
        >
          <option value="">Select duration</option>
          <option value="less-than-1-year">Less than 1 year</option>
          <option value="1-2-years">1-2 years</option>
          <option value="2-5-years">2-5 years</option>
          <option value="5-plus-years">5+ years</option>
        </select>
        {fieldErrors.lengthResided && (
          <span className="wizard-error">{fieldErrors.lengthResided}</span>
        )}
      </div>

      <div className="wizard-form-group">
        <label htmlFor="renting" className="wizard-label">
          Are you currently renting? <span className="required">*</span>
        </label>
        <select
          id="renting"
          className={`wizard-select ${fieldErrors.renting ? 'wizard-input--error' : ''} ${fieldValid.renting ? 'wizard-input--valid' : ''}`}
          value={formData.renting || ''}
          onChange={(e) => onFieldChange('renting', e.target.value)}
          onBlur={() => onFieldBlur('renting')}
        >
          <option value="">Select an option</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
        {fieldErrors.renting && (
          <span className="wizard-error">{fieldErrors.renting}</span>
        )}
      </div>
    </div>
  );
}
