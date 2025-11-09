import React, { useState } from 'react';
import './Footer.css';

export interface FooterLink {
  text: string;
  url: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface FooterProps {
  columns?: FooterColumn[];
  showReferral?: boolean;
  showImport?: boolean;
  onReferralSubmit?: (method: 'text' | 'email', contact: string) => void;
  onImportSubmit?: (url: string, email: string) => void;
  copyrightText?: string;
  footerNote?: string;
  termsUrl?: string;
}

const defaultColumns: FooterColumn[] = [
  {
    title: 'For Hosts',
    links: [
      { text: 'List Property Now', url: 'https://app.split.lease/signup-login' },
      { text: 'How to List', url: 'https://app.split.lease/host-step-by-step-guide-to-list' },
      { text: 'Legal Section', url: 'https://app.split.lease/policies/cancellation-and-refund-policy' },
      { text: 'Guarantees', url: 'https://app.split.lease/host-guarantee' },
      { text: 'Free House Manual', url: 'https://app.split.lease/demo-house-manual' }
    ]
  },
  {
    title: 'For Guests',
    links: [
      { text: 'Explore Split Leases', url: 'https://app.split.lease/search' },
      { text: 'Success Stories', url: 'https://app.split.lease/success-stories-guest' },
      { text: 'Speak to an Agent', url: 'https://app.split.lease/signup-login' },
      { text: 'View FAQ', url: 'https://app.split.lease/faq' }
    ]
  },
  {
    title: 'Company',
    links: [
      { text: 'About Periodic Tenancy', url: 'https://app.split.lease/faq?question=Guest&answer=1692211080963x751695924087252700' },
      { text: 'About the Team', url: 'https://app.split.lease/about-us' },
      { text: 'Careers at Split Lease', url: 'https://app.split.lease/careers' },
      { text: 'View Blog', url: 'https://app.split.lease/knowledge-base/1676496004548x830972865850585500' }
    ]
  }
];

export const Footer: React.FC<FooterProps> = ({
  columns = defaultColumns,
  showReferral = true,
  showImport = true,
  onReferralSubmit,
  onImportSubmit,
  copyrightText = '© 2025 SplitLease',
  footerNote = 'Made with love in New York City',
  termsUrl = 'https://app.split.lease/terms'
}) => {
  const [referralMethod, setReferralMethod] = useState<'text' | 'email'>('text');
  const [referralContact, setReferralContact] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importEmail, setImportEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReferralSubmit = async () => {
    if (!referralContact.trim()) {
      return;
    }

    if (onReferralSubmit) {
      await onReferralSubmit(referralMethod, referralContact);
    }

    setReferralContact('');
  };

  const handleImportSubmit = async () => {
    if (!importUrl.trim() || !importEmail.trim()) {
      return;
    }

    if (!importUrl.startsWith('http://') && !importUrl.startsWith('https://')) {
      return;
    }

    if (!importEmail.includes('@') || !importEmail.includes('.')) {
      return;
    }

    setIsSubmitting(true);

    if (onImportSubmit) {
      await onImportSubmit(importUrl, importEmail);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setImportUrl('');
      setImportEmail('');
    }, 2000);
  };

  const getReferralPlaceholder = () => {
    return referralMethod === 'text'
      ? "Your friend's phone number"
      : "Your friend's email";
  };

  return (
    <>
      <footer className="main-footer">
        <div className="footer-container">
          {columns.map((column, index) => (
            <div key={index} className="footer-column">
              <h4>{column.title}</h4>
              {column.links.map((link, linkIndex) => (
                <a key={linkIndex} href={link.url}>
                  {link.text}
                </a>
              ))}
            </div>
          ))}

          {showReferral && (
            <div className="footer-column">
              <h4>Refer a friend</h4>
              <p className="referral-text">
                You get $50 and they get $50 *after their first booking
              </p>
              <div className="referral-options">
                <label>
                  <input
                    type="radio"
                    name="referral"
                    value="text"
                    checked={referralMethod === 'text'}
                    onChange={(e) => setReferralMethod(e.target.value as 'text' | 'email')}
                  />
                  Text
                </label>
                <label>
                  <input
                    type="radio"
                    name="referral"
                    value="email"
                    checked={referralMethod === 'email'}
                    onChange={(e) => setReferralMethod(e.target.value as 'text' | 'email')}
                  />
                  Email
                </label>
              </div>
              <input
                type="text"
                placeholder={getReferralPlaceholder()}
                className="referral-input"
                value={referralContact}
                onChange={(e) => setReferralContact(e.target.value)}
              />
              <button className="share-btn" onClick={handleReferralSubmit}>
                Share now
              </button>
            </div>
          )}

          {showImport && (
            <div className="footer-column">
              <h4>Import your listing from another site</h4>
              <p className="import-text">No need to start from scratch</p>
              <input
                type="text"
                placeholder="https://your-listing-link"
                className="import-input"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
              />
              <input
                type="email"
                placeholder="janedoe@your_email.com"
                className="import-input"
                value={importEmail}
                onChange={(e) => setImportEmail(e.target.value)}
              />
              <button
                className="import-btn"
                onClick={handleImportSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Importing...' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      </footer>

      <div className="footer-bottom">
        <a href={termsUrl}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="currentColor"
            style={{ marginRight: '0.5rem' }}
          >
            <path
              d="M2 2h8v8H2z"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
            <path d="M4 6h4M4 8h3" />
          </svg>
          Terms of Use
        </a>
        <span>{footerNote}</span>
        <span>{copyrightText}</span>
      </div>
    </>
  );
};

export default Footer;
