/**
 * EmploymentStep.jsx
 *
 * Step 4: Employment Information
 * Conditional fields based on employmentStatus selection.
 */

import React from 'react';

export default function EmploymentStep({
  formData,
  fieldErrors,
  fieldValid,
  onFieldChange,
  onFieldBlur,
  employmentStatusOptions,
}) {
  const status = formData.employmentStatus;
  const isEmployee = ['full-time', 'part-time', 'intern'].includes(status);
  const isBusinessOwner = status === 'business-owner';
  const needsAlternate = ['student', 'unemployed', 'other'].includes(status);

  return (
    <div className="wizard-step employment-step">
      <p className="wizard-step__intro">
        Tell us about your employment situation.
      </p>

      <div className="wizard-form-group">
        <label htmlFor="employmentStatus" className="wizard-label">
          Employment Status <span className="required">*</span>
        </label>
        <select
          id="employmentStatus"
          className={`wizard-select ${fieldErrors.employmentStatus ? 'wizard-input--error' : ''}`}
          value={status || ''}
          onChange={(e) => onFieldChange('employmentStatus', e.target.value)}
          onBlur={() => onFieldBlur('employmentStatus')}
        >
          {employmentStatusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {fieldErrors.employmentStatus && (
          <span className="wizard-error">{fieldErrors.employmentStatus}</span>
        )}
      </div>

      {/* Employee fields */}
      {isEmployee && (
        <>
          <div className="wizard-form-group">
            <label htmlFor="employerName" className="wizard-label">
              Employer Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="employerName"
              className={`wizard-input ${fieldErrors.employerName ? 'wizard-input--error' : ''}`}
              value={formData.employerName || ''}
              onChange={(e) => onFieldChange('employerName', e.target.value)}
              onBlur={() => onFieldBlur('employerName')}
              placeholder="Company name"
            />
            {fieldErrors.employerName && (
              <span className="wizard-error">{fieldErrors.employerName}</span>
            )}
          </div>

          <div className="wizard-form-group">
            <label htmlFor="employerPhone" className="wizard-label">
              Employer Phone <span className="required">*</span>
            </label>
            <input
              type="tel"
              id="employerPhone"
              className={`wizard-input ${fieldErrors.employerPhone ? 'wizard-input--error' : ''}`}
              value={formData.employerPhone || ''}
              onChange={(e) => onFieldChange('employerPhone', e.target.value)}
              onBlur={() => onFieldBlur('employerPhone')}
              placeholder="(555) 123-4567"
            />
            {fieldErrors.employerPhone && (
              <span className="wizard-error">{fieldErrors.employerPhone}</span>
            )}
          </div>

          <div className="wizard-form-group">
            <label htmlFor="jobTitle" className="wizard-label">
              Job Title <span className="required">*</span>
            </label>
            <input
              type="text"
              id="jobTitle"
              className={`wizard-input ${fieldErrors.jobTitle ? 'wizard-input--error' : ''}`}
              value={formData.jobTitle || ''}
              onChange={(e) => onFieldChange('jobTitle', e.target.value)}
              onBlur={() => onFieldBlur('jobTitle')}
              placeholder="Your position"
            />
            {fieldErrors.jobTitle && (
              <span className="wizard-error">{fieldErrors.jobTitle}</span>
            )}
          </div>

          <div className="wizard-form-group">
            <label htmlFor="monthlyIncome" className="wizard-label">
              Monthly Income <span className="required">*</span>
            </label>
            <input
              type="number"
              id="monthlyIncome"
              className={`wizard-input ${fieldErrors.monthlyIncome ? 'wizard-input--error' : ''}`}
              value={formData.monthlyIncome || ''}
              onChange={(e) => onFieldChange('monthlyIncome', e.target.value)}
              onBlur={() => onFieldBlur('monthlyIncome')}
              placeholder="5000"
              min="0"
            />
            {fieldErrors.monthlyIncome && (
              <span className="wizard-error">{fieldErrors.monthlyIncome}</span>
            )}
          </div>
        </>
      )}

      {/* Business owner fields */}
      {isBusinessOwner && (
        <>
          <div className="wizard-form-group">
            <label htmlFor="businessName" className="wizard-label">
              Business Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="businessName"
              className={`wizard-input ${fieldErrors.businessName ? 'wizard-input--error' : ''}`}
              value={formData.businessName || ''}
              onChange={(e) => onFieldChange('businessName', e.target.value)}
              onBlur={() => onFieldBlur('businessName')}
              placeholder="Your business name"
            />
            {fieldErrors.businessName && (
              <span className="wizard-error">{fieldErrors.businessName}</span>
            )}
          </div>

          <div className="wizard-form-group">
            <label htmlFor="businessYear" className="wizard-label">
              Year Established <span className="required">*</span>
            </label>
            <input
              type="number"
              id="businessYear"
              className={`wizard-input ${fieldErrors.businessYear ? 'wizard-input--error' : ''}`}
              value={formData.businessYear || ''}
              onChange={(e) => onFieldChange('businessYear', e.target.value)}
              onBlur={() => onFieldBlur('businessYear')}
              placeholder="2020"
              min="1900"
              max={new Date().getFullYear()}
            />
            {fieldErrors.businessYear && (
              <span className="wizard-error">{fieldErrors.businessYear}</span>
            )}
          </div>

          <div className="wizard-form-group">
            <label htmlFor="businessState" className="wizard-label">
              State Registered <span className="required">*</span>
            </label>
            <input
              type="text"
              id="businessState"
              className={`wizard-input ${fieldErrors.businessState ? 'wizard-input--error' : ''}`}
              value={formData.businessState || ''}
              onChange={(e) => onFieldChange('businessState', e.target.value)}
              onBlur={() => onFieldBlur('businessState')}
              placeholder="e.g., New York"
            />
            {fieldErrors.businessState && (
              <span className="wizard-error">{fieldErrors.businessState}</span>
            )}
          </div>
        </>
      )}

      {/* Student/Unemployed/Other */}
      {needsAlternate && (
        <div className="wizard-form-group">
          <label htmlFor="alternateIncome" className="wizard-label">
            Alternate Source of Income
          </label>
          <textarea
            id="alternateIncome"
            className="wizard-textarea"
            value={formData.alternateIncome || ''}
            onChange={(e) => onFieldChange('alternateIncome', e.target.value)}
            placeholder="Describe any other sources of income (savings, family support, etc.)"
            rows={3}
          />
          <p className="wizard-hint">
            You can upload supporting documents in the Documents step.
          </p>
        </div>
      )}
    </div>
  );
}
