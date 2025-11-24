import { useState, useEffect, useCallback, useRef } from 'react';
import Lottie from 'lottie-react';

/**
 * AiSignupMarketReport - Advanced AI-powered market research signup modal
 *
 * Features:
 * - Smart email/phone extraction from freeform text
 * - Auto-correction for common email typos
 * - Incomplete phone number handling
 * - Three Lottie animations (parsing, loading, success)
 * - Dynamic form flow based on data quality
 * - Integrated with Bubble.io workflow
 *
 * Props:
 * - isOpen: boolean - Whether the modal is open
 * - onClose: function - Callback when modal is closed
 * - onSubmit: function (optional) - Custom submit handler
 */

// ============ UTILITY FUNCTIONS ============

function extractEmail(text) {
  if (!text) return null;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+[.,][a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match ? match[0] : null;
}

function extractPhone(text) {
  if (!text) return null;

  const completePhoneRegex = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const completeMatch = text.match(completePhoneRegex);
  if (completeMatch) return completeMatch[0];

  const partialPhoneRegex = /\(?\d{1,3}\)?[-.\s]?\d{1,4}[-.\s]?\d{0,4}|\b\d{3,}\b/;
  const partialMatch = text.match(partialPhoneRegex);
  return partialMatch ? partialMatch[0] : null;
}

function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

function validatePhone(phone) {
  if (!phone) return true;
  const phoneRegex = /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
  return phoneRegex.test(phone);
}

function checkEmailCertainty(email) {
  if (!email) return 'uncertain';

  const commonDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'icloud.com', 'aol.com', 'mail.com', 'protonmail.com'
  ];

  const commonTypos = [
    'gmial.com', 'gmai.com', 'yahooo.com', 'yaho.com',
    'hotmial.com', 'outlok.com', 'icoud.com'
  ];

  const domain = email.split('@')[1]?.toLowerCase();

  if (commonTypos.includes(domain)) return 'uncertain';
  if (domain && domain.length < 5) return 'uncertain';
  if (!domain?.includes('.')) return 'uncertain';
  if (email.includes('..') || email.includes('@.')) return 'uncertain';
  if (commonDomains.includes(domain)) return 'certain';
  if (validateEmail(email)) return 'certain';

  return 'uncertain';
}

function autoCorrectEmail(email) {
  if (!email) return email;

  const typoMap = {
    'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com',
    'gnail.com': 'gmail.com', 'gmail.co': 'gmail.com',
    'gmail,com': 'gmail.com', 'yahooo.com': 'yahoo.com',
    'yaho.com': 'yahoo.com', 'yahoo.co': 'yahoo.com',
    'yahoo,com': 'yahoo.com', 'hotmial.com': 'hotmail.com',
    'hotmai.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
    'hotmail,com': 'hotmail.com', 'outlok.com': 'outlook.com',
    'outlook.co': 'outlook.com', 'outlook,com': 'outlook.com',
    'icoud.com': 'icloud.com', 'iclod.com': 'icloud.com',
    'icloud.co': 'icloud.com', 'icloud,com': 'icloud.com',
  };

  const [localPart, domain] = email.split('@');
  if (!domain) return email;

  const domainLower = domain.toLowerCase();
  const fixedDomain = domainLower.replace(',', '.');
  const correctedDomain = typoMap[fixedDomain] || fixedDomain;

  return `${localPart}@${correctedDomain}`;
}

async function submitSignup(data) {
  // Get API configuration from environment variables
  // Fallback to hardcoded values for backward compatibility during migration
  const baseUrl = import.meta.env.VITE_BUBBLE_API_BASE_URL || 'https://app.split.lease/version-test/api/1.1';
  const apiKey = import.meta.env.VITE_BUBBLE_API_KEY || '5dbb448f9a6bbb043cb56ac16b8de109';

  const url = `${baseUrl}/wf/ai-signup-guest`;

  // Validate required fields
  if (!data.email) {
    console.error('[AiSignupMarketReport] Error: Missing email');
    throw new Error('Email is required');
  }

  if (!data.marketResearchText) {
    console.error('[AiSignupMarketReport] Error: Missing market research text');
    throw new Error('Market research description is required');
  }

  // Build payload exactly as Bubble expects
  const payload = {
    email: data.email,
    phone: data.phone || '',
    'text inputted': data.marketResearchText,
  };

  console.log('[AiSignupMarketReport] =====  SIGNUP REQUEST =====');
  console.log('[AiSignupMarketReport] URL:', url);
  console.log('[AiSignupMarketReport] Using env vars:', {
    hasBaseUrl: !!import.meta.env.VITE_BUBBLE_API_BASE_URL,
    hasApiKey: !!import.meta.env.VITE_BUBBLE_API_KEY
  });
  console.log('[AiSignupMarketReport] Payload:', JSON.stringify(payload, null, 2));
  console.log('[AiSignupMarketReport] ============================');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    console.log('[AiSignupMarketReport] Response status:', response.status, response.statusText);
    console.log('[AiSignupMarketReport] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AiSignupMarketReport] ===== ERROR RESPONSE =====');
      console.error('[AiSignupMarketReport] Status:', response.status);
      console.error('[AiSignupMarketReport] Status Text:', response.statusText);
      console.error('[AiSignupMarketReport] Response Body:', errorText);
      console.error('[AiSignupMarketReport] ===========================');

      // Try to parse as JSON for more details
      let errorMessage = 'Signup failed';
      try {
        const errorJson = JSON.parse(errorText);
        console.error('[AiSignupMarketReport] Parsed error:', errorJson);
        errorMessage = errorJson.message || errorJson.error || errorJson.body?.message || 'Signup failed';
      } catch (e) {
        errorMessage = errorText || `Signup failed with status ${response.status}`;
      }

      throw new Error(errorMessage);
    }

    // Handle 204 No Content response
    if (response.status === 204) {
      console.log('[AiSignupMarketReport] ✅ Signup successful (204 No Content)');
      return { success: true };
    }

    const result = await response.json();
    console.log('[AiSignupMarketReport] ===== SUCCESS RESPONSE =====');
    console.log('[AiSignupMarketReport] Full response:', JSON.stringify(result, null, 2));
    console.log('[AiSignupMarketReport] ============================');
    return result;
  } catch (error) {
    console.error('[AiSignupMarketReport] ===== EXCEPTION =====');
    console.error('[AiSignupMarketReport] Error:', error);
    console.error('[AiSignupMarketReport] Error message:', error.message);
    console.error('[AiSignupMarketReport] Error stack:', error.stack);
    console.error('[AiSignupMarketReport] ======================');
    throw error;
  }
}

// ============ LOTTIE ANIMATION COMPONENT ============

function LottieAnimation({ src, loop = true, autoplay = true, className = '' }) {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadAnimationData = async () => {
      try {
        const response = await fetch(src);
        const data = await response.json();

        if (isMounted) {
          setAnimationData(data);
        }
      } catch (error) {
        console.error('Failed to load Lottie animation:', error);
      }
    };

    loadAnimationData();

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (!animationData) {
    return <div className={className} style={{ minHeight: '200px' }} />;
  }

  return (
    <Lottie
      animationData={animationData}
      loop={loop}
      autoplay={autoplay}
      className={className}
    />
  );
}

// ============ SUB-COMPONENTS ============

const PARSING_LOTTIE_URL = 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1722533720265x199451206376484160/Animation%20-%201722533570126.json';
const LOADING_LOTTIE_URL = 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1720724605167x733559911663532000/Animation%20-%201720724343172.lottie';
const SUCCESS_LOTTIE_URL = 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1745939792891x394981453861459140/Report.json';

function FreeformInput({ value, onChange }) {
  return (
    <div className="freeform-container">
      <div className="freeform-header">
        <p className="freeform-instruction">
          Describe your unique logistics needs in your own words
        </p>
      </div>

      <textarea
        className="freeform-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`ex.
I need a quiet space near downtown, weekly from Monday to Friday, I commute to the city on a weekly basis.

Send to (415) 555-5555 and guest@mail.com`}
        rows={8}
        aria-label="Market research description"
      />

      <div className="freeform-animation-message">
        <p className="freeform-helper-text">
          💡 Include your email and phone number for faster processing
        </p>
      </div>
    </div>
  );
}

function ContactForm({ email, phone, onEmailChange, onPhoneChange }) {
  return (
    <div className="contact-container">
      <h3 className="contact-heading">Where do we send the report?</h3>

      <div className="contact-form-group">
        <label className="contact-label" htmlFor="email-input">
          Your email <span className="contact-required">*</span>
        </label>
        <input
          id="email-input"
          type="email"
          className="contact-input"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="your.email@example.com"
          required
          aria-required="true"
        />
      </div>

      <div className="contact-form-group">
        <label className="contact-label" htmlFor="phone-input">
          Phone number (optional)
        </label>
        <input
          id="phone-input"
          type="tel"
          className="contact-input"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="(415) 555-5555"
        />
      </div>

      <p className="contact-disclaimer">
        We'll send your personalized market research report to this email address.
      </p>
    </div>
  );
}

function ParsingStage() {
  return (
    <div className="parsing-container">
      <div className="parsing-lottie-wrapper">
        <LottieAnimation
          src={PARSING_LOTTIE_URL}
          loop={true}
          autoplay={true}
          className="parsing-lottie"
        />
      </div>
      <h3 className="parsing-message">Analyzing your request...</h3>
      <p className="parsing-sub-message">Please wait while we extract the information</p>
    </div>
  );
}

function LoadingStage({ message }) {
  return (
    <div className="loading-container">
      <div className="loading-lottie-wrapper">
        <LottieAnimation
          src={LOADING_LOTTIE_URL}
          loop={true}
          autoplay={true}
          className="loading-lottie"
        />
      </div>
      <h3 className="loading-message">{message}</h3>
      <p className="loading-sub-message">This will only take a moment...</p>
    </div>
  );
}

function FinalMessage({ message }) {
  return (
    <div className="final-container">
      <div className="final-lottie-wrapper">
        <LottieAnimation
          src={SUCCESS_LOTTIE_URL}
          loop={true}
          autoplay={true}
          className="final-lottie"
        />
      </div>
      <h3 className="final-title">Success!</h3>
      <p className="final-message">{message}</p>
      <p className="final-sub-message">
        Check your inbox for the comprehensive market research report.
      </p>
    </div>
  );
}

function NavigationButtons({ showBack, onBack, onNext, nextLabel, isLoading = false }) {
  return (
    <div className="nav-container">
      {showBack && (
        <button
          type="button"
          className="nav-back-button"
          onClick={onBack}
          disabled={isLoading}
          aria-label="Go back"
        >
          ← Back
        </button>
      )}
      <button
        type="button"
        className="nav-next-button"
        onClick={onNext}
        disabled={isLoading}
        aria-label={nextLabel}
      >
        {isLoading ? (
          <>
            <span className="nav-spinner" />
            Processing...
          </>
        ) : (
          nextLabel
        )}
      </button>
    </div>
  );
}

// ============ MAIN COMPONENT ============

export default function AiSignupMarketReport({ isOpen, onClose, onSubmit }) {
  const [state, setState] = useState({
    currentSection: 'freeform',
    formData: {},
    emailCertainty: null,
    isLoading: false,
    error: null,
  });

  const goToSection = useCallback((section) => {
    setState(prev => ({ ...prev, currentSection: section }));
  }, []);

  const updateFormData = useCallback((data) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...data },
    }));
  }, []);

  const setError = useCallback((error) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  const setLoading = useCallback((isLoading) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  const setEmailCertainty = useCallback((certainty) => {
    setState(prev => ({ ...prev, emailCertainty: certainty }));
  }, []);

  const handleNext = useCallback(async () => {
    const { formData } = state;

    if (state.currentSection === 'freeform') {
      goToSection('parsing');

      await new Promise(resolve => setTimeout(resolve, 1500));

      const extractedEmail = extractEmail(formData.marketResearchText || '');
      const extractedPhone = extractPhone(formData.marketResearchText || '');
      const correctedEmail = extractedEmail ? autoCorrectEmail(extractedEmail) : '';
      const emailCertainty = correctedEmail ? checkEmailCertainty(correctedEmail) : 'uncertain';

      const emailWasCorrected = extractedEmail !== correctedEmail;
      const phoneIsComplete = extractedPhone ? /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test(extractedPhone) : false;

      const updatedFormData = {
        ...formData,
        email: correctedEmail || formData.email || '',
        phone: extractedPhone || formData.phone || '',
      };

      const shouldAutoSubmit =
        correctedEmail &&
        extractedPhone &&
        emailCertainty === 'certain' &&
        !emailWasCorrected &&
        phoneIsComplete;

      if (shouldAutoSubmit) {
        setEmailCertainty('yes');
        try {
          await submitSignup({
            email: correctedEmail,
            phone: extractedPhone,
            marketResearchText: formData.marketResearchText,
            timestamp: new Date().toISOString(),
          });

          goToSection('final');
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Signup failed. Please try again.');
          setState(prev => ({
            ...prev,
            formData: updatedFormData,
            currentSection: 'contact',
          }));
        }
        return;
      }

      setState(prev => ({
        ...prev,
        formData: updatedFormData,
        currentSection: 'contact',
        emailCertainty: emailCertainty === 'uncertain' ? 'no' : null,
      }));
    }
  }, [state, goToSection, setEmailCertainty, setError]);

  const handleBack = useCallback(() => {
    if (state.currentSection === 'contact') {
      goToSection('freeform');
    } else if (state.currentSection === 'final') {
      goToSection('contact');
    }
  }, [state.currentSection, goToSection]);

  const handleSubmit = useCallback(async () => {
    const { formData } = state;

    if (!formData.email) {
      setError('Email is required');
      return;
    }

    if (!formData.marketResearchText) {
      setError('Please describe your market research needs');
      return;
    }

    setLoading(true);
    goToSection('loading');

    try {
      await submitSignup({
        email: formData.email,
        phone: formData.phone,
        marketResearchText: formData.marketResearchText,
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        goToSection('final');
        setLoading(false);
      }, 1500);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Signup failed. Please try again.');
      goToSection('contact');
    }
  }, [state, goToSection, setError, setLoading]);

  const resetFlow = useCallback(() => {
    setState({
      currentSection: 'freeform',
      formData: {},
      emailCertainty: null,
      isLoading: false,
      error: null,
    });
  }, []);

  const getButtonText = useCallback(() => {
    const { formData } = state;

    if (state.currentSection === 'freeform') {
      const extractedEmail = extractEmail(formData.marketResearchText || '');
      const extractedPhone = extractPhone(formData.marketResearchText || '');
      const correctedEmail = extractedEmail ? autoCorrectEmail(extractedEmail) : '';
      const emailCertainty = correctedEmail ? checkEmailCertainty(correctedEmail) : 'uncertain';

      const emailWasCorrected = extractedEmail !== correctedEmail;
      const phoneIsComplete = extractedPhone ? /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test(extractedPhone) : false;

      const isPerfect = correctedEmail && extractedPhone && emailCertainty === 'certain' && !emailWasCorrected && phoneIsComplete;

      if (isPerfect) return 'Submit';
      return 'Next';
    }

    if (state.currentSection === 'contact') return 'Submit';
    return 'Next';
  }, [state]);

  // Reset flow when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetFlow();
    }
  }, [isOpen, resetFlow]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const showNavigation = state.currentSection !== 'final' &&
                        state.currentSection !== 'loading' &&
                        state.currentSection !== 'parsing';

  return (
    <div
      className="ai-signup-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="ai-signup-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="ai-signup-header">
          <div className="ai-signup-icon-wrapper">
            <svg
              className="ai-signup-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <h2 id="modal-title" className="ai-signup-title">
            Market Research for Lodging, Storage, Transport, Restaurants and more
          </h2>
          <button
            className="ai-signup-close-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Content Sections */}
        <div className="ai-signup-content">
          {state.currentSection === 'freeform' && (
            <FreeformInput
              value={state.formData.marketResearchText || ''}
              onChange={(text) => updateFormData({ marketResearchText: text })}
            />
          )}

          {state.currentSection === 'contact' && (
            <ContactForm
              email={state.formData.email || ''}
              phone={state.formData.phone || ''}
              onEmailChange={(email) => updateFormData({ email })}
              onPhoneChange={(phone) => updateFormData({ phone })}
            />
          )}

          {state.currentSection === 'parsing' && <ParsingStage />}
          {state.currentSection === 'loading' && <LoadingStage message="We are processing your request" />}
          {state.currentSection === 'final' && <FinalMessage message="Tomorrow morning, you'll receive a full report." />}
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="ai-signup-error" role="alert">
            <strong>Error:</strong> {state.error}
          </div>
        )}

        {/* Navigation Buttons */}
        {showNavigation && (
          <NavigationButtons
            showBack={state.currentSection === 'contact'}
            onBack={handleBack}
            onNext={state.currentSection === 'contact' ? handleSubmit : handleNext}
            nextLabel={getButtonText()}
            isLoading={state.isLoading}
          />
        )}

        {/* Final close button */}
        {state.currentSection === 'final' && (
          <div className="ai-signup-final-button-wrapper">
            <button
              className="ai-signup-final-close-button"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        )}
      </div>

      <style>{`
        /* Overlay and Modal */
        .ai-signup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .ai-signup-modal {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        /* Header */
        .ai-signup-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px;
          border-bottom: 1px solid #e2e8f0;
        }

        .ai-signup-icon-wrapper {
          flex-shrink: 0;
        }

        .ai-signup-icon {
          width: 32px;
          height: 32px;
          color: #31135D;
        }

        .ai-signup-title {
          flex: 1;
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1a202c;
          line-height: 1.4;
        }

        .ai-signup-close-button {
          flex-shrink: 0;
          background: none;
          border: none;
          font-size: 32px;
          color: #718096;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .ai-signup-close-button:hover {
          background: #f7fafc;
          color: #2d3748;
        }

        /* Content */
        .ai-signup-content {
          padding: 24px;
          min-height: 300px;
        }

        /* Error */
        .ai-signup-error {
          margin: 0 24px;
          padding: 12px 16px;
          background: #fff5f5;
          border: 1px solid #fc8181;
          border-radius: 8px;
          color: #c53030;
          font-size: 14px;
        }

        /* Freeform Input */
        .freeform-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .freeform-instruction {
          margin: 0;
          font-size: 15px;
          color: #4a5568;
          line-height: 1.6;
        }

        .freeform-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #cbd5e0;
          border-radius: 8px;
          font-size: 15px;
          font-family: inherit;
          resize: vertical;
          min-height: 200px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .freeform-textarea:focus {
          outline: none;
          border-color: #31135D;
          box-shadow: 0 0 0 3px rgba(49, 19, 93, 0.1);
        }

        .freeform-helper-text {
          margin: 0;
          font-size: 14px;
          color: #718096;
        }

        /* Contact Form */
        .contact-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .contact-heading {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
          color: #1a202c;
        }

        .contact-form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .contact-label {
          font-size: 14px;
          font-weight: 600;
          color: #2d3748;
        }

        .contact-required {
          color: #e53e3e;
        }

        .contact-input {
          padding: 10px 14px;
          border: 1px solid #cbd5e0;
          border-radius: 8px;
          font-size: 15px;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .contact-input:focus {
          outline: none;
          border-color: #31135D;
          box-shadow: 0 0 0 3px rgba(49, 19, 93, 0.1);
        }

        .contact-disclaimer {
          margin: 0;
          font-size: 14px;
          color: #718096;
          line-height: 1.5;
        }

        /* Parsing Stage */
        .parsing-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
        }

        .parsing-lottie-wrapper {
          width: 200px;
          height: 200px;
          margin-bottom: 24px;
        }

        .parsing-message {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
          color: #1a202c;
        }

        .parsing-sub-message {
          margin: 0;
          font-size: 14px;
          color: #718096;
        }

        /* Loading Stage */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
        }

        .loading-lottie-wrapper {
          width: 200px;
          height: 200px;
          margin-bottom: 24px;
        }

        .loading-message {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
          color: #1a202c;
        }

        .loading-sub-message {
          margin: 0;
          font-size: 14px;
          color: #718096;
        }

        /* Final Message */
        .final-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
        }

        .final-lottie-wrapper {
          width: 200px;
          height: 200px;
          margin-bottom: 24px;
        }

        .final-title {
          margin: 0 0 12px 0;
          font-size: 24px;
          font-weight: 700;
          color: #31135D;
        }

        .final-message {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 500;
          color: #1a202c;
        }

        .final-sub-message {
          margin: 0;
          font-size: 14px;
          color: #718096;
        }

        /* Navigation Buttons */
        .nav-container {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
        }

        .nav-back-button,
        .nav-next-button {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-back-button {
          background: #e2e8f0;
          color: #2d3748;
        }

        .nav-back-button:hover:not(:disabled) {
          background: #cbd5e0;
        }

        .nav-next-button {
          background: #31135D;
          color: white;
        }

        .nav-next-button:hover:not(:disabled) {
          background: #522580;
        }

        .nav-back-button:disabled,
        .nav-next-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .nav-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Final Button */
        .ai-signup-final-button-wrapper {
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: center;
        }

        .ai-signup-final-close-button {
          padding: 10px 32px;
          background: #31135D;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .ai-signup-final-close-button:hover {
          background: #522580;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .ai-signup-modal {
            max-height: 95vh;
          }

          .ai-signup-title {
            font-size: 16px;
          }

          .ai-signup-icon {
            width: 24px;
            height: 24px;
          }
        }
      `}</style>
    </div>
  );
}
