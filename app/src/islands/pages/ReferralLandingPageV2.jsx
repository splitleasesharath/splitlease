/**
 * ReferralLandingPageV2.jsx
 *
 * REVIEW VERSION - Local only, not routed in production
 *
 * Changes from V1 based on feedback:
 * - Demoted $50 from headline to context (bonus is program benefit, not bribe)
 * - Changed "thinks you'd love" to trust signal framing (reduces social pressure on referrer)
 * - CTA changed from "Claim Your $50 & List" to action-focused "Create Account & List Your Space"
 * - Added "active Split Lease host" credibility to referrer mention
 * - Form header changed to action-focused "Get Started"
 * - Added subtle footer note "No action required unless you're interested"
 * - Updated card message to emphasize the unlock condition
 */

import { useState, useEffect } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import '../../styles/referral-landing.css';

// Gift icon (smaller, more subtle)
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

// Check icon for benefits
function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}

// Referral Gift Card Component - V2 (emphasizes unlock condition)
function ReferralCard({ referrerName, isHost }) {
  // V2: Message emphasizes when bonus is unlocked, not "claim" language
  const cardMessage = isHost
    ? "This bonus is unlocked when you complete your first lease on Split Lease."
    : "This bonus is unlocked when you complete your first booking on Split Lease.";

  const footerText = isHost
    ? "Unlocked after first closed lease"
    : "Unlocked after first booking";

  const badgeText = isHost ? "Host Bonus" : "Guest Bonus";

  return (
    <div className="referral-landing-card">
      <div className="referral-landing-card__corner-accent"></div>

      <div className="referral-landing-card__header">
        <div className="referral-landing-card__brand">SPLIT LEASE</div>
        {/* V2: Changed from just "$50" to "$50 Host Bonus" for context */}
        <div className="referral-landing-card__amount">$50 {badgeText}</div>
      </div>

      <div className="referral-landing-card__content">
        <div className="referral-landing-card__sent-by">Referred by</div>
        <div className="referral-landing-card__name">{referrerName}</div>
        <div className="referral-landing-card__message">{cardMessage}</div>
      </div>

      <div className="referral-landing-card__footer">
        <div className="referral-landing-card__valid">{footerText}</div>
        <div className="referral-landing-card__badge">
          <span className="referral-landing-card__badge-text">{badgeText}</span>
        </div>
      </div>
    </div>
  );
}

export default function ReferralLandingPageV2() {
  const [referrerName, setReferrerName] = useState('Your Friend');
  const [referralCode, setReferralCode] = useState('');
  const [isHost, setIsHost] = useState(true); // Default to host view
  const [formData, setFormData] = useState({
    email: '',
    phone: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Parse URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('code') || '';
    const name = params.get('name') || 'Your Friend';
    const type = params.get('type') || 'host';

    setReferralCode(ref);
    setReferrerName(decodeURIComponent(name));
    setIsHost(type === 'host');
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[\d\s\-\(\)\+]{10,}$/.test(formData.phone.replace(/\s/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      localStorage.setItem('referral_code', referralCode);
      localStorage.setItem('referral_type', isHost ? 'host' : 'guest');
      localStorage.setItem('referral_email', formData.email);
      localStorage.setItem('referral_phone', formData.phone);

      setSubmitSuccess(true);

      setTimeout(() => {
        if (isHost) {
          window.location.href = '/list-with-us';
        } else {
          window.location.href = '/search';
        }
      }, 2000);
    } catch (error) {
      console.error('Error submitting referral:', error);
      setFormErrors({ submit: 'Something went wrong. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // V2: Updated benefits copy - more professional, less "sales-y"
  const benefits = isHost
    ? [
        'Earn income from your unused space',
        'Keep your belongings in place between stays',
        'Choose exactly when your space is available',
        'Host professional, verified guests'
      ]
    : [
        'Save up to 60% vs hotels',
        'Same space every visit - your NYC home',
        'Leave your belongings between visits',
        'No more packing and unpacking'
      ];

  // V2: CTA is action-focused, bonus mentioned separately
  const ctaText = isHost
    ? 'Create Account & List Your Space'
    : 'Create Account & Find Your Space';

  return (
    <>
      <Header />

      {/* Hero Section - V2: More professional, less "claim your money" */}
      <section className="referral-landing-hero">
        <div className="referral-landing-hero__bg-accent"></div>

        <div className="referral-landing-hero__container">
          {/* V2: Smaller badge, less prominent */}
          <div className="referral-landing-hero__badge referral-landing-hero__badge--subtle">
            <GiftIcon />
            <span>Referral Bonus</span>
          </div>

          {/* V2: Title focuses on invitation, not money */}
          <h1 className="referral-landing-hero__title">
            You've been invited to host on Split Lease
          </h1>

          {/* V2: Referrer is a trust signal, not emotional driver */}
          <p className="referral-landing-hero__subtitle">
            You were referred by <strong>{referrerName}</strong>, an active Split Lease host.
            <br />
            Split Lease helps hosts earn more from their space — without moving out.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="referral-landing-main">
        <div className="referral-landing-main__container">
          {/* Left Column - Card + Benefits */}
          <div className="referral-landing-main__left">
            <ReferralCard referrerName={referrerName} isHost={isHost} />

            <div className="referral-landing-benefits">
              <h3 className="referral-landing-benefits__title">
                {isHost ? 'Why Host on Split Lease?' : 'Why Use Split Lease?'}
              </h3>
              <ul className="referral-landing-benefits__list">
                {benefits.map((benefit, idx) => (
                  <li key={idx} className="referral-landing-benefits__item">
                    <span className="referral-landing-benefits__icon">
                      <CheckIcon />
                    </span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="referral-landing-main__right">
            <div className="referral-landing-form-card">
              {submitSuccess ? (
                <div className="referral-landing-success">
                  <div className="referral-landing-success__icon">
                    <CheckIcon />
                  </div>
                  <h3>You're All Set!</h3>
                  <p>Your bonus has been reserved. Redirecting you to list your space...</p>
                </div>
              ) : (
                <>
                  {/* V2: Action-focused header, bonus is secondary info */}
                  <h2 className="referral-landing-form-card__title">
                    Get Started
                  </h2>
                  <p className="referral-landing-form-card__subtitle">
                    Create your host account to list your space.
                    <br />
                    <span className="referral-landing-form-card__bonus-note">
                      Your bonus will be reserved and unlocked after your first completed lease.
                    </span>
                  </p>

                  <form onSubmit={handleSubmit} className="referral-landing-form">
                    <div className="referral-landing-form__field">
                      <label htmlFor="email">Email Address</label>
                      <input
                        type="email"
                        id="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={formErrors.email ? 'error' : ''}
                      />
                      {formErrors.email && (
                        <span className="referral-landing-form__error">{formErrors.email}</span>
                      )}
                    </div>

                    <div className="referral-landing-form__field">
                      <label htmlFor="phone">Phone Number</label>
                      <input
                        type="tel"
                        id="phone"
                        placeholder="(555) 123-4567"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className={formErrors.phone ? 'error' : ''}
                      />
                      {formErrors.phone && (
                        <span className="referral-landing-form__error">{formErrors.phone}</span>
                      )}
                    </div>

                    {formErrors.submit && (
                      <div className="referral-landing-form__submit-error">
                        {formErrors.submit}
                      </div>
                    )}

                    {/* V2: CTA is action-focused, no money in button text */}
                    <button
                      type="submit"
                      className="referral-landing-form__submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Processing...' : ctaText}
                    </button>

                    <p className="referral-landing-form__terms">
                      By continuing, you agree to our{' '}
                      <a href="/policies#terms">Terms of Service</a> and{' '}
                      <a href="/policies#privacy">Privacy Policy</a>.
                    </p>
                  </form>
                </>
              )}
            </div>

            {/* Referral Code Display */}
            {referralCode && (
              <div className="referral-landing-code">
                <span className="referral-landing-code__label">Referral Code:</span>
                <span className="referral-landing-code__value">{referralCode}</span>
              </div>
            )}

            {/* V2: Low-pressure closing note */}
            <p className="referral-landing-no-obligation">
              No action required unless you're interested.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
