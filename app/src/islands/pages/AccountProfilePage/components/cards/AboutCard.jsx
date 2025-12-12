/**
 * AboutCard.jsx
 *
 * Bio/About section with textarea for longer description.
 */

import React from 'react';
import ProfileCard from '../shared/ProfileCard.jsx';

const MAX_BIO_LENGTH = 500;

export default function AboutCard({
  bio,
  onFieldChange,
  readOnly = false
}) {
  const charCount = (bio || '').length;

  if (readOnly) {
    return (
      <ProfileCard title="About">
        {bio ? (
          <p className="public-profile-bio">{bio}</p>
        ) : (
          <p className="public-profile-bio" style={{ color: 'var(--sl-text-tertiary)' }}>
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
