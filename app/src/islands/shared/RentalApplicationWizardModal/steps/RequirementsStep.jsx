/**
 * RequirementsStep.jsx
 *
 * Step 5: Special Requirements
 * Fields: hasPets, isSmoker, needsParking, references
 */

import React from 'react';

export default function RequirementsStep({
  formData,
  onFieldChange,
}) {
  return (
    <div className="wizard-step requirements-step">
      <p className="wizard-step__intro">
        Help hosts understand your needs. All fields are optional.
      </p>

      <div className="wizard-form-group">
        <label htmlFor="hasPets" className="wizard-label">
          Do you have any pets?
        </label>
        <select
          id="hasPets"
          className="wizard-select"
          value={formData.hasPets || ''}
          onChange={(e) => onFieldChange('hasPets', e.target.value)}
        >
          <option value="">Select an option</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>

      {formData.hasPets === 'yes' && (
        <div className="wizard-form-group">
          <label htmlFor="petDetails" className="wizard-label">
            Pet Details
          </label>
          <textarea
            id="petDetails"
            className="wizard-textarea"
            value={formData.petDetails || ''}
            onChange={(e) => onFieldChange('petDetails', e.target.value)}
            placeholder="Type, breed, weight, etc."
            rows={2}
          />
        </div>
      )}

      <div className="wizard-form-group">
        <label htmlFor="isSmoker" className="wizard-label">
          Do you smoke?
        </label>
        <select
          id="isSmoker"
          className="wizard-select"
          value={formData.isSmoker || ''}
          onChange={(e) => onFieldChange('isSmoker', e.target.value)}
        >
          <option value="">Select an option</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>

      <div className="wizard-form-group">
        <label htmlFor="needsParking" className="wizard-label">
          Do you need parking?
        </label>
        <select
          id="needsParking"
          className="wizard-select"
          value={formData.needsParking || ''}
          onChange={(e) => onFieldChange('needsParking', e.target.value)}
        >
          <option value="">Select an option</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>

      <div className="wizard-form-group">
        <label htmlFor="references" className="wizard-label">
          References
        </label>
        <textarea
          id="references"
          className="wizard-textarea"
          value={formData.references || ''}
          onChange={(e) => onFieldChange('references', e.target.value)}
          placeholder="Previous landlord, employer, or personal references with contact information"
          rows={4}
        />
        <p className="wizard-hint">
          Providing references can help hosts trust you faster.
        </p>
      </div>
    </div>
  );
}
