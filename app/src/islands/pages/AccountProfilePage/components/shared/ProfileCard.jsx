/**
 * ProfileCard.jsx
 *
 * Reusable card wrapper with consistent styling for all profile content cards.
 * Supports optional header action (e.g., edit button for public view).
 * Supports optional subtitle for secondary description.
 */

import React from 'react';

export default function ProfileCard({
  title,
  subtitle,
  children,
  className = '',
  headerAction = null
}) {
  return (
    <div className={`profile-card ${className}`}>
      <div className="profile-card-header">
        <div>
          <h2 className="profile-card-title">{title}</h2>
          {subtitle && (
            <p className="profile-card-subtitle">{subtitle}</p>
          )}
        </div>
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
