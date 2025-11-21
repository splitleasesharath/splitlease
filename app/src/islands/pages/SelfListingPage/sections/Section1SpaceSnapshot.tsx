import React, { useState, useEffect, useRef } from 'react';
import type {
  SpaceSnapshot,
  SpaceType,
  KitchenType,
  ParkingType
} from '../types/listing.types';

interface Section1Props {
  data: SpaceSnapshot;
  onChange: (data: SpaceSnapshot) => void;
  onNext: () => void;
}

// Extend window interface for Google Maps
declare global {
  interface Window {
    google: any;
  }
}

export const Section1SpaceSnapshot: React.FC<Section1Props> = ({
  data,
  onChange,
  onNext
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addressError, setAddressError] = useState<string>('');
  const [isAddressValid, setIsAddressValid] = useState(false);
  const [showManualAddress, setShowManualAddress] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const dataRef = useRef(data);

  // Keep dataRef updated with latest data
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Check if address is already validated when component mounts or data changes
  useEffect(() => {
    // If the address has been validated before (has fullAddress and validated flag is true)
    if (data.address.validated && data.address.fullAddress) {
      setIsAddressValid(true);
      setAddressError('');
      console.log('Address already validated on mount:', data.address.fullAddress);
    }
  }, [data.address.validated, data.address.fullAddress]);

  // Initialize Google Maps Autocomplete
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 50; // Try for 5 seconds

    const initAutocomplete = () => {
      if (!window.google) {
        retryCount++;
        if (retryCount < maxRetries) {
          console.log('Waiting for Google Maps to load...', retryCount);
          setTimeout(initAutocomplete, 100);
        } else {
          console.error('Google Maps API failed to load. Please check your API key in index.html');
          setAddressError('Address autocomplete is unavailable. Please use manual entry.');
        }
        return;
      }

      if (!addressInputRef.current) {
        setTimeout(initAutocomplete, 100);
        return;
      }

      try {
        console.log('Initializing Google Maps Autocomplete...');

        // Manhattan coordinates (more central to the borough)
        const manhattanCenter = new window.google.maps.LatLng(40.7831, -73.9712);

        // Create circle bounds for 100km radius around Manhattan
        const circleBounds = new window.google.maps.Circle({
          center: manhattanCenter,
          radius: 100000 // 100,000 meters = 100km
        }).getBounds();

        // Create autocomplete with strict bounds restriction
        const autocomplete = new window.google.maps.places.Autocomplete(
          addressInputRef.current,
          {
            types: ['address'], // Restrict to addresses only (no establishments)
            componentRestrictions: { country: 'us' },
            // Strictly restrict results to 100km radius around Manhattan
            bounds: circleBounds,
            strictBounds: true, // Only return results within bounds
            fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id']
          }
        );

        console.log('Google Maps Autocomplete initialized successfully');

        // IMPORTANT: Prevent autocomplete from selecting on Enter key
        // This allows users to type freely without autocomplete interfering
        window.google.maps.event.addDomListener(addressInputRef.current, 'keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.preventDefault();
          }
        });

        autocompleteRef.current = autocomplete;

        // Listen for place selection
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          console.log('Place selected:', place);

          // If user just pressed Enter without selecting, don't do anything
          if (!place.place_id) {
            console.log('No place_id - user did not select from dropdown');
            return;
          }

          if (!place.geometry || !place.address_components) {
            console.error('Invalid place selected - missing geometry or address components');
            setAddressError('Please select a valid address from the dropdown');
            setIsAddressValid(false);
            return;
          }

          console.log('Valid place selected, parsing address components...');

          // Extract address components
          let streetNumber = '';
          let streetName = '';
          let city = '';
          let state = '';
          let zip = '';
          let neighborhood = '';

          place.address_components.forEach((component: any) => {
            const types = component.types;

            if (types.includes('street_number')) {
              streetNumber = component.long_name;
            }
            if (types.includes('route')) {
              streetName = component.long_name;
            }
            if (types.includes('locality')) {
              city = component.long_name;
            }
            if (types.includes('administrative_area_level_1')) {
              state = component.short_name;
            }
            if (types.includes('postal_code')) {
              zip = component.long_name;
            }
            if (types.includes('neighborhood') || types.includes('sublocality') || types.includes('sublocality_level_1')) {
              neighborhood = component.long_name;
            }
          });

          // Update form data with validated address
          const parsedAddress = {
            fullAddress: place.formatted_address || '',
            number: streetNumber,
            street: streetName,
            city: city,
            state: state,
            zip: zip,
            neighborhood: neighborhood,
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
            validated: true
          };

          console.log('Parsed address:', parsedAddress);

          // Use dataRef.current to get the latest form data
          onChange({
            ...dataRef.current,
            address: parsedAddress
          });

          setIsAddressValid(true);
          setShowManualAddress(false);
          setAddressError('');
          console.log('Address validated successfully!');
        });
      } catch (error) {
        console.error('Error initializing Google Maps Autocomplete:', error);
      }
    };

    initAutocomplete();

    return () => {
      // Cleanup autocomplete listeners
      if (autocompleteRef.current && window.google) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  const handleChange = (field: keyof SpaceSnapshot, value: any) => {
    onChange({ ...data, [field]: value });
    // Clear error when field is updated
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const handleAddressChange = (field: keyof typeof data.address, value: string) => {
    onChange({
      ...data,
      address: {
        ...data.address,
        [field]: value
      }
    });
    setAddressError('');
  };

  const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onChange({
      ...data,
      address: {
        ...data.address,
        fullAddress: value,
        validated: false
      }
    });
    setIsAddressValid(false);
    setAddressError('');
  };

  const handleManualAddressToggle = () => {
    setShowManualAddress(!showManualAddress);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!data.listingName || data.listingName.trim().length === 0) {
      newErrors.listingName = 'Listing name is required';
    } else if (data.listingName.length > 35) {
      newErrors.listingName = 'Listing name must be 35 characters or less';
    }

    if (!data.typeOfSpace) {
      newErrors.typeOfSpace = 'Type of space is required';
    }

    if (!data.bedrooms || data.bedrooms < 0) {
      newErrors.bedrooms = 'Number of bedrooms is required';
    }

    if (!data.typeOfKitchen) {
      newErrors.typeOfKitchen = 'Type of kitchen is required';
    }

    if (!data.typeOfParking) {
      newErrors.typeOfParking = 'Type of parking is required';
    }

    if (!data.bathrooms || data.bathrooms < 0) {
      newErrors.bathrooms = 'Number of bathrooms is required';
    }

    if (!data.address.fullAddress || data.address.fullAddress.trim().length === 0) {
      setAddressError('Listing address is required');
      newErrors.address = 'Address is required';
    } else if (!isAddressValid && !showManualAddress) {
      setAddressError('Please select a valid address from the dropdown or enter manually');
      newErrors.address = 'Address validation required';
    }

    if (showManualAddress && !data.address.state) {
      newErrors.state = 'State is required when entering address manually';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext();
    }
  };

  const spaceTypes: SpaceType[] = ['Private Room', 'Entire Place', 'Shared Room'];
  const kitchenTypes: KitchenType[] = [
    'Full Kitchen',
    'Kitchenette',
    'No Kitchen',
    'Kitchen Not Accessible'
  ];
  const parkingTypes: ParkingType[] = [
    'Street Parking',
    'No Parking',
    'Off-Street Parking',
    'Attached Garage',
    'Detached Garage',
    'Nearby Parking Structure'
  ];

  const bedroomOptions = ['Studio', '1', '2', '3', '4', '5', '6'];
  const bedOptions = ['1', '2', '3', '4', '5', '6', '7'];
  const bathroomOptions = ['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5.5', '6'];

  // US States for dropdown
  const usStates = [
    { code: 'NY', name: 'New York' },
    { code: 'NJ', name: 'New Jersey' },
    { code: 'CT', name: 'Connecticut' },
    { code: 'PA', name: 'Pennsylvania' },
    { code: 'MA', name: 'Massachusetts' },
    { code: 'CA', name: 'California' },
    { code: 'TX', name: 'Texas' },
    { code: 'FL', name: 'Florida' },
    // Add more states as needed
  ];

  return (
    <div className="section-container space-snapshot-section">
      <h2 className="section-title">Space Snapshot</h2>
      <p className="section-subtitle">Let's start with the basics about your space</p>

      {/* Information Alert */}
      <div className="info-alert">
        <span className="info-icon">ℹ️</span>
        <p>
          Start typing your address and select from the dropdown. We will automatically verify addresses in the New York area.
        </p>
      </div>

      {/* Listing Name */}
      <div className="form-group">
        <label htmlFor="listingName">
          Listing Name<span className="required">*</span>
        </label>
        <input
          type="text"
          id="listingName"
          placeholder="Listing Name (35 character max)"
          maxLength={35}
          value={data.listingName}
          onChange={(e) => handleChange('listingName', e.target.value)}
          className={errors.listingName ? 'input-error' : ''}
        />
        {errors.listingName && (
          <span className="error-message">{errors.listingName}</span>
        )}
      </div>

      {/* Row 1: Type of Space & Bedrooms */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="typeOfSpace">
            Type of Space<span className="required">*</span>
          </label>
          <select
            id="typeOfSpace"
            value={data.typeOfSpace}
            onChange={(e) => handleChange('typeOfSpace', e.target.value as SpaceType)}
            className={errors.typeOfSpace ? 'input-error' : ''}
          >
            <option value="">Choose an option…</option>
            {spaceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.typeOfSpace && (
            <span className="error-message">{errors.typeOfSpace}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="bedrooms">
            Bedrooms<span className="required">*</span>
          </label>
          <select
            id="bedrooms"
            value={data.bedrooms.toString()}
            onChange={(e) => handleChange('bedrooms', parseInt(e.target.value))}
            className={errors.bedrooms ? 'input-error' : ''}
          >
            {bedroomOptions.map((num) => (
              <option key={num} value={num === 'Studio' ? '0' : num}>
                {num}
              </option>
            ))}
          </select>
          {errors.bedrooms && (
            <span className="error-message">{errors.bedrooms}</span>
          )}
        </div>
      </div>

      {/* Row 2: Type of Kitchen & Beds */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="typeOfKitchen">
            Type of Kitchen<span className="required">*</span>
          </label>
          <select
            id="typeOfKitchen"
            value={data.typeOfKitchen}
            onChange={(e) => handleChange('typeOfKitchen', e.target.value as KitchenType)}
            className={errors.typeOfKitchen ? 'input-error' : ''}
          >
            <option value="">Choose an option…</option>
            {kitchenTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.typeOfKitchen && (
            <span className="error-message">{errors.typeOfKitchen}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="beds">Beds</label>
          <select
            id="beds"
            value={data.beds.toString()}
            onChange={(e) => handleChange('beds', parseInt(e.target.value))}
          >
            {bedOptions.map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 3: Type of Parking & Bathrooms */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="typeOfParking">
            Type of Parking<span className="required">*</span>
          </label>
          <select
            id="typeOfParking"
            value={data.typeOfParking}
            onChange={(e) => handleChange('typeOfParking', e.target.value as ParkingType)}
            className={errors.typeOfParking ? 'input-error' : ''}
          >
            <option value="">Choose an option…</option>
            {parkingTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.typeOfParking && (
            <span className="error-message">{errors.typeOfParking}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="bathrooms">
            Bathrooms<span className="required">*</span>
          </label>
          <select
            id="bathrooms"
            value={data.bathrooms.toString()}
            onChange={(e) => handleChange('bathrooms', parseFloat(e.target.value))}
            className={errors.bathrooms ? 'input-error' : ''}
          >
            {bathroomOptions.map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
          {errors.bathrooms && (
            <span className="error-message">{errors.bathrooms}</span>
          )}
        </div>
      </div>

      {/* Address Section */}
      <div className="address-section">
        <label htmlFor="fullAddress">
          Listing Address<span className="required">*</span>{' '}
          <span className="address-note">(private and will not be shared)</span>
        </label>
        <input
          ref={addressInputRef}
          type="text"
          id="fullAddress"
          placeholder="Start typing your address..."
          value={data.address.fullAddress}
          onChange={handleAddressInputChange}
          className={errors.address ? 'input-error' : ''}
        />

        {isAddressValid && (
          <div className="success-message">
            ✓ Address verified
          </div>
        )}

        {addressError && (
          <div className="error-alert">
            <span className="error-icon">⚠️</span>
            <p>{addressError}</p>
          </div>
        )}

        {!isAddressValid && data.address.fullAddress && (
          <button
            type="button"
            className="btn-link"
            onClick={handleManualAddressToggle}
            style={{ marginTop: '0.5rem' }}
          >
            {showManualAddress ? 'Hide manual entry' : 'Can\'t find your address? Enter manually'}
          </button>
        )}

        {/* Address Confirmation - Only show if address is invalid or manual entry is enabled */}
        {showManualAddress && (
          <div className="address-details">
            <p className="confirmation-message">
              <span className="info-icon">ℹ️</span>
              Please confirm your address details
            </p>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="number">Street Number</label>
                <input
                  type="text"
                  id="number"
                  value={data.address.number}
                  onChange={(e) => handleAddressChange('number', e.target.value)}
                  placeholder="123"
                />
              </div>

              <div className="form-group">
                <label htmlFor="street">Street Name</label>
                <input
                  type="text"
                  id="street"
                  value={data.address.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  placeholder="Main St"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  type="text"
                  id="city"
                  value={data.address.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                  placeholder="New York"
                />
              </div>

              <div className="form-group">
                <label htmlFor="state">
                  State<span className="required">*</span>
                </label>
                <select
                  id="state"
                  value={data.address.state}
                  onChange={(e) => handleAddressChange('state', e.target.value)}
                  className={errors.state ? 'input-error' : ''}
                >
                  <option value="">Select state</option>
                  {usStates.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
                {errors.state && (
                  <span className="error-message">{errors.state}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="zip">Zip Code</label>
              <input
                type="text"
                id="zip"
                value={data.address.zip}
                onChange={(e) => handleAddressChange('zip', e.target.value)}
                placeholder="10001"
              />
            </div>

            {/* Neighborhood Section */}
            <div className="form-group">
              <label htmlFor="neighborhood">Neighborhood (Optional)</label>
              <p className="field-info">
                Enter the neighborhood name if known
              </p>
              <input
                type="text"
                id="neighborhood"
                value={data.address.neighborhood}
                onChange={(e) => handleAddressChange('neighborhood', e.target.value)}
                placeholder="e.g., Manhattan, Brooklyn, Queens"
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="section-navigation">
        <button type="button" className="btn-next" onClick={handleNext}>
          Next
        </button>
      </div>
    </div>
  );
};
