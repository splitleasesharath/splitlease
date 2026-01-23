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
  // Store onFieldChange in a ref to avoid dependency issues with the listener
  const onFieldChangeRef = useRef(onFieldChange);

  // Keep the ref updated
  useEffect(() => {
    onFieldChangeRef.current = onFieldChange;
  }, [onFieldChange]);

  // Initialize Google Places Autocomplete with retry logic
  useEffect(() => {
    // Skip if already have an autocomplete instance attached
    if (autocompleteRef.current) {
      console.log('[RentalAppWizard] Autocomplete already initialized, skipping');
      return;
    }

    let retryCount = 0;
    const maxRetries = 50; // Try for 5 seconds (50 * 100ms)
    let retryTimer = null;

    const initAutocomplete = () => {
      // Check for Google Maps AND the Places library
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        retryCount++;
        if (retryCount < maxRetries) {
          retryTimer = setTimeout(initAutocomplete, 100);
        } else {
          console.error('[RentalAppWizard] Google Maps API failed to load after 5 seconds');
        }
        return;
      }

      if (!addressInputRef?.current) {
        retryCount++;
        if (retryCount < maxRetries) {
          retryTimer = setTimeout(initAutocomplete, 100);
        }
        return;
      }

      try {
        console.log('[RentalAppWizard] Initializing Google Maps Autocomplete...');
        console.log('[RentalAppWizard] Input element:', addressInputRef.current);

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
        console.log('[RentalAppWizard] Autocomplete instance:', autocomplete);

        // Prevent autocomplete from selecting on Enter key (prevents form submission)
        window.google.maps.event.addDomListener(addressInputRef.current, 'keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
          }
        });

        autocompleteRef.current = autocomplete;

        // Listen for place selection - use the ref to get the latest callback
        const placeChangedListener = autocomplete.addListener('place_changed', () => {
          console.log('[RentalAppWizard] place_changed event fired!');
          const place = autocomplete.getPlace();
          console.log('[RentalAppWizard] Place object:', place);
          console.log('[RentalAppWizard] Place place_id:', place?.place_id);
          console.log('[RentalAppWizard] Place formatted_address:', place?.formatted_address);

          // If user just pressed Enter without selecting, don't do anything
          if (!place || !place.place_id) {
            console.log('[RentalAppWizard] No place_id - user may not have selected from dropdown');
            // Still try to get the input value as fallback
            const inputValue = addressInputRef.current?.value;
            console.log('[RentalAppWizard] Current input value:', inputValue);
            return;
          }

          if (!place.formatted_address) {
            console.error('[RentalAppWizard] Invalid place selected - no formatted_address');
            return;
          }

          // Update the currentAddress field with the formatted address
          console.log('[RentalAppWizard] Calling onFieldChange with:', place.formatted_address);
          onFieldChangeRef.current('currentAddress', place.formatted_address);
          console.log('[RentalAppWizard] Address updated successfully:', place.formatted_address);
        });

        console.log('[RentalAppWizard] place_changed listener attached');

      } catch (error) {
        console.error('[RentalAppWizard] Error initializing Google Maps Autocomplete:', error);
      }
    };

    initAutocomplete();

    return () => {
      // Clear any pending retry timers
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      // Cleanup autocomplete listeners
      if (autocompleteRef.current && window.google && window.google.maps) {
        console.log('[RentalAppWizard] Cleaning up autocomplete listeners');
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [addressInputRef]);

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
          Are you currently renting?
        </label>
        <select
          id="renting"
          className="wizard-select"
          value={formData.renting || ''}
          onChange={(e) => onFieldChange('renting', e.target.value)}
        >
          <option value="">Select an option (optional)</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
    </div>
  );
}
