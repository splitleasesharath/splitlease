/**
 * BasicInfoCard.jsx
 *
 * Basic information form card: First name, Last name, Date of birth, Job title.
 * Editor view only (public view shows name in sidebar).
 */

import React from 'react';
import ProfileCard from '../shared/ProfileCard.jsx';

export default function BasicInfoCard({
  firstName,
  lastName,
  jobTitle,
  dateOfBirth = '',
  errors = {},
  onFieldChange
}) {
  return (
    <ProfileCard title="Basic Information">
      <div className="profile-form-row">
        <div className="profile-form-group">
          <label className="profile-form-label" htmlFor="firstName">
            First Name *
          </label>
          <input
            id="firstName"
            type="text"
            className="profile-form-input"
            value={firstName}
            onChange={(e) => onFieldChange('firstName', e.target.value)}
            placeholder="Your first name"
          />
          {errors.firstName && (
            <span className="profile-form-error">{errors.firstName}</span>
          )}
        </div>

        <div className="profile-form-group">
          <label className="profile-form-label" htmlFor="lastName">
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            className="profile-form-input"
            value={lastName}
            onChange={(e) => onFieldChange('lastName', e.target.value)}
            placeholder="Your last name"
          />
        </div>
      </div>

      <div className="profile-form-row">
        <div className="profile-form-group">
          <label className="profile-form-label" htmlFor="dateOfBirth">
            Date of Birth
          </label>
          <input
            id="dateOfBirth"
            type="date"
            className="profile-form-input"
            value={dateOfBirth}
            onChange={(e) => onFieldChange('dateOfBirth', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="profile-form-group">
          <label className="profile-form-label" htmlFor="jobTitle">
            Job Title
          </label>
          <input
            id="jobTitle"
            type="text"
            className="profile-form-input"
            value={jobTitle}
            onChange={(e) => onFieldChange('jobTitle', e.target.value)}
            placeholder="e.g., Software Engineer, Marketing Manager"
          />
        </div>
      </div>
    </ProfileCard>
  );
}
