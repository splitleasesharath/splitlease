/**
 * NextActionCard.jsx
 *
 * Clickable suggestion card for profile completion actions.
 * Shows action text, icon, and points reward badge.
 */

import React from 'react';
import { Camera, Edit, Phone, ShieldCheck, Linkedin, AlertCircle } from 'lucide-react';

// Icon mapping
const ICON_MAP = {
  camera: Camera,
  edit: Edit,
  phone: Phone,
  shield: ShieldCheck,
  linkedin: Linkedin,
  alert: AlertCircle
};

export default function NextActionCard({
  text,
  points,
  icon,
  onClick
}) {
  const IconComponent = ICON_MAP[icon] || AlertCircle;

  return (
    <div
      className="next-action-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <IconComponent className="next-action-icon" size={20} />
      <span className="next-action-text">{text}</span>
      {points && (
        <span className="next-action-badge">+{points} pts</span>
      )}
    </div>
  );
}
