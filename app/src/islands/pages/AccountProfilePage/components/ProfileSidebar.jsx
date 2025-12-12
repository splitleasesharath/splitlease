/**
 * ProfileSidebar.jsx
 *
 * Sticky sidebar component for the profile page.
 * Contains cover photo, avatar, profile info, and view-specific sections.
 *
 * Editor View: Profile strength meter, next action suggestions
 * Public View: Stats, verification badges, member since date
 */

import React from 'react';
import CoverPhotoEditor from './shared/CoverPhotoEditor.jsx';
import AvatarWithBadge from './shared/AvatarWithBadge.jsx';
import ProfileStrengthMeter from './shared/ProfileStrengthMeter.jsx';
import NextActionCard from './shared/NextActionCard.jsx';
import { Check, X, Calendar, Mail, Phone, ShieldCheck, Linkedin } from 'lucide-react';

// ============================================================================
// VERIFICATION ICONS MAP
// ============================================================================

const VERIFICATION_ICONS = {
  email: Mail,
  phone: Phone,
  govId: ShieldCheck,
  linkedin: Linkedin
};

const VERIFICATION_LABELS = {
  email: 'Email verified',
  phone: 'Phone verified',
  govId: 'Identity verified',
  linkedin: 'LinkedIn connected'
};

// ============================================================================
// PROFILE SIDEBAR
// ============================================================================

export default function ProfileSidebar({
  isEditorView,
  coverPhotoUrl,
  avatarUrl,
  firstName,
  lastName,
  jobTitle,
  profileStrength,
  verifications,
  nextActions = [],
  onCoverPhotoChange,
  onAvatarChange,
  // Public view specific
  responseTime,
  responseRate,
  memberSince
}) {
  const fullName = `${firstName} ${lastName}`.trim() || 'Your Name';

  // Format member since date
  const formatMemberSince = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return null;
    }
  };

  const memberSinceFormatted = formatMemberSince(memberSince);

  return (
    <aside className="profile-sidebar">
      {/* Cover Photo */}
      <CoverPhotoEditor
        imageUrl={coverPhotoUrl}
        editable={isEditorView}
        onChange={onCoverPhotoChange}
      />

      {/* Avatar */}
      <div className="avatar-container">
        <AvatarWithBadge
          imageUrl={avatarUrl}
          isEditorView={isEditorView}
          isVerified={verifications.govId}
          onChange={onAvatarChange}
        />
      </div>

      {/* Profile Info */}
      <div className="sidebar-profile-info">
        <h1 className="sidebar-profile-name">{fullName}</h1>
        {jobTitle && <p className="sidebar-profile-title">{jobTitle}</p>}
      </div>

      {/* Editor View: Profile Strength Meter */}
      {isEditorView && (
        <ProfileStrengthMeter percentage={profileStrength} />
      )}

      {/* Editor View: Next Actions */}
      {isEditorView && nextActions.length > 0 && (
        <div className="sidebar-next-actions">
          <h3 className="sidebar-next-actions-title">Complete Your Profile</h3>
          <div className="next-action-cards">
            {nextActions.map(action => (
              <NextActionCard
                key={action.id}
                text={action.text}
                points={action.points}
                icon={action.icon}
              />
            ))}
          </div>
        </div>
      )}

      {/* Public View: Stats */}
      {!isEditorView && (
        <div className="sidebar-stats">
          <div className="sidebar-stat-item">
            <div className="sidebar-stat-value">{responseTime || 'N/A'}</div>
            <div className="sidebar-stat-label">Response time</div>
          </div>
          <div className="sidebar-stat-item">
            <div className="sidebar-stat-value">{responseRate ? `${responseRate}%` : 'N/A'}</div>
            <div className="sidebar-stat-label">Response rate</div>
          </div>
        </div>
      )}

      {/* Public View: Verification List */}
      {!isEditorView && (
        <div className="sidebar-verifications">
          {Object.entries(verifications).map(([key, isVerified]) => {
            if (!isVerified) return null; // Only show verified items in public view
            const Icon = VERIFICATION_ICONS[key];
            return (
              <div key={key} className="sidebar-verification-item verified">
                <Check size={16} />
                <span className="sidebar-verification-text">{VERIFICATION_LABELS[key]}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Public View: Member Since */}
      {!isEditorView && memberSinceFormatted && (
        <div className="sidebar-member-since">
          <Calendar size={14} />
          <span className="sidebar-member-since-text">Member since {memberSinceFormatted}</span>
        </div>
      )}
    </aside>
  );
}
