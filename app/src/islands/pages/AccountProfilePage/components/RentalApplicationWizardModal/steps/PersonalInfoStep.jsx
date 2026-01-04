/**
 * PersonalInfoStep.jsx
 *
 * Step 1: Personal Information
 * Fields: fullName, dob, email, phone
 */

import React from 'react';

export default function PersonalInfoStep({
  formData,
  fieldErrors,
  fieldValid,
  onFieldChange,
  onFieldBlur,
}) {
  return (
    <div className="wizard-step personal-info-step">
      <p className="wizard-step__intro">
        Let's start with some basic information about you.
      </p>

      <div className="wizard-form-group">
        <label htmlFor="fullName" className="wizard-label">
          Full Legal Name <span className="required">*</span>
        </label>
        <input
          type="text"
          id="fullName"
          className={`wizard-input ${fieldErrors.fullName ? 'wizard-input--error' : ''} ${fieldValid.fullName ? 'wizard-input--valid' : ''}`}
          value={formData.fullName || ''}
          onChange={(e) => onFieldChange('fullName', e.target.value)}
          onBlur={() => onFieldBlur('fullName')}
          placeholder="Enter your full legal name"
        />
        {fieldErrors.fullName && (
          <span className="wizard-error">{fieldErrors.fullName}</span>
        )}
      </div>

      <div className="wizard-form-group">
        <label htmlFor="dob" className="wizard-label">
          Date of Birth <span className="required">*</span>
        </label>
        <input
          type="date"
          id="dob"
          className={`wizard-input ${fieldErrors.dob ? 'wizard-input--error' : ''} ${fieldValid.dob ? 'wizard-input--valid' : ''}`}
          value={formData.dob || ''}
          onChange={(e) => onFieldChange('dob', e.target.value)}
          onBlur={() => onFieldBlur('dob')}
        />
        {fieldErrors.dob && (
          <span className="wizard-error">{fieldErrors.dob}</span>
        )}
      </div>

      <div className="wizard-form-group">
        <label htmlFor="email" className="wizard-label">
          Email Address <span className="required">*</span>
        </label>
        <input
          type="email"
          id="email"
          className={`wizard-input ${fieldErrors.email ? 'wizard-input--error' : ''} ${fieldValid.email ? 'wizard-input--valid' : ''}`}
          value={formData.email || ''}
          onChange={(e) => onFieldChange('email', e.target.value)}
          onBlur={() => onFieldBlur('email')}
          placeholder="you@example.com"
        />
        {fieldErrors.email && (
          <span className="wizard-error">{fieldErrors.email}</span>
        )}
      </div>

      <div className="wizard-form-group">
        <label htmlFor="phone" className="wizard-label">
          Phone Number <span className="required">*</span>
        </label>
        <input
          type="tel"
          id="phone"
          className={`wizard-input ${fieldErrors.phone ? 'wizard-input--error' : ''} ${fieldValid.phone ? 'wizard-input--valid' : ''}`}
          value={formData.phone || ''}
          onChange={(e) => onFieldChange('phone', e.target.value)}
          onBlur={() => onFieldBlur('phone')}
          placeholder="(555) 123-4567"
        />
        {fieldErrors.phone && (
          <span className="wizard-error">{fieldErrors.phone}</span>
        )}
      </div>
    </div>
  );
}
