import React, { useState, useCallback, useEffect } from 'react';
import type { Features } from '../types/listing.types';
import { getNeighborhoodDescriptionWithFallback } from '../utils/neighborhoodService';
import { getCommonInUnitAmenities, getCommonBuildingAmenities, getAllInUnitAmenities, getAllBuildingAmenities } from '../utils/amenitiesService';
import { generateListingDescription, extractListingDataFromDraft } from '../../../../lib/aiService';

interface Section2Props {
  data: Features;
  onChange: (data: Features) => void;
  onNext: () => void;
  onBack: () => void;
  zipCode?: string;
}

export const Section2Features: React.FC<Section2Props> = ({
  data,
  onChange,
  onNext,
  onBack,
  zipCode
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingNeighborhood, setIsLoadingNeighborhood] = useState(false);
  const [isLoadingInUnitAmenities, setIsLoadingInUnitAmenities] = useState(false);
  const [isLoadingBuildingAmenities, setIsLoadingBuildingAmenities] = useState(false);
  const [isLoadingDescription, setIsLoadingDescription] = useState(false);

  // State for amenities fetched from database
  const [inUnitAmenities, setInUnitAmenities] = useState<string[]>([]);
  const [buildingAmenities, setBuildingAmenities] = useState<string[]>([]);
  const [isLoadingAmenityLists, setIsLoadingAmenityLists] = useState(true);

  // Fetch amenities from database on mount
  useEffect(() => {
    const fetchAmenities = async () => {
      setIsLoadingAmenityLists(true);
      try {
        const [inUnit, building] = await Promise.all([
          getAllInUnitAmenities(),
          getAllBuildingAmenities()
        ]);
        setInUnitAmenities(inUnit);
        setBuildingAmenities(building);
        console.log('[Section2Features] Loaded amenities from database:', { inUnit: inUnit.length, building: building.length });
      } catch (error) {
        console.error('[Section2Features] Error fetching amenities:', error);
      } finally {
        setIsLoadingAmenityLists(false);
      }
    };

    fetchAmenities();
  }, []);

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

  const handleChange = (field: keyof Features, value: any) => {
    onChange({ ...data, [field]: value });
    // Clear error when field is updated
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const toggleAmenity = (amenity: string, isInside: boolean) => {
    const field = isInside ? 'amenitiesInsideUnit' : 'amenitiesOutsideUnit';
    const currentAmenities = data[field];

    const updated = currentAmenities.includes(amenity)
      ? currentAmenities.filter((a) => a !== amenity)
      : [...currentAmenities, amenity];

    handleChange(field, updated);
  };

  const loadCommonInUnitAmenities = async () => {
    setIsLoadingInUnitAmenities(true);
    try {
      const commonAmenities = await getCommonInUnitAmenities();
      if (commonAmenities.length > 0) {
        handleChange('amenitiesInsideUnit', [...new Set([...data.amenitiesInsideUnit, ...commonAmenities])]);
      } else {
        alert('No common in-unit amenities found in the database.');
      }
    } catch (error) {
      console.error('Error loading common in-unit amenities:', error);
      alert('Error loading common amenities. Please try again.');
    } finally {
      setIsLoadingInUnitAmenities(false);
    }
  };

  const loadCommonBuildingAmenities = async () => {
    setIsLoadingBuildingAmenities(true);
    try {
      const commonAmenities = await getCommonBuildingAmenities();
      if (commonAmenities.length > 0) {
        handleChange('amenitiesOutsideUnit', [...new Set([...data.amenitiesOutsideUnit, ...commonAmenities])]);
      } else {
        alert('No common building amenities found in the database.');
      }
    } catch (error) {
      console.error('Error loading common building amenities:', error);
      alert('Error loading common amenities. Please try again.');
    } finally {
      setIsLoadingBuildingAmenities(false);
    }
  };

  const loadTemplate = async () => {
    setIsLoadingDescription(true);

    try {
      // Extract listing data from localStorage draft
      const listingData = extractListingDataFromDraft();

      if (!listingData) {
        alert('Please complete Section 1 (Address) first to generate a description.');
        return;
      }

      // Add current amenities from this section's data
      const dataForGeneration = {
        ...listingData,
        amenitiesInsideUnit: data.amenitiesInsideUnit,
        amenitiesOutsideUnit: data.amenitiesOutsideUnit,
      };

      console.log('[Section2Features] Generating AI description with data:', dataForGeneration);
      const generatedDescription = await generateListingDescription(dataForGeneration);

      if (generatedDescription) {
        handleChange('descriptionOfLodging', generatedDescription);
        console.log('[Section2Features] ✅ AI description generated successfully');
      } else {
        alert('Could not generate description. Please try again.');
      }
    } catch (error) {
      console.error('[Section2Features] Error generating description:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error generating description: ${errorMessage}`);
    } finally {
      setIsLoadingDescription(false);
    }
  };

  const loadNeighborhoodTemplate = async () => {
    if (!zipCode) {
      alert('Please complete Section 1 (Address) first to load neighborhood template.');
      return;
    }

    setIsLoadingNeighborhood(true);
    try {
      // Get address data from localStorage draft
      const draftJson = localStorage.getItem('selfListingDraft');
      const draft = draftJson ? JSON.parse(draftJson) : null;
      const addressData = {
        fullAddress: draft?.spaceSnapshot?.address?.fullAddress || '',
        city: draft?.spaceSnapshot?.address?.city || '',
        state: draft?.spaceSnapshot?.address?.state || '',
        zip: zipCode,
      };

      const result = await getNeighborhoodDescriptionWithFallback(zipCode, addressData);

      if (result && result.description) {
        handleChange('neighborhoodDescription', result.description);

        // Show different message based on source
        if (result.source === 'ai') {
          console.log('[Section2Features] AI-generated neighborhood description loaded');
        } else {
          console.log(`[Section2Features] Database template loaded for ${result.neighborhood_name || 'neighborhood'}`);
        }
      } else {
        alert(`Could not find or generate neighborhood information for ZIP code: ${zipCode}`);
      }
    } catch (error) {
      console.error('Error loading neighborhood template:', error);
      alert('Error loading neighborhood template. Please try again.');
    } finally {
      setIsLoadingNeighborhood(false);
    }
  };

  const validateForm = (): string[] => {
    const newErrors: Record<string, string> = {};
    const errorOrder: string[] = [];

    // Validate amenities inside unit (required)
    if (data.amenitiesInsideUnit.length === 0) {
      newErrors.amenitiesInsideUnit = 'At least one amenity inside unit is required';
      errorOrder.push('amenitiesInsideUnit');
    }

    if (!data.descriptionOfLodging || data.descriptionOfLodging.trim().length === 0) {
      newErrors.descriptionOfLodging = 'Description of lodging is required';
      errorOrder.push('descriptionOfLodging');
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
    <div className="section-container features-section">
      <h2 className="section-title">Features</h2>
      <p className="section-subtitle">Describe your property's amenities and features</p>

      {/* Amenities Two-Column Layout */}
      <div className="features-two-column">
        {/* Left Column: Amenities Inside Unit */}
        <div className="form-group">
          <div className="label-with-action">
            <label>Amenities inside Unit<span className="required">*</span></label>
            <button
              type="button"
              className="btn-link"
              onClick={loadCommonInUnitAmenities}
              disabled={isLoadingInUnitAmenities || isLoadingAmenityLists}
            >
              {isLoadingInUnitAmenities ? 'loading...' : 'load common'}
            </button>
          </div>
          <div id="amenitiesInsideUnit" className="checkbox-grid">
            {isLoadingAmenityLists ? (
              <span className="loading-text">Loading amenities...</span>
            ) : inUnitAmenities.length === 0 ? (
              <span className="empty-text">No amenities available</span>
            ) : (
              inUnitAmenities.map((amenity) => (
                <label key={amenity} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={data.amenitiesInsideUnit.includes(amenity)}
                    onChange={() => toggleAmenity(amenity, true)}
                  />
                  <span>{amenity}</span>
                </label>
              ))
            )}
          </div>
          {errors.amenitiesInsideUnit && (
            <span className="error-message">{errors.amenitiesInsideUnit}</span>
          )}
        </div>

        {/* Right Column: Amenities Outside Unit (In Building) */}
        <div className="form-group">
          <div className="label-with-action">
            <label>Amenities outside Unit (Optional)</label>
            <button
              type="button"
              className="btn-link"
              onClick={loadCommonBuildingAmenities}
              disabled={isLoadingBuildingAmenities || isLoadingAmenityLists}
            >
              {isLoadingBuildingAmenities ? 'loading...' : 'load common'}
            </button>
          </div>
          <div className="checkbox-grid">
            {isLoadingAmenityLists ? (
              <span className="loading-text">Loading amenities...</span>
            ) : buildingAmenities.length === 0 ? (
              <span className="empty-text">No amenities available</span>
            ) : (
              buildingAmenities.map((amenity) => (
                <label key={amenity} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={data.amenitiesOutsideUnit.includes(amenity)}
                    onChange={() => toggleAmenity(amenity, false)}
                  />
                  <span>{amenity}</span>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Descriptions Two-Column Layout */}
      <div className="features-two-column">
        {/* Left Column: Description of Lodging */}
        <div className="form-group">
          <div className="label-with-action">
            <label htmlFor="descriptionOfLodging">
              Description of Lodging<span className="required">*</span>
            </label>
            <button
              type="button"
              className="btn-link"
              onClick={loadTemplate}
              disabled={isLoadingDescription || isLoadingNeighborhood}
            >
              {isLoadingDescription ? 'generating...' : 'load template'}
            </button>
          </div>
          <textarea
            id="descriptionOfLodging"
            rows={8}
            placeholder="Describe your space in detail..."
            value={data.descriptionOfLodging}
            onChange={(e) => handleChange('descriptionOfLodging', e.target.value)}
            className={errors.descriptionOfLodging ? 'input-error' : ''}
          />
          {errors.descriptionOfLodging && (
            <span className="error-message">{errors.descriptionOfLodging}</span>
          )}
        </div>

        {/* Right Column: Neighborhood Description */}
        <div className="form-group">
          <div className="label-with-action">
            <label htmlFor="neighborhoodDescription">
              Describe Life in the Neighborhood (Optional)
            </label>
            <button
              type="button"
              className="btn-link"
              onClick={loadNeighborhoodTemplate}
              disabled={isLoadingNeighborhood || isLoadingDescription}
            >
              {isLoadingNeighborhood ? 'loading/generating...' : 'load template'}
            </button>
          </div>
          <textarea
            id="neighborhoodDescription"
            rows={8}
            placeholder="Tell guests about the neighborhood..."
            value={data.neighborhoodDescription}
            onChange={(e) => handleChange('neighborhoodDescription', e.target.value)}
          />
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
