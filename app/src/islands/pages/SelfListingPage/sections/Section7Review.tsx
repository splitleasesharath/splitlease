import React, { useState } from 'react';
import type { ListingFormData, ReviewData } from '../types/listing.types';
import { SAFETY_FEATURES } from '../types/listing.types';

interface Section7Props {
  formData: ListingFormData;
  reviewData: ReviewData;
  onChange: (data: ReviewData) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export const Section7Review: React.FC<Section7Props> = ({
  formData,
  reviewData,
  onChange,
  onSubmit,
  onBack,
  isSubmitting
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

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
              <label>Safety Features</label>
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

      {/* Summary Cards */}
      <div className="review-summary">
        {/* Space Snapshot Summary */}
        <div className="summary-card">
          <h3>📍 Space Details</h3>
          <div className="summary-content">
            <p><strong>Listing Name:</strong> {formData.spaceSnapshot.listingName}</p>
            <p><strong>Type:</strong> {formData.spaceSnapshot.typeOfSpace}</p>
            <p><strong>Bedrooms:</strong> {formData.spaceSnapshot.bedrooms}</p>
            <p><strong>Bathrooms:</strong> {formData.spaceSnapshot.bathrooms}</p>
            <p><strong>Address:</strong> {formData.spaceSnapshot.address.fullAddress}</p>
          </div>
          <button type="button" className="btn-link">Edit</button>
        </div>

        {/* Features Summary */}
        <div className="summary-card">
          <h3>✨ Features</h3>
          <div className="summary-content">
            <p><strong>Amenities Inside:</strong> {formData.features.amenitiesInsideUnit.length} selected</p>
            <p><strong>Amenities Outside:</strong> {formData.features.amenitiesOutsideUnit.length} selected</p>
            <p><strong>Description:</strong> {formData.features.descriptionOfLodging.substring(0, 100)}...</p>
          </div>
          <button type="button" className="btn-link">Edit</button>
        </div>

        {/* Lease Style Summary */}
        <div className="summary-card">
          <h3>📅 Lease Style</h3>
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
          </div>
          <button type="button" className="btn-link">Edit</button>
        </div>

        {/* Pricing Summary */}
        <div className="summary-card">
          <h3>💰 Pricing</h3>
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
          </div>
          <button type="button" className="btn-link">Edit</button>
        </div>

        {/* Rules Summary */}
        <div className="summary-card">
          <h3>📋 Rules</h3>
          <div className="summary-content">
            <p><strong>Cancellation:</strong> {formData.rules.cancellationPolicy}</p>
            <p><strong>Check-in:</strong> {formData.rules.checkInTime}</p>
            <p><strong>Check-out:</strong> {formData.rules.checkOutTime}</p>
            <p><strong>Max Guests:</strong> {formData.rules.numberOfGuests}</p>
            <p><strong>House Rules:</strong> {formData.rules.houseRules.length} selected</p>
          </div>
          <button type="button" className="btn-link">Edit</button>
        </div>

        {/* Photos Summary */}
        <div className="summary-card">
          <h3>📷 Photos</h3>
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
          </div>
          <button type="button" className="btn-link">Edit</button>
        </div>
      </div>

      {/* Optional Notes */}
      <div className="form-group">
        <label htmlFor="optionalNotes">Additional Notes (Optional)</label>
        <textarea
          id="optionalNotes"
          rows={4}
          placeholder="Any additional information you'd like to share..."
          value={reviewData.optionalNotes || ''}
          onChange={(e) => handleChange('optionalNotes', e.target.value)}
        />
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
