/**
 * ApplicationDetailView - Detailed view of a single rental application
 *
 * Props:
 * - application: The application object with all details
 * - isLoading: Loading state
 * - onBack: Handler to return to list view
 * - onEdit: Handler to open edit modal (receives section name)
 * - onUpdateStatus: Handler to update application status
 * - statusOptions: Available status options
 */

import React, { useCallback } from 'react';

// Format currency
function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Format date
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Format datetime
function formatDateTime(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

// Format phone number
function formatPhone(phone) {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

// Get status badge class
function getStatusClass(status) {
  const statusMap = {
    'draft': 'status-badge--draft',
    'in-progress': 'status-badge--in-progress',
    'submitted': 'status-badge--submitted',
    'under-review': 'status-badge--under-review',
    'approved': 'status-badge--approved',
    'conditionally-approved': 'status-badge--conditionally-approved',
    'denied': 'status-badge--denied',
    'withdrawn': 'status-badge--withdrawn',
    'expired': 'status-badge--expired'
  };
  return statusMap[status] || 'status-badge--default';
}

// Format address object to string
function formatAddress(address) {
  if (!address) return '-';
  const parts = [
    address.street,
    address.unit && `Unit ${address.unit}`,
    address.city,
    address.state,
    address.zip
  ].filter(Boolean);
  return parts.join(', ') || '-';
}

// Section header with edit button
function SectionHeader({ title, onEdit, section }) {
  return (
    <div className="detail-section__header">
      <h3>{title}</h3>
      {onEdit && (
        <button
          className="detail-section__edit-btn"
          onClick={() => onEdit(section)}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit
        </button>
      )}
    </div>
  );
}

// Detail field component
function DetailField({ label, value, fullWidth = false }) {
  return (
    <div className={`detail-field ${fullWidth ? 'detail-field--full' : ''}`}>
      <span className="detail-field__label">{label}</span>
      <span className="detail-field__value">{value || '-'}</span>
    </div>
  );
}

// Boolean field with check/x icon
function BooleanField({ label, value }) {
  return (
    <div className="detail-field detail-field--boolean">
      <span className="detail-field__label">{label}</span>
      <span className={`detail-field__value ${value ? 'value--yes' : 'value--no'}`}>
        {value ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        )}
        {value ? 'Yes' : 'No'}
      </span>
    </div>
  );
}

export default function ApplicationDetailView({
  application,
  isLoading,
  onBack,
  onEdit,
  onUpdateStatus,
  statusOptions
}) {
  const handleStatusChange = useCallback((e) => {
    onUpdateStatus(e.target.value);
  }, [onUpdateStatus]);

  // Loading state
  if (isLoading) {
    return (
      <div className="application-detail application-detail--loading">
        <div className="spinner" />
        <p>Loading application details...</p>
      </div>
    );
  }

  // No application
  if (!application) {
    return (
      <div className="application-detail application-detail--empty">
        <p>No application selected.</p>
        <button className="btn btn--primary" onClick={onBack}>
          Back to List
        </button>
      </div>
    );
  }

  const personalInfo = application.personal_info || {};
  const currentAddress = application.current_address || {};
  const emergencyContact = application.emergency_contact || {};
  const accessibility = application.accessibility || {};

  return (
    <div className="application-detail">
      {/* Header */}
      <div className="application-detail__header">
        <button className="back-btn" onClick={onBack} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to List
        </button>

        <div className="application-detail__title">
          <h2>
            {personalInfo.firstName} {personalInfo.lastName || application.guest?.full_name || 'Application'}
          </h2>
          <span className="application-id">{application.unique_id || application.id}</span>
        </div>

        {/* Status Control */}
        <div className="application-detail__status-control">
          <label htmlFor="status-select">Status:</label>
          <select
            id="status-select"
            value={application.status}
            onChange={handleStatusChange}
            className={`status-select ${getStatusClass(application.status)}`}
          >
            {statusOptions.filter(opt => opt.value).map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="application-detail__progress">
        <div className="progress-info">
          <span>Completion Progress</span>
          <span>{application.completion_percentage || 0}%</span>
        </div>
        <div className="progress-bar progress-bar--large">
          <div
            className="progress-bar__fill"
            style={{ width: `${application.completion_percentage || 0}%` }}
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="application-detail__content">
        {/* Personal Information */}
        <section className="detail-section">
          <SectionHeader title="Personal Information" onEdit={onEdit} section="personal" />
          <div className="detail-grid">
            <DetailField label="First Name" value={personalInfo.firstName} />
            <DetailField label="Last Name" value={personalInfo.lastName} />
            <DetailField label="Email" value={personalInfo.email || application.guest?.email} />
            <DetailField label="Phone" value={formatPhone(personalInfo.phone)} />
            <DetailField label="Date of Birth" value={formatDate(personalInfo.dateOfBirth)} />
            <DetailField label="SSN (Last 4)" value={personalInfo.ssnLast4 ? `***-**-${personalInfo.ssnLast4}` : '-'} />
          </div>
        </section>

        {/* Current Address */}
        <section className="detail-section">
          <SectionHeader title="Current Address" onEdit={onEdit} section="address" />
          <div className="detail-grid">
            <DetailField label="Street Address" value={currentAddress.street} fullWidth />
            <DetailField label="Unit/Apt" value={currentAddress.unit} />
            <DetailField label="City" value={currentAddress.city} />
            <DetailField label="State" value={currentAddress.state} />
            <DetailField label="ZIP Code" value={currentAddress.zip} />
            <DetailField label="Move-in Date" value={formatDate(currentAddress.moveInDate)} />
            <DetailField label="Monthly Rent" value={formatCurrency(currentAddress.monthlyRent)} />
            <DetailField label="Landlord Name" value={currentAddress.landlordName} />
            <DetailField label="Landlord Phone" value={formatPhone(currentAddress.landlordPhone)} />
          </div>
        </section>

        {/* Employment & Income */}
        <section className="detail-section">
          <SectionHeader title="Employment & Income" onEdit={onEdit} section="employment" />
          <div className="detail-grid">
            <DetailField label="Monthly Income" value={formatCurrency(application.monthly_income)} />
            <DetailField label="Additional Income" value={formatCurrency(application.additional_income)} />
            <DetailField label="Total Monthly Income" value={formatCurrency(application.total_monthly_income)} />
          </div>

          {/* Employment History */}
          {application.employment && application.employment.length > 0 && (
            <div className="detail-subsection">
              <h4>Employment History</h4>
              {application.employment.map((job, index) => (
                <div key={job.id || index} className="employment-item">
                  <div className="detail-grid">
                    <DetailField label="Employer" value={job.employer_name} />
                    <DetailField label="Position" value={job.position} />
                    <DetailField label="Start Date" value={formatDate(job.start_date)} />
                    <DetailField label="End Date" value={job.is_current ? 'Current' : formatDate(job.end_date)} />
                    <DetailField label="Monthly Income" value={formatCurrency(job.monthly_income)} />
                    <DetailField label="Supervisor" value={job.supervisor_name} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Background Check Info */}
        <section className="detail-section">
          <SectionHeader title="Background Information" onEdit={onEdit} section="background" />
          <div className="detail-grid detail-grid--booleans">
            <BooleanField label="Prior Eviction" value={application.has_eviction} />
            <BooleanField label="Prior Felony" value={application.has_felony} />
            <BooleanField label="Prior Bankruptcy" value={application.has_bankruptcy} />
          </div>
        </section>

        {/* Occupants */}
        <section className="detail-section">
          <SectionHeader title="Occupants" onEdit={onEdit} section="occupants" />
          {application.occupants && application.occupants.length > 0 ? (
            <div className="occupants-list">
              {application.occupants.map((occupant, index) => (
                <div key={occupant.id || index} className="occupant-item">
                  <span className="occupant-name">
                    {occupant.first_name} {occupant.last_name}
                    {occupant.is_applicant && <span className="badge badge--primary">Applicant</span>}
                  </span>
                  <span className="occupant-details">
                    {occupant.relationship && <span>{occupant.relationship}</span>}
                    {occupant.date_of_birth && <span>{formatDate(occupant.date_of_birth)}</span>}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No occupants listed</p>
          )}
        </section>

        {/* References */}
        <section className="detail-section">
          <SectionHeader title="References" onEdit={onEdit} section="references" />
          {application.references && application.references.length > 0 ? (
            <div className="references-list">
              {application.references.map((ref, index) => (
                <div key={ref.id || index} className="reference-item">
                  <div className="detail-grid">
                    <DetailField label="Name" value={ref.name} />
                    <DetailField label="Relationship" value={ref.relationship} />
                    <DetailField label="Phone" value={formatPhone(ref.phone)} />
                    <DetailField label="Email" value={ref.email} />
                    <DetailField label="Years Known" value={ref.years_known} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No references listed</p>
          )}
        </section>

        {/* Emergency Contact */}
        <section className="detail-section">
          <SectionHeader title="Emergency Contact" onEdit={onEdit} section="emergency" />
          <div className="detail-grid">
            <DetailField label="Name" value={emergencyContact.name} />
            <DetailField label="Relationship" value={emergencyContact.relationship} />
            <DetailField label="Phone" value={formatPhone(emergencyContact.phone)} />
            <DetailField label="Email" value={emergencyContact.email} />
          </div>
        </section>

        {/* Consents & Signatures */}
        <section className="detail-section">
          <SectionHeader title="Consents & Signatures" />
          <div className="detail-grid detail-grid--booleans">
            <BooleanField label="Background Check Consent" value={application.background_check_consent} />
            <BooleanField label="Credit Check Consent" value={application.credit_check_consent} />
            <BooleanField label="Terms Accepted" value={application.terms_accepted} />
          </div>
          <div className="detail-grid">
            <DetailField label="Signature Date" value={formatDateTime(application.signature_date)} />
          </div>
        </section>

        {/* Accessibility Needs */}
        {accessibility && Object.keys(accessibility).length > 0 && (
          <section className="detail-section">
            <SectionHeader title="Accessibility Needs" onEdit={onEdit} section="accessibility" />
            <div className="detail-grid">
              <BooleanField label="Has Accessibility Needs" value={accessibility.hasNeeds} />
              <DetailField label="Description" value={accessibility.description} fullWidth />
            </div>
          </section>
        )}

        {/* Metadata */}
        <section className="detail-section detail-section--metadata">
          <h4>Application Metadata</h4>
          <div className="detail-grid">
            <DetailField label="Created" value={formatDateTime(application.created_at)} />
            <DetailField label="Last Updated" value={formatDateTime(application.updated_at)} />
            <DetailField label="Submitted" value={formatDateTime(application.submitted_at)} />
            <DetailField label="Application ID" value={application.id} />
            <DetailField label="Guest ID" value={application.guest_id} />
            <DetailField label="Listing ID" value={application.listing_id || 'Not linked'} />
          </div>
        </section>
      </div>
    </div>
  );
}
