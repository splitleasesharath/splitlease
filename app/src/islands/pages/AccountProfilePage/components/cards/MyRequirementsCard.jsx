/**
 * MyRequirementsCard.jsx
 *
 * Public view card showing "My Requirements" content.
 * Read-only presentation with bio-text styling.
 */

import React from 'react';
import ProfileCard from '../shared/ProfileCard.jsx';

export default function MyRequirementsCard({ content }) {
  if (!content) return null;

  return (
    <ProfileCard title="My Requirements">
      <p className="public-bio-text">{content}</p>
    </ProfileCard>
  );
}
