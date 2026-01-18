/**
 * FeedbackWidget - Reusable Micro-Feedback Component
 *
 * A React island component to gather user sentiment on specific content.
 * Sends formatted feedback to Slack via email integration or custom handlers.
 *
 * Based on: https://github.com/splitleasesharath/asking-for-feedback
 *
 * Usage:
 * <FeedbackWidget
 *     slackEmail="your-slack-channel@workspace.slack.com"
 *     pageName="Optional page name override"
 *     promptText="Was this helpful?"
 *     onFeedbackSend={async (data) => { ... }}
 * />
 *
 * The component integrates with:
 * - Toast notifications (via useToast hook)
 * - Auth system (via auth.js utilities)
 * - Custom feedback handlers via onFeedbackSend prop
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '../Toast';
import { getUserId, getFirstName } from '../../../lib/auth/session.js';
import { getUsernameFromCookies } from '../../../lib/auth/cookies.js';
import { checkAuthStatus } from '../../../lib/auth/tokenValidation.js';
import './FeedbackWidget.css';

// Issue type labels for the dropdown
const ISSUE_LABELS = {
  'unclear': 'Information was unclear or confusing',
  'incomplete': 'Information was incomplete',
  'incorrect': 'Information was incorrect',
  'outdated': 'Information seems outdated',
  'not-found': "Couldn't find what I was looking for",
  'other': 'Other'
};

/**
 * FeedbackWidget Component
 *
 * @param {Object} props
 * @param {string} props.slackEmail - Slack channel email for notifications
 * @param {string} props.pageName - Override page name (defaults to document.title)
 * @param {string} props.promptText - Question to display (default: "Was this piece of information helpful?")
 * @param {Function} props.onFeedbackSend - Custom handler for sending feedback
 * @param {Function} props.onFeedbackSubmitted - Callback after feedback is submitted
 * @param {string} props.className - Additional CSS class
 */
export default function FeedbackWidget({
  slackEmail = '',
  pageName,
  promptText = 'Was this piece of information helpful?',
  onFeedbackSend,
  onFeedbackSubmitted,
  className = ''
}) {
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const modalRef = useRef(null);
  const formRef = useRef(null);

  // User context
  const [currentUser, setCurrentUser] = useState(null);

  // Form state for negative feedback
  const [formData, setFormData] = useState({
    issueType: '',
    whatWentWrong: '',
    lookingFor: '',
    contactName: '',
    contactEmail: ''
  });

  // Check auth status and get user info
  useEffect(() => {
    const loadUser = async () => {
      await checkAuthStatus();
      const userId = getUserId();
      const firstName = getFirstName();
      const email = getUsernameFromCookies(); // In Split Lease, username is often email

      if (userId || firstName) {
        setCurrentUser({
          id: userId,
          firstName,
          email
        });
      }
    };
    loadUser();
  }, []);

  // Get effective page name
  const effectivePageName = pageName || (typeof document !== 'undefined' ? document.title : 'Unknown Page');

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modalOpen) {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen]);

  // Pre-fill user info when modal opens
  useEffect(() => {
    if (modalOpen && currentUser) {
      setFormData(prev => ({
        ...prev,
        contactName: currentUser.firstName || prev.contactName,
        contactEmail: currentUser.email || prev.contactEmail
      }));
    }
  }, [modalOpen, currentUser]);

  const openModal = useCallback(() => {
    setModalOpen(true);
    // Focus first input after animation
    setTimeout(() => {
      const issueSelect = modalRef.current?.querySelector('#issueType');
      issueSelect?.focus();
    }, 100);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    // Reset form
    setFormData({
      issueType: '',
      whatWentWrong: '',
      lookingFor: '',
      contactName: currentUser?.firstName || '',
      contactEmail: currentUser?.email || ''
    });
  }, [currentUser]);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }, [closeModal]);

  const buildEmailData = useCallback((sentiment, feedbackFormData = null) => {
    const subject = sentiment === 'positive'
      ? 'Positive Feedback to the information'
      : 'Negative Feedback to the information';

    let body = `<p><strong>Page:</strong> ${effectivePageName}</p>`;

    if (currentUser) {
      const firstName = currentUser.firstName || 'Unknown';
      const email = currentUser.email || 'Unknown';
      body += `<p><strong>User:</strong> ${firstName} and email: ${email}</p>`;
    }

    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    body += `<p><strong>Information:</strong> <a href="${currentUrl}">${currentUrl}</a></p>`;
    body += `<p><strong>Sentiment:</strong> ${sentiment === 'positive' ? '👍 Positive' : '👎 Negative'}</p>`;

    // Add negative feedback details if provided
    if (feedbackFormData) {
      body += `<hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">`;
      body += `<h3 style="color: #31135D; margin-bottom: 12px;">Feedback Details</h3>`;

      if (feedbackFormData.issueType) {
        body += `<p><strong>Issue Type:</strong> ${ISSUE_LABELS[feedbackFormData.issueType] || feedbackFormData.issueType}</p>`;
      }

      if (feedbackFormData.whatWentWrong) {
        body += `<p><strong>What Went Wrong:</strong><br>${feedbackFormData.whatWentWrong.replace(/\n/g, '<br>')}</p>`;
      }

      if (feedbackFormData.lookingFor) {
        body += `<p><strong>What They Were Looking For:</strong><br>${feedbackFormData.lookingFor.replace(/\n/g, '<br>')}</p>`;
      }

      body += `<hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">`;
      body += `<h3 style="color: #31135D; margin-bottom: 12px;">Contact Information</h3>`;

      if (feedbackFormData.contactName) {
        body += `<p><strong>Name:</strong> ${feedbackFormData.contactName}</p>`;
      }

      if (feedbackFormData.contactEmail) {
        body += `<p><strong>Email:</strong> ${feedbackFormData.contactEmail}</p>`;
      }

      body += `<p style="color: #6D31C2; font-weight: bold; margin-top: 20px;">⚠️ This user expects to be contacted by a Split Lease representative.</p>`;
    }

    body += `<p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>`;

    return {
      to: slackEmail,
      subject,
      body,
      sentiment,
      formData: feedbackFormData
    };
  }, [effectivePageName, currentUser, slackEmail]);

  const sendFeedback = useCallback(async (emailData) => {
    // If custom handler provided, use it
    if (onFeedbackSend) {
      return await onFeedbackSend(emailData);
    }

    // Default: log to console (in production, this would send to an API)
    console.log('Feedback to be sent:', emailData);
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }, [onFeedbackSend]);

  const handlePositiveFeedback = useCallback(async () => {
    setButtonsDisabled(true);

    try {
      const emailData = buildEmailData('positive');
      const success = await sendFeedback(emailData);

      if (success) {
        showToast({
          title: 'Thank You!',
          content: 'Feedback Received',
          type: 'success'
        });

        // Trigger callback
        onFeedbackSubmitted?.({
          sentiment: 'positive',
          pageName: effectivePageName,
          url: typeof window !== 'undefined' ? window.location.href : '',
          timestamp: new Date().toISOString(),
          user: currentUser ? {
            name: currentUser.firstName,
            email: currentUser.email
          } : null
        });
      }
    } catch (error) {
      console.error('Feedback submission failed:', error);
      showToast({
        title: 'Error',
        content: 'Failed to submit feedback. Please try again.',
        type: 'error'
      });
    } finally {
      setButtonsDisabled(false);
    }
  }, [buildEmailData, sendFeedback, showToast, onFeedbackSubmitted, effectivePageName, currentUser]);

  const handleNegativeFeedbackSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const emailData = buildEmailData('negative', formData);
      const success = await sendFeedback(emailData);

      if (success) {
        closeModal();

        showToast({
          title: 'Thank You!',
          content: "Your feedback has been received. We'll be in touch soon.",
          type: 'success'
        });

        // Trigger callback
        onFeedbackSubmitted?.({
          sentiment: 'negative',
          pageName: effectivePageName,
          url: typeof window !== 'undefined' ? window.location.href : '',
          timestamp: new Date().toISOString(),
          formData,
          user: currentUser ? {
            name: currentUser.firstName,
            email: currentUser.email
          } : null
        });
      }
    } catch (error) {
      console.error('Feedback submission failed:', error);
      showToast({
        title: 'Error',
        content: 'Failed to submit feedback. Please try again.',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [buildEmailData, formData, sendFeedback, closeModal, showToast, onFeedbackSubmitted, effectivePageName, currentUser]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  return (
    <div className={`feedback-widget ${className}`.trim()}>
      <span className="feedback-widget__prompt">{promptText}</span>
      <div className="feedback-widget__icons">
        <button
          className="feedback-widget__btn feedback-widget__btn--up"
          aria-label="Yes, this was helpful"
          onClick={handlePositiveFeedback}
          disabled={buttonsDisabled}
        >
          <ThumbsUpIcon />
        </button>
        <button
          className="feedback-widget__btn feedback-widget__btn--down"
          aria-label="No, this was not helpful"
          onClick={openModal}
          disabled={buttonsDisabled}
        >
          <ThumbsDownIcon />
        </button>
      </div>

      {/* Negative Feedback Modal */}
      <div
        className={`feedback-modal-overlay ${modalOpen ? 'feedback-modal-overlay--open' : ''}`}
        onClick={handleOverlayClick}
        ref={modalRef}
      >
        <div className="feedback-modal">
          <div className="feedback-modal__header">
            <h2 className="feedback-modal__title">We're Sorry to Hear That</h2>
            <button
              className="feedback-modal__close"
              aria-label="Close modal"
              onClick={closeModal}
            >
              <CloseIcon />
            </button>
          </div>

          <p className="feedback-modal__subtitle">
            <HeadphonesIcon />
            A Split Lease representative will contact you to help resolve this.
          </p>

          <form ref={formRef} onSubmit={handleNegativeFeedbackSubmit}>
            <div className="feedback-form-group">
              <label htmlFor="issueType">What type of issue did you experience?</label>
              <select
                id="issueType"
                name="issueType"
                value={formData.issueType}
                onChange={handleInputChange}
              >
                <option value="">Select an option...</option>
                {Object.entries(ISSUE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="feedback-form-group">
              <label htmlFor="whatWentWrong">What went wrong?</label>
              <textarea
                id="whatWentWrong"
                name="whatWentWrong"
                placeholder="Please describe the issue you encountered..."
                value={formData.whatWentWrong}
                onChange={handleInputChange}
              />
            </div>

            <div className="feedback-form-group">
              <label htmlFor="lookingFor">What were you looking for?</label>
              <textarea
                id="lookingFor"
                name="lookingFor"
                placeholder="Tell us what information would have been helpful..."
                value={formData.lookingFor}
                onChange={handleInputChange}
              />
            </div>

            <div className="feedback-contact-info">
              <div className="feedback-contact-info__title">Your Contact Information</div>
              <div className="feedback-form-group">
                <label htmlFor="contactName">Name</label>
                <input
                  type="text"
                  id="contactName"
                  name="contactName"
                  placeholder="Your name"
                  value={formData.contactName}
                  onChange={handleInputChange}
                />
              </div>
              <div className="feedback-form-group">
                <label htmlFor="contactEmail">Email</label>
                <input
                  type="email"
                  id="contactEmail"
                  name="contactEmail"
                  placeholder="your@email.com"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="feedback-modal__actions">
              <button
                type="button"
                className="feedback-btn feedback-btn--secondary"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="feedback-btn feedback-btn--primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Icon Components (using inline SVG for independence from Font Awesome)
function ThumbsUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="feedback-icon">
      <path
        d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThumbsDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="feedback-icon">
      <path
        d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10zM17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
      <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
    </svg>
  );
}

function HeadphonesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="feedback-subtitle-icon">
      <path
        d="M3 18v-6a9 9 0 0 1 18 0v6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
