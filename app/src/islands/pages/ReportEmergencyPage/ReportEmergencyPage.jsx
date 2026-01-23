/**
 * Report Emergency Page - HOLLOW COMPONENT PATTERN
 * Split Lease - Guest Emergency Submission Form
 *
 * Public-facing form for guests to report emergencies during their stay.
 *
 * Architecture:
 * - NO business logic in this file
 * - ALL state and handlers come from useReportEmergencyPageLogic hook
 * - ONLY renders UI based on pre-calculated state
 */

import React from 'react';
import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import { useReportEmergencyPageLogic } from './useReportEmergencyPageLogic.js';
import './ReportEmergencyPage.css';

export default function ReportEmergencyPage() {
  // ============================================================================
  // LOGIC HOOK - Provides all state and handlers
  // ============================================================================

  const {
    // Form state
    formData,
    errors,
    isSubmitting,
    isSubmitted,
    submissionError,

    // User/proposal state
    isAuthenticated,
    userProposals,
    loadingProposals,

    // Handlers
    handleInputChange,
    handlePhotoChange,
    handleSubmit,
    handleReset,
  } = useReportEmergencyPageLogic();

  // ============================================================================
  // RENDER - Success State
  // ============================================================================

  if (isSubmitted) {
    return (
      <div className="report-emergency-page">
        <Header />
        <main className="report-emergency-main">
          <div className="report-emergency-container">
            <div className="success-state">
              <div className="success-state__icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h1>Emergency Reported</h1>
              <p>
                Your emergency report has been submitted successfully. Our team will
                review it and contact you shortly.
              </p>
              <p className="success-state__note">
                If this is a life-threatening emergency, please also call 911 immediately.
              </p>
              <div className="success-state__actions">
                <button onClick={handleReset} className="btn btn--secondary">
                  Report Another Emergency
                </button>
                <a href="/" className="btn btn--primary">
                  Return Home
                </a>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ============================================================================
  // RENDER - Main Form
  // ============================================================================

  return (
    <div className="report-emergency-page">
      <Header />

      <main className="report-emergency-main">
        <div className="report-emergency-container">
          {/* Page Header */}
          <header className="report-emergency-header">
            <h1>Report an Emergency</h1>
            <p className="report-emergency-subtitle">
              Use this form to report any emergency situation during your stay.
              Our team will respond as quickly as possible.
            </p>
            <div className="emergency-notice">
              <strong>Life-threatening emergency?</strong> Call 911 immediately,
              then submit this form for our records.
            </div>
          </header>

          {/* Submission Error */}
          {submissionError && (
            <div className="alert alert--error" role="alert">
              <span>{submissionError}</span>
            </div>
          )}

          {/* Emergency Form */}
          <form onSubmit={handleSubmit} className="emergency-form">
            {/* Emergency Type */}
            <div className="form-section">
              <h2>Emergency Details</h2>

              <div className="form-group">
                <label htmlFor="emergency_type">Type of Emergency *</label>
                <select
                  id="emergency_type"
                  name="emergency_type"
                  value={formData.emergency_type}
                  onChange={handleInputChange}
                  className={`form-select ${errors.emergency_type ? 'form-select--error' : ''}`}
                  required
                >
                  <option value="">Select emergency type...</option>
                  <option value="Lockout">Lockout - Cannot access property</option>
                  <option value="Plumbing Issue">Plumbing Issue - Leak, clog, no water</option>
                  <option value="Electrical Issue">Electrical Issue - Power outage, sparking</option>
                  <option value="HVAC Issue">HVAC Issue - No heat, no AC</option>
                  <option value="Security Concern">Security Concern - Break-in, suspicious activity</option>
                  <option value="Appliance Malfunction">Appliance Malfunction - Major appliance not working</option>
                  <option value="Water Damage">Water Damage - Flooding, water intrusion</option>
                  <option value="Pest Issue">Pest Issue - Infestation discovered</option>
                  <option value="Noise Complaint">Noise Complaint - Excessive noise from neighbors</option>
                  <option value="Medical Emergency">Medical Emergency - Injury at property</option>
                  <option value="Fire/Smoke">Fire or Smoke - Fire alarm, smoke detected</option>
                  <option value="Other">Other - Describe below</option>
                </select>
                {errors.emergency_type && (
                  <span className="form-error">{errors.emergency_type}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Please describe the emergency in detail. Include what happened, when it started, and any actions you've already taken..."
                  rows={5}
                  className={`form-textarea ${errors.description ? 'form-textarea--error' : ''}`}
                  required
                />
                {errors.description && (
                  <span className="form-error">{errors.description}</span>
                )}
                <span className="form-hint">
                  Minimum 20 characters. The more detail you provide, the faster we can help.
                </span>
              </div>
            </div>

            {/* Booking Information */}
            <div className="form-section">
              <h2>Your Stay</h2>

              {isAuthenticated && userProposals.length > 0 ? (
                <div className="form-group">
                  <label htmlFor="proposal_id">Select Your Booking</label>
                  <select
                    id="proposal_id"
                    name="proposal_id"
                    value={formData.proposal_id}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="">Select booking (optional)...</option>
                    {userProposals.map((proposal) => (
                      <option key={proposal._id} value={proposal._id}>
                        {proposal.listing?.name || 'Property'} - Agreement #{proposal.agreementNumber || 'N/A'}
                      </option>
                    ))}
                  </select>
                  <span className="form-hint">
                    Selecting your booking helps us respond faster.
                  </span>
                </div>
              ) : isAuthenticated && loadingProposals ? (
                <p className="text-muted">Loading your bookings...</p>
              ) : (
                <div className="form-group">
                  <label htmlFor="agreement_number">Agreement Number (if known)</label>
                  <input
                    type="text"
                    id="agreement_number"
                    name="agreement_number"
                    value={formData.agreement_number}
                    onChange={handleInputChange}
                    placeholder="e.g., SL-12345"
                    className="form-input"
                  />
                  <span className="form-hint">
                    Found in your booking confirmation email.
                  </span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="property_address">Property Address</label>
                <input
                  type="text"
                  id="property_address"
                  name="property_address"
                  value={formData.property_address}
                  onChange={handleInputChange}
                  placeholder="Street address of the property"
                  className="form-input"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="form-section">
              <h2>Contact Information</h2>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="reporter_name">Your Name *</label>
                  <input
                    type="text"
                    id="reporter_name"
                    name="reporter_name"
                    value={formData.reporter_name}
                    onChange={handleInputChange}
                    placeholder="Full name"
                    className={`form-input ${errors.reporter_name ? 'form-input--error' : ''}`}
                    required
                  />
                  {errors.reporter_name && (
                    <span className="form-error">{errors.reporter_name}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="reporter_phone">Phone Number *</label>
                  <input
                    type="tel"
                    id="reporter_phone"
                    name="reporter_phone"
                    value={formData.reporter_phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                    className={`form-input ${errors.reporter_phone ? 'form-input--error' : ''}`}
                    required
                  />
                  {errors.reporter_phone && (
                    <span className="form-error">{errors.reporter_phone}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reporter_email">Email Address *</label>
                <input
                  type="email"
                  id="reporter_email"
                  name="reporter_email"
                  value={formData.reporter_email}
                  onChange={handleInputChange}
                  placeholder="your.email@example.com"
                  className={`form-input ${errors.reporter_email ? 'form-input--error' : ''}`}
                  required
                />
                {errors.reporter_email && (
                  <span className="form-error">{errors.reporter_email}</span>
                )}
              </div>
            </div>

            {/* Photo Upload */}
            <div className="form-section">
              <h2>Photos (Optional)</h2>
              <p className="form-section__description">
                Upload photos of the issue to help our team understand the situation.
              </p>

              <div className="photo-upload-grid">
                <div className="photo-upload">
                  <label htmlFor="photo1" className="photo-upload__label">
                    {formData.photo1 ? (
                      <div className="photo-upload__preview">
                        <img
                          src={URL.createObjectURL(formData.photo1)}
                          alt="Preview 1"
                        />
                        <span className="photo-upload__remove">Change</span>
                      </div>
                    ) : (
                      <div className="photo-upload__placeholder">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <span>Add Photo 1</span>
                      </div>
                    )}
                  </label>
                  <input
                    type="file"
                    id="photo1"
                    name="photo1"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="photo-upload__input"
                  />
                </div>

                <div className="photo-upload">
                  <label htmlFor="photo2" className="photo-upload__label">
                    {formData.photo2 ? (
                      <div className="photo-upload__preview">
                        <img
                          src={URL.createObjectURL(formData.photo2)}
                          alt="Preview 2"
                        />
                        <span className="photo-upload__remove">Change</span>
                      </div>
                    ) : (
                      <div className="photo-upload__placeholder">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <span>Add Photo 2</span>
                      </div>
                    )}
                  </label>
                  <input
                    type="file"
                    id="photo2"
                    name="photo2"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="photo-upload__input"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn--primary btn--large"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Emergency Report'}
              </button>
              <p className="form-actions__note">
                By submitting, you confirm the information provided is accurate.
              </p>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
