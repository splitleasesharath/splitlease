import React, { useState } from 'react';
import type { ListingFormData, ReviewData } from '../types/listing.types';
import { SAFETY_FEATURES } from '../types/listing.types';
import { getCommonSafetyFeatures } from '../utils/safetyService';

interface Section7Props {
  formData: ListingFormData;
  reviewData: ReviewData;
  onChange: (data: ReviewData) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

type SectionKey = 'space' | 'features' | 'leaseStyle' | 'pricing' | 'rules' | 'photos';

export const Section7Review: React.FC<Section7Props> = ({
  formData,
  reviewData,
  onChange,
  onSubmit,
  onBack,
  isSubmitting
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingSafetyFeatures, setIsLoadingSafetyFeatures] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    space: false,
    features: false,
    leaseStyle: false,
    pricing: false,
    rules: false,
    photos: false
  });

  const toggleSection = (section: SectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleChange = (field: keyof ReviewData, value: any) => {
    onChange({ ...reviewData, [field]: value });
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const toggleSafetyFeature = (feature: string) => {
    const currentFeatures = reviewData.safetyFeatures || [];
    const updated = currentFeatures.includes(feature)
      ? currentFeatures.filter((f) => f !== feature)
      : [...currentFeatures, feature];
    handleChange('safetyFeatures', updated);
  };

  const loadCommonSafetyFeatures = async () => {
    setIsLoadingSafetyFeatures(true);
    try {
      const commonFeatures = await getCommonSafetyFeatures();
      if (commonFeatures.length > 0) {
        const currentFeatures = reviewData.safetyFeatures || [];
        handleChange('safetyFeatures', [...new Set([...currentFeatures, ...commonFeatures])]);
      } else {
        alert('No common safety features found in the database.');
      }
    } catch (error) {
      console.error('Error loading common safety features:', error);
      alert('Error loading common safety features. Please try again.');
    } finally {
      setIsLoadingSafetyFeatures(false);
    }
  };

  const handleSubmit = () => {
    // No validation needed - button is always clickable
    onSubmit();
  };

  return (
    <div className="section-container review-section">
      <h2 className="section-title">Review & Submit</h2>
      <p className="section-subtitle">Review your listing details before submitting</p>

      {/* Additional Optional Information Section - Moved to Top */}
      <div className="optional-details-section">
        <h3 className="optional-section-title">Additional Details (Optional)</h3>
        <p className="optional-section-subtitle">Provide extra information to make your listing stand out</p>

        {/* Two-Column Layout for Optional Fields */}
        <div className="optional-fields-grid">
          {/* Left Column */}
          <div className="optional-field-column">
            {/* Safety Features */}
            <div className="form-group">
              <div className="label-with-action">
                <label>Safety Features</label>
                <button
                  type="button"
                  className="btn-link"
                  onClick={loadCommonSafetyFeatures}
                  disabled={isLoadingSafetyFeatures}
                >
                  {isLoadingSafetyFeatures ? 'loading...' : 'load common'}
                </button>
              </div>
              <p className="field-hint">Select safety features available at your property</p>
              <div className="checkbox-grid">
                {SAFETY_FEATURES.map((feature) => (
                  <label key={feature} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={(reviewData.safetyFeatures || []).includes(feature)}
                      onChange={() => toggleSafetyFeature(feature)}
                    />
                    <span>{feature}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Square Footage */}
            <div className="form-group">
              <label htmlFor="squareFootage">
                {formData.spaceSnapshot.typeOfSpace === 'Entire Place'
                  ? 'Square Footage (Entire Place)'
                  : 'Square Footage (Room)'}
              </label>
              <p className="field-hint">Approximate size in square feet</p>
              <input
                id="squareFootage"
                type="number"
                min="0"
                placeholder="e.g., 500"
                value={reviewData.squareFootage || ''}
                onChange={(e) =>
                  handleChange('squareFootage', e.target.value ? Number(e.target.value) : undefined)
                }
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="optional-field-column">
            {/* First Day Available */}
            <div className="form-group">
              <label htmlFor="firstDayAvailable">First Day Available</label>
              <p className="field-hint">When can guests start booking?</p>
              <input
                id="firstDayAvailable"
                type="date"
                value={reviewData.firstDayAvailable || ''}
                onChange={(e) => handleChange('firstDayAvailable', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Previous Reviews Link */}
            <div className="form-group">
              <label htmlFor="previousReviewsLink">Import Previous Reviews</label>
              <p className="field-hint">Link to your reviews from Airbnb, VRBO, or other platforms</p>
              <input
                id="previousReviewsLink"
                type="url"
                placeholder="https://www.airbnb.com/users/show/..."
                value={reviewData.previousReviewsLink || ''}
                onChange={(e) => handleChange('previousReviewsLink', e.target.value)}
              />
              {reviewData.previousReviewsLink && (
                <a
                  href={reviewData.previousReviewsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-link"
                  style={{ marginTop: '0.5rem', display: 'inline-block' }}
                >
                  View Reviews →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards - Collapsible */}
      <div className="review-summary">
        {/* Space Snapshot Summary */}
        <div className={`summary-card collapsible ${expandedSections.space ? 'expanded' : ''}`}>
          <div className="summary-card-header" onClick={() => toggleSection('space')}>
            <h3>📍 Space Details</h3>
            <div className="summary-card-header-right">
              <span className="summary-brief">{formData.spaceSnapshot.typeOfSpace} · {formData.spaceSnapshot.bedrooms} BR</span>
              <span className="expand-icon">{expandedSections.space ? '▲' : '▼'}</span>
            </div>
          </div>
          {expandedSections.space && (
            <div className="summary-content">
              <p><strong>Listing Name:</strong> {formData.spaceSnapshot.listingName}</p>
              <p><strong>Type:</strong> {formData.spaceSnapshot.typeOfSpace}</p>
              <p><strong>Bedrooms:</strong> {formData.spaceSnapshot.bedrooms}</p>
              <p><strong>Bathrooms:</strong> {formData.spaceSnapshot.bathrooms}</p>
              <p><strong>Address:</strong> {formData.spaceSnapshot.address.fullAddress}</p>
              <button type="button" className="btn-link">Edit</button>
            </div>
          )}
        </div>

        {/* Features Summary */}
        <div className={`summary-card collapsible ${expandedSections.features ? 'expanded' : ''}`}>
          <div className="summary-card-header" onClick={() => toggleSection('features')}>
            <h3>✨ Features</h3>
            <div className="summary-card-header-right">
              <span className="summary-brief">{formData.features.amenitiesInsideUnit.length + formData.features.amenitiesOutsideUnit.length} amenities</span>
              <span className="expand-icon">{expandedSections.features ? '▲' : '▼'}</span>
            </div>
          </div>
          {expandedSections.features && (
            <div className="summary-content">
              <p><strong>Amenities Inside:</strong> {formData.features.amenitiesInsideUnit.length} selected</p>
              <p><strong>Amenities Outside:</strong> {formData.features.amenitiesOutsideUnit.length} selected</p>
              <p><strong>Description:</strong> {formData.features.descriptionOfLodging.substring(0, 100)}...</p>
              <button type="button" className="btn-link">Edit</button>
            </div>
          )}
        </div>

        {/* Lease Style Summary */}
        <div className={`summary-card collapsible ${expandedSections.leaseStyle ? 'expanded' : ''}`}>
          <div className="summary-card-header" onClick={() => toggleSection('leaseStyle')}>
            <h3>📅 Lease Style</h3>
            <div className="summary-card-header-right">
              <span className="summary-brief">{formData.leaseStyles.rentalType}</span>
              <span className="expand-icon">{expandedSections.leaseStyle ? '▲' : '▼'}</span>
            </div>
          </div>
          {expandedSections.leaseStyle && (
            <div className="summary-content">
              <p><strong>Rental Type:</strong> {formData.leaseStyles.rentalType}</p>
              {formData.leaseStyles.rentalType === 'Nightly' && formData.leaseStyles.availableNights && (
                <p>
                  <strong>Available Nights:</strong>{' '}
                  {Object.values(formData.leaseStyles.availableNights).filter(Boolean).length} nights per week
                </p>
              )}
              {formData.leaseStyles.rentalType === 'Weekly' && (
                <p><strong>Pattern:</strong> {formData.leaseStyles.weeklyPattern}</p>
              )}
              {formData.leaseStyles.rentalType === 'Monthly' && (
                <p><strong>Subsidy Agreement:</strong> {formData.leaseStyles.subsidyAgreement ? 'Agreed' : 'Not agreed'}</p>
              )}
              <button type="button" className="btn-link">Edit</button>
            </div>
          )}
        </div>

        {/* Pricing Summary */}
        <div className={`summary-card collapsible ${expandedSections.pricing ? 'expanded' : ''}`}>
          <div className="summary-card-header" onClick={() => toggleSection('pricing')}>
            <h3>💰 Pricing</h3>
            <div className="summary-card-header-right">
              <span className="summary-brief">
                {formData.leaseStyles.rentalType === 'Monthly' && `$${formData.pricing.monthlyCompensation}/mo`}
                {formData.leaseStyles.rentalType === 'Weekly' && `$${formData.pricing.weeklyCompensation}/wk`}
                {formData.leaseStyles.rentalType === 'Nightly' && formData.pricing.nightlyPricing && `$${formData.pricing.nightlyPricing.oneNightPrice}/night`}
              </span>
              <span className="expand-icon">{expandedSections.pricing ? '▲' : '▼'}</span>
            </div>
          </div>
          {expandedSections.pricing && (
            <div className="summary-content">
              {formData.leaseStyles.rentalType === 'Monthly' && (
                <p><strong>Monthly Rate:</strong> ${formData.pricing.monthlyCompensation}</p>
              )}
              {formData.leaseStyles.rentalType === 'Weekly' && (
                <p><strong>Weekly Rate:</strong> ${formData.pricing.weeklyCompensation}</p>
              )}
              {formData.leaseStyles.rentalType === 'Nightly' && formData.pricing.nightlyPricing && (
                <div>
                  <p><strong>1-Night Price:</strong> ${formData.pricing.nightlyPricing.oneNightPrice}</p>
                  <p><strong>5-Night Total:</strong> ${formData.pricing.nightlyPricing.fiveNightTotal}</p>
                </div>
              )}
              <p><strong>Damage Deposit:</strong> ${formData.pricing.damageDeposit}</p>
              <p><strong>Monthly Maintenance Fee:</strong> ${formData.pricing.maintenanceFee}/month</p>
              <button type="button" className="btn-link">Edit</button>
            </div>
          )}
        </div>

        {/* Rules Summary */}
        <div className={`summary-card collapsible ${expandedSections.rules ? 'expanded' : ''}`}>
          <div className="summary-card-header" onClick={() => toggleSection('rules')}>
            <h3>📋 Rules</h3>
            <div className="summary-card-header-right">
              <span className="summary-brief">{formData.rules.houseRules.length} rules</span>
              <span className="expand-icon">{expandedSections.rules ? '▲' : '▼'}</span>
            </div>
          </div>
          {expandedSections.rules && (
            <div className="summary-content">
              <p><strong>Cancellation:</strong> {formData.rules.cancellationPolicy}</p>
              <p><strong>Check-in:</strong> {formData.rules.checkInTime}</p>
              <p><strong>Check-out:</strong> {formData.rules.checkOutTime}</p>
              <p><strong>Max Guests:</strong> {formData.rules.numberOfGuests}</p>
              <p><strong>House Rules:</strong> {formData.rules.houseRules.length} selected</p>
              <button type="button" className="btn-link">Edit</button>
            </div>
          )}
        </div>

        {/* Photos Summary */}
        <div className={`summary-card collapsible ${expandedSections.photos ? 'expanded' : ''}`}>
          <div className="summary-card-header" onClick={() => toggleSection('photos')}>
            <h3>📷 Photos</h3>
            <div className="summary-card-header-right">
              <span className="summary-brief">{formData.photos.photos.length} photos</span>
              <span className="expand-icon">{expandedSections.photos ? '▲' : '▼'}</span>
            </div>
          </div>
          {expandedSections.photos && (
            <div className="summary-content">
              <p><strong>Total Photos:</strong> {formData.photos.photos.length}</p>
              <div className="photo-preview-grid">
                {formData.photos.photos.slice(0, 4).map((photo) => (
                  <img
                    key={photo.id}
                    src={photo.url}
                    alt="Property preview"
                    className="photo-preview-thumb"
                  />
                ))}
              </div>
              {formData.photos.photos.length > 4 && (
                <p>+{formData.photos.photos.length - 4} more photos</p>
              )}
              <button type="button" className="btn-link">Edit</button>
            </div>
          )}
        </div>
      </div>

      {/* Important Information */}
      <div className="info-box">
        <h4>Before you submit:</h4>
        <ul>
          <li>Your listing will be reviewed by our team within 24-48 hours</li>
          <li>You will receive an email notification once your listing is approved</li>
          <li>You can edit your listing anytime after submission</li>
          <li>Your contact information will remain private and secure</li>
          <li>You will agree to Terms and Conditions during sign-up</li>
        </ul>
      </div>

      {/* Fixed Bottom Navigation */}
      <div className="review-fixed-navigation">
        <button type="button" className="btn-back" onClick={onBack} disabled={isSubmitting}>
          Back
        </button>
        <button
          type="button"
          className="btn-submit"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Listing'}
        </button>
      </div>

      {isSubmitting && (
        <div className="submitting-overlay">
          <div className="spinner" />
          <p>Submitting your listing...</p>
        </div>
      )}
    </div>
  );
};
