/**
 * ProfileCard.jsx
 *
 * Reusable card wrapper with consistent styling for all profile content cards.
 * Supports optional header action (e.g., edit button for public view).
 */

import React from 'react';

export default function ProfileCard({
  title,
  children,
  className = '',
  headerAction = null
}) {
  return (
    <div className={`profile-card ${className}`}>
      <div className="profile-card-header">
        <h2 className="profile-card-title">{title}</h2>
        {headerAction && (
          <div className="profile-card-header-action">
            {headerAction}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
