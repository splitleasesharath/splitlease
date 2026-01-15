/**
 * Rental Application Page - HOLLOW COMPONENT PATTERN
 *
 * This is a pure visual component that delegates ALL business logic to useRentalApplicationPageLogic hook.
 * The component only handles:
 * - Rendering UI based on pre-calculated state from the hook
 * - Calling handlers provided by the hook
 *
 * Architecture (per Four-Layer Logic Architecture):
 * - NO business logic in this file (no calculations, no state derivation)
 * - NO direct database calls
 * - NO validation logic
 * - ONLY receives pre-processed data and pre-bound handlers from the hook
 */

import Header from '../shared/Header.jsx';
import { useRentalApplicationPageLogic } from './useRentalApplicationPageLogic.js';

export default function RentalApplicationPage() {
  useEffect(() => {
    // Get the user ID for redirect
    const userId = getSessionId();

    // Preserve any query params (like proposal ID)
    const params = new URLSearchParams(window.location.search);
    const proposalId = params.get('proposal');

    // Build redirect URL
    const redirectParams = new URLSearchParams();
    redirectParams.set('section', 'rental-application');
    redirectParams.set('openRentalApp', 'true');
    if (proposalId) {
      redirectParams.set('proposal', proposalId);
    }

    if (userId) {
      window.location.replace(`/account-profile?${redirectParams.toString()}`);
    } else {
      // Not logged in - redirect to home (route is protected anyway)
      window.location.replace('/');
    }
  }, []);

  // Show loading state while redirecting
  return (
    <>
      <Header
        requireAuth={requireAuth}
        showAuthModalOnLoad={requireAuth && !isAuthenticated}
      />

      <main className="rental-app-main-content">
        {/* Page Header */}
        <section className="page-header">
          <div className="header-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="7" width="18" height="14" rx="2" />
              <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
          </div>
          <div className="header-text">
            <h1 className="page-title">Rental Application</h1>
            <p className="page-subtitle">Previously entered information has been populated.</p>
            <p className="page-subtitle">Please make sure necessary adjustments are made to reflect latest information.</p>
          </div>
        </section>

        <div className="content-wrapper">
          {/* Form Container */}
          <div className="form-container">
            <form id="rental-application-form" onSubmit={handleSubmit}>
              {/* Personal Information Section */}
              <section className="form-section">
                <h2 className="section-title">Personal Information</h2>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="fullName" className="form-label">
                      Name as on government ID <span className="required">*</span>
                    </label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        id="fullName"
                        className={getInputClassName('fullName')}
                        placeholder="Enter your full legal name"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        onBlur={() => handleInputBlur('fullName')}
                        required
                      />
                      <span className="validation-icon" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="dob" className="form-label">
                      Date of Birth <span className="required">*</span>
                    </label>
                    <div className="input-wrapper">
                      <input
                        type="date"
                        id="dob"
                        className={getInputClassName('dob')}
                        value={formData.dob}
                        onChange={(e) => handleInputChange('dob', e.target.value)}
                        onBlur={() => handleInputBlur('dob')}
                        required
                      />
                      <span className="validation-icon" />
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">
                      Email <span className="required">*</span>
                    </label>
                    <div className="input-wrapper">
                      <input
                        type="email"
                        id="email"
                        className={getInputClassName('email')}
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        onBlur={() => handleInputBlur('email')}
                        required
                      />
                      <span className="validation-icon" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone" className="form-label">
                      Phone Number <span className="required">*</span>
                    </label>
                    <div className="input-wrapper">
                      <input
                        type="tel"
                        id="phone"
                        className={getInputClassName('phone')}
                        placeholder="(555) 555-5555"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        onBlur={() => handleInputBlur('phone')}
                        required
                      />
                      <span className="validation-icon" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Address Section */}
              <section className="form-section">
                <h2 className="section-title">Current Address</h2>

                <div className="form-group full-width">
                  <label htmlFor="currentAddress" className="form-label">
                    Current Permanent Address <span className="required">*</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      ref={addressInputRef}
                      type="text"
                      id="currentAddress"
                      className={getInputClassName('currentAddress')}
                      placeholder="Start typing your address..."
                      value={formData.currentAddress}
                      onChange={(e) => handleInputChange('currentAddress', e.target.value)}
                      onBlur={() => handleInputBlur('currentAddress')}
                      required
                      autoComplete="off"
                    />
                    <span className="validation-icon" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="apartmentUnit" className="form-label">
                      Apartment / Unit #
                    </label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        id="apartmentUnit"
                        className="form-input"
                        placeholder="Apt #"
                        value={formData.apartmentUnit}
                        onChange={(e) => handleInputChange('apartmentUnit', e.target.value)}
                      />
                      <span className="validation-icon" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="lengthResided" className="form-label">
                      Length Resided <span className="required">*</span>
                    </label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        id="lengthResided"
                        className={getInputClassName('lengthResided')}
                        placeholder="e.g., 2 years"
                        value={formData.lengthResided}
                        onChange={(e) => handleInputChange('lengthResided', e.target.value)}
                        onBlur={() => handleInputBlur('lengthResided')}
                        required
                      />
                      <span className="validation-icon" />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Are you currently renting? <span className="required">*</span>
                  </label>
                  <div className="toggle-group">
                    <label className="toggle-option">
                      <input
                        type="radio"
                        name="renting"
                        value="yes"
                        checked={formData.renting === 'yes'}
                        onChange={() => handleRadioChange('renting', 'yes')}
                        required
                      />
                      <span className="toggle-label">Yes</span>
                    </label>
                    <label className="toggle-option">
                      <input
                        type="radio"
                        name="renting"
                        value="no"
                        checked={formData.renting === 'no'}
                        onChange={() => handleRadioChange('renting', 'no')}
                      />
                      <span className="toggle-label">No</span>
                    </label>
                  </div>
                </div>
              </section>

              {/* Occupants Section */}
              <section className="form-section">
                <h2 className="section-title">Additional Occupants</h2>
                <p className="section-description">
                  Add any additional people who will be living in the rental (max {maxOccupants} total)
                </p>

                <div className="occupants-container">
                  {occupants.map((occupant) => (
                    <div key={occupant.id} className="occupant-row">
                      <div className="form-group">
                        <label className="form-label">Occupant Name</label>
                        <div className="input-wrapper">
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Full name"
                            value={occupant.name}
                            onChange={(e) => updateOccupant(occupant.id, 'name', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Relationship</label>
                        <div className="input-wrapper">
                          <select
                            className="form-input form-select"
                            value={occupant.relationship}
                            onChange={(e) => updateOccupant(occupant.id, 'relationship', e.target.value)}
                          >
                            {relationshipOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="delete-occupant"
                        onClick={() => removeOccupant(occupant.id)}
                        aria-label="Remove occupant"
                      >
                        &#128465;
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={addOccupant}
                  disabled={occupants.length >= maxOccupants}
                >
                  <span>+</span> Add Occupant
                </button>
                <span className="occupant-counter">
                  {occupants.length} / {maxOccupants} occupants
                </span>
              </section>

              {/* Employment Section */}
              <section className="form-section">
                <h2 className="section-title">Employment Information</h2>

                <div className="form-group">
                  <label htmlFor="employmentStatus" className="form-label">
                    Employment Status <span className="required">*</span>
                  </label>
                  <div className="input-wrapper">
                    <select
                      id="employmentStatus"
                      className={`form-input form-select ${getInputClassName('employmentStatus')}`}
                      value={formData.employmentStatus}
                      onChange={(e) => handleInputChange('employmentStatus', e.target.value)}
                      onBlur={() => handleInputBlur('employmentStatus')}
                      required
                    >
                      {employmentStatusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <span className="validation-icon" />
                  </div>
                </div>

                {/* Employed Fields (Full-time, Part-time, Intern) */}
                {['full-time', 'part-time', 'intern'].includes(formData.employmentStatus) && (
                  <div className="conditional-fields">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="employerName" className="form-label">
                          Employer Name <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                          <input
                            type="text"
                            id="employerName"
                            className={getInputClassName('employerName')}
                            placeholder="Company name"
                            value={formData.employerName}
                            onChange={(e) => handleInputChange('employerName', e.target.value)}
                            onBlur={() => handleInputBlur('employerName')}
                          />
                          <span className="validation-icon" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label htmlFor="employerPhone" className="form-label">
                          Employer Phone <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                          <input
                            type="tel"
                            id="employerPhone"
                            className={getInputClassName('employerPhone')}
                            placeholder="(555) 555-5555"
                            value={formData.employerPhone}
                            onChange={(e) => handleInputChange('employerPhone', e.target.value)}
                            onBlur={() => handleInputBlur('employerPhone')}
                          />
                          <span className="validation-icon" />
                        </div>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="jobTitle" className="form-label">
                          Job Title <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                          <input
                            type="text"
                            id="jobTitle"
                            className={getInputClassName('jobTitle')}
                            placeholder="Your position"
                            value={formData.jobTitle}
                            onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                            onBlur={() => handleInputBlur('jobTitle')}
                          />
                          <span className="validation-icon" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label htmlFor="monthlyIncome" className="form-label">
                          Monthly Income (USD) <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                          <input
                            type="number"
                            id="monthlyIncome"
                            className={getInputClassName('monthlyIncome')}
                            placeholder="5000"
                            min="0"
                            value={formData.monthlyIncome}
                            onChange={(e) => handleInputChange('monthlyIncome', e.target.value)}
                            onBlur={() => handleInputBlur('monthlyIncome')}
                          />
                          <span className="validation-icon" />
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Proof of Employment</label>
                      {renderFileUploadBox(
                        'employmentProof',
                        'employmentProofFile',
                        'Upload a recent pay stub or employment letter',
                        'proofOfEmploymentUrl'
                      )}
                    </div>
                  </div>
                )}

                {/* Business Owner Fields */}
                {formData.employmentStatus === 'business-owner' && (
                  <div className="conditional-fields">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="businessName" className="form-label">
                          Business Legal Name <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                          <input
                            type="text"
                            id="businessName"
                            className={getInputClassName('businessName')}
                            placeholder="Legal business name"
                            value={formData.businessName}
                            onChange={(e) => handleInputChange('businessName', e.target.value)}
                            onBlur={() => handleInputBlur('businessName')}
                          />
                          <span className="validation-icon" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label htmlFor="businessYear" className="form-label">
                          Year Business Created <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                          <input
                            type="number"
                            id="businessYear"
                            className={getInputClassName('businessYear')}
                            placeholder="2020"
                            min="1900"
                            max="2025"
                            value={formData.businessYear}
                            onChange={(e) => handleInputChange('businessYear', e.target.value)}
                            onBlur={() => handleInputBlur('businessYear')}
                          />
                          <span className="validation-icon" />
                        </div>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="businessState" className="form-label">
                          State Business Registered <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                          <input
                            type="text"
                            id="businessState"
                            className={getInputClassName('businessState')}
                            placeholder="State"
                            value={formData.businessState}
                            onChange={(e) => handleInputChange('businessState', e.target.value)}
                            onBlur={() => handleInputBlur('businessState')}
                          />
                          <span className="validation-icon" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label htmlFor="monthlyIncomeSelf" className="form-label">
                          Monthly Income (USD) <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                          <input
                            type="number"
                            id="monthlyIncomeSelf"
                            className={getInputClassName('monthlyIncomeSelf')}
                            placeholder="5000"
                            min="0"
                            value={formData.monthlyIncomeSelf}
                            onChange={(e) => handleInputChange('monthlyIncomeSelf', e.target.value)}
                            onBlur={() => handleInputBlur('monthlyIncomeSelf')}
                          />
                          <span className="validation-icon" />
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Does anyone own more than 25% stake in the company?</label>
                      <div className="toggle-group">
                        <label className="toggle-option">
                          <input
                            type="radio"
                            name="companyStake"
                            value="yes"
                            checked={formData.companyStake === 'yes'}
                            onChange={() => handleRadioChange('companyStake', 'yes')}
                          />
                          <span className="toggle-label">Yes</span>
                        </label>
                        <label className="toggle-option">
                          <input
                            type="radio"
                            name="companyStake"
                            value="no"
                            checked={formData.companyStake === 'no'}
                            onChange={() => handleRadioChange('companyStake', 'no')}
                          />
                          <span className="toggle-label">No</span>
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Using Split Lease for business?</label>
                      <div className="toggle-group">
                        <label className="toggle-option">
                          <input
                            type="radio"
                            name="slForBusiness"
                            value="yes"
                            checked={formData.slForBusiness === 'yes'}
                            onChange={() => handleRadioChange('slForBusiness', 'yes')}
                          />
                          <span className="toggle-label">Yes</span>
                        </label>
                        <label className="toggle-option">
                          <input
                            type="radio"
                            name="slForBusiness"
                            value="no"
                            checked={formData.slForBusiness === 'no'}
                            onChange={() => handleRadioChange('slForBusiness', 'no')}
                          />
                          <span className="toggle-label">No</span>
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Would special forms make filing for taxes easier?</label>
                      <div className="toggle-group">
                        <label className="toggle-option">
                          <input
                            type="radio"
                            name="taxForms"
                            value="yes"
                            checked={formData.taxForms === 'yes'}
                            onChange={() => handleRadioChange('taxForms', 'yes')}
                          />
                          <span className="toggle-label">Yes</span>
                        </label>
                        <label className="toggle-option">
                          <input
                            type="radio"
                            name="taxForms"
                            value="no"
                            checked={formData.taxForms === 'no'}
                            onChange={() => handleRadioChange('taxForms', 'no')}
                          />
                          <span className="toggle-label">No</span>
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Alternative Guarantee Document</label>
                      {renderFileUploadBox(
                        'alternateGuarantee',
                        'alternateGuaranteeFile',
                        'Upload supporting documentation',
                        'alternateGuaranteeUrl'
                      )}
                    </div>
                  </div>
                )}

                {/* Alternate Guarantee Fields (Student/Unemployed/Other) */}
                {['student', 'unemployed', 'other'].includes(formData.employmentStatus) && (
                  <div className="conditional-fields">
                    <div className="form-group">
                      <label htmlFor="alternateIncome" className="form-label">
                        Alternate Source of Income
                      </label>
                      <div className="input-wrapper">
                        <input
                          type="text"
                          id="alternateIncome"
                          className="form-input"
                          placeholder="Describe your income source"
                          value={formData.alternateIncome}
                          onChange={(e) => handleInputChange('alternateIncome', e.target.value)}
                        />
                        <span className="validation-icon" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Alternative Guarantee Document</label>
                      {renderFileUploadBox(
                        'altGuarantee',
                        'altGuaranteeFile',
                        'Upload supporting documentation',
                        'alternateGuaranteeUrl'
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* Optional Verification Section */}
              <section className="form-section">
                <h2 className="section-title">Optional Verification</h2>
                <p className="section-description">
                  Connect your social accounts and verify your identity for faster approval
                </p>

                <div className="verification-buttons">
                  {renderVerificationButton(
                    'linkedin',
                    'Connect LinkedIn',
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>,
                    'btn-linkedin'
                  )}
                  {renderVerificationButton(
                    'facebook',
                    'Connect Facebook',
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
                    </svg>,
                    'btn-facebook'
                  )}
                </div>

                <div className="verification-actions">
                  {renderVerificationButton(
                    'id',
                    'Verify ID',
                    null,
                    'btn-primary'
                  )}
                  {renderVerificationButton(
                    'income',
                    'Verify Income',
                    null,
                    'btn-primary'
                  )}
                </div>
              </section>

              {/* Special Requirements Section */}
              <section className="form-section">
                <h2 className="section-title">Special Requirements & References</h2>

                <div className="requirements-grid">
                  <div className="form-group">
                    <label htmlFor="hasPets" className="form-label">
                      Pets? <span className="checkmark">{formData.hasPets ? '✔' : ''}</span>
                    </label>
                    <select
                      id="hasPets"
                      className="form-input form-select"
                      value={formData.hasPets}
                      onChange={(e) => handleInputChange('hasPets', e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="isSmoker" className="form-label">
                      Smoker? <span className="checkmark">{formData.isSmoker ? '✔' : ''}</span>
                    </label>
                    <select
                      id="isSmoker"
                      className="form-input form-select"
                      value={formData.isSmoker}
                      onChange={(e) => handleInputChange('isSmoker', e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="needsParking" className="form-label">
                      Parking? <span className="checkmark">{formData.needsParking ? '✔' : ''}</span>
                    </label>
                    <select
                      id="needsParking"
                      className="form-input form-select"
                      value={formData.needsParking}
                      onChange={(e) => handleInputChange('needsParking', e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* References Section */}
              <section className="form-section">
                <h2 className="section-title">References (links or notes)</h2>

                <div className="form-group full-width">
                  <div className="input-wrapper">
                    <textarea
                      id="references"
                      className="form-input form-textarea"
                      placeholder="Landlord, host references..."
                      rows="3"
                      value={formData.references}
                      onChange={(e) => handleInputChange('references', e.target.value)}
                    />
                  </div>
                </div>

                {/* Visual References Toggle */}
                <div className="toggle-reveal-section">
                  <div className="toggle-reveal-row">
                    <span className="toggle-reveal-text">
                      Do you have any visual reviews or references from landlords or hosts you have stayed with in the past? Toggle this to submit your images
                    </span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={formData.showVisualReferences}
                        onChange={() => handleToggleChange('showVisualReferences')}
                      />
                      <span className="slider" />
                    </label>
                  </div>

                  {formData.showVisualReferences && (
                    <div className="form-group">
                      <div
                        className="upload-box"
                        onClick={() => document.getElementById('referencesFile').click()}
                      >
                        <span className="upload-icon">&#128206;</span>
                        <span className="upload-text">Click to upload images</span>
                        <input
                          type="file"
                          id="referencesFile"
                          accept="image/*,.pdf"
                          multiple
                          onChange={(e) => handleFileUpload('references', e.target.files, true)}
                          hidden
                        />
                      </div>
                      {uploadedFiles.references.length > 0 && (
                        <div className="file-preview">
                          {uploadedFiles.references.map((file, index) => (
                            <div key={index} className="file-preview-item">
                              <span className="file-name">{file.name}</span>
                              <button
                                type="button"
                                className="remove-file"
                                onClick={() => handleFileRemove('references', index)}
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Credit Score Toggle */}
                <div className="toggle-reveal-section">
                  <div className="toggle-reveal-row">
                    <span className="toggle-reveal-text">
                      Can you provide an image or screenshot of your current credit score?
                    </span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={formData.showCreditScore}
                        onChange={() => handleToggleChange('showCreditScore')}
                      />
                      <span className="slider" />
                    </label>
                  </div>

                  {formData.showCreditScore && (
                    renderFileUploadBox(
                      'creditScore',
                      'creditScoreFile',
                      'Upload a screenshot of your credit score',
                      'creditScoreUrl'
                    )
                  )}
                </div>
              </section>

              {/* Signature Section */}
              <section className="form-section">
                <h2 className="section-title">Signature</h2>

                <div className="form-group full-width">
                  <label htmlFor="signature" className="form-label">
                    Type your full legal name as signature <span className="required">*</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      id="signature"
                      className={`form-input signature-input ${getInputClassName('signature')}`}
                      placeholder="Type your full legal name"
                      value={formData.signature}
                      onChange={(e) => handleInputChange('signature', e.target.value)}
                      onBlur={() => handleInputBlur('signature')}
                      required
                    />
                    <span className="validation-icon" />
                  </div>
                  <p className="helper-text">
                    By signing, you certify that all information provided is accurate and truthful.
                  </p>
                </div>
              </section>

              {/* Submit Error */}
              {submitError && (
                <div className="submit-error">
                  {submitError}
                </div>
              )}

              {/* Submit Button */}
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Complete Application'}
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar Status */}
          <aside className="sidebar-status">
            <div className="sidebar-section">
              <h3 className="sidebar-title">Application Status</h3>
              <div className="sidebar-progress">
                <span className="progress-label">Progress:</span>
                <div className="progress-bar-wrapper">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }}>
                    <span className="progress-percent">{progress}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="sidebar-section">
              <h3 className="sidebar-title">Verification Summary</h3>
              <ul className="verification-list">
                <li className={`verification-item ${verificationStatus.linkedin ? 'completed' : ''}`}>
                  <span className="status-icon">
                    {verificationStatus.linkedin ? '✓' : '○'}
                  </span>
                  <span className="service-name">LinkedIn</span>
                  <span className="verification-status">
                    {verificationStatus.linkedin ? 'connected' : 'not connected'}
                  </span>
                </li>
                <li className={`verification-item ${verificationStatus.facebook ? 'completed' : ''}`}>
                  <span className="status-icon">
                    {verificationStatus.facebook ? '✓' : '○'}
                  </span>
                  <span className="service-name">Facebook</span>
                  <span className="verification-status">
                    {verificationStatus.facebook ? 'connected' : 'not connected'}
                  </span>
                </li>
                <li className={`verification-item ${verificationStatus.id ? 'completed' : ''}`}>
                  <span className="status-icon">
                    {verificationStatus.id ? '✓' : '○'}
                  </span>
                  <span className="service-name">ID Check</span>
                  <span className="verification-status">
                    {verificationStatus.id ? 'verified' : 'not verified'}
                  </span>
                </li>
                <li className={`verification-item ${verificationStatus.income ? 'completed' : ''}`}>
                  <span className="status-icon">
                    {verificationStatus.income ? '✓' : '○'}
                  </span>
                  <span className="service-name">Income Check</span>
                  <span className="verification-status">
                    {verificationStatus.income ? 'verified' : 'not verified'}
                  </span>
                </li>
              </ul>
            </div>

            <div className="sidebar-section">
              <h3 className="sidebar-title">Required Documents</h3>
              <ul className="documents-list">
                <li className="document-item">
                  <span className={`doc-icon ${documentStatus.employment ? 'completed' : ''}`}>
                    {documentStatus.employment ? '✓' : '○'}
                  </span>
                  <span>Proof of Employment</span>
                </li>
                <li className="document-item">
                  <span className={`doc-icon ${documentStatus.creditScore ? 'completed' : ''}`}>
                    {documentStatus.creditScore ? '✓' : '○'}
                  </span>
                  <span>Credit Score</span>
                </li>
                <li className="document-item">
                  <span className={`doc-icon ${documentStatus.signature ? 'completed' : ''}`}>
                    {documentStatus.signature ? '✓' : '○'}
                  </span>
                  <span>Signature</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </main>

      {/* Success Modal */}
      {submitSuccess && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-icon success">&#10003;</div>
            <h2>Application Submitted!</h2>
            <p>
              Your Rental Application has been submitted successfully.
              You will receive a confirmation email shortly.
            </p>
            <button className="btn-primary" onClick={closeSuccessModal}>
              View My Proposals
            </button>
          </div>
        </div>
      )}
    </>
  );
}
