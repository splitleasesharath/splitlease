/**
 * ReviewStep.jsx
 *
 * Step 7: Review & Sign
 * Summary of all entered information with signature field.
 */

import React from 'react';
import { Edit2, Check, AlertCircle } from 'lucide-react';

function ReviewSection({ title, children, onEdit, stepNumber }) {
  return (
    <div className="review-section">
      <div className="review-section__header">
        <h4 className="review-section__title">{title}</h4>
        <button
          type="button"
          className="review-section__edit"
          onClick={() => onEdit(stepNumber)}
        >
          <Edit2 size={14} />
          Edit
        </button>
      </div>
      <div className="review-section__content">
        {children}
      </div>
    </div>
  );
}

function ReviewField({ label, value, fallback = 'Not provided' }) {
  return (
    <div className="review-field">
      <span className="review-field__label">{label}</span>
      <span className="review-field__value">{value || fallback}</span>
    </div>
  );
}

export default function ReviewStep({
  formData,
  occupants,
  fieldErrors,
  onFieldChange,
  onFieldBlur,
  onGoToStep,
  progress,
  canSubmit,
}) {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not provided';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatYesNo = (value) => {
    if (!value) return 'Not specified';
    return value === 'yes' ? 'Yes' : 'No';
  };

  return (
    <div className="wizard-step review-step">
      <div className="review-step__progress">
        <div className="review-step__progress-bar">
          <div
            className="review-step__progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="review-step__progress-info">
          <span className="review-step__progress-text">{progress}% Complete</span>
          {canSubmit ? (
            <span className="review-step__ready">
              <Check size={14} /> Ready to submit
            </span>
          ) : (
            <span className="review-step__incomplete">
              <AlertCircle size={14} /> Complete 80% to submit
            </span>
          )}
        </div>
      </div>

      <ReviewSection title="Personal Information" onEdit={onGoToStep} stepNumber={1}>
        <ReviewField label="Full Name" value={formData.fullName} />
        <ReviewField label="Date of Birth" value={formatDate(formData.dob)} />
        <ReviewField label="Email" value={formData.email} />
        <ReviewField label="Phone" value={formData.phone} />
      </ReviewSection>

      <ReviewSection title="Current Address" onEdit={onGoToStep} stepNumber={2}>
        <ReviewField label="Address" value={formData.currentAddress} />
        {formData.apartmentUnit && (
          <ReviewField label="Unit" value={formData.apartmentUnit} />
        )}
        <ReviewField label="Length at Address" value={formData.lengthResided} />
        <ReviewField label="Currently Renting" value={formatYesNo(formData.renting)} />
      </ReviewSection>

      {occupants.length > 0 && (
        <ReviewSection title="Occupants" onEdit={onGoToStep} stepNumber={3}>
          {occupants.map((occ, i) => (
            <ReviewField
              key={occ.id}
              label={`Occupant ${i + 1}`}
              value={`${occ.name || 'Name not provided'} (${occ.relationship || 'Relationship not specified'})`}
            />
          ))}
        </ReviewSection>
      )}

      <ReviewSection title="Employment" onEdit={onGoToStep} stepNumber={4}>
        <ReviewField label="Status" value={formData.employmentStatus} />
        {formData.employerName && (
          <ReviewField label="Employer" value={formData.employerName} />
        )}
        {formData.jobTitle && (
          <ReviewField label="Position" value={formData.jobTitle} />
        )}
        {formData.businessName && (
          <ReviewField label="Business" value={formData.businessName} />
        )}
      </ReviewSection>

      <ReviewSection title="Requirements" onEdit={onGoToStep} stepNumber={5}>
        <ReviewField label="Pets" value={formatYesNo(formData.hasPets)} />
        <ReviewField label="Smoker" value={formatYesNo(formData.isSmoker)} />
        <ReviewField label="Parking" value={formatYesNo(formData.needsParking)} />
      </ReviewSection>

      <div className="signature-section">
        <h4 className="signature-section__title">Signature</h4>
        <p className="signature-section__legal">
          By signing below, you certify that all information provided in this application is accurate and truthful.
        </p>
        <div className="wizard-form-group">
          <label htmlFor="signature" className="wizard-label">
            Type your full legal name <span className="required">*</span>
          </label>
          <input
            type="text"
            id="signature"
            className={`wizard-input wizard-input--signature ${fieldErrors.signature ? 'wizard-input--error' : ''}`}
            value={formData.signature || ''}
            onChange={(e) => onFieldChange('signature', e.target.value)}
            onBlur={() => onFieldBlur('signature')}
            placeholder="Your full legal name"
          />
          {fieldErrors.signature && (
            <span className="wizard-error">{fieldErrors.signature}</span>
          )}
        </div>
      </div>
    </div>
  );
}
