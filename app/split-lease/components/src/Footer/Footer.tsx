import React, { memo, useMemo } from 'react';
import type { FooterProps, FooterColumn } from './Footer.types';
import { useFooterReferral } from './hooks/useFooterReferral';
import { useFooterImport } from './hooks/useFooterImport';
import styles from './Footer.module.css';

/**
 * Default footer columns configuration
 * Contains links for hosts, guests, and company information
 */
const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    title: 'For Hosts',
    links: [
      { text: 'List Property Now', url: 'https://app.split.lease/signup-login' },
      {
        text: 'How to List',
        url: 'https://app.split.lease/host-step-by-step-guide-to-list',
      },
      {
        text: 'Legal Section',
        url: 'https://app.split.lease/policies/cancellation-and-refund-policy',
      },
      { text: 'Guarantees', url: 'https://app.split.lease/host-guarantee' },
      {
        text: 'Free House Manual',
        url: 'https://app.split.lease/demo-house-manual',
      },
    ],
  },
  {
    title: 'For Guests',
    links: [
      { text: 'Explore Split Leases', url: 'search/index.html' },
      {
        text: 'Success Stories',
        url: 'https://app.split.lease/success-stories-guest',
      },
      { text: 'Speak to an Agent', url: 'https://app.split.lease/signup-login' },
      { text: 'View FAQ', url: 'https://app.split.lease/faq' },
    ],
  },
  {
    title: 'Company',
    links: [
      {
        text: 'About Periodic Tenancy',
        url: 'https://app.split.lease/faq?question=Guest&answer=1692211080963x751695924087252700',
      },
      { text: 'About the Team', url: 'https://app.split.lease/about-us' },
      { text: 'Careers at Split Lease', url: 'https://app.split.lease/careers' },
      {
        text: 'View Blog',
        url: 'https://app.split.lease/knowledge-base/1676496004548x830972865850585500',
      },
    ],
  },
];

/**
 * Footer Component
 *
 * A comprehensive footer component for the SplitLease application that includes
 * navigation links, referral form, listing import form, and app download section.
 * Built following ESM + React Islands architecture with full accessibility support.
 *
 * Features:
 * - Configurable column-based navigation
 * - Referral program form (text or email)
 * - Listing import form with validation
 * - App download section (iOS and Alexa)
 * - Full WCAG 2.1 AA accessibility compliance
 * - CSS Modules for scoped styling
 * - Runtime validation with Zod schemas
 * - Performance optimized with React.memo and hooks
 *
 * @param {FooterProps} props - Component props
 * @returns {React.ReactElement} Rendered footer component
 *
 * @example
 * Basic usage with defaults:
 * ```tsx
 * <Footer />
 * ```
 *
 * @example
 * Advanced usage with custom configuration:
 * ```tsx
 * <Footer
 *   columns={customColumns}
 *   showReferral={true}
 *   showImport={true}
 *   showAppDownload={false}
 *   onReferralSubmit={async (method, contact) => {
 *     await api.sendReferral(method, contact);
 *   }}
 *   onImportSubmit={async (url, email) => {
 *     await api.importListing(url, email);
 *   }}
 *   copyrightText="© 2025 SplitLease Inc."
 * />
 * ```
 */
export const Footer: React.FC<FooterProps> = memo(
  ({
    columns = DEFAULT_COLUMNS,
    showReferral = true,
    showImport = true,
    showAppDownload = true,
    onReferralSubmit,
    onImportSubmit,
    copyrightText = '© 2025 SplitLease',
    footerNote = 'Made with love in New York City',
    termsUrl = 'https://app.split.lease/terms',
  }) => {
    // Custom hooks for form state management
    const referral = useFooterReferral(onReferralSubmit);
    const importForm = useFooterImport(onImportSubmit);

    // Memoize columns to prevent unnecessary re-renders
    const footerColumns = useMemo(() => columns, [columns]);

    return (
      <>
        {/* Main Footer Section */}
        <footer className={styles.mainFooter} aria-label="Main footer navigation">
          <div className={styles.footerContainer}>
            {/* Dynamic Navigation Columns */}
            {footerColumns.map((column, index) => (
              <nav
                key={`${column.title}-${index}`}
                className={styles.footerColumn}
                aria-label={column.title}
              >
                <h4>{column.title}</h4>
                {column.links.map((link, linkIndex) => (
                  <a
                    key={`${link.text}-${linkIndex}`}
                    href={link.url}
                    aria-label={link.text}
                  >
                    {link.text}
                  </a>
                ))}
              </nav>
            ))}

            {/* Referral Section */}
            {showReferral && (
              <div className={styles.footerColumn} role="region" aria-label="Refer a friend">
                <h4>Refer a friend</h4>
                <p className={styles.referralText}>
                  You get $50 and they get $50 *after their first booking
                </p>

                {/* Referral Method Selection */}
                <div className={styles.referralOptions} role="radiogroup" aria-label="Referral method">
                  <label>
                    <input
                      type="radio"
                      name="referral"
                      value="text"
                      checked={referral.method === 'text'}
                      onChange={() => referral.setMethod('text')}
                      aria-label="Send referral by text message"
                    />
                    Text
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="referral"
                      value="email"
                      checked={referral.method === 'email'}
                      onChange={() => referral.setMethod('email')}
                      aria-label="Send referral by email"
                    />
                    Email
                  </label>
                </div>

                {/* Referral Contact Input */}
                <input
                  type="text"
                  placeholder={referral.placeholder}
                  className={styles.referralInput}
                  value={referral.contact}
                  onChange={(e) => referral.setContact(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      referral.handleSubmit();
                    }
                  }}
                  aria-label={referral.placeholder}
                  aria-invalid={!!referral.error}
                  aria-describedby={referral.error ? 'referral-error' : undefined}
                  disabled={referral.isSubmitting}
                />

                {/* Referral Error Message */}
                {referral.error && (
                  <span
                    id="referral-error"
                    className={styles.errorMessage}
                    role="alert"
                    aria-live="assertive"
                  >
                    {referral.error}
                  </span>
                )}

                {/* Referral Success Message */}
                {referral.successMessage && (
                  <span
                    className={styles.successMessage}
                    role="status"
                    aria-live="polite"
                  >
                    {referral.successMessage}
                  </span>
                )}

                {/* Referral Submit Button */}
                <button
                  className={styles.shareBtn}
                  onClick={referral.handleSubmit}
                  disabled={referral.isSubmitting}
                  aria-busy={referral.isSubmitting}
                  aria-label="Share referral now"
                >
                  {referral.isSubmitting ? 'Sending...' : 'Share now'}
                </button>
              </div>
            )}

            {/* Import Listing Section */}
            {showImport && (
              <div className={styles.footerColumn} role="region" aria-label="Import your listing">
                <h4>Import your listing from another site</h4>
                <p className={styles.importText}>No need to start from scratch</p>

                {/* Import URL Input */}
                <input
                  type="text"
                  placeholder="https://your-listing-link"
                  className={styles.importInput}
                  value={importForm.url}
                  onChange={(e) => importForm.setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === 'Enter' &&
                      importForm.url &&
                      importForm.email
                    ) {
                      importForm.handleSubmit();
                    }
                  }}
                  aria-label="Listing URL from another site"
                  aria-invalid={!!importForm.errors.url}
                  aria-describedby={
                    importForm.errors.url ? 'import-url-error' : undefined
                  }
                  disabled={importForm.isSubmitting}
                />

                {/* Import URL Error */}
                {importForm.errors.url && (
                  <span
                    id="import-url-error"
                    className={styles.errorMessage}
                    role="alert"
                    aria-live="assertive"
                  >
                    {importForm.errors.url}
                  </span>
                )}

                {/* Import Email Input */}
                <input
                  type="email"
                  placeholder="janedoe@your_email.com"
                  className={styles.importInput}
                  value={importForm.email}
                  onChange={(e) => importForm.setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === 'Enter' &&
                      importForm.url &&
                      importForm.email
                    ) {
                      importForm.handleSubmit();
                    }
                  }}
                  aria-label="Your email address"
                  aria-invalid={!!importForm.errors.email}
                  aria-describedby={
                    importForm.errors.email ? 'import-email-error' : undefined
                  }
                  disabled={importForm.isSubmitting}
                />

                {/* Import Email Error */}
                {importForm.errors.email && (
                  <span
                    id="import-email-error"
                    className={styles.errorMessage}
                    role="alert"
                    aria-live="assertive"
                  >
                    {importForm.errors.email}
                  </span>
                )}

                {/* Import Success Message */}
                {importForm.successMessage && (
                  <span
                    className={styles.successMessage}
                    role="status"
                    aria-live="polite"
                  >
                    {importForm.successMessage}
                  </span>
                )}

                {/* Import Submit Button */}
                <button
                  className={styles.importBtn}
                  onClick={importForm.handleSubmit}
                  disabled={importForm.isSubmitting}
                  aria-busy={importForm.isSubmitting}
                  aria-label="Submit import request"
                >
                  {importForm.isSubmitting ? 'Importing...' : 'Submit'}
                </button>
              </div>
            )}
          </div>
        </footer>

        {/* App Download Section */}
        {showAppDownload && (
          <section
            className={styles.appDownloadSection}
            aria-label="Download our apps"
          >
            {/* iOS App Card */}
            <div className={styles.appCard}>
              <img
                src="https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=256,h=330,f=auto,dpr=1,fit=contain/f1743107051105x956510081926083000/iphone-removebg-preview.png"
                alt="Split Lease App"
                className={styles.appPhoneImage}
                loading="lazy"
                width={150}
                height={193}
              />
              <div className={styles.appContent}>
                <p className={styles.appTagline}>
                  Now you can change
                  <br />
                  your nights
                  <br />
                  <em>on the go.</em>
                </p>
                <a
                  href="https://apps.apple.com/app/split-lease"
                  className={styles.appStoreBtn}
                  aria-label="Download Split Lease on the App Store"
                >
                  <img
                    src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                    alt="Download on the App Store"
                    height={40}
                    width={120}
                  />
                </a>
                <p className={styles.appSubtitle}>Download at the App Store</p>
              </div>
            </div>

            {/* Alexa Skill Card */}
            <div className={styles.alexaCard}>
              <img
                src="https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=256,h=225,f=auto,dpr=1,fit=cover,q=75/f1625329487406x361063433051586300/402087-smart-speakers-amazon-echo-dot-4th-gen-10015594%201.png"
                alt="Amazon Alexa"
                className={styles.alexaDeviceImage}
                loading="lazy"
                width={150}
                height={132}
              />
              <div className={styles.alexaContent}>
                <p className={styles.alexaTagline}>
                  Voice-controlled concierge,
                  <br />
                  at your service.
                </p>
                <a
                  href="https://www.amazon.com/dp/B08XYZ123"
                  className={styles.alexaBtn}
                  aria-label="Get Split Lease on Amazon Alexa"
                >
                  <span className={styles.amazonLogo}>
                    Available on
                    <br />
                    <strong>amazon.com</strong>
                  </span>
                </a>
                <p className={styles.alexaCommand}>
                  "Alexa, enable Split Lease"
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Footer Bottom */}
        <div className={styles.footerBottom} aria-label="Copyright and legal information">
          <a href={termsUrl} aria-label="View terms of use">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="currentColor"
              className={styles.termsIcon}
              aria-hidden="true"
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

        {/* Screen Reader Only Live Region */}
        <div className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true" />
      </>
    );
  }
);

// Display name for debugging
Footer.displayName = 'Footer';

export default Footer;
