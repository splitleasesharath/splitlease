/**
 * ReferralLandingPage.jsx
 *
 * Landing page for users who click on a referral link.
 * Displays the referral gift card with form to claim the bonus.
 * Supports both host and guest referral types via URL param.
 */

import { useState, useEffect } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import '../../styles/referral-landing.css';

// Gift icon
function GiftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
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

// Referral Gift Card Component
function ReferralCard({ referrerName, isHost }) {
  const cardMessage = isHost
    ? "This bonus is yours when you close your first lease. List your space and start earning."
    : "This bonus is yours when you complete your first booking. Find your perfect space today.";

  const footerText = isHost
    ? "Unlocked after first closed lease"
    : "Unlocked after first booking";

  const badgeText = isHost ? "Host Bonus" : "Guest Bonus";

  return (
    <div className="referral-landing-card">
      <div className="referral-landing-card__corner-accent"></div>

      <div className="referral-landing-card__header">
        <div className="referral-landing-card__brand">SPLIT LEASE</div>
        <div className="referral-landing-card__amount">$50</div>
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

export default function ReferralLandingPage() {
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
    // Clear error when user starts typing
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

    // Simulate API call - in production this would create the user account
    // and associate the referral code
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Store referral info in localStorage for signup flow
      localStorage.setItem('referral_code', referralCode);
      localStorage.setItem('referral_type', isHost ? 'host' : 'guest');
      localStorage.setItem('referral_email', formData.email);
      localStorage.setItem('referral_phone', formData.phone);

      setSubmitSuccess(true);

      // Redirect to appropriate signup/listing page after short delay
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

  const benefits = isHost
    ? [
        'Earn extra income from your unused space',
        'Keep your belongings in place',
        'Flexible scheduling - you control when',
        'Professional guests, verified profiles'
      ]
    : [
        'Save up to 60% vs hotels',
        'Same space every visit - your NYC home',
        'Leave your belongings between visits',
        'No more packing and unpacking'
      ];

  const ctaText = isHost ? 'Claim Your $50 & List Your Space' : 'Claim Your $50 & Find Your Space';

  return (
    <>
      <Header />

      {/* Hero Section */}
      <section className="referral-landing-hero">
        <div className="referral-landing-hero__bg-accent"></div>

        <div className="referral-landing-hero__container">
          <div className="referral-landing-hero__badge">
            <GiftIcon />
            <span>Referral Bonus</span>
          </div>

          <h1 className="referral-landing-hero__title">
            You've Been Invited to Split Lease!
          </h1>

          <p className="referral-landing-hero__subtitle">
            {referrerName} thinks you'd love Split Lease. Claim your $50 bonus and
            {isHost
              ? ' start earning from your space.'
              : ' find your perfect NYC home base.'}
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
                  <p>Your $50 bonus has been reserved. Redirecting you to get started...</p>
                </div>
              ) : (
                <>
                  <h2 className="referral-landing-form-card__title">
                    Claim Your $50 Bonus
                  </h2>
                  <p className="referral-landing-form-card__subtitle">
                    Enter your details to reserve your bonus and create your account.
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
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="referral-landing-trust">
        <div className="referral-landing-trust__container">
          <div className="referral-landing-trust__stat">
            <div className="referral-landing-trust__number">200+</div>
            <div className="referral-landing-trust__label">NYC Spaces</div>
          </div>
          <div className="referral-landing-trust__stat">
            <div className="referral-landing-trust__number">2,400+</div>
            <div className="referral-landing-trust__label">Happy Users</div>
          </div>
          <div className="referral-landing-trust__stat">
            <div className="referral-landing-trust__number">$18K</div>
            <div className="referral-landing-trust__label">Avg. Yearly Savings</div>
          </div>
          <div className="referral-landing-trust__stat">
            <div className="referral-landing-trust__number">4.8</div>
            <div className="referral-landing-trust__label">Average Rating</div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
