/**
 * WhySplitLeaseCard.jsx
 *
 * Public view card showing "Why I Want a Split Lease" content.
 * Read-only presentation with bio-text styling.
 */

import React from 'react';
import ProfileCard from '../shared/ProfileCard.jsx';

export default function WhySplitLeaseCard({ content }) {
  if (!content) return null;

  return (
    <ProfileCard title="Why I Want a Split Lease">
      <p className="public-bio-text">{content}</p>
    </ProfileCard>
  );
}
