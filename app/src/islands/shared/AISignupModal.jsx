/**
 * AISignupModal Component - Market Research Signup
 *
 * Multi-step modal for collecting user information for AI market research reports.
 * Follows NO FALLBACK principle - real data or nothing.
 *
 * @module AISignupModal
 */

import { useState, useEffect, useRef } from 'react';
import { AI_SIGNUP_WORKFLOW_URL, LOTTIE_ANIMATIONS } from '../../lib/constants.js';

// Access AI Signup Bubble key from environment variables
const AI_SIGNUP_BUBBLE_KEY = import.meta.env.VITE_AI_SIGNUP_BUBBLE_KEY;

export default function AISignupModal({ isOpen, onClose }) {
  const [section, setSection] = useState('freeform');
  const [formData, setFormData] = useState({
    marketResearchText: '',
    email: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lottieRefs = useRef({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSection('freeform');
      setFormData({ marketResearchText: '', email: '', phone: '' });
      setErrors({});
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Load Lottie animation
  useEffect(() => {
    if (!isOpen || !window.lottie) return;

    const loadAnimation = (containerId, url, refKey) => {
      const container = document.getElementById(containerId);
      if (!container) return;

      // Destroy existing instance
      if (lottieRefs.current[refKey]) {
        lottieRefs.current[refKey].destroy();
      }

      // Load new animation
      lottieRefs.current[refKey] = window.lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: url,
        speed: 0.25
      });
    };

    if (section === 'parsing') {
      setTimeout(() => loadAnimation('parsingLottie', LOTTIE_ANIMATIONS.PARSING, 'parsing'), 100);
    } else if (section === 'loading') {
      setTimeout(() => loadAnimation('loadingLottie', LOTTIE_ANIMATIONS.LOADING, 'loading'), 100);
    } else if (section === 'final') {
      setTimeout(() => loadAnimation('successLottie', LOTTIE_ANIMATIONS.SUCCESS, 'success'), 100);
    }

    return () => {
      // Cleanup Lottie instances
      Object.values(lottieRefs.current).forEach(instance => {
        if (instance) instance.destroy();
      });
      lottieRefs.current = {};
    };
  }, [section, isOpen]);

  // Utility functions
  const extractEmail = (text) => {
    if (!text) return null;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+[.,][a-zA-Z]{2,}/;
    const match = text.match(emailRegex);
    return match ? match[0] : null;
  };

  const extractPhone = (text) => {
    if (!text) return null;
    const completePhoneRegex = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const match = text.match(completePhoneRegex);
    return match ? match[0] : null;
  };

  const autoCorrectEmail = (email) => {
    if (!email) return email;
    const typoMap = {
      'gmial.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'gmail,com': 'gmail.com',
      'yahooo.com': 'yahoo.com',
      'yaho.com': 'yahoo.com',
      'yahoo,com': 'yahoo.com',
      'hotmial.com': 'hotmail.com',
      'hotmail,com': 'hotmail.com'
    };
    const [localPart, domain] = email.split('@');
    if (!domain) return email;
    const fixedDomain = domain.toLowerCase().replace(',', '.');
    const correctedDomain = typoMap[fixedDomain] || fixedDomain;
    return `${localPart}@${correctedDomain}`;
  };

  const checkEmailCertainty = (email) => {
    if (!email) return 'uncertain';
    const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    if (commonDomains.includes(domain)) return 'certain';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) ? 'certain' : 'uncertain';
  };

  const submitToBubble = async () => {
    if (!formData.email) {
      setErrors({ submit: 'Email is required' });
      return;
    }

    setIsSubmitting(true);
    setSection('loading');

    try {
      const response = await fetch(AI_SIGNUP_WORKFLOW_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_SIGNUP_BUBBLE_KEY}`
        },
        body: JSON.stringify({
          email: formData.email,
          phone: formData.phone || '',
          'text inputted': formData.marketResearchText
        })
      });

      if (!response.ok) {
        throw new Error(`Signup failed: ${response.status}`);
      }

      console.log('✅ AI Signup submitted successfully');
      setTimeout(() => {
        setSection('final');
      }, 1500);
    } catch (error) {
      console.error('❌ AI Signup error:', error);
      setErrors({ submit: error.message || 'Signup failed. Please try again.' });
      setSection('contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (section === 'freeform') {
      setSection('parsing');

      await new Promise(resolve => setTimeout(resolve, 1500));

      const extractedEmail = extractEmail(formData.marketResearchText);
      const extractedPhone = extractPhone(formData.marketResearchText);
      const correctedEmail = extractedEmail ? autoCorrectEmail(extractedEmail) : '';
      const emailCertainty = checkEmailCertainty(correctedEmail);
      const phoneIsComplete = extractedPhone ? /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test(extractedPhone) : false;

      setFormData(prev => ({
        ...prev,
        email: correctedEmail || prev.email,
        phone: extractedPhone || prev.phone
      }));

      const shouldAutoSubmit = correctedEmail && extractedPhone && emailCertainty === 'certain' && phoneIsComplete;

      if (shouldAutoSubmit) {
        await submitToBubble();
      } else {
        setSection('contact');
      }
    } else if (section === 'contact') {
      await submitToBubble();
    }
  };

  const handleClose = () => {
    Object.values(lottieRefs.current).forEach(instance => {
      if (instance) instance.destroy();
    });
    lottieRefs.current = {};
    setFormData({ marketResearchText: '', email: '', phone: '' });
    setErrors({});
    setSection('freeform');
    onClose();
  };

  if (!isOpen) return null;

  const getButtonText = () => {
    if (section === 'freeform') {
      const extractedEmail = extractEmail(formData.marketResearchText);
      const extractedPhone = extractPhone(formData.marketResearchText);
      const correctedEmail = extractedEmail ? autoCorrectEmail(extractedEmail) : '';
      const emailCertainty = checkEmailCertainty(correctedEmail);
      const phoneIsComplete = extractedPhone ? /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test(extractedPhone) : false;
      const isPerfect = correctedEmail && extractedPhone && emailCertainty === 'certain' && phoneIsComplete;
      return isPerfect ? 'Submit' : 'Next';
    }
    return section === 'contact' ? 'Submit' : 'Next';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1a202c',
              margin: '0 0 0.5rem 0'
            }}>
              Market Research for Lodging, Storage, Transport, Restaurants and more
            </h3>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.5rem',
              color: '#6b7280',
              padding: '0.25rem',
              lineHeight: 1,
              marginLeft: '1rem'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {/* Freeform Section */}
          {section === 'freeform' && (
            <div>
              <p style={{
                fontSize: '0.938rem',
                color: '#4b5563',
                marginBottom: '1rem',
                marginTop: 0
              }}>
                Describe your unique logistics needs in your own words
              </p>
              <textarea
                value={formData.marketResearchText}
                onChange={(e) => setFormData(prev => ({ ...prev, marketResearchText: e.target.value }))}
                rows={8}
                placeholder="ex.&#10;I need a quiet space near downtown, weekly from Monday to Friday.&#10;&#10;Send to john@gmail.com or call (415) 555-5555"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: '#f0f7ff',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: '#1e40af'
              }}>
                💡 Include your email and phone number for faster processing
              </div>
            </div>
          )}

          {/* Parsing Section */}
          {section === 'parsing' && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div id="parsingLottie" style={{ width: '120px', height: '120px', margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1a202c', marginBottom: '0.5rem' }}>
                Analyzing your request...
              </h3>
              <p style={{ fontSize: '0.938rem', color: '#6b7280', margin: 0 }}>
                Please wait while we extract the information
              </p>
            </div>
          )}

          {/* Contact Section */}
          {section === 'contact' && (
            <div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1a202c',
                marginBottom: '1rem',
                marginTop: 0
              }}>
                Where do we send the report?
              </h3>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Your email <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your.email@example.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Phone number (optional)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(415) 555-5555"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <p style={{
                fontSize: '0.813rem',
                color: '#6b7280',
                margin: 0
              }}>
                We'll send your personalized market research report to this email address.
              </p>
            </div>
          )}

          {/* Loading Section */}
          {section === 'loading' && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div id="loadingLottie" style={{ width: '120px', height: '120px', margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1a202c', marginBottom: '0.5rem' }}>
                We are processing your request
              </h3>
              <p style={{ fontSize: '0.938rem', color: '#6b7280', margin: 0 }}>
                This will only take a moment...
              </p>
            </div>
          )}

          {/* Final Section */}
          {section === 'final' && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div id="successLottie" style={{ width: '140px', height: '140px', margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1a202c', marginBottom: '0.5rem' }}>
                Success!
              </h3>
              <p style={{ fontSize: '1.125rem', color: '#10b981', marginBottom: '0.5rem' }}>
                Tomorrow morning, you'll receive a full report.
              </p>
              <p style={{ fontSize: '0.938rem', color: '#6b7280', margin: 0 }}>
                Check your inbox for the comprehensive market research report.
              </p>
            </div>
          )}

          {/* Errors */}
          {errors.submit && (
            <div style={{
              padding: '0.75rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '0.875rem',
              marginTop: '1rem'
            }}>
              {errors.submit}
            </div>
          )}
        </div>

        {/* Navigation */}
        {section !== 'parsing' && section !== 'loading' && (
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '0.75rem',
            justifyContent: section === 'contact' ? 'space-between' : 'flex-end'
          }}>
            {section === 'contact' && (
              <button
                onClick={() => setSection('freeform')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'white',
                  color: '#5B21B6',
                  border: '1px solid #5B21B6',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                ← Back
              </button>
            )}

            {section === 'final' ? (
              <button
                onClick={handleClose}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#5B21B6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={isSubmitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: isSubmitting ? '#9ca3af' : '#5B21B6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {getButtonText()}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
