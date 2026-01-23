/**
 * EditApplicationModal - Modal for editing rental application sections
 *
 * Props:
 * - application: The application object being edited
 * - editSection: Which section to edit (personal, address, employment, etc.)
 * - onClose: Handler to close the modal
 * - onSave: Handler to save changes (receives updates object)
 * - isSaving: Whether save operation is in progress
 */

import React, { useState, useCallback, useEffect } from 'react';

// Section titles
const SECTION_TITLES = {
  personal: 'Personal Information',
  address: 'Current Address',
  employment: 'Employment & Income',
  background: 'Background Information',
  occupants: 'Occupants',
  references: 'References',
  emergency: 'Emergency Contact',
  accessibility: 'Accessibility Needs'
};

export default function EditApplicationModal({
  application,
  editSection,
  onClose,
  onSave,
  isSaving
}) {
  // Form state initialized from application data
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  // Initialize form data when modal opens
  useEffect(() => {
    if (!application) return;

    switch (editSection) {
      case 'personal':
        setFormData({
          personal_info: {
            ...application.personal_info,
            firstName: application.personal_info?.firstName || '',
            lastName: application.personal_info?.lastName || '',
            email: application.personal_info?.email || '',
            phone: application.personal_info?.phone || '',
            dateOfBirth: application.personal_info?.dateOfBirth || ''
          }
        });
        break;

      case 'address':
        setFormData({
          current_address: {
            ...application.current_address,
            street: application.current_address?.street || '',
            unit: application.current_address?.unit || '',
            city: application.current_address?.city || '',
            state: application.current_address?.state || '',
            zip: application.current_address?.zip || '',
            landlordName: application.current_address?.landlordName || '',
            landlordPhone: application.current_address?.landlordPhone || '',
            monthlyRent: application.current_address?.monthlyRent || ''
          }
        });
        break;

      case 'employment':
        setFormData({
          monthly_income: application.monthly_income || '',
          additional_income: application.additional_income || ''
        });
        break;

      case 'background':
        setFormData({
          has_eviction: application.has_eviction || false,
          has_felony: application.has_felony || false,
          has_bankruptcy: application.has_bankruptcy || false
        });
        break;

      case 'emergency':
        setFormData({
          emergency_contact: {
            ...application.emergency_contact,
            name: application.emergency_contact?.name || '',
            relationship: application.emergency_contact?.relationship || '',
            phone: application.emergency_contact?.phone || '',
            email: application.emergency_contact?.email || ''
          }
        });
        break;

      case 'accessibility':
        setFormData({
          accessibility: {
            ...application.accessibility,
            hasNeeds: application.accessibility?.hasNeeds || false,
            description: application.accessibility?.description || ''
          }
        });
        break;

      default:
        setFormData({});
    }
  }, [application, editSection]);

  // Handle input changes
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const actualValue = type === 'checkbox' ? checked : value;

    // Handle nested fields (e.g., "personal_info.firstName")
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: actualValue
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: actualValue
      }));
    }

    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }, []);

  // Handle form submission
  const handleSubmit = useCallback((e) => {
    e.preventDefault();

    // Basic validation
    const newErrors = {};

    if (editSection === 'personal') {
      if (!formData.personal_info?.firstName?.trim()) {
        newErrors['personal_info.firstName'] = 'First name is required';
      }
      if (!formData.personal_info?.lastName?.trim()) {
        newErrors['personal_info.lastName'] = 'Last name is required';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(formData);
  }, [editSection, formData, onSave]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, isSaving]);

  // Render form fields based on section
  const renderFields = () => {
    switch (editSection) {
      case 'personal':
        return (
          <>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="firstName">First Name *</label>
                <input
                  type="text"
                  id="firstName"
                  name="personal_info.firstName"
                  value={formData.personal_info?.firstName || ''}
                  onChange={handleChange}
                  className={errors['personal_info.firstName'] ? 'error' : ''}
                />
                {errors['personal_info.firstName'] && (
                  <span className="field-error">{errors['personal_info.firstName']}</span>
                )}
              </div>
              <div className="form-field">
                <label htmlFor="lastName">Last Name *</label>
                <input
                  type="text"
                  id="lastName"
                  name="personal_info.lastName"
                  value={formData.personal_info?.lastName || ''}
                  onChange={handleChange}
                  className={errors['personal_info.lastName'] ? 'error' : ''}
                />
                {errors['personal_info.lastName'] && (
                  <span className="field-error">{errors['personal_info.lastName']}</span>
                )}
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="personal_info.email"
                  value={formData.personal_info?.email || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="personal_info.phone"
                  value={formData.personal_info?.phone || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="dateOfBirth">Date of Birth</label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="personal_info.dateOfBirth"
                  value={formData.personal_info?.dateOfBirth || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
          </>
        );

      case 'address':
        return (
          <>
            <div className="form-row">
              <div className="form-field form-field--full">
                <label htmlFor="street">Street Address</label>
                <input
                  type="text"
                  id="street"
                  name="current_address.street"
                  value={formData.current_address?.street || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="unit">Unit/Apt</label>
                <input
                  type="text"
                  id="unit"
                  name="current_address.unit"
                  value={formData.current_address?.unit || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor="city">City</label>
                <input
                  type="text"
                  id="city"
                  name="current_address.city"
                  value={formData.current_address?.city || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="state">State</label>
                <input
                  type="text"
                  id="state"
                  name="current_address.state"
                  value={formData.current_address?.state || ''}
                  onChange={handleChange}
                  maxLength="2"
                />
              </div>
              <div className="form-field">
                <label htmlFor="zip">ZIP Code</label>
                <input
                  type="text"
                  id="zip"
                  name="current_address.zip"
                  value={formData.current_address?.zip || ''}
                  onChange={handleChange}
                  maxLength="10"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="landlordName">Landlord Name</label>
                <input
                  type="text"
                  id="landlordName"
                  name="current_address.landlordName"
                  value={formData.current_address?.landlordName || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor="landlordPhone">Landlord Phone</label>
                <input
                  type="tel"
                  id="landlordPhone"
                  name="current_address.landlordPhone"
                  value={formData.current_address?.landlordPhone || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="monthlyRent">Monthly Rent</label>
                <input
                  type="number"
                  id="monthlyRent"
                  name="current_address.monthlyRent"
                  value={formData.current_address?.monthlyRent || ''}
                  onChange={handleChange}
                  min="0"
                  step="1"
                />
              </div>
            </div>
          </>
        );

      case 'employment':
        return (
          <>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="monthly_income">Monthly Income</label>
                <input
                  type="number"
                  id="monthly_income"
                  name="monthly_income"
                  value={formData.monthly_income || ''}
                  onChange={handleChange}
                  min="0"
                  step="100"
                />
              </div>
              <div className="form-field">
                <label htmlFor="additional_income">Additional Income</label>
                <input
                  type="number"
                  id="additional_income"
                  name="additional_income"
                  value={formData.additional_income || ''}
                  onChange={handleChange}
                  min="0"
                  step="100"
                />
              </div>
            </div>
          </>
        );

      case 'background':
        return (
          <>
            <div className="form-row form-row--checkboxes">
              <div className="form-field form-field--checkbox">
                <label>
                  <input
                    type="checkbox"
                    name="has_eviction"
                    checked={formData.has_eviction || false}
                    onChange={handleChange}
                  />
                  Has prior eviction
                </label>
              </div>
              <div className="form-field form-field--checkbox">
                <label>
                  <input
                    type="checkbox"
                    name="has_felony"
                    checked={formData.has_felony || false}
                    onChange={handleChange}
                  />
                  Has prior felony
                </label>
              </div>
              <div className="form-field form-field--checkbox">
                <label>
                  <input
                    type="checkbox"
                    name="has_bankruptcy"
                    checked={formData.has_bankruptcy || false}
                    onChange={handleChange}
                  />
                  Has prior bankruptcy
                </label>
              </div>
            </div>
          </>
        );

      case 'emergency':
        return (
          <>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="emergencyName">Name</label>
                <input
                  type="text"
                  id="emergencyName"
                  name="emergency_contact.name"
                  value={formData.emergency_contact?.name || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor="emergencyRelationship">Relationship</label>
                <input
                  type="text"
                  id="emergencyRelationship"
                  name="emergency_contact.relationship"
                  value={formData.emergency_contact?.relationship || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="emergencyPhone">Phone</label>
                <input
                  type="tel"
                  id="emergencyPhone"
                  name="emergency_contact.phone"
                  value={formData.emergency_contact?.phone || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor="emergencyEmail">Email</label>
                <input
                  type="email"
                  id="emergencyEmail"
                  name="emergency_contact.email"
                  value={formData.emergency_contact?.email || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
          </>
        );

      case 'accessibility':
        return (
          <>
            <div className="form-row">
              <div className="form-field form-field--checkbox">
                <label>
                  <input
                    type="checkbox"
                    name="accessibility.hasNeeds"
                    checked={formData.accessibility?.hasNeeds || false}
                    onChange={handleChange}
                  />
                  Has accessibility needs
                </label>
              </div>
            </div>
            <div className="form-row">
              <div className="form-field form-field--full">
                <label htmlFor="accessibilityDescription">Description</label>
                <textarea
                  id="accessibilityDescription"
                  name="accessibility.description"
                  value={formData.accessibility?.description || ''}
                  onChange={handleChange}
                  rows={4}
                />
              </div>
            </div>
          </>
        );

      default:
        return <p>Unknown section: {editSection}</p>;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Edit {SECTION_TITLES[editSection] || 'Application'}</h2>
          <button
            className="modal__close-btn"
            onClick={onClose}
            disabled={isSaving}
            type="button"
            aria-label="Close modal"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            {renderFields()}
          </div>

          <div className="modal__footer">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
