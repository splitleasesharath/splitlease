import { useState } from 'react';
import Modal from './Modal.jsx';

/**
 * AIResearchSignupModal - Modal for collecting freeform text input for AI Research Report service
 *
 * This modal allows users to sign up for Split Lease's AI Deep Research service
 * by providing freeform text input describing their housing needs/preferences.
 * The data is sent to Bubble backend triggers for processing.
 *
 * Props:
 * - isOpen: boolean - Whether the modal is open
 * - onClose: function - Callback when modal is closed
 */
export default function AIResearchSignupModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    email: '',
    researchRequest: '',
    name: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // TODO: Replace with actual Bubble backend trigger URL
      // For now, we'll simulate the API call
      const response = await fetch('/api/ai-research-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSubmitStatus('success');
        // Reset form after 2 seconds and close modal
        setTimeout(() => {
          setFormData({ email: '', researchRequest: '', name: '' });
          setSubmitStatus(null);
          onClose();
        }, 2000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Failed to submit AI research signup:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ email: '', researchRequest: '', name: '' });
      setSubmitStatus(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generate Market Report"
      className="ai-research-signup-modal"
      closeOnOverlayClick={!isSubmitting}
      showCloseButton={!isSubmitting}
    >
      <div className="ai-research-modal-content">
        <p className="modal-description">
          Get a personalized market report powered by AI. Tell us what you're looking for,
          and we'll provide you with comprehensive housing insights tailored to your needs.
        </p>

        <form onSubmit={handleSubmit} className="ai-research-form">
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Your name"
              required
              disabled={isSubmitting}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your.email@example.com"
              required
              disabled={isSubmitting}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="researchRequest">What are you looking for?</label>
            <textarea
              id="researchRequest"
              name="researchRequest"
              value={formData.researchRequest}
              onChange={handleInputChange}
              placeholder="Describe your ideal housing situation, preferences, budget, location requirements, amenities, etc. The more details you provide, the better our AI research report will be."
              required
              disabled={isSubmitting}
              className="form-textarea"
              rows={6}
            />
          </div>

          {submitStatus === 'success' && (
            <div className="alert alert-success">
              Thank you! We'll send your personalized market report to your email shortly.
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="alert alert-error">
              Something went wrong. Please try again or contact support.
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.email || !formData.researchRequest || !formData.name}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Generating...' : 'Generate My Report'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .ai-research-modal-content {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .modal-description {
          color: #4a5568;
          font-size: 15px;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .ai-research-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-weight: 600;
          font-size: 14px;
          color: #2d3748;
        }

        .form-input,
        .form-textarea {
          padding: 10px 14px;
          border: 1px solid #cbd5e0;
          border-radius: 8px;
          font-size: 15px;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #31135D;
          box-shadow: 0 0 0 3px rgba(49, 19, 93, 0.1);
        }

        .form-input:disabled,
        .form-textarea:disabled {
          background-color: #f7fafc;
          cursor: not-allowed;
        }

        .form-textarea {
          resize: vertical;
          min-height: 120px;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 8px;
        }

        .btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-family: inherit;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #31135D;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #522580;
        }

        .btn-secondary {
          background: #e2e8f0;
          color: #2d3748;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #cbd5e0;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.5;
        }

        .alert-success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .alert-error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
      `}</style>
    </Modal>
  );
}
