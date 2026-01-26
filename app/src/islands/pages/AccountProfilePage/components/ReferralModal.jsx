/**
 * ReferralModal.jsx
 *
 * Modal for the referral program allowing users to share their referral link
 * and view their referral stats.
 *
 * Updated to follow POPUP_REPLICATION_PROTOCOL.md design system.
 * Features:
 * - Monochromatic purple color scheme (no green/yellow)
 * - Mobile bottom sheet behavior (< 480px)
 * - Pill-shaped buttons (100px radius)
 * - Feather icons (stroke-only)
 */

import React, { useState, useEffect } from 'react';
import { useToast } from '../../../shared/Toast';
import './ReferralModal.css';

// Send icon (Telegram-style)
function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  );
}

// Mail icon
function MailIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
      <polyline points="22,6 12,13 2,6"></polyline>
    </svg>
  );
}

// Close icon
function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

// WhatsApp icon
function WhatsAppIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

// Twitter/X icon
function TwitterIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

// Facebook icon
function FacebookIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

// SMS/Message icon
function SmsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  );
}

// Referral Gift Card Component - works for both host and guest
function ReferralCard({ referrerName, isHost }) {
  // Dynamic text based on user type
  const cardMessage = isHost
    ? "This bonus is yours when you close your first lease. List your space and start earning."
    : "This bonus is yours when you complete your first booking. Find your perfect space today.";

  const footerText = isHost
    ? "Unlocked after first closed lease"
    : "Unlocked after first booking";

  const badgeText = isHost ? "Host Bonus" : "Guest Bonus";

  return (
    <div className="host-referral-card">
      <div className="host-referral-card__corner-accent"></div>

      <div className="host-referral-card__header">
        <div className="host-referral-card__brand">SPLIT LEASE</div>
        <div className="host-referral-card__amount">$50</div>
      </div>

      <div className="host-referral-card__content">
        <div className="host-referral-card__sent-by">Referred by</div>
        <div className="host-referral-card__name">{referrerName}</div>
        <div className="host-referral-card__message">
          {cardMessage}
        </div>
      </div>

      <div className="host-referral-card__footer">
        <div className="host-referral-card__valid">{footerText}</div>
        <div className="host-referral-card__badge">
          <span className="host-referral-card__badge-text">{badgeText}</span>
        </div>
      </div>
    </div>
  );
}

export default function ReferralModal({ isOpen, onClose, referralCode = 'yourname', stats = {}, userType = 'guest', referrerName = '' }) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const referralLink = `https://splitlease.com/ref/${referralCode}`;
  const isHost = userType === 'host';

  // Different subtitle text for hosts vs guests
  const subtitleText = isHost
    ? "Give a friend $50 toward their first Split Lease listing. When they close their first lease, you'll get $50 too."
    : "Give a friend $50 toward their first Split Lease booking. When they complete their first booking, you'll get $50 too.";

  const {
    friendsReferred = 0,
    rewardsClaimed = 0,
    totalRewards = 0
  } = stats;

  const handleCopy = async () => {
    try {
      // Try modern Clipboard API first (requires secure context)
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(referralLink);
      } else {
        // Fallback for non-secure contexts (HTTP localhost)
        const textArea = document.createElement('textarea');
        textArea.value = referralLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      showToast({
        title: 'Link copied!',
        content: referralLink,
        type: 'success'
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      showToast({
        title: 'Failed to copy',
        content: 'Please copy the link manually',
        type: 'error'
      });
    }
  };

  const handleTelegram = () => {
    const text = encodeURIComponent(`Get $50 off your first Split Lease booking! Use my referral link: ${referralLink}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${text}`, '_blank');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('Get $50 off your first Split Lease booking!');
    const body = encodeURIComponent(`Hey!\n\nI've been using Split Lease and thought you might like it too. Use my referral link to get $50 off your first booking:\n\n${referralLink}\n\nWhen you complete your first booking, we both get $50!`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`Get $50 off your first Split Lease booking! Use my referral link: ${referralLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleTwitter = () => {
    const text = encodeURIComponent(`Get $50 off your first Split Lease booking with my referral link!`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const handleFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const handleSms = () => {
    const text = encodeURIComponent(`Get $50 off your first Split Lease booking! Use my referral link: ${referralLink}`);
    // sms: works on both iOS and Android
    window.location.href = `sms:?&body=${text}`;
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    // Only restore on cleanup, not when isOpen changes to false
    // Use '' instead of 'unset' for proper mobile behavior
    return () => {
      if (isOpen) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="referral-modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="referral-modal-title"
    >
      <div className="referral-modal" onClick={(e) => e.stopPropagation()}>
        {/* Mobile grab handle - visible only on mobile */}
        <div className="referral-modal-grab-handle" aria-hidden="true" />

        <div className="referral-modal-header">
          <h2 id="referral-modal-title">Give $50, Get $50</h2>
          <button
            className="referral-modal-close"
            onClick={onClose}
            type="button"
            aria-label="Close modal"
          >
            <CloseIcon />
          </button>
        </div>

        <p className="referral-modal-subtitle">
          {subtitleText}
        </p>

        {/* Referral Card - shown when referrer name is provided */}
        {referrerName && (
          <ReferralCard referrerName={referrerName} isHost={isHost} />
        )}

        <div className="referral-share-section">
          <label>Your referral link</label>
          <div className="referral-share-link">
            <input type="text" value={referralLink} readOnly />
            <button onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="referral-share-actions">
          <button className="referral-secondary-btn" onClick={handleWhatsApp}>
            <WhatsAppIcon /> WhatsApp
          </button>
          <button className="referral-secondary-btn" onClick={handleTwitter}>
            <TwitterIcon /> Twitter
          </button>
          <button className="referral-secondary-btn" onClick={handleFacebook}>
            <FacebookIcon /> Facebook
          </button>
        </div>

        <div className="referral-share-actions">
          <button className="referral-secondary-btn" onClick={handleSms}>
            <SmsIcon /> SMS
          </button>
          <button className="referral-secondary-btn" onClick={handleTelegram}>
            <SendIcon /> Telegram
          </button>
          <button className="referral-secondary-btn" onClick={handleEmail}>
            <MailIcon /> Email
          </button>
        </div>

        <div className="referral-rewards">
          <div className="referral-reward-item">
            <strong>{friendsReferred}</strong>
            <span>Friends referred</span>
          </div>
          <div className="referral-reward-item">
            <strong>${rewardsClaimed}</strong>
            <span>Rewards claimed</span>
          </div>
          <div className="referral-reward-item">
            <strong>${totalRewards}</strong>
            <span>Total rewards</span>
          </div>
        </div>

        <div className="referral-modal-footer">
          <a href="/policies#referral">View referral details</a>
          <a href="/policies#terms-of-use">Terms & Conditions</a>
        </div>
      </div>
    </div>
  );
}
