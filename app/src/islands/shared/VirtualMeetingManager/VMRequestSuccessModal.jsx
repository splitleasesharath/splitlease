/**
 * VMRequestSuccessModal.jsx
 *
 * Success popup shown after a virtual meeting is requested.
 * Includes a referral invite section at the bottom.
 */

import React, { useState } from 'react';

// Checkmark circle icon
function CheckCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}

// Gift icon for referral
function GiftIcon() {
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
      <polyline points="20 12 20 22 4 22 4 12"></polyline>
      <rect x="2" y="7" width="20" height="5"></rect>
      <line x1="12" y1="22" x2="12" y2="7"></line>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
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

// Copy icon
function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  );
}

// WhatsApp icon
function WhatsAppIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
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
      width="16"
      height="16"
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
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

// Telegram icon
function TelegramIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
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
      width="16"
      height="16"
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

export default function VMRequestSuccessModal({
  isOpen,
  onClose,
  hostName = 'the host',
  referralCode = 'user'
}) {
  const [copied, setCopied] = useState(false);
  const referralLink = `https://splitlease.com/ref/${referralCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
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

  const handleTelegram = () => {
    const text = encodeURIComponent(`Get $50 off your first Split Lease booking! Use my referral link: ${referralLink}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${text}`, '_blank');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('Get $50 off your first Split Lease booking!');
    const body = encodeURIComponent(`Hey!\n\nI've been using Split Lease and thought you might like it too. Use my referral link to get $50 off your first booking:\n\n${referralLink}\n\nWhen you complete your first booking, we both get $50!`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="vm-success-modal-overlay" onClick={handleOverlayClick}>
      <div className="vm-success-modal">
        {/* Close button */}
        <button className="vm-success-modal-close" onClick={onClose}>
          <CloseIcon />
        </button>

        {/* Success content */}
        <div className="vm-success-modal-content">
          <div className="vm-success-modal-icon">
            <CheckCircleIcon />
          </div>

          <h2 className="vm-success-modal-title">Meeting Request Sent!</h2>

          <p className="vm-success-modal-message">
            Your virtual meeting request has been sent to {hostName}.
            They'll review your proposed times and get back to you soon.
          </p>

          <button className="vm-success-modal-btn" onClick={onClose}>
            Got it
          </button>
        </div>

        {/* Referral section */}
        <div className="vm-success-modal-referral">
          <div className="vm-success-modal-referral-header">
            <div className="vm-success-modal-referral-icon">
              <GiftIcon />
            </div>
            <div className="vm-success-modal-referral-content">
              <strong>Give $50, Get $50</strong>
              <span>Share Split Lease with friends and earn rewards</span>
            </div>
          </div>
          <div className="vm-success-modal-share-buttons">
            <button
              className="vm-success-modal-share-btn"
              onClick={handleCopyLink}
              title="Copy Link"
            >
              <CopyIcon />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              className="vm-success-modal-share-btn"
              onClick={handleWhatsApp}
              title="Share on WhatsApp"
            >
              <WhatsAppIcon />
            </button>
            <button
              className="vm-success-modal-share-btn"
              onClick={handleTwitter}
              title="Share on Twitter"
            >
              <TwitterIcon />
            </button>
            <button
              className="vm-success-modal-share-btn"
              onClick={handleFacebook}
              title="Share on Facebook"
            >
              <FacebookIcon />
            </button>
            <button
              className="vm-success-modal-share-btn"
              onClick={handleTelegram}
              title="Share on Telegram"
            >
              <TelegramIcon />
            </button>
            <button
              className="vm-success-modal-share-btn"
              onClick={handleEmail}
              title="Share via Email"
            >
              <MailIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
