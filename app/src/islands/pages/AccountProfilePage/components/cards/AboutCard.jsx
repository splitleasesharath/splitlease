/**
 * AboutCard.jsx
 *
 * Bio/About section with textarea for longer description.
 * Public view shows "About {firstName}" with bio-text styling.
 */

import React from 'react';
import ProfileCard from '../shared/ProfileCard.jsx';

const MAX_BIO_LENGTH = 500;

export default function AboutCard({
  bio,
  onFieldChange,
  readOnly = false,
  firstName = ''
}) {
  const charCount = (bio || '').length;

  if (readOnly) {
    // Use dynamic title "About {firstName}" if provided, else "About"
    const title = firstName ? `About ${firstName}` : 'About';

    return (
      <ProfileCard title={title}>
        {bio ? (
          <p className="public-bio-text">{bio}</p>
        ) : (
          <p className="public-bio-text" style={{ color: 'var(--sl-text-tertiary)' }}>
            No bio provided
          </p>
        )}
      </ProfileCard>
    );
  }

  return (
    <ProfileCard title="About You">
      <div className="profile-form-group">
        <label className="profile-form-label" htmlFor="bio">
          Tell us about yourself
        </label>
        <div className="profile-form-input-wrapper">
          <textarea
            id="bio"
            className="profile-form-textarea"
            value={bio}
            onChange={(e) => {
              if (e.target.value.length <= MAX_BIO_LENGTH) {
                onFieldChange('bio', e.target.value);
              }
            }}
            placeholder="Share a bit about yourself, your lifestyle, and what kind of roommate you'd be..."
            rows={5}
          />
          <span className="profile-form-char-count">
            {charCount}/{MAX_BIO_LENGTH}
          </span>
        </div>
      </div>
    </ProfileCard>
  );
}
