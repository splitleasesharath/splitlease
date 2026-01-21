/**
 * Create Customer Form Component
 *
 * Form for creating new guest accounts on behalf of users.
 * Converted from TypeScript to JavaScript following Split Lease patterns.
 */

import { UserPlus, Calendar, Mail, Phone, User as UserIcon, Users } from 'lucide-react';

export default function CreateCustomerForm({
  formData,
  errors,
  userTypes,
  isLoading,
  onFieldChange,
  onSubmit
}) {
  function handleSubmit(e) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <div className="grd-section">
      <h2 className="grd-section-title">
        <UserPlus size={20} />
        Create Customer
      </h2>

      <form onSubmit={handleSubmit} className="grd-form">
        <div className="grd-form-grid">
          {/* First Name */}
          <div className="grd-form-field">
            <label className="grd-form-label">
              <UserIcon size={16} />
              First Name
            </label>
            <input
              type="text"
              className={`grd-form-input ${errors.firstName ? 'grd-form-input-error' : ''}`}
              placeholder="Choose a first name"
              value={formData.firstName}
              onChange={(e) => onFieldChange('firstName', e.target.value)}
            />
            {errors.firstName && <span className="grd-error-text">{errors.firstName}</span>}
          </div>

          {/* Last Name */}
          <div className="grd-form-field">
            <label className="grd-form-label">
              <UserIcon size={16} />
              Last Name
            </label>
            <input
              type="text"
              className={`grd-form-input ${errors.lastName ? 'grd-form-input-error' : ''}`}
              placeholder="Choose a last name"
              value={formData.lastName}
              onChange={(e) => onFieldChange('lastName', e.target.value)}
            />
            {errors.lastName && <span className="grd-error-text">{errors.lastName}</span>}
          </div>

          {/* Birth Date */}
          <div className="grd-form-field">
            <label className="grd-form-label">
              <Calendar size={16} />
              Birth Date *
            </label>
            <input
              type="date"
              className={`grd-form-input ${errors.birthDate ? 'grd-form-input-error' : ''}`}
              value={formData.birthDate}
              onChange={(e) => onFieldChange('birthDate', e.target.value)}
            />
            {errors.birthDate && <span className="grd-error-text">{errors.birthDate}</span>}
          </div>

          {/* Email */}
          <div className="grd-form-field">
            <label className="grd-form-label">
              <Mail size={16} />
              Email
            </label>
            <input
              type="email"
              className={`grd-form-input ${errors.email ? 'grd-form-input-error' : ''}`}
              placeholder="Choose an email"
              value={formData.email}
              onChange={(e) => onFieldChange('email', e.target.value)}
            />
            {errors.email && <span className="grd-error-text">{errors.email}</span>}
          </div>

          {/* Phone Number */}
          <div className="grd-form-field">
            <label className="grd-form-label">
              <Phone size={16} />
              Phone Number
            </label>
            <input
              type="tel"
              className={`grd-form-input ${errors.phoneNumber ? 'grd-form-input-error' : ''}`}
              placeholder="Choose a phone number"
              value={formData.phoneNumber}
              onChange={(e) => onFieldChange('phoneNumber', e.target.value)}
            />
            {errors.phoneNumber && <span className="grd-error-text">{errors.phoneNumber}</span>}
          </div>

          {/* User Type */}
          <div className="grd-form-field">
            <label className="grd-form-label">
              <Users size={16} />
              User Type
            </label>
            <select
              className="grd-form-input grd-form-select"
              value={formData.userType}
              onChange={(e) => onFieldChange('userType', e.target.value)}
            >
              <option value="" disabled>Choose a user type</option>
              {userTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="grd-btn grd-btn-primary grd-submit-btn"
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Customer'}
        </button>
      </form>
    </div>
  );
}
