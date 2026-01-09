/**
 * RentalApplicationCard.jsx
 *
 * Card displayed on the Account Profile page (guests only) that shows
 * rental application status and provides access to the wizard modal.
 *
 * Three states:
 * - not_started: No draft exists, show "Start" CTA
 * - in_progress: Draft exists, show progress bar and "Continue" CTA
 * - submitted: Application submitted, show success state
 */

import React from 'react';
import ProfileCard from './shared/ProfileCard.jsx';
import { FileText, Clock, CheckCircle, ChevronRight, Edit3 } from 'lucide-react';
import './RentalApplicationCard.css';

export default function RentalApplicationCard({
  applicationStatus = 'not_started', // 'not_started' | 'in_progress' | 'submitted'
  progress = 0,                       // 0-100 percentage
  onOpenWizard,                       // Handler to open wizard modal
}) {
  // Submitted state - success card with review/edit option
  if (applicationStatus === 'submitted') {
    return (
      <ProfileCard title="Rental Application" className="rental-app-card rental-app-card--success">
        <div className="rental-app-card__success">
          <div className="rental-app-card__success-icon">
            <CheckCircle size={32} />
          </div>
          <div className="rental-app-card__success-content">
            <h3 className="rental-app-card__success-title">Application Submitted</h3>
            <p className="rental-app-card__success-text">
              Your rental application is on file. Hosts can now review your information when considering your proposals.
            </p>
          </div>
          <button
            className="rental-app-card__cta rental-app-card__cta--secondary"
            onClick={onOpenWizard}
            type="button"
          >
            <Edit3 size={16} />
            Review & Edit
          </button>
        </div>
      </ProfileCard>
    );
  }

  // In progress state - show progress bar
  if (applicationStatus === 'in_progress') {
    return (
      <ProfileCard title="Rental Application" className="rental-app-card">
        <div className="rental-app-card__content">
          <div className="rental-app-card__icon">
            <FileText size={24} />
          </div>
          <div className="rental-app-card__info">
            <h3 className="rental-app-card__heading">Continue Your Application</h3>
            <p className="rental-app-card__description">
              You're {progress}% done. Pick up where you left off.
            </p>
            <div className="rental-app-card__progress">
              <div className="rental-app-card__progress-bar">
                <div
                  className="rental-app-card__progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="rental-app-card__progress-text">{progress}%</span>
            </div>
          </div>
          <button
            className="rental-app-card__cta"
            onClick={onOpenWizard}
            type="button"
          >
            Continue
            <ChevronRight size={18} />
          </button>
        </div>
      </ProfileCard>
    );
  }

  // Not started state - default
  return (
    <ProfileCard title="Rental Application" className="rental-app-card">
      <div className="rental-app-card__content">
        <div className="rental-app-card__icon">
          <FileText size={24} />
        </div>
        <div className="rental-app-card__info">
          <h3 className="rental-app-card__heading">Complete Your Rental Application</h3>
          <p className="rental-app-card__description">
            Hosts review this before accepting your booking proposals. It helps build trust and speeds up approvals.
          </p>
          <div className="rental-app-card__time">
            <Clock size={14} />
            <span>Takes about 5 minutes</span>
          </div>
        </div>
        <button
          className="rental-app-card__cta"
          onClick={onOpenWizard}
          type="button"
        >
          Start
          <ChevronRight size={18} />
        </button>
      </div>
    </ProfileCard>
  );
}
