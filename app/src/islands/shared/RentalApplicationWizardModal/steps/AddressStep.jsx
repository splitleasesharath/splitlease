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
  const initAttempted = useRef(false);

  // Initialize Google Places Autocomplete with retry logic
  useEffect(() => {
    // Skip if already initialized
    if (autocompleteRef.current || initAttempted.current) return;

    let retryCount = 0;
    const maxRetries = 50; // Try for 5 seconds (50 * 100ms)

    const initAutocomplete = () => {
      // Check for Google Maps AND the Places library
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(initAutocomplete, 100);
        } else {
          console.error('[RentalAppWizard] Google Maps API failed to load after 5 seconds');
        }
        return;
      }

      if (!addressInputRef?.current) {
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(initAutocomplete, 100);
        }
        return;
      }

      try {
        console.log('[RentalAppWizard] Initializing Google Maps Autocomplete...');

        // Create autocomplete restricted to US addresses only
        const autocomplete = new window.google.maps.places.Autocomplete(
          addressInputRef.current,
          {
            types: ['address'], // Restrict to addresses only
            componentRestrictions: { country: 'us' }, // US addresses only
            fields: ['address_components', 'formatted_address', 'geometry', 'place_id']
          }
        );

        console.log('[RentalAppWizard] Google Maps Autocomplete initialized (US addresses)');

        // Prevent autocomplete from selecting on Enter key (prevents form submission)
        window.google.maps.event.addDomListener(addressInputRef.current, 'keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
          }
        });

        autocompleteRef.current = autocomplete;

        // Listen for place selection
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          console.log('[RentalAppWizard] Place selected:', place);

          // If user just pressed Enter without selecting, don't do anything
          if (!place.place_id) {
            console.log('[RentalAppWizard] No place_id - user did not select from dropdown');
            return;
          }

          if (!place.formatted_address) {
            console.error('[RentalAppWizard] Invalid place selected');
            return;
          }

          // Update the currentAddress field with the formatted address
          onFieldChange('currentAddress', place.formatted_address);
          console.log('[RentalAppWizard] Address updated:', place.formatted_address);
        });

        initAttempted.current = true;
      } catch (error) {
        console.error('[RentalAppWizard] Error initializing Google Maps Autocomplete:', error);
      }
    };

    initAutocomplete();

    return () => {
      // Cleanup autocomplete listeners
      if (autocompleteRef.current && window.google && window.google.maps) {
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
